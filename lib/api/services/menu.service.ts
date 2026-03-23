import apiClient from '../client';
import { MenuItem } from '@/types/api';

export interface MenuItemsParams {
  category_id?: number;
  search?: string;
  is_available?: boolean;
  branch_id?: number;
  per_page?: number;
}

export interface CreateMenuItemData {
  branch_id: number;
  category_id?: number;
  name: string;
  slug: string;
  description?: string;
  is_available?: boolean;
  tag_ids?: number[];
  add_on_ids?: number[];
  pricing_type?: 'simple' | 'options';
  price?: number;
}

export interface UpdateMenuItemData extends Partial<CreateMenuItemData> {}

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

  /**
   * Create a new menu item
   */
  createItem: (data: CreateMenuItemData): Promise<{ data: MenuItem }> => {
    return apiClient.post('/admin/menu-items', data);
  },

  /**
   * Update an existing menu item
   */
  updateItem: (id: number, data: UpdateMenuItemData): Promise<{ data: MenuItem }> => {
    return apiClient.patch(`/admin/menu-items/${id}`, data);
  },

  /**
   * Preview bulk import from CSV
   */
  bulkImportPreview: (csvFile: File, branchId: number): Promise<{ data: { 
    total_rows: number; 
    valid_rows: number; 
    invalid_rows: number; 
    skipped_rows: number; 
    preview: Array<{
      row: number;
      name: string;
      category: string;
      description: string;
      price: number | null;
      is_available: boolean;
      is_popular: boolean;
      status: 'valid' | 'invalid';
      errors: string[];
    }>;
    can_import: boolean;
  } }> => {
    const formData = new FormData();
    formData.append('csv_file', csvFile);
    formData.append('branch_id', branchId.toString());
    
    return apiClient.post('/admin/menu-items/bulk-import-preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Bulk import menu items from CSV
   */
  bulkImport: (csvFile: File, branchId: number): Promise<{ data: { 
    imported: number; 
    skipped: number; 
    failed: number; 
    total_processed: number;
    validation_failures: Array<{
      row: number;
      attribute: string;
      errors: string[];
      values: any;
    }>;
    errors: Array<{
      message: string;
      line?: number;
    }>;
  } }> => {
    const formData = new FormData();
    formData.append('csv_file', csvFile);
    formData.append('branch_id', branchId.toString());
    
    return apiClient.post('/admin/menu-items/bulk-import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Upload image for menu item
   */
  uploadImage: (id: number, imageFile: File): Promise<{ data: MenuItem }> => {
    const formData = new FormData();
    formData.append('image', imageFile);

    return apiClient.post(`/admin/menu-items/${id}/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  uploadOptionImage: (menuItemId: number, optionId: number, imageFile: File): Promise<{ data: MenuItem }> => {
    const formData = new FormData();
    formData.append('image', imageFile);

    return apiClient.post(`/admin/menu-items/${menuItemId}/options/${optionId}/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Delete a menu item
   */
  deleteItem: (id: number): Promise<void> => {
    return apiClient.delete(`/admin/menu-items/${id}`);
  },
};
