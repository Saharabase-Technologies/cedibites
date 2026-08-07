import { useQuery } from '@tanstack/react-query';
import { menuService } from '../services/menu.service';

/**
 * Fetches smart categories (computed virtual categories) for a branch.
 *
 * Smart categories are code-defined on the backend — their membership
 * is computed from order data, ratings, timestamps, etc.
 * Results are cached server-side and refresh every 6 hours.
 */
export const useSmartCategories = (branchId?: number) => {
  const {
    data: smartCategoryData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['smart-categories', branchId],
    queryFn: () => menuService.getSmartCategories(branchId!),
    enabled: !!branchId,
    staleTime: 10 * 60 * 1000, // 10 minutes — server caches for 6 hours
  });

  return {
    smartCategories: smartCategoryData?.data || [],
    isLoading,
    error,
  };
};
