import apiClient from '../client';

export interface DashboardKpis {
  revenue_today: number;
  orders_today: number;
  active_orders: number;
  cancelled_today: number;
  cancelled_revenue_today?: number;
  no_charge_today?: number;
  no_charge_today_amount?: number;
}

export interface DashboardBranch {
  id: number;
  name: string;
  status: string;
  revenue_today: number;
  orders_today: number;
}

export interface DashboardLiveOrder {
  id: string;
  customer: string;
  branch: string;
  source: string;
  status: string;
  time_ago: string;
  amount: number;
}

export interface DashboardData {
  user_name: string;
  kpis: DashboardKpis;
  branches: DashboardBranch[];
  live_orders: DashboardLiveOrder[];
}

function extractData<T>(response: unknown): T {
  const r = response as { data?: T };
  return (r?.data ?? response) as T;
}

export const dashboardService = {
  getAdminDashboard: (): Promise<DashboardData> => {
    return apiClient.get('/admin/dashboard').then(extractData) as Promise<DashboardData>;
  },
};
