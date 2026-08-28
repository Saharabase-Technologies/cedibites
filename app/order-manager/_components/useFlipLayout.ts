'use client';

import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * FLIP for the order board.
 *
 * On a column board a ticket that is bumped has to leave one column and appear
 * in another, and the tickets behind it close the gap. Done instantly that is
 * the thing the kitchen complained about: a card vanishes from under the finger
 * and something else is suddenly in its place, so the second tap — the one they
 * make because the first appeared to do nothing — lands on the wrong order.
 *
 * Making the movement take 260ms does not merely decorate it. It makes the
 * movement *attributable*: you see your ticket travel to Cooking, and you see
 * the queue close up behind it, so the board never silently rearranges itself.
 * The page pairs this with a short board-wide lock on the action buttons that
 * covers the same window, which is what actually prevents the mis-tap.
 *
 * Measures with `getBoundingClientRect` before paint, inverts the delta onto the
 * element, then plays it out to zero. Cards that did not move are not touched.
 */

const DURATION_MS = 260;
const EASING = 'cubic-bezier(0.2, 0, 0, 1)';

export function useFlipLayout(key: string) {
  const nodes = useRef(new Map<string, HTMLElement>());
  const previous = useRef(new Map<string, DOMRect>());
  const lastKey = useRef<string | null>(null);

  const register = useCallback(
    (id: string) => (node: HTMLElement | null) => {
      if (node) nodes.current.set(id, node);
      else nodes.current.delete(id);
    },
    [],
  );

  useLayoutEffect(() => {
    const measure = () => {
      const next = new Map<string, DOMRect>();
      nodes.current.forEach((node, id) => next.set(id, node.getBoundingClientRect()));
      return next;
    };

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // First commit, or motion is unwanted: record positions and animate nothing.
    if (lastKey.current === null || reducedMotion || typeof Element === 'undefined' || !Element.prototype.animate) {
      previous.current = measure();
      lastKey.current = key;
      return;
    }

    const current = measure();

    current.forEach((now, id) => {
      const before = previous.current.get(id);
      const node = nodes.current.get(id);
      if (!before || !node) return;

      const dx = before.left - now.left;
      const dy = before.top - now.top;
      // Sub-pixel drift from a reflow is not movement worth animating.
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

      node.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: 'translate(0, 0)' },
        ],
        { duration: DURATION_MS, easing: EASING, composite: 'replace' },
      );
    });

    previous.current = current;
    lastKey.current = key;
  }, [key]);

  return register;
}

export const FLIP_DURATION_MS = DURATION_MS;
