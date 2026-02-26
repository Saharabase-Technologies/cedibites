import apiClient from '../client';
import { MenuItem } from '@/types/api';

export interface MenuItemsParams {
  category_id?: number;
  search?: string;
  is_popular?: boolean;
  is_available?: boolean;
  branch_id?: number;
}

export const menuService = {
  /**
   * Get all menu items with optional filters
   */
  getItems: (params?: MenuItemsParams): Promise<{ data: MenuItem[] }> => {
    return apiClient.get('/menu-items', { params });
  },

  /**
   * Get single menu item by ID
   */
  getItem: (id: number): Promise<{ data: MenuItem }> => {
    return apiClient.get(`/menu-items/${id}`);
  },
};
