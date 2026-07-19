/**
 * lib/api/hooks/inventory/useTransfers.ts
 *
 * TanStack Query hooks for the stock-transfer workflow.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTransfers,
  getTransfer,
  createTransfer,
  updateTransfer,
  submitTransfer,
  approveTransfer,
  sendTransfer,
  receiveTransfer,
  resolveTransferDispute,
  cancelTransfer,
} from '../../services/inventory/transfers.service';
import type {
  InventoryTransferFilters,
  CreateTransferPayload,
  UpdateTransferPayload,
  SubmitTransferPayload,
  SendTransferPayload,
  ReceiveTransferPayload,
  CancelTransferPayload,
  ResolveTransferDisputePayload,
} from '@/types/inventory';

const KEY = ['inventory', 'transfers'] as const;

export function useTransfers(filters?: InventoryTransferFilters) {
  return useQuery({
    queryKey: [...KEY, filters ?? null],
    queryFn: () => getTransfers(filters),
    staleTime: 30_000,
  });
}

export function useTransfer(id: number) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => getTransfer(id),
    enabled: id > 0,
    staleTime: 30_000,
  });
}

export function useCreateTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTransferPayload) => createTransfer(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useUpdateTransfer(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateTransferPayload) => updateTransfer(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useSubmitTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload?: SubmitTransferPayload }) =>
      submitTransfer(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useApproveTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => approveTransfer(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useSendTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload?: SendTransferPayload }) =>
      sendTransfer(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useReceiveTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload?: ReceiveTransferPayload }) =>
      receiveTransfer(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useResolveTransferDispute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload?: ResolveTransferDisputePayload }) =>
      resolveTransferDispute(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useCancelTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CancelTransferPayload }) =>
      cancelTransfer(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}
