/**
 * lib/api/hooks/inventory/useInventoryDashboard.ts
 *
 * Fetches IMS dashboard stats and operational alerts.
 */

import { useQuery } from '@tanstack/react-query';
import {
  getInventoryDashboardStats,
  getInventoryDashboardAlerts,
  getRecentTransfers,
} from '../../services/inventory/dashboard.service';

export function useInventoryDashboardStats(locationId?: number) {
  return useQuery({
    queryKey: ['inventory', 'dashboard', 'stats', locationId ?? null],
    queryFn: () => getInventoryDashboardStats(locationId),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

export function useInventoryDashboardAlerts(locationId?: number) {
  return useQuery({
    queryKey: ['inventory', 'dashboard', 'alerts', locationId ?? null],
    queryFn: () => getInventoryDashboardAlerts(locationId),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

export function useRecentTransfers(limit = 5) {
  return useQuery({
    queryKey: ['inventory', 'transfers', 'recent', limit],
    queryFn: () => getRecentTransfers(limit),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}
