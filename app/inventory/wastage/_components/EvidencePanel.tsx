'use client';

import { useRef, useState } from 'react';
import {
  CameraIcon,
  ImageSquareIcon,
  TrashIcon,
  WarningCircleIcon,
  XIcon,
} from '@phosphor-icons/react';
import { useAddWastagePhoto, useRemoveWastagePhoto } from '@/lib/api/hooks/inventory/useWastages';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import type { InventoryWastage, InventoryWastagePhoto } from '@/types/inventory';
import { getErrorMessage } from '@/lib/utils/error-handler';
import { formatDateTime } from '../utils';

const MAX_BYTES = 10 * 1024 * 1024; // matches the server's max:10240

/**
 * Photo evidence, both sides of it.
 *
 * The client's rule: *"So show me the food that has gone bad."* A branch saying
 * goods arrived spoiled and a warehouse saying they left fine is an argument no
 * quantity settles - somebody has to look at the food.
 *
 * Both accounts stay on the record and both are visible to both ends, because
 * the claim itself is scoped to its origin AND disposal location. Photos are
 * grouped by stage so the disagreement reads in the order it happened, and
 * nothing can be added or removed once the claim is settled.
 */
export function EvidencePanel({ wastage }: { wastage: InventoryWastage }) {
  const { staffUser } = useStaffAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const add = useAddWastagePhoto(wastage.id);
  const remove = useRemoveWastagePhoto(wastage.id);

  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<InventoryWastagePhoto | null>(null);

  const canAdd = wastage.accepts_evidence;
  const declared = wastage.photos.filter((p) => p.stage === 'declared');
  const inspection = wastage.photos.filter((p) => p.stage === 'inspection');
  const missingRequired = wastage.evidence_required && wastage.photos.length === 0;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);

    for (const file of Array.from(files)) {
      if (file.size > MAX_BYTES) {
        setError(`${file.name} is over 10 MB. Take it again at a smaller size.`);
        continue;
      }
      try {
        await add.mutateAsync({ file });
      } catch (e) {
        setError(getErrorMessage(e));
        break;
      }
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleRemove = async (photoId: number) => {
    setError(null);
    try {
      await remove.mutateAsync(photoId);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  return (
    <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5 mb-5">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <h2 className="text-sm font-semibold font-body text-text-dark">Evidence</h2>
          <p className="text-neutral-gray text-xs font-body mt-0.5">
            {canAdd
              ? 'Both the branch and the warehouse can add photos while the claim is open.'
              : 'Locked - this is what the decision was made on.'}
          </p>
        </div>

        {canAdd && (
          <>
            {/* No `capture` attribute: on several Android browsers it forces the
                camera and removes the option to attach a photo already taken,
                which is exactly what a manager photographing goods before the
                lorry left would have. `accept="image/*"` already offers both. */}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => void handleFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={add.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold font-body min-h-10 shrink-0 bg-neutral-light text-text-dark hover:bg-neutral-light/70 border border-[#f0e8d8] cursor-pointer disabled:opacity-50"
            >
              <CameraIcon size={15} weight="bold" />
              {add.isPending ? 'Adding…' : 'Add photo'}
            </button>
          </>
        )}
      </div>

      {missingRequired && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mt-3">
          <WarningCircleIcon size={16} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-amber-800 text-sm font-body">
            <span className="font-semibold">A photo is needed before this can be approved.</span> It
            is above the threshold, so nobody can write it off on description alone. It can still be
            refused without one.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5 mt-3">
          <WarningCircleIcon size={16} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
          <p className="text-rose-700 text-sm font-body">{error}</p>
        </div>
      )}

      {wastage.photos.length === 0 && !missingRequired && (
        <div className="flex flex-col items-center text-center py-8">
          <ImageSquareIcon size={32} weight="thin" className="text-neutral-gray/40 mb-2" />
          <p className="text-neutral-gray text-sm font-body">No photos on this claim.</p>
        </div>
      )}

      <PhotoGroup
        title="Declared by the branch"
        hint="Taken when the loss was raised."
        photos={declared}
        currentUserId={staffUser?.user_id ?? null}
        canRemove={canAdd}
        onOpen={setLightbox}
        onRemove={handleRemove}
      />
      <PhotoGroup
        title="Seen on inspection"
        hint="Taken with the returned goods in front of the approver."
        photos={inspection}
        currentUserId={staffUser?.user_id ?? null}
        canRemove={canAdd}
        onOpen={setLightbox}
        onRemove={handleRemove}
      />

      {lightbox && <Lightbox photo={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

function PhotoGroup({
  title,
  hint,
  photos,
  currentUserId,
  canRemove,
  onOpen,
  onRemove,
}: {
  title: string;
  hint: string;
  photos: InventoryWastagePhoto[];
  currentUserId: number | null;
  canRemove: boolean;
  onOpen: (photo: InventoryWastagePhoto) => void;
  onRemove: (photoId: number) => void;
}) {
  if (photos.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-gray">{title}</p>
      <p className="text-neutral-gray/80 text-[11px] font-body mb-2">{hint}</p>
      <div className="flex flex-wrap gap-2.5">
        {photos.map((photo) => {
          // Neither side gets to delete the other's evidence.
          const mine = currentUserId !== null && photo.uploaded_by_id === currentUserId;
          return (
            <figure key={photo.id} className="relative group w-28">
              <button
                type="button"
                onClick={() => onOpen(photo)}
                className="block w-28 h-28 rounded-xl overflow-hidden border border-[#f0e8d8] bg-neutral-light cursor-zoom-in"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.caption ?? `Evidence photo by ${photo.uploaded_by ?? 'staff'}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>

              {canRemove && mine && (
                <button
                  type="button"
                  onClick={() => onRemove(photo.id)}
                  aria-label="Remove this photo"
                  className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white border border-[#f0e8d8] shadow-sm flex items-center justify-center text-neutral-gray hover:text-rose-600 cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                >
                  <TrashIcon size={12} weight="bold" />
                </button>
              )}

              <figcaption className="mt-1 text-[10px] leading-tight text-neutral-gray truncate">
                {photo.uploaded_by ?? '-'}
                <span className="block text-neutral-gray/70">
                  {formatDateTime(photo.uploaded_at)}
                </span>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}

function Lightbox({ photo, onClose }: { photo: InventoryWastagePhoto; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Evidence photo"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 cursor-pointer"
      >
        <XIcon size={18} weight="bold" />
      </button>
      <figure onClick={(e) => e.stopPropagation()} className="max-w-3xl w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={photo.caption ?? 'Evidence photo'}
          className="w-full max-h-[75vh] object-contain rounded-xl"
        />
        <figcaption className="text-white/80 text-sm font-body mt-3 text-center">
          {photo.caption && <span className="block text-white">{photo.caption}</span>}
          {photo.uploaded_by ?? '-'} · {formatDateTime(photo.uploaded_at)}
        </figcaption>
      </figure>
    </div>
  );
}
