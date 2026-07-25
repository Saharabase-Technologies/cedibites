/**
 * lib/api/hooks/inventory/useRequisitions.ts
 *
 * TanStack Query hooks for the stock-requisition workflow.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRequisitions,
  getRequisition,
  createRequisition,
  updateRequisition,
  submitRequisition,
  approveRequisition,
  rejectRequisition,
} from '../../services/inventory/requisitions.service';
import type {
  InventoryRequisitionFilters,
  CreateRequisitionPayload,
  UpdateRequisitionPayload,
  ApproveRequisitionPayload,
  RejectRequisitionPayload,
} from '@/types/inventory';

const KEY = ['inventory', 'requisitions'] as const;

export function useRequisitions(filters?: InventoryRequisitionFilters) {
  return useQuery({
    queryKey: [...KEY, filters ?? null],
    queryFn: () => getRequisitions(filters),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

export function useRequisition(id: number) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => getRequisition(id),
    enabled: id > 0,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

export function useCreateRequisition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRequisitionPayload) => createRequisition(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useUpdateRequisition(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateRequisitionPayload) => updateRequisition(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useSubmitRequisition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => submitRequisition(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useApproveRequisition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload?: ApproveRequisitionPayload }) =>
      approveRequisition(id, payload),
    onSuccess: () => {
      // Approval spawns a transfer, so refresh both lists.
      void queryClient.invalidateQueries({ queryKey: KEY });
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'transfers'] });
    },
  });
}

export function useRejectRequisition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: RejectRequisitionPayload }) =>
      rejectRequisition(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}
