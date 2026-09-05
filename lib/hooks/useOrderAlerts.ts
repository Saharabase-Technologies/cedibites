'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ARRIVAL,
  CAUTION,
  FIRM,
  URGENT,
  useAlertTone,
  type ToneSpec,
} from '@/lib/hooks/useAlertTone';

/**
 * The order board's alert layer.
 *
 * Replaces the count-based trigger the board used to run on. That one watched
 * `received.length` and chimed whenever the number went up, which fails in the
 * exact moment it matters: if an order arrives in the same refresh window that
 * another is accepted, the count is unchanged and the kitchen is never told.
 * Identity is the only reliable signal, so this tracks order ids.
 *
 * Two different problems get two different sounds, because they need two
 * different reactions:
 *
 *   An order nobody has accepted is nobody's job yet, and the longer that is
 *   true the worse it gets. It escalates — chime, then insistent, then an
 *   alarm pitched to cut through extraction fans.
 *
 *   An order that has overstayed a later stage — still cooking after fifteen
 *   minutes, plated and going cold on the pass — already belongs to someone.
 *   That earns a caution tone, repeated far less often. Treating it like an
 *   unclaimed ticket would train the kitchen to ignore the alarm that matters.
 *
 * Thresholds come from the caller's own SLA table, so what the board draws and
 * what it plays can never disagree.
 */

export type AlertUrgency = 'calm' | 'warn' | 'late';
export type AlertTier = 'calm' | 'firm' | 'urgent' | 'caution';

/** Repeat cadence per tier, in seconds. `calm` never repeats. */
const REPEAT_S: Record<Exclude<AlertTier, 'calm'>, number> = {
  firm: 30,
  urgent: 20,
  // Deliberately slow. Somebody is already cooking this; the board only needs
  // to keep saying so, not stand over them.
  caution: 60,
};

const SNOOZE_S = 90;

// ─── Synth ───────────────────────────────────────────────────────────────────
// The phrases and the audio context live in `useAlertTone`, shared with the
// till — the same arrival bell has to mean the same thing on every screen.

const PHRASE: Record<Exclude<AlertTier, 'calm'>, ToneSpec[]> = {
  firm: FIRM,
  urgent: URGENT,
  caution: CAUTION,
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface AlertOrder {
  id: string;
  /** Shown in the banner, e.g. the order number. */
  label: string;
  /** Which stage it is sitting in. Keys into `sla`. */
  stage: string;
  /** When it entered that stage, epoch ms. */
  since: number;
  /**
   * True while nobody has taken responsibility for it. Only these escalate to
   * the alarm; everything else can at most reach `caution`.
   */
  awaitingAccept: boolean;
  /**
   * True while the ticket is work the kitchen has not started.
   *
   * This is what the arrival bell announces, and it is deliberately wider than
   * `awaitingAccept`. A sale rung up at the till opens already accepted, so a
   * bell keyed on acceptance would leave almost every order arriving in
   * silence. Responsibility and arrival are two different facts: the cashier
   * has taken the order, and the kitchen has still not been told.
   */
  awaitingKitchen: boolean;
}

export interface OrderAlertsOptions {
  orders: AlertOrder[];
  /** Seconds in a stage before it counts as warn / late. Keyed by stage. */
  sla: Record<string, { warn: number; late: number }>;
  /** Master mute. Escalation still tracks so the banner stays honest. */
  enabled: boolean;
  /** Resets the seen-set so a branch switch is not heard as a rush of arrivals. */
  resetKey: string | null;
}

export interface WorstOffender {
  id: string;
  label: string;
  stage: string;
  elapsedS: number;
  urgency: AlertUrgency;
  awaitingAccept: boolean;
}

export interface OrderAlerts {
  tier: AlertTier;
  /** The order driving the current tier, for the banner. */
  worst: WorstOffender | null;
  /** How many orders are currently past their stage's `late` threshold. */
  lateCount: number;
  /** True when the browser is holding audio shut and nothing would be heard. */
  isBlocked: boolean;
  isSnoozed: boolean;
  snooze: () => void;
  /** Plays the arrival chime on demand, for the shift-start sound check. */
  test: () => void;
}

export function useOrderAlerts({
  orders,
  sla,
  enabled,
  resetKey,
}: OrderAlertsOptions): OrderAlerts {
  const { play, unlock, isBlocked } = useAlertTone(enabled);

  // ── Arrival, by identity ──────────────────────────────────────────────────

  const seenRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    // Null means "not seeded yet" — the first list after a branch switch is the
    // existing backlog, not an arrival, and must not chime.
    seenRef.current = null;
  }, [resetKey]);

  const arrivalKey = orders
    .filter((o) => o.awaitingKitchen)
    .map((o) => o.id)
    .join(',');

  useEffect(() => {
    const ids = arrivalKey === '' ? [] : arrivalKey.split(',');

    if (seenRef.current === null) {
      seenRef.current = new Set(ids);
      return;
    }
    const seen = seenRef.current;
    const arrived = ids.filter((id) => !seen.has(id));

    // Drop ids that have left the waiting list, so an order that starts cooking
    // and is then pushed back is heard again.
    const live = new Set(ids);
    for (const id of Array.from(seen)) {
      if (!live.has(id)) seen.delete(id);
    }
    for (const id of ids) seen.add(id);

    if (arrived.length > 0) play(ARRIVAL);
  }, [arrivalKey, play]);

  // ── Escalation ────────────────────────────────────────────────────────────

  const [worst, setWorst] = useState<WorstOffender | null>(null);
  const [lateCount, setLateCount] = useState(0);
  const [tier, setTier] = useState<AlertTier>('calm');
  const snoozedUntilRef = useRef(0);
  const [isSnoozed, setIsSnoozed] = useState(false);
  /** Last time each tier sounded, so they nag on their own cadences. */
  const lastPlayedRef = useRef<Record<string, number>>({});

  // One timer drives the readout and the repeat. Feeding it the current board
  // through a ref means the interval is built once rather than torn down and
  // rebuilt every time an order moves.
  const boardRef = useRef({ orders, sla });
  useEffect(() => {
    boardRef.current = { orders, sla };
  }, [orders, sla]);

  useEffect(() => {
    const tick = () => {
      const { orders: list, sla: table } = boardRef.current;
      const now = Date.now();

      const snoozed = now < snoozedUntilRef.current;
      setIsSnoozed(snoozed);

      let top: WorstOffender | null = null;
      let late = 0;

      for (const o of list) {
        const thresholds = table[o.stage];
        if (!thresholds) continue;
        const elapsedS = Math.max(0, (now - o.since) / 1000);
        const urgency: AlertUrgency =
          elapsedS >= thresholds.late ? 'late' : elapsedS >= thresholds.warn ? 'warn' : 'calm';
        if (urgency === 'calm') continue;
        if (urgency === 'late') late += 1;

        const candidate: WorstOffender = {
          id: o.id,
          label: o.label,
          stage: o.stage,
          elapsedS: Math.floor(elapsedS),
          urgency,
          awaitingAccept: o.awaitingAccept,
        };

        // An unaccepted order outranks anything else at the same urgency: it is
        // the only kind nobody has taken on yet.
        const better =
          !top ||
          (urgency === 'late' && top.urgency !== 'late') ||
          (urgency === top.urgency && candidate.awaitingAccept && !top.awaitingAccept) ||
          (urgency === top.urgency &&
            candidate.awaitingAccept === top.awaitingAccept &&
            candidate.elapsedS > top.elapsedS);
        if (better) top = candidate;
      }

      setWorst(top);
      setLateCount(late);

      const nextTier: AlertTier = !top
        ? 'calm'
        : top.awaitingAccept
          ? top.urgency === 'late'
            ? 'urgent'
            : 'firm'
          : 'caution';
      setTier(nextTier);

      if (nextTier === 'calm') {
        lastPlayedRef.current = {};
        return;
      }
      if (snoozed) return;

      const last = lastPlayedRef.current[nextTier] ?? 0;
      if (now - last < REPEAT_S[nextTier] * 1000) return;

      lastPlayedRef.current[nextTier] = now;
      play(PHRASE[nextTier]);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [play]);

  const snooze = useCallback(() => {
    snoozedUntilRef.current = Date.now() + SNOOZE_S * 1000;
    setIsSnoozed(true);
    // Restart every repeat clock so nothing fires the instant snooze ends.
    const now = Date.now();
    for (const k of Object.keys(lastPlayedRef.current)) lastPlayedRef.current[k] = now;
  }, []);

  const test = useCallback(() => {
    unlock();
    play(ARRIVAL, true);
  }, [play, unlock]);

  return { tier, worst, lateCount, isBlocked, isSnoozed, snooze, test };
}
