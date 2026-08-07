import apiClient from '../client';

export interface MenuItemSize {
  id: number;
  menu_item_id: number;
  name: string;
  price: number;
  size_order: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMenuItemSizeData {
  name: string;
  price: number;
  size_order?: number;
  is_available?: boolean;
}

export interface UpdateMenuItemSizeData extends Partial<CreateMenuItemSizeData> {}

export const menuItemSizeService = {
  /**
   * Get all sizes for a menu item
   */
  getSizes: (menuItemId: number): Promise<{ data: MenuItemSize[] }> => {
    return apiClient.get(`/admin/menu-items/${menuItemId}/sizes`);
  },

  /**
   * Get single size by ID
   */
  getSize: (menuItemId: number, sizeId: number): Promise<{ data: MenuItemSize }> => {
    return apiClient.get(`/admin/menu-items/${menuItemId}/sizes/${sizeId}`);
  },

  /**
   * Create a new size for a menu item
   */
  createSize: (menuItemId: number, data: CreateMenuItemSizeData): Promise<{ data: MenuItemSize }> => {
    return apiClient.post(`/admin/menu-items/${menuItemId}/sizes`, data);
  },

  /**
   * Update an existing size
   */
  updateSize: (menuItemId: number, sizeId: number, data: UpdateMenuItemSizeData): Promise<{ data: MenuItemSize }> => {
    return apiClient.patch(`/admin/menu-items/${menuItemId}/sizes/${sizeId}`, data);
  },

  /**
   * Delete a size
   */
  deleteSize: (menuItemId: number, sizeId: number): Promise<void> => {
    return apiClient.delete(`/admin/menu-items/${menuItemId}/sizes/${sizeId}`);
  },
};