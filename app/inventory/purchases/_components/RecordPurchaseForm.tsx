'use client';

/**
 * RecordPurchaseForm.tsx
 *
 * The Purchasing Clerk's primary entry point: log a supplier receipt.
 *
 * Two modes (mutually exclusive):
 *   • "Against PO"  — pick a sent / partially-received PO; lines auto-prefill
 *                     with the remaining quantities and estimated unit costs.
 *                     Supplier + destination are read from the PO and locked.
 *   • "Urgent buy"  — manual supplier + destination + items. A reason is
 *                     required and the receipt is flagged in reports.
 *
 * Mock-mode write hook throws; the form catches and shows the message.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  LightningIcon,
  ClipboardIcon,
} from '@phosphor-icons/react';
import {
  FormField,
  TextInput,
  Textarea,
  Select,
  PrimaryButton,
} from '../../_components';
import {
  useInventorySuppliers,
  useInventoryItems,
} from '@/lib/api/hooks/inventory/useInventoryCatalog';
import { useInventoryLocations } from '@/lib/api/hooks/inventory/useInventoryLocations';
import { usePurchaseOrders } from '@/lib/api/hooks/inventory/usePurchaseOrders';
import { useRecordPurchase } from '@/lib/api/hooks/inventory/usePurchases';
import type {
  PurchaseOrder,
  RecordPurchasePayload,
  RecordPurchaseItemPayload,
} from '@/types/inventory';
import { formatGHS } from '../utils';

type Mode = 'against_po' | 'urgent_buy';

interface LineDraft {
  tempId: string;
  item_id: number | '';
  purchase_order_item_id: number | null;
  received_qty: string;
  unit_cost_paid: string;
}

function emptyLine(): LineDraft {
  return {
    tempId: `tmp-${Math.random().toString(36).slice(2, 9)}`,
    item_id: '',
    purchase_order_item_id: null,
    received_qty: '',
    unit_cost_paid: '',
  };
}

// Default `received_at` to "now" in the local timezone, formatted for
// <input type="datetime-local">.
function nowLocalDateTime(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RecordPurchaseForm() {
  const router = useRouter();

  const { data: suppliers = [] }    = useInventorySuppliers();
  const { data: locations = [] }    = useInventoryLocations({ is_active: true });
  const { data: items = [] }        = useInventoryItems({ is_active: true });
  // Receivable POs only — sent or partially received.
  const { data: openPOs = [] }      = usePurchaseOrders();
  const recordPurchase              = useRecordPurchase();

  const receivablePOs = useMemo(
    () => openPOs.filter((po) => po.status === 'sent' || po.status === 'partially_received'),
    [openPOs],
  );

  // ─── Form state ─────────────────────────────────────────────────────
  const [mode, setMode]                       = useState<Mode>('against_po');
  const [poId, setPoId]                       = useState<string>('');
  const [supplierId, setSupplierId]           = useState<string>('');
  const [destinationId, setDestinationId]     = useState<string>('');
  const [urgentReason, setUrgentReason]       = useState<string>('');
  const [invoiceNumber, setInvoiceNumber]     = useState<string>('');
  const [receivedAt, setReceivedAt]           = useState<string>(nowLocalDateTime());
  const [notes, setNotes]                     = useState<string>('');
  const [lines, setLines]                     = useState<LineDraft[]>([emptyLine()]);

  const selectedPO: PurchaseOrder | undefined =
    mode === 'against_po' && poId
      ? receivablePOs.find((po) => po.id === Number(poId))
      : undefined;

  // When a PO is picked, prefill supplier + destination + lines (remaining qty).
  useEffect(() => {
    if (mode !== 'against_po' || !selectedPO) return;
    setSupplierId(String(selectedPO.supplier_id));
    setDestinationId(String(selectedPO.destination_location_id));
    setLines(
      selectedPO.items.map((line) => {
        const remaining = Math.max(line.ordered_qty - line.received_qty, 0);
        return {
          tempId: `po-${line.id}`,
          item_id: line.item_id,
          purchase_order_item_id: line.id,
          received_qty: remaining > 0 ? String(remaining) : '',
          unit_cost_paid: String(line.estimated_unit_cost),
        };
      }),
    );
  }, [mode, selectedPO]);

  // Switching modes resets PO-coupled state.
  const switchMode = (next: Mode) => {
    setMode(next);
    setPoId('');
    setSupplierId('');
    setDestinationId('');
    setLines([emptyLine()]);
  };

  // ─── Derived ────────────────────────────────────────────────────────
  const validLines = useMemo(
    () =>
      lines.filter(
        (l) =>
          l.item_id !== '' &&
          Number(l.received_qty) > 0 &&
          Number(l.unit_cost_paid) >= 0 &&
          !Number.isNaN(Number(l.received_qty)) &&
          !Number.isNaN(Number(l.unit_cost_paid)),
      ),
    [lines],
  );

  const totalPaid = useMemo(
    () =>
      validLines.reduce(
        (sum, l) => sum + Number(l.received_qty) * Number(l.unit_cost_paid),
        0,
      ),
    [validLines],
  );

  const baseValid =
    supplierId !== '' &&
    destinationId !== '' &&
    receivedAt !== '' &&
    validLines.length > 0 &&
    validLines.length === lines.length;

  const canSubmit =
    baseValid &&
    (mode === 'against_po'
      ? poId !== ''
      : urgentReason.trim().length > 0);

  // ─── Handlers ───────────────────────────────────────────────────────
  const updateLine = (tempId: string, patch: Partial<LineDraft>) =>
    setLines((prev) => prev.map((l) => (l.tempId === tempId ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (tempId: string) =>
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((l) => l.tempId !== tempId)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const itemsPayload: RecordPurchaseItemPayload[] = validLines.map((l) => ({
      item_id: Number(l.item_id),
      purchase_order_item_id: l.purchase_order_item_id ?? undefined,
      received_qty: Number(l.received_qty),
      unit_cost_paid: Number(l.unit_cost_paid),
    }));

    const payload: RecordPurchasePayload = {
      purchase_order_id: mode === 'against_po' ? Number(poId) : undefined,
      supplier_id: Number(supplierId),
      destination_location_id: Number(destinationId),
      is_urgent_buy: mode === 'urgent_buy',
      urgent_buy_reason: mode === 'urgent_buy' ? urgentReason.trim() : undefined,
      invoice_number: invoiceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      received_at: new Date(receivedAt).toISOString(),
      items: itemsPayload,
    };

    try {
      const created = await recordPurchase.mutateAsync(payload);
      router.push(`/inventory/purchases/${created.id}`);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Save unavailable in mock mode.';
      window.alert(msg);
    }
  };

  // PO-locked dropdowns (read-only when prefilled from PO).
  const supplierLocked    = mode === 'against_po' && !!selectedPO;
  const destinationLocked = mode === 'against_po' && !!selectedPO;

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <Link
        href="/inventory/purchases"
        className="inline-flex items-center gap-1.5 text-neutral-gray hover:text-text-dark transition-colors text-sm font-body mb-4"
      >
        <ArrowLeftIcon size={14} weight="bold" />
        All purchases
      </Link>

      <header className="mb-5">
        <h1 className="text-2xl font-bold font-brand text-text-dark">Record purchase</h1>
        <p className="text-neutral-gray text-sm font-body mt-1">
          Log a supplier receipt. Posts stock into the destination warehouse.
        </p>
      </header>

      <form onSubmit={submit} className="flex flex-col gap-5">
        {/* ── Mode toggle ────────────────────────────────────────────── */}
        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-2 inline-flex w-full sm:w-fit gap-1">
          <ModeButton
            active={mode === 'against_po'}
            onClick={() => switchMode('against_po')}
            icon={<ClipboardIcon size={14} weight="bold" />}
            label="Against PO"
          />
          <ModeButton
            active={mode === 'urgent_buy'}
            onClick={() => switchMode('urgent_buy')}
            icon={<LightningIcon size={14} weight="fill" />}
            label="Urgent buy"
          />
        </div>

        {/* ── PO picker (against_po only) ────────────────────────────── */}
        {mode === 'against_po' && (
          <section className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5">
            <FormField
              label="Purchase order"
              htmlFor="rp-po"
              required
              hint={
                receivablePOs.length === 0
                  ? 'No receivable POs (sent / partially received) available.'
                  : 'Pick the PO this delivery fulfils. Lines will be prefilled with the outstanding quantities.'
              }
            >
              <Select
                id="rp-po"
                value={poId}
                onChange={(e) => setPoId(e.target.value)}
                required
                disabled={receivablePOs.length === 0}
              >
                <option value="">Select PO…</option>
                {receivablePOs.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.reference} — {po.supplier.name} ({po.status.replace('_', ' ')})
                  </option>
                ))}
              </Select>
            </FormField>
          </section>
        )}

        {/* ── Urgent reason (urgent_buy only) ────────────────────────── */}
        {mode === 'urgent_buy' && (
          <section className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
            <FormField
              label="Reason for urgent buy"
              htmlFor="rp-urgent"
              required
              hint="Urgent buys bypass the PO workflow and are flagged in reports. Be specific."
            >
              <Textarea
                id="rp-urgent"
                value={urgentReason}
                onChange={(e) => setUrgentReason(e.target.value)}
                placeholder="e.g. Mid-service tomato shortage; nearest PO supplier closed"
                rows={2}
                required
              />
            </FormField>
          </section>
        )}

        {/* ── Meta ───────────────────────────────────────────────────── */}
        <section className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5">
          <h2 className="text-sm font-semibold font-body text-text-dark mb-4">Receipt details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField label="Supplier" htmlFor="rp-supplier" required>
              <Select
                id="rp-supplier"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
                disabled={supplierLocked}
              >
                <option value="">Select supplier…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Destination" htmlFor="rp-destination" required>
              <Select
                id="rp-destination"
                value={destinationId}
                onChange={(e) => setDestinationId(e.target.value)}
                required
                disabled={destinationLocked}
              >
                <option value="">Select destination…</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} {l.type === 'warehouse' ? '(warehouse)' : '(branch)'}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Received at" htmlFor="rp-received-at" required>
              <TextInput
                id="rp-received-at"
                type="datetime-local"
                value={receivedAt}
                onChange={(e) => setReceivedAt(e.target.value)}
                required
              />
            </FormField>

            <FormField
              label="Invoice number"
              htmlFor="rp-invoice"
              hint="Optional supplier invoice / waybill reference."
            >
              <TextInput
                id="rp-invoice"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="e.g. INV-2026-0481"
              />
            </FormField>

            <div className="sm:col-span-2">
              <FormField label="Notes" htmlFor="rp-notes">
                <Textarea
                  id="rp-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional context for the warehouse manager"
                  rows={2}
                />
              </FormField>
            </div>
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
              disabled={mode === 'against_po' && !!selectedPO}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-body bg-neutral-light text-text-dark hover:bg-neutral-light/70 border border-[#f0e8d8] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <PlusIcon size={12} weight="bold" />
              Add line
            </button>
          </div>

          {mode === 'against_po' && selectedPO && (
            <p className="text-xs text-neutral-gray font-body mb-3">
              Lines locked to {selectedPO.reference}. Adjust received quantities or unit costs to
              match the actual delivery. Set qty to 0 for items you didn&apos;t receive.
            </p>
          )}

          <div className="flex flex-col gap-3">
            {lines.map((line, idx) => {
              const lineTotal =
                Number(line.received_qty || 0) * Number(line.unit_cost_paid || 0);
              const selectedItem = items.find((i) => i.id === Number(line.item_id));
              const itemLocked = mode === 'against_po' && !!selectedPO;
              return (
                <div
                  key={line.tempId}
                  className="grid grid-cols-[1fr_auto] sm:grid-cols-[2fr_1fr_1fr_auto_auto] gap-3 items-end p-3 bg-neutral-light/40 border border-[#f0e8d8] rounded-xl"
                >
                  <FormField label={idx === 0 ? 'Item' : ''} htmlFor={`rp-item-${line.tempId}`}>
                    <Select
                      id={`rp-item-${line.tempId}`}
                      value={line.item_id}
                      onChange={(e) =>
                        updateLine(line.tempId, {
                          item_id: e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }
                      required
                      disabled={itemLocked}
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
                    label={
                      idx === 0
                        ? `Received${selectedItem ? ` (${selectedItem.base_unit.symbol})` : ''}`
                        : ''
                    }
                    htmlFor={`rp-qty-${line.tempId}`}
                  >
                    <TextInput
                      id={`rp-qty-${line.tempId}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.received_qty}
                      onChange={(e) => updateLine(line.tempId, { received_qty: e.target.value })}
                      placeholder="0"
                      required
                    />
                  </FormField>

                  <FormField
                    label={idx === 0 ? 'Unit cost paid (₵)' : ''}
                    htmlFor={`rp-cost-${line.tempId}`}
                  >
                    <TextInput
                      id={`rp-cost-${line.tempId}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.unit_cost_paid}
                      onChange={(e) => updateLine(line.tempId, { unit_cost_paid: e.target.value })}
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
                    disabled={lines.length === 1 || itemLocked}
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

        {/* ── Total ──────────────────────────────────────────────────── */}
        <section className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold font-body text-text-dark">Total paid</span>
            <span className="text-2xl font-bold font-mono tabular-nums text-text-dark">
              {formatGHS(totalPaid)}
            </span>
          </div>
        </section>

        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Link
            href="/inventory/purchases"
            className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold font-body bg-neutral-light text-text-dark hover:bg-neutral-light/70 border border-[#f0e8d8] min-h-11"
          >
            Cancel
          </Link>
          <div className="sm:w-60">
            <PrimaryButton type="submit" loading={recordPurchase.isPending} disabled={!canSubmit}>
              Record purchase
            </PrimaryButton>
          </div>
        </div>
      </form>
    </div>
  );
}

// ─── Mode toggle button ────────────────────────────────────────────

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold font-body min-h-11 transition-colors cursor-pointer ${
        active
          ? 'bg-primary text-white shadow-sm'
          : 'bg-transparent text-neutral-gray hover:text-text-dark hover:bg-neutral-light/60'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
