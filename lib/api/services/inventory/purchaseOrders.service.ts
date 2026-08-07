/**
 * lib/api/services/inventory/purchaseOrders.service.ts
 *
 * Purchase Order service for the Warehouse Manager portal. Live against the
 * Laravel IMS backend (`/inventory/purchase-orders`).
 *
 * Locked decisions (see cedibites_api/docs/JOURNAL.md, 2026-05-05):
 *   • Only WarehouseManager creates POs (super-admin inherits the permission).
 *   • Strict mode: every Purchase MUST tie to a PO unless `is_urgent_buy`.
 *   • Approval threshold: PO_APPROVAL_THRESHOLD (₵10,000) — above this, submit
 *     routes to `pending_approval` and an Admin must approve before `sent`.
 */

import apiClient from '../../client';
import { PO_APPROVAL_THRESHOLD } from '@/lib/constants/inventory.constants';
import type {
  PurchaseOrder,
  PurchaseOrderFilters,
  CreatePurchaseOrderPayload,
  UpdatePurchaseOrderPayload,
  ApprovePurchaseOrderPayload,
  CancelPurchaseOrderPayload,
} from '@/types/inventory';

/** Unwrap the API envelope ({ data: ... }), tolerating a raw body. */
function extractData<T>(response: unknown): T {
  const r = response as { data?: T };
  return (r?.data ?? response) as T;
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function getPurchaseOrders(
  filters?: PurchaseOrderFilters,
): Promise<PurchaseOrder[]> {
  const response = await apiClient.get('/inventory/purchase-orders', { params: filters });
  return extractData<PurchaseOrder[]>(response);
}

export async function getPurchaseOrder(id: number): Promise<PurchaseOrder> {
  const response = await apiClient.get(`/inventory/purchase-orders/${id}`);
  return extractData<PurchaseOrder>(response);
}

/**
 * Authenticity check by the unguessable verification code (QR signature).
 * Resolves soft-deleted POs too, so historical records always verify.
 */
export async function verifyPurchaseOrder(code: string): Promise<PurchaseOrder> {
  const response = await apiClient.get(`/inventory/purchase-orders/verify/${encodeURIComponent(code)}`);
  return extractData<PurchaseOrder>(response);
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Mirrors the backend approval rule for client-side affordances (banners, etc.).
 */
export function purchaseOrderRequiresApproval(estimatedTotal: number): boolean {
  return estimatedTotal >= PO_APPROVAL_THRESHOLD;
}

export async function createPurchaseOrder(
  payload: CreatePurchaseOrderPayload,
): Promise<PurchaseOrder> {
  const response = await apiClient.post('/inventory/purchase-orders', payload);
  return extractData<PurchaseOrder>(response);
}

export async function updatePurchaseOrder(
  id: number,
  payload: UpdatePurchaseOrderPayload,
): Promise<PurchaseOrder> {
  const response = await apiClient.patch(`/inventory/purchase-orders/${id}`, payload);
  return extractData<PurchaseOrder>(response);
}

export async function submitPurchaseOrder(id: number): Promise<PurchaseOrder> {
  const response = await apiClient.post(`/inventory/purchase-orders/${id}/submit`);
  return extractData<PurchaseOrder>(response);
}

export async function approvePurchaseOrder(
  id: number,
  payload: ApprovePurchaseOrderPayload = {},
): Promise<PurchaseOrder> {
  const response = await apiClient.post(`/inventory/purchase-orders/${id}/approve`, payload);
  return extractData<PurchaseOrder>(response);
}

export async function cancelPurchaseOrder(
  id: number,
  payload: CancelPurchaseOrderPayload,
): Promise<PurchaseOrder> {
  const response = await apiClient.post(`/inventory/purchase-orders/${id}/cancel`, payload);
  return extractData<PurchaseOrder>(response);
}

export async function closePurchaseOrder(id: number): Promise<PurchaseOrder> {
  const response = await apiClient.post(`/inventory/purchase-orders/${id}/close`);
  return extractData<PurchaseOrder>(response);
}
