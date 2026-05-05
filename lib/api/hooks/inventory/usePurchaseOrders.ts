/**
 * lib/api/hooks/inventory/usePurchaseOrders.ts
 *
 * TanStack Query hooks for the Purchase Order workflow.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  submitPurchaseOrder,
  approvePurchaseOrder,
  cancelPurchaseOrder,
  closePurchaseOrder,
} from '../../services/inventory/purchaseOrders.service';
import type {
  PurchaseOrderFilters,
  CreatePurchaseOrderPayload,
  UpdatePurchaseOrderPayload,
  ApprovePurchaseOrderPayload,
  CancelPurchaseOrderPayload,
} from '@/types/inventory';

export function usePurchaseOrders(filters?: PurchaseOrderFilters) {
  return useQuery({
    queryKey: ['inventory', 'purchase-orders', filters ?? null],
    queryFn: () => getPurchaseOrders(filters),
    staleTime: 30_000,
  });
}

export function usePurchaseOrder(id: number) {
  return useQuery({
    queryKey: ['inventory', 'purchase-orders', id],
    queryFn: () => getPurchaseOrder(id),
    enabled: id > 0,
    staleTime: 30_000,
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePurchaseOrderPayload) => createPurchaseOrder(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'purchase-orders'] });
    },
  });
}

export function useUpdatePurchaseOrder(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdatePurchaseOrderPayload) => updatePurchaseOrder(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'purchase-orders'] });
    },
  });
}

export function useSubmitPurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => submitPurchaseOrder(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'purchase-orders'] });
    },
  });
}

export function useApprovePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload?: ApprovePurchaseOrderPayload }) =>
      approvePurchaseOrder(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'purchase-orders'] });
    },
  });
}

export function useCancelPurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CancelPurchaseOrderPayload }) =>
      cancelPurchaseOrder(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'purchase-orders'] });
    },
  });
}

export function useClosePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => closePurchaseOrder(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'purchase-orders'] });
    },
  });
}
