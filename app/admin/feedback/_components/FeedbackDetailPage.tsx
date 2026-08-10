'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  MapPinIcon,
  UserIcon,
  ClockIcon,
  WarningCircleIcon,
  CaretDownIcon,
} from '@phosphor-icons/react';
import { useFeedbackReport, useFeedbackLogs, useUpdateFeedbackReport, useTranscribeFeedbackReport } from '@/lib/api/hooks/useFeedback';
import { feedbackService } from '@/lib/api/services/feedback.service';
import { SEVERITY_CONFIG, STATUS_CONFIG, STATUS_FLOW } from '@/lib/constants/feedback.constants';
import type { FeedbackStatus } from '@/types/feedback';
import { buildPageSegments, filterToSegment } from '@/lib/feedback/page-segments';
import { timeAgo } from '@/types/order';
import { getErrorMessage } from '@/lib/utils/error-handler';
import { toast } from '@/lib/utils/toast';

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#f0e8d8] bg-neutral-card p-4">
      <h3 className="mb-3 flex items-center gap-2 font-body text-sm font-bold text-text-dark">
        {title}
        {count != null && (
          <span className="rounded-full bg-neutral-light px-2 py-0.5 font-mono text-[11px] text-neutral-gray">{count}</span>
        )}
      </h3>
      {children}
    </section>
  );
}

export function FeedbackDetailPage({ id }: { id: number }) {
  const { report, isLoading, error } = useFeedbackReport(id);
  const [windowMode, setWindowMode] = useState(false);
  const { logs } = useFeedbackLogs(id, windowMode ? 5 : undefined);
  const update = useUpdateFeedbackReport(id);
  const transcribe = useTranscribeFeedbackReport(id);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  // null = all pages. Isolating a page slices the steps, console and network to
  // just the stretch that page was on screen.
  const [pageFilter, setPageFilter] = useState<string | null>(null);

  const segments = useMemo(
    () => (report ? buildPageSegments(report.breadcrumbs, report.route) : []),
    [report],
  );
  const activeSegment = useMemo(
    () => segments.find((s) => s.route === pageFilter) ?? null,
    [segments, pageFilter],
  );

  const breadcrumbs = useMemo(
    () => filterToSegment(report?.breadcrumbs ?? [], activeSegment),
    [report, activeSegment],
  );
  const consoleEntries = useMemo(
    () => filterToSegment(report?.console_entries ?? [], activeSegment),
    [report, activeSegment],
  );
  const networkEntries = useMemo(
    () => filterToSegment(report?.network_entries ?? [], activeSegment),
    [report, activeSegment],
  );

  if (isLoading) {
    return <div className="p-6 font-body text-sm text-neutral-gray">Loading report…</div>;
  }
  if (error || !report) {
    return (
      <div className="p-6">
        <Link href="/admin/feedback" className="font-body text-sm text-primary">← Back to inbox</Link>
        <p className="mt-4 font-body text-sm text-neutral-gray">Report not found.</p>
      </div>
    );
  }

  const sev = SEVERITY_CONFIG[report.severity];
  const st = STATUS_CONFIG[report.status];

  const setStatus = (status: FeedbackStatus) => {
    update.mutate({ status }, {
      onSuccess: () => toast.success(`Marked ${STATUS_CONFIG[status].label.toLowerCase()}.`),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  };

  const exportReport = async (fmt: 'md' | 'zip') => {
    try {
      const blob = await feedbackService.exportReport(id, fmt);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `feedback-${report.number ?? id}.${fmt === 'zip' ? 'zip' : 'md'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl p-6 pb-24">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/admin/feedback" className="inline-flex items-center gap-1.5 font-body text-sm text-neutral-gray hover:text-text-dark">
          <ArrowLeftIcon size={16} /> Back to inbox
        </Link>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => exportReport('md')}
            className="rounded-lg border border-[#f0e8d8] px-3 py-1.5 font-body text-xs font-semibold text-text-dark hover:bg-neutral-light cursor-pointer"
          >
            Export .md
          </button>
          <button
            type="button"
            onClick={() => exportReport('zip')}
            className="rounded-lg border border-[#f0e8d8] px-3 py-1.5 font-body text-xs font-semibold text-text-dark hover:bg-neutral-light cursor-pointer"
          >
            Export .zip
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {report.number != null && <span className="font-mono text-lg font-bold text-neutral-gray">#{report.number}</span>}
            <span className={`rounded-full border px-2.5 py-0.5 font-body text-[11px] font-bold uppercase tracking-wide ${st.chip}`}>{st.label}</span>
            <span className={`rounded-full border px-2.5 py-0.5 font-body text-[11px] font-semibold ${sev.chip}`}>{sev.label}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-body text-xs text-neutral-gray">
            <span className="flex items-center gap-1"><UserIcon size={13} /> {report.reporter?.name ?? 'Unknown'}{report.role_at_report ? ` · ${report.role_at_report}` : ''}</span>
            {report.route && <span className="flex items-center gap-1 font-mono"><MapPinIcon size={13} /> {report.route}</span>}
            {report.branch && <span>{report.branch.name}</span>}
            <span className="flex items-center gap-1"><ClockIcon size={13} /> {timeAgo(new Date(report.created_at).getTime())}</span>
            {report.related_count ? <span className="text-primary">Route flagged in {report.related_count} other report(s)</span> : null}
          </div>
        </div>

        {/* Status control */}
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FLOW.map((s) => (
            <button
              key={s}
              type="button"
              disabled={update.isPending || report.status === s}
              onClick={() => setStatus(s)}
              className={`rounded-lg border px-2.5 py-1.5 font-body text-[11px] font-semibold transition-colors cursor-pointer disabled:cursor-default ${
                report.status === s ? STATUS_CONFIG[s].chip : 'border-[#f0e8d8] text-neutral-gray hover:bg-neutral-light'
              }`}
            >
              {STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Page isolation — a report roams, so let triage read one page at a time.
          Derived from nav breadcrumbs, so it works on older reports too. */}
      {segments.length > 1 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-body text-[11px] font-bold uppercase text-neutral-gray">
            Isolate page
          </span>
          <button
            type="button"
            onClick={() => setPageFilter(null)}
            className={`rounded-lg px-2.5 py-1 font-mono text-[11px] cursor-pointer ${
              pageFilter === null
                ? 'bg-primary text-white'
                : 'border border-[#f0e8d8] text-neutral-gray hover:bg-neutral-light'
            }`}
          >
            All pages
          </button>
          {segments.map((s) => (
            <button
              key={s.route}
              type="button"
              onClick={() => setPageFilter(s.route)}
              title={s.route}
              className={`max-w-[16rem] truncate rounded-lg px-2.5 py-1 font-mono text-[11px] cursor-pointer ${
                pageFilter === s.route
                  ? 'bg-primary text-white'
                  : 'border border-[#f0e8d8] text-neutral-gray hover:bg-neutral-light'
              }`}
            >
              {s.route}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Description + voice */}
        <Section title="Report">
          <p className="whitespace-pre-wrap font-body text-sm text-text-dark">
            {report.description?.trim() || <span className="italic text-neutral-gray/60">No description</span>}
          </p>
          {report.transcript && (
            <div className="mt-3 rounded-xl bg-neutral-light p-3">
              <p className="mb-1 font-body text-[11px] font-bold uppercase text-neutral-gray">Voice transcript</p>
              <p className="whitespace-pre-wrap font-body text-sm text-text-dark">{report.transcript}</p>
            </div>
          )}
          {report.audio_url && (
            <div className="mt-3 flex flex-col gap-2">
              <audio controls src={report.audio_url} className="w-full">
                <track kind="captions" />
              </audio>
              {!report.transcript && (
                <button
                  type="button"
                  disabled={transcribe.isPending}
                  onClick={() =>
                    transcribe.mutate(undefined, {
                      onSuccess: (res) =>
                        toast[res?.data?.transcript ? 'success' : 'info'](
                          res?.data?.transcript ? 'Transcribed.' : 'No transcript available (provider off).',
                        ),
                      onError: (e) => toast.error(getErrorMessage(e)),
                    })
                  }
                  className="self-start rounded-lg border border-[#f0e8d8] px-3 py-1.5 font-body text-xs font-semibold text-text-dark hover:bg-neutral-light disabled:opacity-50 cursor-pointer"
                >
                  {transcribe.isPending ? 'Transcribing…' : 'Transcribe voice note'}
                </button>
              )}
            </div>
          )}
        </Section>

        {/* Environment */}
        <Section title="Environment">
          {report.client_meta ? (
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 font-body text-xs">
              {Object.entries(report.client_meta).map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-neutral-gray">{k}</dt>
                  <dd className="truncate font-mono text-text-dark" title={typeof v === 'object' ? JSON.stringify(v) : String(v)}>
                    {typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="font-body text-xs text-neutral-gray">No environment data.</p>
          )}
        </Section>

        {/* Screenshots */}
        {report.screenshots.length > 0 && (
          <Section title="Screenshots" count={report.screenshots.length}>
            <div className="flex flex-col gap-3">
              {report.screenshots.map((shot, si) => (
                <div key={si}>
                  {shot.route && (
                    <p className="mb-1 flex items-center gap-1 font-mono text-[11px] text-neutral-gray">
                      <MapPinIcon size={12} /> {shot.route}
                    </p>
                  )}
                  <div className="relative overflow-hidden rounded-xl border border-[#f0e8d8]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={shot.url} alt={`Screenshot ${si + 1}`} className="w-full" />
                    {shot.pins.map((p, pi) => (
                      <span
                        key={pi}
                        className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-xs font-bold text-white shadow"
                        style={{ left: `${p.x}%`, top: `${p.y}%` }}
                      >
                        {pi + 1}
                      </span>
                    ))}
                  </div>
                  {shot.pins.length > 0 && (
                    <ol className="mt-2 flex flex-col gap-1">
                      {shot.pins.map((p, pi) => (
                        <li key={pi} className="flex gap-2 font-body text-xs text-neutral-gray">
                          <span className="font-bold text-primary">{pi + 1}.</span>
                          <span className="min-w-0">
                            <span className="text-text-dark">{p.label}</span>
                            <code className="ml-1 break-all font-mono text-[11px] text-neutral-gray">{p.selector}</code>
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Per-page notes — what the reporter said about each specific screen. */}
        {report.notes.length > 0 && (
          <Section
            title="Notes by page"
            count={
              pageFilter === null
                ? report.notes.length
                : report.notes.filter((n) => n.route === pageFilter).length
            }
          >
            <div className="flex flex-col gap-2.5">
              {report.notes
                .filter((n) => pageFilter === null || n.route === pageFilter)
                .map((note) => (
                  <div key={note.id} className="rounded-xl border border-[#f0e8d8] p-2.5">
                    <span className="font-mono text-[10px] text-neutral-gray">
                      {note.route ?? '—'}
                    </span>
                    {note.body && (
                      <p className="mt-1 whitespace-pre-wrap font-body text-sm text-text-dark">
                        {note.body}
                      </p>
                    )}
                    {note.transcript && (
                      <p className="mt-1 whitespace-pre-wrap rounded-lg bg-neutral-light p-2 font-body text-xs text-text-dark">
                        <span className="font-bold uppercase text-neutral-gray">Voice · </span>
                        {note.transcript}
                      </p>
                    )}
                    {note.audio_url && (
                      <audio controls src={note.audio_url} className="mt-1.5 w-full">
                        <track kind="captions" />
                      </audio>
                    )}
                  </div>
                ))}
              {pageFilter !== null &&
                report.notes.filter((n) => n.route === pageFilter).length === 0 && (
                  <p className="font-body text-xs text-neutral-gray">No notes on this page.</p>
                )}
            </div>
          </Section>
        )}

        {/* Breadcrumbs */}
        <Section title="Steps before reporting" count={breadcrumbs.length}>
          <ol className="flex flex-col gap-1">
            {breadcrumbs.length === 0 && <li className="font-body text-xs text-neutral-gray">No steps recorded.</li>}
            {breadcrumbs.map((b, i) => (
              <li key={i} className="flex items-center gap-2 font-body text-xs">
                <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${b.kind === 'nav' ? 'bg-blue-50 text-blue-600' : 'bg-neutral-light text-neutral-gray'}`}>
                  {b.kind}
                </span>
                <span className="truncate text-text-dark">{b.label}</span>
              </li>
            ))}
          </ol>
        </Section>

        {/* Console */}
        <Section title="Console" count={consoleEntries.length}>
          <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
            {consoleEntries.length === 0 && <p className="font-body text-xs text-neutral-gray">No console output.</p>}
            {consoleEntries.map((c, i) => (
              <div key={i} className={`rounded px-2 py-1 font-mono text-[11px] ${c.level === 'error' ? 'bg-red-50 text-red-700' : c.level === 'warn' ? 'bg-amber-50 text-amber-700' : 'bg-neutral-light text-neutral-gray'}`}>
                <span className="opacity-60">[{c.level}]</span> {c.message}
              </div>
            ))}
          </div>
        </Section>

        {/* Network */}
        <Section title="Network" count={networkEntries.length}>
          <div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto">
            {networkEntries.length === 0 && <p className="font-body text-xs text-neutral-gray">No network calls.</p>}
            {networkEntries.map((n, i) => (
              <div key={i} className="flex items-center gap-2 font-mono text-[11px]">
                <span className={`font-semibold ${n.status === null ? 'text-red-600' : n.status >= 400 ? 'text-red-600' : 'text-secondary'}`}>
                  {n.status ?? 'ERR'}
                </span>
                <span className="text-neutral-gray">{n.method}</span>
                <span className="min-w-0 flex-1 truncate text-text-dark">{n.url}</span>
                {n.durationMs != null && <span className="text-neutral-gray/60">{n.durationMs}ms</span>}
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Correlated backend logs — the crown jewel */}
      <div className="mt-4">
        <Section title="Correlated backend logs" count={logs.length}>
          <div className="mb-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWindowMode(false)}
              className={`rounded-lg px-3 py-1.5 font-body text-xs font-semibold cursor-pointer ${!windowMode ? 'bg-primary text-white' : 'border border-[#f0e8d8] text-neutral-gray'}`}
            >
              This user's actions ({report.request_ids.length} ids)
            </button>
            <button
              type="button"
              onClick={() => setWindowMode(true)}
              className={`rounded-lg px-3 py-1.5 font-body text-xs font-semibold cursor-pointer ${windowMode ? 'bg-primary text-white' : 'border border-[#f0e8d8] text-neutral-gray'}`}
            >
              ±5 min window
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {logs.length === 0 && (
              <p className="font-body text-xs text-neutral-gray">
                {windowMode ? 'Nothing logged in that window.' : 'No correlated logs. This report shipped no request ids.'}
              </p>
            )}
            {logs.map((l) => (
              <div key={l.id} className="rounded-lg border border-[#f0e8d8]">
                <button
                  type="button"
                  disabled={!l.message}
                  onClick={() => setExpandedLog(expandedLog === l.id ? null : l.id)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left font-mono text-[11px] disabled:cursor-default cursor-pointer"
                >
                  <span className={`font-semibold ${l.level === 'error' ? 'text-red-600' : 'text-secondary'}`}>{l.status_code ?? '—'}</span>
                  <span className="text-neutral-gray">{l.method}</span>
                  <span className="min-w-0 flex-1 truncate text-text-dark">{l.path}</span>
                  {l.duration_ms != null && <span className="text-neutral-gray/60">{l.duration_ms}ms</span>}
                  {l.message && <CaretDownIcon size={12} className={`text-neutral-gray transition-transform ${expandedLog === l.id ? 'rotate-180' : ''}`} />}
                </button>
                {expandedLog === l.id && l.message && (
                  <pre className="overflow-x-auto border-t border-[#f0e8d8] bg-brand-dark p-3 font-mono text-[11px] leading-relaxed text-red-300">
                    {l.message}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
