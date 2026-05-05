/**
 * lib/api/hooks/inventory/useInventorySettings.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getInventorySettings,
  updateInventorySettings,
  getImsStaff,
  assignImsRole,
  removeImsRole,
} from '../../services/inventory/settings.service';
import type { UpdateInventorySettingsPayload, AssignImsRolePayload } from '@/types/inventory';

export function useInventorySettings() {
  return useQuery({
    queryKey: ['inventory', 'settings'],
    queryFn: getInventorySettings,
    staleTime: 5 * 60_000,
  });
}

export function useUpdateInventorySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateInventorySettingsPayload) => updateInventorySettings(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'settings'] });
    },
  });
}

export function useImsStaff() {
  return useQuery({
    queryKey: ['inventory', 'ims-staff'],
    queryFn: getImsStaff,
    staleTime: 5 * 60_000,
  });
}

export function useAssignImsRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AssignImsRolePayload) => assignImsRole(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'ims-staff'] });
    },
  });
}

export function useRemoveImsRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => removeImsRole(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'ims-staff'] });
    },
  });
}
