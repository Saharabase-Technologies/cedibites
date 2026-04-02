import { useQuery } from '@tanstack/react-query';
import { branchService } from '../services/branch.service';

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
  return { stats: data?.data, isLoading, error, refetch };
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
    staleTime: 10 * 60 * 1000, // 10 minutes
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
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    branch: branchData,
    isLoading,
    error,
  };
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
    staleTime: 5 * 60 * 1000, // 5 minutes
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
    staleTime: 5 * 60 * 1000, // 5 minutes
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
    staleTime: 2 * 60 * 1000,
  });
  return { staffSales: data || [], isLoading, error, refetch };
};
