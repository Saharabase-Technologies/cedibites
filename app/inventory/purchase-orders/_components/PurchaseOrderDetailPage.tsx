'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
  DownloadSimpleIcon,
  SealCheckIcon,
} from '@phosphor-icons/react';
import { downloadPurchaseOrderPdf } from '@/lib/utils/purchaseOrderPdf';
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
import { usePurchaseOrderRealtime } from '@/lib/api/hooks/inventory/usePurchaseOrderRealtime';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { PO_APPROVAL_THRESHOLD } from '@/lib/constants/inventory.constants';
import type { PurchaseOrder, PurchaseOrderItem } from '@/types/inventory';
import { formatGHS, formatShortDate, formatDateTime } from '../utils';
import { getErrorMessage } from '@/lib/utils/error-handler';
import { toast } from '@/lib/utils/toast';

export function PurchaseOrderDetailPage({ id }: { id: number }) {
  // useSearchParams() must sit under a Suspense boundary, otherwise the route
  // crashes the server render (surfaces as an opaque Turbopack worker error).
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <DetailContent id={id} />
    </Suspense>
  );
}

function DetailContent({ id }: { id: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: po, isLoading, error } = usePurchaseOrder(id);
  usePurchaseOrderRealtime();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [sentModal, setSentModal] = useState<{ open: boolean; approved: boolean }>({
    open: false,
    approved: false,
  });

  // The edit-and-approve flow on the form redirects here with ?approved=1.
  useEffect(() => {
    if (searchParams.get('approved') === '1' && po?.status === 'sent') {
      setSentModal({ open: true, approved: true });
      router.replace(`/inventory/purchase-orders/${id}`);
    }
  }, [searchParams, po?.status, id, router]);

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
          {po.verification_code && (
            <Link
              href={`/inventory/purchase-orders/verify/${encodeURIComponent(po.verification_code)}`}
              className="inline-flex items-center gap-1.5 mt-1.5 text-[11px] font-mono text-neutral-gray hover:text-primary"
              title="Verification signature — scan the QR on the PO document or click to verify"
            >
              <SealCheckIcon size={13} weight="bold" />
              {po.verification_code}
            </Link>
          )}
        </div>

        <ActionBar
          po={po}
          onCancel={() => setCancelOpen(true)}
          onSent={(approved) => setSentModal({ open: true, approved })}
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

      <SentSuccessModal
        po={po}
        isOpen={sentModal.open}
        approved={sentModal.approved}
        onClose={() => setSentModal({ open: false, approved: false })}
      />
    </div>
  );
}

// ─── Sent / approved success modal ────────────────────────────────────────────

function SentSuccessModal({
  po,
  isOpen,
  approved,
  onClose,
}: {
  po: PurchaseOrder;
  isOpen: boolean;
  approved: boolean;
  onClose: () => void;
}) {
  return (
    <InventoryModal isOpen={isOpen} onClose={onClose} title={approved ? 'Purchase order approved' : 'Purchase order sent'} size="md">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <CheckCircleIcon size={28} weight="fill" className="text-emerald-600 mt-0.5 shrink-0" />
          <p className="text-sm text-text-dark font-body">
            <span className="font-mono font-semibold">{po.reference}</span>{' '}
            {approved ? 'has been approved and is now ' : 'is now '}
            <span className="font-semibold">sent</span>. The PO document has been downloaded — forward
            it to <span className="font-semibold">{po.supplier.name}</span> to place the order.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <button
            type="button"
            onClick={() => void downloadPurchaseOrderPdf(po)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold font-body bg-neutral-light text-text-dark hover:bg-neutral-light/70 border border-[#f0e8d8] min-h-11"
          >
            <DownloadSimpleIcon size={15} weight="bold" />
            Download again
          </button>
          <div className="sm:w-40">
            <PrimaryButton type="button" onClick={onClose}>
              Done
            </PrimaryButton>
          </div>
        </div>
      </div>
    </InventoryModal>
  );
}

// ─── Action bar ──────────────────────────────────────────────────────────────

function ActionBar({
  po,
  onCancel,
  onSent,
}: {
  po: PurchaseOrder;
  onCancel: () => void;
  onSent: (approved: boolean) => void;
}) {
  const submit  = useSubmitPurchaseOrder();
  const approve = useApprovePurchaseOrder();
  const close   = useClosePurchaseOrder();
  const { can } = useStaffAuth();

  // Buttons require both the right status AND the matching permission, so a role
  // never sees an action it can't perform (e.g. WM has no approve right). The
  // backend enforces the same permissions; this just keeps the UI honest.
  // Editing a pending-approval PO approves + sends on save → needs approve, not update.
  const canEditDraft   = po.status === 'draft' && can('inventory.purchase_order.update');
  const canEditApprove = po.status === 'pending_approval' && can('inventory.purchase_order.approve');
  const canEdit     = canEditDraft || canEditApprove;
  const canSubmit   = po.status === 'draft' && can('inventory.purchase_order.submit');
  const canApprove  = po.status === 'pending_approval' && can('inventory.purchase_order.approve');
  const canCancel   = ['draft', 'pending_approval', 'sent'].includes(po.status) && can('inventory.purchase_order.cancel');
  const canClose    = ['received', 'partially_received'].includes(po.status) && can('inventory.purchase_order.close');
  const canDownload = ['sent', 'partially_received', 'received', 'closed'].includes(po.status);

  const alertError = (e: unknown) => {
    toast.error(getErrorMessage(e));
  };

  // Submitting a sub-threshold PO sends it → download + confirm. A ₵10k+ PO goes
  // to pending_approval instead (no download yet).
  const handleSubmit = async () => {
    try {
      const updated = await submit.mutateAsync(po.id);
      if (updated.status === 'sent') {
        await downloadPurchaseOrderPdf(updated);
        onSent(false);
      }
    } catch (e) {
      alertError(e);
    }
  };

  const handleApprove = async () => {
    try {
      const updated = await approve.mutateAsync({ id: po.id });
      if (updated.status === 'sent') {
        await downloadPurchaseOrderPdf(updated);
      }
      onSent(true);
    } catch (e) {
      alertError(e);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {canDownload && (
        <ActionButton
          tone="neutral"
          onClick={() => void downloadPurchaseOrderPdf(po)}
          icon={<DownloadSimpleIcon size={14} weight="bold" />}
        >
          Download PO
        </ActionButton>
      )}
      {canEdit && (
        <Link
          href={`/inventory/purchase-orders/${po.id}/edit`}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold font-body min-h-11 transition-colors cursor-pointer shadow-sm bg-neutral-light text-text-dark hover:bg-neutral-light/70 border border-[#f0e8d8]"
        >
          <PencilSimpleIcon size={14} weight="bold" />
          {po.status === 'pending_approval' ? 'Edit & approve' : 'Edit'}
        </Link>
      )}
      {canSubmit && (
        <ActionButton
          tone="primary"
          onClick={handleSubmit}
          loading={submit.isPending}
          icon={<PaperPlaneTiltIcon size={14} weight="bold" />}
        >
          Submit
        </ActionButton>
      )}
      {canApprove && (
        <ActionButton
          tone="primary"
          onClick={handleApprove}
          loading={approve.isPending}
          icon={<CheckCircleIcon size={14} weight="bold" />}
        >
          Approve
        </ActionButton>
      )}
      {canClose && (
        <ActionButton
          tone="neutral"
          onClick={() => { void close.mutateAsync(po.id).catch(alertError); }}
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
      toast.error(getErrorMessage(e));
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
            <th className="px-5 py-2.5 text-right">Variance</th>
            <th className="px-5 py-2.5 text-right">Unit cost</th>
            <th className="px-5 py-2.5 text-right">Line total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0e8d8]">
          {items.map((line) => {
            const fullyReceived  = line.received_qty >= line.ordered_qty;
            const partial        = line.received_qty > 0 && !fullyReceived;
            const variance       = line.received_qty - line.ordered_qty;
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
                <td className="px-5 py-3 text-right tabular-nums">
                  {line.received_qty === 0 ? (
                    <span className="text-neutral-gray">—</span>
                  ) : variance === 0 ? (
                    <span className="text-emerald-700 font-semibold">0</span>
                  ) : (
                    <span className={variance < 0 ? 'text-rose-700 font-semibold' : 'text-amber-700 font-semibold'}>
                      {variance > 0 ? '+' : ''}{variance} {line.unit.symbol}
                    </span>
                  )}
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
