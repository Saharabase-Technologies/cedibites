'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { XIcon, SpinnerIcon, ArrowClockwiseIcon } from '@phosphor-icons/react';
import { formatGHS } from '@/lib/utils/currency';
import { toast } from '@/lib/utils/toast';
import { serverNow } from '@/lib/utils/serverClock';
import { TONE } from '@/app/inventory/_components/status-tokens';
import {
  checkoutSessionService,
  type BranchCodePayment,
  type BranchCodePaymentCheck,
} from '@/lib/api/services/checkout-session.service';
import { useBranchCodePayments } from '@/lib/api/hooks/useCheckoutSession';

/*
 * The cashier rings a sale, often as cash, and the customer then pays by
 * dialling the branch code. This is where the cashier makes sure the money
 * arrived: today's payments as Hubtel confirms them, and a check of the
 * transaction ID on the customer's MoMo message.
 */

/** Hubtel stamps payments in UTC, which is Ghana's time all year. */
const ACCRA = 'Africa/Accra';

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: ACCRA });
}

function dayOf(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: ACCRA });
}

/** Today by the server's clock, so a till whose own clock is wrong cannot pass off an old payment. */
function isToday(iso: string): boolean {
  return dayOf(iso) === dayOf(serverNow().toISOString());
}

function fromNumber(lastFour: string | null): string {
  return lastFour ? `from a number ending ${lastFour}` : 'number not given';
}

/**
 * A notice on the till as each payment lands. The first answer after the
 * till opens is taken as already seen, so a reload does not replay the day.
 */
export function useMomoArrivals(branchId?: number): BranchCodePayment[] {
  const { data } = useBranchCodePayments(branchId);
  const known = useRef<Set<number> | null>(null);
  const payments = data?.data;

  useEffect(() => {
    if (!payments) return;

    if (known.current === null) {
      known.current = new Set(payments.map(p => p.id));
      return;
    }

    for (const p of payments) {
      if (known.current.has(p.id)) continue;
      known.current.add(p.id);
      toast.success(`MoMo received: ${formatGHS(p.amount)} ${fromNumber(p.payer_last_four)}`, { duration: 8000 });
    }
  }, [payments]);

  return payments ?? [];
}

interface MomoReceivedDrawerProps {
  branchId: number;
  branchName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function MomoReceivedDrawer({ branchId, branchName, isOpen, onClose }: MomoReceivedDrawerProps) {
  const { data, isError, refetch } = useBranchCodePayments(branchId);
  const payments = data?.data;

  const [transactionId, setTransactionId] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<BranchCodePaymentCheck | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  if (!isOpen) return null;

  const runCheck = async (e: FormEvent) => {
    e.preventDefault();
    if (!transactionId.trim() || checking) return;

    setChecking(true);
    setResult(null);
    setCheckError(null);
    try {
      const res = await checkoutSessionService.posCheckBranchCodePayment(branchId, transactionId);
      setResult(res.data);
    } catch (err) {
      setCheckError((err as { message?: string }).message || 'The check could not be made. Try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 motion-reduce:animate-none">
        <div className="shrink-0 px-5 py-4 border-b border-neutral-gray/20 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-dark">MoMo received</h2>
            <p className="text-xs text-neutral-gray">Paid by branch code{branchName ? ` at ${branchName}` : ''}</p>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-xl bg-neutral-gray/10 flex items-center justify-center text-neutral-gray hover:bg-neutral-gray/20 transition-colors"
            title="Close"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Check one payment */}
          <form onSubmit={runCheck} className="px-5 pt-5 pb-6 space-y-3">
            <label htmlFor="momo-transaction-id" className="block text-sm font-medium text-text-dark">
              Check a customer&apos;s payment
            </label>
            <div className="flex gap-2">
              <input
                id="momo-transaction-id"
                type="text"
                autoComplete="off"
                value={transactionId}
                onChange={e => { setTransactionId(e.target.value); setResult(null); setCheckError(null); }}
                placeholder="Transaction ID from their MoMo message"
                className="flex-1 min-w-0 min-h-11 px-4 rounded-xl text-base tabular-nums bg-neutral-light text-text-dark placeholder:text-neutral-gray/60 border border-neutral-gray/20 focus:border-primary/50 outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!transactionId.trim() || checking}
                className="min-h-11 px-5 rounded-xl font-semibold bg-primary text-brown hover:bg-primary-hover disabled:opacity-40 transition-colors flex items-center gap-2"
              >
                {checking && <SpinnerIcon className="w-4 h-4 animate-spin" />}
                Check
              </button>
            </div>

            {checkError && <p className="text-sm text-error">{checkError}</p>}
            {result && <CheckResult result={result} branchName={branchName} />}
          </form>

          {/* Today's list */}
          <div className="border-t border-neutral-gray/15 px-5 pt-4 pb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-text-dark">
                Today{payments && payments.length > 0 ? `, ${payments.length}` : ''}
              </h3>
              <button
                type="button"
                onClick={() => refetch()}
                className="min-h-11 px-3 -mr-3 rounded-xl text-sm font-medium text-neutral-gray hover:text-text-dark hover:bg-neutral-gray/10 transition-colors flex items-center gap-1.5"
              >
                <ArrowClockwiseIcon className="w-4 h-4" />
                Refresh
              </button>
            </div>

            {!payments && !isError && (
              <div className="py-8 flex justify-center">
                <SpinnerIcon className="w-5 h-5 animate-spin text-neutral-gray" />
              </div>
            )}

            {!payments && isError && (
              <p className="py-6 text-sm text-center text-error">
                The payments could not be loaded. Check the connection and press Refresh.
              </p>
            )}

            {payments?.length === 0 && (
              <p className="py-6 text-sm text-center text-neutral-gray">No branch code payment has come in today.</p>
            )}

            {payments && payments.length > 0 && (
              <ul className="divide-y divide-neutral-gray/15">
                {payments.map(p => (
                  <li key={p.id} className="py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-lg font-semibold text-text-dark tabular-nums">{formatGHS(p.amount)}</span>
                      <span className="text-sm text-neutral-gray tabular-nums">{timeOf(p.paid_at)}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-neutral-gray tabular-nums">
                      <span>{p.payer_last_four ? `Number ending ${p.payer_last_four}` : 'Number not given'}</span>
                      {p.network_transaction_id && <span>ID {p.network_transaction_id}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Hubtel's answer, worded for the counter. A warning sits under the answer
 * when the payment is not today's, was made to another branch, or has been
 * checked before, because each of those is how an old message gets reused.
 */
function CheckResult({ result, branchName }: { result: BranchCodePaymentCheck; branchName?: string }) {
  const paid = result.outcome === 'paid' || result.outcome === 'ours';

  const answer = (() => {
    switch (result.outcome) {
      case 'paid':
        return {
          tone: TONE.done,
          title: 'Paid',
          line: result.amount !== null && result.paid_at
            ? `${formatGHS(result.amount)} at ${timeOf(result.paid_at)}, ${fromNumber(result.payer_last_four)}.`
            : null,
        };
      case 'ours':
        return {
          tone: TONE.done,
          title: 'Paid',
          line: result.order_number
            ? `This is the MoMo prompt the till sent for order ${result.order_number}.`
            : 'This is a MoMo prompt the till sent.',
        };
      case 'not_paid':
        return { tone: TONE.problem, title: 'Not paid', line: 'Hubtel has this payment, but it did not go through.' };
      case 'not_found':
        return { tone: TONE.problem, title: 'Not found', line: 'Hubtel has no payment with this ID. Check it against the customer\'s message.' };
      default:
        return { tone: TONE.waiting, title: 'No answer', line: 'Hubtel did not answer. Try again in a moment.' };
    }
  })();

  const warnings: string[] = [];
  if (paid && result.paid_at && !isToday(result.paid_at)) {
    warnings.push(`This payment was made on ${dayOf(result.paid_at)}, not today.`);
  }
  if (paid && result.branch && branchName && result.branch !== branchName) {
    warnings.push(`It was paid to ${result.branch}, not this branch.`);
  }
  if (result.first_checked) {
    const { at, branch, by } = result.first_checked;
    const when = isToday(at) ? timeOf(at) : `${dayOf(at)} at ${timeOf(at)}`;
    warnings.push(`Already checked${branch ? ` at ${branch}` : ''}, ${when}${by ? ` by ${by}` : ''}.`);
  }

  return (
    <div className="space-y-2" role="status">
      <div className={`rounded-xl px-4 py-3 ${answer.tone.bg}`}>
        <p className={`text-base font-semibold ${answer.tone.text}`}>{answer.title}</p>
        {answer.line && <p className="mt-0.5 text-sm text-text-dark tabular-nums">{answer.line}</p>}
      </div>
      {warnings.map(w => (
        <p key={w} className={`rounded-xl px-4 py-2.5 text-sm font-medium ${TONE.problem.bg} ${TONE.problem.text}`}>{w}</p>
      ))}
    </div>
  );
}
