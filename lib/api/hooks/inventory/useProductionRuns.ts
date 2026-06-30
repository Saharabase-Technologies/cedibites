/**
 * lib/api/hooks/inventory/useProductionRuns.ts
 *
 * TanStack Query hooks for mother-kitchen production runs.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProductionRuns,
  recordProductionRun,
  type ProductionRunFilters,
} from '../../services/inventory/productionRuns.service';
import type { RecordProductionPayload } from '@/types/inventory';

export function useProductionRuns(filters?: ProductionRunFilters) {
  return useQuery({
    queryKey: ['inventory', 'production-runs', filters ?? null],
    queryFn: () => getProductionRuns(filters),
    staleTime: 30_000,
  });
}

export function useRecordProductionRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RecordProductionPayload) => recordProductionRun(payload),
    onSuccess: () => {
      // Balances changed (inputs down, output up) → refresh items + the log list.
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'production-runs'] });
    },
  });
}
