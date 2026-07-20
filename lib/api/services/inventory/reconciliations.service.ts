/**
 * lib/api/services/inventory/reconciliations.service.ts
 *
 * Stock-take reconciliation service. Live against the Laravel IMS backend
 * (`/inventory/reconciliations`).
 *
 * A cycle opens with a system-quantity snapshot; the warehouse manager counts
 * everything; posting writes a `cycle_adjustment` movement per non-zero variance
 * (correcting the ledger to the counted actual) and closes the cycle — the books
 * reset to zero and a new cycle can begin.
 */

import apiClient from '../../client';
import type {
  InventoryReconciliationCycle,
  InventoryReconciliationFilters,
  OpenReconciliationPayload,
  SaveReconciliationPayload,
  PostReconciliationPayload,
} from '@/types/inventory';

/** Unwrap the API envelope ({ data: ... }), tolerating a raw body. */
function extractData<T>(response: unknown): T {
  const r = response as { data?: T };
  return (r?.data ?? response) as T;
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function getReconciliations(
  filters?: InventoryReconciliationFilters,
): Promise<InventoryReconciliationCycle[]> {
  const response = await apiClient.get('/inventory/reconciliations', { params: filters });
  return extractData<InventoryReconciliationCycle[]>(response);
}

export async function getReconciliation(id: number): Promise<InventoryReconciliationCycle> {
  const response = await apiClient.get(`/inventory/reconciliations/${id}`);
  return extractData<InventoryReconciliationCycle>(response);
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Open a cycle for a location, snapshotting system quantities. */
export async function openReconciliation(
  payload: OpenReconciliationPayload,
): Promise<InventoryReconciliationCycle> {
  const response = await apiClient.post('/inventory/reconciliations', payload);
  return extractData<InventoryReconciliationCycle>(response);
}

/** Record physical counts (does not post adjustments). */
export async function saveReconciliation(
  id: number,
  payload: SaveReconciliationPayload,
): Promise<InventoryReconciliationCycle> {
  const response = await apiClient.patch(`/inventory/reconciliations/${id}`, payload);
  return extractData<InventoryReconciliationCycle>(response);
}

/** Post the reconciliation — write cycle_adjustment movements and close it. */
export async function postReconciliation(
  id: number,
  payload: PostReconciliationPayload = {},
): Promise<InventoryReconciliationCycle> {
  const response = await apiClient.post(`/inventory/reconciliations/${id}/post`, payload);
  return extractData<InventoryReconciliationCycle>(response);
}
