'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { BellIcon, XIcon, CheckCircleIcon, XCircleIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useEmployeeOrders } from '@/lib/api/hooks/useEmployeeOrders';
import { mapApiOrderToAdminOrder } from '@/lib/api/adapters/order.adapter';
import type { AdminOrder } from '@/lib/api/adapters/order.adapter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { toast } from '@/lib/utils/toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CancelRequestOrder {
  dbId: number;
  id: string;
  customer: string;
  phone: string;
  branch: string;
  amount: number;
  cancelRequestReason: string | null;
  cancelRequestedBy: string | null;
  cancelRequestedAt: string | null;
  placedAt: string;
  timeAgo?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatGHS(v: number): string {
  return `₵${v.toFixed(2)}`;
}

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CancelRequestsBell({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch only cancel_requested orders
  const { orders: rawOrders, isLoading } = useEmployeeOrders({
    status: 'cancel_requested',
    per_page: 50,
  });

  const cancelRequests: CancelRequestOrder[] = (rawOrders ?? []).map((order) => {
    const mapped = mapApiOrderToAdminOrder(order);
    return {
      dbId: mapped.dbId,
      id: mapped.id,
      customer: mapped.customer,
      phone: mapped.phone,
      branch: mapped.branch,
      amount: mapped.amount,
      cancelRequestReason: mapped.cancelRequestReason ?? null,
      cancelRequestedBy: mapped.cancelRequestedBy ?? null,
      cancelRequestedAt: mapped.cancelRequestedAt ?? null,
      placedAt: mapped.placedAt,
      timeAgo: mapped.cancelRequestedAt ? timeAgo(mapped.cancelRequestedAt) : undefined,
    };
  });

  const count = cancelRequests.length;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (orderId: number) => apiClient.post(`/admin/orders/${orderId}/approve-cancel`),
    onSuccess: () => {
      toast.success('Cancellation approved');
      queryClient.invalidateQueries({ queryKey: ['employee-orders'] });
    },
    onError: () => toast.error('Failed to approve cancellation'),
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: (orderId: number) => apiClient.post(`/admin/orders/${orderId}/reject-cancel`),
    onSuccess: () => {
      toast.success('Cancellation rejected — order restored');
      queryClient.invalidateQueries({ queryKey: ['employee-orders'] });
    },
    onError: () => toast.error('Failed to reject cancellation'),
  });

  return (
    <div ref={panelRef} className={`relative ${className ?? ''}`}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-neutral-light transition-colors cursor-pointer"
        aria-label={`Cancel requests: ${count} pending`}
      >
        <BellIcon size={20} weight={count > 0 ? 'fill' : 'regular'} className={count > 0 ? 'text-orange-500' : 'text-neutral-gray'} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-4.5 h-4.5 px-1 rounded-full bg-error text-white text-[10px] font-bold font-body leading-none animate-pulse">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-95 max-h-120 bg-neutral-card rounded-2xl shadow-2xl border border-[#f0e8d8] overflow-hidden z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#f0e8d8]">
            <div className="flex items-center gap-2">
              <WarningCircleIcon size={16} weight="fill" className="text-orange-500" />
              <span className="text-text-dark text-sm font-bold font-body">Cancel Requests</span>
              {count > 0 && (
                <span className="text-[10px] font-bold font-body text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-neutral-light transition-colors cursor-pointer"
            >
              <XIcon size={14} className="text-neutral-gray" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {isLoading && (
              <div className="py-8 text-center">
                <p className="text-neutral-gray text-xs font-body">Loading...</p>
              </div>
            )}

            {!isLoading && count === 0 && (
              <div className="py-10 text-center">
                <BellIcon size={32} weight="light" className="mx-auto text-neutral-gray/40 mb-2" />
                <p className="text-neutral-gray text-xs font-body">No pending cancel requests</p>
              </div>
            )}

            {!isLoading && cancelRequests.map((req) => (
              <div
                key={req.dbId}
                className="px-4 py-3 border-b border-[#f0e8d8] last:border-b-0 hover:bg-neutral-light/50 transition-colors"
              >
                {/* Order info row */}
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <span className="text-text-dark text-xs font-bold font-body">#{req.id}</span>
                    <span className="text-neutral-gray text-[10px] font-body ml-2">{req.branch}</span>
                  </div>
                  <span className="text-primary text-xs font-bold font-body">{formatGHS(req.amount)}</span>
                </div>

                {/* Customer */}
                <p className="text-text-dark text-xs font-body">{req.customer}</p>

                {/* Reason */}
                {req.cancelRequestReason && (
                  <p className="text-neutral-gray text-[11px] font-body mt-1 italic line-clamp-2">
                    &ldquo;{req.cancelRequestReason}&rdquo;
                  </p>
                )}

                {/* Meta */}
                <div className="flex items-center gap-2 mt-1.5 text-[10px] font-body text-neutral-gray">
                  {req.cancelRequestedBy && <span>By: {req.cancelRequestedBy}</span>}
                  {req.timeAgo && <span>· {req.timeAgo}</span>}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-2.5">
                  <button
                    type="button"
                    onClick={() => approveMutation.mutate(req.dbId)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-error/10 text-error text-xs font-medium font-body hover:bg-error/20 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircleIcon size={14} weight="bold" />
                    Approve Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => rejectMutation.mutate(req.dbId)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary/10 text-secondary text-xs font-medium font-body hover:bg-secondary/20 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <XCircleIcon size={14} weight="bold" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
