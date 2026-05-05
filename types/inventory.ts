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
  | 'closed_disputed';
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

export interface InventoryTransferLine {
  id: number;
  item_id: number;
  item: Pick<InventoryItem, 'id' | 'sku' | 'name' | 'base_unit'>;
  requested_qty: number;
  sent_qty: number | null;
  received_qty: number | null;
  disputed_qty: number | null;
  unit: Pick<InventoryUnit, 'id' | 'symbol'>;
  unit_cost_at_time: number;
}

export interface InventoryTransfer {
  id: number;
  reference: string;
  source_location_id: number;
  source_location: Pick<InventoryLocation, 'id' | 'name' | 'type'>;
  destination_location_id: number;
  destination_location: Pick<InventoryLocation, 'id' | 'name' | 'type'>;
  status: TransferStatus;
  notes: string | null;
  requested_by_id: number;
  requested_by: { id: number; name: string };
  approved_by_id: number | null;
  approved_by: { id: number; name: string } | null;
  parent_transfer_id: number | null;
  source_validation_overridden_by: number | null;
  lines: InventoryTransferLine[];
  total_value: number;
  created_at: string;
  updated_at: string;
}

// ─── Requisitions ─────────────────────────────────────────────────────────────

export interface InventoryRequisitionLine {
  id: number;
  item_id: number;
  item: Pick<InventoryItem, 'id' | 'sku' | 'name' | 'base_unit'>;
  requested_qty: number;
  approved_qty: number | null;
  unit: Pick<InventoryUnit, 'id' | 'symbol'>;
}

export interface InventoryRequisition {
  id: number;
  reference: string;
  requesting_location_id: number;
  requesting_location: Pick<InventoryLocation, 'id' | 'name' | 'type'>;
  source_type: RequisitionSourceType;
  source_location_id: number | null;
  source_location: Pick<InventoryLocation, 'id' | 'name' | 'type'> | null;
  purpose: RequisitionPurpose;
  status: RequisitionStatus;
  notes: string | null;
  requested_by_id: number;
  requested_by: { id: number; name: string };
  lines: InventoryRequisitionLine[];
  created_at: string;
  updated_at: string;
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

export interface InventoryDailyClosingEntry {
  id: number;
  location_id: number;
  location: Pick<InventoryLocation, 'id' | 'name'>;
  item_id: number;
  item: Pick<InventoryItem, 'id' | 'sku' | 'name' | 'base_unit'>;
  date: string;
  expected_qty: number;
  actual_qty: number;
  variance: number;
  entered_by_id: number;
  entered_by: { id: number; name: string };
  created_at: string;
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
  menu_item_id: number;
  menu_item: { id: number; name: string };
  branch_id: number | null;
  is_default: boolean;
  status: RecipeStatus;
  version: number;
  ingredients: InventoryRecipeIngredient[];
  locked_by_id: number | null;
  locked_by: { id: number; name: string } | null;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
}

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
  sku: string;
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
  received_qty: number;
  unit: Pick<InventoryUnit, 'id' | 'symbol'>;
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
  received_qty: number;
  unit_cost_paid: number;
}

export interface RecordPurchasePayload {
  purchase_order_id?: number;
  supplier_id: number;
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
