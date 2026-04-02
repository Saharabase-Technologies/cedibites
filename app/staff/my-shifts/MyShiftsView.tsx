'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    ClockIcon,
    ShoppingBagIcon,
    CurrencyCircleDollarIcon,
    SpinnerGapIcon,
    ArrowRightIcon,
    TimerIcon,
    SignInIcon,
    SignOutIcon,
} from '@phosphor-icons/react';
import { getShiftService, type StaffShift } from '@/lib/services/shifts/shift.service';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import ShiftsCalendar, { type DayShiftSummary } from '@/app/staff/manager/shifts/ShiftsCalendar';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(loginAt: number, logoutAt?: number): string {
    if (!loginAt || loginAt <= 0) return '—';
    const end = logoutAt != null && logoutAt > 0 ? logoutAt : Date.now();
    const mins = Math.floor((end - loginAt) / 60000);
    if (!Number.isFinite(mins) || mins < 0) return '—';
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatGHS(n: number): string {
    return `₵${n.toFixed(2)}`;
}

function toISO(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function dateLabel(iso: string): string {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (iso === today) return 'Today';
    if (iso === yesterday) return 'Yesterday';
    return new Date(iso).toLocaleDateString('en-GH', { weekday: 'long', day: 'numeric', month: 'short' });
}

// ─── View ──────────────────────────────────────────────────────────────────────

export default function MyShiftsView() {
    const { staffUser } = useStaffAuth();
    const [allShifts, setAllShifts] = useState<StaffShift[]>([]);
    const [loading, setLoading] = useState(true);

    const today = toISO(new Date());
    const [selectedDate, setSelectedDate] = useState(today);
    const [viewMonth, setViewMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });

    // Load all shifts for this staff member
    const load = useCallback(async () => {
        if (!staffUser) return;
        const data = await getShiftService().getByStaff(staffUser.id);
        data.sort((a, b) => b.loginAt - a.loginAt);
        setAllShifts(data);
        setLoading(false);
    }, [staffUser]);

    useEffect(() => { load(); }, [load]);

    // Build month data for calendar cells from all shifts
    const monthData = useMemo(() => {
        const map = new Map<string, DayShiftSummary>();
        for (const s of allShifts) {
            const key = new Date(s.loginAt).toISOString().slice(0, 10);
            const existing = map.get(key) ?? { count: 0, orders: 0, sales: 0, hasActive: false };
            map.set(key, {
                count: existing.count + 1,
                orders: existing.orders + s.orderCount,
                sales: existing.sales + s.totalSales,
                hasActive: existing.hasActive || !s.logoutAt,
            });
        }
        return map;
    }, [allShifts]);

    // Filter shifts for selected day
    const dayShifts = useMemo(() => {
        return allShifts
            .filter(s => new Date(s.loginAt).toISOString().slice(0, 10) === selectedDate)
            .sort((a, b) => {
                if (!a.logoutAt && b.logoutAt) return -1;
                if (a.logoutAt && !b.logoutAt) return 1;
                return b.loginAt - a.loginAt;
            });
    }, [allShifts, selectedDate]);

    const totalOrders = allShifts.reduce((s, sh) => s + sh.orderCount, 0);
    const totalSales = allShifts.reduce((s, sh) => s + sh.totalSales, 0);
    const activeShift = allShifts.find(s => !s.logoutAt);

    return (
        <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto">

            {/* Header */}
            <div className="mb-6">
                <h1 className="text-text-dark text-2xl font-bold font-body">My Shifts</h1>
                <p className="text-neutral-gray text-sm font-body mt-0.5">
                    A record of your sessions and what you sold.
                </p>
            </div>

            {loading ? (
                <div className="py-16 flex items-center justify-center gap-2 text-neutral-gray text-sm font-body">
                    <SpinnerGapIcon size={18} className="animate-spin" />
                    Loading...
                </div>
            ) : allShifts.length === 0 ? (
                <div className="py-16 text-center">
                    <ClockIcon size={32} weight="thin" className="text-neutral-gray/30 mx-auto mb-3" />
                    <p className="text-text-dark text-sm font-semibold font-body">No sessions yet</p>
                    <p className="text-neutral-gray text-sm font-body mt-1">
                        Your sales sessions will appear here automatically when you log in and place orders.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-6">

                    {/* Active shift banner */}
                    {activeShift && (
                        <div className="bg-secondary/5 border border-secondary/25 rounded-2xl px-5 py-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-secondary/15 flex items-center justify-center shrink-0">
                                <span className="w-3 h-3 rounded-full bg-secondary animate-pulse" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-secondary text-sm font-bold font-body">Session in progress</p>
                                <p className="text-neutral-gray text-xs font-body">
                                    Started {formatTime(activeShift.loginAt)} · {formatDuration(activeShift.loginAt)} so far · {activeShift.orderCount} order{activeShift.orderCount !== 1 ? 's' : ''}
                                </p>
                            </div>
                            <p className="text-primary font-bold font-body text-sm shrink-0">{formatGHS(activeShift.totalSales)}</p>
                        </div>
                    )}

                    {/* Summary cards */}
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: 'Sessions', value: allShifts.length.toString(), icon: ClockIcon },
                            { label: 'Orders', value: totalOrders.toString(), icon: ShoppingBagIcon },
                            { label: 'Total Sales', value: formatGHS(totalSales), icon: CurrencyCircleDollarIcon },
                        ].map(({ label, value, icon: Icon }) => (
                            <div key={label} className="bg-neutral-card border border-[#f0e8d8] rounded-2xl px-4 py-3 text-center">
                                <Icon size={16} weight="fill" className="text-primary mx-auto mb-1" />
                                <p className="text-text-dark text-sm font-bold font-body">{value}</p>
                                <p className="text-neutral-gray text-[10px] font-body">{label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Calendar */}
                    <ShiftsCalendar
                        selectedDate={selectedDate}
                        onSelectDate={setSelectedDate}
                        viewMonth={viewMonth}
                        onChangeMonth={setViewMonth}
                        monthData={monthData}
                        loadingDays={new Set()}
                    />

                    {/* Selected day header */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-text-dark text-lg font-bold font-body">{dateLabel(selectedDate)}</h2>
                        {dayShifts.length > 0 && (
                            <div className="flex items-center gap-4 text-xs font-body">
                                <span className="text-text-dark">
                                    <span className="font-bold">{dayShifts.length}</span> session{dayShifts.length !== 1 ? 's' : ''}
                                </span>
                                <span className="text-text-dark">
                                    <span className="font-bold">{dayShifts.reduce((s, sh) => s + sh.orderCount, 0)}</span> orders
                                </span>
                                <span className="text-primary font-bold">{formatGHS(dayShifts.reduce((s, sh) => s + sh.totalSales, 0))}</span>
                            </div>
                        )}
                    </div>

                    {/* Shift list for selected day */}
                    {dayShifts.length === 0 ? (
                        <div className="py-8 text-center">
                            <ClockIcon size={28} weight="thin" className="text-neutral-gray/30 mx-auto mb-2" />
                            <p className="text-neutral-gray text-sm font-body">No sessions on this day</p>
                        </div>
                    ) : (
                        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
                            {dayShifts.map((shift, i) => {
                                const active = !shift.logoutAt;
                                return (
                                    <div
                                        key={shift.id}
                                        className={`px-5 py-4 ${i < dayShifts.length - 1 ? 'border-b border-[#f0e8d8]' : ''}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Time column */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <div className="flex items-center gap-3 text-xs font-body text-neutral-gray">
                                                        <span className="flex items-center gap-1">
                                                            <SignInIcon size={11} weight="bold" className="text-secondary" />
                                                            <span className="text-text-dark font-bold text-base font-body tabular-nums">{formatTime(shift.loginAt)}</span>
                                                        </span>
                                                        <ArrowRightIcon size={12} weight="bold" className="text-neutral-gray/40" />
                                                        {shift.logoutAt ? (
                                                            <span className="flex items-center gap-1">
                                                                <SignOutIcon size={11} weight="bold" className="text-error/70" />
                                                                <span className="text-text-dark font-bold text-base font-body tabular-nums">{formatTime(shift.logoutAt)}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1.5 text-secondary font-bold text-base font-body">
                                                                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse shrink-0" />
                                                                Now
                                                            </span>
                                                        )}
                                                    </div>
                                                    {active && (
                                                        <span className="text-[10px] font-bold font-body px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">Active</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1.5 text-xs font-body text-neutral-gray">
                                                    <span className="flex items-center gap-1">
                                                        <TimerIcon size={11} weight="fill" />
                                                        {formatDuration(shift.loginAt, shift.logoutAt)}
                                                    </span>
                                                    <span>{shift.branchName}</span>
                                                </div>
                                            </div>

                                            {/* Stats */}
                                            <div className="flex items-center gap-4 shrink-0">
                                                <div className="text-center">
                                                    <div className="flex items-center gap-1 justify-center">
                                                        <ShoppingBagIcon size={12} weight="fill" className="text-neutral-gray" />
                                                        <p className="text-text-dark text-sm font-bold font-body">{shift.orderCount}</p>
                                                    </div>
                                                    <p className="text-neutral-gray text-[10px] font-body">orders</p>
                                                </div>
                                                <div className="text-center">
                                                    <div className="flex items-center gap-1 justify-center">
                                                        <CurrencyCircleDollarIcon size={12} weight="fill" className="text-primary" />
                                                        <p className="text-primary text-sm font-bold font-body">{formatGHS(shift.totalSales)}</p>
                                                    </div>
                                                    <p className="text-neutral-gray text-[10px] font-body">sales</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
