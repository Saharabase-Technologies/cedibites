/**
 * lib/api/services/inventory/reports.service.ts
 *
 * IMS reports (`/inventory/reports`).
 */

import apiClient from '../../client';

/** Unwrap the API envelope ({ data: ... }), tolerating a raw body. */
function extractData<T>(response: unknown): T {
  const r = response as { data?: T };
  return (r?.data ?? response) as T;
}

export interface ConsumptionOrder {
  order_id: number;
  order_number: string | null;
  quantity: number;
  at: string | null;
}

export interface ConsumedItem {
  item_id: number;
  sku: string | null;
  name: string;
  unit: string | null;
  location: string | null;
  quantity: number;
  /** How many separate deductions made up the total. */
  movements: number;
  orders: ConsumptionOrder[];
}

export interface DailyConsumption {
  date: string;
  items: ConsumedItem[];
  totals: { items: number; orders: number };
}

/**
 * What the kitchen actually used on a day, and which sales used it.
 *
 * Reads the `sale` movements the recipe deduction writes, so it is the ledger's
 * own account rather than a projection from orders — a dish that sold without
 * deducting (no recipe yet) is honestly absent instead of silently assumed.
 */
export async function getDailyConsumption(params?: {
  date?: string;
  location_id?: number;
}): Promise<DailyConsumption> {
  const response = await apiClient.get('/inventory/reports/daily-consumption', { params });
  return extractData<DailyConsumption>(response);
}
