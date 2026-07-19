/**
 * lib/api/services/inventory/transfers.service.ts
 *
 * Stock transfer service for the Inventory portal. Live against the Laravel IMS
 * backend (`/inventory/transfers`).
 *
 * Lifecycle (see App\Enums\Inventory\TransferStatus / TransferService):
 *   draft → submitted → approved → sent → received → closed
 *                                       ↘ disputed → closed_disputed
 *   (draft | submitted | approved) → cancelled
 *
 * Stock leaves the source at `sent` (transfer_out, FEFO) and arrives at the
 * destination at `received` (transfer_in). A short receipt routes to `disputed`;
 * the original is immutable and reconciled by a corrective transfer.
 */

import apiClient from '../../client';
import type {
  InventoryTransfer,
  InventoryTransferFilters,
  CreateTransferPayload,
  UpdateTransferPayload,
  SubmitTransferPayload,
  SendTransferPayload,
  ReceiveTransferPayload,
  CancelTransferPayload,
  ResolveTransferDisputePayload,
} from '@/types/inventory';

/** Unwrap the API envelope ({ data: ... }), tolerating a raw body. */
function extractData<T>(response: unknown): T {
  const r = response as { data?: T };
  return (r?.data ?? response) as T;
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function getTransfers(
  filters?: InventoryTransferFilters,
): Promise<InventoryTransfer[]> {
  const response = await apiClient.get('/inventory/transfers', { params: filters });
  return extractData<InventoryTransfer[]>(response);
}

export async function getTransfer(id: number): Promise<InventoryTransfer> {
  const response = await apiClient.get(`/inventory/transfers/${id}`);
  return extractData<InventoryTransfer>(response);
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createTransfer(
  payload: CreateTransferPayload,
): Promise<InventoryTransfer> {
  const response = await apiClient.post('/inventory/transfers', payload);
  return extractData<InventoryTransfer>(response);
}

export async function updateTransfer(
  id: number,
  payload: UpdateTransferPayload,
): Promise<InventoryTransfer> {
  const response = await apiClient.patch(`/inventory/transfers/${id}`, payload);
  return extractData<InventoryTransfer>(response);
}

/** draft → submitted. Source stock is validated; admins may override a deficit. */
export async function submitTransfer(
  id: number,
  payload: SubmitTransferPayload = {},
): Promise<InventoryTransfer> {
  const response = await apiClient.post(`/inventory/transfers/${id}/submit`, payload);
  return extractData<InventoryTransfer>(response);
}

/** submitted → approved. Release authority (gated by transfer.send). */
export async function approveTransfer(id: number): Promise<InventoryTransfer> {
  const response = await apiClient.post(`/inventory/transfers/${id}/approve`);
  return extractData<InventoryTransfer>(response);
}

/** approved → sent. Deducts the source (FEFO). */
export async function sendTransfer(
  id: number,
  payload: SendTransferPayload = {},
): Promise<InventoryTransfer> {
  const response = await apiClient.post(`/inventory/transfers/${id}/send`, payload);
  return extractData<InventoryTransfer>(response);
}

/** sent → received | disputed. Adds received qty to the destination. */
export async function receiveTransfer(
  id: number,
  payload: ReceiveTransferPayload = {},
): Promise<InventoryTransfer> {
  const response = await apiClient.post(`/inventory/transfers/${id}/receive`, payload);
  return extractData<InventoryTransfer>(response);
}

/** disputed → closed_disputed. Spawns a corrective transfer for the shortfall. */
export async function resolveTransferDispute(
  id: number,
  payload: ResolveTransferDisputePayload = {},
): Promise<InventoryTransfer> {
  const response = await apiClient.post(`/inventory/transfers/${id}/resolve-dispute`, payload);
  return extractData<InventoryTransfer>(response);
}

export async function cancelTransfer(
  id: number,
  payload: CancelTransferPayload,
): Promise<InventoryTransfer> {
  const response = await apiClient.post(`/inventory/transfers/${id}/cancel`, payload);
  return extractData<InventoryTransfer>(response);
}
