'use client';

import { useMemo } from 'react';
import {
    BuildingsIcon,
    CurrencyCircleDollarIcon,
    ShoppingCartIcon,
    UsersThreeIcon,
    TrendUpIcon,
    LockIcon,
    ClockIcon,
} from '@phosphor-icons/react';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { useOrderStore } from '@/app/components/providers/OrderStoreProvider';
import { MOCK_STAFF } from '@/lib/data/mockStaff';
import { formatPrice } from '@/types/order';

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, color }: {
    label: string;
    value: string;
    sub?: string;
    icon: React.ElementType;
    color: string;
}) {
    return (
        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5 flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon size={20} weight="fill" className="text-white" />
            </div>
            <div>
                <p className="text-neutral-gray text-xs font-body">{label}</p>
                <p className="text-text-dark text-2xl font-bold font-body leading-tight">{value}</p>
                {sub && <p className="text-neutral-gray text-xs font-body mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PartnerDashboardPage() {
    const { staffUser } = useStaffAuth();
    const { orders } = useOrderStore();

    // Branch partner sees only their assigned branch
    const branchName = staffUser?.branch ?? '';

    const startOfDay = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    }, []);

    // Filter to this branch's orders
    const branchOrders = useMemo(() =>
        orders.filter(o => o.branch.name === branchName),
    [orders, branchName]);

    const todayOrders = useMemo(() =>
        branchOrders.filter(o => o.placedAt >= startOfDay),
    [branchOrders, startOfDay]);

    const todayRevenue = useMemo(() =>
        todayOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0),
    [todayOrders]);

    const activeOrders = useMemo(() =>
        branchOrders.filter(o => !['delivered', 'completed', 'cancelled'].includes(o.status)).length,
    [branchOrders]);

    // Staff at this branch (read-only view)
    const branchStaff = useMemo(() =>
        MOCK_STAFF.filter(s => {
            const branches = Array.isArray(s.branch) ? s.branch : [s.branch];
            return branches.includes(branchName) && s.status !== 'archived';
        }),
    [branchName]);

    const activeStaff = branchStaff.filter(s => s.systemAccess === 'enabled').length;

    // Order breakdown by status
    const cancelled = todayOrders.filter(o => o.status === 'cancelled').length;
    const completed  = todayOrders.filter(o => ['delivered', 'completed'].includes(o.status)).length;

    return (
        <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto">

            {/* Header */}
            <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <BuildingsIcon size={18} weight="fill" className="text-primary" />
                        <h1 className="text-text-dark text-2xl font-bold font-body">{branchName}</h1>
                    </div>
                    <p className="text-neutral-gray text-sm font-body">Branch Partner view · read-only</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-light rounded-xl border border-[#f0e8d8]">
                    <LockIcon size={12} weight="fill" className="text-neutral-gray" />
                    <span className="text-neutral-gray text-xs font-body">Read Only</span>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <KpiCard
                    label="Today's Revenue"
                    value={formatPrice(todayRevenue)}
                    sub={`${todayOrders.length} orders placed`}
                    icon={CurrencyCircleDollarIcon}
                    color="bg-secondary"
                />
                <KpiCard
                    label="Active Orders"
                    value={String(activeOrders)}
                    sub="In progress right now"
                    icon={ShoppingCartIcon}
                    color="bg-primary"
                />
                <KpiCard
                    label="Completed Today"
                    value={String(completed)}
                    sub={`${cancelled} cancelled`}
                    icon={TrendUpIcon}
                    color="bg-teal-600"
                />
                <KpiCard
                    label="Staff On Duty"
                    value={String(activeStaff)}
                    sub={`${branchStaff.length} total staff`}
                    icon={UsersThreeIcon}
                    color="bg-info"
                />
            </div>

            {/* Staff list (read-only) */}
            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden mb-6">
                <div className="px-5 py-4 border-b border-[#f0e8d8] flex items-center justify-between">
                    <h2 className="text-text-dark text-base font-bold font-body">Branch Staff</h2>
                    <span className="text-neutral-gray text-xs font-body">{branchStaff.length} members</span>
                </div>
                {branchStaff.length === 0 ? (
                    <div className="px-5 py-10 text-center">
                        <UsersThreeIcon size={28} weight="thin" className="text-neutral-gray/30 mx-auto mb-2" />
                        <p className="text-neutral-gray text-sm font-body">No staff assigned to this branch.</p>
                    </div>
                ) : (
                    branchStaff.map((member, i) => (
                        <div key={member.id}
                            className={`px-5 py-3.5 flex items-center gap-3 ${i < branchStaff.length - 1 ? 'border-b border-[#f0e8d8]' : ''}`}>
                            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                                <span className="text-primary text-xs font-bold font-body">
                                    {member.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-text-dark text-sm font-medium font-body">{member.name}</p>
                                <p className="text-neutral-gray text-xs font-body capitalize">{member.role.replace('_', ' ')}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-[10px] font-bold font-body px-2 py-0.5 rounded-full ${
                                    member.systemAccess === 'enabled' ? 'bg-secondary/10 text-secondary' : 'bg-neutral-light text-neutral-gray'
                                }`}>
                                    {member.systemAccess === 'enabled' ? 'Active' : 'Inactive'}
                                </span>
                                <span className="text-neutral-gray text-[10px] font-body flex items-center gap-0.5">
                                    <ClockIcon size={10} weight="fill" />
                                    {member.lastLogin}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Recent orders (read-only) */}
            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#f0e8d8] flex items-center justify-between">
                    <h2 className="text-text-dark text-base font-bold font-body">Today&apos;s Orders</h2>
                    <span className="text-neutral-gray text-xs font-body">{todayOrders.length} total</span>
                </div>
                {todayOrders.length === 0 ? (
                    <div className="px-5 py-10 text-center">
                        <ShoppingCartIcon size={28} weight="thin" className="text-neutral-gray/30 mx-auto mb-2" />
                        <p className="text-neutral-gray text-sm font-body">No orders today yet.</p>
                    </div>
                ) : (
                    todayOrders.slice(0, 10).map((order, i) => (
                        <div key={order.id}
                            className={`px-5 py-3.5 flex items-center gap-3 ${i < Math.min(todayOrders.length, 10) - 1 ? 'border-b border-[#f0e8d8]' : ''}`}>
                            <span className="text-text-dark text-sm font-bold font-body w-12 shrink-0">{order.orderNumber}</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-text-dark text-sm font-body truncate">{order.contact.name}</p>
                                <p className="text-neutral-gray text-xs font-body">
                                    {order.items.reduce((s, i) => s + i.quantity, 0)} items
                                </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <span className="text-text-dark text-sm font-medium font-body">{formatPrice(order.total)}</span>
                                <span className={`text-[10px] font-bold font-body px-2 py-0.5 rounded-full capitalize ${
                                    order.status === 'cancelled' ? 'bg-error/10 text-error' :
                                    ['delivered','completed'].includes(order.status) ? 'bg-secondary/10 text-secondary' :
                                    'bg-primary/10 text-primary'
                                }`}>
                                    {order.status.replace('_', ' ')}
                                </span>
                            </div>
                        </div>
                    ))
                )}
                {todayOrders.length > 10 && (
                    <div className="px-5 py-3 border-t border-[#f0e8d8] text-center">
                        <p className="text-neutral-gray text-xs font-body">+{todayOrders.length - 10} more orders</p>
                    </div>
                )}
            </div>
        </div>
    );
}
