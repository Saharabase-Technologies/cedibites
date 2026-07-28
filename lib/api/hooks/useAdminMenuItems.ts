import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { menuService } from '../services/menu.service';
import { apiMenuItemToDisplayItem, type DisplayMenuItem } from '../adapters/menu.adapter';

/**
 * The admin catalogue — one row per dish, company-wide.
 *
 * Not `useMenuItems`, which reads the public storefront endpoint. That one is
 * unauthenticated, cannot grow admin-only fields without changing the customer
 * payload, and filters by branch through servedAt() — so now that every branch
 * serves every dish it returns the same list whatever branch you ask for.
 */
export function useAdminMenuItems() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-menu-items'],
    queryFn: () => menuService.getAdminItems(),
    staleTime: 60 * 1000,
  });

  const items = useMemo(
    (): DisplayMenuItem[] => (data?.data ?? []).map(apiMenuItemToDisplayItem),
    [data],
  );

  return { items, isLoading, error, refetch };
}
