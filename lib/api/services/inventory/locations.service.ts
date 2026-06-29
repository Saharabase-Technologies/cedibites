/**
 * lib/api/services/inventory/locations.service.ts
 *
 * Inventory locations service — warehouse + satellite kitchens.
 *
 * Reads are live against the Laravel IMS backend (`/inventory/locations`).
 * Location creation is not yet implemented server-side.
 */

import apiClient from '../../client';
import type {
  InventoryLocation,
  InventoryLocationFilters,
  CreateInventoryLocationPayload,
} from '@/types/inventory';

/** Unwrap the API envelope ({ data: ... }), tolerating a raw body. */
function extractData<T>(response: unknown): T {
  const r = response as { data?: T };
  return (r?.data ?? response) as T;
}

export async function getInventoryLocations(
  filters?: InventoryLocationFilters,
): Promise<InventoryLocation[]> {
  const response = await apiClient.get('/inventory/locations', { params: filters });
  return extractData<InventoryLocation[]>(response);
}

export async function getInventoryLocation(id: number): Promise<InventoryLocation> {
  const response = await apiClient.get(`/inventory/locations/${id}`);
  return extractData<InventoryLocation>(response);
}

export async function createInventoryLocation(
  payload: CreateInventoryLocationPayload,
): Promise<InventoryLocation> {
  const response = await apiClient.post('/inventory/locations', payload);
  return extractData<InventoryLocation>(response);
}
