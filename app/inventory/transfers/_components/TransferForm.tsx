'use client';

/**
 * TransferForm.tsx
 *
 * Shared create + edit form for stock transfers. A multi-line item builder that
 * picks a source + destination location and the quantities to move. Cost is NOT
 * entered here — it is captured (FEFO-weighted) when the transfer is sent.
 *
 * Only draft transfers are editable; the backend enforces this and the form
 * guards against it too.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  PlusIcon,
  TrashIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import {
  FormField,
  TextInput,
  Textarea,
  Select,
  PrimaryButton,
} from '../../_components';
import { useInventoryItems } from '@/lib/api/hooks/inventory/useInventoryCatalog';
import { useInventoryLocations } from '@/lib/api/hooks/inventory/useInventoryLocations';
import {
  useTransfer,
  useCreateTransfer,
  useUpdateTransfer,
} from '@/lib/api/hooks/inventory/useTransfers';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import type { CreateTransferPayload, TransferLinePayload } from '@/types/inventory';
import { getErrorMessage } from '@/lib/utils/error-handler';
import { toast } from '@/lib/utils/toast';

interface LineDraft {
  tempId: string;
  item_id: number | '';
  requested_qty: string;
}

// Deterministic, monotonic line ids — Math.random() here caused SSR/client
// hydration mismatches on the generated htmlFor/id attributes.
let lineSeq = 0;

function emptyLine(): LineDraft {
  lineSeq += 1;
  return { tempId: `tr-line-${lineSeq}`, item_id: '', requested_qty: '' };
}

interface Props {
  mode: 'create' | 'edit';
  id?: number;
}

export function TransferForm({ mode, id }: Props) {
  const router = useRouter();
  const { can } = useStaffAuth();
  const allowed = can('inventory.transfer.create');

  const { data: locations = [] } = useInventoryLocations({ is_active: true });
  const { data: items = [] } = useInventoryItems({ is_active: true });

  const editing = mode === 'edit' && typeof id === 'number';
  const { data: existing, isLoading: loadingTransfer, error: loadError } =
    useTransfer(editing ? id! : 0);

  const createTransfer = useCreateTransfer();
  const updateTransfer = useUpdateTransfer(id ?? 0);

  // ─── Form state ─────────────────────────────────────────────────────────
  const [sourceId, setSourceId]           = useState<string>('');
  const [destinationId, setDestinationId] = useState<string>('');
  const [notes, setNotes]                 = useState<string>('');
  const [lines, setLines]                 = useState<LineDraft[]>(() => [emptyLine()]);
  const [hydrated, setHydrated]           = useState(false);

  // Hydrate edit-mode state once the transfer arrives.
  useEffect(() => {
    if (!editing || !existing || hydrated) return;
    setSourceId(existing.source_location ? String(existing.source_location.id) : '');
    setDestinationId(existing.destination_location ? String(existing.destination_location.id) : '');
    setNotes(existing.notes ?? '');
    setLines(
      existing.lines.length > 0
        ? existing.lines.map((line) => ({
            tempId: `tr-${line.id}`,
            item_id: line.item_id,
            requested_qty: String(line.requested_qty),
          }))
        : [emptyLine()],
    );
    setHydrated(true);
  }, [editing, existing, hydrated]);

  // ─── Derived state ──────────────────────────────────────────────────────
  const validLines = useMemo(
    () =>
      lines.filter(
        (l) =>
          l.item_id !== '' &&
          Number(l.requested_qty) > 0 &&
          !Number.isNaN(Number(l.requested_qty)),
      ),
    [lines],
  );

  const sameLocation = sourceId !== '' && sourceId === destinationId;
  const canSubmit =
    sourceId !== '' &&
    destinationId !== '' &&
    !sameLocation &&
    validLines.length > 0 &&
    validLines.length === lines.length;

  const editLocked = editing && existing && existing.status !== 'draft';

  // ─── Handlers ───────────────────────────────────────────────────────────
  const updateLine = (tempId: string, patch: Partial<LineDraft>) =>
    setLines((prev) => prev.map((l) => (l.tempId === tempId ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (tempId: string) =>
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((l) => l.tempId !== tempId)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const itemsPayload: TransferLinePayload[] = validLines.map((l) => ({
      item_id: Number(l.item_id),
      requested_qty: Number(l.requested_qty),
    }));

    try {
      if (editing) {
        await updateTransfer.mutateAsync({ notes: notes.trim() || undefined, items: itemsPayload });
        router.push(`/inventory/transfers/${id}`);
      } else {
        const payload: CreateTransferPayload = {
          source_location_id: Number(sourceId),
          destination_location_id: Number(destinationId),
          notes: notes.trim() || undefined,
          items: itemsPayload,
        };
        const created = await createTransfer.mutateAsync(payload);
        router.push(`/inventory/transfers/${created.id}`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  // Permission gate — block the dead-end where a role without transfer rights
  // reaches this form (by URL or stale UI) and only fails on save.
  if (!allowed) return <NoPermission />;

  if (editing && loadingTransfer) return <FormSkeleton heading="Loading transfer…" />;
  if (editing && (loadError || !existing)) return <FormMissing />;
  if (editLocked) {
    return <EditLocked status={existing!.status} reference={existing!.reference} id={existing!.id} />;
  }

  const submitting = createTransfer.isPending || updateTransfer.isPending;
  const heading = editing ? `Edit ${existing?.reference}` : 'New Transfer';

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <Link
        href={editing ? `/inventory/transfers/${id}` : '/inventory/transfers'}
        className="inline-flex items-center gap-1.5 text-neutral-gray hover:text-text-dark transition-colors text-sm font-body mb-4"
      >
        <ArrowLeftIcon size={14} weight="bold" />
        {editing ? 'Back to transfer' : 'All transfers'}
      </Link>

      <header className="mb-5">
        <h1 className="text-2xl font-bold font-brand text-text-dark">{heading}</h1>
        <p className="text-neutral-gray text-sm font-body mt-1">
          Move stock between locations. Quantities are validated against source stock on submit;
          cost is captured when the transfer is sent.
        </p>
      </header>

      <form onSubmit={submit} className="flex flex-col gap-5">
        {/* ── Route ─────────────────────────────────────────────────────── */}
        <section className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5">
          <h2 className="text-sm font-semibold font-body text-text-dark mb-4">Route</h2>
          <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-4 items-end">
            <FormField label="From (source)" htmlFor="tr-source" required>
              <Select
                id="tr-source"
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                required
              >
                <option value="">Select source…</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <div className="hidden sm:flex items-center justify-center pb-3 text-neutral-gray/50">
              <ArrowRightIcon size={18} weight="bold" />
            </div>

            <FormField label="To (destination)" htmlFor="tr-destination" required>
              <Select
                id="tr-destination"
                value={destinationId}
                onChange={(e) => setDestinationId(e.target.value)}
                required
              >
                <option value="">Select destination…</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          {sameLocation && (
            <p className="text-rose-600 text-xs font-body mt-2 flex items-center gap-1.5">
              <WarningCircleIcon size={13} weight="fill" />
              Source and destination must be different locations.
            </p>
          )}

          <FormField label="Notes" htmlFor="tr-notes">
            <Textarea
              id="tr-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional — reason for the transfer, handling instructions, etc."
              rows={2}
            />
          </FormField>
        </section>

        {/* ── Line items ─────────────────────────────────────────────────── */}
        <section className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm font-semibold font-body text-text-dark">
              Items <span className="text-neutral-gray font-normal">({lines.length})</span>
            </h2>
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-body bg-neutral-light text-text-dark hover:bg-neutral-light/70 border border-[#f0e8d8] cursor-pointer"
            >
              <PlusIcon size={12} weight="bold" />
              Add line
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {lines.map((line, idx) => {
              const selectedItem = items.find((i) => i.id === Number(line.item_id));
              return (
                <div
                  key={line.tempId}
                  className="grid grid-cols-[1fr_auto] sm:grid-cols-[2fr_1fr_auto] gap-3 items-end p-3 bg-neutral-light/40 border border-[#f0e8d8] rounded-xl"
                >
                  <FormField label={idx === 0 ? 'Item' : ''} htmlFor={`tr-item-${line.tempId}`}>
                    <Select
                      id={`tr-item-${line.tempId}`}
                      value={line.item_id}
                      onChange={(e) =>
                        updateLine(line.tempId, {
                          item_id: e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }
                      required
                    >
                      <option value="">Select item…</option>
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.name} ({it.sku})
                        </option>
                      ))}
                    </Select>
                  </FormField>

                  <FormField
                    label={idx === 0 ? `Quantity${selectedItem ? ` (${selectedItem.base_unit.symbol})` : ''}` : ''}
                    htmlFor={`tr-qty-${line.tempId}`}
                  >
                    <TextInput
                      id={`tr-qty-${line.tempId}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.requested_qty}
                      onChange={(e) => updateLine(line.tempId, { requested_qty: e.target.value })}
                      placeholder="0"
                      required
                    />
                  </FormField>

                  <button
                    type="button"
                    onClick={() => removeLine(line.tempId)}
                    disabled={lines.length === 1}
                    className="self-center p-2 rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    aria-label="Remove line"
                  >
                    <TrashIcon size={16} weight="bold" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Link
            href={editing ? `/inventory/transfers/${id}` : '/inventory/transfers'}
            className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold font-body bg-neutral-light text-text-dark hover:bg-neutral-light/70 border border-[#f0e8d8] min-h-11"
          >
            Cancel
          </Link>
          <div className="sm:w-60">
            <PrimaryButton type="submit" loading={submitting} disabled={!canSubmit}>
              {editing ? 'Save changes' : 'Create draft transfer'}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  );
}

// ─── States ────────────────────────────────────────────────────────────

function FormSkeleton({ heading }: { heading: string }) {
  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <p className="text-neutral-gray text-sm font-body">{heading}</p>
    </div>
  );
}

function FormMissing() {
  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <h1 className="text-xl font-bold font-brand text-text-dark mb-2">Transfer not found</h1>
      <p className="text-neutral-gray text-sm font-body">
        It may have been removed.{' '}
        <Link href="/inventory/transfers" className="text-primary hover:underline">
          Back to all transfers
        </Link>
      </p>
    </div>
  );
}

function NoPermission() {
  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <h1 className="text-xl font-bold font-brand text-text-dark mb-2">
        You can&apos;t create transfers
      </h1>
      <p className="text-neutral-gray text-sm font-body">
        Your role doesn&apos;t have transfer authoring rights. Ask an administrator if you need
        access.{' '}
        <Link href="/inventory/transfers" className="text-primary hover:underline">
          Back to all transfers
        </Link>
      </p>
    </div>
  );
}

function EditLocked({
  status,
  reference,
  id,
}: {
  status: string;
  reference: string;
  id: number;
}) {
  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <Link
        href={`/inventory/transfers/${id}`}
        className="inline-flex items-center gap-1.5 text-neutral-gray hover:text-text-dark transition-colors text-sm font-body mb-4"
      >
        <ArrowLeftIcon size={14} weight="bold" />
        Back to transfer
      </Link>
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <WarningCircleIcon size={20} weight="fill" className="text-amber-600 mt-0.5" />
          <div>
            <p className="text-amber-900 text-sm font-semibold font-body">
              {reference} can no longer be edited
            </p>
            <p className="text-amber-800/80 text-xs font-body mt-1">
              Only transfers in the <span className="font-mono">draft</span> state can be edited.
              Current status: <span className="font-mono">{status}</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
