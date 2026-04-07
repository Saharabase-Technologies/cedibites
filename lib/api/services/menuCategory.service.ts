import apiClient from '../client';

export interface MenuCategory {
  id: number;
  branch_id: number;
  name: string;
  slug: string;
  display_order: number;
  is_active: boolean;
  items_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateMenuCategoryData {
  branch_id: number;
  name: string;
  slug: string;
  display_order?: number;
  is_active?: boolean;
}

export interface UpdateMenuCategoryData extends Partial<CreateMenuCategoryData> {}

export const menuCategoryService = {
  /**
   * Get all menu categories
   */
  getCategories: (params?: { is_active?: boolean; branch_id?: number }): Promise<{ data: MenuCategory[] }> => {
    return apiClient.get('/menu-categories', { params });
  },

  /**
   * Get single menu category by ID
   */
  getCategory: (id: number): Promise<{ data: MenuCategory }> => {
    return apiClient.get(`/admin/menu-categories/${id}`);
  },

  /**
   * Create a new menu category
   */
  createCategory: (data: CreateMenuCategoryData): Promise<{ data: MenuCategory }> => {
    return apiClient.post('/admin/menu-categories', data);
  },

  /**
   * Update an existing menu category
   */
  updateCategory: (id: number, data: UpdateMenuCategoryData): Promise<{ data: MenuCategory }> => {
    return apiClient.patch(`/admin/menu-categories/${id}`, data);
  },

  /**
   * Delete a menu category
   */
  deleteCategory: (id: number): Promise<void> => {
    return apiClient.delete(`/admin/menu-categories/${id}`);
  },
};