/**
 * lib/api/services/inventory/dashboard.service.ts
 *
 * IMS dashboard stats and operational alerts.
 */

import apiClient from '../../client';
import {
  MOCK_DASHBOARD_STATS,
  MOCK_DASHBOARD_ALERTS,
  MOCK_RECENT_TRANSFERS,
} from '../../mocks/inventory.mock';
import type {
  InventoryDashboardStats,
  InventoryDashboardAlert,
  InventoryTransfer,
} from '@/types/inventory';

const IS_MOCK = process.env.NEXT_PUBLIC_IMS_MOCK === 'true';

function delay<T>(data: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

export async function getInventoryDashboardStats(
  locationId?: number,
): Promise<InventoryDashboardStats> {
  if (IS_MOCK) return delay(MOCK_DASHBOARD_STATS);
  const { data } = await apiClient.get<InventoryDashboardStats>(
    '/v1/inventory/dashboard/stats',
    { params: locationId ? { location_id: locationId } : undefined },
  );
  return data;
}

export async function getInventoryDashboardAlerts(
  locationId?: number,
): Promise<InventoryDashboardAlert[]> {
  if (IS_MOCK) return delay(MOCK_DASHBOARD_ALERTS);
  const { data } = await apiClient.get<InventoryDashboardAlert[]>(
    '/v1/inventory/dashboard/alerts',
    { params: locationId ? { location_id: locationId } : undefined },
  );
  return data;
}

export async function getRecentTransfers(limit = 5): Promise<InventoryTransfer[]> {
  if (IS_MOCK) return delay(MOCK_RECENT_TRANSFERS.slice(0, limit));
  const { data } = await apiClient.get<InventoryTransfer[]>(
    '/v1/inventory/transfers',
    { params: { limit, sort: '-created_at' } },
  );
  return data;
}
