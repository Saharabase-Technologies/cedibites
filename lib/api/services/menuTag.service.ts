import apiClient from '@/lib/api/client';
import type { MenuTag } from '@/types/api';

interface ApiCollectionResponse<T> {
  data?: T[];
}

interface ApiItemResponse<T> {
  data?: T;
}

export const menuTagService = {
  async list(activeOnly = true): Promise<MenuTag[]> {
    const response = await apiClient.get('/admin/menu-tags', {
      params: { active_only: activeOnly },
    }) as ApiCollectionResponse<MenuTag>;
    return response.data ?? [];
  },

  async create(payload: { slug: string; name: string; display_order?: number; is_active?: boolean; rule_description?: string | null }): Promise<MenuTag> {
    const response = await apiClient.post('/admin/menu-tags', payload) as ApiItemResponse<MenuTag>;
    return response.data as MenuTag;
  },

  async update(tagId: number, payload: Partial<{ slug: string; name: string; display_order: number; is_active: boolean; rule_description: string | null }>): Promise<MenuTag> {
    const response = await apiClient.patch(`/admin/menu-tags/${tagId}`, payload) as ApiItemResponse<MenuTag>;
    return response.data as MenuTag;
  },

  async remove(tagId: number): Promise<void> {
    await apiClient.delete(`/admin/menu-tags/${tagId}`);
  },
};
