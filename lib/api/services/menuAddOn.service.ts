import apiClient from '@/lib/api/client';
import type { MenuAddOn } from '@/types/api';

interface ApiCollectionResponse<T> {
  data?: T[];
}

interface ApiItemResponse<T> {
  data?: T;
}

export const menuAddOnService = {
  async list(branchId: number): Promise<MenuAddOn[]> {
    const response = await apiClient.get(`/admin/menu-add-ons?branch_id=${branchId}`) as ApiCollectionResponse<MenuAddOn>;
    return response.data ?? [];
  },

  async create(payload: {
    branch_id: number;
    slug: string;
    name: string;
    price: number;
    is_per_piece: boolean;
    display_order?: number;
    is_active?: boolean;
  }): Promise<MenuAddOn> {
    const response = await apiClient.post('/admin/menu-add-ons', payload) as ApiItemResponse<MenuAddOn>;
    return response.data as MenuAddOn;
  },

  async update(addOnId: number, payload: Partial<{
    branch_id: number;
    slug: string;
    name: string;
    price: number;
    is_per_piece: boolean;
    display_order: number;
    is_active: boolean;
  }>): Promise<MenuAddOn> {
    const response = await apiClient.patch(`/admin/menu-add-ons/${addOnId}`, payload) as ApiItemResponse<MenuAddOn>;
    return response.data as MenuAddOn;
  },

  async remove(addOnId: number): Promise<void> {
    await apiClient.delete(`/admin/menu-add-ons/${addOnId}`);
  },
};
