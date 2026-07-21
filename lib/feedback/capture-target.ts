/**
 * Resolving WHAT actually scrolls before we screenshot or place pins (C8). The
 * CediBites portals scroll inside `<main class="overflow-y-auto">`, not the
 * document body — so a naïve body capture grabs only the viewport and pins drift.
 *
 * This picks the real scroll container and hands both the screenshot util and the
 * element picker a single, shared coordinate frame: the container's full
 * scroll size, origin at its content top-left.
 */

export interface CaptureTarget {
  /** The element to capture (its full scroll content). */
  element: HTMLElement;
  /** Full content size — what the screenshot spans and pins are relative to. */
  width: number;
  height: number;
  /** True when the page scrolls on the window rather than inside `element`. */
  scrollsWindow: boolean;
}

/** Find the primary scroll container, or fall back to the whole document. */
export function resolveCaptureTarget(): CaptureTarget {
  const main = document.querySelector('main');
  if (
    main instanceof HTMLElement &&
    main.scrollHeight > main.clientHeight + 4 &&
    /(auto|scroll)/.test(getComputedStyle(main).overflowY)
  ) {
    return { element: main, width: main.scrollWidth, height: main.scrollHeight, scrollsWindow: false };
  }

  const doc = document.documentElement;
  return {
    element: document.body,
    width: doc.scrollWidth,
    height: doc.scrollHeight,
    scrollsWindow: true,
  };
}

/** The container's current scroll offset + viewport origin, for coord mapping. */
export function scrollFrame(target: CaptureTarget): {
  scrollTop: number;
  scrollLeft: number;
  originTop: number;
  originLeft: number;
} {
  if (target.scrollsWindow) {
    return { scrollTop: window.scrollY, scrollLeft: window.scrollX, originTop: 0, originLeft: 0 };
  }
  const rect = target.element.getBoundingClientRect();
  return {
    scrollTop: target.element.scrollTop,
    scrollLeft: target.element.scrollLeft,
    originTop: rect.top,
    originLeft: rect.left,
  };
}

/** Viewport click → page-relative percentage within the capture frame. */
export function clientToPagePercent(
  clientX: number,
  clientY: number,
  target: CaptureTarget,
): { x: number; y: number } {
  const f = scrollFrame(target);
  const pageX = clientX - f.originLeft + f.scrollLeft;
  const pageY = clientY - f.originTop + f.scrollTop;
  return {
    x: (pageX / target.width) * 100,
    y: (pageY / target.height) * 100,
  };
}

/** Page-relative percentage → current viewport position (for live pin overlay). */
export function pagePercentToClient(
  xPct: number,
  yPct: number,
  target: CaptureTarget,
): { x: number; y: number } {
  const f = scrollFrame(target);
  return {
    x: (xPct / 100) * target.width - f.scrollLeft + f.originLeft,
    y: (yPct / 100) * target.height - f.scrollTop + f.originTop,
  };
}
