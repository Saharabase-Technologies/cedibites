'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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

interface ToneSpec {
  freq: number;
  /** Seconds from the start of the phrase. */
  at: number;
  duration: number;
  gain: number;
  type?: OscillatorType;
}

/**
 * Arrival. A warm two-note bell — meant to be noticed, not to startle. This is
 * the sound staff hear most, so it is the one that must not grate by hour six.
 */
const ARRIVAL: ToneSpec[] = [
  { freq: 659.25, at: 0, duration: 0.5, gain: 0.34, type: 'triangle' },   // E5
  { freq: 987.77, at: 0.1, duration: 0.55, gain: 0.28, type: 'triangle' }, // B5
  { freq: 1318.5, at: 0.1, duration: 0.4, gain: 0.1, type: 'sine' },       // E6, shimmer
];

/** Nagging. The arrival phrase, fuller and left deliberately unresolved. */
const FIRM: ToneSpec[] = [
  { freq: 659.25, at: 0, duration: 0.28, gain: 0.4, type: 'triangle' },
  { freq: 830.61, at: 0.16, duration: 0.28, gain: 0.4, type: 'triangle' }, // G#5
  { freq: 987.77, at: 0.32, duration: 0.45, gain: 0.42, type: 'triangle' },
  { freq: 987.77, at: 0.62, duration: 0.45, gain: 0.36, type: 'triangle' },
];

/**
 * Alarm. A two-tone minor-second warble — deliberately unpleasant, and pitched
 * around 1kHz where it cuts through extraction fans and frying.
 */
const URGENT: ToneSpec[] = Array.from({ length: 5 }, (_, i) => [
  { freq: 1046.5, at: i * 0.26, duration: 0.12, gain: 0.5, type: 'square' as OscillatorType },
  { freq: 987.77, at: i * 0.26 + 0.13, duration: 0.12, gain: 0.5, type: 'square' as OscillatorType },
]).flat();

/**
 * Caution. Two low, soft descending notes — an octave and a half below the
 * alarm and half its loudness, so it reads as "look at the board" rather than
 * "drop what you are doing". Unmistakably not the unaccepted-order alarm.
 */
const CAUTION: ToneSpec[] = [
  { freq: 392.0, at: 0, duration: 0.34, gain: 0.26, type: 'sine' },   // G4
  { freq: 311.13, at: 0.26, duration: 0.5, gain: 0.24, type: 'sine' }, // D#4
];

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
  const ctxRef = useRef<AudioContext | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  // ── Audio context, and the autoplay policy ────────────────────────────────
  // The old hook built the context inside the play call and fired `resume()`
  // immediately before scheduling the oscillator. `resume()` is a promise; the
  // note was being scheduled onto a context that had not woken up yet, so it
  // played into silence. That is why the board could sit there mute all shift.
  // Here the context is resumed on any user gesture and again whenever the tab
  // comes back to the foreground, and `isBlocked` reports honestly when neither
  // has happened yet so the UI can say so out loud.

  const getCtx = useCallback((): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    if (!ctxRef.current) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctxRef.current = new Ctor();
    }
    return ctxRef.current;
  }, []);

  const unlock = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume().then(
        () => setIsBlocked(ctx.state !== 'running'),
        () => setIsBlocked(true),
      );
    } else {
      setIsBlocked(ctx.state !== 'running');
    }
  }, [getCtx]);

  useEffect(() => {
    // Reading the AudioContext's current state is exactly the "subscribe to an
    // external system" case, and the first read has to happen synchronously —
    // the whole point is to know at mount whether this screen can make a sound.
    // `unlock` writes the same value it usually already holds, so React bails
    // and there is no cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    unlock();

    const onGesture = () => unlock();
    const onVisible = () => {
      if (document.visibilityState === 'visible') unlock();
    };

    // `pointerdown` covers mouse and touch; `keydown` covers a wired keypad.
    document.addEventListener('pointerdown', onGesture);
    document.addEventListener('keydown', onGesture);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      document.removeEventListener('pointerdown', onGesture);
      document.removeEventListener('keydown', onGesture);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [unlock]);

  useEffect(
    () => () => {
      void ctxRef.current?.close();
      ctxRef.current = null;
    },
    [],
  );

  const play = useCallback(
    (phrase: ToneSpec[], force = false) => {
      if (!force && !enabled) return;
      const ctx = getCtx();
      if (!ctx) return;
      if (ctx.state !== 'running') {
        void ctx.resume();
        setIsBlocked(true);
        return;
      }
      setIsBlocked(false);

      const t0 = ctx.currentTime + 0.02;
      for (const tone of phrase) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = tone.type ?? 'triangle';
        osc.frequency.value = tone.freq;

        const start = t0 + tone.at;
        const end = start + tone.duration;
        // Ramp in over 8ms, then decay exponentially. A hard start clicks.
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(tone.gain, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, end);

        osc.start(start);
        osc.stop(end + 0.05);
      }
    },
    [getCtx, enabled],
  );

  // ── Arrival, by identity ──────────────────────────────────────────────────

  const seenRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    // Null means "not seeded yet" — the first list after a branch switch is the
    // existing backlog, not an arrival, and must not chime.
    seenRef.current = null;
  }, [resetKey]);

  const arrivalKey = orders
    .filter((o) => o.awaitingAccept)
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

    // Drop ids that have left the waiting list, so an order that is accepted and
    // then reverted is heard again.
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
