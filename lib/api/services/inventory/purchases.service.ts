/**
 * lib/api/services/inventory/purchases.service.ts
 *
 * Purchase (receipt) service. The Purchasing Clerk records purchases —
 * either against an existing PO line, or as an `is_urgent_buy=true`
 * ad-hoc purchase (override) when no PO exists.
 *
 * Recording a purchase posts a `purchase` movement at the destination
 * warehouse and recalculates weighted-average cost on each line.
 */

import apiClient from '../../client';
import { MOCK_PURCHASES } from '../../mocks/inventory.mock';
import type {
  Purchase,
  PurchaseFilters,
  RecordPurchasePayload,
} from '@/types/inventory';

const IS_MOCK = process.env.NEXT_PUBLIC_IMS_MOCK === 'true';

function delay<T>(data: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

export async function getPurchases(filters?: PurchaseFilters): Promise<Purchase[]> {
  if (IS_MOCK) {
    let purchases = [...MOCK_PURCHASES];
    if (filters?.supplier_id) {
      purchases = purchases.filter((p) => p.supplier_id === filters.supplier_id);
    }
    if (filters?.is_urgent_buy !== undefined) {
      purchases = purchases.filter((p) => p.is_urgent_buy === filters.is_urgent_buy);
    }
    if (filters?.date_from) {
      purchases = purchases.filter((p) => p.received_at >= filters.date_from!);
    }
    if (filters?.date_to) {
      purchases = purchases.filter((p) => p.received_at <= filters.date_to!);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      purchases = purchases.filter(
        (p) =>
          p.reference.toLowerCase().includes(q) ||
          p.supplier.name.toLowerCase().includes(q) ||
          (p.invoice_number?.toLowerCase().includes(q) ?? false),
      );
    }
    return delay(purchases);
  }
  const { data } = await apiClient.get<Purchase[]>('/v1/inventory/purchases', {
    params: filters,
  });
  return data;
}

export async function getPurchase(id: number): Promise<Purchase> {
  if (IS_MOCK) {
    const p = MOCK_PURCHASES.find((x) => x.id === id);
    if (!p) throw new Error(`Purchase ${id} not found`);
    return delay(p);
  }
  const { data } = await apiClient.get<Purchase>(`/v1/inventory/purchases/${id}`);
  return data;
}

export async function recordPurchase(payload: RecordPurchasePayload): Promise<Purchase> {
  if (IS_MOCK) {
    throw new Error('recordPurchase is not implemented in mock mode yet.');
  }
  const { data } = await apiClient.post<Purchase>('/v1/inventory/purchases', payload);
  return data;
}
