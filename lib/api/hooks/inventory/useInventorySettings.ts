/**
 * lib/api/hooks/inventory/useInventorySettings.ts
 *
 * The wastage threshold, and only that. Read by anyone, written by an admin
 * holding `inventory.settings.manage`.
 *
 * The IMS staff-role hooks that used to live here (useImsStaff /
 * useAssignImsRole / useRemoveImsRole) are gone: they called `/inventory/staff`,
 * which has never existed. IMS access is granted through the ordinary staff-role
 * system in the admin portal.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getInventorySettings,
  updateInventorySettings,
} from '../../services/inventory/settings.service';
import type { UpdateInventorySettingsPayload } from '@/types/inventory';

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

