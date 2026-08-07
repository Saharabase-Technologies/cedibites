/**
 * lib/api/hooks/inventory/useInventoryLocations.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getInventoryLocations,
  getInventoryLocation,
  createInventoryLocation,
} from '../../services/inventory/locations.service';
import type {
  InventoryLocationFilters,
  CreateInventoryLocationPayload,
} from '@/types/inventory';

export function useInventoryLocations(filters?: InventoryLocationFilters) {
  return useQuery({
    queryKey: ['inventory', 'locations', filters ?? null],
    queryFn: () => getInventoryLocations(filters),
    staleTime: 5 * 60_000,
  });
}

export function useInventoryLocation(id: number) {
  return useQuery({
    queryKey: ['inventory', 'locations', id],
    queryFn: () => getInventoryLocation(id),
    enabled: id > 0,
    staleTime: 5 * 60_000,
  });
}

export function useCreateInventoryLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateInventoryLocationPayload) => createInventoryLocation(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'locations'] });
    },
  });
}
