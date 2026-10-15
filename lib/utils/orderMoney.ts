import type { Order, OrderRound, OrderStatus, PaymentPart, PaymentState } from '@/types/order';

/** The money fields of an OrderResource, as the API sends them. */
interface ApiOrderMoney {
  paid_later?: boolean;
  kitchen_slip_printed_at?: string | null;
  owing_since?: string | null;
  rounds?: Array<{
    id: number;
    number: number;
    status: string;
    paid_later?: boolean;
    total: number | string;
    added_by_name?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    receipt_printed_at?: string | null;
    kitchen_slip_printed_at?: string | null;
  }>;
  balance_due?: number | string | null;
  payment_state?: PaymentState | null;
  payments?: Array<{
    id: number | string;
    payment_method: string;
    payment_status: string;
    amount: number | string;
    paid_at?: string | null;
    collected_by_name?: string | null;
    amount_tendered?: number | string | null;
  }>;
}

/**
 * The Pay later fields every adapter must carry (T8). Four places build an
 * Order, and a field added to one only fails silently on the others, so they
 * all take these from here.
 *
 * An older payload without the fields reads as an ordinary order: not Pay
 * later, nothing owed recorded, no parts.
 */
export function orderMoneyFields(api: unknown): Pick<Order, 'isPaidLater' | 'balanceDue' | 'paymentState' | 'paymentParts' | 'kitchenSlipPrintedAt' | 'owingSince' | 'rounds'> {
  const money = (api ?? {}) as ApiOrderMoney;
  const ms = (iso?: string | null) => (iso ? new Date(iso).getTime() : undefined);

  // Items added after the order was placed (Phase 4b). Carried here so every
  // adapter has them, like the money (T8).
  const rounds: OrderRound[] = (money.rounds ?? []).map(r => ({
    id: Number(r.id),
    number: Number(r.number),
    status: r.status as OrderStatus,
    paidLater: Boolean(r.paid_later),
    total: Number(r.total ?? 0),
    addedBy: r.added_by_name ?? undefined,
    addedAt: ms(r.created_at) ?? 0,
    stageChangedAt: ms(r.updated_at),
    receiptPrintedAt: ms(r.receipt_printed_at),
    kitchenSlipPrintedAt: ms(r.kitchen_slip_printed_at),
  }));

  const parts: PaymentPart[] = (money.payments ?? []).map(p => ({
    id: Number(p.id),
    method: p.payment_method as PaymentPart['method'],
    status: p.payment_status as PaymentPart['status'],
    amount: Number(p.amount ?? 0),
    paidAt: p.paid_at ? new Date(p.paid_at).getTime() : undefined,
    takenBy: p.collected_by_name ?? undefined,
    tendered: p.amount_tendered != null ? Number(p.amount_tendered) : undefined,
  }));

  return {
    isPaidLater: Boolean(money.paid_later),
    balanceDue: money.balance_due != null ? Number(money.balance_due) : undefined,
    paymentState: money.payment_state ?? undefined,
    paymentParts: parts,
    kitchenSlipPrintedAt: money.kitchen_slip_printed_at ? new Date(money.kitchen_slip_printed_at).getTime() : undefined,
    owingSince: ms(money.owing_since),
    rounds,
  };
}

/** Owes money: Not paid or Part paid. */
export function owesMoney(order: Pick<Order, 'paymentState' | 'balanceDue'>): boolean {
  if (order.paymentState) return order.paymentState !== 'paid';
  return (order.balanceDue ?? 0) > 0;
}
