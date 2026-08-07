'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  ArrowUUpLeftIcon,
  CheckCircleIcon,
  InfoIcon,
  MapPinIcon,
  ProhibitIcon,
  TagIcon,
  TruckIcon,
  UserIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import {
  InventoryModal,
  FormField,
  Textarea,
  TextInput,
  PrimaryButton,
  WastageStatusBadge,
  TransferStatusBadge,
} from '../../_components';
import {
  useWastage,
  useApproveWastage,
  useRejectWastage,
  useCancelWastage,
} from '@/lib/api/hooks/inventory/useWastages';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import type { InventoryWastage } from '@/types/inventory';
import { EvidencePanel } from './EvidencePanel';
import { getErrorMessage } from '@/lib/utils/error-handler';
import { toast } from '@/lib/utils/toast';
import { formatDateTime, formatGhs, formatQty } from '../utils';

export function WastageDetailPage({ id }: { id: number }) {
  const { data: wastage, isLoading, error } = useWastage(id);
  const { can, staffUser } = useStaffAuth();
  const [rejecting, setRejecting] = useState(false);
  /*
   * Approving opens a dialog rather than writing the whole claim off. Sending
   * the goods back is what buys the chance to LOOK at them, and looking has
   * three answers, not two: 20 kg comes back declared spoiled, 10 kg turns out
   * to be fine.
   *
   * MUST stay above the early returns below. This was briefly declared further
   * down, where the old handler function had been - a function is fine there, a
   * hook is not. The first render bailed at `isLoading` with two hooks and the
   * second ran three, so React threw and the page went white in production.
   * `react-hooks/rules-of-hooks` does not run in this repo, so nothing catches
   * it but review.
   */
  const [approving, setApproving] = useState(false);

  const approve = useApproveWastage();
  const cancel = useCancelWastage();

  if (isLoading) return <DetailSkeleton />;
  if (error || !wastage) return <DetailMissing />;

  // Separation of duties, mirrored from the server: the point of a second
  // signature is that a second pair of eyes saw the goods.
  const isRecorder = staffUser?.user_id != null && staffUser.user_id === wastage.recorded_by_id;
  const canDecide =
    wastage.status === 'pending_approval' && can('inventory.wastage.approve') && !isRecorder;
  // "Show me the food that has gone bad." Above the threshold there has to be
  // something to look at before anyone writes the stock off. Refusing stays
  // available without a photo - a claim with no evidence is what refusal is for.
  const blockedOnEvidence = wastage.evidence_required && wastage.photo_count === 0;
  const canWithdraw = isRecorder && (wastage.status === 'pending_return' || wastage.status === 'pending_approval');

  const handleWithdraw = async () => {
    try {
      await cancel.mutateAsync(wastage.id);
      toast.success('Withdrawn.');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-5xl mx-auto w-full">
      <Link
        href="/inventory/wastage"
        className="inline-flex items-center gap-1.5 text-neutral-gray hover:text-text-dark transition-colors text-sm font-body mb-4"
      >
        <ArrowLeftIcon size={14} weight="bold" />
        All wastage
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold font-brand text-text-dark">{wastage.reference}</h1>
            <WastageStatusBadge status={wastage.status} />
          </div>
          <p className="text-neutral-gray text-sm font-body mt-1">
            {wastage.origin_label} · {wastage.location?.name ?? '-'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canWithdraw && (
            <button
              type="button"
              onClick={handleWithdraw}
              disabled={cancel.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold font-body min-h-11 bg-neutral-light text-text-dark hover:bg-neutral-light/70 border border-[#f0e8d8] cursor-pointer disabled:opacity-50"
            >
              Withdraw
            </button>
          )}
          {canDecide && (
            <>
              <button
                type="button"
                onClick={() => setRejecting(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold font-body min-h-11 bg-neutral-light text-rose-700 hover:bg-rose-50 border border-[#f0e8d8] cursor-pointer"
              >
                <ProhibitIcon size={14} weight="bold" />
                Refuse claim
              </button>
              <button
                type="button"
                onClick={() => setApproving(true)}
                disabled={approve.isPending || blockedOnEvidence}
                title={
                  blockedOnEvidence
                    ? 'There is no photo of these goods - ask for one, or refuse the claim.'
                    : undefined
                }
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold font-body min-h-11 bg-primary text-white hover:bg-primary/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircleIcon size={14} weight="bold" />
                {approve.isPending ? 'Approving…' : 'Approve write-off'}
              </button>
            </>
          )}
        </div>
      </div>

      {approving && (
        <ApproveDialog
          wastage={wastage}
          isOpen={approving}
          onClose={() => setApproving(false)}
        />
      )}

      <StatusExplainer wastage={wastage} isRecorder={isRecorder} />

      {/* Meta */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <MetaCard
          icon={<MapPinIcon size={16} />}
          label="Loss belongs to"
          value={wastage.location?.name ?? '-'}
          hint={
            wastage.disposal_location && wastage.disposal_location.id !== wastage.location?.id
              ? `Written off at ${wastage.disposal_location.name}`
              : undefined
          }
        />
        <MetaCard
          icon={<TagIcon size={16} />}
          label="Value"
          value={formatGhs(wastage.total_value)}
          hint={
            wastage.threshold_amount !== null
              ? `Threshold ${formatGhs(wastage.threshold_amount)}`
              : undefined
          }
        />
        <MetaCard
          icon={<UserIcon size={16} />}
          label="Recorded by"
          value={wastage.recorded_by ?? '-'}
          hint={formatDateTime(wastage.recorded_at)}
        />
        <MetaCard
          icon={<CheckCircleIcon size={16} />}
          label={wastage.rejected_by ? 'Refused by' : 'Approved by'}
          value={wastage.rejected_by ?? wastage.approved_by ?? '-'}
          hint={formatDateTime(wastage.rejected_at ?? wastage.approved_at)}
        />
      </div>

      <EvidencePanel wastage={wastage} />

      {/* Return leg */}
      {wastage.return_transfer && (
        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5 mb-5">
          <div className="flex items-start gap-3">
            <TruckIcon size={20} weight="bold" className="text-neutral-gray shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold font-body text-text-dark mb-1">
                Goods returning to the warehouse
              </p>
              <p className="text-neutral-gray text-xs font-body mb-2">
                Goods claimed bad go back so the manager who supplied them can look at them. The
                claim cannot be approved until they arrive.
              </p>
              <Link
                href={`/inventory/transfers/${wastage.return_transfer.id}`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80"
              >
                {wastage.return_transfer.reference}
                <TransferStatusBadge status={wastage.return_transfer.status} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {wastage.rejection_reason && (
        <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 mb-5">
          <ProhibitIcon size={18} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-rose-800 text-sm font-semibold font-body">Claim refused</p>
            <p className="text-rose-700 text-sm font-body mt-0.5">{wastage.rejection_reason}</p>
          </div>
        </div>
      )}

      {wastage.notes && (
        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-4 mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-gray mb-1">
            Notes
          </p>
          <p className="text-text-dark text-sm font-body">{wastage.notes}</p>
        </div>
      )}

      {/* Lines */}
      <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#f0e8d8]">
          <h2 className="text-sm font-semibold font-body text-text-dark">
            Items <span className="text-neutral-gray font-normal">({wastage.lines.length})</span>
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="text-left bg-neutral-light/60 text-[11px] font-semibold uppercase tracking-wider text-neutral-gray">
                <th className="px-5 py-2.5">Item</th>
                <th className="px-5 py-2.5">Reason</th>
                <th className="px-5 py-2.5 text-right">Quantity</th>
                <th className="px-5 py-2.5 text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0e8d8]">
              {wastage.lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-5 py-3 text-text-dark">{line.item?.name ?? `#${line.item_id}`}</td>
                  <td className="px-5 py-3">
                    <span className="text-text-dark">{line.reason_label}</span>
                    {line.reason_note && (
                      <p className="text-neutral-gray text-xs mt-0.5">{line.reason_note}</p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-text-dark">
                    {formatQty(line.quantity)}
                    {line.item?.unit ? ` ${line.item.unit}` : ''}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-text-dark">
                    {formatGhs(line.line_value)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-neutral-light/40">
                <td colSpan={3} className="px-5 py-3 text-right text-neutral-gray text-xs font-semibold uppercase tracking-wider">
                  Total
                </td>
                <td className="px-5 py-3 text-right tabular-nums font-bold text-text-dark">
                  {formatGhs(wastage.total_value)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <RejectDialog
        wastage={wastage}
        isOpen={rejecting}
        onClose={() => setRejecting(false)}
      />
    </div>
  );
}

/**
 * Says plainly what this record did to the stock, and what happens next.
 *
 * Without this an operator reasonably assumes every wastage deducted something -
 * but a closing-variance or shortfall record deliberately posts nothing, because
 * the ledger already carried that loss. Getting this wrong is how people
 * conclude the books are double-counting.
 */
function StatusExplainer({ wastage, isRecorder }: { wastage: InventoryWastage; isRecorder: boolean }) {
  let tone = 'bg-neutral-light border-[#f0e8d8] text-neutral-gray';
  let icon = <InfoIcon size={18} weight="fill" className="text-neutral-gray shrink-0 mt-0.5" />;
  let message: React.ReactNode = null;

  if (!wastage.posts_stock) {
    message = (
      <>
        <span className="font-semibold">This record explains a loss; it did not cause one.</span>{' '}
        The stock was already taken off the books
        {wastage.origin === 'daily_closing'
          ? ' by the count adjustment when the day was closed.'
          : wastage.origin === 'reconciliation'
            ? ' by the stock-take adjustment when the cycle was posted.'
            : ' when the goods left the source and never arrived.'}{' '}
        Writing it off again would deduct the same goods twice.
      </>
    );
  } else if (wastage.status === 'pending_return') {
    tone = 'bg-sky-50 border-sky-200 text-sky-800';
    icon = <ArrowUUpLeftIcon size={18} weight="bold" className="text-sky-600 shrink-0 mt-0.5" />;
    message = (
      <>
        <span className="font-semibold">Nothing has been written off yet.</span>{' '}
        {isRecorder
          ? 'Send the goods back on the return transfer below. Once the warehouse signs for them, the manager decides.'
          : 'The goods are on their way back to the warehouse to be inspected.'}
      </>
    );
  } else if (wastage.status === 'pending_approval') {
    tone = 'bg-amber-50 border-amber-200 text-amber-800';
    icon = <WarningCircleIcon size={18} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />;
    message = (
      <>
        <span className="font-semibold">Waiting on a decision.</span> The stock stays on the books
        until this is approved.{' '}
        {isRecorder && 'You recorded this, so somebody else has to sign it off.'}
      </>
    );
  } else if (wastage.status === 'approved') {
    tone = 'bg-emerald-50 border-emerald-200 text-emerald-800';
    icon = <CheckCircleIcon size={18} weight="fill" className="text-emerald-600 shrink-0 mt-0.5" />;
    message = (
      <>
        <span className="font-semibold">Written off.</span> The stock has been deducted at{' '}
        {wastage.disposal_location?.name ?? wastage.location?.name ?? 'this location'}.
      </>
    );
  } else if (wastage.status === 'rejected') {
    tone = 'bg-rose-50 border-rose-200 text-rose-800';
    icon = <ProhibitIcon size={18} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />;
    message = (
      <>
        <span className="font-semibold">Nothing was written off.</span> The goods stay on the books
        where they are, and the loss stays with whoever declared it.
      </>
    );
  }

  if (!message) return null;

  return (
    <div className={`flex items-start gap-2.5 border rounded-2xl px-4 py-3 mb-5 ${tone}`}>
      {icon}
      <p className="text-sm font-body">{message}</p>
    </div>
  );
}

function RejectDialog({
  wastage,
  isOpen,
  onClose,
}: {
  wastage: InventoryWastage;
  isOpen: boolean;
  onClose: () => void;
}) {
  const reject = useRejectWastage();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!reason.trim()) {
      setError('Say why - a bare refusal tells the branch nothing.');
      return;
    }
    try {
      await reject.mutateAsync({ id: wastage.id, reason: reason.trim() });
      setReason('');
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  return (
    <InventoryModal isOpen={isOpen} onClose={onClose} title={`Refuse ${wastage.reference}`}>
      <div className="p-5 space-y-4">
        <p className="text-neutral-gray text-sm font-body">
          Nothing will be written off. The goods stay on the books where they are, and the loss
          stays with whoever declared it - it will surface at their next count as an unexplained
          shortfall.
        </p>
        <FormField label="Why are you refusing this?" htmlFor="wst-reject-reason">
          <Textarea
            id="wst-reject-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Inspected on arrival - the chicken is fine."
          />
        </FormField>
        {error && <p className="text-rose-700 text-sm font-body">{error}</p>}
      </div>
      <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#f0e8d8]">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold font-body min-h-11 text-neutral-gray hover:text-text-dark cursor-pointer"
        >
          Cancel
        </button>
        <PrimaryButton type="button" onClick={submit} loading={reject.isPending}>
          Refuse claim
        </PrimaryButton>
      </div>
    </InventoryModal>
  );
}

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

function DetailSkeleton() {
  return (
    <div className="p-6 pb-24 md:pb-6 max-w-5xl mx-auto w-full">
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
    <div className="p-6 pb-24 md:pb-6 max-w-5xl mx-auto w-full">
      <Link
        href="/inventory/wastage"
        className="inline-flex items-center gap-1.5 text-neutral-gray hover:text-text-dark transition-colors text-sm font-body mb-4"
      >
        <ArrowLeftIcon size={14} weight="bold" />
        All wastage
      </Link>
      <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl py-16 flex flex-col items-center text-center">
        <WarningCircleIcon size={40} weight="thin" className="text-neutral-gray/40 mb-3" />
        <p className="text-text-dark font-medium font-body">Wastage not found</p>
        <p className="text-neutral-gray text-sm font-body mt-1 max-w-sm">
          It may have been deleted or you may not have permission to view it.
        </p>
      </div>
    </div>
  );
}


// ─── Approve, in whole or in part ─────────────────────────────────────────────

/**
 * What the approver actually allows.
 *
 * Defaults to the full declared amount, so the common case is still one click.
 * The declared figure stays on screen beside the input: the point of the crate
 * coming back is to compare what was claimed against what is in front of you.
 */
function ApproveDialog({
  wastage,
  isOpen,
  onClose,
}: {
  wastage: InventoryWastage;
  isOpen: boolean;
  onClose: () => void;
}) {
  const approve = useApproveWastage();
  const [qty, setQty] = useState<Record<number, string>>(() =>
    Object.fromEntries(wastage.lines.map((l) => [l.id, String(l.quantity)])),
  );

  const allowed = (lineId: number, declared: number) => {
    const raw = Number(qty[lineId]);
    return Number.isFinite(raw) && raw >= 0 ? Math.min(raw, declared) : 0;
  };

  const total = wastage.lines.reduce(
    (sum, l) => sum + allowed(l.id, l.quantity) * (l.unit_cost ?? 0),
    0,
  );
  const nothingAllowed = wastage.lines.every((l) => allowed(l.id, l.quantity) <= 0);
  const partial = wastage.lines.some((l) => allowed(l.id, l.quantity) < l.quantity);

  const submit = async () => {
    try {
      await approve.mutateAsync({
        id: wastage.id,
        approvedQty: Object.fromEntries(
          wastage.lines.map((l) => [l.id, allowed(l.id, l.quantity)]),
        ),
      });
      toast.success(partial ? 'Approved in part.' : 'Written off.');
      onClose();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <InventoryModal isOpen={isOpen} onClose={onClose} title={`Approve ${wastage.reference}`} size="md">
      <div className="p-5 space-y-4">
        <p className="text-neutral-gray text-sm font-body">
          Write off only what is genuinely spoiled. Anything you leave out stays in stock where it
          is now.
        </p>

        <div className="flex flex-col gap-2.5">
          {wastage.lines.map((line) => (
            <div
              key={line.id}
              className="grid grid-cols-[1fr_auto] gap-3 items-center bg-neutral-light/40 border border-[#f0e8d8] rounded-xl p-3"
            >
              <div className="min-w-0">
                <p className="text-text-dark text-sm font-semibold font-body truncate">
                  {line.item?.name ?? 'Item'}
                </p>
                <p className="text-neutral-gray text-xs font-body">
                  Declared {formatQty(line.quantity)} {line.item?.unit ?? ''}
                </p>
              </div>
              <div className="relative w-32">
                <TextInput
                  type="number"
                  step="0.01"
                  min="0"
                  max={line.quantity}
                  value={qty[line.id] ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setQty((p) => ({ ...p, [line.id]: e.target.value }))
                  }
                  className="text-right pr-10"
                  aria-label={`Quantity to write off for ${line.item?.name ?? 'item'}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-gray pointer-events-none">
                  {line.item?.unit ?? ''}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-baseline justify-between border-t border-[#f0e8d8] pt-3">
          <span className="text-sm font-body text-neutral-gray">Writing off</span>
          <span className="tabular-nums text-lg font-bold text-text-dark">{formatGhs(total)}</span>
        </div>

        {nothingAllowed && (
          <p className="text-amber-800 text-xs font-body bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            You are allowing nothing, which is a refusal rather than an approval. Close this and
            refuse the claim, so the reason goes on the record.
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#f0e8d8]">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold font-body min-h-11 text-neutral-gray hover:text-text-dark cursor-pointer"
        >
          Cancel
        </button>
        <PrimaryButton type="button" onClick={submit} loading={approve.isPending} disabled={nothingAllowed}>
          {partial ? 'Approve what is spoiled' : 'Approve write-off'}
        </PrimaryButton>
      </div>
    </InventoryModal>
  );
}
