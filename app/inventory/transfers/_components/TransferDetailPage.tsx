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
  Select,
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
import { useWastageReasons } from '@/lib/api/hooks/inventory/useWastages';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import type { InventoryTransfer, InventoryTransferLine, WastageReason } from '@/types/inventory';
import { formatGHS, formatDateTime, transferValue } from '../utils';
import { getErrorMessage } from '@/lib/utils/error-handler';
import { toast } from '@/lib/utils/toast';

function qtyLabel(qty: number | null, unit: string | null): string {
  if (qty === null) return '-';
  return `${qty}${unit ? ` ${unit}` : ''}`;
}

/** Keep linked quantities free of floating-point dust (12 - 0.1 - 0.2 etc). */
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
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
              Corrective transfer - view the disputed original
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
          value={transfer.source_location?.name ?? '-'}
          hint={transfer.source_location?.type === 'warehouse' ? 'Warehouse' : 'Branch'}
        />
        <MetaCard
          icon={<TruckIcon size={16} />}
          label="To"
          value={transfer.destination_location?.name ?? '-'}
          hint={transfer.destination_location?.type === 'warehouse' ? 'Warehouse' : 'Branch'}
        />
        <MetaCard
          icon={<UserIcon size={16} />}
          label={transfer.sent_by ? 'Sent by' : transfer.approved_by ? 'Approved by' : 'Created by'}
          value={transfer.sent_by ?? transfer.approved_by ?? transfer.created_by ?? '-'}
        />
        <MetaCard
          icon={<PackageIcon size={16} />}
          label="Value (sent)"
          value={value > 0 ? formatGHS(value) : '-'}
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
  const { can, staffUser } = useStaffAuth();

  const s = transfer.status;

  // `staffUser.id` is the EMPLOYEE id; documents record the USER id. Comparing
  // the wrong one silently matched the wrong person.
  const iSentThis = transfer.sent_by_id !== null && transfer.sent_by_id === staffUser?.user_id;

  // Each end accounts for its own side, and a transfer has two. Everything
  // OUTBOUND - submitting, approving, dispatching, calling it off - belongs to
  // the source; only receiving belongs to the destination. A branch manager
  // expecting a delivery from the mother kitchen must not be able to declare
  // that the mother kitchen shipped it. `undefined`/`null` = admin, who belongs
  // to no kitchen and may act at either end. The API enforces the same rules;
  // this stops the buttons being offered at all.
  const operating = staffUser?.operating_location_ids;
  const worksAt = (id: number | null | undefined) =>
    operating === null || operating === undefined
      ? true
      : id !== null && id !== undefined && operating.includes(id);

  const atSource = worksAt(transfer.source_location?.id);
  const atDestination = worksAt(transfer.destination_location?.id);

  // Each action needs the right status, the matching permission, AND the right
  // side of the movement.
  /*
   * A draft belongs to whoever raised it, wherever they work.
   *
   * The case: the warehouse manager brokering stock between two branches -
   * Ashaiman has a surplus, Test Branch needs it, and they are nearer each other
   * than either is to the mother kitchen. He raises it from Mother Kitchen, so
   * `atSource` is false, and he was locked out of his own draft the moment he
   * created it: no edit, no submit, no cancel, and nothing on screen saying why.
   *
   * Editing, submitting and cancelling move no stock, so the creator keeps them.
   * Approve and send stay with the source - those declare goods physically gone.
   */
  const mine = staffUser?.user_id != null && transfer.created_by_id === staffUser.user_id;
  const canManageDraft = s === 'draft' && can('inventory.transfer.create') && (atSource || mine);

  const canEdit    = canManageDraft;
  const canSubmit  = canManageDraft;
  const canApprove = s === 'submitted' && can('inventory.transfer.send') && atSource;
  const canSend    = s === 'approved' && can('inventory.transfer.send') && atSource;
  const canReceive =
    s === 'sent' && can('inventory.transfer.receive') && !iSentThis && atDestination;
  const canResolve = s === 'disputed' && can('inventory.transfer.resolve_dispute');

  /*
   * Who the ball is with, when it is not with the viewer. Dispatching belongs to
   * the source, so anyone who is not there simply waits - and needs telling,
   * rather than being shown an empty toolbar.
   */
  const sourceName = transfer.source_location?.name ?? 'the source location';
  const destName = transfer.destination_location?.name ?? 'the destination';
  const waitingOn =
    s === 'submitted' && !atSource
      ? { who: sourceName, what: 'approve it' }
      : s === 'approved' && !atSource
        ? { who: sourceName, what: 'send the goods' }
        : s === 'sent' && !atDestination
          ? { who: destName, what: 'receive the delivery' }
          : s === 'draft' && !canManageDraft
            ? { who: sourceName, what: 'submit it' }
            : null;
  const canCancel  =
    ['draft', 'submitted', 'approved'].includes(s) &&
    can('inventory.transfer.create') &&
    (atSource || (s === 'draft' && mine));

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

      {/* When the next move is somebody else's, say so. A screen with no
          buttons and no explanation reads as broken - which is exactly how the
          warehouse manager's branch-to-branch transfer looked to him. */}
      {waitingOn && (
        <p className="w-full text-neutral-gray text-xs font-body">
          Waiting on <span className="font-semibold text-text-dark">{waitingOn.who}</span> to{' '}
          {waitingOn.what}.
        </p>
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

  // Sending MORE than was asked for is allowed - the warehouse may round up to
  // a whole crate, or throw in a little extra. It is not a dispute; a dispute
  // is for a shortfall at the receiving end. But it should never pass silently,
  // because the branch is about to be charged for stock it did not ask for.
  const overs = transfer.lines
    .map((line) => ({ line, over: Number(getVal(line)) - Number(line.requested_qty) }))
    .filter(({ over }) => over > 0);

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
                    {Number(getVal(line)) > Number(line.requested_qty) && (
                      <p className="mt-1 text-right text-[11px] font-body text-amber-700">
                        +{+(Number(getVal(line)) - Number(line.requested_qty)).toFixed(2)} over
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {overs.length > 0 && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
            <WarningCircleIcon size={16} weight="fill" className="text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm font-body">
              <p className="text-amber-800 font-semibold">
                You&apos;re sending more than was requested on {overs.length} line
                {overs.length === 1 ? '' : 's'}.
              </p>
              <ul className="mt-0.5 text-amber-700 text-xs">
                {overs.map(({ line, over }) => (
                  <li key={line.id}>
                    {line.item?.name ?? `#${line.item_id}`}: asked {line.requested_qty}, sending{' '}
                    {getVal(line)} (+{+over.toFixed(2)})
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-amber-700 text-xs">
                That&apos;s fine - go ahead. The extra is recorded against the transfer so the
                difference is accounted for at the other end.
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
  const { data: reasonCatalog } = useWastageReasons();
  const [qty, setQty] = useState<Record<number, string>>({});
  const [refused, setRefused] = useState<Record<number, { qty: string; reason: string; note: string }>>({});
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const getVal = (line: InventoryTransferLine) =>
    qty[line.id] ?? String(line.sent_qty ?? 0);
  const getRefused = (line: InventoryTransferLine) => refused[line.id]?.qty ?? '';

  // Three quantities per line, and the difference between them is who ends up
  // carrying the loss:
  //   accepted - now the destination's to answer for
  //   refused  - going back on the lorry; still the sender's
  //   missing  - nobody can find it. Only this is a dispute.
  const totals = transfer.lines.reduce(
    (acc, line) => {
      const sent = line.sent_qty ?? 0;
      const accepted = Number(getVal(line)) || 0;
      const back = Number(getRefused(line)) || 0;
      acc.refused += back;
      acc.missing += Math.max(0, sent - accepted - back);
      acc.accepted += accepted;
      acc.sent += sent;
      return acc;
    },
    { accepted: 0, refused: 0, missing: 0, sent: 0 },
  );

  const isShort = totals.missing > 0;
  const hasRefusal = totals.refused > 0;
  const allRefused = hasRefusal && totals.accepted === 0 && totals.missing === 0;

  const setRefusal = (lineId: number, patch: Partial<{ qty: string; reason: string; note: string }>) =>
    setRefused((prev) => {
      const current = prev[lineId] ?? { qty: '', reason: '', note: '' };
      return { ...prev, [lineId]: { ...current, ...patch } };
    });

  /**
   * Accept and send-back are two halves of one delivery, so they move together:
   * typing 7 into send-back on a line of 12 makes accept 5 without being asked.
   *
   * Anything still left over after both is genuinely missing, and that is a
   * dispute - so the link is only applied when it does not silently invent an
   * answer. Typing into accept adjusts send-back the same way.
   */
  const setAcceptLinked = (line: InventoryTransferLine, value: string) => {
    setQty((p) => ({ ...p, [line.id]: value }));

    const sent = line.sent_qty ?? 0;
    const accepted = Number(value);
    if (value === '' || Number.isNaN(accepted)) return;

    const back = Number(getRefused(line)) || 0;
    // Only rebalance when the pair would otherwise over-account for the line.
    if (accepted + back > sent) {
      const remainder = Math.max(0, round4(sent - accepted));
      setRefusal(line.id, { qty: remainder === 0 ? '' : String(remainder) });
    }
  };

  const setRefusedLinked = (line: InventoryTransferLine, value: string) => {
    setRefusal(line.id, { qty: value });

    const sent = line.sent_qty ?? 0;
    const back = Number(value);
    if (value === '' || Number.isNaN(back)) return;
    if (back > sent) return;

    // Send back 7 of 12 and you are accepting 5. The operator can still type
    // over it if some of the rest never turned up.
    setQty((p) => ({ ...p, [line.id]: String(Math.max(0, round4(sent - back))) }));
  };

  const handleReceive = async () => {
    setErr(null);

    for (const line of transfer.lines) {
      const sent = line.sent_qty ?? 0;
      const accepted = Number(getVal(line));
      const back = Number(getRefused(line)) || 0;

      if (Number.isNaN(accepted) || accepted < 0 || back < 0) {
        setErr('Quantities must be zero or more.');
        return;
      }
      if (accepted + back > sent) {
        setErr(
          `More ${line.item?.name ?? 'stock'} accounted for than was sent: ${sent} sent, ${accepted} accepted plus ${back} refused.`,
        );
        return;
      }
      if (back > 0 && !refused[line.id]?.reason) {
        setErr(`Say what is wrong with the ${line.item?.name ?? 'stock'} you are sending back.`);
        return;
      }
      if (refused[line.id]?.reason === 'other' && !refused[line.id]?.note?.trim()) {
        setErr('Choosing “Other” means saying what happened - add a note.');
        return;
      }
    }

    const lines = transfer.lines.map((line) => {
      const back = Number(getRefused(line)) || 0;
      return {
        line_id: line.id,
        received_qty: Number(getVal(line)),
        ...(back > 0
          ? {
              refused_qty: back,
              refuse_reason: refused[line.id]?.reason as WastageReason,
              refuse_note: refused[line.id]?.note?.trim() || undefined,
            }
          : {}),
      };
    });

    try {
      await receive.mutateAsync({
        id: transfer.id,
        payload: {
          lines,
          dispute_reason: isShort || allRefused ? reason.trim() || undefined : undefined,
        },
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
          Anything you accept becomes yours to answer for; anything you refuse goes straight back to
          the sender. Whatever is left over is missing, and that raises a dispute.
        </p>

        <div className="border border-[#f0e8d8] rounded-xl overflow-hidden">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="text-left bg-neutral-light/60 text-[11px] font-semibold uppercase tracking-wider text-neutral-gray">
                <th className="px-4 py-2.5">Item</th>
                <th className="px-4 py-2.5 text-right">Sent</th>
                <th className="px-4 py-2.5 text-right w-32">Accept</th>
                <th className="px-4 py-2.5 text-right w-32">Send back</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0e8d8]">
              {transfer.lines.map((line) => {
                const sent = line.sent_qty ?? 0;
                const accepted = Number(getVal(line)) || 0;
                const back = Number(getRefused(line)) || 0;
                const missing = Math.max(0, sent - accepted - back);
                const needsNote = refused[line.id]?.reason === 'other';

                return (
                  <tr key={line.id} className="align-top">
                    <td className="px-4 py-3 text-text-dark">
                      {line.item?.name ?? `#${line.item_id}`}
                      {missing > 0 && (
                        <p className="text-amber-700 text-[11px] font-semibold mt-0.5">
                          {missing} unaccounted for
                        </p>
                      )}
                      {back > 0 && (
                        <div className="mt-2 space-y-1.5 max-w-64">
                          <Select
                            value={refused[line.id]?.reason ?? ''}
                            onChange={(e) => setRefusal(line.id, { reason: e.target.value })}
                            aria-label={`Reason for refusing ${line.item?.name ?? line.item_id}`}
                          >
                            <option value="">What is wrong with it?</option>
                            {(reasonCatalog?.reasons ?? []).map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </Select>
                          {needsNote && (
                            <TextInput
                              value={refused[line.id]?.note ?? ''}
                              onChange={(e) => setRefusal(line.id, { note: e.target.value })}
                              placeholder="Say what happened"
                              aria-label={`Note for refusing ${line.item?.name ?? line.item_id}`}
                            />
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-neutral-gray">
                      {qtyLabel(line.sent_qty, line.item?.unit ?? null)}
                    </td>
                    <td className="px-4 py-3">
                      <TextInput
                        type="number"
                        step="0.01"
                        min="0"
                        max={sent}
                        value={getVal(line)}
                        onChange={(e) => setAcceptLinked(line, e.target.value)}
                        className={missing > 0 ? 'border-amber-400 bg-amber-50/50' : ''}
                        aria-label={`Quantity accepted for ${line.item?.name ?? line.item_id}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <TextInput
                        type="number"
                        step="0.01"
                        min="0"
                        max={sent}
                        value={getRefused(line)}
                        onChange={(e) => setRefusedLinked(line, e.target.value)}
                        placeholder="0"
                        className={back > 0 ? 'border-rose-300 bg-rose-50/50' : ''}
                        aria-label={`Quantity refused for ${line.item?.name ?? line.item_id}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {hasRefusal && (
          <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-100 rounded-xl">
            <ArrowUUpLeftIcon size={15} weight="bold" className="text-rose-600 mt-0.5 shrink-0" />
            <p className="text-rose-800 text-sm font-body">
              <span className="font-semibold">
                {totals.refused} going back to {transfer.source_location?.name ?? 'the sender'}.
              </span>{' '}
              It never enters your stock, and a wastage claim is raised at their end for them to
              decide on - refusing at the door keeps the loss theirs.
            </p>
          </div>
        )}

        {isShort && (
          <div className="flex flex-col gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
            <p className="text-amber-900 text-sm font-semibold font-body flex items-center gap-1.5">
              <WarningCircleIcon size={15} weight="fill" />
              {totals.missing} unaccounted for - this raises a dispute
            </p>
            <FormField label="What is missing, and why?" htmlFor="tr-dispute-reason">
              <Textarea
                id="tr-dispute-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. 2 crates never came off the van"
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
          {allRefused
            ? 'Refuse whole delivery'
            : isShort
              ? 'Receive & raise dispute'
              : hasRefusal
                ? 'Receive & send the rest back'
                : 'Confirm receipt'}
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
  // Default to chasing the shortfall - writing it off is the deliberate choice.
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
    <InventoryModal isOpen={isOpen} onClose={onClose} title={`Resolve dispute - ${transfer.reference}`} size="md">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-sm text-neutral-gray font-body">
          Resolving closes this transfer. The original record is never altered.
        </p>

        {/* Chasing the shortfall is not always the right answer - sometimes the
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
        <FormField label="Resolution notes" htmlFor="tr-resolve-notes" hint="Optional - how the shortfall was reconciled.">
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

  // A transfer with no corrective history is a chain of one - nothing to show.
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
            {dispute.reason ?? 'Short receipt - received less than was sent.'}
          </p>
          <p className="text-rose-700/80 text-xs mt-2">
            Discrepancy: <span className="font-semibold tabular-nums">{dispute.discrepancy_qty}</span>
          </p>
          {dispute.resolution === 'written_off' && (
            <p className="text-rose-700/80 text-xs mt-1">
              Written off as a loss:{' '}
              <span className="font-semibold tabular-nums">{dispute.written_off_qty}</span> - no
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
            const refused = line.refused_qty ?? 0;
            // What nobody can account for: sent, not accepted, not sent back.
            // Only this is a genuine shortfall.
            const missing =
              line.received_qty !== null && line.sent_qty !== null
                ? Math.max(0, +(line.sent_qty - line.received_qty - refused).toFixed(4))
                : 0;
            const short = missing > 0;
            const lineValue = (line.sent_qty ?? 0) * (line.unit_cost_at_time ?? 0);
            return (
              <tr key={line.id} className="hover:bg-primary/5">
                <td className="px-5 py-3 text-text-dark">{line.item?.name ?? `#${line.item_id}`}</td>
                <td className="px-5 py-3 text-right tabular-nums text-text-dark">
                  {qtyLabel(line.requested_qty, unit)}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-text-dark">
                  {qtyLabel(line.sent_qty, unit)}
                  {/* Sending over is allowed, but it stays on the record - the
                      branch is receiving stock it did not ask for. */}
                  {line.sent_qty !== null && line.sent_qty > line.requested_qty && (
                    <span className="ml-1.5 text-[11px] font-semibold text-amber-700">
                      +{+(line.sent_qty - line.requested_qty).toFixed(2)}
                    </span>
                  )}
                </td>
                {/*
                  A number in red with no explanation is the thing to avoid: 12
                  sent and 5 received leaves 7 unaccounted for on the face of it,
                  when in fact they were refused at the door for a stated reason.
                  Both outcomes are spelled out here rather than left to be
                  inferred from a colour.
                */}
                <td className="px-5 py-3 text-right tabular-nums">
                  <span className={short ? 'text-amber-700 font-semibold' : 'text-text-dark'}>
                    {qtyLabel(line.received_qty, unit)}
                  </span>
                  {refused > 0 && (
                    <span
                      className="block text-[11px] font-semibold text-rose-700 mt-0.5"
                      title={
                        line.refuse_note
                          ? `${line.refuse_reason_label}: ${line.refuse_note}`
                          : (line.refuse_reason_label ?? 'Refused on delivery')
                      }
                    >
                      {refused} sent back
                      <span className="block font-normal text-neutral-gray">
                        {line.refuse_reason_label ?? 'refused'}
                      </span>
                    </span>
                  )}
                  {missing > 0 && (
                    <span className="block text-[11px] font-semibold text-amber-700 mt-0.5">
                      {missing} unaccounted for
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-neutral-gray">
                  {line.unit_cost_at_time !== null ? formatGHS(line.unit_cost_at_time) : '-'}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-text-dark font-semibold">
                  {lineValue > 0 ? formatGHS(lineValue) : '-'}
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
