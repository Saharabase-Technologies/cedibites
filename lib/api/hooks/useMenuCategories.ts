import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { menuCategoryService, type MenuCategory, type CreateMenuCategoryData, type UpdateMenuCategoryData } from '../services/menuCategory.service';

export function useMenuCategories(params?: { is_active?: boolean; branch_id?: number }) {
  return useQuery({
    queryKey: ['menu-categories', params],
    queryFn: () => menuCategoryService.getCategories(params),
    select: (response) => response.data,
  });
}

export function useMenuCategory(id: number) {
  return useQuery({
    queryKey: ['menu-categories', id],
    queryFn: () => menuCategoryService.getCategory(id),
    select: (response) => response.data,
    enabled: !!id,
  });
}

export function useCreateMenuCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateMenuCategoryData) => menuCategoryService.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categories'] });
    },
  });
}

export function useUpdateMenuCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateMenuCategoryData }) => 
      menuCategoryService.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categories'] });
    },
  });
}

export function useDeleteMenuCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => menuCategoryService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-categories'] });
    },
  });
}