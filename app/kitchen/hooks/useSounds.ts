'use client';

import { useCallback, useRef, useEffect } from 'react';

/**
 * Kitchen-specific sound effects using Web Audio API
 * Louder and more attention-grabbing than POS sounds
 */
export function useKitchenSounds() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const isEnabledRef = useRef(true);

  // Initialize AudioContext lazily
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume if suspended (autoplay policy)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // Play a tone with given frequency, duration, and volume
  const playTone = useCallback((
    frequency: number,
    duration: number,
    volume: number = 0.3,
    type: OscillatorType = 'sine',
    delay: number = 0
  ) => {
    if (!isEnabledRef.current) return;

    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = type;
      oscillator.frequency.value = frequency;

      const startTime = ctx.currentTime + delay;
      const endTime = startTime + duration;

      // Envelope for smooth sound
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, endTime);

      oscillator.start(startTime);
      oscillator.stop(endTime + 0.1);
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }, [getAudioContext]);

  // New order alert - LOUD attention-grabbing chime
  const playNewOrder = useCallback(() => {
    // Three ascending tones, repeated twice
    const notes = [523, 659, 784]; // C5, E5, G5

    notes.forEach((freq, i) => {
      playTone(freq, 0.15, 0.5, 'triangle', i * 0.12);
    });

    // Repeat after short pause
    setTimeout(() => {
      notes.forEach((freq, i) => {
        playTone(freq, 0.15, 0.5, 'triangle', i * 0.12);
      });
    }, 500);
  }, [playTone]);

  // Order started (received → preparing)
  const playOrderStarted = useCallback(() => {
    playTone(440, 0.1, 0.3, 'sine', 0);      // A4
    playTone(554, 0.15, 0.3, 'sine', 0.08);  // C#5
  }, [playTone]);

  // Order ready - satisfying completion sound
  const playOrderReady = useCallback(() => {
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      playTone(freq, 0.2, 0.4, 'sine', i * 0.1);
    });
  }, [playTone]);

  // Urgent/rush order alert
  const playUrgent = useCallback(() => {
    // Fast alternating tones
    for (let i = 0; i < 4; i++) {
      playTone(880, 0.08, 0.5, 'square', i * 0.15);
      playTone(698, 0.08, 0.5, 'square', i * 0.15 + 0.08);
    }
  }, [playTone]);

  // Tap feedback (subtle)
  const playTap = useCallback(() => {
    playTone(600, 0.05, 0.15, 'sine', 0);
  }, [playTone]);

  // Error sound
  const playError = useCallback(() => {
    playTone(200, 0.15, 0.3, 'sawtooth', 0);
    playTone(150, 0.2, 0.3, 'sawtooth', 0.1);
  }, [playTone]);

  // Enable/disable sounds
  const setEnabled = useCallback((enabled: boolean) => {
    isEnabledRef.current = enabled;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    playNewOrder,
    playOrderStarted,
    playOrderReady,
    playUrgent,
    playTap,
    playError,
    setEnabled,
  };
}
