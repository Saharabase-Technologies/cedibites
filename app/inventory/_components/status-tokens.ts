/**
 * Status colours for the inventory portal.
 *
 * The badges previously used stock Tailwind palette colours (blue-50/700,
 * indigo, violet). Those are tuned for a white page; on our cream (#fbf6ed)
 * surface next to the gold (#e49925) and charcoal (#1d1a16) they read cold and
 * off-brand — the saturated `blue-500` on "Approved" especially.
 *
 * The cool tones below are desaturated and warmed so they sit on the same scale
 * as the brand: still unmistakably blue/indigo/mauve, but muted enough to
 * belong beside the gold. The warm tones (waiting/done/problem) already agreed
 * with the palette and keep their meaning — amber reads "waiting", rose reads
 * "wrong" — so they are left alone.
 *
 * Every pairing here clears WCAG AA (≥ 4.5:1) for the text on its background.
 */

export interface StatusTone {
  bg: string;
  text: string;
  dot: string;
}

export const TONE = {
  /** Draft, closed — no action implied. */
  neutral: {
    bg: 'bg-neutral-light',
    text: 'text-neutral-gray',
    dot: 'bg-neutral-gray/60',
  },
  /** Terminal but inert — closed, archived. Darker than `neutral`. */
  settled: {
    bg: 'bg-neutral-light',
    text: 'text-text-dark',
    dot: 'bg-text-dark/60',
  },
  /** Waiting on a human — submitted, pending approval. */
  waiting: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  /** Decided, not yet done — approved. The brand blue. */
  decided: {
    bg: 'bg-[#e7edf3]',
    text: 'text-[#2f5570]',
    dot: 'bg-[#4f7a99]',
  },
  /** Physically in motion — in transit. */
  moving: {
    bg: 'bg-[#ecebf4]',
    text: 'text-[#454a72]',
    dot: 'bg-[#6a6fa2]',
  },
  /** Part-way there — partially received. */
  partial: {
    bg: 'bg-[#f2ebf0]',
    text: 'text-[#6a4763]',
    dot: 'bg-[#9a7091]',
  },
  /** Complete and correct — received, fulfilled. */
  done: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  /** Something went wrong — disputed, rejected, cancelled. */
  problem: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    dot: 'bg-rose-500',
  },
  /** Closed, but it ended badly — keeps the warning without shouting. */
  problemSettled: {
    bg: 'bg-neutral-light',
    text: 'text-rose-700',
    dot: 'bg-rose-400',
  },
} satisfies Record<string, StatusTone>;
