'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The Order Manager's alert layer.
 *
 * Replaces the count-based trigger the board used to run on. That one watched
 * `received.length` and chimed whenever the number went up, which fails in the
 * exact moment it matters: if an order arrives in the same refresh window that
 * another is accepted, the count is unchanged and the kitchen is never told.
 * Identity is the only reliable signal, so this tracks order ids.
 *
 * Escalation is by the age of the oldest unaccepted order, not by how many are
 * waiting — one ticket ignored for two minutes is the failure worth shouting
 * about, twelve tickets accepted promptly is just a busy night.
 *
 *   calm    (< 30s)   arrival chime only
 *   firm    (30-90s)  re-chimes every 30s
 *   urgent  (> 90s)   alarm every 20s
 *
 * `snooze()` holds escalation down for 90s so a kitchen that knows full well it
 * is behind can silence the alarm without silencing the arrival of the next
 * order — the thing they actually still need to hear.
 */

export type AlertTier = 'calm' | 'firm' | 'urgent';

/** Seconds an order may sit unaccepted before the tier above it takes over. */
const FIRM_AFTER_S = 30;
const URGENT_AFTER_S = 90;

/** How often each tier repeats itself, in seconds. `calm` never repeats. */
const FIRM_REPEAT_S = 30;
const URGENT_REPEAT_S = 20;

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

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface OrderAlertsOptions {
  /** Ids of orders currently awaiting acceptance. */
  waitingIds: string[];
  /** `placedAt` (epoch ms) for each waiting id, keyed by id. */
  placedAt: Record<string, number>;
  /** Master mute. Escalation still tracks so the tier badge stays honest. */
  enabled: boolean;
  /** Resets the seen-set so a branch switch is not heard as a rush of new orders. */
  resetKey: string | null;
}

export interface OrderAlerts {
  tier: AlertTier;
  /** Seconds the oldest unaccepted order has been waiting. 0 when none are. */
  oldestWaitS: number;
  /** True when the browser is holding audio shut and the kitchen would hear nothing. */
  isBlocked: boolean;
  isSnoozed: boolean;
  snooze: () => void;
  /** Plays the arrival chime on demand, for the shift-start sound check. */
  test: () => void;
}

export function useOrderAlerts({
  waitingIds,
  placedAt,
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

  // `enabled` is a real dependency rather than a ref read during render. It
  // changes only when somebody presses the mute button, so rebuilding the
  // effects that depend on it costs nothing, and the arrival effect below is
  // idempotent — a re-run with no newly-arrived id makes no sound.
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

  const waitingKey = waitingIds.join(',');

  useEffect(() => {
    const ids = waitingKey === '' ? [] : waitingKey.split(',');

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
  }, [waitingKey, play]);

  // ── Escalation ────────────────────────────────────────────────────────────

  const [oldestWaitS, setOldestWaitS] = useState(0);
  const snoozedUntilRef = useRef(0);
  const [isSnoozed, setIsSnoozed] = useState(false);
  const lastEscalationRef = useRef(0);

  // One timer drives both the age readout and the repeat. Feeding it the
  // current queue through a ref means the interval is built once rather than
  // torn down and rebuilt every time an order moves.
  const waitingRef = useRef({ waitingIds, placedAt });
  useEffect(() => {
    waitingRef.current = { waitingIds, placedAt };
  }, [waitingIds, placedAt]);

  useEffect(() => {
    const tick = () => {
      const { waitingIds: ids, placedAt: placed } = waitingRef.current;
      const now = Date.now();

      const snoozed = now < snoozedUntilRef.current;
      setIsSnoozed(snoozed);

      if (ids.length === 0) {
        setOldestWaitS(0);
        lastEscalationRef.current = 0;
        return;
      }

      let oldest = 0;
      for (const id of ids) {
        const at = placed[id];
        if (at == null) continue;
        const waited = (now - at) / 1000;
        if (waited > oldest) oldest = waited;
      }
      setOldestWaitS(Math.floor(oldest));

      if (snoozed) return;

      const tier: AlertTier =
        oldest >= URGENT_AFTER_S ? 'urgent' : oldest >= FIRM_AFTER_S ? 'firm' : 'calm';
      if (tier === 'calm') return;

      const repeat = tier === 'urgent' ? URGENT_REPEAT_S : FIRM_REPEAT_S;
      if (now - lastEscalationRef.current < repeat * 1000) return;

      lastEscalationRef.current = now;
      play(tier === 'urgent' ? URGENT : FIRM);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [play]);

  const snooze = useCallback(() => {
    snoozedUntilRef.current = Date.now() + SNOOZE_S * 1000;
    setIsSnoozed(true);
    // Restart the repeat clock so the alarm does not fire the instant snooze ends.
    lastEscalationRef.current = Date.now();
  }, []);

  const test = useCallback(() => {
    unlock();
    play(ARRIVAL, true);
  }, [play, unlock]);

  const tier: AlertTier =
    oldestWaitS >= URGENT_AFTER_S ? 'urgent' : oldestWaitS >= FIRM_AFTER_S ? 'firm' : 'calm';

  return { tier, oldestWaitS, isBlocked, isSnoozed, snooze, test };
}
