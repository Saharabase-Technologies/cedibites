'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowClockwiseIcon, CheckCircleIcon, SpinnerIcon } from '@phosphor-icons/react';
import { checkoutSessionService } from '@/lib/api/services/checkout-session.service';
import { formatGHS } from '@/lib/utils/currency';

/** How often the list asks again while it is open. */
const REFRESH_MS = 5000;

/**
 * Hubtel stamps a payment in UTC, which is Ghana's time all year. Shown in
 * Accra time whatever the till's own timezone setting says.
 */
function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Accra' });
}

function pesewas(amount: number): number {
  return Math.round(amount * 100);
}

interface BranchCodePaymentPickerProps {
  branchId: number;
  total: number;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

/**
 * Today's branch code payments at this branch that no sale has used, for the
 * cashier to pick the customer's.
 *
 * Only payments Hubtel has confirmed reach this list. One that is not this
 * sale's amount stays on it, so the cashier can see what the customer really
 * paid, but it cannot be picked. The server checks all of this again when the
 * sale goes in, including whether another till has just used the payment.
 */
export default function BranchCodePaymentPicker({ branchId, total, selectedId, onSelect }: BranchCodePaymentPickerProps) {
  const { data, isError, refetch } = useQuery({
    queryKey: ['pos-branch-code-payments', branchId],
    queryFn: () => checkoutSessionService.posBranchCodePayments(branchId),
    refetchInterval: REFRESH_MS,
  });
  const payments = data ? data.data ?? [] : null;
  const failed = isError;

  return (
    <div className="pt-2 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-neutral-gray">Paid by branch code today, not used yet</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="min-h-11 px-3 rounded-xl text-sm font-medium text-text-dark hover:bg-neutral-gray/10 transition-colors flex items-center gap-1.5"
        >
          <ArrowClockwiseIcon className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {payments === null && !failed && (
        <div className="py-6 flex justify-center">
          <SpinnerIcon className="w-5 h-5 animate-spin text-neutral-gray" />
        </div>
      )}

      {payments === null && failed && (
        <p className="py-4 text-sm text-center text-error">
          The payments could not be loaded. Check the connection and press Refresh.
        </p>
      )}

      {payments?.length === 0 && (
        <p className="py-4 text-sm text-center text-neutral-gray">
          No branch code payment has come in today. Ask to see the customer&apos;s MoMo message, then press Refresh.
        </p>
      )}

      {payments && payments.length > 0 && (
        <ul className="space-y-2">
          {payments.map(p => {
            const fits = pesewas(p.amount) === pesewas(total);
            const picked = selectedId === p.id;

            return (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={!fits}
                  aria-pressed={picked}
                  onClick={() => onSelect(picked ? null : p.id)}
                  className={`
                    w-full min-h-11 px-4 py-3 rounded-xl text-left border transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${picked
                      ? 'border-primary bg-primary/10'
                      : 'border-neutral-gray/20 bg-neutral-light enabled:hover:bg-neutral-gray/10'}
                  `}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-lg font-semibold text-text-dark tabular-nums">
                      {picked && <CheckCircleIcon weight="fill" className="w-5 h-5 text-primary" />}
                      {formatGHS(p.amount)}
                    </span>
                    <span className="text-sm text-neutral-gray tabular-nums">{timeOf(p.paid_at)}</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-neutral-gray tabular-nums">
                    <span>{p.payer_last_four ? `From a number ending ${p.payer_last_four}` : 'Number not given'}</span>
                    {p.network_transaction_id && <span>Transaction ID {p.network_transaction_id}</span>}
                  </div>
                  {!fits && <p className="mt-1 text-xs text-error">Not this sale&apos;s amount</p>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
