/**
 * lib/api/services/inventory/locations.service.ts
 *
 * Inventory locations service — warehouse + satellite kitchens.
 */

import apiClient from '../../client';
import { MOCK_LOCATIONS } from '../../mocks/inventory.mock';
import type {
  InventoryLocation,
  InventoryLocationFilters,
  CreateInventoryLocationPayload,
} from '@/types/inventory';

const IS_MOCK = process.env.NEXT_PUBLIC_IMS_MOCK === 'true';

function delay<T>(data: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

export async function getInventoryLocations(
  filters?: InventoryLocationFilters,
): Promise<InventoryLocation[]> {
  if (IS_MOCK) {
    let locations = [...MOCK_LOCATIONS];
    if (filters?.type) {
      locations = locations.filter((l) => l.type === filters.type);
    }
    if (filters?.is_active !== undefined) {
      locations = locations.filter((l) => l.is_active === filters.is_active);
    }
    return delay(locations);
  }

  const { data } = await apiClient.get<InventoryLocation[]>('/v1/inventory/locations', {
    params: filters,
  });
  return data;
}

export async function getInventoryLocation(id: number): Promise<InventoryLocation> {
  if (IS_MOCK) {
    const loc = MOCK_LOCATIONS.find((l) => l.id === id);
    if (!loc) throw new Error(`Location ${id} not found`);
    return delay(loc);
  }
  const { data } = await apiClient.get<InventoryLocation>(`/v1/inventory/locations/${id}`);
  return data;
}

export async function createInventoryLocation(
  payload: CreateInventoryLocationPayload,
): Promise<InventoryLocation> {
  if (IS_MOCK) {
    const newLoc: InventoryLocation = {
      id: Date.now(),
      code: `LOC-${String(Date.now()).slice(-3)}`,
      is_active: true,
      branch: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...payload,
    } as unknown as InventoryLocation;
    return delay(newLoc, 600);
  }
  const { data } = await apiClient.post<InventoryLocation>('/v1/inventory/locations', payload);
  return data;
}
