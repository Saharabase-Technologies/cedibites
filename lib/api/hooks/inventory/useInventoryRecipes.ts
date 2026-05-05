/**
 * lib/api/hooks/inventory/useInventoryRecipes.ts
 */

import { useQuery } from '@tanstack/react-query';
import { getInventoryRecipes, getInventoryRecipe } from '../../services/inventory/recipes.service';

export function useInventoryRecipes(menuItemId?: number, branchId?: number | null) {
  return useQuery({
    queryKey: ['inventory', 'recipes', menuItemId ?? null, branchId ?? null],
    queryFn: () => getInventoryRecipes(menuItemId, branchId),
    staleTime: 5 * 60_000,
  });
}

export function useInventoryRecipe(id: number) {
  return useQuery({
    queryKey: ['inventory', 'recipes', id],
    queryFn: () => getInventoryRecipe(id),
    enabled: id > 0,
    staleTime: 5 * 60_000,
  });
}
