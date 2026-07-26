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
  TruckIcon,
  MapPinIcon,
  UserIcon,
  WarningCircleIcon,
  PackageIcon,
  SealCheckIcon,
  ArrowUUpLeftIcon,
} from '@phosphor-icons/react';
import {
  TransferStatusBadge,
  PrimaryButton,
  InventoryModal,
  FormField,
  Textarea,
  TextInput,
  Toggle,
} from '../../_components';
import {
  useTransfer,
  useSubmitTransfer,
  useApproveTransfer,
  useSendTransfer,
  useReceiveTransfer,
  useCancelTransfer,
  useResolveTransferDispute,
} from '@/lib/api/hooks/inventory/useTransfers';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import type { InventoryTransfer, InventoryTransferLine } from '@/types/inventory';
import { formatGHS, formatDateTime, transferValue } from '../utils';
import { getErrorMessage } from '@/lib/utils/error-handler';
import { toast } from '@/lib/utils/toast';

function qtyLabel(qty: number | null, unit: string | null): string {
  if (qty === null) return '—';
  return `${qty}${unit ? ` ${unit}` : ''}`;
}

export function TransferDetailPage({ id }: { id: number }) {
  const router = useRouter();
  const { data: transfer, isLoading, error } = useTransfer(id);

  const [modal, setModal] = useState<
    null | 'submit' | 'send' | 'receive' | 'cancel' | 'resolve'
  >(null);

  if (isLoading) return <DetailSkeleton />;
  if (error || !transfer) return <DetailMissing />;

  const close = () => setModal(null);
  const value = transferValue(transfer);

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <Link
        href="/inventory/transfers"
        className="inline-flex items-center gap-1.5 text-neutral-gray hover:text-text-dark transition-colors text-sm font-body mb-4"
      >
        <ArrowLeftIcon size={14} weight="bold" />
        All transfers
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold font-brand text-text-dark font-mono">
              {transfer.reference}
            </h1>
            <TransferStatusBadge status={transfer.status} />
          </div>
          <p className="text-neutral-gray text-sm font-body mt-1">
            Created {formatDateTime(transfer.created_at)}
            {transfer.created_by ? <> by {transfer.created_by}</> : null}
          </p>
          {transfer.parent_transfer_id && (
            <Link
              href={`/inventory/transfers/${transfer.parent_transfer_id}`}
              className="inline-flex items-center gap-1.5 mt-1.5 text-[11px] font-semibold text-amber-700 hover:underline"
            >
              <ArrowUUpLeftIcon size={13} weight="bold" />
              Corrective transfer — view the disputed original
            </Link>
          )}
        </div>

        <ActionBar transfer={transfer} onAction={setModal} />
      </div>

      {/* Cancelled banner */}
      {transfer.status === 'cancelled' && transfer.cancel_reason && (
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-700 mb-1">
            Cancelled
          </p>
          <p className="text-rose-900 text-sm font-body">{transfer.cancel_reason}</p>
          {transfer.cancelled_by && (
            <p className="text-rose-700/70 text-xs mt-2">
              By {transfer.cancelled_by} · {formatDateTime(transfer.cancelled_at)}
            </p>
          )}
        </div>
      )}

      {/* Dispute banner */}
      {transfer.dispute && ['disputed', 'closed_disputed'].includes(transfer.status) && (
        <DisputePanel transfer={transfer} />
      )}

      {/* Route + meta */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <MetaCard
          icon={<MapPinIcon size={16} />}
          label="From"
          value={transfer.source_location?.name ?? '—'}
          hint={transfer.source_location?.type === 'warehouse' ? 'Warehouse' : 'Branch'}
        />
        <MetaCard
          icon={<TruckIcon size={16} />}
          label="To"
          value={transfer.destination_location?.name ?? '—'}
          hint={transfer.destination_location?.type === 'warehouse' ? 'Warehouse' : 'Branch'}
        />
        <MetaCard
          icon={<UserIcon size={16} />}
          label={transfer.sent_by ? 'Sent by' : transfer.approved_by ? 'Approved by' : 'Created by'}
          value={transfer.sent_by ?? transfer.approved_by ?? transfer.created_by ?? '—'}
        />
        <MetaCard
          icon={<PackageIcon size={16} />}
          label="Value (sent)"
          value={value > 0 ? formatGHS(value) : '—'}
          hint={value > 0 ? undefined : 'Costed at send time'}
        />
      </div>

      {/* Stage timeline */}
      <StageTimeline transfer={transfer} />

      {/* Line items */}
      <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden mb-5">
        <div className="px-5 py-4 border-b border-[#f0e8d8] flex items-baseline justify-between">
          <h2 className="text-sm font-semibold font-body text-text-dark">
            Items <span className="text-neutral-gray font-normal">({transfer.lines.length})</span>
          </h2>
          {value > 0 && (
            <p className="text-xs text-neutral-gray">
              Total value ·{' '}
              <span className="text-text-dark font-semibold tabular-nums">{formatGHS(value)}</span>
            </p>
          )}
        </div>
        <LinesTable lines={transfer.lines} />
      </div>

      {/* Notes */}
      {transfer.notes && (
        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5 mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-gray mb-1">
            Notes
          </p>
          <p className="text-text-dark text-sm font-body whitespace-pre-wrap">{transfer.notes}</p>
        </div>
      )}

      <LineagePanel transfer={transfer} />

      {/* Modals */}
      <SubmitDialog transfer={transfer} isOpen={modal === 'submit'} onClose={close} />
      <SendModal transfer={transfer} isOpen={modal === 'send'} onClose={close} />
      <ReceiveModal transfer={transfer} isOpen={modal === 'receive'} onClose={close} />
      <CancelDialog
        transfer={transfer}
        isOpen={modal === 'cancel'}
        onClose={close}
        onCancelled={() => {
          close();
          router.refresh();
        }}
      />
      <ResolveDisputeDialog transfer={transfer} isOpen={modal === 'resolve'} onClose={close} />
    </div>
  );
}

// ─── Action bar ──────────────────────────────────────────────────────────────

type ModalKind = 'submit' | 'send' | 'receive' | 'cancel' | 'resolve';

function ActionBar({
  transfer,
  onAction,
}: {
  transfer: InventoryTransfer;
  onAction: (m: ModalKind) => void;
}) {
  const approve = useApproveTransfer();
  const { can } = useStaffAuth();

  // Each action needs both the right status AND the matching permission — a role
  // never sees an action it can't perform. The backend enforces the same rules.
  const s = transfer.status;
  const canEdit    = s === 'draft' && can('inventory.transfer.create');
  const canSubmit  = s === 'draft' && can('inventory.transfer.create');
  const canApprove = s === 'submitted' && can('inventory.transfer.send');
  const canSend    = s === 'approved' && can('inventory.transfer.send');
  // Whoever dispatched the stock may not also sign for its arrival — a short
  // delivery is only caught if the other end confirms it. The API enforces the
  // same rule; this keeps the button from being offered at all.
  const { staffUser } = useStaffAuth();
  const iSentThis = transfer.sent_by !== null && transfer.sent_by === staffUser?.name;
  const canReceive = s === 'sent' && can('inventory.transfer.receive') && !iSentThis;
  const canResolve = s === 'disputed' && can('inventory.transfer.resolve_dispute');
  const canCancel  = ['draft', 'submitted', 'approved'].includes(s) && can('inventory.transfer.create');

  const handleApprove = () => {
    approve.mutateAsync(transfer.id).catch((e) => toast.error(getErrorMessage(e)));
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {canEdit && (
        <Link
          href={`/inventory/transfers/${transfer.id}/edit`}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold font-body min-h-11 transition-colors cursor-pointer shadow-sm bg-neutral-light text-text-dark hover:bg-neutral-light/70 border border-[#f0e8d8]"
        >
          <PencilSimpleIcon size={14} weight="bold" />
          Edit
        </Link>
      )}
      {canSubmit && (
        <ActionButton tone="primary" onClick={() => onAction('submit')} icon={<PaperPlaneTiltIcon size={14} weight="bold" />}>
          Submit
        </ActionButton>
      )}
      {canApprove && (
        <ActionButton tone="primary" onClick={handleApprove} loading={approve.isPending} icon={<CheckCircleIcon size={14} weight="bold" />}>
          Approve
        </ActionButton>
      )}
      {canSend && (
        <ActionButton tone="primary" onClick={() => onAction('send')} icon={<TruckIcon size={14} weight="bold" />}>
          Send
        </ActionButton>
      )}
      {canReceive && (
        <ActionButton tone="primary" onClick={() => onAction('receive')} icon={<SealCheckIcon size={14} weight="bold" />}>
          Receive
        </ActionButton>
      )}
      {canResolve && (
        <ActionButton tone="primary" onClick={() => onAction('resolve')} icon={<ArrowUUpLeftIcon size={14} weight="bold" />}>
          Resolve dispute
        </ActionButton>
      )}
      {canCancel && (
        <ActionButton tone="danger" onClick={() => onAction('cancel')} icon={<XCircleIcon size={14} weight="bold" />}>
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

// ─── Submit dialog (with optional admin override) ─────────────────────────────

function SubmitDialog({
  transfer,
  isOpen,
  onClose,
}: {
  transfer: InventoryTransfer;
  isOpen: boolean;
  onClose: () => void;
}) {
  const submit = useSubmitTransfer();
  const { can } = useStaffAuth();
  const canOverride = can('inventory.transfer.override_source_check');
  const [override, setOverride] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErr(null);
    try {
      await submit.mutateAsync({ id: transfer.id, payload: { override_source_check: override } });
      onClose();
    } catch (e) {
      setErr(getErrorMessage(e));
    }
  };

  return (
    <InventoryModal isOpen={isOpen} onClose={onClose} title={`Submit ${transfer.reference}`} size="md">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-neutral-gray font-body">
          Submitting sends this transfer for approval. The source location&apos;s stock is checked
          against the requested quantities.
        </p>

        {canOverride && (
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
            <div className="pt-0.5">
              <Toggle checked={override} onChange={setOverride} />
            </div>
            <div>
              <p className="text-amber-900 text-sm font-semibold font-body">Override stock check</p>
              <p className="text-amber-800/80 text-xs font-body mt-0.5">
                Submit even if the source is short. Use only when you know stock will be replenished
                before sending. This is recorded against your account.
              </p>
            </div>
          </div>
        )}

        {err && (
          <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-100 rounded-xl">
            <WarningCircleIcon size={16} weight="fill" className="text-rose-600 mt-0.5 shrink-0" />
            <p className="text-rose-800 text-sm font-body">{err}</p>
          </div>
        )}

        <PrimaryButton type="button" onClick={handleSubmit} loading={submit.isPending}>
          {override ? 'Submit with override' : 'Submit transfer'}
        </PrimaryButton>
      </div>
    </InventoryModal>
  );
}

// ─── Send modal (per-line sent qty) ───────────────────────────────────────────

function SendModal({
  transfer,
  isOpen,
  onClose,
}: {
  transfer: InventoryTransfer;
  isOpen: boolean;
  onClose: () => void;
}) {
  const send = useSendTransfer();
  const [qty, setQty] = useState<Record<number, string>>({});
  const [err, setErr] = useState<string | null>(null);

  // Default each line to its requested qty (only initialise once per open).
  const getVal = (line: InventoryTransferLine) =>
    qty[line.id] ?? String(line.requested_qty);

  const handleSend = async () => {
    setErr(null);
    const lines = transfer.lines.map((line) => ({
      line_id: line.id,
      sent_qty: Number(getVal(line)),
    }));
    if (lines.some((l) => !(l.sent_qty > 0))) {
      setErr('Every line must send a quantity greater than zero.');
      return;
    }
    try {
      await send.mutateAsync({ id: transfer.id, payload: { lines } });
      onClose();
    } catch (e) {
      setErr(getErrorMessage(e));
    }
  };

  return (
    <InventoryModal isOpen={isOpen} onClose={onClose} title={`Send ${transfer.reference}`} size="lg">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-neutral-gray font-body">
          Sending deducts stock from{' '}
          <span className="font-semibold text-text-dark">{transfer.source_location?.name}</span>{' '}
          (oldest batches first) and puts the transfer in transit. Adjust quantities if you&apos;re
          sending less than requested.
        </p>

        <div className="border border-[#f0e8d8] rounded-xl overflow-hidden">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="text-left bg-neutral-light/60 text-[11px] font-semibold uppercase tracking-wider text-neutral-gray">
                <th className="px-4 py-2.5">Item</th>
                <th className="px-4 py-2.5 text-right">Requested</th>
                <th className="px-4 py-2.5 text-right w-36">Send</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0e8d8]">
              {transfer.lines.map((line) => (
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
                      aria-label={`Quantity to send for ${line.item?.name ?? line.item_id}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {err && (
          <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-100 rounded-xl">
            <WarningCircleIcon size={16} weight="fill" className="text-rose-600 mt-0.5 shrink-0" />
            <p className="text-rose-800 text-sm font-body">{err}</p>
          </div>
        )}

        <PrimaryButton type="button" onClick={handleSend} loading={send.isPending}>
          Send transfer
        </PrimaryButton>
      </div>
    </InventoryModal>
  );
}

// ─── Receive modal (per-line received qty + dispute) ──────────────────────────

function ReceiveModal({
  transfer,
  isOpen,
  onClose,
}: {
  transfer: InventoryTransfer;
  isOpen: boolean;
  onClose: () => void;
}) {
  const receive = useReceiveTransfer();
  const [qty, setQty] = useState<Record<number, string>>({});
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const getVal = (line: InventoryTransferLine) =>
    qty[line.id] ?? String(line.sent_qty ?? 0);

  const isShort = transfer.lines.some((line) => {
    const received = Number(getVal(line));
    return received < (line.sent_qty ?? 0);
  });

  const handleReceive = async () => {
    setErr(null);
    const lines = transfer.lines.map((line) => ({
      line_id: line.id,
      received_qty: Number(getVal(line)),
    }));
    if (lines.some((l) => l.received_qty < 0 || Number.isNaN(l.received_qty))) {
      setErr('Received quantities must be zero or more.');
      return;
    }
    for (const line of transfer.lines) {
      if (Number(getVal(line)) > (line.sent_qty ?? 0)) {
        setErr('Received quantity cannot exceed what was sent.');
        return;
      }
    }
    try {
      await receive.mutateAsync({
        id: transfer.id,
        payload: { lines, dispute_reason: isShort ? reason.trim() || undefined : undefined },
      });
      onClose();
    } catch (e) {
      setErr(getErrorMessage(e));
    }
  };

  return (
    <InventoryModal isOpen={isOpen} onClose={onClose} title={`Receive ${transfer.reference}`} size="lg">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-neutral-gray font-body">
          Confirm what actually arrived at{' '}
          <span className="font-semibold text-text-dark">{transfer.destination_location?.name}</span>.
          Receiving less than was sent raises a dispute and a corrective transfer can be issued.
        </p>

        <div className="border border-[#f0e8d8] rounded-xl overflow-hidden">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="text-left bg-neutral-light/60 text-[11px] font-semibold uppercase tracking-wider text-neutral-gray">
                <th className="px-4 py-2.5">Item</th>
                <th className="px-4 py-2.5 text-right">Sent</th>
                <th className="px-4 py-2.5 text-right w-36">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0e8d8]">
              {transfer.lines.map((line) => {
                const received = Number(getVal(line));
                const short = received < (line.sent_qty ?? 0);
                return (
                  <tr key={line.id}>
                    <td className="px-4 py-3 text-text-dark">{line.item?.name ?? `#${line.item_id}`}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-neutral-gray">
                      {qtyLabel(line.sent_qty, line.item?.unit ?? null)}
                    </td>
                    <td className="px-4 py-3">
                      <TextInput
                        type="number"
                        step="0.01"
                        min="0"
                        max={line.sent_qty ?? undefined}
                        value={getVal(line)}
                        onChange={(e) => setQty((p) => ({ ...p, [line.id]: e.target.value }))}
                        className={short ? 'border-amber-400 bg-amber-50/50' : ''}
                        aria-label={`Quantity received for ${line.item?.name ?? line.item_id}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {isShort && (
          <div className="flex flex-col gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
            <p className="text-amber-900 text-sm font-semibold font-body flex items-center gap-1.5">
              <WarningCircleIcon size={15} weight="fill" />
              Short receipt — this raises a dispute
            </p>
            <FormField label="Dispute reason" htmlFor="tr-dispute-reason">
              <Textarea
                id="tr-dispute-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. 2 crates missing on arrival, spoilage in transit"
                rows={2}
              />
            </FormField>
          </div>
        )}

        {err && (
          <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-100 rounded-xl">
            <WarningCircleIcon size={16} weight="fill" className="text-rose-600 mt-0.5 shrink-0" />
            <p className="text-rose-800 text-sm font-body">{err}</p>
          </div>
        )}

        <PrimaryButton type="button" onClick={handleReceive} loading={receive.isPending}>
          {isShort ? 'Receive & raise dispute' : 'Confirm receipt'}
        </PrimaryButton>
      </div>
    </InventoryModal>
  );
}

// ─── Cancel dialog ────────────────────────────────────────────────────────────

function CancelDialog({
  transfer,
  isOpen,
  onClose,
  onCancelled,
}: {
  transfer: InventoryTransfer;
  isOpen: boolean;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const cancel = useCancelTransfer();
  const [reason, setReason] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await cancel.mutateAsync({ id: transfer.id, payload: { reason } });
      onCancelled();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <InventoryModal isOpen={isOpen} onClose={onClose} title={`Cancel ${transfer.reference}`} size="md">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-sm text-neutral-gray font-body">
          Cancellation is permanent. It&apos;s only possible before stock is sent. The record stays
          visible for audit.
        </p>
        <FormField label="Reason" htmlFor="tr-cancel-reason" required>
          <Textarea
            id="tr-cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Duplicate transfer, branch no longer needs stock"
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

// ─── Resolve dispute dialog ───────────────────────────────────────────────────

function ResolveDisputeDialog({
  transfer,
  isOpen,
  onClose,
}: {
  transfer: InventoryTransfer;
  isOpen: boolean;
  onClose: () => void;
}) {
  const resolve = useResolveTransferDispute();
  const [notes, setNotes] = useState('');
  // Default to chasing the shortfall — writing it off is the deliberate choice.
  const [sendCorrective, setSendCorrective] = useState(true);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await resolve.mutateAsync({
        id: transfer.id,
        payload: { notes: notes.trim() || undefined, send_corrective: sendCorrective },
      });
      onClose();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <InventoryModal isOpen={isOpen} onClose={onClose} title={`Resolve dispute — ${transfer.reference}`} size="md">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-sm text-neutral-gray font-body">
          Resolving closes this transfer. The original record is never altered.
        </p>

        {/* Chasing the shortfall is not always the right answer — sometimes the
            stock is simply gone. The ledger is identical either way; this
            records which decision was made. */}
        <div className="flex flex-col gap-2">
          {[
            {
              value: true,
              label: 'Send a corrective transfer',
              hint: 'Tops the destination up with what was missing.',
            },
            {
              value: false,
              label: 'Write the shortfall off as a loss',
              hint: 'Nothing further is sent. Recorded against the dispute for wastage reporting.',
            },
          ].map((opt) => (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => setSendCorrective(opt.value)}
              className={`flex flex-col items-start rounded-xl border px-3 py-2 text-left transition-colors cursor-pointer ${
                sendCorrective === opt.value
                  ? 'border-primary bg-[#fff8ec]'
                  : 'border-[#f0e8d8] hover:bg-neutral-light'
              }`}
            >
              <span className="font-body text-sm font-semibold text-text-dark">{opt.label}</span>
              <span className="font-body text-[11px] text-neutral-gray">{opt.hint}</span>
            </button>
          ))}
        </div>
        <FormField label="Resolution notes" htmlFor="tr-resolve-notes" hint="Optional — how the shortfall was reconciled.">
          <Textarea
            id="tr-resolve-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Confirmed with driver, re-sending tomorrow"
            rows={3}
          />
        </FormField>
        <PrimaryButton type="submit" loading={resolve.isPending}>
          {sendCorrective ? 'Resolve & create corrective transfer' : 'Resolve & write off shortfall'}
        </PrimaryButton>
      </form>
    </InventoryModal>
  );
}

// ─── Corrective chain ─────────────────────────────────────────────────────────

/**
 * The whole corrective chain, oldest first.
 *
 * A short delivery spawns a corrective transfer, which can itself be received
 * short and spawn another. The banners at the top only ever showed one hop in
 * each direction, so from the middle of a chain you could not see what
 * originally went wrong or how it ended. Every hop links, in both directions.
 */
function LineagePanel({ transfer }: { transfer: InventoryTransfer }) {
  const chain = transfer.lineage ?? [];

  // A transfer with no corrective history is a chain of one — nothing to show.
  if (chain.length < 2) return null;

  return (
    <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5 mb-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-gray mb-3">
        Corrective chain ({chain.length})
      </p>
      <ol className="flex flex-col">
        {chain.map((node, i) => (
          <li key={node.id} className="flex items-stretch gap-3">
            {/* Rail: a dot per hop, joined except after the last. */}
            <div className="flex flex-col items-center">
              <span
                className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${
                  node.is_current ? 'bg-primary' : 'bg-neutral-gray/40'
                }`}
                aria-hidden
              />
              {i < chain.length - 1 && <span className="w-px flex-1 bg-[#f0e8d8]" aria-hidden />}
            </div>

            <div className={`pb-3 min-w-0 ${i === chain.length - 1 ? 'pb-0' : ''}`}>
              {node.is_current ? (
                <span className="font-mono text-sm text-text-dark font-semibold">
                  {node.reference}
                  <span className="ml-2 font-body text-[11px] font-normal text-neutral-gray">
                    you are here
                  </span>
                </span>
              ) : (
                <Link
                  href={`/inventory/transfers/${node.id}`}
                  className="font-mono text-sm text-primary hover:underline"
                >
                  {node.reference}
                </Link>
              )}
              <div className="mt-1">
                <TransferStatusBadge status={node.status} />
              </div>
              {node.depth > 0 && (
                <p className="mt-1 font-body text-[11px] text-neutral-gray">
                  Corrects the transfer above it.
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── Dispute panel ────────────────────────────────────────────────────────────

function DisputePanel({ transfer }: { transfer: InventoryTransfer }) {
  const dispute = transfer.dispute!;
  return (
    <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 mb-5">
      <div className="flex items-start gap-3">
        <WarningCircleIcon size={20} weight="fill" className="text-rose-600 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-700 mb-1">
            {dispute.status === 'resolved' ? 'Dispute resolved' : 'Open dispute'}
          </p>
          <p className="text-rose-900 text-sm font-body">
            {dispute.reason ?? 'Short receipt — received less than was sent.'}
          </p>
          <p className="text-rose-700/80 text-xs mt-2">
            Discrepancy: <span className="font-semibold tabular-nums">{dispute.discrepancy_qty}</span>
          </p>
          {dispute.resolution === 'written_off' && (
            <p className="text-rose-700/80 text-xs mt-1">
              Written off as a loss:{' '}
              <span className="font-semibold tabular-nums">{dispute.written_off_qty}</span> — no
              corrective transfer was sent.
            </p>
          )}
          {dispute.corrective_transfer_id && (
            <Link
              href={`/inventory/transfers/${dispute.corrective_transfer_id}`}
              className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-rose-700 hover:underline"
            >
              <ArrowRightIcon size={13} weight="bold" />
              View corrective transfer
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Stage timeline ───────────────────────────────────────────────────────────

function StageTimeline({ transfer }: { transfer: InventoryTransfer }) {
  const stages: { label: string; at: string | null; by: string | null }[] = [
    { label: 'Created', at: transfer.created_at, by: transfer.created_by },
    { label: 'Submitted', at: transfer.submitted_at, by: null },
    { label: 'Approved', at: transfer.approved_at, by: transfer.approved_by },
    { label: 'Sent', at: transfer.sent_at, by: transfer.sent_by },
    { label: 'Received', at: transfer.received_at, by: transfer.received_by },
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
            <CheckCircleIcon size={16} weight="fill" className="text-emerald-500 mt-0.5 shrink-0" />
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

function LinesTable({ lines }: { lines: InventoryTransferLine[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm font-body">
        <thead>
          <tr className="text-left bg-neutral-light/60 text-[11px] font-semibold uppercase tracking-wider text-neutral-gray">
            <th className="px-5 py-2.5">Item</th>
            <th className="px-5 py-2.5 text-right">Requested</th>
            <th className="px-5 py-2.5 text-right">Sent</th>
            <th className="px-5 py-2.5 text-right">Received</th>
            <th className="px-5 py-2.5 text-right">Unit cost</th>
            <th className="px-5 py-2.5 text-right">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0e8d8]">
          {lines.map((line) => {
            const unit = line.item?.unit ?? null;
            const short =
              line.received_qty !== null &&
              line.sent_qty !== null &&
              line.received_qty < line.sent_qty;
            const lineValue = (line.sent_qty ?? 0) * (line.unit_cost_at_time ?? 0);
            return (
              <tr key={line.id} className="hover:bg-primary/5">
                <td className="px-5 py-3 text-text-dark">{line.item?.name ?? `#${line.item_id}`}</td>
                <td className="px-5 py-3 text-right tabular-nums text-text-dark">
                  {qtyLabel(line.requested_qty, unit)}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-text-dark">
                  {qtyLabel(line.sent_qty, unit)}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">
                  <span className={short ? 'text-amber-700 font-semibold' : 'text-text-dark'}>
                    {qtyLabel(line.received_qty, unit)}
                  </span>
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-neutral-gray">
                  {line.unit_cost_at_time !== null ? formatGHS(line.unit_cost_at_time) : '—'}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-text-dark font-semibold">
                  {lineValue > 0 ? formatGHS(lineValue) : '—'}
                </td>
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
        href="/inventory/transfers"
        className="inline-flex items-center gap-1.5 text-neutral-gray hover:text-text-dark transition-colors text-sm font-body mb-4"
      >
        <ArrowLeftIcon size={14} weight="bold" />
        All transfers
      </Link>
      <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl py-16 flex flex-col items-center text-center">
        <WarningCircleIcon size={40} weight="thin" className="text-neutral-gray/40 mb-3" />
        <p className="text-text-dark font-medium font-body">Transfer not found</p>
        <p className="text-neutral-gray text-sm font-body mt-1 max-w-sm">
          It may have been deleted or you may not have permission to view it.
        </p>
      </div>
    </div>
  );
}
