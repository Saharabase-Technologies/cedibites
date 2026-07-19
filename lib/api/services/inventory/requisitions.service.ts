/**
 * lib/api/services/inventory/requisitions.service.ts
 *
 * Stock requisition service for the Inventory portal. Live against the Laravel
 * IMS backend (`/inventory/requisitions`).
 *
 * Lifecycle (see App\Enums\Inventory\RequisitionStatus / RequisitionService):
 *   draft → submitted → approved → fulfilled
 *                     ↘ rejected
 *
 * A branch requests stock from the warehouse. Approving (warehouse manager) sets
 * the granted quantities and spawns a fulfilling transfer; the requisition flips
 * to `fulfilled` once that transfer is received.
 */

import apiClient from '../../client';
import type {
  InventoryRequisition,
  InventoryRequisitionFilters,
  CreateRequisitionPayload,
  UpdateRequisitionPayload,
  ApproveRequisitionPayload,
  RejectRequisitionPayload,
} from '@/types/inventory';

/** Unwrap the API envelope ({ data: ... }), tolerating a raw body. */
function extractData<T>(response: unknown): T {
  const r = response as { data?: T };
  return (r?.data ?? response) as T;
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function getRequisitions(
  filters?: InventoryRequisitionFilters,
): Promise<InventoryRequisition[]> {
  const response = await apiClient.get('/inventory/requisitions', { params: filters });
  return extractData<InventoryRequisition[]>(response);
}

export async function getRequisition(id: number): Promise<InventoryRequisition> {
  const response = await apiClient.get(`/inventory/requisitions/${id}`);
  return extractData<InventoryRequisition>(response);
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createRequisition(
  payload: CreateRequisitionPayload,
): Promise<InventoryRequisition> {
  const response = await apiClient.post('/inventory/requisitions', payload);
  return extractData<InventoryRequisition>(response);
}

export async function updateRequisition(
  id: number,
  payload: UpdateRequisitionPayload,
): Promise<InventoryRequisition> {
  const response = await apiClient.patch(`/inventory/requisitions/${id}`, payload);
  return extractData<InventoryRequisition>(response);
}

/** draft → submitted. */
export async function submitRequisition(id: number): Promise<InventoryRequisition> {
  const response = await apiClient.post(`/inventory/requisitions/${id}/submit`);
  return extractData<InventoryRequisition>(response);
}

/** submitted → approved. Spawns the fulfilling transfer. */
export async function approveRequisition(
  id: number,
  payload: ApproveRequisitionPayload = {},
): Promise<InventoryRequisition> {
  const response = await apiClient.post(`/inventory/requisitions/${id}/approve`, payload);
  return extractData<InventoryRequisition>(response);
}

/** submitted → rejected. */
export async function rejectRequisition(
  id: number,
  payload: RejectRequisitionPayload,
): Promise<InventoryRequisition> {
  const response = await apiClient.post(`/inventory/requisitions/${id}/reject`, payload);
  return extractData<InventoryRequisition>(response);
}
