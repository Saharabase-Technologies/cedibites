/**
 * Public surface of the silent-capture layer. `snapshot()` returns everything
 * the capture buffers know right now — the widget calls it at submit time.
 */
import { consoleEntries } from './console-buffer';
import { networkEntries } from './network-buffer';
import { breadcrumbs } from './breadcrumbs';
import { recentRequestIds } from './request-id';
import type { CaptureSnapshot } from './types';

export type { CaptureSnapshot } from './types';
export { installConsoleCapture } from './console-buffer';
export { installClickCapture, recordNavigation } from './breadcrumbs';
export { describeElement, buildCssSelector } from './element-info';

/** Assemble a point-in-time snapshot of the capture buffers. */
export function snapshot(): CaptureSnapshot {
  return {
    capturedAt: Date.now(),
    consoleEntries: consoleEntries(),
    network: networkEntries(),
    breadcrumbs: breadcrumbs(),
    requestIds: recentRequestIds(),
  };
}

/** Expose the snapshot on window for devtools debugging (Phase 0 acceptance). */
export function installDevtoolsHook(): void {
  if (typeof window === 'undefined') return;
  (window as unknown as Record<string, unknown>).__cbFeedbackSnapshot = snapshot;
}
