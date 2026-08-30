'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The shared alert synth for every staff screen that has to make a noise.
 *
 * Lifted out of `useOrderAlerts` when the till needed the same arrival chime.
 * Kept as one implementation on purpose: the autoplay handling below is the
 * fix for a board that sat mute for a whole shift, and a second copy of it
 * somewhere else is a second chance to get that wrong.
 *
 * Phrases live here too, so the sound an order makes does not depend on which
 * screen happened to hear it first.
 */

export interface ToneSpec {
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
export const ARRIVAL: ToneSpec[] = [
  { freq: 659.25, at: 0, duration: 0.5, gain: 0.34, type: 'triangle' },   // E5
  { freq: 987.77, at: 0.1, duration: 0.55, gain: 0.28, type: 'triangle' }, // B5
  { freq: 1318.5, at: 0.1, duration: 0.4, gain: 0.1, type: 'sine' },       // E6, shimmer
];

/** Nagging. The arrival phrase, fuller and left deliberately unresolved. */
export const FIRM: ToneSpec[] = [
  { freq: 659.25, at: 0, duration: 0.28, gain: 0.4, type: 'triangle' },
  { freq: 830.61, at: 0.16, duration: 0.28, gain: 0.4, type: 'triangle' }, // G#5
  { freq: 987.77, at: 0.32, duration: 0.45, gain: 0.42, type: 'triangle' },
  { freq: 987.77, at: 0.62, duration: 0.45, gain: 0.36, type: 'triangle' },
];

/**
 * Alarm. A two-tone minor-second warble — deliberately unpleasant, and pitched
 * around 1kHz where it cuts through extraction fans and frying.
 */
export const URGENT: ToneSpec[] = Array.from({ length: 5 }, (_, i) => [
  { freq: 1046.5, at: i * 0.26, duration: 0.12, gain: 0.5, type: 'square' as OscillatorType },
  { freq: 987.77, at: i * 0.26 + 0.13, duration: 0.12, gain: 0.5, type: 'square' as OscillatorType },
]).flat();

/**
 * Caution. Two low, soft descending notes — an octave and a half below the
 * alarm and half its loudness, so it reads as "look at the board" rather than
 * "drop what you are doing". Unmistakably not the unaccepted-order alarm.
 */
export const CAUTION: ToneSpec[] = [
  { freq: 392.0, at: 0, duration: 0.34, gain: 0.26, type: 'sine' },   // G4
  { freq: 311.13, at: 0.26, duration: 0.5, gain: 0.24, type: 'sine' }, // D#4
];

export interface AlertTone {
  /** Sound a phrase. `force` ignores the mute, for a deliberate sound check. */
  play: (phrase: ToneSpec[], force?: boolean) => void;
  /** Wake the audio context. Safe to call on any gesture. */
  unlock: () => void;
  /** True when the browser is holding audio shut and nothing would be heard. */
  isBlocked: boolean;
}

export function useAlertTone(enabled: boolean): AlertTone {
  const ctxRef = useRef<AudioContext | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  // ── Audio context, and the autoplay policy ────────────────────────────────
  // The original hook built the context inside the play call and fired
  // `resume()` immediately before scheduling the oscillator. `resume()` is a
  // promise; the note was being scheduled onto a context that had not woken up
  // yet, so it played into silence. That is why the board could sit there mute
  // all shift. Here the context is resumed on any user gesture and again
  // whenever the tab comes back to the foreground, and `isBlocked` reports
  // honestly when neither has happened yet so the UI can say so out loud.

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

  return { play, unlock, isBlocked };
}
