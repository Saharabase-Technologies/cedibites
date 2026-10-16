import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../client';
import type { MoneyGroup, MoneyLine, MoneyOnOthersOrder } from '../services/staff.service';
import type { OwedOrder } from '@/lib/services/shifts/shift.service';

/**
 * Staff Sales by shift (staff portal Section 7): the manager's for their
 * branch, the admin's for every branch. Each row is one shift, with the money
 * it took now, what its person confirmed at Clock out, and the manager's
 * confirm. The three ends read these same figures.
 */
export interface ShiftSalesRow {
  id: number;
  employee_id: number;
  staff_name: string;
  /** A manager's own shift: nobody else confirms it (Q3). */
  is_manager: boolean;
  branch_id: number | null;
  branch_name: string | null;
  /** At a branch with no manager, the admin confirms (Q2). */
  branch_has_manager: boolean;
  login_at: string;
  logout_at: string | null;
  on_shift: boolean;
  money: Record<MoneyGroup, MoneyLine>;
  total: number;
  no_charge: MoneyLine;
  clock_out: null | {
    at: string;
    money: {
      money: Record<MoneyGroup, MoneyLine>;
      total: number;
      count: number;
      no_charge: MoneyLine;
      on_others_orders: MoneyOnOthersOrder[];
    };
    owing: OwedOrder[];
    note: string | null;
  };
  manager_confirm: null | {
    at: string;
    by_employee_id: number | null;
    by_name: string | null;
    note: string | null;
  };
  orders_attended: number;
  order_value: number;
  still_owed: number;
}

function rows(response: unknown): ShiftSalesRow[] {
  const r = response as { data?: ShiftSalesRow[] };
  return (r?.data ?? response ?? []) as ShiftSalesRow[];
}

/** One branch, one day, YYYY-MM-DD. */
export const useManagerShiftSales = (branchId: number | null, date: string) =>
  useQuery({
    queryKey: ['shift-sales', 'branch', branchId, date],
    queryFn: async () => rows(await apiClient.get(`/manager/branches/${branchId}/shift-sales`, {
      params: { date_from: date, date_to: date },
    })),
    enabled: !!branchId && !!date,
    refetchInterval: 30_000,
  });

/** Every branch, or one, over whole days. */
export const useAdminShiftSales = (params: { date_from: string; date_to: string; branch_id?: number | null }) =>
  useQuery({
    queryKey: ['shift-sales', 'admin', params],
    queryFn: async () => rows(await apiClient.get('/admin/staff/shift-sales', {
      params: { date_from: params.date_from, date_to: params.date_to, branch_id: params.branch_id || undefined },
    })),
    refetchInterval: 30_000,
  });

/** The manager's confirm (D30). Refusals come back as ApiError with the reason. */
export const useConfirmShift = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ shiftId, note }: { shiftId: number; note: string }) =>
      apiClient.post(`/shifts/${shiftId}/confirm`, { note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-sales'] });
    },
  });
};
