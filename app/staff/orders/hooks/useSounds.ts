'use client';

import { useRef, useCallback } from 'react';

// ─── Sound names ───────────────────────────────────────────────────────────────

export type SoundName = 'newOrder' | 'advance' | 'complete' | 'pickup' | 'drop' | 'error' | 'notification';

// ─── useSounds ────────────────────────────────────────────────────────────────
// All sounds are synthesised via Web Audio API — no asset files, zero latency.
// Envelope: soft 35 ms attack → exponential bell-decay (sounds like a chime,
// not an electronic beep). All waveforms are sine for maximum sweetness.

export function useSounds() {
    const ctxRef = useRef<AudioContext | null>(null);

    function getCtx(): AudioContext | null {
        if (typeof window === 'undefined') return null;
        if (!ctxRef.current) {
            ctxRef.current = new (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        }
        if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
        return ctxRef.current;
    }

    // Single bell tone — soft attack, exponential ring-out
    const tone = useCallback((
        freq: number,
        duration: number,
        vol = 0.13,
        delay = 0,
    ) => {
        const ctx = getCtx();
        if (!ctx) return;
        try {
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

            // Soft attack → exponential bell decay (0.0001 avoids log(0) error)
            gain.gain.setValueAtTime(0, ctx.currentTime + delay);
            gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + 0.035);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);

            osc.start(ctx.currentTime + delay);
            osc.stop(ctx.currentTime + delay + duration + 0.05);
        } catch {
            // AudioContext unavailable (SSR / sandboxed)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const playSound = useCallback((name: SoundName) => {
        try {
            switch (name) {

                // New order — gentle 4-note wind-chime (A major arpeggio + octave)
                case 'newOrder':
                    tone(440,  0.50, 0.14, 0.00);   // A4
                    tone(554,  0.50, 0.13, 0.18);   // C#5
                    tone(659,  0.55, 0.13, 0.36);   // E5
                    tone(880,  0.70, 0.11, 0.54);   // A5 — longer ring on final note
                    break;

                // Status advanced — two soft ascending bell tones
                case 'advance':
                    tone(659,  0.40, 0.12, 0.00);   // E5
                    tone(880,  0.50, 0.12, 0.16);   // A5
                    break;

                // Order complete — delicate 4-note C-major chime
                case 'complete':
                    tone(523,  0.32, 0.12, 0.00);   // C5
                    tone(659,  0.34, 0.12, 0.14);   // E5
                    tone(784,  0.36, 0.12, 0.28);   // G5
                    tone(1047, 0.65, 0.10, 0.42);   // C6 — long, gentle final ring
                    break;

                // Drag pickup — barely-there soft tap
                case 'pickup':
                    tone(660,  0.09, 0.07, 0.00);   // E5, very quiet & short
                    break;

                // Card dropped — gentle double chime (G–B ascending)
                case 'drop':
                    tone(784,  0.30, 0.11, 0.00);   // G5
                    tone(988,  0.40, 0.11, 0.13);   // B5
                    break;

                // Error — soft descending two-tone (no harsh waveforms)
                case 'error':
                    tone(659,  0.32, 0.11, 0.00);   // E5  ↘
                    tone(494,  0.45, 0.11, 0.18);   // B4  descending minor 3rd
                    break;

                // Notification — clean G–C bell interval
                case 'notification':
                    tone(784,  0.28, 0.12, 0.00);   // G5
                    tone(1047, 0.42, 0.11, 0.15);   // C6
                    break;
            }
        } catch {
            // AudioContext unavailable (SSR / sandboxed iframe)
        }
    }, [tone]);

    return { playSound };
}
