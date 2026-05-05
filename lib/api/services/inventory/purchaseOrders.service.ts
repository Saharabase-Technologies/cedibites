/**
 * lib/api/services/inventory/purchaseOrders.service.ts
 *
 * Purchase Order service for the Warehouse Manager portal.
 *
 * Locked decisions (see cedibites_api/docs/JOURNAL.md, 2026-05-05):
 *   • Only WarehouseManager creates POs.
 *   • Strict mode: every Purchase MUST tie to a PO unless `is_urgent_buy`.
 *   • Approval threshold: PO_APPROVAL_THRESHOLD (₵10,000) — above this,
 *     status starts as `pending_approval` and must be approved by Admin
 *     before transitioning to `sent`. Below, can move directly to `sent`.
 */

import apiClient from '../../client';
import { MOCK_PURCHASE_ORDERS } from '../../mocks/inventory.mock';
import { PO_APPROVAL_THRESHOLD } from '@/lib/constants/inventory.constants';
import type {
  PurchaseOrder,
  PurchaseOrderFilters,
  CreatePurchaseOrderPayload,
  UpdatePurchaseOrderPayload,
  ApprovePurchaseOrderPayload,
  CancelPurchaseOrderPayload,
} from '@/types/inventory';

const IS_MOCK = process.env.NEXT_PUBLIC_IMS_MOCK === 'true';

function delay<T>(data: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function getPurchaseOrders(
  filters?: PurchaseOrderFilters,
): Promise<PurchaseOrder[]> {
  if (IS_MOCK) {
    let pos = [...MOCK_PURCHASE_ORDERS];
    if (filters?.status) {
      pos = pos.filter((po) => po.status === filters.status);
    }
    if (filters?.supplier_id) {
      pos = pos.filter((po) => po.supplier_id === filters.supplier_id);
    }
    if (filters?.destination_location_id) {
      pos = pos.filter((po) => po.destination_location_id === filters.destination_location_id);
    }
    if (filters?.date_from) {
      pos = pos.filter((po) => po.created_at >= filters.date_from!);
    }
    if (filters?.date_to) {
      pos = pos.filter((po) => po.created_at <= filters.date_to!);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      pos = pos.filter(
        (po) =>
          po.reference.toLowerCase().includes(q) ||
          po.supplier.name.toLowerCase().includes(q),
      );
    }
    return delay(pos);
  }

  const { data } = await apiClient.get<PurchaseOrder[]>('/v1/inventory/purchase-orders', {
    params: filters,
  });
  return data;
}

export async function getPurchaseOrder(id: number): Promise<PurchaseOrder> {
  if (IS_MOCK) {
    const po = MOCK_PURCHASE_ORDERS.find((p) => p.id === id);
    if (!po) throw new Error(`Purchase order ${id} not found`);
    return delay(po);
  }
  const { data } = await apiClient.get<PurchaseOrder>(
    `/v1/inventory/purchase-orders/${id}`,
  );
  return data;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Determine whether a PO requires Admin approval based on its estimated total.
 * Mirrors the backend rule once it ships.
 */
export function purchaseOrderRequiresApproval(estimatedTotal: number): boolean {
  return estimatedTotal >= PO_APPROVAL_THRESHOLD;
}

export async function createPurchaseOrder(
  payload: CreatePurchaseOrderPayload,
): Promise<PurchaseOrder> {
  if (IS_MOCK) {
    throw new Error('createPurchaseOrder is not implemented in mock mode yet.');
  }
  const { data } = await apiClient.post<PurchaseOrder>(
    '/v1/inventory/purchase-orders',
    payload,
  );
  return data;
}

export async function updatePurchaseOrder(
  id: number,
  payload: UpdatePurchaseOrderPayload,
): Promise<PurchaseOrder> {
  if (IS_MOCK) {
    throw new Error('updatePurchaseOrder is not implemented in mock mode yet.');
  }
  const { data } = await apiClient.patch<PurchaseOrder>(
    `/v1/inventory/purchase-orders/${id}`,
    payload,
  );
  return data;
}

export async function submitPurchaseOrder(id: number): Promise<PurchaseOrder> {
  if (IS_MOCK) {
    throw new Error('submitPurchaseOrder is not implemented in mock mode yet.');
  }
  const { data } = await apiClient.post<PurchaseOrder>(
    `/v1/inventory/purchase-orders/${id}/submit`,
  );
  return data;
}

export async function approvePurchaseOrder(
  id: number,
  payload: ApprovePurchaseOrderPayload = {},
): Promise<PurchaseOrder> {
  if (IS_MOCK) {
    throw new Error('approvePurchaseOrder is not implemented in mock mode yet.');
  }
  const { data } = await apiClient.post<PurchaseOrder>(
    `/v1/inventory/purchase-orders/${id}/approve`,
    payload,
  );
  return data;
}

export async function cancelPurchaseOrder(
  id: number,
  payload: CancelPurchaseOrderPayload,
): Promise<PurchaseOrder> {
  if (IS_MOCK) {
    throw new Error('cancelPurchaseOrder is not implemented in mock mode yet.');
  }
  const { data } = await apiClient.post<PurchaseOrder>(
    `/v1/inventory/purchase-orders/${id}/cancel`,
    payload,
  );
  return data;
}

export async function closePurchaseOrder(id: number): Promise<PurchaseOrder> {
  if (IS_MOCK) {
    throw new Error('closePurchaseOrder is not implemented in mock mode yet.');
  }
  const { data } = await apiClient.post<PurchaseOrder>(
    `/v1/inventory/purchase-orders/${id}/close`,
  );
  return data;
}
