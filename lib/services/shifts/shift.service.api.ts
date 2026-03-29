import apiClient from '@/lib/api/client';
import type { ShiftService, StaffShift } from './shift.service';

interface ApiShift {
  id: string;
  staffId: string;
  staffName: string;
  branchId: string;
  branchName: string;
  loginAt: number;
  logoutAt?: number | null;
  orderIds: string[];
  totalSales: number;
  orderCount: number;
}

function extractData<T>(response: unknown): T {
  const r = response as { data?: T };
  return (r?.data ?? response) as T;
}

function toStaffShift(raw: ApiShift): StaffShift {
  const logoutMs = raw.logoutAt != null ? Number(raw.logoutAt) : NaN;

  return {
    id: String(raw.id),
    staffId: String(raw.staffId),
    staffName: raw.staffName ?? '',
    branchId: String(raw.branchId),
    branchName: raw.branchName ?? '',
    loginAt: Number(raw.loginAt) || 0,
    logoutAt: Number.isFinite(logoutMs) && logoutMs > 0 ? logoutMs : undefined,
    orderIds: Array.isArray(raw.orderIds) ? raw.orderIds.map(String) : [],
    totalSales: Number(raw.totalSales) || 0,
    orderCount: Number(raw.orderCount) || 0,
  };
}

export class ApiShiftService implements ShiftService {
  async getAll(): Promise<StaffShift[]> {
    const response = await apiClient.get('/shifts');
    const payload = extractData<ApiShift[] | { data?: ApiShift[] }>(response);
    const list = Array.isArray(payload) ? payload : (payload as { data?: ApiShift[] })?.data ?? [];
    return (list as ApiShift[]).map(toStaffShift);
  }

  async getActive(staffId: string): Promise<StaffShift | null> {
    const response = await apiClient.get(`/shifts/active/${encodeURIComponent(staffId)}`);
    const raw = extractData<ApiShift | null>(response);
    if (!raw?.id) return null;
    return toStaffShift(raw);
  }

  async startShift(
    _staffId: string,
    _staffName: string,
    branchId: string,
    _branchName: string
  ): Promise<StaffShift> {
    const response = await apiClient.post('/shifts', { branch_id: Number(branchId) || branchId });
    const raw = extractData<ApiShift>(response);
    return toStaffShift(raw);
  }

  async endShift(shiftId: string): Promise<StaffShift> {
    const response = await apiClient.patch(`/shifts/${shiftId}/end`);
    const raw = extractData<ApiShift>(response);
    return toStaffShift(raw);
  }

  async addOrder(shiftId: string, orderId: string, orderTotal: number): Promise<void> {
    await apiClient.post(`/shifts/${shiftId}/orders`, {
      order_id: orderId,
      order_total: orderTotal,
    });
  }

  async getByDate(date: string): Promise<StaffShift[]> {
    const response = await apiClient.get(`/shifts/by-date/${encodeURIComponent(date)}`);
    const payload = extractData<ApiShift[] | { data?: ApiShift[] }>(response);
    const list = Array.isArray(payload) ? payload : (payload as { data?: ApiShift[] })?.data ?? [];
    return (list as ApiShift[]).map(toStaffShift);
  }

  async getByStaff(staffId: string): Promise<StaffShift[]> {
    const response = await apiClient.get(`/shifts/by-staff/${encodeURIComponent(staffId)}`);
    const payload = extractData<ApiShift[] | { data?: ApiShift[] }>(response);
    const list = Array.isArray(payload) ? payload : (payload as { data?: ApiShift[] })?.data ?? [];
    return (list as ApiShift[]).map(toStaffShift);
  }
}
