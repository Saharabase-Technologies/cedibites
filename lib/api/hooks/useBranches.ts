import { useQuery } from '@tanstack/react-query';
import { branchService, type BranchRoute } from '../services/branch.service';

export const useBranchStats = (branchId: number | null, asManager = false) => {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['branch-stats', branchId, asManager],
    queryFn: () => (asManager ? branchService.getManagerBranchStats(branchId!) : branchService.getBranchStats(branchId!)),
    enabled: !!branchId,
    staleTime: 60 * 1000,
  });
  return { stats: data, isLoading, error, refetch };
};

export const useBranches = () => {
  const {
    data: branches,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['branches'],
    queryFn: branchService.getBranches,
    staleTime: 60 * 1000, // 1 minute — includes volatile today stats
  });

  return {
    branches: branches || [],
    isLoading,
    error,
    refetch,
  };
};

export const useBranch = (id: number) => {
  const {
    data: branchData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['branch', id],
    queryFn: () => branchService.getBranch(id),
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute — includes volatile today stats
  });

  return {
    branch: branchData,
    isLoading,
    error,
  };
};

/**
 * The road route from the customer to one branch.
 *
 * Every miss on the server's cache is a paid request to Google, so this hook is
 * deliberately reluctant. The coordinates are rounded to about a hundred metres
 * before they become a query key, so shifting a few paces does not buy a second
 * route; the answer is held for the same five minutes the server holds it; and
 * a failure is never retried, because a refused key stays refused.
 *
 * It returns nothing rather than throwing. The map has a straight line to fall
 * back on and no customer should see an error because a route did not arrive.
 */
export const useBranchRoute = (
  branchId: string | null,
  coordinates: { latitude: number; longitude: number } | null,
) => {
  const lat = coordinates ? Number(coordinates.latitude.toFixed(3)) : null;
  const lng = coordinates ? Number(coordinates.longitude.toFixed(3)) : null;

  const { data } = useQuery<BranchRoute>({
    queryKey: ['branch-route', branchId, lat, lng],
    queryFn: () => branchService.getBranchRoute(branchId!, lat!, lng!),
    enabled: branchId !== null && lat !== null && lng !== null,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return data?.available ? data : null;
};

export const useBranchTopItems = (branchId: number | null, params?: { date?: string; limit?: number }) => {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['branch-top-items', branchId, params],
    queryFn: () => branchService.getBranchTopItems(branchId!, params),
    enabled: !!branchId,
    staleTime: 60 * 1000,
  });
  return { topItems: data || [], isLoading, error, refetch };
};

export const useBranchRevenueChart = (branchId: number | null, params?: { period?: string }) => {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['branch-revenue-chart', branchId, params],
    queryFn: () => branchService.getBranchRevenueChart(branchId!, params),
    enabled: !!branchId,
    staleTime: 60 * 1000,
  });
  return { chartData: data || [], isLoading, error, refetch };
};

export const useBranchStaffSales = (branchId: number | null, date: string) => {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['branch-staff-sales', branchId, date],
    queryFn: () => branchService.getBranchStaffSales(branchId!, date),
    enabled: !!branchId && !!date,
    staleTime: 60 * 1000,
  });
  return { staffSales: data || [], isLoading, error, refetch };
};
