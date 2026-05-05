/**
 * lib/api/services/inventory/recipes.service.ts
 *
 * Recipe / BOM service.
 */

import apiClient from '../../client';
import { MOCK_RECIPES } from '../../mocks/inventory.mock';
import type { InventoryRecipe } from '@/types/inventory';

const IS_MOCK = process.env.NEXT_PUBLIC_IMS_MOCK === 'true';

function delay<T>(data: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

export async function getInventoryRecipes(
  menuItemId?: number,
  branchId?: number | null,
): Promise<InventoryRecipe[]> {
  if (IS_MOCK) {
    let recipes = [...MOCK_RECIPES];
    if (menuItemId !== undefined) {
      recipes = recipes.filter((r) => r.menu_item_id === menuItemId);
    }
    // null means global defaults; a number means a branch override
    if (branchId !== undefined) {
      recipes = recipes.filter((r) => r.branch_id === branchId);
    }
    return delay(recipes);
  }

  const { data } = await apiClient.get<InventoryRecipe[]>('/v1/inventory/recipes', {
    params: {
      ...(menuItemId !== undefined && { menu_item_id: menuItemId }),
      ...(branchId !== undefined && { branch_id: branchId ?? 'null' }),
    },
  });
  return data;
}

export async function getInventoryRecipe(id: number): Promise<InventoryRecipe> {
  if (IS_MOCK) {
    const recipe = MOCK_RECIPES.find((r) => r.id === id);
    if (!recipe) throw new Error(`Recipe ${id} not found`);
    return delay(recipe);
  }
  const { data } = await apiClient.get<InventoryRecipe>(`/v1/inventory/recipes/${id}`);
  return data;
}
