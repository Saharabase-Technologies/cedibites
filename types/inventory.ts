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
  | 'closed'
  | 'closed_disputed'
  | 'cancelled';
export type RequisitionStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'fulfilled'
  | 'rejected';
export type RequisitionPurpose = 'opening' | 'supplementary';
export type RequisitionSourceType = 'warehouse' | 'branch';
export type WastageStatus =
  | 'auto_accepted'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'awaiting_physical_return';
export type WastageReason =
  | 'spoiled'
  | 'expired'
  | 'damaged'
  | 'over_production'
  | 'spoiled_from_warehouse'
  | 'other';
export type RecipeStatus = 'draft' | 'observation' | 'locked';

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
  /** Populated once the transfer is received. */
  received_qty: number | null;
  /** Weighted per-unit cost captured at send time (FEFO-allocated). */
  unit_cost_at_time: number | null;
}

export interface InventoryTransferDispute {
  id: number;
  status: 'open' | 'resolved' | string;
  reason: string | null;
  discrepancy_qty: number;
  /** The corrective draft transfer spawned on resolution, if any. */
  corrective_transfer_id: number | null;
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
  /** Actor names (or null). The backend resource returns names, not objects. */
  created_by: string | null;
  approved_by: string | null;
  sent_by: string | null;
  received_by: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
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
  /** Optional per-line received-qty; defaults to the sent qty. Short → dispute. */
  lines?: { line_id: number; received_qty: number }[];
  dispute_reason?: string;
}

export interface CancelTransferPayload {
  reason: string;
}

export interface ResolveTransferDisputePayload {
  notes?: string;
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
  requesting_location_id: number;
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

// ─── Wastage ──────────────────────────────────────────────────────────────────

export interface InventoryWastageLine {
  id: number;
  item_id: number;
  item: Pick<InventoryItem, 'id' | 'sku' | 'name' | 'base_unit'>;
  quantity: number;
  unit: Pick<InventoryUnit, 'id' | 'symbol'>;
  unit_cost_at_time: number;
  line_total: number;
}

export interface InventoryWastageEvent {
  id: number;
  reference: string;
  location_id: number;
  location: Pick<InventoryLocation, 'id' | 'name' | 'type'>;
  reason: WastageReason;
  status: WastageStatus;
  notes: string | null;
  reported_by_id: number;
  reported_by: { id: number; name: string };
  approved_by_id: number | null;
  approved_by: { id: number; name: string } | null;
  lines: InventoryWastageLine[];
  total_value: number;
  created_at: string;
  updated_at: string;
}

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
  expected_qty: number;
  counted_qty: number | null;
  /** counted − expected; null until counted. */
  variance: number | null;
}

export interface InventoryDailyClosing {
  id: number;
  business_date: string; // YYYY-MM-DD
  status: DailyClosingStatus;
  location: { id: number; name: string; type: LocationType } | null;
  notes: string | null;
  lines: InventoryDailyClosingLine[];
  /** Summary (present whenever lines are loaded — always, from index/show). */
  line_count: number;
  counted_count: number;
  discrepancy_count: number;
  net_variance: number;
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
  lines: { line_id: number; counted_qty: number }[];
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

export interface InventoryReconciliationCycle {
  id: number;
  location_id: number;
  location: Pick<InventoryLocation, 'id' | 'name'>;
  opened_at: string;
  closed_at: string | null;
  status: 'open' | 'closed';
  net_variance_value: number;
  opened_by_id: number;
  opened_by: { id: number; name: string };
  created_at: string;
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
  code: string;
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
