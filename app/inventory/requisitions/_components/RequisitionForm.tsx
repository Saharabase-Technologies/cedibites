'use client';

/**
 * RequisitionForm.tsx
 *
 * Shared create + edit form for stock requisitions. A branch picks what it needs
 * and which warehouse to pull from; the warehouse manager grants quantities on
 * approval (which spawns the fulfilling transfer). Only draft requisitions are
 * editable — enforced here and on the backend.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
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
  useRequisition,
  useCreateRequisition,
  useUpdateRequisition,
} from '@/lib/api/hooks/inventory/useRequisitions';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import type {
  CreateRequisitionPayload,
  RequisitionLinePayload,
  RequisitionPurpose,
} from '@/types/inventory';

interface LineDraft {
  tempId: string;
  item_id: number | '';
  requested_qty: string;
}

let lineSeq = 0;

function emptyLine(): LineDraft {
  lineSeq += 1;
  return { tempId: `req-line-${lineSeq}`, item_id: '', requested_qty: '' };
}

interface Props {
  mode: 'create' | 'edit';
  id?: number;
}

export function RequisitionForm({ mode, id }: Props) {
  const router = useRouter();
  const { can } = useStaffAuth();
  const allowed = can('inventory.requisition.create');

  const { data: locations = [] } = useInventoryLocations({ is_active: true });
  const { data: items = [] } = useInventoryItems({ is_active: true });

  const branches = locations.filter((l) => l.type === 'satellite');
  const warehouses = locations.filter((l) => l.type === 'warehouse');

  const editing = mode === 'edit' && typeof id === 'number';
  const { data: existing, isLoading: loadingReq, error: loadError } =
    useRequisition(editing ? id! : 0);

  const createReq = useCreateRequisition();
  const updateReq = useUpdateRequisition(id ?? 0);

  // ─── Form state ─────────────────────────────────────────────────────────
  const [requestingId, setRequestingId] = useState<string>('');
  const [sourceId, setSourceId]         = useState<string>('');
  const [purpose, setPurpose]           = useState<RequisitionPurpose>('supplementary');
  const [notes, setNotes]               = useState<string>('');
  const [lines, setLines]               = useState<LineDraft[]>(() => [emptyLine()]);
  const [hydrated, setHydrated]         = useState(false);

  // Default the source to the (single) warehouse for the common case.
  useEffect(() => {
    if (!editing && sourceId === '' && warehouses.length > 0) {
      setSourceId(String(warehouses[0].id));
    }
  }, [editing, sourceId, warehouses]);

  // Hydrate edit-mode state once the requisition arrives.
  useEffect(() => {
    if (!editing || !existing || hydrated) return;
    setRequestingId(existing.requesting_location ? String(existing.requesting_location.id) : '');
    setSourceId(existing.source_location ? String(existing.source_location.id) : '');
    setPurpose(existing.purpose);
    setNotes(existing.notes ?? '');
    setLines(
      existing.lines.length > 0
        ? existing.lines.map((line) => ({
            tempId: `req-${line.id}`,
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

  const sameLocation = requestingId !== '' && requestingId === sourceId;
  const canSubmit =
    requestingId !== '' &&
    sourceId !== '' &&
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

    const itemsPayload: RequisitionLinePayload[] = validLines.map((l) => ({
      item_id: Number(l.item_id),
      requested_qty: Number(l.requested_qty),
    }));

    try {
      if (editing) {
        await updateReq.mutateAsync({
          source_location_id: Number(sourceId),
          purpose,
          notes: notes.trim() || undefined,
          items: itemsPayload,
        });
        router.push(`/inventory/requisitions/${id}`);
      } else {
        const payload: CreateRequisitionPayload = {
          requesting_location_id: Number(requestingId),
          source_location_id: Number(sourceId),
          purpose,
          notes: notes.trim() || undefined,
          items: itemsPayload,
        };
        const created = await createReq.mutateAsync(payload);
        router.push(`/inventory/requisitions/${created.id}`);
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Save failed.');
    }
  };

  if (!allowed) return <NoPermission />;
  if (editing && loadingReq) return <FormSkeleton heading="Loading requisition…" />;
  if (editing && (loadError || !existing)) return <FormMissing />;
  if (editLocked) {
    return <EditLocked status={existing!.status} reference={existing!.reference} id={existing!.id} />;
  }

  const submitting = createReq.isPending || updateReq.isPending;
  const heading = editing ? `Edit ${existing?.reference}` : 'New Requisition';

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <Link
        href={editing ? `/inventory/requisitions/${id}` : '/inventory/requisitions'}
        className="inline-flex items-center gap-1.5 text-neutral-gray hover:text-text-dark transition-colors text-sm font-body mb-4"
      >
        <ArrowLeftIcon size={14} weight="bold" />
        {editing ? 'Back to requisition' : 'All requisitions'}
      </Link>

      <header className="mb-5">
        <h1 className="text-2xl font-bold font-brand text-text-dark">{heading}</h1>
        <p className="text-neutral-gray text-sm font-body mt-1">
          Request stock for a branch. The warehouse manager grants quantities on approval, which
          dispatches a transfer.
        </p>
      </header>

      <form onSubmit={submit} className="flex flex-col gap-5">
        {/* ── Request details ────────────────────────────────────────────── */}
        <section className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5">
          <h2 className="text-sm font-semibold font-body text-text-dark mb-4">Request details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField label="For branch" htmlFor="req-branch" required>
              <Select
                id="req-branch"
                value={requestingId}
                onChange={(e) => setRequestingId(e.target.value)}
                required
                disabled={editing}
              >
                <option value="">Select branch…</option>
                {branches.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Fulfil from" htmlFor="req-source" required>
              <Select
                id="req-source"
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                required
              >
                <option value="">Select source…</option>
                {warehouses.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Purpose" htmlFor="req-purpose" required>
              <Select
                id="req-purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value as RequisitionPurpose)}
                required
              >
                <option value="supplementary">Supplementary (mid-day top-up)</option>
                <option value="opening">Opening stock (start of day)</option>
              </Select>
            </FormField>

            <FormField label="Notes" htmlFor="req-notes">
              <Textarea
                id="req-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional — anything the warehouse should know"
                rows={2}
              />
            </FormField>
          </div>

          {sameLocation && (
            <p className="text-rose-600 text-xs font-body mt-2 flex items-center gap-1.5">
              <WarningCircleIcon size={13} weight="fill" />
              The branch and source must be different locations.
            </p>
          )}
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
                  <FormField label={idx === 0 ? 'Item' : ''} htmlFor={`req-item-${line.tempId}`}>
                    <Select
                      id={`req-item-${line.tempId}`}
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
                    htmlFor={`req-qty-${line.tempId}`}
                  >
                    <TextInput
                      id={`req-qty-${line.tempId}`}
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
            href={editing ? `/inventory/requisitions/${id}` : '/inventory/requisitions'}
            className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold font-body bg-neutral-light text-text-dark hover:bg-neutral-light/70 border border-[#f0e8d8] min-h-11"
          >
            Cancel
          </Link>
          <div className="sm:w-60">
            <PrimaryButton type="submit" loading={submitting} disabled={!canSubmit}>
              {editing ? 'Save changes' : 'Create draft requisition'}
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
      <h1 className="text-xl font-bold font-brand text-text-dark mb-2">Requisition not found</h1>
      <p className="text-neutral-gray text-sm font-body">
        It may have been removed.{' '}
        <Link href="/inventory/requisitions" className="text-primary hover:underline">
          Back to all requisitions
        </Link>
      </p>
    </div>
  );
}

function NoPermission() {
  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <h1 className="text-xl font-bold font-brand text-text-dark mb-2">
        You can&apos;t create requisitions
      </h1>
      <p className="text-neutral-gray text-sm font-body">
        Your role doesn&apos;t have requisition rights. Ask an administrator if you need access.{' '}
        <Link href="/inventory/requisitions" className="text-primary hover:underline">
          Back to all requisitions
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
        href={`/inventory/requisitions/${id}`}
        className="inline-flex items-center gap-1.5 text-neutral-gray hover:text-text-dark transition-colors text-sm font-body mb-4"
      >
        <ArrowLeftIcon size={14} weight="bold" />
        Back to requisition
      </Link>
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <WarningCircleIcon size={20} weight="fill" className="text-amber-600 mt-0.5" />
          <div>
            <p className="text-amber-900 text-sm font-semibold font-body">
              {reference} can no longer be edited
            </p>
            <p className="text-amber-800/80 text-xs font-body mt-1">
              Only requisitions in the <span className="font-mono">draft</span> state can be edited.
              Current status: <span className="font-mono">{status}</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
