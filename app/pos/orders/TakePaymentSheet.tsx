'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { XIcon, SpinnerIcon, CheckCircleIcon, PrinterIcon } from '@phosphor-icons/react';
import { SegmentedTabs } from '@/app/inventory/_components';
import { TONE } from '@/app/inventory/_components/status-tokens';
import { formatGHS } from '@/lib/utils/currency';
import { toast } from '@/lib/utils/toast';
import apiClient from '@/lib/api/client';
import { formatGhanaPhone, isValidGhanaPhone, normalizeGhanaPhone } from '@/app/lib/phone';
import { orderService, type TakePaymentRequest } from '@/lib/api/services/order.service';
import { useTakePayment } from '@/lib/api/hooks/useOrders';
import { useBranchCodePayments } from '@/lib/api/hooks/useCheckoutSession';
import { mapApiOrderToOrder } from '@/lib/api/adapters/order.adapter';
import type { Order, PaymentPart } from '@/types/order';

/*
 * Take payment on an order that owes (D7): one part at a time, by cash, card,
 * a branch code payment, or a MoMo prompt to any number. Each part is the
 * money of whoever takes it (D9). When nothing is left, the paid receipt is
 * printed from here as the original (D6).
 */

type Method = 'cash' | 'card' | 'branch_code' | 'mobile_money';

const METHOD_TABS: { value: Method; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'branch_code', label: 'Branch code' },
  { value: 'mobile_money', label: 'MoMo prompt' },
];

const PART_LABEL: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  mobile_money: 'Mobile money',
  manual_momo: 'Direct MoMo',
};

/** Hubtel stamps payments in UTC, which is Ghana's time all year. */
function timeOf(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Accra' });
}

/** The amounts a cashier is most likely to be handed: what is owed, then the next round notes. */
function quickAmounts(owed: number): number[] {
  const steps = [owed, Math.ceil(owed / 10) * 10, Math.ceil(owed / 20) * 20, Math.ceil(owed / 50) * 50];
  return [...new Set(steps.map((n) => Math.round(n * 100) / 100))].filter((n) => n >= owed).slice(0, 4);
}

interface TakePaymentSheetProps {
  order: Order;
  branchId: number;
  onClose: () => void;
  /** Print the paid receipt as the original, two slips (D6). */
  onPrintOriginal: (order: Order) => void;
}

export default function TakePaymentSheet({ order, branchId, onClose, onPrintOriginal }: TakePaymentSheetProps) {
  // What this sheet last heard from the server. A part taken here and a
  // prompt's answer both come back with the whole order. `checkSeen` is the
  // check's update time when this was set, so an older check never wins.
  const [taken, setTaken] = useState<{ order: Order; checkSeen: number }>({ order, checkSeen: 0 });
  const [method, setMethod] = useState<Method>('cash');
  const [handedOver, setHandedOver] = useState('');
  const [amount, setAmount] = useState('');
  const [momoNumber, setMomoNumber] = useState('');
  const [momoName, setMomoName] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [askingHubtel, setAskingHubtel] = useState(false);
  const { mutateAsync: takePayment, isPending: taking } = useTakePayment();

  // A prompt waiting for the customer's PIN. Read every few seconds from our
  // own record, which Hubtel's callback updates (cheap, Hubtel not asked).
  const waiting = taken.order.paymentParts?.find((part) => part.status === 'pending');
  const check = useQuery({
    queryKey: ['order-part-check', order.id, waiting?.id],
    queryFn: () => orderService.checkPayment(Number(order.id), waiting!.id),
    enabled: !!waiting,
    refetchInterval: 4000,
  });

  const current = useMemo(() => {
    const checked = check.data?.data?.order;
    return checked && check.dataUpdatedAt > taken.checkSeen ? mapApiOrderToOrder(checked) : taken.order;
  }, [check.data, check.dataUpdatedAt, taken]);

  const owed = current.balanceDue ?? 0;
  const parts = current.paymentParts ?? [];
  const paid = current.paymentState === 'paid' || owed <= 0;

  const { data: branchCode } = useBranchCodePayments(branchId);
  const unspent = (branchCode?.data ?? []).filter((p) => !p.linked_order_number && p.amount <= owed + 0.004);

  const take = async (body: TakePaymentRequest, done: (change: number) => string) => {
    try {
      const res = await takePayment({ orderId: Number(order.id), body });
      setTaken({ order: mapApiOrderToOrder(res.data.order), checkSeen: check.dataUpdatedAt });
      setHandedOver('');
      setAmount('');
      toast.success(done(Number(res.data.change ?? 0)));
    } catch (err) {
      toast.error((err as { message?: string }).message || 'That did not go through. Try again.');
    }
  };

  const verifyMomo = async () => {
    setVerifying(true);
    setMomoName(null);
    try {
      const res = await apiClient.post('/pos/verify-momo', { momo_number: momoNumber }) as unknown as { isRegistered: boolean; name: string };
      if (res.isRegistered) setMomoName(res.name);
      else toast.error('That number is not registered on Mobile Money.');
    } catch {
      toast.error('Could not check the number. Try again.');
    } finally {
      setVerifying(false);
    }
  };

  const askHubtel = async (part: PaymentPart) => {
    setAskingHubtel(true);
    try {
      const res = await orderService.checkPayment(Number(order.id), part.id, true);
      setTaken({ order: mapApiOrderToOrder(res.data.order), checkSeen: check.dataUpdatedAt });
      if (res.data.payment_status === 'pending') toast.info('Hubtel has no answer for it yet.');
    } catch (err) {
      toast.error((err as { message?: string }).message || 'Hubtel did not answer. Try again in a moment.');
    } finally {
      setAskingHubtel(false);
    }
  };

  const cashIn = parseFloat(handedOver) || 0;
  const cardIn = parseFloat(amount) || owed;
  const promptIn = parseFloat(amount) || owed;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 motion-reduce:animate-none">
        <div className="shrink-0 px-5 py-4 border-b border-neutral-gray/20 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-text-dark">Take payment</h2>
            <p className="text-xs text-neutral-gray truncate">#{current.orderNumber} · {current.contact.name || 'Walk-in'}</p>
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
          {/* What is left */}
          <div className="px-5 py-6 text-center border-b border-neutral-gray/15">
            {paid ? (
              <>
                <p className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${TONE.done.bg} ${TONE.done.text}`}>Paid</p>
                <p className="mt-2 text-sm text-neutral-gray tabular-nums">{formatGHS(current.total - (current.deliveryFee ?? 0))} in</p>
              </>
            ) : (
              <>
                <p className="text-4xl font-bold text-primary tabular-nums">{formatGHS(owed)}</p>
                <p className="mt-1 text-sm text-neutral-gray">left to pay</p>
              </>
            )}
          </div>

          {/* The parts so far, in the order they came */}
          {parts.length > 0 && (
            <div className="px-5 pt-4 pb-2">
              <h3 className="text-sm font-medium text-text-dark mb-1">Paid so far</h3>
              <ul className="divide-y divide-neutral-gray/15">
                {parts.map((part) => (
                  <li key={part.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`text-sm ${part.status === 'failed' ? 'text-neutral-gray line-through' : 'text-text-dark'}`}>
                        {[PART_LABEL[part.method] ?? part.method, part.takenBy].filter(Boolean).join(', ')}
                      </p>
                      <p className="text-xs text-neutral-gray tabular-nums">
                        {part.status === 'pending'
                          ? 'Waiting for the customer\'s PIN'
                          : part.status === 'failed'
                            ? 'Declined'
                            : part.paidAt ? timeOf(part.paidAt) : ''}
                        {part.tendered != null ? ` · ${formatGHS(part.tendered)} handed over` : ''}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {part.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => void askHubtel(part)}
                          disabled={askingHubtel}
                          className="min-h-11 px-3 rounded-xl text-sm font-medium text-neutral-gray hover:text-text-dark hover:bg-neutral-gray/10 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                        >
                          {askingHubtel && <SpinnerIcon className="w-4 h-4 animate-spin" />}
                          Ask Hubtel
                        </button>
                      )}
                      <span className="text-sm font-semibold text-text-dark tabular-nums">{formatGHS(part.amount)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {paid ? (
            <div className="px-5 py-5">
              {(current.receiptPrintCount ?? 0) === 0 ? (
                <button
                  type="button"
                  onClick={() => onPrintOriginal(current)}
                  className="w-full min-h-12 rounded-xl font-semibold bg-primary text-brown hover:bg-primary-hover transition-colors flex items-center justify-center gap-2"
                >
                  <PrinterIcon className="w-5 h-5" weight="fill" />
                  Print receipt
                </button>
              ) : (
                <p className="text-sm text-center text-neutral-gray">The receipt has been printed. Reprints are on the Orders list.</p>
              )}
            </div>
          ) : (
            <div className="px-5 pt-4 pb-6 space-y-4">
              <SegmentedTabs value={method} onChange={setMethod} options={METHOD_TABS} />

              {method === 'cash' && (
                <div className="space-y-3">
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="Cash handed over"
                    value={handedOver}
                    onChange={(e) => setHandedOver(e.target.value)}
                    className="w-full min-h-14 px-4 rounded-xl text-center text-2xl font-semibold tabular-nums bg-neutral-light text-text-dark placeholder:text-neutral-gray/60 border border-neutral-gray/20 focus:border-primary/50 outline-none transition-colors"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    {quickAmounts(owed).map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setHandedOver(String(amt))}
                        className="flex-1 min-h-11 rounded-lg bg-neutral-gray/10 text-text-dark text-sm font-medium tabular-nums hover:bg-neutral-gray/20 transition-colors"
                      >
                        {formatGHS(amt)}
                      </button>
                    ))}
                  </div>
                  {cashIn > owed && (
                    <div className={`flex items-center justify-between py-3 px-4 rounded-xl ${TONE.done.bg}`}>
                      <span className={TONE.done.text}>Change</span>
                      <span className={`text-xl font-bold tabular-nums ${TONE.done.text}`}>{formatGHS(cashIn - owed)}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={cashIn <= 0 || taking}
                    onClick={() => void take(
                      { method: 'cash', handed_over: cashIn },
                      (change) => (change > 0 ? `Give ${formatGHS(change)} change.` : `${formatGHS(cashIn)} taken in cash.`),
                    )}
                    className="w-full min-h-12 rounded-xl font-semibold bg-primary text-brown hover:bg-primary-hover disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                  >
                    {taking && <SpinnerIcon className="w-5 h-5 animate-spin" />}
                    Take {formatGHS(Math.min(cashIn || 0, owed))}
                  </button>
                </div>
              )}

              {method === 'card' && (
                <div className="space-y-3">
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder={`Amount, up to ${formatGHS(owed)}`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full min-h-14 px-4 rounded-xl text-center text-2xl font-semibold tabular-nums bg-neutral-light text-text-dark placeholder:text-neutral-gray/60 placeholder:text-base border border-neutral-gray/20 focus:border-primary/50 outline-none transition-colors"
                  />
                  <button
                    type="button"
                    disabled={cardIn <= 0 || cardIn > owed + 0.004 || taking}
                    onClick={() => void take({ method: 'card', amount: cardIn }, () => `${formatGHS(cardIn)} taken on card.`)}
                    className="w-full min-h-12 rounded-xl font-semibold bg-primary text-brown hover:bg-primary-hover disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                  >
                    {taking && <SpinnerIcon className="w-5 h-5 animate-spin" />}
                    Take {formatGHS(cardIn)} on card
                  </button>
                </div>
              )}

              {method === 'branch_code' && (
                <div>
                  {unspent.length === 0 ? (
                    <p className="py-4 text-sm text-center text-neutral-gray">
                      No branch code payment of {formatGHS(owed)} or less has come in unused today.
                    </p>
                  ) : (
                    <ul className="divide-y divide-neutral-gray/15">
                      {unspent.map((p) => (
                        <li key={p.id} className="py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-base font-semibold text-text-dark tabular-nums">{formatGHS(p.amount)}</p>
                            <p className="text-xs text-neutral-gray tabular-nums truncate">
                              {[p.payer_name, p.payer_number && formatGhanaPhone(p.payer_number)].filter(Boolean).join(' · ') || 'Number not given'}
                              {' · '}{timeOf(new Date(p.paid_at).getTime())}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={taking}
                            onClick={() => void take({ method: 'branch_code', incoming_payment_id: p.id }, () => `${formatGHS(p.amount)} by branch code is on #${current.orderNumber}.`)}
                            className="shrink-0 min-h-11 px-4 rounded-xl text-sm font-semibold bg-primary text-brown hover:bg-primary-hover disabled:opacity-40 transition-colors"
                          >
                            Use
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {method === 'mobile_money' && (
                <div className="space-y-3">
                  <input
                    type="tel"
                    placeholder="MoMo number to send the prompt to"
                    value={momoNumber}
                    onChange={(e) => { setMomoNumber(e.target.value); setMomoName(null); }}
                    className="w-full min-h-12 px-4 rounded-xl text-center text-lg tabular-nums bg-neutral-light text-text-dark placeholder:text-neutral-gray/60 placeholder:text-sm border border-neutral-gray/20 focus:border-primary/50 outline-none transition-colors"
                  />
                  {momoName ? (
                    <p className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${TONE.done.bg} ${TONE.done.text}`}>
                      <CheckCircleIcon className="w-4 h-4 shrink-0" />
                      {momoName}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void verifyMomo()}
                      disabled={!isValidGhanaPhone(momoNumber) || verifying}
                      className="w-full min-h-11 rounded-xl text-sm font-medium bg-neutral-gray/10 text-text-dark hover:bg-neutral-gray/20 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                    >
                      {verifying && <SpinnerIcon className="w-4 h-4 animate-spin" />}
                      Verify number
                    </button>
                  )}
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder={`Amount, up to ${formatGHS(owed)}`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full min-h-12 px-4 rounded-xl text-center text-lg font-semibold tabular-nums bg-neutral-light text-text-dark placeholder:text-neutral-gray/60 placeholder:text-sm border border-neutral-gray/20 focus:border-primary/50 outline-none transition-colors"
                  />
                  <button
                    type="button"
                    disabled={!momoName || !!waiting || promptIn <= 0 || promptIn > owed + 0.004 || taking}
                    onClick={() => void take(
                      { method: 'mobile_money', amount: promptIn, momo_number: normalizeGhanaPhone(momoNumber) },
                      () => `Prompt sent for ${formatGHS(promptIn)}. The customer approves it with their PIN.`,
                    )}
                    className="w-full min-h-12 rounded-xl font-semibold bg-primary text-brown hover:bg-primary-hover disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                  >
                    {taking && <SpinnerIcon className="w-5 h-5 animate-spin" />}
                    {waiting ? 'A prompt is waiting' : `Send prompt for ${formatGHS(promptIn)}`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
