/**
 * lib/api/services/inventory/catalog.service.ts
 *
 * Inventory catalog service — Items, Categories, Units, Suppliers.
 * When NEXT_PUBLIC_IMS_MOCK=true the functions return fixture data
 * with a small artificial delay so UI states (loading/error) can
 * be developed and tested without a live API.
 */

import apiClient from '../../client';
import {
  MOCK_ITEMS,
  MOCK_CATEGORIES,
  MOCK_UNITS,
  MOCK_SUPPLIERS,
} from '../../mocks/inventory.mock';
import type {
  InventoryItem,
  InventoryCategory,
  InventoryUnit,
  InventorySupplier,
  InventoryItemFilters,
  CreateInventoryItemPayload,
  UpdateInventoryItemPayload,
  CreateInventoryCategoryPayload,
  CreateInventoryUnitPayload,
  CreateInventorySupplierPayload,
} from '@/types/inventory';

const IS_MOCK = process.env.NEXT_PUBLIC_IMS_MOCK === 'true';

function delay<T>(data: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

// ─── Items ────────────────────────────────────────────────────────────────────

export async function getInventoryItems(
  filters?: InventoryItemFilters,
): Promise<InventoryItem[]> {
  if (IS_MOCK) {
    let items = [...MOCK_ITEMS];
    if (filters?.category_id) {
      items = items.filter((i) => i.category_id === filters.category_id);
    }
    if (filters?.storage_type) {
      items = items.filter((i) => i.storage_type === filters.storage_type);
    }
    if (filters?.is_active !== undefined) {
      items = items.filter((i) => i.is_active === filters.is_active);
    }
    if (filters?.low_stock) {
      items = items.filter(
        (i) => i.reorder_level !== null && i.min_threshold !== null,
        // In mock we don't have live balances so return all "tracked" items
      );
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.sku.toLowerCase().includes(q),
      );
    }
    return delay(items);
  }

  const { data } = await apiClient.get<InventoryItem[]>('/v1/inventory/items', {
    params: filters,
  });
  return data;
}

export async function getInventoryItem(id: number): Promise<InventoryItem> {
  if (IS_MOCK) {
    const item = MOCK_ITEMS.find((i) => i.id === id);
    if (!item) throw new Error(`Item ${id} not found`);
    return delay(item);
  }
  const { data } = await apiClient.get<InventoryItem>(`/v1/inventory/items/${id}`);
  return data;
}

export async function createInventoryItem(
  payload: CreateInventoryItemPayload,
): Promise<InventoryItem> {
  if (IS_MOCK) {
    const newItem: InventoryItem = {
      id: Date.now(),
      sku: `ITM-${String(Date.now()).slice(-6)}`,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      category: null,
      base_unit: { id: payload.base_unit_id, name: '', symbol: '' },
      default_supplier: null,
      weighted_avg_cost: 0,
      ...payload,
    } as unknown as InventoryItem;
    MOCK_ITEMS.push(newItem);
    return delay(newItem, 600);
  }
  const { data } = await apiClient.post<InventoryItem>('/v1/inventory/items', payload);
  return data;
}

export async function updateInventoryItem(
  id: number,
  payload: UpdateInventoryItemPayload,
): Promise<InventoryItem> {
  if (IS_MOCK) {
    const item = MOCK_ITEMS.find((i) => i.id === id);
    if (!item) throw new Error(`Item ${id} not found`);
    return delay({ ...item, ...payload, updated_at: new Date().toISOString() }, 600);
  }
  const { data } = await apiClient.patch<InventoryItem>(`/v1/inventory/items/${id}`, payload);
  return data;
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getInventoryCategories(): Promise<InventoryCategory[]> {
  if (IS_MOCK) return delay(MOCK_CATEGORIES);
  const { data } = await apiClient.get<InventoryCategory[]>('/v1/inventory/categories');
  return data;
}

export async function createInventoryCategory(
  payload: CreateInventoryCategoryPayload,
): Promise<InventoryCategory> {
  if (IS_MOCK) {
    const newCat: InventoryCategory = {
      id: Date.now(),
      sort_order: 99,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...payload,
    };
    MOCK_CATEGORIES.push(newCat);
    return delay(newCat, 600);
  }
  const { data } = await apiClient.post<InventoryCategory>('/v1/inventory/categories', payload);
  return data;
}

// ─── Units ────────────────────────────────────────────────────────────────────

export async function getInventoryUnits(): Promise<InventoryUnit[]> {
  if (IS_MOCK) return delay(MOCK_UNITS);
  const { data } = await apiClient.get<InventoryUnit[]>('/v1/inventory/units');
  return data;
}

export async function createInventoryUnit(
  payload: CreateInventoryUnitPayload,
): Promise<InventoryUnit> {
  if (IS_MOCK) {
    const newUnit: InventoryUnit = {
      id: Date.now(),
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...payload,
    };
    MOCK_UNITS.push(newUnit);
    return delay(newUnit, 600);
  }
  const { data } = await apiClient.post<InventoryUnit>('/v1/inventory/units', payload);
  return data;
}

// ─── Suppliers ────────────────────────────────────────────────────────────────

export async function getInventorySuppliers(): Promise<InventorySupplier[]> {
  if (IS_MOCK) return delay(MOCK_SUPPLIERS);
  const { data } = await apiClient.get<InventorySupplier[]>('/v1/inventory/suppliers');
  return data;
}

export async function createInventorySupplier(
  payload: CreateInventorySupplierPayload,
): Promise<InventorySupplier> {
  if (IS_MOCK) {
    const newSupplier: InventorySupplier = {
      id: Date.now(),
      code: `SUP-${String(Date.now()).slice(-3)}`,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...payload,
    };
    MOCK_SUPPLIERS.push(newSupplier);
    return delay(newSupplier, 600);
  }
  const { data } = await apiClient.post<InventorySupplier>('/v1/inventory/suppliers', payload);
  return data;
}
