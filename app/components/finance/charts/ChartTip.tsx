'use client';

import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

/**
 * The readout that follows the pointer over a Finance chart.
 *
 * It lists every series at that point, so nobody has to land on a line to
 * read a value. It never holds a figure the page does not also show in a
 * table.
 *
 * Its quiet text is `#6f6353`, the axis grey. The kit's grey is too pale at
 * this size on the cream card.
 */

/** Where the pointer is, in the window. */
export interface TipAt {
  x: number;
  y: number;
}

/** How far the readout sits from the pointer, and from the window's edge. */
const OFFSET = 14;
const EDGE = 8;

export function ChartTip({ at, children }: { at: TipAt | null; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  /* Placed before the browser paints, and flipped to the other side of the pointer where it would leave the window. */
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !at) return;
    const { width, height } = el.getBoundingClientRect();
    let left = at.x + OFFSET, top = at.y + OFFSET;
    if (left + width > window.innerWidth - EDGE) left = at.x - width - OFFSET;
    if (left < EDGE) left = EDGE;
    if (top + height > window.innerHeight - EDGE) top = at.y - height - OFFSET;
    if (top < EDGE) top = EDGE;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  });

  if (!at) return null;
  return createPortal(
    <div
      ref={ref}
      role="status"
      className="fixed z-60 pointer-events-none min-w-44 max-w-80 bg-neutral-card border border-[#f0e8d8] rounded-xl shadow-lg px-3 py-2.5 text-xs font-body text-text-dark"
    >
      {children}
    </div>,
    document.body,
  );
}

/** Puts the readout away when the page scrolls, or when a tap lands outside the chart. */
export function useTipDismiss(chart: RefObject<HTMLElement | null>, shown: boolean, hide: () => void) {
  useEffect(() => {
    if (!shown) return;
    const outside = (e: PointerEvent) => {
      if (chart.current && !chart.current.contains(e.target as Node)) hide();
    };
    window.addEventListener('scroll', hide, { passive: true, capture: true });
    document.addEventListener('pointerdown', outside);
    return () => {
      window.removeEventListener('scroll', hide, { capture: true });
      document.removeEventListener('pointerdown', outside);
    };
  }, [chart, shown, hide]);
}

/** What the readout is about: a month, a day, a branch. */
export function TipTitle({ children }: { children: ReactNode }) {
  return <p className="font-semibold mb-1.5">{children}</p>;
}

/** The rows of a readout. One grid for all of them, so the figures line up. */
export function TipRows({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-2 gap-y-1">{children}</div>;
}

/** A square of the series colour. Hollow for a part month, as its dot is on the chart. */
export function SeriesKey({ colour, hollow }: { colour?: string; hollow?: boolean }) {
  if (!colour) return <span />;
  return hollow
    ? <span className="size-2.5 rounded-full border-2" style={{ borderColor: colour }} />
    : <span className="size-2.5 rounded-sm" style={{ backgroundColor: colour }} />;
}

/** One series at this point. The figure leads. `extra` is a second, quieter figure. */
export function TipRow({
  colour,
  hollow,
  name,
  value,
  extra,
}: {
  colour?: string;
  hollow?: boolean;
  name: string;
  value: string;
  extra?: string | null;
}) {
  return (
    <>
      <SeriesKey colour={colour} hollow={hollow} />
      <span>{name}</span>
      <span className="font-semibold tabular-nums text-right">{value}</span>
      <span className="text-[#6f6353] tabular-nums text-right">{extra}</span>
    </>
  );
}

/** Column headings over the two figures of a row. */
export function TipHead({ value, extra }: { value: string; extra: string }) {
  return (
    <>
      <span />
      <span />
      <span className="text-[#6f6353] text-right">{value}</span>
      <span className="text-[#6f6353] text-right">{extra}</span>
    </>
  );
}

/** The total under the rows, set off by a rule. */
export function TipTotal({ name, value, extra }: { name: string; value: string; extra?: string | null }) {
  return (
    <>
      <span className="col-span-4 border-t border-[#f0e8d8]" />
      <span />
      <span>{name}</span>
      <span className="font-semibold tabular-nums text-right">{value}</span>
      <span className="text-[#6f6353] tabular-nums text-right">{extra}</span>
    </>
  );
}

/** A quiet line at the foot of a readout. */
export function TipNote({ children }: { children: ReactNode }) {
  return <p className="text-[#6f6353] mt-1.5">{children}</p>;
}
