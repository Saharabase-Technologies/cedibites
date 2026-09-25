'use client';

import { useRef, useState } from 'react';
import { CameraIcon, SpinnerIcon, XIcon } from '@phosphor-icons/react';
import { openingService } from '@/lib/api/services/opening.service';
import { toast } from '@/lib/utils/toast';
import type { OpeningAnswer } from '@/types/opening';

/**
 * Photos against one checklist line, and the button that adds one.
 *
 * No `capture` attribute on the input: it forces the camera on some Android
 * browsers and takes away the choice of a photo already on the phone. The
 * server decides whether a photo shows the problem or the fix.
 */
export function PhotoStrip({
    branchId,
    answer,
    myUserId,
    onChange,
    readOnly = false,
    compact = false,
}: {
    branchId: number;
    answer: OpeningAnswer;
    myUserId?: number;
    onChange: (answer: OpeningAnswer) => void;
    readOnly?: boolean;
    /** The camera button alone, for a line with no photo and nothing wrong. */
    compact?: boolean;
}) {
    const input = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const photos = answer.photos ?? [];

    async function add(file: File) {
        setBusy(true);
        try {
            onChange(await openingService.addPhoto(branchId, answer.id, file));
        } catch (err) {
            toast.error((err as Error).message || 'That photo did not upload. Try again.');
        } finally {
            setBusy(false);
            if (input.current) input.current.value = '';
        }
    }

    async function remove(photoId: number) {
        setBusy(true);
        try {
            onChange(await openingService.removePhoto(branchId, photoId));
        } catch (err) {
            toast.error((err as Error).message || 'That photo could not be removed.');
        } finally {
            setBusy(false);
        }
    }

    if (readOnly && photos.length === 0) return null;

    const picker = (
        <input
            ref={input}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void add(file);
            }}
        />
    );

    if (compact) {
        return (
            <>
                {picker}
                <button
                    type="button"
                    onClick={() => input.current?.click()}
                    disabled={busy}
                    aria-label="Add a photo"
                    title="Add a photo"
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-neutral-gray hover:text-text-dark cursor-pointer disabled:opacity-50"
                >
                    {busy ? <SpinnerIcon size={16} className="animate-spin" /> : <CameraIcon size={18} />}
                </button>
            </>
        );
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            {photos.map((photo) => (
                <div key={photo.id} className="relative">
                    <a href={photo.url} target="_blank" rel="noopener noreferrer" className="block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={photo.thumb_url}
                            alt={photo.stage === 'fixed' ? 'Photo of the fix' : 'Photo of the problem'}
                            className="h-14 w-14 rounded-lg object-cover border border-[#e3ddd0] bg-neutral-light"
                            onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
                        />
                    </a>
                    {photo.stage === 'fixed' && (
                        <span className="absolute bottom-0.5 left-0.5 rounded bg-emerald-50 px-1 text-[10px] font-semibold text-emerald-700">
                            Fix
                        </span>
                    )}
                    {!readOnly && myUserId !== undefined && photo.uploaded_by === myUserId && (
                        <button
                            type="button"
                            onClick={() => remove(photo.id)}
                            disabled={busy}
                            aria-label="Remove this photo"
                            className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-white border border-[#e3ddd0] text-neutral-gray hover:text-rose-700 cursor-pointer"
                        >
                            <XIcon size={12} weight="bold" />
                        </button>
                    )}
                </div>
            ))}

            {!readOnly && (
                <>
                    {picker}
                    <button
                        type="button"
                        onClick={() => input.current?.click()}
                        disabled={busy}
                        className="flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-body text-neutral-gray hover:text-text-dark cursor-pointer disabled:opacity-50"
                    >
                        {busy ? <SpinnerIcon size={16} className="animate-spin" /> : <CameraIcon size={16} />}
                        {photos.length ? 'Add another photo' : 'Add a photo'}
                    </button>
                </>
            )}
        </div>
    );
}
