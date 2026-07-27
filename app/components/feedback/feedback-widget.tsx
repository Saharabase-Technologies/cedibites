'use client';

/**
 * The reporting widget: a floating button (all authenticated roles) that runs a
 * Screenshot → Describe → Review stepper. Capture fires on open. The widget is
 * mounted once in the root layout, so its draft survives route changes
 * ("roaming"). Wrapped in its own error boundary that degrades to a plain
 * text-only form — the feedback system must never be the thing that crashes the
 * page (I1).
 */
import { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { ChatCircleDotsIcon, XIcon, CrosshairIcon, CameraIcon, ImageIcon, TrashIcon } from '@phosphor-icons/react';
import { FEATURES } from '@/lib/constants/features';
import { snapshot } from '@/lib/feedback';
import { captureScreenshot, dataUrlToFile } from '@/lib/feedback/screenshot';
import { resolveReporterContext } from '@/lib/feedback/identity';
import type { Pin, Severity, Shot } from '@/lib/feedback/types';
import { buildClientMeta, buildReportFormData, submitFeedbackReport } from '@/lib/api/feedback';
import { captureReplayId } from '@/lib/feedback/replay';
import { onProblem } from '@/lib/feedback/auto-prompt';
import { getErrorMessage } from '@/lib/utils/error-handler';
import { toast } from '@/lib/utils/toast';
import { ElementPicker } from './element-picker';
import { VoiceRecorder } from './voice-recorder';

const MAX_SHOTS = 5;

/** Whether the user has shrunk the launcher. Survives reloads; see RichWidget. */
const FEEDBACK_MINIMISED_KEY = 'cedibites_feedback_minimised';

const SEVERITIES: Array<{ value: Severity; label: string; hint: string }> = [
  { value: 'blocking', label: 'Blocking', hint: "Can't continue" },
  { value: 'annoying', label: 'Annoying', hint: 'Works, but painful' },
  { value: 'cosmetic', label: 'Cosmetic', hint: 'Looks off' },
  { value: 'suggestion', label: 'Idea', hint: 'A suggestion' },
];

type Step = 'annotate' | 'describe' | 'review';

/**
 * A note about one specific page. A report roams — capture here, navigate,
 * capture there — and each page usually needs its own words, so a note carries
 * its own text and its own voice clip rather than everything collapsing into a
 * single description.
 */
export interface PageNote {
  route: string;
  pageTitle: string;
  body: string;
  audio: Blob | null;
}

/** A note is worth sending once it has text or a voice clip. */
export function noteHasContent(note: PageNote): boolean {
  return note.body.trim().length > 0 || note.audio !== null;
}

// ─── Shared submit ────────────────────────────────────────────────────────────

async function sendReport(
  description: string,
  severity: Severity,
  shots: Shot[],
  audio: Blob | null,
  notes: PageNote[] = [],
): Promise<void> {
  const ctx = resolveReporterContext();
  const snap = snapshot();
  const files = await Promise.all(shots.map((s, i) => dataUrlToFile(s.dataUrl, `shot-${i + 1}`)));
  const audioFile = audio ? new File([audio], 'voice-note.webm', { type: audio.type || 'audio/webm' }) : null;
  const replayId = await captureReplayId(); // null unless an error monitor is wired

  // Build the note clips and their indices together, so `audio_index` always
  // points at the right file even when only some notes carry audio.
  const noteAudio: File[] = [];
  const notePayload = notes.filter(noteHasContent).map((note) => {
    let audioIndex: number | null = null;
    if (note.audio) {
      audioIndex = noteAudio.length;
      noteAudio.push(
        new File([note.audio], `note-${audioIndex + 1}.webm`, {
          type: note.audio.type || 'audio/webm',
        }),
      );
    }
    return {
      route: note.route || null,
      page_title: note.pageTitle || null,
      body: note.body.trim() || null,
      audio_index: audioIndex,
    };
  });

  const fd = buildReportFormData(
    {
      description: description.trim(),
      severity,
      route: ctx.route,
      role_at_report: ctx.roleAtReport,
      branch_id: ctx.branchId,
      replay_id: replayId,
      breadcrumbs: snap.breadcrumbs,
      console_entries: snap.consoleEntries,
      network_entries: snap.network,
      request_ids: snap.requestIds,
      client_meta: buildClientMeta(),
      screenshot_meta: shots.map((s) => ({ source: s.source, pins: s.pins, rects: s.rects, route: s.route })),
      notes: notePayload,
    },
    files,
    audioFile,
    noteAudio,
  );

  await submitFeedbackReport(fd);
}

// ─── The rich widget ──────────────────────────────────────────────────────────

function RichWidget() {
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState(false);
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [step, setStep] = useState<Step>('annotate');
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Draft — persists across route changes because the widget stays mounted.
  const [shots, setShots] = useState<Shot[]>([]);
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<Severity>('annoying');
  const [audio, setAudio] = useState<Blob | null>(null);
  // One note per page visited while the draft is open, keyed by route.
  const [notes, setNotes] = useState<PageNote[]>([]);
  const [prompted, setPrompted] = useState(false);

  /*
   * The launcher sits over the bottom-right corner of every screen, which is
   * also where a lot of real work happens. Hovering it reveals an x that shrinks
   * it to a small circle.
   *
   * Shrunk rather than removed, deliberately. This is the beta reporting
   * channel; a control that makes it disappear with no way back quietly ends
   * the feedback programme for whoever clicks it. Collapsed it takes about a
   * fifth of the space and sits at low opacity until pointed at, which answers
   * the actual complaint - the distraction - without closing the door.
   *
   * Persisted, because being asked the same question every morning is its own
   * kind of nagging. Read in an effect rather than during render: localStorage
   * does not exist on the server and reading it inline is a hydration mismatch.
   */
  const [minimised, setMinimised] = useState(false);

  useEffect(() => {
    try {
      setMinimised(localStorage.getItem(FEEDBACK_MINIMISED_KEY) === '1');
    } catch {
      /* private mode, or storage disabled - the launcher simply stays open */
    }
  }, []);

  const setLauncherMinimised = useCallback((next: boolean) => {
    setMinimised(next);
    try {
      if (next) localStorage.setItem(FEEDBACK_MINIMISED_KEY, '1');
      else localStorage.removeItem(FEEDBACK_MINIMISED_KEY);
    } catch {
      /* the preference just does not survive the session */
    }
  }, []);
  // Which shot pins attach to — the one captured on the page you're currently on.
  const [activeShot, setActiveShot] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const openRef = useRef(false);

  // Re-check auth on mount and whenever the route changes (login/logout navigate).
  useEffect(() => {
    setAuthenticated(resolveReporterContext().authenticated);
  }, [pathname]);

  // Auto-prompt: after a genuine 5xx/dead-connection, offer to report — but only
  // while the widget is closed, so it never interrupts an in-progress draft.
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  useEffect(
    () =>
      onProblem(() => {
        if (!openRef.current) setPrompted(true);
      }),
    [],
  );

  const resetDraft = useCallback(() => {
    setShots([]);
    setDescription('');
    setSeverity('annoying');
    setAudio(null);
    setNotes([]);
    setActiveShot(0);
    setStep('annotate');
  }, []);

  const openWidget = useCallback(async () => {
    setOpen(true);
    setStep('annotate');
    // First open captures the current page. If a draft is already going
    // (roamed here from another page), keep it — you add pages explicitly.
    if (shots.length === 0) {
      setCapturing(true);
      const dataUrl = await captureScreenshot();
      if (dataUrl) {
        setShots([{ dataUrl, source: 'capture', pins: [], rects: [], route: pathname }]);
        setActiveShot(0);
      }
      setCapturing(false);
    }
  }, [shots.length, pathname]);

  // Capture the CURRENT page and append it — this is what lets a report span
  // multiple pages: capture here, navigate, reopen, capture there.
  const captureThisPage = useCallback(async () => {
    if (shots.length >= MAX_SHOTS) return;
    setCapturing(true);
    const dataUrl = await captureScreenshot();
    setCapturing(false);
    if (dataUrl) {
      setShots((prev) => {
        const next = [...prev, { dataUrl, source: 'capture' as const, pins: [], rects: [], route: pathname }];
        setActiveShot(next.length - 1); // pin the page you just captured
        return next;
      });
    }
  }, [shots.length, pathname]);

  const addPin = useCallback((pin: Pin) => {
    setShots((prev) => {
      if (prev.length === 0 || !prev[activeShot]) return prev;
      const next = [...prev];
      next[activeShot] = { ...next[activeShot], pins: [...next[activeShot].pins, pin] };
      return next;
    });
  }, [activeShot]);

  const onUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      setShots((prev) =>
        prev.length >= MAX_SHOTS
          ? prev
          : [...prev, { dataUrl: String(reader.result), source: 'upload' as const, pins: [], rects: [] }],
      );
    reader.readAsDataURL(file);
  }, []);

  const removeShot = useCallback((idx: number) => {
    setShots((prev) => prev.filter((_, i) => i !== idx));
    setActiveShot((a) => (idx < a ? a - 1 : Math.max(0, a)));
  }, []);

  const submit = useCallback(async () => {
    setSubmitting(true);
    try {
      await sendReport(description, severity, shots, audio, notes);
      toast.success('Thanks — your report was sent.');
      resetDraft();
      setOpen(false);
    } catch (e) {
      // Draft is kept on failure (C9) — nothing typed is lost.
      toast.error(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }, [description, severity, shots, audio, notes, resetDraft]);

  // NOTE: every hook must sit ABOVE the `!authenticated` early return below.
  // `authenticated` starts false and flips true once the auth effect runs, so a
  // hook placed after the guard is skipped on the first render and called on the
  // second — React throws on the hook-count change and the error boundary
  // swallows the whole widget down to the text-only fallback.

  // The note being edited always belongs to the page you are standing on, so
  // roaming to another page swaps the editor rather than overwriting what you
  // already said. Held unsaved until it has content — an untouched editor must
  // not create an empty note.
  const currentNote = useMemo<PageNote>(
    () =>
      notes.find((n) => n.route === pathname) ?? {
        route: pathname,
        pageTitle: typeof document !== 'undefined' ? document.title : '',
        body: '',
        audio: null,
      },
    [notes, pathname],
  );

  const otherNotes = useMemo(
    () => notes.filter((n) => n.route !== pathname && noteHasContent(n)),
    [notes, pathname],
  );

  const updateCurrentNote = useCallback(
    (patch: Partial<PageNote>) => {
      setNotes((prev) => {
        const existing = prev.find((n) => n.route === pathname);
        if (existing) {
          return prev.map((n) => (n.route === pathname ? { ...n, ...patch } : n));
        }
        return [
          ...prev,
          {
            route: pathname,
            pageTitle: typeof document !== 'undefined' ? document.title : '',
            body: '',
            audio: null,
            ...patch,
          },
        ];
      });
    },
    [pathname],
  );

  const filledNotes = useMemo(() => notes.filter(noteHasContent), [notes]);

  if (!authenticated) return null;

  /*
   * Never on the phone-capture page. `/u/{token}` is a no-login page opened by
   * scanning a QR code, on a handset, one-handed, over the goods being
   * photographed - and the launcher sits exactly on top of the one button that
   * page has. It also has nothing to report against: the visitor is not signed
   * in and the page is not part of the portal.
   */
  if (pathname.startsWith('/u/')) return null;

  const buf = open && step === 'review' ? snapshot() : null;
  // You can only pin the page you're actually on, and only capture it once.
  const canPin = shots[activeShot]?.route === pathname;
  const currentPageCaptured = shots.some((s) => s.route === pathname);

  // On the POS terminal the bottom-right corner holds the Pay button (desktop)
  // and a full-width cart bar (tablet), so move the launcher to the bottom-left
  // and lift it above the tablet bar. Everywhere else it stays bottom-right.
  const onPos = pathname.startsWith('/pos');
  const fabPos = onPos ? 'bottom-24 left-5 lg:bottom-5 lg:left-5' : 'bottom-5 right-5';
  const promptPos = onPos ? 'bottom-40 left-5 lg:bottom-20 lg:left-5' : 'bottom-20 right-5';

  return (
    <div data-feedback-widget>
      {/* Auto-prompt after an unexpected failure (only while closed) */}
      {prompted && !open && !picking && (
        <div className={`fixed ${promptPos} z-[2147482000] w-72 rounded-2xl border border-[#f0e8d8] bg-neutral-card p-4 shadow-2xl`}>
          <p className="font-body text-sm font-semibold text-text-dark">Something went wrong</p>
          <p className="mt-0.5 font-body text-xs text-neutral-gray">Want to send a quick report? We&apos;ll attach the details automatically.</p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPrompted(false)}
              className="rounded-lg px-3 py-1.5 font-body text-xs text-neutral-gray hover:bg-neutral-light cursor-pointer"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => {
                setPrompted(false);
                setSeverity('blocking');
                void openWidget();
              }}
              className="rounded-lg bg-primary px-3 py-1.5 font-body text-xs font-semibold text-white hover:bg-primary-hover cursor-pointer"
            >
              Report it
            </button>
          </div>
        </div>
      )}

      {/* Floating button */}
      {!open && !picking && (
        <div className={`group fixed ${fabPos} z-[2147482000]`}>
          {minimised ? (
            /* Collapsed: icon only, and faded until pointed at. Still one click
               from the full launcher, so nobody loses the channel. */
            <button
              type="button"
              onClick={() => setLauncherMinimised(false)}
              aria-label="Show the feedback button"
              title="Send feedback"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white opacity-40 shadow-md transition-opacity hover:opacity-100 focus-visible:opacity-100 cursor-pointer"
            >
              <ChatCircleDotsIcon size={16} weight="fill" />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={openWidget}
                aria-label="Send feedback"
                className="flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105 hover:bg-primary-hover cursor-pointer font-body"
              >
                <ChatCircleDotsIcon size={20} weight="fill" />
                Feedback
              </button>

              {/* Revealed on hover or keyboard focus. `focus-within` on the
                  group matters as much as hover: a hover-only control is
                  unreachable by keyboard, and this is the only way to shrink
                  the launcher. */}
              <button
                type="button"
                onClick={() => setLauncherMinimised(true)}
                aria-label="Shrink the feedback button"
                title="Shrink - click the small circle to bring it back"
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-[#f0e8d8] bg-white text-neutral-gray opacity-0 shadow-sm transition-opacity hover:text-rose-600 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 cursor-pointer"
              >
                <XIcon size={10} weight="bold" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Element picker (hides the modal while active) */}
      {picking && (
        <ElementPicker pins={shots[activeShot]?.pins ?? []} onPin={addPin} onDone={() => setPicking(false)} />
      )}

      {/* Stepper modal */}
      {open && !picking && (
        <div className="fixed inset-0 z-[2147482500] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-neutral-card shadow-2xl sm:rounded-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#f0e8d8] px-5 py-4">
              <div>
                <h2 className="font-body text-base font-bold text-text-dark">Send feedback</h2>
                <p className="font-body text-xs text-neutral-gray">
                  {step === 'annotate' && (shots.length > 1 ? `${shots.length} pages attached` : 'Point at what went wrong')}
                  {step === 'describe' && 'Tell us what happened'}
                  {step === 'review' && "Here's what we'll attach"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-lg p-1 text-neutral-gray hover:bg-neutral-light hover:text-text-dark cursor-pointer"
              >
                <XIcon size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {step === 'annotate' && (
                <div className="flex flex-col gap-3">
                  {capturing ? (
                    <div className="flex h-40 items-center justify-center rounded-xl bg-neutral-light font-body text-sm text-neutral-gray">
                      Capturing screen…
                    </div>
                  ) : shots.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {shots.map((shot, idx) => (
                        <div
                          key={idx}
                          className={`group relative overflow-hidden rounded-xl border ${idx === activeShot ? 'border-primary ring-1 ring-primary/40' : 'border-[#f0e8d8]'}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={shot.dataUrl} alt={`Screenshot ${idx + 1}`} className="w-full" />
                          {shot.route && (
                            <span className="absolute left-2 top-2 max-w-[70%] truncate rounded-md bg-black/55 px-1.5 py-0.5 font-mono text-[10px] text-white">
                              {shot.route}
                            </span>
                          )}
                          {shot.pins.map((p, i) => (
                            <span
                              key={i}
                              className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-xs font-bold text-white shadow"
                              style={{ left: `${p.x}%`, top: `${p.y}%` }}
                            >
                              {i + 1}
                            </span>
                          ))}
                          <button
                            type="button"
                            onClick={() => removeShot(idx)}
                            className="absolute right-2 top-2 rounded-lg bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer"
                            aria-label="Remove screenshot"
                          >
                            <TrashIcon size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl bg-neutral-light font-body text-sm text-neutral-gray">
                      No screenshot — upload one or skip.
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!canPin}
                      title={canPin ? undefined : 'Capture this page first to pin its elements'}
                      onClick={() => setPicking(true)}
                      className="flex items-center gap-1.5 rounded-lg border border-[#f0e8d8] px-3 py-2 font-body text-xs font-medium text-text-dark hover:bg-neutral-light disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <CrosshairIcon size={16} /> Pin elements
                    </button>
                    <button
                      type="button"
                      disabled={shots.length >= MAX_SHOTS || currentPageCaptured}
                      title={currentPageCaptured ? 'This page is already attached' : 'Add the page you\'re on now'}
                      onClick={captureThisPage}
                      className="flex items-center gap-1.5 rounded-lg border border-[#f0e8d8] px-3 py-2 font-body text-xs font-medium text-text-dark hover:bg-neutral-light disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <CameraIcon size={16} /> Capture this page
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={shots.length >= MAX_SHOTS}
                      className="flex items-center gap-1.5 rounded-lg border border-[#f0e8d8] px-3 py-2 font-body text-xs font-medium text-text-dark hover:bg-neutral-light disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ImageIcon size={16} /> Upload photo
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onUpload} />
                  </div>
                  {shots.length > 0 && (
                    <p className="font-body text-[11px] text-neutral-gray">
                      Building a multi-page report? Close this, go to another page, reopen, and “Capture this page” to add it.
                    </p>
                  )}
                </div>
              )}

              {step === 'describe' && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-2">
                    {SEVERITIES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setSeverity(s.value)}
                        className={`flex flex-col items-start rounded-xl border px-3 py-2 text-left transition-colors cursor-pointer ${
                          severity === s.value
                            ? 'border-primary bg-[#fff8ec]'
                            : 'border-[#f0e8d8] hover:bg-neutral-light'
                        }`}
                      >
                        <span className="font-body text-sm font-semibold text-text-dark">{s.label}</span>
                        <span className="font-body text-[11px] text-neutral-gray">{s.hint}</span>
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    autoFocus
                    placeholder="What were you doing, and what happened?"
                    className="w-full rounded-xl border border-[#e3e1de] bg-[#f5f4f2] px-3.5 py-2.5 font-body text-sm text-text-dark placeholder:text-neutral-gray/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                  />
                  <VoiceRecorder audio={audio} onRecorded={setAudio} onClear={() => setAudio(null)} />

                  {/* Per-page notes. The overall description above covers the
                      report as a whole; these say what went wrong on each
                      specific page the draft has roamed across. */}
                  <div className="flex flex-col gap-2 border-t border-[#f0e8d8] pt-3">
                    <p className="font-body text-[11px] font-semibold uppercase tracking-wide text-neutral-gray">
                      Note for this page
                    </p>
                    <span className="w-fit rounded-md bg-neutral-light px-1.5 py-0.5 font-mono text-[10px] text-neutral-gray">
                      {pathname}
                    </span>
                    <textarea
                      value={currentNote.body}
                      onChange={(e) => updateCurrentNote({ body: e.target.value })}
                      rows={2}
                      placeholder="Anything specific to this page?"
                      className="w-full rounded-xl border border-[#e3e1de] bg-[#f5f4f2] px-3.5 py-2.5 font-body text-sm text-text-dark placeholder:text-neutral-gray/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                    />
                    <VoiceRecorder
                      audio={currentNote.audio}
                      onRecorded={(blob) => updateCurrentNote({ audio: blob })}
                      onClear={() => updateCurrentNote({ audio: null })}
                    />
                  </div>

                  {otherNotes.length > 0 && (
                    <div className="flex flex-col gap-2 border-t border-[#f0e8d8] pt-3">
                      <p className="font-body text-[11px] font-semibold uppercase tracking-wide text-neutral-gray">
                        Notes on other pages ({otherNotes.length})
                      </p>
                      {otherNotes.map((note) => (
                        <div
                          key={note.route}
                          className="flex items-start gap-2 rounded-xl border border-[#f0e8d8] bg-neutral-light/50 px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="block font-mono text-[10px] text-neutral-gray">{note.route}</span>
                            {note.body.trim() && (
                              <p className="mt-0.5 line-clamp-2 font-body text-xs text-text-dark">{note.body}</p>
                            )}
                            {note.audio && (
                              <span className="mt-0.5 inline-block font-body text-[11px] text-neutral-gray">
                                🎤 Voice note attached
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setNotes((prev) => prev.filter((n) => n.route !== note.route))}
                            aria-label={`Remove note for ${note.route}`}
                            className="shrink-0 text-neutral-gray hover:text-red-500 cursor-pointer"
                          >
                            <TrashIcon size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {step === 'review' && buf && (
                <div className="flex flex-col gap-3">
                  <p className="font-body text-sm text-text-dark">
                    Your report includes everything below. No passwords or typed values are ever read.
                  </p>
                  <ul className="flex flex-col gap-1.5 rounded-xl bg-neutral-light p-3 font-body text-xs text-neutral-gray">
                    <li>📝 {description.trim().length} characters of description</li>
                    {audio && <li>🎤 Voice note attached</li>}
                    {filledNotes.length > 0 && (
                      <li>
                        🗒️ {filledNotes.length} page note{filledNotes.length === 1 ? '' : 's'}
                        {filledNotes.filter((n) => n.audio).length > 0 &&
                          ` · ${filledNotes.filter((n) => n.audio).length} voice`}
                      </li>
                    )}
                    <li>🏷️ Severity: {SEVERITIES.find((s) => s.value === severity)?.label}</li>
                    <li>🖼️ {shots.length} screenshot{shots.length === 1 ? '' : 's'}, {shots.reduce((n, s) => n + s.pins.length, 0)} pin(s)</li>
                    <li>🧭 {buf.breadcrumbs.length} recent steps</li>
                    <li>🖥️ {buf.consoleEntries.length} console entries</li>
                    <li>🌐 {buf.network.length} network calls · {buf.requestIds.length} request ids</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Footer nav */}
            <div className="flex items-center justify-between gap-2 border-t border-[#f0e8d8] px-5 py-3">
              <button
                type="button"
                onClick={() => (step === 'describe' ? setStep('annotate') : step === 'review' ? setStep('describe') : setOpen(false))}
                className="rounded-xl px-4 py-2.5 font-body text-sm font-medium text-neutral-gray hover:bg-neutral-light cursor-pointer"
              >
                {step === 'annotate' ? 'Cancel' : 'Back'}
              </button>
              {step === 'review' ? (
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting}
                  className="rounded-xl bg-primary px-5 py-2.5 font-body text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {submitting ? 'Sending…' : 'Send report'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep(step === 'annotate' ? 'describe' : 'review')}
                  disabled={
                    step === 'describe' &&
                    description.trim().length === 0 &&
                    !audio &&
                    filledNotes.length === 0
                  }
                  className="rounded-xl bg-primary px-5 py-2.5 font-body text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Text-only fallback (I1) ──────────────────────────────────────────────────

function TextOnlyFallback() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<Severity>('annoying');
  const [submitting, setSubmitting] = useState(false);

  if (typeof window !== 'undefined' && !resolveReporterContext().authenticated) return null;
  // Same as the rich widget: never over the phone-capture page.
  if (pathname.startsWith('/u/')) return null;

  // Match the rich widget: keep the launcher clear of the POS Pay button / cart bar.
  const fabPos = pathname.startsWith('/pos')
    ? 'bottom-24 left-5 lg:bottom-5 lg:left-5'
    : 'bottom-5 right-5';

  const submit = async () => {
    setSubmitting(true);
    try {
      await sendReport(description, severity, [], null);
      toast.success('Thanks — your report was sent.');
      setDescription('');
      setOpen(false);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-feedback-widget>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`fixed ${fabPos} z-[2147482000] rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg font-body cursor-pointer`}
        >
          Feedback
        </button>
      ) : (
        <div className="fixed inset-0 z-[2147482500] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-neutral-card p-5 shadow-2xl">
            <h2 className="mb-3 font-body text-base font-bold text-text-dark">Send feedback</h2>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="What happened?"
              className="mb-3 w-full rounded-xl border border-[#e3e1de] bg-[#f5f4f2] px-3.5 py-2.5 font-body text-sm text-text-dark focus:border-primary focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl px-4 py-2 font-body text-sm text-neutral-gray cursor-pointer">
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting || description.trim().length === 0}
                className="rounded-xl bg-primary px-4 py-2 font-body text-sm font-semibold text-white disabled:opacity-40 cursor-pointer"
              >
                {submitting ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Error boundary ───────────────────────────────────────────────────────────

class FeedbackErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    // If the rich widget throws, degrade to the text-only form — the feedback
    // system must never crash the page it reports on (I1).
    return this.state.failed ? <TextOnlyFallback /> : this.props.children;
  }
}

// ─── Exported mount ───────────────────────────────────────────────────────────

export function FeedbackWidget() {
  if (!FEATURES.feedback) return null;
  return (
    <FeedbackErrorBoundary>
      <RichWidget />
    </FeedbackErrorBoundary>
  );
}
