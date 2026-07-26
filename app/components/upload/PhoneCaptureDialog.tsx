'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircleIcon, WarningCircleIcon, XIcon } from '@phosphor-icons/react';
import {
  createUploadSession,
  getUploadSessionStatus,
  revokeUploadSession,
} from '@/lib/api/services/upload-sessions.service';
import type {
  UploadSession,
  UploadSessionPurpose,
  UploadSessionTargetType,
} from '@/types/upload-session';
import { getErrorMessage } from '@/lib/utils/error-handler';

/**
 * "Use your phone" - the desktop half of phone-as-camera.
 *
 * Everyone works on a laptop, and nobody is going to carry a laptop to a crate
 * of spoiled chicken on the floor. This draws a QR code; the phone scans it and
 * gets a no-login page that can attach files to this one document.
 *
 * Deliberately general rather than wastage-shaped. Deliveries and daily counts
 * have the same problem, and the backend is polymorphic, so this takes a target
 * and a purpose and knows nothing else about the domain.
 */
export function PhoneCaptureDialog({
  targetType,
  targetId,
  purpose,
  title,
  onClose,
}: {
  targetType: UploadSessionTargetType;
  targetId: number;
  purpose: UploadSessionPurpose;
  /** What the code is for, in the user's words. Shown above it. */
  title: string;
  onClose: () => void;
}) {
  const [session, setSession] = useState<UploadSession | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [received, setReceived] = useState(0);
  const [dead, setDead] = useState(false);

  // Guards React 18/19 StrictMode's double-invoked effects in development:
  // minting twice would immediately revoke the first code and hand the user a
  // QR whose partner session is already dead.
  const minted = useRef(false);

  useEffect(() => {
    if (minted.current) return;
    minted.current = true;

    let cancelled = false;

    (async () => {
      try {
        const issued = await createUploadSession({
          target_type: targetType,
          target_id: targetId,
          purpose,
        });
        if (cancelled) return;
        setSession(issued);

        // Loaded on demand: the QR encoder is dead weight on every other
        // inventory page, and this dialog is the only thing that ever needs it.
        const QRCode = (await import('qrcode')).default;
        const dataUrl = await QRCode.toDataURL(issued.url, {
          width: 480,
          margin: 1,
          errorCorrectionLevel: 'M',
          // Dark on white rather than on the cream card: phone scanners want
          // contrast, and a store room is not a well-lit place.
          color: { dark: '#242424', light: '#ffffff' },
        });
        if (!cancelled) setQr(dataUrl);
      } catch (e) {
        if (!cancelled) setError(getErrorMessage(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [targetType, targetId, purpose]);

  /**
   * Poll while the dialog is open, so the person at the laptop can see the
   * files land. The photos themselves arrive on their own - the API broadcasts
   * and the gallery behind this dialog refetches - so this is only the counter
   * and the "has it died yet" check.
   */
  useEffect(() => {
    if (!session || dead) return;

    const id = setInterval(async () => {
      try {
        const status = await getUploadSessionStatus(session.id);
        setReceived(status.files_uploaded);
        if (!status.usable) setDead(true);
      } catch {
        // A failed poll is not worth showing anybody. The code either works on
        // the phone or it does not, and the phone will say so.
      }
    }, 5000);

    return () => clearInterval(id);
  }, [session, dead]);

  /** Kill it now - for when the screen turns out to have been visible to a room. */
  const cancelCode = useCallback(async () => {
    if (!session) return;
    try {
      await revokeUploadSession(session.id);
    } catch {
      /* it dies on its own in minutes regardless */
    }
    setDead(true);
  }, [session]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Use your phone to add evidence"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-neutral-card border border-[#f0e8d8] rounded-2xl w-full max-w-sm p-6 relative"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center text-neutral-gray hover:bg-neutral-light cursor-pointer"
        >
          <XIcon size={16} weight="bold" />
        </button>

        <h2 className="text-base font-semibold font-body text-text-dark pr-8">Use your phone</h2>
        <p className="text-neutral-gray text-xs font-body mt-1">{title}</p>

        <div className="flex flex-col items-center mt-5">
          {error && <Problem message={error} />}

          {!error && dead && (
            <Problem message="This code is finished. Close and press the button again for a new one." />
          )}

          {!error && !dead && (
            <>
              <div className="w-56 h-56 bg-white rounded-xl border border-[#f0e8d8] flex items-center justify-center overflow-hidden">
                {qr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qr} alt="QR code to open the upload page on a phone" className="w-full h-full" />
                ) : (
                  <span className="text-neutral-gray text-sm font-body">Making a code…</span>
                )}
              </div>

              {session && <Countdown expiresAt={session.expires_at} onDead={() => setDead(true)} />}
            </>
          )}
        </div>

        {received > 0 && (
          <div className="flex items-center justify-center gap-1.5 mt-4 text-secondary">
            <CheckCircleIcon size={16} weight="fill" />
            <p className="text-sm font-semibold font-body">
              {received === 1 ? '1 file received' : `${received} files received`}
            </p>
          </div>
        )}

        <ol className="text-neutral-gray text-xs font-body mt-5 space-y-1.5 list-decimal list-inside">
          <li>Open the camera on your phone and point it at the code.</li>
          <li>Tap the link that appears.</li>
          <li>Take the photos or a short video. They land here on their own.</li>
        </ol>

        <p className="text-neutral-gray/80 text-[11px] font-body mt-4 leading-snug">
          The code uploads as you and works for a few minutes only. Anyone who can see this screen
          can use it, so close it once you have scanned.
        </p>

        {session && !dead && !error && (
          <button
            type="button"
            onClick={() => void cancelCode()}
            className="w-full mt-3 min-h-10 rounded-xl border border-[#f0e8d8] bg-neutral-light text-neutral-gray text-sm font-semibold font-body hover:text-text-dark cursor-pointer"
          >
            Cancel this code
          </button>
        )}
      </div>
    </div>
  );
}

function Problem({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 w-full">
      <WarningCircleIcon size={16} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
      <p className="text-amber-800 text-sm font-body">{message}</p>
    </div>
  );
}

function Countdown({ expiresAt, onDead }: { expiresAt: string; onDead: () => void }) {
  const [left, setLeft] = useState(() => secondsUntil(expiresAt));

  useEffect(() => {
    const id = setInterval(() => {
      const next = secondsUntil(expiresAt);
      setLeft(next);
      if (next <= 0) onDead();
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onDead]);

  const minutes = Math.floor(left / 60);
  const seconds = left % 60;

  return (
    <p className={`text-xs font-body mt-3 ${left < 60 ? 'text-rose-600 font-semibold' : 'text-neutral-gray'}`}>
      Works for another {minutes}:{String(seconds).padStart(2, '0')}
    </p>
  );
}

function secondsUntil(iso: string): number {
  return Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000));
}
