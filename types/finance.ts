/**
 * The Finance ledger. Mirrors `FinanceLedgerService::ledger` in the Laravel
 * API, the body of `GET /admin/finance/ledger`.
 *
 * The endpoint sends compact rows and the frontend works out every figure
 * from them (`lib/finance/figures.ts`). Sums arrive as plain numbers, and a
 * whole amount arrives as `195`, not `195.00`: the screen formats each one.
 */

/** What the ledger can be narrowed by. With no `from` or `to` it holds everything since the first sale. */
export interface FinanceLedgerFilters {
  /** First day, `YYYY-MM-DD`. */
  from?: string;
  /** Last day, `YYYY-MM-DD`. */
  to?: string;
  branch_id?: number;
  /** Several branches at once, for a partner with more than one. */
  branch_ids?: number[];
}

export interface FinanceBranch {
  id: number;
  name: string;
  /** The day of the branch's first paid order ever, `YYYY-MM-DD`. It ignores `from` and `to`. Null for a branch that never sold. */
  first_sale: string | null;
}

/**
 * Paid orders that were not cancelled, grouped by the day the order was
 * placed and by branch, source, type and payment method.
 *
 * `net` is `total_amount - delivery_fee - platform_commission`: the delivery
 * fee is never in it, and neither is what Bolt keeps of a Bolt order.
 * `platformCommission` came later, so an older payload has no twelfth value.
 */
export type FinanceSaleRow = [
  date: string,
  branchId: number,
  source: string,
  type: string,
  method: string,
  paidOrders: number,
  gross: number,
  discount: number,
  serviceCharge: number,
  net: number,
  deliveryFee: number,
  platformCommission?: number,
];

/**
 * What became of the money on an order cancelled after payment.
 *
 *   refunded   the customer got it back
 *   kept       the payment still stands
 *   no_charge  nothing was taken
 */
export type FinanceCancelOutcome = 'refunded' | 'kept' | 'no_charge';

/** An order cancelled after payment. None of these is in net sales. */
export interface FinanceCancelledOrder {
  order_number: string;
  /** `YYYY-MM-DD HH:mm`, as the server recorded it. */
  placed_at: string;
  cancelled_at: string | null;
  branch_id: number;
  source: string;
  type: string;
  method: string;
  outcome: FinanceCancelOutcome;
  /** `total_amount - delivery_fee`, the same sum as net sales. */
  amount: number;
  reason: string;
}

/**
 * Lines sold, grouped by month (`YYYY-MM`) and by branch, source, type,
 * payment method and option. A line sold with no option carries option id 0,
 * which has no entry in `options`.
 */
export type FinanceItemRow = [
  month: string,
  branchId: number,
  source: string,
  type: string,
  method: string,
  optionId: number,
  quantity: number,
  sales: number,
];

/** What a sold option is called today. A line is named from this through `receiptName()`, never by joining the two. */
export interface FinanceOption {
  /** The menu item's name. */
  item: string;
  /** The receipt name. Empty when the option has none. */
  display_name: string;
  /** The option's own label. */
  label: string;
  category: string;
}

export interface FinanceLedger {
  /** When the server read the figures, in UTC: `2026-10-14T00:14:03Z`. */
  read_at: string;
  /** The server's date, `YYYY-MM-DD`. Every "so far" and forecast counts from this, never from the machine's clock. */
  today: string;
  branches: FinanceBranch[];
  sales: FinanceSaleRow[];
  cancelled: FinanceCancelledOrder[];
  items: FinanceItemRow[];
  /** Keyed by the option id as a string, `"42"`. */
  options: Record<string, FinanceOption>;
}
