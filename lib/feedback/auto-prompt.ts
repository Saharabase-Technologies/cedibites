/**
 * Auto-prompt bus — catches the users who'd never click the button. The shared
 * axios error interceptor calls `signalProblem()` on a genuine unexpected failure
 * (5xx or dead connection); the mounted widget subscribes and offers to report.
 *
 * Debounced to one prompt / 60s — an outage fires dozens of 5xxs (C7). The
 * feedback endpoint is excluded at the call site so a failing submit can't prompt
 * you to report the failure (an infinite loop).
 */
type Listener = () => void;

const listeners = new Set<Listener>();
const DEBOUNCE_MS = 60_000;
let lastSignal = 0;

export function signalProblem(): void {
  const now = Date.now();
  if (now - lastSignal < DEBOUNCE_MS) return; // one prompt per outage burst
  lastSignal = now;
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      /* a bad listener must never break the caller */
    }
  });
}

export function onProblem(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
