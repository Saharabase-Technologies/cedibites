'use client';

/**
 * PurchaseOrderForm.tsx
 *
 * Shared create + edit form for Purchase Orders.
 * Multi-line item builder with live total + admin-approval threshold warning.
 *
 * Mock-mode behaviour: write hooks throw a friendly message; the form catches
 * and surfaces it via window.alert (no save happens). Backend wiring will
 * remove the throw and the alert will never fire.
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
import { useInventorySuppliers, useInventoryItems } from '@/lib/api/hooks/inventory/useInventoryCatalog';
import { useInventoryLocations } from '@/lib/api/hooks/inventory/useInventoryLocations';
import {
  usePurchaseOrder,
  useCreatePurchaseOrder,
  useUpdatePurchaseOrder,
} from '@/lib/api/hooks/inventory/usePurchaseOrders';
import { PO_APPROVAL_THRESHOLD } from '@/lib/constants/inventory.constants';
import { downloadPurchaseOrderPdf } from '@/lib/utils/purchaseOrderPdf';
import type {
  CreatePurchaseOrderPayload,
  PurchaseOrderItemPayload,
} from '@/types/inventory';
import { formatGHS } from '../utils';

interface LineDraft {
  tempId: string;
  item_id: number | '';
  ordered_qty: string;
  estimated_unit_cost: string;
}

// Deterministic, monotonic line ids — Math.random() here caused SSR/client
// hydration mismatches on the generated htmlFor/id attributes.
let lineSeq = 0;

function emptyLine(): LineDraft {
  lineSeq += 1;
  return {
    tempId: `po-line-${lineSeq}`,
    item_id: '',
    ordered_qty: '',
    estimated_unit_cost: '',
  };
}

interface Props {
  mode: 'create' | 'edit';
  id?: number;
}

export function PurchaseOrderForm({ mode, id }: Props) {
  const router = useRouter();

  const { data: suppliers = [] } = useInventorySuppliers();
  const { data: locations = [] } = useInventoryLocations({ type: 'warehouse', is_active: true });
  const { data: items = [] } = useInventoryItems({ is_active: true });

  const editing = mode === 'edit' && typeof id === 'number';
  const { data: existingPO, isLoading: loadingPO, error: poError } = usePurchaseOrder(editing ? id! : 0);

  const createPO = useCreatePurchaseOrder();
  const updatePO = useUpdatePurchaseOrder(id ?? 0);

  // ─── Form state ─────────────────────────────────────────────────────────
  const [supplierId, setSupplierId]               = useState<string>('');
  const [destinationId, setDestinationId]         = useState<string>('');
  const [expectedDelivery, setExpectedDelivery]   = useState<string>('');
  const [notes, setNotes]                         = useState<string>('');
  const [lines, setLines]                         = useState<LineDraft[]>(() => [emptyLine()]);
  const [hydrated, setHydrated]                   = useState(false);

  // Hydrate edit-mode state once PO arrives.
  useEffect(() => {
    if (!editing || !existingPO || hydrated) return;
    setSupplierId(String(existingPO.supplier_id));
    setDestinationId(String(existingPO.destination_location_id));
    setExpectedDelivery(existingPO.expected_delivery_date ?? '');
    setNotes(existingPO.notes ?? '');
    setLines(
      existingPO.items.map((line) => ({
        tempId: `po-${line.id}`,
        item_id: line.item_id,
        ordered_qty: String(line.ordered_qty),
        estimated_unit_cost: String(line.estimated_unit_cost),
      })),
    );
    setHydrated(true);
  }, [editing, existingPO, hydrated]);

  // ─── Derived state ──────────────────────────────────────────────────────
  const validLines = useMemo(
    () =>
      lines.filter(
        (l) =>
          l.item_id !== '' &&
          Number(l.ordered_qty) > 0 &&
          Number(l.estimated_unit_cost) >= 0 &&
          !Number.isNaN(Number(l.ordered_qty)) &&
          !Number.isNaN(Number(l.estimated_unit_cost)),
      ),
    [lines],
  );

  const estimatedTotal = useMemo(
    () =>
      validLines.reduce(
        (sum, l) => sum + Number(l.ordered_qty) * Number(l.estimated_unit_cost),
        0,
      ),
    [validLines],
  );

  const requiresApproval = estimatedTotal >= PO_APPROVAL_THRESHOLD;
  const canSubmit =
    supplierId !== '' &&
    destinationId !== '' &&
    validLines.length > 0 &&
    validLines.length === lines.length;

  // Editable states: draft (normal edit) and pending_approval (admin edit & approve).
  const isApprovalEdit = editing && existingPO?.status === 'pending_approval';
  const editLocked =
    editing && existingPO && !['draft', 'pending_approval'].includes(existingPO.status);

  // ─── Handlers ───────────────────────────────────────────────────────────
  const updateLine = (tempId: string, patch: Partial<LineDraft>) => {
    setLines((prev) => prev.map((l) => (l.tempId === tempId ? { ...l, ...patch } : l)));
  };
  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (tempId: string) =>
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((l) => l.tempId !== tempId)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const itemsPayload: PurchaseOrderItemPayload[] = validLines.map((l) => ({
      item_id: Number(l.item_id),
      ordered_qty: Number(l.ordered_qty),
      estimated_unit_cost: Number(l.estimated_unit_cost),
    }));

    const payload: CreatePurchaseOrderPayload = {
      supplier_id: Number(supplierId),
      destination_location_id: Number(destinationId),
      expected_delivery_date: expectedDelivery || undefined,
      notes: notes.trim() || undefined,
      items: itemsPayload,
    };

    try {
      if (editing) {
        const updated = await updatePO.mutateAsync(payload);
        // Editing a pending-approval PO approves + sends it → download the PO doc.
        if (updated.status === 'sent') {
          await downloadPurchaseOrderPdf(updated);
          router.push(`/inventory/purchase-orders/${id}?approved=1`);
        } else {
          router.push(`/inventory/purchase-orders/${id}`);
        }
      } else {
        const created = await createPO.mutateAsync(payload);
        router.push(`/inventory/purchase-orders/${created.id}`);
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Save failed.';
      window.alert(msg);
    }
  };

  // ─── Edit-mode loading / error states ──────────────────────────────────
  if (editing && loadingPO) {
    return <FormSkeleton heading="Loading purchase order…" />;
  }
  if (editing && (poError || !existingPO)) {
    return <FormMissing />;
  }
  if (editLocked) {
    return <EditLocked status={existingPO!.status} reference={existingPO!.reference} id={existingPO!.id} />;
  }

  const submitting = createPO.isPending || updatePO.isPending;
  const heading = editing ? `Edit ${existingPO?.reference}` : 'New Purchase Order';
  const subhead = isApprovalEdit
    ? 'Adjust this order and approve it. Saving sends it straight to the supplier.'
    : editing
      ? 'Adjust this draft before sending it to the supplier.'
      : 'Build a multi-line order. Approval is auto-required above ' + formatGHS(PO_APPROVAL_THRESHOLD) + '.';
  const submitLabel = isApprovalEdit ? 'Save & approve' : editing ? 'Save changes' : 'Create draft PO';

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <Link
        href={editing ? `/inventory/purchase-orders/${id}` : '/inventory/purchase-orders'}
        className="inline-flex items-center gap-1.5 text-neutral-gray hover:text-text-dark transition-colors text-sm font-body mb-4"
      >
        <ArrowLeftIcon size={14} weight="bold" />
        {editing ? 'Back to PO' : 'All purchase orders'}
      </Link>

      <header className="mb-5">
        <h1 className="text-2xl font-bold font-brand text-text-dark">{heading}</h1>
        <p className="text-neutral-gray text-sm font-body mt-1">{subhead}</p>
      </header>

      <form onSubmit={submit} className="flex flex-col gap-5">
        {isApprovalEdit && (
          <div className="flex items-start gap-2.5 p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
            <CheckCircleIcon size={18} weight="fill" className="text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-emerald-900 text-sm font-semibold font-body">Approving on save</p>
              <p className="text-emerald-800/80 text-xs font-body mt-0.5">
                This order is awaiting approval. Any edits you make here are approved on save and the
                PO is sent to the supplier — the document downloads automatically.
              </p>
            </div>
          </div>
        )}

        {/* ── Meta ────────────────────────────────────────────────────── */}
        <section className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5">
          <h2 className="text-sm font-semibold font-body text-text-dark mb-4">Order details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField label="Supplier" htmlFor="po-supplier" required>
              <Select
                id="po-supplier"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
              >
                <option value="">Select supplier…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Destination warehouse" htmlFor="po-destination" required>
              <Select
                id="po-destination"
                value={destinationId}
                onChange={(e) => setDestinationId(e.target.value)}
                required
              >
                <option value="">Select warehouse…</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              label="Expected delivery date"
              htmlFor="po-expected"
              hint="Optional — communicates the target receipt date."
            >
              <TextInput
                id="po-expected"
                type="date"
                value={expectedDelivery}
                onChange={(e) => setExpectedDelivery(e.target.value)}
              />
            </FormField>

            <FormField label="Notes" htmlFor="po-notes">
              <Textarea
                id="po-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes for the warehouse manager or supplier"
                rows={2}
              />
            </FormField>
          </div>
        </section>

        {/* ── Line items ─────────────────────────────────────────────── */}
        <section className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm font-semibold font-body text-text-dark">
              Line items <span className="text-neutral-gray font-normal">({lines.length})</span>
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
              const lineTotal =
                Number(line.ordered_qty || 0) * Number(line.estimated_unit_cost || 0);
              const selectedItem = items.find((i) => i.id === Number(line.item_id));
              return (
                <div
                  key={line.tempId}
                  className="grid grid-cols-[1fr_auto] sm:grid-cols-[2fr_1fr_1fr_auto_auto] gap-3 items-end p-3 bg-neutral-light/40 border border-[#f0e8d8] rounded-xl"
                >
                  <FormField label={idx === 0 ? 'Item' : ''} htmlFor={`po-item-${line.tempId}`}>
                    <Select
                      id={`po-item-${line.tempId}`}
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
                    htmlFor={`po-qty-${line.tempId}`}
                  >
                    <TextInput
                      id={`po-qty-${line.tempId}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.ordered_qty}
                      onChange={(e) => updateLine(line.tempId, { ordered_qty: e.target.value })}
                      placeholder="0"
                      required
                    />
                  </FormField>

                  <FormField
                    label={idx === 0 ? 'Unit cost (₵)' : ''}
                    htmlFor={`po-cost-${line.tempId}`}
                  >
                    <TextInput
                      id={`po-cost-${line.tempId}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.estimated_unit_cost}
                      onChange={(e) =>
                        updateLine(line.tempId, { estimated_unit_cost: e.target.value })
                      }
                      placeholder="0.00"
                      required
                    />
                  </FormField>

                  <div className="flex flex-col items-end">
                    {idx === 0 && (
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-gray mb-1.5">
                        Line total
                      </span>
                    )}
                    <span className="text-sm font-semibold tabular-nums text-text-dark min-h-11 flex items-center">
                      {formatGHS(lineTotal)}
                    </span>
                  </div>

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

        {/* ── Total + threshold ─────────────────────────────────────── */}
        <section className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold font-body text-text-dark">
              Estimated total
            </span>
            <span className="text-2xl font-bold font-mono tabular-nums text-text-dark">
              {formatGHS(estimatedTotal)}
            </span>
          </div>

          {requiresApproval && (
            <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-100 rounded-xl">
              <WarningCircleIcon size={18} weight="fill" className="text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-amber-900 text-sm font-semibold font-body">
                  Admin approval required
                </p>
                <p className="text-amber-800/80 text-xs font-body mt-0.5">
                  Totals at or above {formatGHS(PO_APPROVAL_THRESHOLD)} cannot be sent to the
                  supplier until an Admin approves the PO.
                </p>
              </div>
            </div>
          )}
        </section>

        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Link
            href={editing ? `/inventory/purchase-orders/${id}` : '/inventory/purchase-orders'}
            className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold font-body bg-neutral-light text-text-dark hover:bg-neutral-light/70 border border-[#f0e8d8] min-h-11"
          >
            Cancel
          </Link>
          <div className="sm:w-60">
            <PrimaryButton type="submit" loading={submitting} disabled={!canSubmit}>
              {submitLabel}
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
      <h1 className="text-xl font-bold font-brand text-text-dark mb-2">Purchase order not found</h1>
      <p className="text-neutral-gray text-sm font-body">
        It may have been removed.{' '}
        <Link href="/inventory/purchase-orders" className="text-primary hover:underline">
          Back to all POs
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
        href={`/inventory/purchase-orders/${id}`}
        className="inline-flex items-center gap-1.5 text-neutral-gray hover:text-text-dark transition-colors text-sm font-body mb-4"
      >
        <ArrowLeftIcon size={14} weight="bold" />
        Back to PO
      </Link>
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <WarningCircleIcon size={20} weight="fill" className="text-amber-600 mt-0.5" />
          <div>
            <p className="text-amber-900 text-sm font-semibold font-body">
              {reference} can no longer be edited
            </p>
            <p className="text-amber-800/80 text-xs font-body mt-1">
              Only purchase orders in the <span className="font-mono">draft</span> state can be
              edited. Current status: <span className="font-mono">{status}</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
