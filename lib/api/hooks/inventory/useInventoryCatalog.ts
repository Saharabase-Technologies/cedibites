/**
 * lib/api/hooks/inventory/useInventoryCatalog.ts
 *
 * TanStack Query hooks for inventory catalog data —
 * items, categories, units, and suppliers.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getInventoryItems,
  getInventoryItem,
  getInventoryItemMovements,
  recordConsumption,
  createInventoryItem,
  updateInventoryItem,
  getInventoryCategories,
  createInventoryCategory,
  getInventoryUnits,
  createInventoryUnit,
  getInventorySuppliers,
  createInventorySupplier,
} from '../../services/inventory/catalog.service';
import type {
  InventoryItemFilters,
  CreateInventoryItemPayload,
  UpdateInventoryItemPayload,
  RecordConsumptionPayload,
  CreateInventoryCategoryPayload,
  CreateInventoryUnitPayload,
  CreateInventorySupplierPayload,
} from '@/types/inventory';

// ─── Items ────────────────────────────────────────────────────────────────────

export function useInventoryItems(filters?: InventoryItemFilters) {
  return useQuery({
    queryKey: ['inventory', 'items', filters ?? null],
    queryFn: () => getInventoryItems(filters),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

export function useInventoryItem(id: number) {
  return useQuery({
    queryKey: ['inventory', 'items', id],
    queryFn: () => getInventoryItem(id),
    enabled: id > 0,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

export function useInventoryItemMovements(id: number) {
  return useQuery({
    queryKey: ['inventory', 'items', id, 'movements'],
    queryFn: () => getInventoryItemMovements(id),
    enabled: id > 0,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateInventoryItemPayload) => createInventoryItem(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });
    },
  });
}

export function useUpdateInventoryItem(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateInventoryItemPayload) => updateInventoryItem(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });
    },
  });
}

export function useRecordConsumption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RecordConsumptionPayload) => recordConsumption(payload),
    onSuccess: () => {
      // Refreshes the items list and any open item detail/movement history.
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });
    },
  });
}

// ─── Categories ───────────────────────────────────────────────────────────────

export function useInventoryCategories() {
  return useQuery({
    queryKey: ['inventory', 'categories'],
    queryFn: getInventoryCategories,
    staleTime: 5 * 60_000,
  });
}

export function useCreateInventoryCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateInventoryCategoryPayload) => createInventoryCategory(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'categories'] });
    },
  });
}

// ─── Units ────────────────────────────────────────────────────────────────────

export function useInventoryUnits() {
  return useQuery({
    queryKey: ['inventory', 'units'],
    queryFn: getInventoryUnits,
    staleTime: 10 * 60_000,
  });
}

export function useCreateInventoryUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateInventoryUnitPayload) => createInventoryUnit(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'units'] });
    },
  });
}

// ─── Suppliers ────────────────────────────────────────────────────────────────

export function useInventorySuppliers() {
  return useQuery({
    queryKey: ['inventory', 'suppliers'],
    queryFn: getInventorySuppliers,
    staleTime: 5 * 60_000,
  });
}

export function useCreateInventorySupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateInventorySupplierPayload) => createInventorySupplier(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inventory', 'suppliers'] });
    },
  });
}
