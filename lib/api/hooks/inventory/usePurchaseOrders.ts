/**
 * lib/api/hooks/inventory/usePurchaseOrders.ts
 *
 * TanStack Query hooks for the Purchase Order workflow.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPurchaseOrders,
  getPurchaseOrder,
  verifyPurchaseOrder,
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

// Keep the list/detail live even when Reverb broadcasts don't arrive: poll while
// the tab is focused and refetch when it regains focus, so a status change (e.g.
// pending_approval → sent) surfaces on its own without a manual page refresh.
// useInventoryRealtime(), mounted in the inventory layout, layers the instant
// WebSocket path on top of this for every screen in the portal.
const PO_REFETCH_INTERVAL = 10_000;

export function usePurchaseOrders(filters?: PurchaseOrderFilters) {
  return useQuery({
    queryKey: ['inventory', 'purchase-orders', filters ?? null],
    queryFn: () => getPurchaseOrders(filters),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: PO_REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
  });
}

export function usePurchaseOrder(id: number) {
  return useQuery({
    queryKey: ['inventory', 'purchase-orders', id],
    queryFn: () => getPurchaseOrder(id),
    enabled: id > 0,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: PO_REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
  });
}

/** Verify a PO by its QR/verification code. */
export function usePurchaseOrderVerification(code: string) {
  return useQuery({
    queryKey: ['inventory', 'purchase-orders', 'verify', code],
    queryFn: () => verifyPurchaseOrder(code),
    enabled: code.length > 0,
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
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
