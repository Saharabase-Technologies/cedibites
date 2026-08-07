/**
 * lib/api/services/inventory/wastages.service.ts
 *
 * Wastage service — the named half of every loss. Live against the Laravel IMS
 * backend (`/inventory/wastages`).
 *
 * Under the value threshold a declaration self-approves and the stock goes
 * immediately. Over it, at a branch, the goods must physically travel back to
 * the warehouse that supplied them before the warehouse manager can sign it off.
 */

import apiClient from '../../client';
import type {
  InventoryWastage,
  WastageFilters,
  RecordWastagePayload,
  WastageReasonCatalog,
} from '@/types/inventory';

/** Unwrap the API envelope ({ data: ... }), tolerating a raw body. */
function extractData<T>(response: unknown): T {
  const r = response as { data?: T };
  return (r?.data ?? response) as T;
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function getWastages(filters?: WastageFilters): Promise<InventoryWastage[]> {
  const response = await apiClient.get('/inventory/wastages', { params: filters });
  return extractData<InventoryWastage[]>(response);
}

export async function getWastage(id: number): Promise<InventoryWastage> {
  const response = await apiClient.get(`/inventory/wastages/${id}`);
  return extractData<InventoryWastage>(response);
}

/**
 * The reason vocabulary and the current threshold, served by the backend so the
 * client never hardcodes a list that drifts out of step with the reports.
 */
export async function getWastageReasons(): Promise<WastageReasonCatalog> {
  const response = await apiClient.get('/inventory/wastages/reasons');
  return extractData<WastageReasonCatalog>(response);
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function recordWastage(payload: RecordWastagePayload): Promise<InventoryWastage> {
  const response = await apiClient.post('/inventory/wastages', payload);
  return extractData<InventoryWastage>(response);
}

/**
 * The approver has seen the goods and says how much of the loss is real.
 *
 * `approvedQty` is line id -> quantity allowed. Omit it, or omit a line, and
 * that line is written off in full. Partial approval is the reason the goods
 * travel back at all: 20 kg returns as spoiled, 10 kg turns out to be fine, and
 * neither writing off everything nor calling the claim a lie is the truth.
 */
export async function approveWastage(
  id: number,
  approvedQty?: Record<number, number>,
): Promise<InventoryWastage> {
  const response = await apiClient.post(
    `/inventory/wastages/${id}/approve`,
    approvedQty && Object.keys(approvedQty).length > 0 ? { approved_qty: approvedQty } : undefined,
  );
  return extractData<InventoryWastage>(response);
}

export async function rejectWastage(id: number, reason: string): Promise<InventoryWastage> {
  const response = await apiClient.post(`/inventory/wastages/${id}/reject`, { reason });
  return extractData<InventoryWastage>(response);
}

/** The recorder withdraws their own claim, while nothing has moved yet. */
export async function cancelWastage(id: number): Promise<InventoryWastage> {
  const response = await apiClient.post(`/inventory/wastages/${id}/cancel`);
  return extractData<InventoryWastage>(response);
}

// ─── Evidence ─────────────────────────────────────────────────────────────────

/**
 * Attach photo evidence. Open to both ends of the claim — the branch making its
 * case and the warehouse inspecting the returned goods.
 *
 * `stage` is NOT sent: the server derives it from who you are, so neither side
 * can file its photos under the other's name.
 */
export async function addWastagePhoto(
  id: number,
  file: File,
  caption?: string,
): Promise<InventoryWastage> {
  const form = new FormData();
  form.append('photo', file);
  if (caption) form.append('caption', caption);

  // The client instance defaults to JSON, so multipart is declared explicitly —
  // the same way feedback and menu CSV uploads do it. Axios rewrites this with
  // the real boundary once it sees FormData.
  const response = await apiClient.post(`/inventory/wastages/${id}/photos`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return extractData<InventoryWastage>(response);
}

export async function removeWastagePhoto(
  id: number,
  photoId: number,
): Promise<InventoryWastage> {
  const response = await apiClient.delete(`/inventory/wastages/${id}/photos/${photoId}`);
  return extractData<InventoryWastage>(response);
}
