'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchUploadTarget,
  localRejection,
  uploadFile,
  UploadSessionError,
} from '@/lib/upload-session/phone-client';
import type { UploadTarget } from '@/types/upload-session';

/**
 * Phone-as-camera.
 *
 * A branch manager is standing over a crate of spoiled chicken. The IMS is a
 * laptop upstairs. They scan the code on its screen and land here.
 *
 * Everything about this screen assumes the worst conditions it will actually
 * meet: a cheap handset, one hand, mobile data in a store room with thick walls,
 * and someone who has never seen the page before and will not read it.
 *
 *   - one obvious button, thumb-sized, at the bottom where a thumb is.
 *   - every file uploads on its own with its own progress and its own retry,
 *     so one failure at 90% does not cost the other three.
 *   - no `capture` attribute on the input. It forces the camera on several
 *     Android browsers and removes the option to attach a photo already taken -
 *     which is the likely case when goods are about to go back on a lorry. This
 *     was learned once already on the desktop inputs; do not re-add it.
 *   - no polling, no websocket, no library. The laptop hears about the upload
 *     through the API's own broadcast, not through anything on this page.
 */
export function PhoneUpload({ token }: { token: string }) {
  const [target, setTarget] = useState<UploadTarget | null>(null);
  const [loadError, setLoadError] = useState<{ message: string; retryable: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [items, setItems] = useState<QueueItem[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoadError(null);

    fetchUploadTarget(token, controller.signal)
      .then(setTarget)
      .catch((e: unknown) => {
        if ((e as Error)?.name === 'AbortError') return;

        // A dropped signal is not a dead code. Getting this wrong sends someone
        // back up to the laptop to replace a token that was fine all along.
        setLoadError({
          message: (e as Error)?.message ?? 'This link is not valid.',
          retryable: e instanceof UploadSessionError && e.kind === 'network',
        });
      });

    return () => controller.abort();
  }, [token, attempt]);

  /**
   * How many more the server will take. Counted from what it told us plus what
   * this page has since had accepted, rather than re-fetching: one fewer round
   * trip on a connection where round trips are the expensive part.
   */
  const sent = items.filter((i) => i.status === 'done').length;
  const remaining = target ? Math.max(0, target.remaining - sent) : 0;
  const busy = items.some((i) => i.status === 'uploading');

  const send = useCallback(
    async (item: QueueItem) => {
      const patch = (fields: Partial<QueueItem>) =>
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...fields } : i)));

      patch({ status: 'uploading', progress: 0, error: null });

      try {
        await uploadFile(token, item.file, {
          onProgress: (progress) => patch({ progress: progress ?? 99 }),
        });
        patch({ status: 'done', progress: 100 });
      } catch (e) {
        patch({ status: 'failed', error: (e as Error)?.message ?? 'That did not go through.' });
      }
    },
    [token],
  );

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0 || !target) return;

    const accepted: QueueItem[] = [];

    for (const file of Array.from(files).slice(0, remaining)) {
      const rejection = localRejection(file, target.accepts);

      accepted.push({
        id: nextId.current++,
        file,
        preview: URL.createObjectURL(file),
        isVideo: (file.type || '').startsWith('video/'),
        status: rejection ? 'failed' : 'queued',
        progress: 0,
        error: rejection,
      });
    }

    setItems((prev) => [...prev, ...accepted]);
    if (inputRef.current) inputRef.current.value = '';

    // One at a time. Two 30 MB clips racing on the same phone connection finish
    // later than the same two in sequence, and each halves the other's progress
    // bar into something that looks stuck.
    void (async () => {
      for (const item of accepted) {
        if (item.status === 'queued') await send(item);
      }
    })();
  };

  // Object URLs are held for the life of the page so thumbnails survive a
  // retry; released together on unmount.
  useEffect(() => {
    return () => items.forEach((i) => URL.revokeObjectURL(i.preview));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loadError) {
    return (
      <Dead
        message={loadError.message}
        onRetry={loadError.retryable ? () => setAttempt((n) => n + 1) : undefined}
      />
    );
  }
  if (!target) return <Loading />;

  return (
    <main className="min-h-dvh bg-neutral-light flex flex-col">
      <header className="px-5 pt-7 pb-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-gray">
          CediBites
        </p>
        <h1 className="text-2xl font-bold text-text-dark mt-1 leading-tight">{target.reference}</h1>
        <p className="text-neutral-gray text-[15px] mt-1.5 leading-snug">{target.label}</p>

        <Countdown expiresAt={target.expires_at} />
      </header>

      <div className="flex-1 px-5 pb-4">
        {items.length === 0 ? (
          <Empty />
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <Row key={item.id} item={item} onRetry={() => void send(item)} />
            ))}
          </ul>
        )}
      </div>

      {/* The action sits at the bottom because that is where a thumb is. It is
          sticky rather than in the flow so it stays reachable once the list of
          sent files runs past the fold. */}
      <div className="sticky bottom-0 bg-neutral-light/95 backdrop-blur-sm border-t border-[#f0e8d8] px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {sent > 0 && (
          <p className="text-center text-sm text-secondary font-semibold mb-3">
            {sent === 1 ? '1 file is on the computer.' : `${sent} files are on the computer.`}
          </p>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy || remaining === 0}
          className="w-full min-h-14 rounded-2xl bg-primary text-white text-lg font-bold disabled:opacity-50 active:bg-primary-hover"
        >
          {busy ? 'Sending…' : remaining === 0 ? 'That is all this code will take' : 'Take a photo or video'}
        </button>

        <p className="text-center text-neutral-gray text-xs mt-3 leading-snug">
          {remaining > 0
            ? `${remaining} more can be sent. Keep videos to about 15 seconds.`
            : 'Show the code again on the computer if you need to send more.'}
        </p>
      </div>
    </main>
  );
}

// ─── One file on its way ──────────────────────────────────────────────────────

interface QueueItem {
  id: number;
  file: File;
  preview: string;
  isVideo: boolean;
  status: 'queued' | 'uploading' | 'done' | 'failed';
  progress: number;
  error: string | null;
}

function Row({ item, onRetry }: { item: QueueItem; onRetry: () => void }) {
  return (
    <li className="flex items-center gap-3 bg-neutral-card border border-[#f0e8d8] rounded-2xl p-3">
      <div className="w-16 h-16 rounded-xl overflow-hidden bg-neutral-light shrink-0 relative">
        {item.isVideo ? (
          // muted + playsInline so iOS renders a frame instead of a black box.
          <video src={item.preview} className="w-full h-full object-cover" muted playsInline />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.preview} alt="" className="w-full h-full object-cover" />
        )}
        {item.isVideo && (
          <span className="absolute bottom-1 right-1 text-[9px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded">
            VIDEO
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {item.status === 'done' && (
          <p className="text-secondary font-semibold text-[15px]">Sent</p>
        )}

        {item.status === 'uploading' && (
          <>
            <p className="text-text-dark font-semibold text-[15px]">Sending… {item.progress}%</p>
            <div className="h-2 bg-neutral-light rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-[width] duration-200"
                style={{ width: `${item.progress}%` }}
              />
            </div>
          </>
        )}

        {item.status === 'queued' && <p className="text-neutral-gray text-[15px]">Waiting…</p>}

        {item.status === 'failed' && (
          <>
            <p className="text-error text-sm leading-snug">{item.error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 min-h-9 px-4 rounded-xl bg-neutral-light border border-[#f0e8d8] text-text-dark text-sm font-semibold"
            >
              Try again
            </button>
          </>
        )}
      </div>
    </li>
  );
}

// ─── The other three states ───────────────────────────────────────────────────

function Loading() {
  return (
    <main className="min-h-dvh bg-neutral-light flex items-center justify-center p-8">
      <p className="text-neutral-gray">Opening…</p>
    </main>
  );
}

/**
 * Two different endings sharing one screen.
 *
 * Without `onRetry` the code is finished - expired, cancelled, full, or never
 * real. The server gives all four the same shape of answer on purpose, so this
 * page cannot be used to work out which tokens exist, and the instruction is
 * the same in every case anyway: go back to the computer.
 *
 * With `onRetry` the code is probably fine and the network is not.
 */
function Dead({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <main className="min-h-dvh bg-neutral-light flex flex-col items-center justify-center text-center p-8">
      <div className="w-14 h-14 rounded-full bg-neutral-card border border-[#f0e8d8] flex items-center justify-center text-2xl mb-4">
        {onRetry ? '📶' : '⌛'}
      </div>
      <h1 className="text-xl font-bold text-text-dark">
        {onRetry ? 'No connection' : 'This code will not work'}
      </h1>
      <p className="text-neutral-gray mt-2 max-w-xs leading-snug">{message}</p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 min-h-12 px-8 rounded-2xl bg-primary text-white font-bold"
        >
          Try again
        </button>
      )}
    </main>
  );
}

function Empty() {
  return (
    <div className="flex flex-col items-center text-center py-10">
      <p className="text-neutral-gray text-[15px] max-w-[16rem] leading-snug">
        Nothing sent yet. Use the button below - you can take a new photo or pick one already on
        this phone.
      </p>
    </div>
  );
}

/**
 * The code dies in minutes, so say so. Not a scare tactic: someone who walks to
 * the cold room, finds the crate, and comes back to a dead page with no warning
 * blames the app rather than the clock.
 */
function Countdown({ expiresAt }: { expiresAt: string }) {
  const [left, setLeft] = useState(() => secondsUntil(expiresAt));

  useEffect(() => {
    const id = setInterval(() => setLeft(secondsUntil(expiresAt)), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (left <= 0) {
    return (
      <p className="text-error text-sm font-semibold mt-3">
        This code has run out. Show it again on the computer.
      </p>
    );
  }

  const minutes = Math.floor(left / 60);
  const seconds = left % 60;

  return (
    <p className={`text-sm mt-3 ${left < 60 ? 'text-error font-semibold' : 'text-neutral-gray'}`}>
      This code works for another {minutes}:{String(seconds).padStart(2, '0')}
    </p>
  );
}

function secondsUntil(iso: string): number {
  return Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000));
}
