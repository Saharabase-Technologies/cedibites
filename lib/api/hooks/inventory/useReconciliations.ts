/**
 * lib/api/hooks/inventory/useReconciliations.ts
 *
 * TanStack Query hooks for the stock-take reconciliation workflow.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getReconciliations,
  getReconciliation,
  openReconciliation,
  saveReconciliation,
  postReconciliation,
} from '../../services/inventory/reconciliations.service';
import type {
  InventoryReconciliationFilters,
  OpenReconciliationPayload,
  SaveReconciliationPayload,
  PostReconciliationPayload,
} from '@/types/inventory';

const KEY = ['inventory', 'reconciliations'] as const;

export function useReconciliations(filters?: InventoryReconciliationFilters) {
  return useQuery({
    queryKey: [...KEY, filters ?? null],
    queryFn: () => getReconciliations(filters),
    staleTime: 30_000,
  });
}

export function useReconciliation(id: number) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => getReconciliation(id),
    enabled: id > 0,
    staleTime: 30_000,
  });
}

export function useOpenReconciliation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: OpenReconciliationPayload) => openReconciliation(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useSaveReconciliation(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveReconciliationPayload) => saveReconciliation(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function usePostReconciliation(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload?: PostReconciliationPayload) => postReconciliation(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
      // Posting rewrites stock balances → refresh items + item detail/movements.
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });
    },
  });
}
