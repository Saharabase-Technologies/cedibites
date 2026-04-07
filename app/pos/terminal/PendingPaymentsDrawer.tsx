'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  XIcon,
  SpinnerIcon,
  CurrencyDollarIcon,
  DeviceMobileIcon,
  ArrowClockwiseIcon,
  TrashIcon,
  HourglassIcon,
  CheckCircleIcon,
  CheckIcon,
  WarningCircleIcon,
  CreditCardIcon,
} from '@phosphor-icons/react';
import { formatGHS } from '@/lib/utils/currency';
import { toast } from '@/lib/utils/toast';
import { checkoutSessionService } from '@/lib/api/services/checkout-session.service';
import { usePosCheckoutSessions } from '@/lib/api/hooks/useCheckoutSession';
import type { CheckoutSession } from '@/types/api';
import { isValidGhanaPhone, normalizeGhanaPhone } from '@/app/lib/phone';
import type { Order } from '@/types/order';

interface PendingPaymentsDrawerProps {
  branchId: number;
  isOpen: boolean;
  onClose: () => void;
  /** Called when a pending session is confirmed (e.g. switched to cash). */
  onSessionConfirmed?: (session: CheckoutSession) => void;
}

/** Countdown timer for a single session's expiry. */
function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState(() => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  });

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setInterval(() => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      const secs = Math.max(0, Math.floor(diff / 1000));
      setRemaining(secs);
      if (secs <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, remaining]);

  if (remaining <= 0) return <span className="text-error text-xs font-medium">Expired</span>;

  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const isUrgent = remaining < 60;

  return (
    <span className={`text-xs font-medium tabular-nums ${isUrgent ? 'text-error' : 'text-neutral-gray'}`}>
      {m}:{s.toString().padStart(2, '0')}
    </span>
  );
}

/** A single pending session card. */
function SessionCard({
  session,
  onResend,
  onPayCash,
  onPayCard,
  onSwitchToMomo,
  onDelete,
}: {
  session: CheckoutSession;
  onResend: (token: string, phone?: string) => Promise<void>;
  onPayCash: (token: string, totalAmount: number) => Promise<void>;
  onPayCard: (token: string, totalAmount: number) => Promise<void>;
  onSwitchToMomo: (token: string, phone: string) => Promise<void>;
  onDelete: (token: string) => Promise<void>;
}) {
  const [isActing, setIsActing] = useState(false);
  const [showChangeNumber, setShowChangeNumber] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [resendCooldown, setResendCooldown] = useState(() => {
    // Initialize cooldown from backend last_momo_sent_at so it persists across drawer re-opens
    const lastSent = (session as any).last_momo_sent_at;
    if (!lastSent) return 0;
    const elapsed = Math.floor((Date.now() - new Date(lastSent).getTime()) / 1000);
    const remaining = 300 - elapsed; // 5 min cooldown
    return remaining > 0 ? remaining : 0;
  });
  const [confirmingAction, setConfirmingAction] = useState<'cash' | 'card' | 'momo' | null>(null);
  const [showMomoInput, setShowMomoInput] = useState(false);
  const [momoPhone, setMomoPhone] = useState(session.customer_phone ?? '');

  const itemsSummary = session.items
    .map(i => {
      const name = i.name ?? i.menu_item_snapshot?.name ?? 'Unknown Item';
      const optLabel = i.option_label ?? i.menu_item_option_snapshot?.option_label;
      return `${i.quantity}x ${name}${optLabel ? ` (${optLabel})` : ''}`;
    })
    .join(', ');

  const isExpired = session.status === 'expired';
  const isConfirmed = session.status === 'confirmed';
  const isFailed = session.status === 'failed';
  const isPending = session.status === 'pending' || session.status === 'payment_initiated';

  const handleAction = async (action: () => Promise<void>) => {
    setIsActing(true);
    try {
      await action();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Action failed. Please try again.';
      toast.error(message);
    } finally {
      setIsActing(false);
    }
  };

  // 3-minute cooldown after re-sending MoMo prompt
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResendWithCooldown = async (token: string, phone?: string) => {
    try {
      await onResend(token, phone);
      setResendCooldown(300); // 5 minutes — matches MoMo USSD prompt duration
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { cooldown_remaining?: number; message?: string } } };
      if (error?.response?.status === 429 && error?.response?.data?.cooldown_remaining) {
        setResendCooldown(error.response.data.cooldown_remaining);
        toast.error(error.response.data.message ?? 'Please wait before re-sending.');
      } else {
        throw err;
      }
    }
  };

  const handleResendWithNewNumber = async () => {
    if (!isValidGhanaPhone(newPhone)) {
      toast.error('Enter a valid Ghana phone number');
      return;
    }
    await handleAction(() => handleResendWithCooldown(session.session_token, normalizeGhanaPhone(newPhone)));
    setShowChangeNumber(false);
    setNewPhone('');
  };

  return (
    <div
      className={`rounded-2xl border p-4 transition-all duration-300 ${
        isConfirmed
          ? 'border-green-200 bg-green-50'
          : isFailed || isExpired
          ? 'border-error/20 bg-error/5 opacity-60'
          : 'border-neutral-gray/20 bg-white'
      }`}
    >
      {/* Top row: customer + status */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-text-dark text-sm truncate">
            {session.customer_name || 'Walk-in'}
          </p>
          {session.customer_phone && (
            <p className="text-xs text-neutral-gray">{session.customer_phone}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isPending && <CountdownTimer expiresAt={session.expires_at} />}
          {isConfirmed && <CheckCircleIcon className="w-5 h-5 text-green-600" weight="fill" />}
          {(isFailed || isExpired) && <WarningCircleIcon className="w-5 h-5 text-error" weight="fill" />}
        </div>
      </div>

      {/* Items summary */}
      <p className="text-xs text-neutral-gray line-clamp-2 mb-2">{itemsSummary}</p>

      {/* Total + method */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-primary text-sm">{formatGHS(session.total_amount)}</span>
        <span className="text-xs text-neutral-gray capitalize px-2 py-0.5 bg-neutral-gray/10 rounded-full">
          {(session.payment_method ?? 'unknown').replace('_', ' ')}
        </span>
      </div>

      {/* Status messages */}
      {isConfirmed && (
        <p className="text-xs text-green-700 font-medium mb-2">Payment confirmed — order created</p>
      )}
      {isExpired && (
        <p className="text-xs text-error font-medium mb-2">Payment timed out</p>
      )}
      {isFailed && (
        <p className="text-xs text-error font-medium mb-2">
          {session.failure_reason ?? 'Payment failed'}
        </p>
      )}

      {/* Actions (only for pending/payment_initiated sessions) */}
      {isPending && !isActing && (
        <>
          {/* Change number input (MoMo sessions - re-send to different number) */}
          {showChangeNumber && session.payment_method === 'mobile_money' && (
            <div className="flex gap-2 mb-2">
              <input
                type="tel"
                placeholder="New phone number"
                value={newPhone}
                onChange={e => setNewPhone(e.target.value)}
                className="flex-1 h-9 px-3 rounded-xl border border-neutral-gray/20 text-sm focus:border-primary/50 outline-none"
              />
              <button
                onClick={handleResendWithNewNumber}
                className="h-9 px-3 rounded-xl bg-primary text-brown text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                Send
              </button>
              <button
                onClick={() => { setShowChangeNumber(false); setNewPhone(''); }}
                className="h-9 px-3 rounded-xl bg-neutral-gray/10 text-neutral-gray text-xs hover:bg-neutral-gray/20 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* MoMo phone input (switching TO MoMo from cash/card) */}
          {showMomoInput && session.payment_method !== 'mobile_money' && (
            <div className="flex gap-2 mb-2">
              <input
                type="tel"
                placeholder="Customer MoMo number"
                value={momoPhone}
                onChange={e => setMomoPhone(e.target.value)}
                className="flex-1 h-9 px-3 rounded-xl border border-neutral-gray/20 text-sm focus:border-primary/50 outline-none"
              />
              <button
                onClick={() => {
                  if (!isValidGhanaPhone(momoPhone)) {
                    toast.error('Enter a valid Ghana phone number');
                    return;
                  }
                  handleAction(() => onSwitchToMomo(session.session_token, normalizeGhanaPhone(momoPhone)));
                  setShowMomoInput(false);
                }}
                className="h-9 px-3 rounded-xl bg-primary text-brown text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                Send
              </button>
              <button
                onClick={() => setShowMomoInput(false)}
                className="h-9 px-3 rounded-xl bg-neutral-gray/10 text-neutral-gray text-xs hover:bg-neutral-gray/20 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="flex gap-2">
            {/* === MoMo-specific: Re-send prompt & Change number === */}
            {session.payment_method === 'mobile_money' && (
              <>
                <button
                  onClick={() => handleAction(() => handleResendWithCooldown(session.session_token))}
                  disabled={resendCooldown > 0}
                  className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-medium transition-colors ${
                    resendCooldown > 0
                      ? 'bg-neutral-gray/5 text-neutral-gray/40 cursor-not-allowed opacity-50'
                      : 'bg-primary/10 text-primary hover:bg-primary/20'
                  }`}
                  title={resendCooldown > 0 ? `Wait ${Math.ceil(resendCooldown / 60)}m before re-sending` : 'Re-send MoMo prompt'}
                >
                  <ArrowClockwiseIcon className={`w-3.5 h-3.5 ${resendCooldown > 0 ? 'opacity-40' : ''}`} />
                  {resendCooldown > 0
                    ? `${Math.floor(resendCooldown / 60)}:${(resendCooldown % 60).toString().padStart(2, '0')}`
                    : 'Re-send'}
                </button>
                {!showChangeNumber && (
                  <button
                    onClick={() => setShowChangeNumber(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-neutral-gray/10 text-text-dark text-xs font-medium hover:bg-neutral-gray/20 transition-colors"
                    title="Change phone number & resend"
                  >
                    <DeviceMobileIcon className="w-3.5 h-3.5" />
                    Change #
                  </button>
                )}
              </>
            )}

            {/* === Switch to MoMo (only when NOT already MoMo) === */}
            {session.payment_method !== 'mobile_money' && !showMomoInput && (
              <button
                onClick={() => setShowMomoInput(true)}
                className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-yellow-50 text-yellow-700 text-xs font-medium hover:bg-yellow-100 transition-colors"
                title="Switch to MoMo payment"
              >
                <DeviceMobileIcon className="w-3.5 h-3.5" />
                MoMo
              </button>
            )}

            {/* === Switch to Cash (only when NOT already cash) === */}
            {session.payment_method !== 'cash' && (
              <>
                {confirmingAction === 'cash' ? (
                  <div className="flex-1 flex gap-1">
                    <button
                      onClick={() => {
                        handleAction(() => onPayCash(session.session_token, session.total_amount));
                        setConfirmingAction(null);
                      }}
                      className="flex-1 flex items-center justify-center w-10 h-10 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors"
                      title="Confirm cash payment"
                    >
                      <CheckIcon className="w-5 h-5" weight="bold" />
                    </button>
                    <button
                      onClick={() => setConfirmingAction(null)}
                      className="h-10 px-2 rounded-xl bg-neutral-gray/10 text-neutral-gray text-xs hover:bg-neutral-gray/20 transition-colors"
                    >
                      ?
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmingAction('cash')}
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors"
                    title="Switch to cash payment"
                  >
                    <CurrencyDollarIcon className="w-3.5 h-3.5" />
                    Cash
                  </button>
                )}
              </>
            )}

            {/* === Switch to Card (only when NOT already card) === */}
            {session.payment_method !== 'card' && (
              <>
                {confirmingAction === 'card' ? (
                  <div className="flex-1 flex gap-1">
                    <button
                      onClick={() => {
                        handleAction(() => onPayCard(session.session_token, session.total_amount));
                        setConfirmingAction(null);
                      }}
                      className="flex-1 flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      title="Confirm card payment"
                    >
                      <CheckIcon className="w-5 h-5" weight="bold" />
                    </button>
                    <button
                      onClick={() => setConfirmingAction(null)}
                      className="h-10 px-2 rounded-xl bg-neutral-gray/10 text-neutral-gray text-xs hover:bg-neutral-gray/20 transition-colors"
                    >
                      ?
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmingAction('card')}
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
                    title="Switch to card payment"
                  >
                    <CreditCardIcon className="w-3.5 h-3.5" />
                    Card
                  </button>
                )}
              </>
            )}

            {/* Delete */}
            <button
              onClick={() => handleAction(() => onDelete(session.session_token))}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-error/10 text-error hover:bg-error/20 transition-colors"
              title="Cancel this session"
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}

      {isActing && (
        <div className="flex items-center justify-center h-9">
          <SpinnerIcon className="w-4 h-4 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}

export default function PendingPaymentsDrawer({
  branchId,
  isOpen,
  onClose,
  onSessionConfirmed,
}: PendingPaymentsDrawerProps) {
  const { data, refetch } = usePosCheckoutSessions({ branch_id: branchId, status: 'pending,payment_initiated' });
  const sessions = data?.data ?? [];

  // Sort: payment_initiated first, then pending, then by created_at desc
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const statusOrder = { payment_initiated: 0, pending: 1 } as Record<string, number>;
      const aOrder = statusOrder[a.status] ?? 2;
      const bOrder = statusOrder[b.status] ?? 2;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [sessions]);

  const handleResend = async (token: string, phone?: string) => {
    if (phone) {
      await checkoutSessionService.posChangePayment(token, {
        payment_method: 'mobile_money',
        momo_number: phone,
      });
      toast.success('MoMo prompt re-sent to new number');
    } else {
      await checkoutSessionService.posRetryPayment(token);
      toast.success('MoMo prompt re-sent');
    }
    refetch();
  };

  const handlePayCash = async (token: string, totalAmount: number) => {
    const result = await checkoutSessionService.confirmCash(token, totalAmount);
    toast.success('Cash payment confirmed');
    onSessionConfirmed?.(result);
    refetch();
  };

  const handlePayCard = async (token: string, totalAmount: number) => {
    // Switch payment method to card first, then confirm
    await checkoutSessionService.posChangePayment(token, { payment_method: 'card' });
    const result = await checkoutSessionService.confirmCard(token, totalAmount);
    toast.success('Card payment confirmed');
    onSessionConfirmed?.(result);
    refetch();
  };


  const handleSwitchToMomo = async (token: string, phone: string) => {
    await checkoutSessionService.posChangePayment(token, {
      payment_method: 'mobile_money',
      momo_number: phone,
    });
    toast.success('MoMo prompt sent');
    refetch();
  };
  const handleDelete = async (token: string) => {
    await checkoutSessionService.posAbandon(token);
    toast.success('Session cancelled');
    refetch();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="shrink-0 px-5 py-4 border-b border-neutral-gray/20 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-dark">Pending Payments</h2>
            <p className="text-xs text-neutral-gray">
              {sortedSessions.length} session{sortedSessions.length !== 1 ? 's' : ''} awaiting payment
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-neutral-gray/10 flex items-center justify-center text-neutral-gray hover:bg-neutral-gray/20 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {sortedSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-16 text-neutral-gray">
              <HourglassIcon className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">No pending payments</p>
              <p className="text-xs mt-1">Payment sessions awaiting confirmation will appear here</p>
            </div>
          ) : (
            sortedSessions.map(session => (
              <SessionCard
                key={session.session_token}
                session={session}
                onResend={handleResend}
                onPayCash={handlePayCash}
                onPayCard={handlePayCard}
                onSwitchToMomo={handleSwitchToMomo}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
