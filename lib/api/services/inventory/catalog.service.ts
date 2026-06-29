/**
 * lib/api/services/inventory/catalog.service.ts
 *
 * Inventory catalog service — Items, Categories, Units, Suppliers.
 *
 * Live against the Laravel IMS backend (`/inventory/*`). Reads and writes both
 * hit the API; suppliers/items get a system-generated code/sku server-side.
 */

import apiClient from '../../client';
import type {
  InventoryItem,
  InventoryCategory,
  InventoryUnit,
  InventorySupplier,
  InventoryItemFilters,
  ItemHistory,
  RecordConsumptionPayload,
  CreateInventoryItemPayload,
  UpdateInventoryItemPayload,
  CreateInventoryCategoryPayload,
  CreateInventoryUnitPayload,
  CreateInventorySupplierPayload,
} from '@/types/inventory';

/** Unwrap the API envelope ({ data: ... }), tolerating a raw body. */
function extractData<T>(response: unknown): T {
  const r = response as { data?: T };
  return (r?.data ?? response) as T;
}

// ─── Items ────────────────────────────────────────────────────────────────────

export async function getInventoryItems(
  filters?: InventoryItemFilters,
): Promise<InventoryItem[]> {
  const response = await apiClient.get('/inventory/items', { params: filters });
  return extractData<InventoryItem[]>(response);
}

export async function getInventoryItem(id: number): Promise<InventoryItem> {
  const response = await apiClient.get(`/inventory/items/${id}`);
  return extractData<InventoryItem>(response);
}

/** Supply/movement history (ledger + suppliers) for the item detail view. */
export async function getInventoryItemMovements(id: number): Promise<ItemHistory> {
  const response = await apiClient.get(`/inventory/items/${id}/movements`);
  return extractData<ItemHistory>(response);
}

export async function createInventoryItem(
  payload: CreateInventoryItemPayload,
): Promise<InventoryItem> {
  const response = await apiClient.post('/inventory/items', payload);
  return extractData<InventoryItem>(response);
}

export async function updateInventoryItem(
  id: number,
  payload: UpdateInventoryItemPayload,
): Promise<InventoryItem> {
  const response = await apiClient.patch(`/inventory/items/${id}`, payload);
  return extractData<InventoryItem>(response);
}

/** Record mother-kitchen consumption (stock issue / production usage). */
export async function recordConsumption(
  payload: RecordConsumptionPayload,
): Promise<{ count: number }> {
  const response = await apiClient.post('/inventory/production', payload);
  return extractData<{ count: number }>(response);
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getInventoryCategories(): Promise<InventoryCategory[]> {
  const response = await apiClient.get('/inventory/categories');
  return extractData<InventoryCategory[]>(response);
}

export async function createInventoryCategory(
  payload: CreateInventoryCategoryPayload,
): Promise<InventoryCategory> {
  const response = await apiClient.post('/inventory/categories', payload);
  return extractData<InventoryCategory>(response);
}

// ─── Units ────────────────────────────────────────────────────────────────────

export async function getInventoryUnits(): Promise<InventoryUnit[]> {
  const response = await apiClient.get('/inventory/units');
  return extractData<InventoryUnit[]>(response);
}

export async function createInventoryUnit(
  payload: CreateInventoryUnitPayload,
): Promise<InventoryUnit> {
  const response = await apiClient.post('/inventory/units', payload);
  return extractData<InventoryUnit>(response);
}

// ─── Suppliers ────────────────────────────────────────────────────────────────

export async function getInventorySuppliers(): Promise<InventorySupplier[]> {
  const response = await apiClient.get('/inventory/suppliers');
  return extractData<InventorySupplier[]>(response);
}

export async function createInventorySupplier(
  payload: CreateInventorySupplierPayload,
): Promise<InventorySupplier> {
  const response = await apiClient.post('/inventory/suppliers', payload);
  return extractData<InventorySupplier>(response);
}
