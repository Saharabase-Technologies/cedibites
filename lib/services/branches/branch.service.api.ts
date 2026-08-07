import apiClient from '@/lib/api/client';
import type { Branch } from '@/types/branch';
import type { BranchService } from './branch.service';

interface ApiBranch {
  id: number;
  name: string;
  area: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
  operating_hours?: string;
  delivery_fee?: number;
  delivery_radius_km?: number;
  estimated_delivery_time?: string;
}

function extractData<T>(response: unknown): T {
  const r = response as { data?: T };
  return (r?.data ?? response) as T;
}

function toBranch(raw: ApiBranch, menuItemIds: string[] = []): Branch {
  return {
    id: String(raw.id),
    name: raw.name,
    address: raw.address ?? '',
    area: raw.area ?? raw.name,
    phone: raw.phone ?? '',
    coordinates: {
      latitude: Number(raw.latitude) || 0,
      longitude: Number(raw.longitude) || 0,
    },
    deliveryRadius: Number(raw.delivery_radius_km) ?? 5,
    deliveryFee: Number(raw.delivery_fee) ?? 0,
    operatingHours: raw.operating_hours ?? '8:00 AM – 10:00 PM',
    isOpen: Boolean(raw.is_active),
    menuItemIds,
  };
}

export class ApiBranchService implements BranchService {
  async getAll(): Promise<Branch[]> {
    const response = await apiClient.get('/branches');
    const payload = extractData<ApiBranch[] | { data?: ApiBranch[] }>(response);
    const list = Array.isArray(payload) ? payload : (payload as { data?: ApiBranch[] })?.data ?? [];
    const items = await Promise.all(
      (list as ApiBranch[]).map(async (raw) => {
        const ids = await this.getMenuItemIds(String(raw.id));
        return toBranch(raw, ids);
      })
    );
    return items;
  }

  async getById(id: string): Promise<Branch | null> {
    try {
      const response = await apiClient.get(`/branches/${id}`);
      const raw = extractData<ApiBranch>(response);
      if (!raw?.id) return null;
      const menuItemIds = await this.getMenuItemIds(id);
      return toBranch(raw, menuItemIds);
    } catch {
      return null;
    }
  }

  async getByName(name: string): Promise<Branch | null> {
    try {
      const response = await apiClient.get(`/branches/by-name/${encodeURIComponent(name)}`);
      const raw = extractData<ApiBranch | null>(response);
      if (!raw?.id) return null;
      const menuItemIds = await this.getMenuItemIds(String(raw.id));
      return toBranch(raw, menuItemIds);
    } catch {
      return null;
    }
  }

  async getMenuItemIds(branchId: string): Promise<string[]> {
    try {
      const response = await apiClient.get(`/branches/${branchId}/menu-items`);
      const payload = extractData<string[] | { data?: string[] }>(response);
      const list = Array.isArray(payload) ? payload : (payload as { data?: string[] })?.data ?? [];
      return list.map(String);
    } catch {
      return [];
    }
  }

  async isItemAvailable(itemId: string, branchId: string): Promise<boolean> {
    try {
      const response = await apiClient.get(
        `/branches/${branchId}/menu-items/${encodeURIComponent(itemId)}/available`
      );
      const payload = extractData<boolean | { data?: boolean }>(response);
      return typeof payload === 'boolean' ? payload : Boolean((payload as { data?: boolean })?.data);
    } catch {
      return false;
    }
  }
}
