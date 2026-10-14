'use client';

import { useCallback, useRef, useState } from 'react';
import { MIN_WIDTH } from './scale';

/**
 * The width of a chart's own box, kept up to date as the page is resized.
 *
 * It is 0 until the box has been measured, so a chart draws nothing on the
 * server and nothing at a guessed width.
 *
 * `ref` goes on the box. `box` is the same element, for code that needs to
 * ask it something later.
 */
export function useChartWidth<T extends HTMLElement>() {
  const box = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  /* Measured as the box is attached, before the browser paints, and again whenever its size changes. */
  const ref = useCallback((el: T | null) => {
    box.current = el;
    if (!el) return;
    const measure = () => setWidth(Math.max(MIN_WIDTH, Math.floor(el.clientWidth)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      observer.disconnect();
      box.current = null;
    };
  }, []);

  return { ref, box, width };
}
