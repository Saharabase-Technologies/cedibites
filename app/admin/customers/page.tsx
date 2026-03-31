'use client';

import { useState, useMemo, useCallback } from 'react';
import {
    MagnifyingGlassIcon,
    XIcon,
    UserCircleIcon,
    PhoneIcon,
    EnvelopeIcon,
    MapPinIcon,
    ClockIcon,
    ProhibitIcon,
    TrashIcon,
    ArrowCounterClockwiseIcon,
    DownloadSimpleIcon,
    CaretRightIcon,
    ReceiptIcon,
    CurrencyCircleDollarIcon,
    TrendUpIcon,
} from '@phosphor-icons/react';
import { useCustomers, useCustomerOrders } from '@/lib/api/hooks/useCustomers';
import { mapApiCustomerToDisplay } from '@/lib/api/adapters/customer.adapter';
import { customerService } from '@/lib/api/services/customer.service';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/utils/toast';
import { DeleteConfirmDialog } from '@/app/components/ui/DeleteConfirmDialog';
import type { DisplayCustomer } from '@/lib/api/adapters/customer.adapter';

const STATUS_STYLES: Record<string, { dot: string; label: string }> = {
    received:         { dot: 'bg-info',           label: 'Received'        },
    preparing:        { dot: 'bg-warning',         label: 'Preparing'       },
    ready:            { dot: 'bg-secondary',       label: 'Ready'           },
    ready_for_pickup: { dot: 'bg-secondary',       label: 'Ready Pickup'    },
    out_for_delivery: { dot: 'bg-primary',         label: 'Out for Delivery'},
    delivered:        { dot: 'bg-secondary',       label: 'Delivered'       },
    completed:        { dot: 'bg-neutral-gray/40', label: 'Completed'       },
    cancelled:        { dot: 'bg-error',           label: 'Cancelled'       },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatGHS(v: number) { return `₵${v.toFixed(2)}`; }

// ─── Customer detail panel ────────────────────────────────────────────────────

function CustomerDetailPanel({ customer, onClose, onSuspend, onUnsuspend, onDelete }: {
    customer: DisplayCustomer;
    onClose: () => void;
    onSuspend: () => void;
    onUnsuspend: () => void;
    onDelete: () => void;
}) {

    return (
        <>
            <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm md:hidden" onClick={onClose} />
            <aside className="fixed right-0 top-0 h-full z-40 w-full max-w-md bg-neutral-card border-l border-[#f0e8d8] flex flex-col shadow-2xl overflow-hidden">

                <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0e8d8]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                            <span className="text-primary text-sm font-bold font-body">{customer.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</span>
                        </div>
                        <div>
                            <p className="text-text-dark text-sm font-bold font-body">{customer.name}</p>
                            <span className={`text-[10px] font-body px-2 py-0.5 rounded-full ${customer.accountType === 'Registered' ? 'bg-primary/10 text-primary' : 'bg-neutral-light text-neutral-gray'}`}>
                                {customer.accountType}
                            </span>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-light cursor-pointer">
                        <XIcon size={16} className="text-neutral-gray" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">

                    {/* Profile */}
                    <div>
                        <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Contact</p>
                        <div className="bg-neutral-light rounded-xl p-3 flex flex-col gap-2">
                            <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-primary text-xs font-body hover:underline">
                                <PhoneIcon size={12} weight="fill" />
                                {customer.phone}
                            </a>
                            {customer.email && (
                                <div className="flex items-center gap-2">
                                    <EnvelopeIcon size={12} weight="fill" className="text-neutral-gray" />
                                    <span className="text-neutral-gray text-xs font-body">{customer.email}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <ClockIcon size={12} weight="fill" className="text-neutral-gray" />
                                <span className="text-neutral-gray text-xs font-body">Joined {customer.joinDate}</span>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { icon: ReceiptIcon, label: 'Orders', value: customer.totalOrders },
                            { icon: CurrencyCircleDollarIcon, label: 'Total Spend', value: formatGHS(customer.totalSpend) },
                            { icon: TrendUpIcon, label: 'Avg. Order', value: formatGHS(customer.avgOrderValue) },
                        ].map(({ icon: Icon, label, value }) => (
                            <div key={label} className="bg-neutral-light rounded-xl p-3 text-center">
                                <Icon size={14} weight="fill" className="text-primary mx-auto mb-1" />
                                <p className="text-text-dark text-sm font-bold font-body">{value}</p>
                                <p className="text-neutral-gray text-[10px] font-body">{label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Most ordered */}
                    <div className="bg-primary/5 border border-primary/10 rounded-xl px-3 py-2.5">
                        <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1">Most Ordered</p>
                        <p className="text-text-dark text-sm font-semibold font-body">{customer.mostOrderedItem}</p>
                    </div>

                    {/* Saved addresses */}
                    {customer.addresses.length > 0 && (
                        <div>
                            <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Saved Addresses</p>
                            <div className="flex flex-col gap-2">
                                {customer.addresses.map((addr, i) => (
                                    <div key={i} className="flex items-start gap-2 px-3 py-2 bg-neutral-light rounded-xl">
                                        <MapPinIcon size={12} weight="fill" className="text-neutral-gray mt-0.5 shrink-0" />
                                        <p className="text-neutral-gray text-xs font-body">{addr}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Order history */}
                    <div>
                        <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Order History</p>
                        <div className="bg-neutral-light rounded-xl overflow-hidden">
                            {customer.orders.length === 0 ? (
                                <div className="px-3 py-6 text-center">
                                    <p className="text-neutral-gray text-xs font-body">No orders found</p>
                                </div>
                            ) : (
                                customer.orders.map((order, i) => {
                                    const statusCfg = STATUS_STYLES[order.status] ?? STATUS_STYLES.received;
                                    return (
                                        <div key={order.id} className={`flex items-center justify-between px-3 py-3 ${i < customer.orders.length - 1 ? 'border-b border-[#f0e8d8]' : ''}`}>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-text-dark text-xs font-bold font-body">#{order.id}</span>
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-body text-neutral-gray">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />{statusCfg.label}
                                                    </span>
                                                </div>
                                                <p className="text-neutral-gray text-[10px] font-body">{order.branch} · {order.date}</p>
                                            </div>
                                            <span className="text-text-dark text-xs font-bold font-body">{formatGHS(order.amount)}</span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="border-t border-[#f0e8d8] p-4 flex flex-col gap-2.5">
                    <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider">Admin Actions</p>
                    <div className="grid grid-cols-2 gap-2">
                        {customer.status === 'active' ? (
                            <button type="button" onClick={onSuspend}
                                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-error/10 rounded-xl text-error text-xs font-medium font-body hover:bg-error/20 transition-colors cursor-pointer">
                                <ProhibitIcon size={13} weight="bold" />
                                Suspend Account
                            </button>
                        ) : (
                            <button type="button" onClick={onUnsuspend}
                                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-secondary/10 rounded-xl text-secondary text-xs font-medium font-body hover:bg-secondary/20 transition-colors cursor-pointer">
                                <ArrowCounterClockwiseIcon size={13} weight="bold" />
                                Unsuspend
                            </button>
                        )}
                        <button type="button" className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-neutral-light rounded-xl text-text-dark text-xs font-medium font-body hover:bg-[#f0e8d8] transition-colors cursor-pointer">
                            <DownloadSimpleIcon size={13} weight="bold" className="text-primary" />
                            Export Data
                        </button>
                        <button type="button" onClick={onDelete}
                            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-error/10 rounded-xl text-error text-xs font-medium font-body hover:bg-error/20 transition-colors cursor-pointer col-span-2">
                            <TrashIcon size={13} weight="bold" />
                            Delete Account
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type FilterTab = 'All' | 'Registered' | 'Guest' | 'Suspended';
type SortBy = 'recent' | 'orders' | 'spend';

const TABS: FilterTab[] = ['All', 'Registered', 'Guest', 'Suspended'];

export default function AdminCustomersPage() {
    const queryClient = useQueryClient();
    const [tab, setTab] = useState<FilterTab>('All');
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState<SortBy>('recent');
    const [selected, setSelected] = useState<DisplayCustomer | null>(null);
    const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; customer: DisplayCustomer | null; isLoading: boolean }>({
        isOpen: false,
        customer: null,
        isLoading: false,
    });

    const { customers: apiCustomers, meta, isLoading, refetch } = useCustomers({
        search: search.trim() || undefined,
        is_guest: tab === 'Guest' ? true : tab === 'Registered' ? false : undefined,
        per_page: 100,
    });

    const { orders: customerOrders } = useCustomerOrders(selected?.id ?? null);

    const customers: DisplayCustomer[] = useMemo(() => {
        return apiCustomers.map((api) => mapApiCustomerToDisplay(api, []));
    }, [apiCustomers]);

    const filtered = useMemo(() => {
        let list = customers;
        if (tab === 'Suspended') list = list.filter((c) => c.status === 'suspended');
        else {
            list = list.filter((c) => c.status !== 'suspended');
            if (tab !== 'All') list = list.filter((c) => c.accountType === tab);
        }

        if (sortBy === 'orders') list = [...list].sort((a, b) => b.totalOrders - a.totalOrders);
        else if (sortBy === 'spend') list = [...list].sort((a, b) => b.totalSpend - a.totalSpend);

        return list;
    }, [customers, tab, sortBy]);

    const buildExportRows = useCallback(() => {
        const headers = ['Name', 'Phone', 'Email', 'Account Type', 'Status', 'Total Orders', 'Total Spend (GHS)', 'Avg Order Value (GHS)', 'Last Order', 'Join Date'];
        const rows = filtered.map((c) => [
            c.name,
            c.phone,
            c.email ?? '',
            c.accountType,
            c.status,
            String(c.totalOrders),
            c.totalSpend.toFixed(2),
            c.avgOrderValue.toFixed(2),
            c.lastOrderDate,
            c.joinDate,
        ]);
        return [headers, ...rows];
    }, [filtered]);

    const handleExportCsv = useCallback(() => {
        const allRows = buildExportRows();
        const csv = allRows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `customers-${tab.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [buildExportRows, tab]);

    const handleExportExcel = useCallback(() => {
        const allRows = buildExportRows();
        const esc = (v: string) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const tableHtml = allRows.map((r, ri) => {
            const tag = ri === 0 ? 'th' : 'td';
            return `<tr>${r.map((v) => `<${tag}>${esc(String(v))}</${tag}>`).join('')}</tr>`;
        }).join('');
        const xls = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Customers</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>${tableHtml}</table></body></html>`;
        const blob = new Blob(['\ufeff' + xls], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `customers-${tab.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.xls`;
        a.click();
        URL.revokeObjectURL(url);
    }, [buildExportRows, tab]);

    const selectedWithOrders = useMemo(() => {
        if (!selected) return null;
        const api = apiCustomers.find((c) => c.id === selected.id);
        if (!api) return selected;
        return mapApiCustomerToDisplay(api, Array.isArray(customerOrders) ? customerOrders : []);
    }, [selected, apiCustomers, customerOrders]);

    async function suspend(c: DisplayCustomer) {
        try {
            await customerService.suspendCustomer(Number(c.id));
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            if (selected?.id === c.id) setSelected({ ...selected, status: 'suspended' });
            toast.success(`${c.name} has been suspended successfully`);
        } catch (error: any) {
            toast.error(error?.message || 'Failed to suspend customer');
        }
    }

    async function unsuspend(c: DisplayCustomer) {
        try {
            await customerService.unsuspendCustomer(Number(c.id));
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            if (selected?.id === c.id) setSelected({ ...selected, status: 'active' });
            toast.success(`${c.name} has been unsuspended successfully`);
        } catch (error: any) {
            toast.error(error?.message || 'Failed to unsuspend customer');
        }
    }

    async function deleteCustomer() {
        if (!deleteDialog.customer) return;
        
        setDeleteDialog(prev => ({ ...prev, isLoading: true }));
        try {
            await customerService.deleteCustomer(Number(deleteDialog.customer.id));
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            setSelected(null);
            toast.success(`${deleteDialog.customer.name} has been deleted successfully`);
            setDeleteDialog({ isOpen: false, customer: null, isLoading: false });
        } catch (error: any) {
            toast.error(error?.message || 'Failed to delete customer');
            setDeleteDialog(prev => ({ ...prev, isLoading: false }));
        }
    }

    return (
        <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-text-dark text-2xl font-bold font-body">Customers</h1>
                    <p className="text-neutral-gray text-sm font-body mt-0.5">{filtered.length} customers shown</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={handleExportCsv} disabled={filtered.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-neutral-card border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-medium font-body hover:border-primary/40 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                        <DownloadSimpleIcon size={15} weight="bold" className="text-primary" />
                        CSV
                    </button>
                    <button type="button" onClick={handleExportExcel} disabled={filtered.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-neutral-card border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-medium font-body hover:border-primary/40 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                        <DownloadSimpleIcon size={15} weight="bold" className="text-secondary" />
                        Excel
                    </button>
                </div>
            </div>

            {/* Tabs + controls */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {TABS.map(t => (
                        <button key={t} type="button" onClick={() => setTab(t)}
                            className={`px-3 py-2 rounded-xl text-sm font-medium font-body whitespace-nowrap transition-all cursor-pointer ${tab === t ? 'bg-primary text-white' : 'bg-neutral-card border border-[#f0e8d8] text-neutral-gray hover:text-text-dark'}`}>
                            {t}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2 ml-auto">
                    <div className="relative flex-1 min-w-[180px]">
                        <MagnifyingGlassIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-gray" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                            className="w-full pl-9 pr-3 py-2.5 bg-neutral-card border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40" />
                    </div>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)}
                        className="px-3 py-2.5 bg-neutral-card border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40 cursor-pointer">
                        <option value="recent">Most Recent</option>
                        <option value="orders">Most Orders</option>
                        <option value="spend">Highest Spend</option>
                    </select>
                </div>
            </div>

            {/* Customer list */}
            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
                <div className="hidden md:grid grid-cols-[1fr_90px_80px_90px_110px_80px_80px] gap-4 px-4 py-3 border-b border-[#f0e8d8] bg-[#faf6f0]">
                    {['Customer', 'Account', 'Orders', 'Total Spend', 'Last Order', 'Status', ''].map(h => (
                        <span key={h} className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-wider">{h}</span>
                    ))}
                </div>

                {isLoading ? (
                    <div className="px-4 py-16 text-center">
                        <p className="text-neutral-gray text-sm font-body">Loading customers…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="px-4 py-16 text-center">
                        <UserCircleIcon size={32} weight="thin" className="text-neutral-gray/40 mx-auto mb-3" />
                        <p className="text-neutral-gray text-sm font-body">No customers found.</p>
                    </div>
                ) : (
                    filtered.map((customer, i) => (
                        <div
                            key={customer.id}
                            onClick={() => setSelected(customer)}
                            className={`px-4 py-3.5 flex flex-col md:grid md:grid-cols-[1fr_90px_80px_90px_110px_80px_80px] gap-2 md:gap-4 md:items-center cursor-pointer hover:bg-neutral-light/60 transition-colors ${i < filtered.length - 1 ? 'border-b border-[#f0e8d8]' : ''}`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                                    <span className="text-primary text-[10px] font-bold font-body">{customer.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-text-dark text-sm font-semibold font-body truncate">{customer.name}</p>
                                    <p className="text-neutral-gray text-[10px] font-body">{customer.phone}</p>
                                </div>
                            </div>
                            <span className={`text-[10px] font-medium font-body px-2 py-0.5 rounded-full w-fit ${customer.accountType === 'Registered' ? 'bg-primary/10 text-primary' : 'bg-neutral-light text-neutral-gray'}`}>
                                {customer.accountType}
                            </span>
                            <span className="text-text-dark text-sm font-body">{customer.totalOrders}</span>
                            <span className="text-text-dark text-sm font-bold font-body">{formatGHS(customer.totalSpend)}</span>
                            <span className="text-neutral-gray text-xs font-body">{customer.lastOrderDate}</span>
                            <span className={`text-[10px] font-bold font-body px-2 py-0.5 rounded-full w-fit ${customer.status === 'active' ? 'bg-secondary/10 text-secondary' : 'bg-error/10 text-error'}`}>
                                {customer.status === 'active' ? 'Active' : 'Suspended'}
                            </span>
                            <CaretRightIcon size={14} className="text-neutral-gray/40 hidden md:block" />
                        </div>
                    ))
                )}
            </div>

            {/* Detail panel */}
            {selected && selectedWithOrders && (
                <CustomerDetailPanel
                    customer={selectedWithOrders}
                    onClose={() => setSelected(null)}
                    onSuspend={() => suspend(selected)}
                    onUnsuspend={() => unsuspend(selected)}
                    onDelete={() => setDeleteDialog({ isOpen: true, customer: selectedWithOrders, isLoading: false })}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <DeleteConfirmDialog
                isOpen={deleteDialog.isOpen}
                title="Delete customer account?"
                message="This will permanently delete {itemName}'s account and anonymise their order history (replacing name/phone/email with [Deleted Customer])."
                itemName={deleteDialog.customer?.name || ''}
                onConfirm={deleteCustomer}
                onCancel={() => setDeleteDialog({ isOpen: false, customer: null, isLoading: false })}
                isLoading={deleteDialog.isLoading}
            />
        </div>
    );
}
