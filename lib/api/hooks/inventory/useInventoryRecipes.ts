/**
 * lib/api/hooks/inventory/useInventoryRecipes.ts
 *
 * TanStack Query hooks for recipes / BOM (live against the IMS backend).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getInventoryRecipes,
  getInventoryRecipe,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  lockRecipe,
  type RecipeFilters,
} from '../../services/inventory/recipes.service';
import type { CreateRecipePayload, UpdateRecipePayload } from '@/types/inventory';

export function useInventoryRecipes(filters?: RecipeFilters) {
  return useQuery({
    queryKey: ['inventory', 'recipes', filters ?? null],
    queryFn: () => getInventoryRecipes(filters),
    staleTime: 60_000,
  });
}

export function useInventoryRecipe(id: number) {
  return useQuery({
    queryKey: ['inventory', 'recipes', id],
    queryFn: () => getInventoryRecipe(id),
    enabled: id > 0,
    staleTime: 60_000,
  });
}

function useInvalidateRecipes() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['inventory', 'recipes'] });
}

export function useCreateRecipe() {
  const invalidate = useInvalidateRecipes();
  return useMutation({
    mutationFn: (payload: CreateRecipePayload) => createRecipe(payload),
    onSuccess: () => void invalidate(),
  });
}

export function useUpdateRecipe(id: number) {
  const invalidate = useInvalidateRecipes();
  return useMutation({
    mutationFn: (payload: UpdateRecipePayload) => updateRecipe(id, payload),
    onSuccess: () => void invalidate(),
  });
}

export function useDeleteRecipe() {
  const invalidate = useInvalidateRecipes();
  return useMutation({
    mutationFn: (id: number) => deleteRecipe(id),
    onSuccess: () => void invalidate(),
  });
}

export function useLockRecipe() {
  const invalidate = useInvalidateRecipes();
  return useMutation({
    mutationFn: (id: number) => lockRecipe(id),
    onSuccess: () => void invalidate(),
  });
}
