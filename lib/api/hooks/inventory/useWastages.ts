/**
 * lib/api/hooks/inventory/useWastages.ts
 *
 * TanStack Query hooks for the wastage workflow.
 *
 * Approving or rejecting a claim can move stock and can settle a return
 * transfer, so the mutations invalidate items and transfers alongside wastages —
 * otherwise the branch's stock figures sit stale behind a write-off that has
 * already happened.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWastages,
  getWastage,
  getWastageReasons,
  recordWastage,
  approveWastage,
  rejectWastage,
  cancelWastage,
  addWastagePhoto,
  removeWastagePhoto,
} from '../../services/inventory/wastages.service';
import type { WastageFilters, RecordWastagePayload } from '@/types/inventory';

const KEY = ['inventory', 'wastages'] as const;

export function useWastages(filters?: WastageFilters) {
  return useQuery({
    queryKey: [...KEY, filters ?? null],
    queryFn: () => getWastages(filters),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

export function useWastage(id: number) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => getWastage(id),
    enabled: id > 0,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

/**
 * The reason list + threshold. Rarely changes, so unlike the documents above it
 * is allowed to sit in cache for the session.
 */
export function useWastageReasons() {
  return useQuery({
    queryKey: [...KEY, 'reasons'],
    queryFn: getWastageReasons,
    staleTime: 30 * 60 * 1000,
  });
}

/** Invalidate everything a write-off can move. */
function useWastageInvalidation() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: KEY });
    void queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });
    void queryClient.invalidateQueries({ queryKey: ['inventory', 'transfers'] });
    void queryClient.invalidateQueries({ queryKey: ['inventory', 'attention'] });
  };
}

export function useRecordWastage() {
  const invalidate = useWastageInvalidation();
  return useMutation({
    mutationFn: (payload: RecordWastagePayload) => recordWastage(payload),
    onSuccess: invalidate,
  });
}

export function useApproveWastage() {
  const invalidate = useWastageInvalidation();
  return useMutation({
    mutationFn: (id: number) => approveWastage(id),
    onSuccess: invalidate,
  });
}

export function useRejectWastage() {
  const invalidate = useWastageInvalidation();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => rejectWastage(id, reason),
    onSuccess: invalidate,
  });
}

export function useCancelWastage() {
  const invalidate = useWastageInvalidation();
  return useMutation({
    mutationFn: (id: number) => cancelWastage(id),
    onSuccess: invalidate,
  });
}

/**
 * Evidence mutations only touch the wastage itself — no stock moves — so they
 * invalidate the narrow key rather than the whole write-off fan-out.
 */
export function useAddWastagePhoto(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, caption }: { file: File; caption?: string }) =>
      addWastagePhoto(id, file, caption),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useRemoveWastagePhoto(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photoId: number) => removeWastagePhoto(id, photoId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}
