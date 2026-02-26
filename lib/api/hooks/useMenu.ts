import { useQuery } from '@tanstack/react-query';
import { menuService } from '../services/menu.service';
import type { MenuItemsParams } from '../services/menu.service';

export const useMenu = (params?: MenuItemsParams) => {
  const {
    data: menuData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['menu-items', params],
    queryFn: () => menuService.getItems(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    items: menuData?.data || [],
    isLoading,
    error,
    refetch,
  };
};

export const useMenuItem = (id: number) => {
  const {
    data: itemData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['menu-item', id],
    queryFn: () => menuService.getItem(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    item: itemData?.data,
    isLoading,
    error,
  };
};
