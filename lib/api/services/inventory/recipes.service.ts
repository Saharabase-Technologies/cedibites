/**
 * lib/api/services/inventory/recipes.service.ts
 *
 * Recipe / BOM service. Live against the Laravel IMS backend
 * (`/inventory/recipes`). Recipes are keyed per menu-item option and drive
 * automatic stock deduction when an order is paid.
 */

import apiClient from '../../client';
import type {
  InventoryRecipe,
  CreateRecipePayload,
  UpdateRecipePayload,
} from '@/types/inventory';

/** Unwrap the API envelope ({ data: ... }), tolerating a raw body. */
function extractData<T>(response: unknown): T {
  const r = response as { data?: T };
  return (r?.data ?? response) as T;
}

export interface RecipeFilters {
  menu_item_option_id?: number;
  branch_id?: number;
  global_only?: boolean;
}

export async function getInventoryRecipes(filters?: RecipeFilters): Promise<InventoryRecipe[]> {
  const response = await apiClient.get('/inventory/recipes', { params: filters });
  return extractData<InventoryRecipe[]>(response);
}

export async function getInventoryRecipe(id: number): Promise<InventoryRecipe> {
  const response = await apiClient.get(`/inventory/recipes/${id}`);
  return extractData<InventoryRecipe>(response);
}

export async function createRecipe(payload: CreateRecipePayload): Promise<InventoryRecipe> {
  const response = await apiClient.post('/inventory/recipes', payload);
  return extractData<InventoryRecipe>(response);
}

export async function updateRecipe(id: number, payload: UpdateRecipePayload): Promise<InventoryRecipe> {
  const response = await apiClient.patch(`/inventory/recipes/${id}`, payload);
  return extractData<InventoryRecipe>(response);
}

export async function deleteRecipe(id: number): Promise<void> {
  await apiClient.delete(`/inventory/recipes/${id}`);
}

export async function lockRecipe(id: number): Promise<InventoryRecipe> {
  const response = await apiClient.post(`/inventory/recipes/${id}/lock`);
  return extractData<InventoryRecipe>(response);
}
