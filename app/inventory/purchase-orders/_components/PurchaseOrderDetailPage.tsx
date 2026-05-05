'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArchiveIcon,
  PaperPlaneTiltIcon,
  PencilSimpleIcon,
  TruckIcon,
  MapPinIcon,
  CalendarIcon,
  UserIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import {
  POStatusBadge,
  PrimaryButton,
  InventoryModal,
  FormField,
  Textarea,
} from '../../_components';
import {
  usePurchaseOrder,
  useApprovePurchaseOrder,
  useCancelPurchaseOrder,
  useClosePurchaseOrder,
  useSubmitPurchaseOrder,
} from '@/lib/api/hooks/inventory/usePurchaseOrders';
import { PO_APPROVAL_THRESHOLD } from '@/lib/constants/inventory.constants';
import type { PurchaseOrder, PurchaseOrderItem } from '@/types/inventory';
import { formatGHS, formatShortDate, formatDateTime } from '../utils';

export function PurchaseOrderDetailPage({ id }: { id: number }) {
  const router = useRouter();
  const { data: po, isLoading, error } = usePurchaseOrder(id);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (isLoading) return <DetailSkeleton />;
  if (error || !po) return <DetailMissing />;

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      {/* Back link */}
      <Link
        href="/inventory/purchase-orders"
        className="inline-flex items-center gap-1.5 text-neutral-gray hover:text-text-dark transition-colors text-sm font-body mb-4"
      >
        <ArrowLeftIcon size={14} weight="bold" />
        All purchase orders
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold font-brand text-text-dark font-mono">
              {po.reference}
            </h1>
            <POStatusBadge status={po.status} />
            {po.requires_approval && po.status !== 'cancelled' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700">
                <WarningCircleIcon size={11} weight="fill" />
                Admin approval ({formatGHS(PO_APPROVAL_THRESHOLD)}+)
              </span>
            )}
          </div>
          <p className="text-neutral-gray text-sm font-body mt-1">
            Created {formatDateTime(po.created_at)} by {po.created_by.name}
          </p>
        </div>

        <ActionBar
          po={po}
          onCancel={() => setCancelOpen(true)}
        />
      </div>

      {/* Cancel reason banner */}
      {po.cancel_reason && (
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-700 mb-1">
            Cancelled
          </p>
          <p className="text-rose-900 text-sm font-body">{po.cancel_reason}</p>
          {po.cancelled_by && po.cancelled_at && (
            <p className="text-rose-700/70 text-xs mt-2">
              By {po.cancelled_by.name} · {formatDateTime(po.cancelled_at)}
            </p>
          )}
        </div>
      )}

      {/* Meta cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <MetaCard icon={<TruckIcon size={16} />} label="Supplier" value={po.supplier.name} hint={po.supplier.code} />
        <MetaCard icon={<MapPinIcon size={16} />} label="Destination" value={po.destination_location.name} hint={po.destination_location.type === 'warehouse' ? 'Warehouse' : 'Branch'} />
        <MetaCard
          icon={<CalendarIcon size={16} />}
          label="Expected delivery"
          value={po.expected_delivery_date ? formatShortDate(po.expected_delivery_date) : '—'}
        />
        <MetaCard
          icon={<UserIcon size={16} />}
          label={po.approved_by ? 'Approved by' : 'Approval'}
          value={po.approved_by?.name ?? (po.requires_approval ? 'Required' : 'Not required')}
          hint={po.approved_at ? formatShortDate(po.approved_at) : undefined}
        />
      </div>

      {/* Items table */}
      <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden mb-5">
        <div className="px-5 py-4 border-b border-[#f0e8d8] flex items-baseline justify-between">
          <h2 className="text-sm font-semibold font-body text-text-dark">
            Line items <span className="text-neutral-gray font-normal">({po.items.length})</span>
          </h2>
          <p className="text-xs text-neutral-gray">
            Estimated · <span className="text-text-dark font-semibold tabular-nums">{formatGHS(po.estimated_total)}</span>
          </p>
        </div>
        <ItemsTable items={po.items} />
        {po.actual_total > 0 && (
          <div className="px-5 py-3 border-t border-[#f0e8d8] flex justify-end gap-6 text-sm">
            <span className="text-neutral-gray">Received to date</span>
            <span className="text-text-dark font-semibold tabular-nums">{formatGHS(po.actual_total)}</span>
          </div>
        )}
      </div>

      {/* Notes */}
      {po.notes && (
        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5 mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-gray mb-1">Notes</p>
          <p className="text-text-dark text-sm font-body whitespace-pre-wrap">{po.notes}</p>
        </div>
      )}

      <CancelDialog
        po={po}
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onCancelled={() => {
          setCancelOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}

// ─── Action bar ──────────────────────────────────────────────────────────────

function ActionBar({ po, onCancel }: { po: PurchaseOrder; onCancel: () => void }) {
  const submit  = useSubmitPurchaseOrder();
  const approve = useApprovePurchaseOrder();
  const close   = useClosePurchaseOrder();

  const canEdit    = po.status === 'draft';
  const canSubmit  = po.status === 'draft';
  const canApprove = po.status === 'pending_approval';
  const canCancel  = ['draft', 'pending_approval', 'sent'].includes(po.status);
  const canClose   = ['received', 'partially_received'].includes(po.status);

  const wrap = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Action unavailable in mock mode.';
      window.alert(msg);
    }
  };

  return (
    <div cEdit && (
        <Link
          href={`/inventory/purchase-orders/${po.id}/edit`}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold font-body min-h-11 transition-colors cursor-pointer shadow-sm bg-neutral-light text-text-dark hover:bg-neutral-light/70 border border-[#f0e8d8]"
        >
          <PencilSimpleIcon size={14} weight="bold" />
          Edit
        </Link>
      )}
      {canlassName="flex items-center gap-2 flex-wrap">
      {canSubmit && (
        <ActionButton
          tone="primary"
          onClick={() => void wrap(() => submit.mutateAsync(po.id))}
          loading={submit.isPending}
          icon={<PaperPlaneTiltIcon size={14} weight="bold" />}
        >
          Submit
        </ActionButton>
      )}
      {canApprove && (
        <ActionButton
          tone="primary"
          onClick={() => void wrap(() => approve.mutateAsync({ id: po.id }))}
          loading={approve.isPending}
          icon={<CheckCircleIcon size={14} weight="bold" />}
        >
          Approve
        </ActionButton>
      )}
      {canClose && (
        <ActionButton
          tone="neutral"
          onClick={() => void wrap(() => close.mutateAsync(po.id))}
          loading={close.isPending}
          icon={<ArchiveIcon size={14} weight="bold" />}
        >
          Close
        </ActionButton>
      )}
      {canCancel && (
        <ActionButton
          tone="danger"
          onClick={onCancel}
          icon={<XCircleIcon size={14} weight="bold" />}
        >
          Cancel
        </ActionButton>
      )}
    </div>
  );
}

function ActionButton({
  children,
  icon,
  tone,
  loading,
  onClick,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  tone: 'primary' | 'neutral' | 'danger';
  loading?: boolean;
  onClick: () => void;
}) {
  const tones: Record<typeof tone, string> = {
    primary: 'bg-primary text-white hover:bg-primary/90',
    neutral: 'bg-neutral-light text-text-dark hover:bg-neutral-light/70 border border-[#f0e8d8]',
    danger:  'bg-rose-50 text-rose-700 hover:bg-rose-100',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold font-body min-h-11 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-sm ${tones[tone]}`}
    >
      {icon}
      {loading ? 'Working…' : children}
    </button>
  );
}

// ─── Cancel dialog ───────────────────────────────────────────────────────────

function CancelDialog({
  po,
  isOpen,
  onClose,
  onCancelled,
}: {
  po: PurchaseOrder;
  isOpen: boolean;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const [reason, setReason] = useState('');
  const cancel = useCancelPurchaseOrder();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await cancel.mutateAsync({ id: po.id, payload: { reason } });
      onCancelled();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Cancellation unavailable in mock mode.';
      window.alert(msg);
    }
  };

  return (
    <InventoryModal isOpen={isOpen} onClose={onClose} title={`Cancel ${po.reference}`} size="md">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-sm text-neutral-gray font-body">
          Cancellation is permanent. The PO and all linked history remain visible for audit.
        </p>
        <FormField label="Reason" htmlFor="po-cancel-reason" required>
          <Textarea
            id="po-cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Supplier out of stock, duplicated order, price change"
            required
            rows={3}
          />
        </FormField>
        <PrimaryButton type="submit" loading={cancel.isPending} disabled={!reason.trim()}>
          Confirm cancellation
        </PrimaryButton>
      </form>
    </InventoryModal>
  );
}

// ─── Items table ─────────────────────────────────────────────────────────────

function ItemsTable({ items }: { items: PurchaseOrderItem[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm font-body">
        <thead>
          <tr className="text-left bg-neutral-light/60 text-[11px] font-semibold uppercase tracking-wider text-neutral-gray">
            <th className="px-5 py-2.5">Item</th>
            <th className="px-5 py-2.5 text-right">Ordered</th>
            <th className="px-5 py-2.5 text-right">Received</th>
            <th className="px-5 py-2.5 text-right">Unit cost</th>
            <th className="px-5 py-2.5 text-right">Line total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0e8d8]">
          {items.map((line) => {
            const fullyReceived  = line.received_qty >= line.ordered_qty;
            const partial        = line.received_qty > 0 && !fullyReceived;
            return (
              <tr key={line.id} className="hover:bg-primary/5">
                <td className="px-5 py-3">
                  <p className="text-text-dark">{line.item.name}</p>
                  <p className="text-neutral-gray text-[11px] font-mono mt-0.5">{line.item.sku}</p>
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-text-dark">
                  {line.ordered_qty} {line.unit.symbol}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">
                  <span
                    className={
                      fullyReceived
                        ? 'text-emerald-700 font-semibold'
                        : partial
                          ? 'text-violet-700 font-semibold'
                          : 'text-neutral-gray'
                    }
                  >
                    {line.received_qty} {line.unit.symbol}
                  </span>
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-text-dark">
                  {formatGHS(line.estimated_unit_cost)}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-text-dark font-semibold">
                  {formatGHS(line.line_total)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Meta card ───────────────────────────────────────────────────────────────

function MetaCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-4">
      <div className="flex items-center gap-1.5 text-neutral-gray text-[10px] font-semibold uppercase tracking-wider mb-1.5">
        <span className="text-neutral-gray/70">{icon}</span>
        {label}
      </div>
      <p className="text-text-dark text-sm font-semibold font-body truncate">{value}</p>
      {hint && <p className="text-neutral-gray text-[11px] mt-0.5 truncate">{hint}</p>}
    </div>
  );
}

// ─── Loading + missing ───────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <div className="h-4 w-32 bg-neutral-light rounded animate-pulse mb-4" />
      <div className="h-8 w-64 bg-neutral-light rounded animate-pulse mb-2" />
      <div className="h-4 w-48 bg-neutral-light rounded animate-pulse mb-6" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-neutral-light rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="h-64 bg-neutral-light rounded-2xl animate-pulse" />
    </div>
  );
}

function DetailMissing() {
  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <Link
        href="/inventory/purchase-orders"
        className="inline-flex items-center gap-1.5 text-neutral-gray hover:text-text-dark transition-colors text-sm font-body mb-4"
      >
        <ArrowLeftIcon size={14} weight="bold" />
        All purchase orders
      </Link>
      <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl py-16 flex flex-col items-center text-center">
        <WarningCircleIcon size={40} weight="thin" className="text-neutral-gray/40 mb-3" />
        <p className="text-text-dark font-medium font-body">Purchase order not found</p>
        <p className="text-neutral-gray text-sm font-body mt-1 max-w-sm">
          It may have been deleted or you may not have permission to view it.
        </p>
      </div>
    </div>
  );
}
