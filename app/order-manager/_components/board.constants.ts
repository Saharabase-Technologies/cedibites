import type { OrderStatus } from '@/types/order';
import { STAGE_SLA_S as SHARED_SLA } from '@/lib/constants/order.constants';

/**
 * The Order Manager's visual language.
 *
 * Built on the inventory portal's palette rather than the stock Tailwind ramp
 * the board used to reach for — `blue-500`, `teal-600`, `amber-500` read cold
 * and generic on our cream (#fbf6ed) beside the gold (#e49925). These are the
 * same hues, desaturated and warmed onto the brand's scale, in the same way
 * `inventory/_components/status-tokens.ts` treats its own badges.
 *
 * Every text-on-background pairing here clears WCAG AA (>= 4.5:1).
 */

export type BoardStage = 'cancel_requested' | 'received' | 'accepted' | 'preparing' | 'ready';

export interface StageTone {
  /** Kitchen-facing name. Deliberately shorter than the customer-facing label. */
  label: string;
  /** Column heading. */
  columnLabel: string;
  /** Ticket surface tint. */
  bg: string;
  /** Text on `bg`. */
  text: string;
  /** Solid fill for the column-count pill and legend dot. */
  dot: string;
  /** The primary action button that moves a ticket out of this stage. */
  action: string;
  /** What that button says. Null when the stage has no single next step. */
  actionLabel: string | null;
  /** Where the button sends it. */
  next: OrderStatus | null;
}

export const STAGE: Record<BoardStage, StageTone> = {
  /** Somebody has asked for this order to be pulled. Outranks everything. */
  cancel_requested: {
    label: 'Cancel asked',
    columnLabel: 'Cancel Requests',
    bg: 'bg-[#f9ecec]',
    text: 'text-[#8a3333]',
    dot: 'bg-[#c05252]',
    action: 'bg-[#c05252] hover:bg-[#a94545] text-white',
    actionLabel: null,
    next: null,
  },
  /** Not yet acknowledged. The brand gold, because this is the one that needs a person. */
  received: {
    label: 'New',
    columnLabel: 'New',
    bg: 'bg-[#fdf3e2]',
    text: 'text-[#8a5a12]',
    dot: 'bg-primary',
    action: 'bg-primary hover:bg-primary-hover text-white',
    actionLabel: 'Accept',
    next: 'accepted',
  },
  /** Acknowledged, not yet on the pass. The inventory `decided` blue. */
  accepted: {
    label: 'Accepted',
    columnLabel: 'Accepted',
    bg: 'bg-[#e7edf3]',
    text: 'text-[#2f5570]',
    dot: 'bg-[#4f7a99]',
    action: 'bg-[#4f7a99] hover:bg-[#436b85] text-white',
    actionLabel: 'Start Cooking',
    next: 'preparing',
  },
  /** On the pass. Terracotta — the one stage that should read as heat. */
  preparing: {
    label: 'Cooking',
    columnLabel: 'Cooking',
    bg: 'bg-[#f7ece5]',
    text: 'text-[#8a4b2c]',
    dot: 'bg-[#c1703f]',
    action: 'bg-[#c1703f] hover:bg-[#a85f33] text-white',
    actionLabel: 'Mark Ready',
    next: 'ready',
  },
  /** Cooked and waiting to leave. */
  ready: {
    label: 'Ready',
    columnLabel: 'Ready',
    bg: 'bg-[#eaf3ec]',
    text: 'text-[#2f6b45]',
    dot: 'bg-[#4a9469]',
    action: 'bg-[#4a9469] hover:bg-[#3d7d58] text-white',
    actionLabel: 'Complete',
    next: 'completed',
  },
};

/** Left to right, in the order work actually flows. */
export const STAGE_ORDER: BoardStage[] = ['received', 'accepted', 'preparing', 'ready'];

// ─── Time pressure ───────────────────────────────────────────────────────────

/**
 * Re-exported from the shared table so the Order Manager and the Kitchen
 * Display cannot drift apart on what counts as late. Typed to this screen's
 * stages here, where they are known.
 */
export const STAGE_SLA_S: Record<BoardStage, { warn: number; late: number }> =
  SHARED_SLA as Record<BoardStage, { warn: number; late: number }>;

export type Urgency = 'calm' | 'warn' | 'late';

export function urgencyFor(stage: BoardStage, elapsedS: number): Urgency {
  const sla = STAGE_SLA_S[stage];
  if (elapsedS >= sla.late) return 'late';
  if (elapsedS >= sla.warn) return 'warn';
  return 'calm';
}

/** Ring drawn around a ticket that has overstayed its stage. */
export const URGENCY_RING: Record<Urgency, string> = {
  calm: '',
  warn: 'ring-1 ring-[#e0a33c]',
  late: 'ring-2 ring-[#c05252]',
};

/** How the age readout itself is coloured. */
export const URGENCY_TEXT: Record<Urgency, string> = {
  calm: 'text-neutral-gray',
  warn: 'text-[#8a5a12]',
  late: 'text-[#8a3333] font-bold',
};

// ─── Formatting ──────────────────────────────────────────────────────────────

/**
 * Clock-style age, seconds included under a minute.
 *
 * The old board rounded everything to whole minutes and showed "Just now" for
 * the entire first minute, which on the New column is exactly the window the
 * kitchen is being measured on. Seconds matter there.
 */
export function formatElapsed(elapsedS: number): string {
  if (elapsedS < 60) return `${Math.max(0, Math.floor(elapsedS))}s`;
  const m = Math.floor(elapsedS / 60);
  const s = Math.floor(elapsedS % 60);
  if (m < 60) return `${m}:${String(s).padStart(2, '0')}`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
