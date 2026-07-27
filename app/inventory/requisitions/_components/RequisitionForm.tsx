'use client';

/**
 * RequisitionForm.tsx
 *
 * Shared create + edit form for stock requisitions. A branch picks what it needs
 * and which warehouse to pull from; the warehouse manager grants quantities on
 * approval (which spawns the fulfilling transfer). Only draft requisitions are
 * editable - enforced here and on the backend.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  WarningCircleIcon,
  CheckCircleIcon,
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
import { useStockAvailability } from '@/lib/api/hooks/inventory/useStockAvailability';
import type {
  CreateRequisitionPayload,
  RequisitionLinePayload,
  RequisitionPurpose,
} from '@/types/inventory';
import { getErrorMessage } from '@/lib/utils/error-handler';
import { toast } from '@/lib/utils/toast';

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

  // A branch manager is by definition requesting for their own branch, so there
  // is nothing to ask. The locations endpoint already narrows `branches` to what
  // this user runs, so asking would only ever offer them the one answer. Users
  // who span several branches, or who see every location (warehouse manager,
  // admin), still have to say which branch they mean.
  const seesAllLocations = can('inventory.view_all_locations');
  const ownBranch = branches.length === 1 ? branches[0] : null;
  const impliedBranch = !seesAllLocations && ownBranch ? ownBranch : null;
  // Distinguish "still loading" from "genuinely has no branch".
  const strandedNoBranch = !seesAllLocations && locations.length > 0 && branches.length === 0;

  const editing = mode === 'edit' && typeof id === 'number';
  const { data: existing, isLoading: loadingReq, error: loadError } =
    useRequisition(editing ? id! : 0);

  const createReq = useCreateRequisition();
  const updateReq = useUpdateRequisition(id ?? 0);

  // ─── Form state ─────────────────────────────────────────────────────────
  const [requestingIdRaw, setRequestingId] = useState<string>('');
  const [sourceId, setSourceId]         = useState<string>('');
  const [purpose, setPurpose]           = useState<RequisitionPurpose>('supplementary');
  const [notes, setNotes]               = useState<string>('');
  const [lines, setLines]               = useState<LineDraft[]>(() => [emptyLine()]);
  const [hydrated, setHydrated]         = useState(false);

  /*
   * Where the stock is being asked FROM.
   *
   * This was briefly locked to the single warehouse, on the reasoning that a
   * requisition always pulls from the mother kitchen. That was wrong: a branch
   * can supply another branch, and often should - Ashaiman having a surplus that
   * Test Branch needs, with the two nearer each other than either is to the
   * mother kitchen.
   *
   * A requisition is the right verb for that, and a transfer is not: you can
   * only dispatch stock you actually hold, so asking Test Branch to "create a
   * transfer out of Ashaiman" inverts who is doing what.
   *
   * Excludes wherever the request is FOR - you cannot requisition from yourself,
   * and the server refuses it anyway.
   */
  const requestingId = impliedBranch ? String(impliedBranch.id) : requestingIdRaw;
  const sources = useMemo(
    () => locations.filter((l) => String(l.id) !== requestingId),
    [locations, requestingId],
  );
  const impliedSource = sources.length === 1 ? sources[0] : null;

  // Default to the mother kitchen, which is where most requests go - but only
  // as a starting point now that a branch can also be asked to supply.
  useEffect(() => {
    if (editing || sourceId !== '') return;
    const preferred = warehouses[0] ?? (sources.length === 1 ? sources[0] : null);
    if (preferred) setSourceId(String(preferred.id));
  }, [editing, sourceId, warehouses, sources]);

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

  // Ask the source whether it can actually cover this, while it is still being
  // written - the check used to only fire at submit, after the whole form.
  const { data: availability, isFetching: checkingStock } = useStockAvailability(
    sourceId === '' ? null : Number(sourceId),
    validLines.map((l) => ({ item_id: Number(l.item_id), qty: Number(l.requested_qty) })),
  );
  const shortLines = availability?.lines.filter((l) => !l.sufficient) ?? [];

  const sameLocation = requestingId !== '' && requestingId === sourceId;
  const canSubmit =
    (impliedBranch !== null || requestingId !== '') &&
    sourceId !== '' &&
    !sameLocation &&
    !strandedNoBranch &&
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
        // Omit the branch when it is implied - the server resolves it from the
        // requester, which also stops a stale dropdown value from creating a
        // requisition the requester then cannot read.
        const payload: CreateRequisitionPayload = {
          ...(impliedBranch ? {} : { requesting_location_id: Number(requestingId) }),
          source_location_id: Number(sourceId),
          purpose,
          notes: notes.trim() || undefined,
          items: itemsPayload,
        };
        const created = await createReq.mutateAsync(payload);
        router.push(`/inventory/requisitions/${created.id}`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
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
            {impliedBranch ? (
              <FormField label="For branch" htmlFor="req-branch">
                <div
                  id="req-branch"
                  className="flex items-center min-h-11 px-3 py-2 rounded-xl bg-neutral-light/60 border border-[#f0e8d8] text-sm font-body text-text-dark"
                >
                  {editing && existing?.requesting_location
                    ? existing.requesting_location.name
                    : impliedBranch.name}
                </div>
              </FormField>
            ) : (
              <FormField label="For branch" htmlFor="req-branch" required>
                <Select
                  id="req-branch"
                  value={requestingIdRaw}
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
            )}

            {impliedSource ? (
              <FormField label="Fulfil from" htmlFor="req-source">
                <div
                  id="req-source"
                  className="flex items-center min-h-11 px-3 py-2 rounded-xl bg-neutral-light/60 border border-[#f0e8d8] text-sm font-body text-text-dark"
                >
                  {editing && existing?.source_location
                    ? existing.source_location.name
                    : impliedSource.name}
                </div>
              </FormField>
            ) : (
              <FormField label="Fulfil from" htmlFor="req-source" required>
                <Select
                  id="req-source"
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  required
                >
                  <option value="">Select source…</option>
                  {sources.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}

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
                placeholder="Optional - anything the warehouse should know"
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

          {strandedNoBranch && (
            <p className="text-rose-600 text-xs font-body mt-2 flex items-start gap-1.5">
              <WarningCircleIcon size={13} weight="fill" className="mt-0.5 shrink-0" />
              Your branch has no inventory location, so it can&apos;t request stock yet. Ask an
              administrator to link your branch to an inventory location.
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

                  {/*
                    The unit belongs to the LINE, not the column. Every line can
                    be measured differently (12 kg of cabbage, 33 pieces of
                    juice), so a single header unit taken from the first line was
                    wrong for every row under it. It now sits inside each input.
                  */}
                  <FormField label={idx === 0 ? 'Quantity' : ''} htmlFor={`req-qty-${line.tempId}`}>
                    <div className="relative">
                      <TextInput
                        id={`req-qty-${line.tempId}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.requested_qty}
                        onChange={(e) => updateLine(line.tempId, { requested_qty: e.target.value })}
                        placeholder="0"
                        required
                        className={selectedItem ? 'pr-12' : undefined}
                      />
                      {selectedItem && (
                        <span
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-neutral-gray pointer-events-none select-none"
                          aria-hidden
                        >
                          {selectedItem.base_unit.symbol}
                        </span>
                      )}
                    </div>
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

          {/* Whether the source can actually cover this, answered as you type
              rather than sprung at submit. Advisory only - a short source does
              not block the draft, since the warehouse may restock before it is
              approved. */}
          {validLines.length > 0 && sourceId !== '' && (
            <div className="mt-4 pt-3 border-t border-[#f0e8d8]">
              {checkingStock ? (
                <p className="font-body text-xs text-neutral-gray">Checking stock…</p>
              ) : availability?.sufficient ? (
                <p className="flex items-center gap-1.5 font-body text-xs text-secondary">
                  <CheckCircleIcon size={14} weight="fill" />
                  {sources.find((w) => String(w.id) === sourceId)?.name ?? 'The source'} has
                  enough stock for everything requested.
                </p>
              ) : shortLines.length > 0 ? (
                <div className="flex items-start gap-1.5">
                  <WarningCircleIcon size={14} weight="fill" className="mt-0.5 shrink-0 text-amber-600" />
                  <div className="font-body text-xs">
                    <p className="font-semibold text-amber-700">
                      Short on {shortLines.length} item{shortLines.length === 1 ? '' : 's'} right
                      now - you can still send the request.
                    </p>
                    <ul className="mt-0.5 text-neutral-gray">
                      {shortLines.map((l) => (
                        <li key={l.item_id}>
                          {l.name}: asked {l.required}, available {l.available}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>
          )}
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
