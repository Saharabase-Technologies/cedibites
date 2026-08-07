'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  PaperPlaneTiltIcon,
  PencilSimpleIcon,
  MapPinIcon,
  StorefrontIcon,
  UserIcon,
  TagIcon,
  WarningCircleIcon,
  TrashIcon,
  TruckIcon,
} from '@phosphor-icons/react';
import {
  RequisitionStatusBadge,
  TransferStatusBadge,
  PrimaryButton,
  InventoryModal,
  FormField,
  Textarea,
  TextInput,
} from '../../_components';
import {
  useRequisition,
  useSubmitRequisition,
  useDeleteRequisition,
  useApproveRequisition,
  useRejectRequisition,
} from '@/lib/api/hooks/inventory/useRequisitions';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import type { InventoryRequisition, InventoryRequisitionLine } from '@/types/inventory';
import { formatDateTime, PURPOSE_LABEL } from '../utils';
import { getErrorMessage } from '@/lib/utils/error-handler';
import { toast } from '@/lib/utils/toast';

function qtyLabel(qty: number | null, unit: string | null): string {
  if (qty === null) return '-';
  return `${qty}${unit ? ` ${unit}` : ''}`;
}

export function RequisitionDetailPage({ id }: { id: number }) {
  const router = useRouter();
  const { data: req, isLoading, error } = useRequisition(id);

  const [modal, setModal] = useState<null | 'approve' | 'reject'>(null);

  if (isLoading) return <DetailSkeleton />;
  if (error || !req) return <DetailMissing />;

  const close = () => setModal(null);

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <Link
        href="/inventory/requisitions"
        className="inline-flex items-center gap-1.5 text-neutral-gray hover:text-text-dark transition-colors text-sm font-body mb-4"
      >
        <ArrowLeftIcon size={14} weight="bold" />
        All requisitions
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold font-brand text-text-dark font-mono">
              {req.reference}
            </h1>
            <RequisitionStatusBadge status={req.status} />
          </div>
          <p className="text-neutral-gray text-sm font-body mt-1">
            Created {formatDateTime(req.created_at)}
            {req.requested_by ? <> by {req.requested_by}</> : null}
          </p>
        </div>

        <ActionBar req={req} onAction={setModal} />
      </div>

      {/* Rejected banner */}
      {req.status === 'rejected' && req.rejection_reason && (
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-700 mb-1">
            Rejected
          </p>
          <p className="text-rose-900 text-sm font-body">{req.rejection_reason}</p>
          {req.approved_by && (
            <p className="text-rose-700/70 text-xs mt-2">
              By {req.approved_by} · {formatDateTime(req.rejected_at)}
            </p>
          )}
        </div>
      )}

      {/* Fulfilling transfer link */}
      {req.fulfilling_transfer && (
        <Link
          href={`/inventory/transfers/${req.fulfilling_transfer.id}`}
          className="flex items-center gap-3 bg-[#e7edf3] border border-[#d3e0ea] rounded-xl p-4 mb-5 hover:bg-[#dde7ef] transition-colors"
        >
          <TruckIcon size={20} weight="fill" className="text-[#4f7a99] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#2f5570] mb-0.5">
              {/* A short delivery is still a delivery that happened - the
                  heading must read in the past tense for both, or a refused
                  run looks like it is still on the road. */}
              {req.status === 'fulfilled'
                ? 'Fulfilled by transfer'
                : req.status === 'fulfilled_short'
                  ? 'Delivered by transfer, partly refused'
                  : 'Fulfilling transfer'}
            </p>
            <p className="text-[#24435a] text-sm font-body font-mono">
              {req.fulfilling_transfer.reference}
            </p>
          </div>
          <TransferStatusBadge status={req.fulfilling_transfer.status} />
          <ArrowRightIcon size={16} weight="bold" className="text-[#4f7a99] shrink-0" />
        </Link>
      )}

      {/* Meta */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <MetaCard
          icon={<MapPinIcon size={16} />}
          label="For branch"
          value={req.requesting_location?.name ?? '-'}
        />
        <MetaCard
          icon={<StorefrontIcon size={16} />}
          label="Fulfil from"
          value={req.source_location?.name ?? '-'}
          hint={req.source_location?.type === 'warehouse' ? 'Warehouse' : 'Branch'}
        />
        <MetaCard icon={<TagIcon size={16} />} label="Purpose" value={PURPOSE_LABEL[req.purpose]} />
        <MetaCard
          icon={<UserIcon size={16} />}
          label={req.approved_by ? 'Decided by' : 'Requested by'}
          value={req.approved_by ?? req.requested_by ?? '-'}
        />
      </div>

      {/* Stage timeline */}
      <StageTimeline req={req} />

      {/* Line items */}
      <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden mb-5">
        <div className="px-5 py-4 border-b border-[#f0e8d8]">
          <h2 className="text-sm font-semibold font-body text-text-dark">
            Items <span className="text-neutral-gray font-normal">({req.lines.length})</span>
          </h2>
        </div>
        <LinesTable lines={req.lines} showApproved={req.status !== 'draft' && req.status !== 'submitted'} />
      </div>

      {/* Notes */}
      {req.notes && (
        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5 mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-gray mb-1">
            Notes
          </p>
          <p className="text-text-dark text-sm font-body whitespace-pre-wrap">{req.notes}</p>
        </div>
      )}

      {/* Modals */}
      <ApproveModal req={req} isOpen={modal === 'approve'} onClose={close} />
      <RejectDialog
        req={req}
        isOpen={modal === 'reject'}
        onClose={close}
        onRejected={() => {
          close();
          router.refresh();
        }}
      />
    </div>
  );
}

// ─── Action bar ──────────────────────────────────────────────────────────────

type ModalKind = 'approve' | 'reject';

function ActionBar({
  req,
  onAction,
}: {
  req: InventoryRequisition;
  onAction: (m: ModalKind) => void;
}) {
  const submit = useSubmitRequisition();
  const remove = useDeleteRequisition();
  const router = useRouter();
  const { can } = useStaffAuth();

  const s = req.status;
  const canEdit    = s === 'draft' && can('inventory.requisition.create');
  const canSubmit  = s === 'draft' && can('inventory.requisition.create');
  // A branch manager holds the approve grant so they can fulfil requests from
  // OTHER branches drawing on their stock - not to sign off their own. Letting
  // the requester approve makes the fulfilling side's control decorative.
  // Rejecting your own is still allowed: that is withdrawing it.
  const { staffUser } = useStaffAuth();
  // The USER id - `staffUser.id` is the employee id, a different table.
  const iRaisedThis = req.requested_by_id !== null && req.requested_by_id === staffUser?.user_id;
  const canDecide  = s === 'submitted' && can('inventory.requisition.approve');
  const canApprove = canDecide && !iRaisedThis;

  const handleSubmit = () => {
    submit.mutateAsync(req.id).catch((e) => toast.error(getErrorMessage(e)));
  };

  // Drafts only - the server refuses anything that has become a record, and
  // refuses a draft the caller did not start.
  const handleDelete = () => {
    remove
      .mutateAsync(req.id)
      .then(() => {
        toast.success(`${req.reference} deleted.`);
        router.push('/inventory/requisitions');
      })
      .catch((e) => toast.error(getErrorMessage(e)));
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {canEdit && (
        <Link
          href={`/inventory/requisitions/${req.id}/edit`}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold font-body min-h-11 transition-colors cursor-pointer shadow-sm bg-neutral-light text-text-dark hover:bg-neutral-light/70 border border-[#f0e8d8]"
        >
          <PencilSimpleIcon size={14} weight="bold" />
          Edit
        </Link>
      )}
      {canSubmit && (
        <ActionButton tone="primary" onClick={handleSubmit} loading={submit.isPending} icon={<PaperPlaneTiltIcon size={14} weight="bold" />}>
          Submit
        </ActionButton>
      )}
      {canEdit && (
        <ActionButton
          tone="danger"
          onClick={handleDelete}
          loading={remove.isPending}
          icon={<TrashIcon size={14} weight="bold" />}
        >
          Delete draft
        </ActionButton>
      )}
      {canApprove && (
        <ActionButton tone="primary" onClick={() => onAction('approve')} icon={<CheckCircleIcon size={14} weight="bold" />}>
          Approve
        </ActionButton>
      )}
      {canDecide && (
        <ActionButton tone="danger" onClick={() => onAction('reject')} icon={<XCircleIcon size={14} weight="bold" />}>
          {iRaisedThis ? 'Withdraw' : 'Reject'}
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
  tone: 'primary' | 'danger';
  loading?: boolean;
  onClick: () => void;
}) {
  const tones: Record<typeof tone, string> = {
    primary: 'bg-primary text-white hover:bg-primary/90',
    danger: 'bg-rose-50 text-rose-700 hover:bg-rose-100',
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

// ─── Approve modal (per-line granted qty) ─────────────────────────────────────

function ApproveModal({
  req,
  isOpen,
  onClose,
}: {
  req: InventoryRequisition;
  isOpen: boolean;
  onClose: () => void;
}) {
  const approve = useApproveRequisition();
  const [qty, setQty] = useState<Record<number, string>>({});
  const [err, setErr] = useState<string | null>(null);

  const getVal = (line: InventoryRequisitionLine) => qty[line.id] ?? String(line.requested_qty);

  const grantedTotal = req.lines.reduce((sum, line) => sum + Number(getVal(line) || 0), 0);

  const handleApprove = async () => {
    setErr(null);
    const lines = req.lines.map((line) => ({
      line_id: line.id,
      approved_qty: Number(getVal(line)),
    }));
    if (lines.some((l) => l.approved_qty < 0 || Number.isNaN(l.approved_qty))) {
      setErr('Granted quantities must be zero or more.');
      return;
    }
    if (grantedTotal <= 0) {
      setErr('Grant at least one line a quantity above zero, or reject the requisition instead.');
      return;
    }
    try {
      await approve.mutateAsync({ id: req.id, payload: { lines } });
      onClose();
    } catch (e) {
      setErr(getErrorMessage(e));
    }
  };

  return (
    <InventoryModal isOpen={isOpen} onClose={onClose} title={`Approve ${req.reference}`} size="lg">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-neutral-gray font-body">
          Grant a quantity per line (trim any you can&apos;t fully fill; set 0 to skip). Approving
          dispatches a draft transfer from{' '}
          <span className="font-semibold text-text-dark">{req.source_location?.name}</span> to{' '}
          <span className="font-semibold text-text-dark">{req.requesting_location?.name}</span>.
        </p>

        <div className="border border-[#f0e8d8] rounded-xl overflow-hidden">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="text-left bg-neutral-light/60 text-[11px] font-semibold uppercase tracking-wider text-neutral-gray">
                <th className="px-4 py-2.5">Item</th>
                <th className="px-4 py-2.5 text-right">Requested</th>
                <th className="px-4 py-2.5 text-right w-36">Grant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0e8d8]">
              {req.lines.map((line) => {
                const granted = Number(getVal(line));
                const trimmed = granted < line.requested_qty;
                return (
                  <tr key={line.id}>
                    <td className="px-4 py-3 text-text-dark">{line.item?.name ?? `#${line.item_id}`}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-neutral-gray">
                      {qtyLabel(line.requested_qty, line.item?.unit ?? null)}
                    </td>
                    <td className="px-4 py-3">
                      <TextInput
                        type="number"
                        step="0.01"
                        min="0"
                        value={getVal(line)}
                        onChange={(e) => setQty((p) => ({ ...p, [line.id]: e.target.value }))}
                        className={trimmed ? 'border-amber-400 bg-amber-50/50' : ''}
                        aria-label={`Quantity to grant for ${line.item?.name ?? line.item_id}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {err && (
          <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-100 rounded-xl">
            <WarningCircleIcon size={16} weight="fill" className="text-rose-600 mt-0.5 shrink-0" />
            <p className="text-rose-800 text-sm font-body">{err}</p>
          </div>
        )}

        <PrimaryButton type="button" onClick={handleApprove} loading={approve.isPending}>
          Approve & dispatch transfer
        </PrimaryButton>
      </div>
    </InventoryModal>
  );
}

// ─── Reject dialog ────────────────────────────────────────────────────────────

function RejectDialog({
  req,
  isOpen,
  onClose,
  onRejected,
}: {
  req: InventoryRequisition;
  isOpen: boolean;
  onClose: () => void;
  onRejected: () => void;
}) {
  const reject = useRejectRequisition();
  const [reason, setReason] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await reject.mutateAsync({ id: req.id, payload: { reason } });
      onRejected();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <InventoryModal isOpen={isOpen} onClose={onClose} title={`Reject ${req.reference}`} size="md">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-sm text-neutral-gray font-body">
          Let the branch know why this request can&apos;t be filled. The requisition stays visible
          for audit.
        </p>
        <FormField label="Reason" htmlFor="req-reject-reason" required>
          <Textarea
            id="req-reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Out of stock this week, order via a purchase instead"
            required
            rows={3}
          />
        </FormField>
        <PrimaryButton type="submit" loading={reject.isPending} disabled={!reason.trim()}>
          Confirm rejection
        </PrimaryButton>
      </form>
    </InventoryModal>
  );
}

// ─── Stage timeline ───────────────────────────────────────────────────────────

function StageTimeline({ req }: { req: InventoryRequisition }) {
  const stages: { label: string; at: string | null; by: string | null; tone: 'ok' | 'bad' }[] = [
    { label: 'Created', at: req.created_at, by: req.requested_by, tone: 'ok' },
    { label: 'Submitted', at: req.submitted_at, by: null, tone: 'ok' },
    { label: 'Approved', at: req.approved_at, by: req.approved_by, tone: 'ok' },
    { label: 'Rejected', at: req.rejected_at, by: req.approved_by, tone: 'bad' },
    { label: 'Fulfilled', at: req.fulfilled_at, by: null, tone: 'ok' },
  ];
  const reached = stages.filter((s) => s.at);
  if (reached.length <= 1) return null;

  return (
    <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5 mb-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-gray mb-3">
        Progress
      </p>
      <ol className="flex flex-wrap gap-x-8 gap-y-3">
        {reached.map((s) => (
          <li key={s.label} className="flex items-start gap-2">
            {s.tone === 'bad' ? (
              <XCircleIcon size={16} weight="fill" className="text-rose-500 mt-0.5 shrink-0" />
            ) : (
              <CheckCircleIcon size={16} weight="fill" className="text-emerald-500 mt-0.5 shrink-0" />
            )}
            <div>
              <p className="text-text-dark text-sm font-medium font-body">{s.label}</p>
              <p className="text-neutral-gray text-[11px]">
                {formatDateTime(s.at)}
                {s.by ? <> · {s.by}</> : null}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── Lines table ──────────────────────────────────────────────────────────────

function LinesTable({
  lines,
  showApproved,
}: {
  lines: InventoryRequisitionLine[];
  showApproved: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm font-body">
        <thead>
          <tr className="text-left bg-neutral-light/60 text-[11px] font-semibold uppercase tracking-wider text-neutral-gray">
            <th className="px-5 py-2.5">Item</th>
            <th className="px-5 py-2.5 text-right">Requested</th>
            {showApproved && <th className="px-5 py-2.5 text-right">Granted</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0e8d8]">
          {lines.map((line) => {
            const unit = line.item?.unit ?? null;
            const trimmed =
              line.approved_qty !== null && line.approved_qty < line.requested_qty;
            return (
              <tr key={line.id} className="hover:bg-primary/5">
                <td className="px-5 py-3 text-text-dark">{line.item?.name ?? `#${line.item_id}`}</td>
                <td className="px-5 py-3 text-right tabular-nums text-text-dark">
                  {qtyLabel(line.requested_qty, unit)}
                </td>
                {showApproved && (
                  <td className="px-5 py-3 text-right tabular-nums">
                    <span className={trimmed ? 'text-amber-700 font-semibold' : 'text-text-dark'}>
                      {qtyLabel(line.approved_qty, unit)}
                    </span>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Meta card ────────────────────────────────────────────────────────────────

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

// ─── Loading + missing ────────────────────────────────────────────────────────

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
        href="/inventory/requisitions"
        className="inline-flex items-center gap-1.5 text-neutral-gray hover:text-text-dark transition-colors text-sm font-body mb-4"
      >
        <ArrowLeftIcon size={14} weight="bold" />
        All requisitions
      </Link>
      <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl py-16 flex flex-col items-center text-center">
        <WarningCircleIcon size={40} weight="thin" className="text-neutral-gray/40 mb-3" />
        <p className="text-text-dark font-medium font-body">Requisition not found</p>
        <p className="text-neutral-gray text-sm font-body mt-1 max-w-sm">
          It may have been deleted or you may not have permission to view it.
        </p>
      </div>
    </div>
  );
}
