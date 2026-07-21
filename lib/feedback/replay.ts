/**
 * Session-replay id seam (the passive watching layer).
 *
 * Provider-agnostic and INERT until an error monitor is wired: it returns null
 * when nothing is configured, so the rest of the system works unchanged. When
 * Sentry (or another monitor) is added, replay runs in buffer mode — recording
 * nothing visibly until a report flushes the buffer here to obtain an id (C12:
 * you must flush on submit to get an id when there was no error).
 *
 * Two activation paths, tried in order:
 *   1. A host-provided hook `window.__cbCaptureReplayId` — set this when you wire
 *      your monitor, for full control.
 *   2. A best-effort probe of a global `Sentry` replay integration.
 */
type ReplayHook = () => Promise<string | null> | string | null;

interface ReplayGlobals {
  __cbCaptureReplayId?: ReplayHook;
  Sentry?: {
    getReplay?: () => {
      flush?: () => Promise<void>;
      getReplayId?: () => string | undefined;
    } | undefined;
  };
}

export async function captureReplayId(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as ReplayGlobals;

  try {
    // 1 — explicit host hook.
    if (typeof w.__cbCaptureReplayId === 'function') {
      return (await w.__cbCaptureReplayId()) ?? null;
    }

    // 2 — best-effort Sentry probe.
    const replay = w.Sentry?.getReplay?.();
    if (replay) {
      await replay.flush?.(); // flush the buffer so an error-free session still yields an id
      return replay.getReplayId?.() ?? null;
    }
  } catch {
    /* replay is a nice-to-have — never let it break a submit */
  }

  return null;
}
