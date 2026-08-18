'use client';

/**
 * Voice note recorder. MediaRecorder → webm/opus (Whisper accepts it directly),
 * capped at ~3 minutes, with a live waveform. If the mic is denied it degrades
 * silently — the textarea is always there. Reports the recorded Blob upward.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { MicrophoneIcon, StopIcon, TrashIcon } from '@phosphor-icons/react';

const MAX_SECONDS = 180;

function pickMime(): string {
  const prefs = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
  for (const m of prefs) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) return m;
  }
  return '';
}

export function VoiceRecorder({
  audio,
  onRecorded,
  onClear,
}: {
  audio: Blob | null;
  onRecorded: (blob: Blob) => void;
  onClear: () => void;
}) {
  const [recording, setRecording] = useState(false);
  const [denied, setDenied] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopEverything = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopEverything, [stopEverything]);

  const stop = useCallback(() => {
    recorderRef.current?.state === 'recording' && recorderRef.current.stop();
    setRecording(false);
  }, []);

  const drawWave = useCallback((analyser: AnalyserNode) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const buf = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteTimeDomainData(buf);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#e49925';
      ctx.beginPath();
      const slice = canvas.width / buf.length;
      for (let i = 0; i < buf.length; i++) {
        const y = (buf[i] / 128) * (canvas.height / 2);
        const x = i * slice;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      drawWave(analyser);

      const mime = pickMime();
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: BlobPart[] = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      mr.onstop = () => {
        onRecorded(new Blob(chunks, { type: mr.mimeType || 'audio/webm' }));
        stopEverything();
      };
      recorderRef.current = mr;
      mr.start();

      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) stop();
          return s + 1;
        });
      }, 1000);
    } catch {
      setDenied(true); // silent degrade — text is always available
    }
  }, [drawWave, onRecorded, stopEverything, stop]);

  if (denied) {
    return <p className="font-body text-[11px] text-neutral-gray">Microphone unavailable. Type it instead.</p>;
  }

  if (audio && !recording) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-[#f0e8d8] bg-neutral-light px-3 py-2">
        <audio controls src={URL.createObjectURL(audio)} className="h-8 flex-1">
          <track kind="captions" />
        </audio>
        <button type="button" onClick={onClear} aria-label="Remove voice note" className="text-neutral-gray hover:text-red-500 cursor-pointer">
          <TrashIcon size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={recording ? stop : start}
        className={`flex items-center gap-1.5 rounded-xl px-3 py-2 font-body text-xs font-semibold cursor-pointer ${
          recording ? 'bg-red-500 text-white' : 'border border-[#f0e8d8] text-text-dark hover:bg-neutral-light'
        }`}
      >
        {recording ? <StopIcon size={16} weight="fill" /> : <MicrophoneIcon size={16} />}
        {recording ? 'Stop' : 'Record voice note'}
      </button>
      {recording && (
        <>
          <canvas ref={canvasRef} width={120} height={28} className="rounded" />
          <span className="font-mono text-xs text-neutral-gray">
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
          </span>
        </>
      )}
    </div>
  );
}
