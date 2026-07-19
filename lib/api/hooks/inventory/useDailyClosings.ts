/**
 * lib/api/hooks/inventory/useDailyClosings.ts
 *
 * TanStack Query hooks for the daily-closing (end-of-day count) workflow.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDailyClosings,
  getDailyClosing,
  getClosingCalendar,
  openDailyClosing,
  saveDailyClosing,
} from '../../services/inventory/dailyClosings.service';
import type {
  InventoryDailyClosingFilters,
  OpenDailyClosingPayload,
  SaveDailyClosingPayload,
} from '@/types/inventory';

const KEY = ['inventory', 'daily-closings'] as const;

export function useDailyClosings(filters?: InventoryDailyClosingFilters) {
  return useQuery({
    queryKey: [...KEY, filters ?? null],
    queryFn: () => getDailyClosings(filters),
    staleTime: 30_000,
  });
}

export function useDailyClosing(id: number) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => getDailyClosing(id),
    enabled: id > 0,
    staleTime: 30_000,
  });
}

export function useClosingCalendar(
  locationId: number,
  from: string,
  to: string,
  enabled = true,
) {
  return useQuery({
    queryKey: [...KEY, 'calendar', locationId, from, to],
    queryFn: () => getClosingCalendar(locationId, from, to),
    enabled: enabled && locationId > 0 && !!from && !!to,
    staleTime: 30_000,
  });
}

export function useOpenDailyClosing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: OpenDailyClosingPayload) => openDailyClosing(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useSaveDailyClosing(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveDailyClosingPayload) => saveDailyClosing(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}
