'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useEmployeeOrders } from '@/lib/api/hooks/useEmployeeOrders';
import { useBranches } from '@/lib/api/hooks/useBranches';
import type { AdminOrder } from '@/lib/api/adapters/order.adapter';
import { mapApiOrderToAdminOrder } from '@/lib/api/adapters/order.adapter';
import {
    CaretLeftIcon,
    CaretRightIcon,
    MagnifyingGlassIcon,
    WarningCircleIcon,
    CheckCircleIcon,
    XCircleIcon,
    XIcon,
    PhoneIcon,
    MapPinIcon,
    ArrowsClockwiseIcon,
    BellIcon,
} from '@phosphor-icons/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { toast } from '@/lib/utils/toast';
import { getOrderItemLineLabel } from '@/lib/utils/orderItemDisplay';

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

// ─── Order Detail Drawer ──────────────────────────────────────────────────────

function CancelRequestDrawer({
    order,
    onClose,
}: {
    order: AdminOrder;
    onClose: () => void;
}) {
    const queryClient = useQueryClient();
    const subtotal = order.items.reduce((s, i) => s + i.qty * i.price, 0);

    const approveMutation = useMutation({
        mutationFn: (orderId: number) => apiClient.post(`/admin/orders/${orderId}/approve-cancel`),
        onSuccess: () => {
            toast.success('Cancellation approved');
            queryClient.invalidateQueries({ queryKey: ['employee-orders'] });
            onClose();
        },
        onError: () => toast.error('Failed to approve cancellation'),
    });

    const rejectMutation = useMutation({
        mutationFn: (orderId: number) => apiClient.post(`/admin/orders/${orderId}/reject-cancel`),
        onSuccess: () => {
            toast.success('Cancel request rejected — order restored');
            queryClient.invalidateQueries({ queryKey: ['employee-orders'] });
            onClose();
        },
        onError: () => toast.error('Failed to reject cancellation'),
    });

    const isBusy = approveMutation.isPending || rejectMutation.isPending;

    return (
        <>
            <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm md:hidden" onClick={onClose} />

            <aside className="fixed right-0 top-0 h-full z-40 w-full max-w-md bg-neutral-card border-l border-[#f0e8d8] flex flex-col shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0e8d8]">
                    <div>
                        <p className="text-text-dark text-sm font-bold font-body">#{order.id}</p>
                        <p className="text-neutral-gray text-xs font-body">{order.placedAtFull}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-body font-medium text-orange-600">
                            <span className="h-2 w-2 rounded-full shrink-0 bg-orange-500 animate-pulse" />
                            Cancel Requested
                        </span>
                        <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-light transition-colors cursor-pointer">
                            <XIcon size={16} className="text-neutral-gray" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">

                    {/* Cancel Request Banner */}
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl space-y-2">
                        <div className="flex items-center gap-2">
                            <WarningCircleIcon size={16} weight="fill" className="text-orange-500 shrink-0" />
                            <p className="text-sm font-bold text-orange-700 font-body">Cancellation Requested</p>
                        </div>
                        {order.cancelRequestedBy && (
                            <p className="text-xs text-orange-600 font-body">Requested by: <span className="font-semibold">{order.cancelRequestedBy}</span></p>
                        )}
                        {order.cancelRequestReason && (
                            <p className="text-sm text-text-dark font-body">&ldquo;{order.cancelRequestReason}&rdquo;</p>
                        )}
                        {order.cancelRequestedAt && (
                            <p className="text-xs text-neutral-gray font-body">
                                {new Date(order.cancelRequestedAt).toLocaleString('en-GH', { timeZone: 'Africa/Accra' })} · {timeAgo(order.cancelRequestedAt)}
                            </p>
                        )}
                    </div>

                    {/* Customer */}
                    <div>
                        <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Customer</p>
                        <div className="bg-neutral-light rounded-xl p-3 flex flex-col gap-1.5">
                            <p className="text-text-dark text-sm font-semibold font-body">{order.customer}</p>
                            <a href={`tel:${order.phone}`} className="text-primary text-xs font-body flex items-center gap-1.5 hover:underline">
                                <PhoneIcon size={12} weight="fill" />
                                {order.phone}
                            </a>
                            {order.email && <p className="text-neutral-gray text-xs font-body">{order.email}</p>}
                            {order.address && order.address !== '—' && (
                                <div className="flex items-start gap-1.5 mt-0.5">
                                    <MapPinIcon size={12} weight="fill" className="text-neutral-gray mt-0.5 shrink-0" />
                                    <p className="text-neutral-gray text-xs font-body">{order.address}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Branch + Source */}
                    <div className="flex gap-3">
                        <div className="flex-1 bg-neutral-light rounded-xl p-3">
                            <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1">Branch</p>
                            <p className="text-text-dark text-sm font-semibold font-body">{order.branch}</p>
                        </div>
                        <div className="flex-1 bg-neutral-light rounded-xl p-3">
                            <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1">Source</p>
                            <p className="text-text-dark text-sm font-semibold font-body">{order.source}</p>
                        </div>
                    </div>

                    {/* Staff */}
                    {order.assignedEmployee && (
                        <div>
                            <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Assigned Staff</p>
                            <div className="bg-neutral-light rounded-xl p-3">
                                <p className="text-text-dark text-sm font-semibold font-body">{order.assignedEmployee}</p>
                            </div>
                        </div>
                    )}

                    {/* Items */}
                    <div>
                        <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Items</p>
                        <div className="bg-neutral-light rounded-xl overflow-hidden">
                            {order.items.map((item, i) => (
                                <div key={i} className={`flex justify-between px-3 py-2.5 ${i < order.items.length - 1 ? 'border-b border-[#f0e8d8]' : ''}`}>
                                    <span className="text-text-dark text-xs font-body">{item.qty}× {getOrderItemLineLabel({ name: item.name, sizeLabel: item.sizeLabel })}</span>
                                    <span className="text-text-dark text-xs font-bold font-body">{formatGHS(item.qty * item.price)}</span>
                                </div>
                            ))}
                            <div className="flex justify-between px-3 py-2.5 border-t border-[#f0e8d8] bg-neutral-card">
                                <span className="text-text-dark text-xs font-bold font-body">Total</span>
                                <span className="text-primary text-sm font-bold font-body">{formatGHS(subtotal)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment */}
                    <div>
                        <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Payment</p>
                        <div className="bg-neutral-light rounded-xl p-3 flex flex-col gap-1.5">
                            <div className="flex justify-between">
                                <span className="text-neutral-gray text-xs font-body">Method</span>
                                <span className="text-text-dark text-xs font-semibold font-body">{order.payment}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-neutral-gray text-xs font-body">Status</span>
                                <span className={`text-xs font-semibold font-body capitalize ${
                                    order.paymentStatus === 'paid' ? 'text-secondary' :
                                    order.paymentStatus === 'failed' ? 'text-error' :
                                    order.paymentStatus === 'pending' ? 'text-warning' :
                                    'text-neutral-gray'
                                }`}>
                                    {order.paymentStatus === 'no_charge' ? 'No Charge' : order.paymentStatus}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-neutral-gray text-xs font-body">Order Total</span>
                                <span className="text-text-dark text-xs font-semibold font-body">{formatGHS(order.amount)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-neutral-gray text-xs font-body">Amount Paid</span>
                                <span className="text-primary text-xs font-bold font-body">{formatGHS(order.amountPaid)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    {order.timeline.length > 0 && (
                        <div>
                            <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Timeline</p>
                            <div className="flex flex-col gap-0">
                                {order.timeline.map((ev, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className="flex flex-col items-center">
                                            <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                                            {i < order.timeline.length - 1 && <div className="w-0.5 h-6 bg-[#f0e8d8]" />}
                                        </div>
                                        <div className="pb-3">
                                            <p className="text-text-dark text-xs font-semibold font-body">{ev.status}</p>
                                            <p className="text-neutral-gray text-[10px] font-body">
                                                {ev.at} · {ev.by}{ev.byName ? ` (${ev.byName})` : ''}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Action buttons — fixed at bottom */}
                <div className="border-t border-[#f0e8d8] p-4 flex flex-col gap-3">
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => approveMutation.mutate(order.dbId)}
                            disabled={isBusy}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-error text-white text-sm font-medium font-body hover:bg-error/90 transition-colors cursor-pointer disabled:opacity-50"
                        >
                            <CheckCircleIcon size={16} weight="bold" />
                            Approve Cancellation
                        </button>
                        <button
                            type="button"
                            onClick={() => rejectMutation.mutate(order.dbId)}
                            disabled={isBusy}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-neutral-light text-text-dark text-sm font-medium font-body hover:bg-[#f0e8d8] transition-colors cursor-pointer disabled:opacity-50"
                        >
                            <XCircleIcon size={16} weight="bold" />
                            Reject — Keep Order
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

export default function CancelRequestsPage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
    const [selectedBranch, setSelectedBranch] = useState<string>('all');
    const queryClient = useQueryClient();

    useEffect(() => { setMounted(true); }, []);

    const { branches } = useBranches();

    const { orders: apiOrders, meta, isLoading } = useEmployeeOrders({
        status: 'cancel_requested',
        page: page + 1,
        per_page: PAGE_SIZE,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(selectedBranch !== 'all' && branches.find(b => b.name === selectedBranch)
            ? { branch_id: branches.find(b => b.name === selectedBranch)!.id }
            : {}),
    });

    const orders = useMemo(() => (apiOrders ?? []).map(mapApiOrderToAdminOrder), [apiOrders]);
    const totalPages = (meta as { last_page?: number })?.last_page ?? 1;
    const totalCount = (meta as { total?: number })?.total ?? 0;

    // When an order gets approved/rejected and drawer closes, refresh
    const handleDrawerClose = () => {
        setSelectedOrder(null);
    };

    return (
        <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.push('/admin/orders')}
                        className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-neutral-light transition-colors cursor-pointer"
                    >
                        <CaretLeftIcon size={18} weight="bold" className="text-neutral-gray" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2.5">
                            <WarningCircleIcon size={22} weight="fill" className="text-orange-500" />
                            <h1 className="text-text-dark text-2xl font-bold font-body">Cancel Requests</h1>
                        </div>
                        <p className="text-neutral-gray text-sm font-body mt-0.5 ml-8.5">
                            {totalCount} pending {totalCount === 1 ? 'request' : 'requests'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-4 mb-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-gray" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(0); }}
                            placeholder="Search by order #, customer, phone…"
                            className="w-full pl-9 pr-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body placeholder:text-neutral-gray/60 focus:outline-none focus:border-primary/40"
                        />
                    </div>
                    {/* Branch filter */}
                    {branches.length > 1 && (
                        <select
                            value={selectedBranch}
                            onChange={e => { setSelectedBranch(e.target.value); setPage(0); }}
                            className="px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40 cursor-pointer"
                        >
                            <option value="all">All Branches</option>
                            {branches.map(b => (
                                <option key={b.id} value={b.name}>{b.name}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden mb-4">
                {/* Desktop header */}
                <div className="hidden md:grid grid-cols-[1fr_0.8fr_1.2fr_1.5fr_0.8fr_0.8fr_1fr_0.6fr] gap-3 px-4 py-3 border-b border-[#f0e8d8] bg-[#faf6f0]">
                    {['Order #', 'Branch', 'Customer', 'Reason', 'Amount', 'Requested By', 'Requested At', 'Action'].map(h => (
                        <span key={h} className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-wider">{h}</span>
                    ))}
                </div>

                {!mounted || isLoading ? (
                    <div className="px-4 py-16 text-center">
                        <p className="text-neutral-gray text-sm font-body">Loading cancel requests…</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="px-4 py-16 text-center">
                        <BellIcon size={40} weight="light" className="mx-auto text-neutral-gray/30 mb-3" />
                        <p className="text-neutral-gray text-sm font-body font-medium">No pending cancel requests</p>
                        <p className="text-neutral-gray/60 text-xs font-body mt-1">All caught up!</p>
                    </div>
                ) : (
                    orders.map((order, i) => (
                        <div
                            key={order.dbId}
                            onClick={() => setSelectedOrder(order)}
                            className={`px-4 py-3.5 flex flex-col md:grid md:grid-cols-[1fr_0.8fr_1.2fr_1.5fr_0.8fr_0.8fr_1fr_0.6fr] gap-2 md:gap-3 md:items-center cursor-pointer hover:bg-orange-50/50 transition-colors ${i < orders.length - 1 ? 'border-b border-[#f0e8d8]' : ''}`}
                        >
                            {/* Order # */}
                            <span className="text-text-dark text-sm font-bold font-body">#{order.id}</span>

                            {/* Branch */}
                            <span className="text-text-dark text-xs font-body">{order.branch}</span>

                            {/* Customer */}
                            <div className="min-w-0">
                                <p className="text-text-dark text-xs font-semibold font-body truncate">{order.customer}</p>
                                <p className="text-neutral-gray text-[10px] font-body">{order.phone}</p>
                            </div>

                            {/* Reason */}
                            <p className="text-neutral-gray text-xs font-body italic line-clamp-2 min-w-0">
                                {order.cancelRequestReason ? `"${order.cancelRequestReason}"` : '—'}
                            </p>

                            {/* Amount */}
                            <span className="text-text-dark text-sm font-bold font-body">{formatGHS(order.amount)}</span>

                            {/* Requested By */}
                            <span className="text-text-dark text-xs font-body truncate">{order.cancelRequestedBy ?? '—'}</span>

                            {/* Requested At */}
                            <div className="flex flex-col">
                                <span className="text-neutral-gray text-xs font-body">
                                    {order.cancelRequestedAt ? timeAgo(order.cancelRequestedAt) : '—'}
                                </span>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                                <QuickActionButton
                                    orderId={order.dbId}
                                    action="approve"
                                />
                                <QuickActionButton
                                    orderId={order.dbId}
                                    action="reject"
                                />
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <button type="button" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                        className="flex items-center gap-2 text-sm font-body font-medium text-neutral-gray disabled:opacity-40 hover:text-text-dark transition-colors cursor-pointer disabled:cursor-not-allowed">
                        <CaretLeftIcon size={14} weight="bold" /> Previous
                    </button>
                    <span className="text-neutral-gray text-xs font-body">Page {page + 1} of {totalPages}</span>
                    <button type="button" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                        className="flex items-center gap-2 text-sm font-body font-medium text-neutral-gray disabled:opacity-40 hover:text-text-dark transition-colors cursor-pointer disabled:cursor-not-allowed">
                        Next <CaretRightIcon size={14} weight="bold" />
                    </button>
                </div>
            )}

            {/* Drawer */}
            {selectedOrder && (
                <CancelRequestDrawer order={selectedOrder} onClose={handleDrawerClose} />
            )}
        </div>
    );
}

// ─── Quick Action Button ──────────────────────────────────────────────────────

function QuickActionButton({ orderId, action }: { orderId: number; action: 'approve' | 'reject' }) {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: () => apiClient.post(`/admin/orders/${orderId}/${action === 'approve' ? 'approve-cancel' : 'reject-cancel'}`),
        onSuccess: () => {
            toast.success(action === 'approve' ? 'Cancellation approved' : 'Cancel request rejected');
            queryClient.invalidateQueries({ queryKey: ['employee-orders'] });
        },
        onError: () => toast.error(`Failed to ${action} cancellation`),
    });

    if (action === 'approve') {
        return (
            <button
                type="button"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
                title="Approve cancellation"
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-error/10 text-error hover:bg-error/20 transition-colors cursor-pointer disabled:opacity-50"
            >
                <CheckCircleIcon size={14} weight="bold" />
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            title="Reject — keep order"
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors cursor-pointer disabled:opacity-50"
        >
            <XCircleIcon size={14} weight="bold" />
        </button>
    );
}
