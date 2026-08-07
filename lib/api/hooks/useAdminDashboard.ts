import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboard.service';

export const useAdminDashboard = () => {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => dashboardService.getAdminDashboard(),
    staleTime: 60 * 1000,
    enabled: typeof window !== 'undefined' && !!localStorage.getItem('cedibites_staff_token'),
  });

  return {
    userName: data?.user_name ?? 'Admin',
    kpis: data?.kpis,
    branches: data?.branches ?? [],
    liveOrders: data?.live_orders ?? [],
    isLoading,
    error,
    refetch,
  };
};
