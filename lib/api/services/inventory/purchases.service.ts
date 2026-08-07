/**
 * lib/api/services/inventory/purchases.service.ts
 *
 * Purchase (receipt) service. Live against the Laravel IMS backend
 * (`/inventory/purchases`).
 *
 * Recording a purchase posts a `purchase` movement at the destination warehouse,
 * recalculates weighted-average cost, and advances the linked PO. The Purchasing
 * Clerk records either against an existing PO line or as an `is_urgent_buy=true`
 * ad-hoc purchase (requires the urgent-buy permission).
 */

import apiClient from '../../client';
import type {
  Purchase,
  PurchaseFilters,
  RecordPurchasePayload,
} from '@/types/inventory';

/** Unwrap the API envelope ({ data: ... }), tolerating a raw body. */
function extractData<T>(response: unknown): T {
  const r = response as { data?: T };
  return (r?.data ?? response) as T;
}

export async function getPurchases(filters?: PurchaseFilters): Promise<Purchase[]> {
  const response = await apiClient.get('/inventory/purchases', { params: filters });
  return extractData<Purchase[]>(response);
}

export async function getPurchase(id: number): Promise<Purchase> {
  const response = await apiClient.get(`/inventory/purchases/${id}`);
  return extractData<Purchase>(response);
}

export async function recordPurchase(payload: RecordPurchasePayload): Promise<Purchase> {
  const response = await apiClient.post('/inventory/purchases', payload);
  return extractData<Purchase>(response);
}
