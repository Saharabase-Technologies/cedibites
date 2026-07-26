'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowUUpLeftIcon,
  CameraIcon,
  PlusIcon,
  TrashIcon,
  WarningCircleIcon,
  XIcon,
} from '@phosphor-icons/react';
import {
  InventoryModal,
  FormField,
  TextInput,
  Textarea,
  Select,
  PrimaryButton,
} from '../../_components';
import { useWastageReasons, useRecordWastage } from '@/lib/api/hooks/inventory/useWastages';
import { addWastagePhoto as addPhoto } from '@/lib/api/services/inventory/wastages.service';
import { useInventoryItems } from '@/lib/api/hooks/inventory/useInventoryCatalog';
import { useInventoryLocations } from '@/lib/api/hooks/inventory/useInventoryLocations';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import type { WastageReason } from '@/types/inventory';
import { getErrorMessage } from '@/lib/utils/error-handler';
import { formatGhs, formatQty } from '../utils';

interface DraftLine {
  key: string;
  itemId: string;
  quantity: string;
  reason: WastageReason | '';
  note: string;
}

const blankLine = (): DraftLine => ({
  key: Math.random().toString(36).slice(2),
  itemId: '',
  quantity: '',
  reason: '',
  note: '',
});

export function RecordWastageForm({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const { staffUser } = useStaffAuth();
  const record = useRecordWastage();

  const { data: catalog } = useWastageReasons();
  const { data: locations = [] } = useInventoryLocations({ is_active: true });

  const [locationId, setLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([blankLine()]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // You can only declare a loss where you actually work — the same rule the
  // server enforces, surfaced here so the picker never offers a dead end.
  const operating = staffUser?.operating_location_ids ?? null;
  const declarable = useMemo(
    () =>
      operating === null
        ? locations
        : locations.filter((l) => operating.includes(l.id)),
    [locations, operating],
  );

  useEffect(() => {
    if (!locationId && declarable.length > 0) setLocationId(String(declarable[0].id));
  }, [declarable, locationId]);

  // Only what the location actually holds — you cannot waste what you do not
  // have, and offering the full catalogue here just invites a server rejection.
  const locId = Number(locationId) || 0;
  const { data: items = [] } = useInventoryItems(
    locId > 0 ? { location_id: locId, in_stock_only: true, is_active: true } : undefined,
  );
  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const selectedLocation = declarable.find((l) => l.id === locId) ?? null;
  const isWarehouse = selectedLocation?.type === 'warehouse';

  // Live valuation, so the threshold consequence is visible while typing rather
  // than sprung after submit.
  const totalValue = useMemo(
    () =>
      lines.reduce((sum, l) => {
        const item = itemsById.get(Number(l.itemId));
        const qty = Number(l.quantity);
        if (!item || !Number.isFinite(qty) || qty <= 0) return sum;
        return sum + qty * (item.weighted_avg_cost ?? 0);
      }, 0),
    [lines, itemsById],
  );

  const threshold = catalog?.threshold ?? 500;
  const overThreshold = totalValue > threshold;
  const willNeedReturn = overThreshold && !isWarehouse;

  const reset = () => {
    setLines([blankLine()]);
    setNotes('');
    setPhotos([]);
    setError(null);
  };

  const setLine = (key: string, patch: Partial<DraftLine>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const submit = async () => {
    setError(null);

    const payloadLines = lines
      .filter((l) => l.itemId && l.quantity && l.reason)
      .map((l) => ({
        item_id: Number(l.itemId),
        quantity: Number(l.quantity),
        reason: l.reason as WastageReason,
        reason_note: l.note.trim() || null,
      }));

    if (payloadLines.length === 0) {
      setError('Add at least one item, with a quantity and a reason.');
      return;
    }
    if (payloadLines.some((l) => !Number.isFinite(l.quantity) || l.quantity <= 0)) {
      setError('Quantities must be greater than zero.');
      return;
    }

    const needsNote = lines.find((l) => l.reason === 'other' && !l.note.trim());
    if (needsNote) {
      setError('Choosing “Other” means saying what happened — add a note.');
      return;
    }

    try {
      const wastage = await record.mutateAsync({
        location_id: locId,
        notes: notes.trim() || null,
        lines: payloadLines,
      });

      // Photos go up after the claim exists, since they hang off its id. An
      // upload failure must not lose the claim — it is already saved, and the
      // detail page can always add more — so this degrades rather than throws.
      for (const file of photos) {
        try {
          await addPhoto(wastage.id, file);
        } catch {
          // Surfaced on the detail page, which shows what did and did not land.
        }
      }

      reset();
      onClose();
      router.push(`/inventory/wastage/${wastage.id}`);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const reasons = catalog?.reasons ?? [];

  return (
    <InventoryModal isOpen={isOpen} onClose={onClose} title="Record wastage" size="lg">
      <div className="p-5 space-y-5">
        <FormField label="Where" htmlFor="wst-location">
          <Select
            id="wst-location"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
          >
            {declarable.length === 0 && <option value="">No location available</option>}
            {declarable.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </FormField>

        {/* Lines */}
        <div className="space-y-3">
          {lines.map((line, index) => {
            const item = itemsById.get(Number(line.itemId));
            const qty = Number(line.quantity);
            const lineValue =
              item && Number.isFinite(qty) && qty > 0 ? qty * (item.weighted_avg_cost ?? 0) : null;
            const needsNote = line.reason === 'other';

            return (
              <div
                key={line.key}
                className="bg-neutral-light/40 border border-[#f0e8d8] rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-gray">
                    Item {index + 1}
                  </p>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                      className="text-neutral-gray hover:text-rose-600 cursor-pointer"
                      aria-label={`Remove item ${index + 1}`}
                    >
                      <TrashIcon size={16} />
                    </button>
                  )}
                </div>

                <div className="grid sm:grid-cols-[2fr_1fr] gap-3">
                  <FormField label="What" htmlFor={`wst-item-${line.key}`}>
                    <Select
                      id={`wst-item-${line.key}`}
                      value={line.itemId}
                      onChange={(e) => setLine(line.key, { itemId: e.target.value })}
                    >
                      <option value="">Select an item…</option>
                      {items.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} ({formatQty(i.stock_on_hand)} {i.base_unit?.symbol ?? ''})
                        </option>
                      ))}
                    </Select>
                  </FormField>

                  <FormField label="How much" htmlFor={`wst-qty-${line.key}`}>
                    <TextInput
                      id={`wst-qty-${line.key}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.quantity}
                      onChange={(e) => setLine(line.key, { quantity: e.target.value })}
                      placeholder="0"
                      className="text-right"
                    />
                  </FormField>
                </div>

                <FormField label="What happened" htmlFor={`wst-reason-${line.key}`}>
                  <Select
                    id={`wst-reason-${line.key}`}
                    value={line.reason}
                    onChange={(e) =>
                      setLine(line.key, { reason: e.target.value as WastageReason | '' })
                    }
                  >
                    <option value="">Select a reason…</option>
                    {reasons.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </Select>
                </FormField>

                {needsNote && (
                  <FormField label="Say what happened" htmlFor={`wst-note-${line.key}`}>
                    <TextInput
                      id={`wst-note-${line.key}`}
                      value={line.note}
                      onChange={(e) => setLine(line.key, { note: e.target.value })}
                      placeholder="Required for “Other”"
                    />
                  </FormField>
                )}

                {lineValue !== null && (
                  <p className="text-neutral-gray text-xs font-body">
                    Valued at {formatGhs(lineValue)}
                  </p>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => setLines((prev) => [...prev, blankLine()])}
            className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 text-sm font-semibold font-body cursor-pointer"
          >
            <PlusIcon size={14} weight="bold" />
            Add another item
          </button>
        </div>

        {/* Photograph the goods before they leave. Above the threshold the
            approver cannot write anything off without this, and the goods will
            be on a lorry by the time they look. */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <label className="text-sm font-semibold font-body text-text-dark">
              Photos {willNeedReturn && <span className="text-rose-600">— needed for approval</span>}
            </label>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []);
                setPhotos((prev) => [...prev, ...picked]);
                if (photoInputRef.current) photoInputRef.current.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold font-body bg-neutral-light text-text-dark hover:bg-neutral-light/70 border border-[#f0e8d8] cursor-pointer"
            >
              <CameraIcon size={14} weight="bold" />
              Add photo
            </button>
          </div>
          <p className="text-neutral-gray text-xs font-body mb-2">
            {willNeedReturn
              ? 'Photograph the goods now — once they are on the lorry nobody can.'
              : 'Optional here, but it settles arguments later.'}
          </p>

          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {photos.map((file, i) => (
                <div key={`${file.name}-${i}`} className="relative w-20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-20 h-20 object-cover rounded-xl border border-[#f0e8d8]"
                  />
                  <button
                    type="button"
                    onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label={`Remove ${file.name}`}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-[#f0e8d8] shadow-sm flex items-center justify-center text-neutral-gray hover:text-rose-600 cursor-pointer"
                  >
                    <XIcon size={10} weight="bold" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <FormField label="Notes (optional)" htmlFor="wst-notes">
          <Textarea
            id="wst-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything the approver should know."
          />
        </FormField>

        {/* Total + what happens next. The consequence of crossing the threshold
            is stated before submitting, not discovered afterwards. */}
        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-4">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-sm font-body text-neutral-gray">Total value</span>
            <span
              className={`tabular-nums text-lg font-bold ${
                overThreshold ? 'text-rose-700' : 'text-text-dark'
              }`}
            >
              {formatGhs(totalValue)}
            </span>
          </div>

          {willNeedReturn ? (
            <div className="flex items-start gap-2 mt-2">
              <ArrowUUpLeftIcon size={16} weight="bold" className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-amber-800 text-xs font-body">
                Above {formatGhs(threshold)}. A return transfer will be raised — the goods must go
                back to the warehouse before the warehouse manager can write them off. Nothing
                leaves your stock until you send them.
              </p>
            </div>
          ) : (
            <p className="text-neutral-gray text-xs font-body mt-1">
              {isWarehouse
                ? 'Recorded and written off immediately — the warehouse answers for its own stock.'
                : `Under ${formatGhs(threshold)}, so this is written off immediately.`}
            </p>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5">
            <WarningCircleIcon size={16} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
            <p className="text-rose-700 text-sm font-body">{error}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#f0e8d8]">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold font-body min-h-11 text-neutral-gray hover:text-text-dark cursor-pointer"
        >
          Cancel
        </button>
        <PrimaryButton type="button" onClick={submit} loading={record.isPending}>
          {willNeedReturn ? 'Record and raise return' : 'Record wastage'}
        </PrimaryButton>
      </div>
    </InventoryModal>
  );
}
