'use client';

import { useState, useMemo, useEffect } from 'react';
import {
    ListIcon,
    ReceiptIcon,
    MagnifyingGlassIcon,
    XIcon,
    PhoneIcon,
    MapPinIcon,
    CaretDownIcon,
    CaretUpIcon,
    FilePdfIcon,
    FileCsvIcon,
    DownloadSimpleIcon,
    SpinnerIcon,
    WarningIcon,
} from '@phosphor-icons/react';
import { usePartnerScope } from '@/app/components/providers/PartnerScopeProvider';
import { useEmployeeOrders } from '@/lib/api/hooks/useEmployeeOrders';
import { getDateRange, type AnalyticsPeriod } from '@/lib/api/hooks/useAnalytics';
import { mapApiOrderToOrder } from '@/lib/api/adapters/order.adapter';
import { formatPrice, type Order } from '@/types/order';
import { getOrderItemLineLabel } from '@/lib/utils/orderItemDisplay';
import PeriodFilter, { PERIOD_LABELS, type CustomRange } from '@/app/components/analytics/PeriodFilter';

// ─── Export helpers ─────────────────────────────────────────────────────────────

function csvCell(v: unknown): string {
    const s = String(v ?? '');
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadBlob(content: BlobPart, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function slug(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'all';
}

function exportOrdersCsv(orders: Order[], periodLabel: string) {
    const headers = ['Order #', 'Date', 'Customer', 'Phone', 'Items', 'Status', 'Fulfilment', 'Payment', 'Total (GHS)'];
    const rows = orders.map(o => [
        o.orderNumber,
        new Date(o.placedAt).toLocaleString('en-GH'),
        o.contact.name,
        o.contact.phone ?? '',
        o.items.reduce((s, it) => s + it.quantity, 0),
        o.status,
        o.fulfillmentType ?? '',
        o.paymentMethod ?? '',
        o.total.toFixed(2),
    ]);
    const csv = [headers, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');
    // BOM so Excel reads ₵/UTF-8 correctly
    downloadBlob('﻿' + csv, `cedibites-orders-${slug(periodLabel)}.csv`, 'text/csv;charset=utf-8;');
}

async function exportOrdersPdf(orders: Order[], branchName: string, periodLabel: string) {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40;
    const right = 555;
    let y = margin;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('CediBites — Order Statement', margin, y);
    y += 22;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Branch: ${branchName}`, margin, y); y += 14;
    doc.text(`Period: ${periodLabel}`, margin, y); y += 14;
    doc.text(`Generated: ${new Date().toLocaleString('en-GH')}`, margin, y); y += 18;

    const gross = orders.reduce((s, o) => (o.status === 'cancelled' ? s : s + o.total), 0);
    doc.setFont('helvetica', 'bold');
    doc.text(`${orders.length} orders   ·   Gross GHS ${gross.toFixed(2)}`, margin, y);
    y += 18;

    const pageH = doc.internal.pageSize.getHeight();
    const drawHeader = () => {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Order #', margin, y);
        doc.text('Date', margin + 70, y);
        doc.text('Customer', margin + 160, y);
        doc.text('Status', margin + 300, y);
        doc.text('Total', right, y, { align: 'right' });
        y += 5;
        doc.line(margin, y, right, y);
        y += 12;
        doc.setFont('helvetica', 'normal');
    };
    drawHeader();

    for (const o of orders) {
        if (y > pageH - margin) { doc.addPage(); y = margin; drawHeader(); }
        doc.text(String(o.orderNumber), margin, y);
        doc.text(new Date(o.placedAt).toLocaleDateString('en-GH', { day: '2-digit', month: 'short', year: '2-digit' }), margin + 70, y);
        doc.text((o.contact.name ?? '').slice(0, 24), margin + 160, y);
        doc.text(o.status.replace(/_/g, ' '), margin + 300, y);
        doc.text(o.total.toFixed(2), right, y, { align: 'right' });
        y += 15;
    }

    doc.save(`cedibites-orders-${slug(periodLabel)}.pdf`);
}

// ─── Export menu (collapses CSV/PDF) ──────────────────────────────────────────

function ExportMenu({ onCsv, onPdf, disabled }: { onCsv: () => void; onPdf: () => void; disabled: boolean }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                disabled={disabled}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#f0e8d8] bg-neutral-card text-text-dark/80 text-xs font-semibold font-body hover:border-primary/40 hover:text-primary transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
                <DownloadSimpleIcon size={15} weight="bold" /> Export
                <CaretDownIcon size={11} weight="bold" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && !disabled && (
                <>
                    <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} aria-hidden="true" />
                    <div className="absolute right-0 top-full mt-1.5 z-30 bg-neutral-card border border-[#f0e8d8] rounded-xl shadow-lg overflow-hidden py-1 w-36">
                        <button type="button" onClick={() => { onCsv(); setOpen(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold font-body text-text-dark/80 hover:bg-neutral-light transition-colors cursor-pointer">
                            <FileCsvIcon size={15} weight="bold" className="text-secondary" /> CSV
                        </button>
                        <button type="button" onClick={() => { onPdf(); setOpen(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold font-body text-text-dark/80 hover:bg-neutral-light transition-colors cursor-pointer">
                            <FilePdfIcon size={15} weight="bold" className="text-error" /> PDF
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Pagination bar (used at top and bottom) ──────────────────────────────────

function PaginationBar({ page, totalPages, total, pageSize, onPrev, onNext }: {
    page: number; totalPages: number; total: number; pageSize: number; onPrev: () => void; onNext: () => void;
}) {
    return (
        <div className="flex items-center justify-between px-1">
            <span className="text-neutral-gray text-xs font-body">
                Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}
            </span>
            <div className="flex items-center gap-2">
                <button type="button" disabled={page === 0} onClick={onPrev}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold font-body border border-[#f0e8d8] bg-neutral-card text-neutral-gray hover:text-text-dark disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                    Previous
                </button>
                <span className="text-xs font-body text-neutral-gray">{page + 1} / {totalPages}</span>
                <button type="button" disabled={page >= totalPages - 1} onClick={onNext}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold font-body border border-[#f0e8d8] bg-neutral-card text-neutral-gray hover:text-text-dark disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                    Next
                </button>
            </div>
        </div>
    );
}

// ─── Order row (expandable) ───────────────────────────────────────────────────

function OrderRow({ order, isLast }: { order: Order; isLast: boolean }) {
    const [open, setOpen] = useState(false);
    const itemCount = order.items.reduce((s, it) => s + it.quantity, 0);

    return (
        <>
            <div
                className={`px-4 md:px-5 py-3 cursor-pointer hover:bg-neutral-light/60 transition-colors ${!isLast ? 'border-b border-[#f0e8d8]' : ''}`}
                onClick={() => setOpen(o => !o)}
            >
                {/* Mobile: horizontal, full-width — name+total on top, meta inline below */}
                <div className="md:hidden flex flex-col gap-1">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-text-dark text-sm font-semibold font-body truncate">{order.contact.name}</p>
                            <p className="text-neutral-gray text-[11px] font-body">#{order.orderNumber}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-text-dark text-sm font-bold font-body">{formatPrice(order.total)}</span>
                            <span className="text-neutral-gray">{open ? <CaretUpIcon size={13} weight="bold" /> : <CaretDownIcon size={13} weight="bold" />}</span>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] font-body text-neutral-gray">
                        <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                        {order.fulfillmentType && <><span className="text-neutral-gray/40">·</span><span className="capitalize">{order.fulfillmentType.replace('_', ' ')}</span></>}
                        {order.contact.phone && <><span className="text-neutral-gray/40">·</span><span className="truncate">{order.contact.phone}</span></>}
                    </div>
                </div>

                {/* Desktop: column grid */}
                <div className="hidden md:grid md:grid-cols-[1.8fr_1.3fr_0.7fr_1fr_1fr_auto] gap-4 items-center">
                    <div className="min-w-0">
                        <p className="text-text-dark text-sm font-semibold font-body truncate">{order.contact.name}</p>
                        <p className="text-neutral-gray text-xs font-body">#{order.orderNumber}</p>
                    </div>
                    <span className="text-neutral-gray text-xs font-body truncate">{order.contact.phone ?? '—'}</span>
                    <span className="text-neutral-gray text-xs font-body">{itemCount}</span>
                    <span className="text-neutral-gray text-xs font-body capitalize truncate">{order.fulfillmentType ? order.fulfillmentType.replace('_', ' ') : '—'}</span>
                    <span className="text-text-dark text-sm font-bold font-body">{formatPrice(order.total)}</span>
                    <span className="shrink-0 text-neutral-gray">{open ? <CaretUpIcon size={14} weight="bold" /> : <CaretDownIcon size={14} weight="bold" />}</span>
                </div>
            </div>

            {open && (
                <div className={`px-5 py-4 bg-[#faf6f0] flex flex-col gap-3 ${!isLast ? 'border-b border-[#f0e8d8]' : ''}`}>
                    <div className="flex flex-wrap gap-4 text-xs font-body">
                        {order.contact.phone && (
                            <span className="flex items-center gap-1.5 text-neutral-gray">
                                <PhoneIcon size={12} weight="fill" />
                                {order.contact.phone}
                            </span>
                        )}
                        {order.contact?.address && (
                            <span className="flex items-center gap-1.5 text-neutral-gray">
                                <MapPinIcon size={12} weight="fill" />
                                {order.contact.address}
                            </span>
                        )}
                        {order.fulfillmentType && (
                            <span className="text-neutral-gray capitalize">{order.fulfillmentType.replace('_', ' ')}</span>
                        )}
                        {order.paymentMethod && (
                            <span className="text-neutral-gray capitalize">{order.paymentMethod.replace('_', ' ')} · {order.paymentStatus}</span>
                        )}
                    </div>
                    <div className="border-t border-[#f0e8d8] pt-3 flex flex-col gap-1.5">
                        {order.items.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-xs font-body">
                                <span className="text-text-dark">{item.quantity}× {getOrderItemLineLabel(item)}</span>
                                <span className="text-neutral-gray">{formatPrice(item.unitPrice * item.quantity)}</span>
                            </div>
                        ))}
                        {(order.discount ?? 0) > 0 && (
                            <div className="flex items-center justify-between text-xs font-body">
                                <span className="text-secondary">Discount</span>
                                <span className="text-secondary">−{formatPrice(order.discount ?? 0)}</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between text-sm font-bold font-body border-t border-[#f0e8d8] mt-1 pt-1">
                            <span className="text-text-dark">Total</span>
                            <span className="text-text-dark">{formatPrice(order.total)}</span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PartnerOrdersPage() {
    const { branchId, primaryBranchId, scopeLabel } = usePartnerScope();
    const singleBranchId = branchId ?? primaryBranchId;

    const [period, setPeriod] = useState<AnalyticsPeriod>('month');
    const [customRange, setCustomRange] = useState<CustomRange>(() => {
        const today = new Date().toISOString().slice(0, 10);
        return { date_from: today, date_to: today };
    });
    const range = useMemo(() => getDateRange(period, period === 'custom' ? customRange : undefined), [period, customRange]);

    const { orders: apiOrders, isLoading, error } = useEmployeeOrders({
        branch_id: singleBranchId,
        date_from: range.date_from,
        date_to: range.date_to,
        per_page: 200,
    });

    const branchOrders = useMemo(() =>
        apiOrders.map(mapApiOrderToOrder).sort((a, b) => b.placedAt - a.placedAt),
    [apiOrders]);

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 15;

    // All orders for the period (including completed and cancelled) — one list.
    const filtered = useMemo(() => {
        if (!search.trim()) return branchOrders;
        const q = search.toLowerCase();
        return branchOrders.filter(o =>
            o.contact.name.toLowerCase().includes(q) ||
            o.orderNumber.toLowerCase().includes(q) ||
            (o.contact.phone ?? '').toLowerCase().includes(q) ||
            (o.contact.address ?? '').toLowerCase().includes(q)
        );
    }, [branchOrders, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    // Reset page when search/period changes
    useEffect(() => { setPage(0); }, [search, period]);

    // Period gross (excludes cancelled) for the ledger header.
    const periodGross = useMemo(
        () => branchOrders.reduce((s, o) => (o.status === 'cancelled' ? s : s + o.total), 0),
        [branchOrders]
    );
    const periodLabel = PERIOD_LABELS[period] ?? '';

    if (!primaryBranchId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 px-4">
                <WarningIcon size={32} weight="fill" className="text-warning" />
                <p className="text-text-dark text-sm font-body font-semibold">No branch assigned</p>
                <p className="text-neutral-gray text-xs font-body text-center">Your account is not assigned to any branch. Contact an administrator.</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <SpinnerIcon size={32} className="text-primary animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 px-4">
                <WarningIcon size={32} weight="fill" className="text-error" />
                <p className="text-text-dark text-sm font-body font-semibold">Unable to load orders</p>
                <p className="text-neutral-gray text-xs font-body text-center">Please check your connection and try again.</p>
            </div>
        );
    }

    return (
        <div className="px-4 md:px-8 py-6 w-full">

            {/* Header */}
            <div className="flex flex-col gap-4 mb-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <ReceiptIcon size={20} weight="fill" className="text-primary" />
                            <h1 className="text-text-dark text-2xl font-bold font-body">Order Ledger</h1>
                        </div>
                        <p className="text-neutral-gray text-sm font-body">
                            {scopeLabel} · {branchOrders.length} order{branchOrders.length !== 1 ? 's' : ''} · <span className="text-text-dark font-semibold">{formatPrice(periodGross)}</span> gross
                        </p>
                    </div>
                    <ExportMenu
                        onCsv={() => exportOrdersCsv(filtered, periodLabel)}
                        onPdf={() => exportOrdersPdf(filtered, scopeLabel, periodLabel)}
                        disabled={filtered.length === 0}
                    />
                </div>

                {/* Period selector */}
                <PeriodFilter
                    value={period}
                    onChange={setPeriod}
                    customRange={customRange}
                    onCustomRangeChange={setCustomRange}
                />
            </div>

            {/* Search + top pagination */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <div className="relative flex-1">
                    <MagnifyingGlassIcon size={15} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-gray" />
                    <input
                        type="text"
                        placeholder="Search by name, order #, phone, or address..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-9 py-2.5 bg-neutral-card border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary"
                    />
                    {search && (
                        <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-gray hover:text-text-dark cursor-pointer">
                            <XIcon size={14} weight="bold" />
                        </button>
                    )}
                </div>
                {filtered.length > PAGE_SIZE && (
                    <div className="shrink-0">
                        <PaginationBar
                            page={page} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE}
                            onPrev={() => setPage(p => p - 1)} onNext={() => setPage(p => p + 1)}
                        />
                    </div>
                )}
            </div>

            {/* List */}
            {filtered.length === 0 ? (
                <div className="py-16 text-center bg-neutral-card border border-[#f0e8d8] rounded-2xl">
                    <ListIcon size={28} weight="thin" className="text-neutral-gray/30 mx-auto mb-2" />
                    <p className="text-neutral-gray text-sm font-body">{search ? 'No orders match your search.' : 'No orders in this period.'}</p>
                </div>
            ) : (
                <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
                    <div className="hidden md:grid grid-cols-[1.8fr_1.3fr_0.7fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-[#f0e8d8] bg-[#faf6f0]">
                        {['Customer', 'Phone', 'Items', 'Type', 'Amount', ''].map((h, i) => (
                            <span key={i} className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-wider">{h}</span>
                        ))}
                    </div>
                    {paged.map((order, i) => (
                        <OrderRow key={order.id} order={order} isLast={i === paged.length - 1} />
                    ))}
                </div>
            )}

            {/* Bottom pagination */}
            {filtered.length > PAGE_SIZE && (
                <div className="mt-4">
                    <PaginationBar
                        page={page} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE}
                        onPrev={() => setPage(p => p - 1)} onNext={() => setPage(p => p + 1)}
                    />
                </div>
            )}
        </div>
    );
}
