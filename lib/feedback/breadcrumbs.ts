/**
 * Breadcrumb trail — "the process the user was following" before they reported.
 * Records route changes and clicks on interactive elements.
 *
 * C7: excludes the widget's own subtree ([data-feedback-widget]) — the trail is
 * the user's steps BEFORE reporting, not them clicking the reporter UI.
 * I5: labels describe the element, never typed values.
 * I1: every push wrapped.
 */
import { RingBuffer } from './ring-buffer';
import { describeElement } from './element-info';
import type { Breadcrumb } from './types';

const TRAIL = new RingBuffer<Breadcrumb>(60);

const INTERACTIVE =
  'button, a, [role="button"], [role="tab"], [role="menuitem"], input, select, textarea, [data-testid]';

let clickInstalled = false;

function push(crumb: Breadcrumb): void {
  try {
    TRAIL.push(crumb);
  } catch {
    /* I1 */
  }
}

/** Record a navigation. Collapses consecutive duplicates (layout effects re-fire). */
export function recordNavigation(path: string): void {
  const last = TRAIL.toArray().at(-1);
  if (last && last.kind === 'nav' && last.label === path) return;
  push({ kind: 'nav', label: path, at: Date.now() });
}

/** Install the document-level click listener once. Idempotent. */
export function installClickCapture(): void {
  if (clickInstalled || typeof document === 'undefined') return;
  clickInstalled = true;

  document.addEventListener(
    'click',
    (e) => {
      try {
        const target = e.target as Element | null;
        if (!target) return;

        // C7 — ignore clicks inside the feedback widget itself.
        if (target.closest('[data-feedback-widget]')) return;

        const interactive = target.closest(INTERACTIVE);
        if (!interactive) return;

        push({ kind: 'click', label: describeElement(interactive), at: Date.now() });
      } catch {
        /* I1 */
      }
    },
    { capture: true, passive: true }, // never preventDefault
  );
}

export function breadcrumbs(): Breadcrumb[] {
  return TRAIL.toArray();
}
