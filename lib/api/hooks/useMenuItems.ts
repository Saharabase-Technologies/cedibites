import { useMemo } from 'react';
import { useMenu } from './useMenu';
import { useMenuCategories } from './useMenuCategories';
import {
  apiMenuItemToDisplayItem,
  type DisplayMenuItem,
  type DisplayMenuCategory,
} from '../adapters/menu.adapter';

/**
 * Fetches menu items from API and returns them in display format
 * for POS, new-order, staff store, admin menu, etc.
 */
export function useMenuItems(params?: { branch_id?: number; is_available?: boolean }) {
  const { items: apiItems, isLoading: itemsLoading, error: itemsError, refetch: refetchItems } = useMenu({
    ...params,
    per_page: 500,
  });

  const { data: apiCategories, isLoading: categoriesLoading, error: categoriesError, refetch: refetchCategories } = useMenuCategories({
    is_active: true,
    branch_id: params?.branch_id,
  });

  const displayItems = useMemo(
    (): DisplayMenuItem[] => apiItems.map(apiMenuItemToDisplayItem),
    [apiItems]
  );

  const categories = useMemo((): DisplayMenuCategory[] => {
    if (!apiCategories) return [{ id: 'all', name: 'All' }];
    
    const backendCategories: DisplayMenuCategory[] = apiCategories.map(cat => ({
      id: cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-'),
      name: cat.name,
    }));

    // Add "All" category at the beginning
    return [{ id: 'all', name: 'All' }, ...backendCategories];
  }, [apiCategories]);

  const isLoading = itemsLoading || categoriesLoading;
  const error = itemsError || categoriesError;

  const refetch = () => {
    refetchItems();
    refetchCategories();
  };

  return {
    items: displayItems,
    categories,
    isLoading,
    error,
    refetch,
  };
}
