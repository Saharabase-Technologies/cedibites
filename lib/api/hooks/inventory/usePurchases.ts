/**
 * lib/api/hooks/inventory/usePurchases.ts
 *
 * TanStack Query hooks for recorded purchases (receipts).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPurchases,
  getPurchase,
  recordPurchase,
} from '../../services/inventory/purchases.service';
import type { PurchaseFilters, RecordPurchasePayload } from '@/types/inventory';

export function usePurchases(filters?: PurchaseFilters) {
  return useQuery({
    queryKey: ['inventory', 'purchases', filters ?? null],
    queryFn: () => getPurchases(filters),
    staleTime: 30_000,
  });
}

export function usePurchase(id: number) {
  return useQuery({
    queryKey: ['inventory', 'purchases', id],
    queryFn: () => getPurchase(id),
    enabled: id > 0,
    staleTime: 30_000,
  });
}

export function useRecordPurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RecordPurchasePayload) => recordPurchase(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'purchases'] });
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'purchase-orders'] });
    },
  });
}
