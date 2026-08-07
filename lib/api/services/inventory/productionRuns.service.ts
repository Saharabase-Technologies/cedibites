/**
 * lib/api/services/inventory/productionRuns.service.ts
 *
 * Mother-kitchen production runs — batch-prep that consumes raw inputs and
 * yields a prepared output item. Live against `/inventory/production-runs`.
 */

import apiClient from '../../client';
import type { ProductionLog, RecordProductionPayload } from '@/types/inventory';

/** Unwrap the API envelope ({ data: ... }), tolerating a raw body. */
function extractData<T>(response: unknown): T {
  const r = response as { data?: T };
  return (r?.data ?? response) as T;
}

export interface ProductionRunFilters {
  location_id?: number;
  output_item_id?: number;
}

export async function getProductionRuns(filters?: ProductionRunFilters): Promise<ProductionLog[]> {
  const response = await apiClient.get('/inventory/production-runs', { params: filters });
  return extractData<ProductionLog[]>(response);
}

export async function recordProductionRun(payload: RecordProductionPayload): Promise<ProductionLog> {
  const response = await apiClient.post('/inventory/production-runs', payload);
  return extractData<ProductionLog>(response);
}
