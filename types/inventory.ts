/**
 * types/inventory.ts — CediBites IMS
 *
 * Single source of truth for all Inventory Management System types.
 * Used by: IMS portal, admin portal (reports), manager portal, API services,
 * hooks, mock fixtures, and any future analytics that touches stock.
 *
 * Versioned alongside the backend API contracts. When a backend field changes,
 * update this file first, then propagate to services/components.
 */

// ─── Shared primitives ────────────────────────────────────────────────────────

export type LocationType = 'warehouse' | 'satellite';
export type StorageType = 'dry' | 'cold' | 'frozen' | 'ambient';
export type UnitDimension = 'mass' | 'volume' | 'count' | 'length';
export type MovementType =
  | 'purchase'
  | 'requisition_in'
  | 'requisition_out'
  | 'transfer_in'
  | 'transfer_out'
  | 'sales_deduction'
  | 'wastage'
  /** Posted when a daily count is completed — brings the ledger to the count. */
  | 'count_adjustment'
  | 'cycle_adjustment'
  | 'opening_balance'
  | 'return';
export type TransferStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'sent'
  | 'received'
  | 'disputed'
  /** The whole consignment refused at the door; stock went back to the source. */
  | 'rejected'
  | 'closed'
  | 'closed_disputed'
  | 'cancelled';
export type RequisitionStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  /**
   * The delivery arrived but was not all kept - the branch refused spoiled or
   * wrong goods at the door. Terminal, like `fulfilled`. Anything asking "was
   * this request served?" must treat both as served, or short deliveries
   * silently vanish from the count.
   */
  | 'fulfilled_short'
  | 'fulfilled'
  | 'rejected';
export type RequisitionPurpose = 'opening' | 'supplementary';
export type RequisitionSourceType = 'warehouse' | 'branch';
export type RecipeStatus = 'draft' | 'observation' | 'locked';
// WastageStatus / WastageReason / WastageOrigin live with the rest of the
// wastage contract at the foot of this file.

// ─── Catalog ─────────────────────────────────────────────────────────────────

export interface InventoryUnit {
  id: number;
  code: string;
  name: string;
  symbol: string;
  dimension: UnitDimension;
  is_base_unit: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryCategory {
  id: number;
  parent_id: number | null;
  parent?: Pick<InventoryCategory, 'id' | 'name'>;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  children?: InventoryCategory[];
  created_at: string;
  updated_at: string;
}

export interface InventorySupplier {
  id: number;
  code: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  payment_terms_days: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  category_id: number | null;
  category: Pick<InventoryCategory, 'id' | 'name' | 'slug'> | null;
  base_unit_id: number;
  base_unit: Pick<InventoryUnit, 'id' | 'name' | 'symbol'>;
  default_supplier_id: number | null;
  default_supplier: Pick<InventorySupplier, 'id' | 'name'> | null;
  storage_type: StorageType;
  is_consumable: boolean;
  expiry_tracked: boolean;
  reorder_level: number | null;
  min_threshold: number | null;
  /** Option A — label of the pack the item is bought in (e.g. "crate"). */
  purchase_pack_label: string | null;
  /** How many base units are in one pack (e.g. 30 pieces per crate). */
  purchase_pack_size: number | null;
  weighted_avg_cost: number;
  /** Total quantity on hand across all locations (summed balance cache). */
  stock_on_hand: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Locations ────────────────────────────────────────────────────────────────

export interface InventoryLocation {
  id: number;
  code: string;
  name: string;
  type: LocationType;
  branch_id: number | null;
  branch?: { id: number; name: string; area: string } | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Item movement history (supply ledger) ───────────────────────────────────

/** One append-only ledger row for an item, with the running balance after it. */
export interface ItemMovement {
  id: number;
  occurred_at: string | null;
  /** purchase | transfer_in | transfer_out | wastage | adjustment | consumption | … */
  movement_type: string;
  /** Signed: positive = stock in, negative = stock out. */
  quantity: number;
  balance_after: number;
  unit_cost_at_time: number | null;
  location: { id: number; name: string } | null;
  user: { id: number; name: string } | null;
  /** Source document — present for purchase receipts and order sales. */
  reference:
    | {
        type: 'purchase';
        purchase_id: number;
        purchase_reference: string;
        purchase_order: { id: number; reference: string } | null;
      }
    | {
        type: 'order';
        order_id: number;
        order_number: string;
      }
    | null;
}

export interface ItemMovementSupplier {
  id: number;
  name: string;
  code: string;
}

/** An open FEFO batch (expiry-tracked items). */
export interface ItemBatch {
  id: number;
  expiry_date: string | null;
  remaining_qty: number;
  received_qty: number;
  unit_cost: number;
  received_at: string | null;
}

/** Payload for the item detail drill-down. */
export interface ItemHistory {
  item: InventoryItem;
  suppliers: ItemMovementSupplier[];
  batches: ItemBatch[];
  movements: ItemMovement[];
}

// ─── Stock balances (denormalized cache) ─────────────────────────────────────

export interface InventoryStockBalance {
  id: number;
  item_id: number;
  item: Pick<InventoryItem, 'id' | 'sku' | 'name' | 'base_unit'>;
  location_id: number;
  location: Pick<InventoryLocation, 'id' | 'name' | 'type'>;
  quantity: number;
  unit: Pick<InventoryUnit, 'id' | 'symbol'>;
  updated_at: string;
}

// ─── Transfers ────────────────────────────────────────────────────────────────
//
// Lifecycle (backend TransferStatus enum / TransferService):
//   draft → submitted → approved → sent → received → closed
//                                       ↘ disputed → closed_disputed
//   (draft | submitted | approved) → cancelled
//
// Stock leaves the source at `sent` (transfer_out, FEFO) and arrives at the
// destination at `received` (transfer_in). A short receipt routes to `disputed`;
// the original is immutable and reconciled by a corrective transfer.
// Shape mirrors `App\Http\Resources\Inventory\TransferResource`.

export interface InventoryTransferLine {
  id: number;
  item_id: number;
  /** `unit` is the item's base-unit symbol (e.g. "kg"). */
  item: { id: number; name: string; unit: string | null } | null;
  requested_qty: number;
  /** Populated once the transfer is sent. */
  sent_qty: number | null;
  /** Accepted onto the destination's shelf. Populated once received. */
  received_qty: number | null;
  /**
   * Arrived and was turned away — returned to the sender on the spot.
   * Deliberately distinct from a shortfall: refused goods are accounted for and
   * back with the sender, whereas anything missing is what nobody can find.
   * Only the missing part is a dispute.
   */
  refused_qty: number | null;
  refuse_reason: WastageReason | null;
  refuse_reason_label: string | null;
  refuse_note: string | null;
  /** Weighted per-unit cost captured at send time (FEFO-allocated). */
  unit_cost_at_time: number | null;
}

export interface InventoryTransferDispute {
  id: number;
  status: 'open' | 'resolved' | string;
  /**
   * How it was settled. `corrective` chased the shortfall with another
   * transfer; `written_off` accepted it as a loss. Null on disputes resolved
   * before the distinction existed, or where there was no shortfall.
   */
  resolution: 'corrective' | 'written_off' | null;
  reason: string | null;
  discrepancy_qty: number;
  written_off_qty: number;
  /** The corrective draft transfer spawned on resolution, if any. */
  corrective_transfer_id: number | null;
}

/** One hop in a corrective chain. Returned oldest-first by the detail endpoint. */
export interface TransferLineageNode {
  id: number;
  reference: string;
  status: TransferStatus;
  parent_transfer_id: number | null;
  depth: number;
  is_current: boolean;
}

export interface InventoryTransfer {
  id: number;
  reference: string;
  status: TransferStatus;
  source_location: { id: number; name: string; type: LocationType } | null;
  destination_location: { id: number; name: string; type: LocationType } | null;
  /** Set when this transfer was spawned to correct a disputed parent. */
  parent_transfer_id: number | null;
  notes: string | null;
  lines: InventoryTransferLine[];
  dispute: InventoryTransferDispute | null;
  /** The whole corrective chain this transfer belongs to. Detail view only. */
  lineage?: TransferLineageNode[];
  /** Actor names (or null). The backend resource returns names, not objects. */
  created_by: string | null;
  /** Id as well as the name; a draft stays manageable by whoever raised it. */
  created_by_id: number | null;
  approved_by: string | null;
  sent_by: string | null;
  /** Id as well as the name; gates the receive action. */
  sent_by_id: number | null;
  received_by: string | null;
  rejected_by: string | null;
  reject_reason: string | null;
  reject_reason_code: WastageReason | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  /** Set when this transfer is the return leg of a wastage claim. */
  wastage: { id: number; reference: string; status: WastageStatus } | null;
  rejected_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  sent_at: string | null;
  received_at: string | null;
  cancelled_at: string | null;
  created_at: string | null;
}

export interface TransferLinePayload {
  item_id: number;
  requested_qty: number;
}

export interface CreateTransferPayload {
  source_location_id: number;
  destination_location_id: number;
  notes?: string;
  items: TransferLinePayload[];
}

export interface UpdateTransferPayload {
  notes?: string;
  items?: TransferLinePayload[];
}

export interface SubmitTransferPayload {
  /** Admin-only: bypass the source-stock check on a deficit. */
  override_source_check?: boolean;
}

export interface SendTransferPayload {
  /** Optional per-line sent-qty overrides; defaults to the requested qty. */
  lines?: { line_id: number; sent_qty: number }[];
}

export interface ReceiveTransferPayload {
  /**
   * Optional per line; defaults to accepting everything sent.
   *
   * `received_qty` is accepted onto the destination's shelf. `refused_qty`
   * arrived and is going straight back to the sender — it needs a reason, and
   * raises a wastage claim at their end. Whatever is left over
   * (sent − received − refused) never turned up, and only that is a dispute.
   */
  lines?: {
    line_id: number;
    received_qty: number;
    refused_qty?: number;
    refuse_reason?: WastageReason;
    refuse_note?: string;
  }[];
  dispute_reason?: string;
}

export interface CancelTransferPayload {
  reason: string;
}

export interface ResolveTransferDisputePayload {
  notes?: string;
  /**
   * Spawn a corrective transfer for the shortfall (default), or omit it and
   * accept the loss. The ledger is the same either way — the stock left the
   * source and never arrived — so this records the decision.
   */
  send_corrective?: boolean;
}

/** Pre-flight: can a location cover this demand right now? */
export interface StockAvailabilityLine {
  item_id: number;
  name: string;
  required: number;
  available: number;
  sufficient: boolean;
  shortfall: number;
}

export interface StockAvailability {
  sufficient: boolean;
  lines: StockAvailabilityLine[];
}

// ─── Requisitions ─────────────────────────────────────────────────────────────

// Lifecycle (backend RequisitionStatus enum / RequisitionService):
//   draft → submitted → approved → fulfilled
//                     ↘ rejected
// A branch requests stock from the warehouse; on approval a fulfilling transfer
// is spawned and the requisition flips to `fulfilled` once that transfer is
// received. Shape mirrors `App\Http\Resources\Inventory\RequisitionResource`.

export interface InventoryRequisitionLine {
  id: number;
  item_id: number;
  /** `unit` is the item's base-unit symbol (e.g. "kg"). */
  item: { id: number; name: string; unit: string | null } | null;
  requested_qty: number;
  /** Quantity granted at approval; null until then. */
  approved_qty: number | null;
}

export interface InventoryRequisition {
  id: number;
  reference: string;
  status: RequisitionStatus;
  requesting_location: { id: number; name: string; type: LocationType } | null;
  source_type: RequisitionSourceType;
  source_location: { id: number; name: string; type: LocationType } | null;
  purpose: RequisitionPurpose;
  notes: string | null;
  lines: InventoryRequisitionLine[];
  /** The transfer spawned on approval to fulfil this requisition. */
  fulfilling_transfer: { id: number; reference: string; status: TransferStatus } | null;
  /** Actor names (or null). The backend resource returns names, not objects. */
  requested_by: string | null;
  /** Id as well as the name — names are not unique, so "did I raise this?"
   *  must not be decided by string comparison. */
  requested_by_id: number | null;
  approved_by: string | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  fulfilled_at: string | null;
  created_at: string | null;
}

export interface RequisitionLinePayload {
  item_id: number;
  requested_qty: number;
}

export interface CreateRequisitionPayload {
  /**
   * Omit for a branch-scoped requester — the server resolves it from their own
   * branch. Required only for users who can see every location and could
   * therefore mean any branch.
   */
  requesting_location_id?: number;
  source_location_id: number;
  purpose?: RequisitionPurpose;
  notes?: string;
  items: RequisitionLinePayload[];
}

export interface UpdateRequisitionPayload {
  source_location_id?: number;
  purpose?: RequisitionPurpose;
  notes?: string;
  items?: RequisitionLinePayload[];
}

export interface ApproveRequisitionPayload {
  /** Optional per-line granted qty; defaults to the requested qty. 0 skips a line. */
  lines?: { line_id: number; approved_qty: number }[];
}

export interface RejectRequisitionPayload {
  reason: string;
}

export interface InventoryRequisitionFilters {
  search?: string;
  status?: RequisitionStatus;
  requesting_location_id?: number;
  source_location_id?: number;
  purpose?: RequisitionPurpose;
  page?: number;
  per_page?: number;
}

// Wastage lived here as a speculative scaffold shape (InventoryWastageEvent)
// that never matched the backend and was referenced by nothing. The real
// contract is at the foot of this file, next to the reason vocabulary.

// ─── Daily closing ────────────────────────────────────────────────────────────
//
// Mandatory end-of-day count. Opening a closing snapshots the expected quantity
// (ledger balance) per item held at the location; the operator enters counted
// quantities and completes it, locking in the variance (counted − expected).
// Dates with no closing are "missed" — surfaced by the calendar endpoint.
// Shape mirrors `App\Http\Resources\Inventory\DailyClosingResource`.

export type DailyClosingStatus = 'open' | 'completed';

export interface InventoryDailyClosingLine {
  id: number;
  item_id: number;
  item: { id: number; name: string; unit: string | null } | null;
  /**
   * NULL while the count is open — a blind count. Showing the ledger's
   * expectation next to the input turns counting into copying, so the API
   * withholds it (and the variance, which gives it away) until completion.
   */
  expected_qty: number | null;
  counted_qty: number | null;
  /** counted − expected; null until counted AND the closing is completed. */
  variance: number | null;
  /** Why the shortfall happened. Optional — a day must always be able to close. */
  reason: WastageReason | null;
  reason_label: string | null;
  reason_note: string | null;
  /** A count_adjustment movement was posted for this line at completion. */
  adjusted: boolean;
}

export interface InventoryDailyClosing {
  id: number;
  business_date: string; // YYYY-MM-DD
  status: DailyClosingStatus;
  location: { id: number; name: string; type: LocationType } | null;
  notes: string | null;
  lines: InventoryDailyClosingLine[];
  /** True while expected quantities and variances are withheld. */
  blind: boolean;
  /** Summary (present whenever lines are loaded — always, from index/show). */
  line_count: number;
  counted_count: number;
  /** Zero while blind — the counts are not revealed mid-count. */
  discrepancy_count: number;
  net_variance: number;
  /** The classification record raised for this count's explained shortfalls. */
  wastage: { id: number; reference: string; total_value: number } | null;
  opened_by: string | null;
  completed_by: string | null;
  completed_at: string | null;
  created_at: string | null;
}

export interface OpenDailyClosingPayload {
  location_id: number;
  business_date: string;
}

export interface SaveDailyClosingPayload {
  lines: {
    line_id: number;
    counted_qty: number;
    reason?: WastageReason | null;
    reason_note?: string | null;
  }[];
  complete?: boolean;
}

export interface InventoryDailyClosingFilters {
  location_id?: number;
  status?: DailyClosingStatus;
  date_from?: string;
  date_to?: string;
}

export interface DailyClosingCalendarDay {
  date: string;
  status: DailyClosingStatus | null;
  id: number | null;
}

/**
 * The coverage strip plus the server's view of which day the business is on.
 *
 * Before the 03:00 cutoff the business day is still yesterday's, so a branch
 * that trades late can count up after midnight and still be closing the day it
 * worked. The client must NOT compute this: `new Date()` is the device's clock
 * and timezone, and would disagree with the server around the boundary.
 */
export interface ClosingCalendar {
  business_date: string;
  days: DailyClosingCalendarDay[];
}

// ─── Recipes (BOMs) ──────────────────────────────────────────────────────────

export interface InventoryRecipeIngredient {
  id: number;
  item_id: number;
  item: Pick<InventoryItem, 'id' | 'sku' | 'name' | 'base_unit'>;
  quantity: number;
  unit: Pick<InventoryUnit, 'id' | 'symbol'>;
}

export interface InventoryRecipe {
  id: number;
  /** Recipe is keyed to a menu-item option (size/variant). */
  menu_item_option_id: number;
  menu_item_option: {
    id: number;
    label: string;
    menu_item: { id: number; name: string } | null;
  } | null;
  branch_id: number | null;
  branch: { id: number; name: string } | null;
  is_default: boolean;
  status: RecipeStatus;
  version: number;
  /** Portions this recipe yields; ingredient quantities are per yield_qty portions. */
  yield_qty: number;
  ingredients: InventoryRecipeIngredient[];
  locked_by: { id: number; name: string } | null;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecipeIngredientPayload {
  item_id: number;
  unit_id: number;
  quantity: number;
}

export interface CreateRecipePayload {
  menu_item_option_id: number;
  branch_id?: number | null;
  status?: RecipeStatus;
  yield_qty?: number;
  ingredients: RecipeIngredientPayload[];
}

export type UpdateRecipePayload = CreateRecipePayload;

// ─── Reconciliation ───────────────────────────────────────────────────────────
//
// The stock-take loop the IMS builds toward: "inventory is basically accounting —
// whatever comes in, whatever comes out must cancel out." A cycle opens with a
// system-qty snapshot, the operator counts everything, and posting writes a
// `cycle_adjustment` movement per non-zero variance (bringing the ledger to the
// counted actual) then closes — "the system is reset to zero, another cycle
// begins." Shape mirrors `App\Http\Resources\Inventory\ReconciliationCycleResource`.

export type ReconciliationStatus = 'open' | 'closed';

export interface InventoryReconciliationLine {
  id: number;
  item_id: number;
  item: { id: number; name: string; unit: string | null } | null;
  /** Ledger balance snapshotted at open (the "expected"). */
  system_qty: number;
  counted_qty: number | null;
  /** counted − system; null until counted. */
  variance: number | null;
  unit_cost: number | null;
  /** variance × unit_cost; the value of the discrepancy. */
  variance_value: number | null;
  /** Variance value exceeds the location threshold (the founder's red flag). */
  over_threshold: boolean;
  /** A cycle_adjustment movement was posted for this line. */
  adjusted: boolean;
}

export interface InventoryReconciliationCycle {
  id: number;
  status: ReconciliationStatus;
  location: { id: number; name: string; type: LocationType } | null;
  notes: string | null;
  /** Signed sum of posted variance values; set on posting. */
  net_variance_value: number | null;
  threshold_amount: number | null;
  lines: InventoryReconciliationLine[];
  line_count: number;
  counted_count: number;
  variance_line_count: number;
  over_threshold_count: number;
  opened_by: string | null;
  closed_by: string | null;
  opened_at: string | null;
  closed_at: string | null;
  created_at: string | null;
}

export interface OpenReconciliationPayload {
  location_id: number;
}

export interface SaveReconciliationPayload {
  lines: { line_id: number; counted_qty: number }[];
}

export interface PostReconciliationPayload {
  notes?: string;
}

export interface InventoryReconciliationFilters {
  location_id?: number;
  status?: ReconciliationStatus;
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export interface StockLedgerRow {
  item: Pick<InventoryItem, 'id' | 'sku' | 'name' | 'base_unit'>;
  opening: number;
  received: number;
  transfers_in: number;
  transfers_out: number;
  sales_bom: number;
  wastage: number;
  expected_closing: number;
  actual_closing: number;
  variance: number;
}

// ─── Dashboard (operational summary) ─────────────────────────────────────────

export interface InventoryDashboardStats {
  low_stock_count: number;
  pending_requisitions_count: number;
  pending_wastage_approvals_count: number;
  todays_transfers_count: number;
  todays_transfers_value: number;
  todays_wastage_value: number;
  wastage_threshold: number;
  unresolved_disputes_count: number;
  missed_closing_entries_count: number;
}

export interface InventoryDashboardAlert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  href?: string;
  action_label?: string;
  count?: number;
}

// ─── Filters ─────────────────────────────────────────────────────────────────

export interface InventoryItemFilters {
  search?: string;
  category_id?: number;
  storage_type?: StorageType;
  is_active?: boolean;
  /**
   * Sum `stock_on_hand` at one location instead of across everything the
   * caller can see. Ignored when outside their scope.
   */
  location_id?: number;
  /**
   * Only items the caller actually holds. Off by default so pickers keep the
   * full catalog — a branch has to be able to request what it does not have.
   */
  in_stock_only?: boolean;
  page?: number;
  per_page?: number;
}

export interface InventoryLocationFilters {
  type?: LocationType;
  is_active?: boolean;
}

export interface InventoryTransferFilters {
  search?: string;
  status?: TransferStatus;
  source_location_id?: number;
  destination_location_id?: number;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}

// ─── Mutation payloads ───────────────────────────────────────────────────────

export interface CreateInventoryItemPayload {
  /** Assigned server-side (sequential ITM-000001); do not send from the client. */
  sku?: string;
  name: string;
  description?: string;
  category_id?: number;
  base_unit_id: number;
  default_supplier_id?: number;
  storage_type: StorageType;
  is_consumable?: boolean;
  expiry_tracked?: boolean;
  reorder_level?: number;
  min_threshold?: number;
  /** Option A — buy-in-packs-of. Send label + size together, or neither. */
  purchase_pack_label?: string | null;
  purchase_pack_size?: number | null;
}

export interface UpdateInventoryItemPayload extends Partial<CreateInventoryItemPayload> {}

/** Mother-kitchen consumption — posts negative `production` movements. */
export interface RecordConsumptionPayload {
  location_id: number;
  occurred_at: string;
  items: { item_id: number; quantity: number }[];
}

// ─── Production runs (batch-prep: consume inputs → yield prepared item) ────────

export interface ProductionLogInput {
  id: number;
  item_id: number;
  item: { id: number; name: string; unit: string | null } | null;
  quantity: number;
  line_cost: number;
}

export interface ProductionLog {
  id: number;
  reference: string;
  location: { id: number; name: string } | null;
  output_item: { id: number; sku: string; name: string; unit: string | null } | null;
  output_qty: number;
  output_unit_cost: number;
  input_cost_total: number;
  inputs: ProductionLogInput[];
  produced_by: { id: number; name: string } | null;
  produced_at: string | null;
  created_at: string;
}

export interface RecordProductionPayload {
  location_id: number;
  output_item_id: number;
  output_unit_id?: number;
  output_qty: number;
  expiry_date?: string;
  notes?: string;
  occurred_at?: string;
  inputs: { item_id: number; quantity: number }[];
}

export interface CreateInventoryLocationPayload {
  /** Assigned server-side (SK-001 / WH-001); do not send from the client. */
  code?: string;
  name: string;
  type: LocationType;
  branch_id?: number;
  address?: string;
}

export interface CreateInventorySupplierPayload {
  code: string;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  payment_terms_days?: number;
  notes?: string;
}

export interface CreateInventoryCategoryPayload {
  parent_id?: number;
  name: string;
  sort_order?: number;
}

export interface CreateInventoryUnitPayload {
  code: string;
  name: string;
  symbol: string;
  dimension: UnitDimension;
  is_base_unit?: boolean;
}

// ─── IMS Settings & Staff ─────────────────────────────────────────────────────

export type ImsRole = 'warehouse_manager' | 'purchasing_clerk';

export interface InventorySettings {
  id: number;
  location_id: number | null;
  wastage_threshold_amount: number;
  updated_at: string;
}

export interface ImsStaffAssignment {
  id: number;
  user_id: number;
  name: string;
  email: string;
  phone: string | null;
  ims_role: ImsRole;
  assigned_at: string;
}

export interface UpdateInventorySettingsPayload {
  wastage_threshold_amount: number;
}

export interface AssignImsRolePayload {
  user_id: number;
  role: ImsRole;
}

// ─── Purchase Orders ─────────────────────────────────────────────────────────
//
// Locked decisions (see docs/JOURNAL.md, 2026-05-05):
//   • Strict mode: every Purchase MUST tie to a PO.
//   • Single override: `urgent_buy=true` on a Purchase lets PurchasingClerk
//     record an ad-hoc receipt without a PO. Reason required. Flagged in reports.
//   • Only WarehouseManager creates POs. Clerk only executes (records purchases).
//   • Approval threshold (default ₵10,000): POs above this need Admin approval
//     before status can move from `draft → sent`.
//   • Status machine: draft → sent → partially_received → received → closed
//     plus `cancelled` from any pre-receipt state with required reason.

export type PurchaseOrderStatus =
  | 'draft'
  | 'pending_approval'
  | 'sent'
  | 'partially_received'
  | 'received'
  | 'closed'
  | 'cancelled';

export interface PurchaseOrderItem {
  id: number;
  item_id: number;
  item: Pick<InventoryItem, 'id' | 'sku' | 'name' | 'base_unit'>;
  ordered_qty: number;
  received_qty: number;
  unit: Pick<InventoryUnit, 'id' | 'symbol'>;
  estimated_unit_cost: number;
  line_total: number;
}

export interface PurchaseOrder {
  id: number;
  reference: string;
  /** Unguessable anti-forgery code rendered as a QR signature on the PO document. */
  verification_code: string;
  supplier_id: number;
  supplier: Pick<InventorySupplier, 'id' | 'code' | 'name' | 'phone'>;
  destination_location_id: number;
  destination_location: Pick<InventoryLocation, 'id' | 'code' | 'name' | 'type'>;
  status: PurchaseOrderStatus;
  requires_approval: boolean;
  expected_delivery_date: string | null;
  notes: string | null;
  cancel_reason: string | null;
  created_by_id: number;
  created_by: { id: number; name: string };
  approved_by_id: number | null;
  approved_by: { id: number; name: string } | null;
  approved_at: string | null;
  cancelled_by_id: number | null;
  cancelled_by: { id: number; name: string } | null;
  cancelled_at: string | null;
  items: PurchaseOrderItem[];
  estimated_total: number;
  actual_total: number;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderItemPayload {
  item_id: number;
  ordered_qty: number;
  estimated_unit_cost: number;
}

export interface CreatePurchaseOrderPayload {
  supplier_id: number;
  destination_location_id: number;
  expected_delivery_date?: string;
  notes?: string;
  items: PurchaseOrderItemPayload[];
}

export interface UpdatePurchaseOrderPayload extends Partial<CreatePurchaseOrderPayload> {}

export interface ApprovePurchaseOrderPayload {
  notes?: string;
}

export interface CancelPurchaseOrderPayload {
  reason: string;
}

export interface PurchaseOrderFilters {
  search?: string;
  status?: PurchaseOrderStatus;
  supplier_id?: number;
  destination_location_id?: number;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}

// ─── Purchases (actual receipts) ─────────────────────────────────────────────

export interface PurchaseItem {
  id: number;
  item_id: number;
  item: Pick<InventoryItem, 'id' | 'sku' | 'name' | 'base_unit'>;
  purchase_order_item_id: number | null;
  /** Expected qty for this receipt (snapshot of the PO line's outstanding amount at receipt time). Null for urgent buys with no PO. */
  ordered_qty: number | null;
  received_qty: number;
  /** received_qty − ordered_qty; computed server-side. Positive = surplus, negative = deficit. Null when ordered_qty is null. */
  variance: number | null;
  /** Operator's explanation when received ≠ ordered (covers both qty and cost deviations). */
  variance_reason: string | null;
  unit: Pick<InventoryUnit, 'id' | 'symbol'>;
  /** PO line's estimated unit cost snapshot. Null for urgent buys with no PO. */
  expected_unit_cost: number | null;
  /** unit_cost_paid − expected_unit_cost. Positive = overpaid, negative = underpaid. Null when no expected cost. */
  cost_variance: number | null;
  unit_cost_paid: number;
  line_total: number;
}

export interface Purchase {
  id: number;
  reference: string;
  purchase_order_id: number | null;
  purchase_order: Pick<PurchaseOrder, 'id' | 'reference'> | null;
  supplier_id: number;
  supplier: Pick<InventorySupplier, 'id' | 'code' | 'name'>;
  /** Free-text vendor name for urgent/market buys when the exact vendor isn't a listed supplier. */
  supplier_name: string | null;
  destination_location_id: number;
  destination_location: Pick<InventoryLocation, 'id' | 'name'>;
  is_urgent_buy: boolean;
  urgent_buy_reason: string | null;
  invoice_number: string | null;
  notes: string | null;
  recorded_by_id: number;
  recorded_by: { id: number; name: string };
  items: PurchaseItem[];
  total_paid: number;
  received_at: string;
  created_at: string;
}

export interface RecordPurchaseItemPayload {
  item_id: number;
  purchase_order_item_id?: number;
  /** Expected qty for this receipt — the PO line's outstanding amount. Omitted for urgent buys. */
  ordered_qty?: number;
  received_qty: number;
  /** PO line's estimated unit cost, so the backend can record cost variance. Omitted for urgent buys. */
  expected_unit_cost?: number;
  /** Explanation for any deviation (qty or cost). */
  variance_reason?: string;
  unit_cost_paid: number;
  /** Expiry date (YYYY-MM-DD) for expiry-tracked items — creates a FEFO batch. */
  expiry_date?: string;
}

export interface RecordPurchasePayload {
  purchase_order_id?: number;
  supplier_id: number;
  /** Optional free-text vendor name for urgent/market buys. */
  supplier_name?: string;
  destination_location_id: number;
  is_urgent_buy?: boolean;
  urgent_buy_reason?: string;
  invoice_number?: string;
  notes?: string;
  received_at: string;
  items: RecordPurchaseItemPayload[];
}

export interface PurchaseFilters {
  search?: string;
  supplier_id?: number;
  is_urgent_buy?: boolean;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
}

// ─── Wastage ──────────────────────────────────────────────────────────────────
//
// The named half of every loss. Stock that leaves without being sold goes out
// one of two doors: this one, where somebody says what happened, or the variance
// door, where nobody knows.
//
// TWO RULES the UI has to respect, both mirrored from the backend:
//
//  1. ONE MOVEMENT PER LOSS. A wastage either moves the stock (`posts_stock`) or
//     labels a loss the ledger already carried — a closing variance, a stock-take
//     variance, a transfer shortfall. Never both, or the same spoiled chicken is
//     written off twice. Screens must say which they are looking at.
//
//  2. APPROVAL NEVER GATES THE LEDGER. Signing off decides classification and who
//     carries the cost, not whether stock moves. That is what lets a branch close
//     its day neutral tonight without waiting on the warehouse manager.
//
// Shape mirrors `App\Http\Resources\Inventory\WastageResource`.

export type WastageReason =
  | 'spoiled'
  | 'expired'
  | 'burnt'
  | 'damaged_in_transit'
  | 'damaged_in_storage'
  | 'spillage'
  | 'breakage'
  | 'contamination'
  | 'pest_damage'
  | 'preparation_loss'
  | 'customer_return'
  | 'theft'
  | 'count_error'
  /** Stamped by the system when a disputed shortfall is written off. */
  | 'transfer_shortfall'
  /** Requires a note — that is the whole point of it. */
  | 'other';

export type WastageStatus =
  /** Over threshold at a branch: the goods must physically go back first. */
  | 'pending_return'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type WastageOrigin =
  | 'manual'
  | 'delivery_rejection'
  | 'daily_closing'
  | 'reconciliation'
  | 'transfer_shortfall';

export interface WastageReasonOption {
  value: WastageReason;
  label: string;
  requires_note: boolean;
}

export interface WastageReasonCatalog {
  /** GHS. Measured on the value of the goods declared, per declaration. */
  threshold: number;
  reasons: WastageReasonOption[];
}

export interface InventoryWastageLine {
  id: number;
  item_id: number;
  item: { id: number; name: string; unit: string | null } | null;
  quantity: number;
  unit_cost: number | null;
  line_value: number;
  reason: WastageReason;
  reason_label: string;
  reason_note: string | null;
  /** A `wastage` movement was written for this line. False on classifications. */
  posted: boolean;
}

/**
 * Photo evidence — "show me the food that has gone bad".
 *
 * `stage` is what makes it evidence rather than decoration and is derived
 * server-side, never sent by the client:
 *   declared   — the claimant's photos, taken when the loss was raised.
 *   inspection — the approver's, taken with the returned goods in front of them.
 *
 * Both sides stay on the record permanently and both are visible to both ends.
 */
export interface InventoryWastagePhoto {
  id: number;
  stage: 'declared' | 'inspection';
  /**
   * The ORIGINAL, exactly as the phone sent it. This is the evidence, and what
   * "view full size" opens. Do not use it to draw a thumbnail - a claim's grid
   * of six originals measured ~14 MB on production.
   */
  url: string;
  /** ~400px, for the grid. Falls back to `url` server-side. */
  thumb_url: string;
  /** ~1600px, for the lightbox. Falls back to `url` server-side. */
  display_url: string;
  /**
   * A phone can send a clip as well as a still, so the gallery has to know
   * whether to render <img> or <video>. Derived server-side from the SNIFFED
   * mime type — never from the file extension, which a phone is free to lie
   * about.
   */
  kind: 'image' | 'video';
  mime_type: string | null;
  size_bytes: number | null;
  caption: string | null;
  uploaded_by: string | null;
  uploaded_by_id: number | null;
  uploaded_at: string | null;
}

export interface InventoryWastage {
  id: number;
  reference: string; // WST-YYMMDD-NNN
  status: WastageStatus;
  status_label: string;
  origin: WastageOrigin;
  origin_label: string;
  /** Whether approving this record deducts stock, or merely names a known loss. */
  posts_stock: boolean;
  /** Where the loss originated and who answers for it. */
  location: { id: number; name: string; type: LocationType } | null;
  /** Where the write-off posts — the warehouse, once goods have been returned. */
  disposal_location: { id: number; name: string; type: LocationType } | null;
  total_value: number;
  threshold_amount: number | null;
  over_threshold: boolean;
  requires_approval: boolean;
  requires_return: boolean;
  /** The branch → warehouse transfer carrying the goods back for inspection. */
  return_transfer: { id: number; reference: string; status: TransferStatus } | null;
  /** The document this was raised from (closing, transfer, cycle). */
  source_type: string | null;
  source_id: number | null;
  notes: string | null;
  lines: InventoryWastageLine[];
  line_count: number;
  photos: InventoryWastagePhoto[];
  photo_count: number;
  /** Evidence can only be added while the claim is live. */
  accepts_evidence: boolean;
  /**
   * Above the threshold the approver cannot sign off on nothing. Surfaced so the
   * UI can explain why approval is blocked rather than only failing on POST.
   */
  evidence_required: boolean;
  recorded_by: string | null;
  /** Id as well as the name — "did I record this?" gates the approve action. */
  recorded_by_id: number | null;
  recorded_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  created_at: string | null;
}

export interface RecordWastageLinePayload {
  item_id: number;
  quantity: number;
  reason: WastageReason;
  reason_note?: string | null;
}

export interface RecordWastagePayload {
  location_id: number;
  notes?: string | null;
  lines: RecordWastageLinePayload[];
}

export interface WastageFilters {
  status?: WastageStatus;
  origin?: WastageOrigin;
  location_id?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
}
