'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    ClockIcon,
    ShoppingBagIcon,
    CurrencyCircleDollarIcon,
    TruckIcon,
    SpinnerGapIcon,
    ArrowRightIcon,
    TimerIcon,
    SignInIcon,
    SignOutIcon,
    CalendarDotsIcon,
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
    const [showCalendar, setShowCalendar] = useState(false);

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
                sales: existing.sales + s.goodsSales,   // calendar shows goods revenue
                hasActive: existing.hasActive || !s.logoutAt,
            });
        }
        return map;
    }, [allShifts]);

    // Today's shifts
    const todayShifts = useMemo(() => {
        return allShifts.filter(s => new Date(s.loginAt).toISOString().slice(0, 10) === today);
    }, [allShifts, today]);

    const todayOrders = todayShifts.reduce((s, sh) => s + sh.orderCount, 0);
    const todaySales = todayShifts.reduce((s, sh) => s + sh.goodsSales, 0);
    const todayDelivery = todayShifts.reduce((s, sh) => s + sh.deliveryFees, 0);

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

    const activeShift = allShifts.find(s => !s.logoutAt);

    const handleSelectDate = useCallback((date: string) => {
        setSelectedDate(date);
        setShowCalendar(false);
    }, []);

    return (
        <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">

            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-text-dark dark:text-text-light text-xl font-bold font-body">My Shifts</h1>
                    <p className="text-neutral-gray text-sm font-body mt-0.5">
                        Track your sessions, orders, and sales.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowCalendar(v => !v)}
                    className="flex items-center gap-2 bg-neutral-card dark:bg-brand-dark border border-[#f0e8d8] dark:border-brown-light/15 rounded-xl px-3 py-2 text-xs font-body font-medium text-text-dark dark:text-text-light hover:bg-brown-light/10 transition-colors cursor-pointer"
                >
                    <CalendarDotsIcon size={14} weight="fill" className="text-primary" />
                    {selectedDate === today ? 'Today' : dateLabel(selectedDate)}
                </button>
            </div>

            {loading ? (
                <div className="py-16 flex items-center justify-center gap-2 text-neutral-gray text-sm font-body">
                    <SpinnerGapIcon size={18} className="animate-spin" />
                    Loading...
                </div>
            ) : allShifts.length === 0 ? (
                <div className="py-16 text-center">
                    <ClockIcon size={32} weight="thin" className="text-neutral-gray/30 mx-auto mb-3" />
                    <p className="text-text-dark dark:text-text-light text-sm font-semibold font-body">No sessions yet</p>
                    <p className="text-neutral-gray text-sm font-body mt-1">
                        Your sales sessions will appear here automatically when you log in and place orders.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-5">

                    {/* ── Current Session (Hero) ──────────────────────────────────── */}
                    {activeShift ? (
                        <div className="bg-secondary/5 border border-secondary/25 rounded-2xl px-5 py-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-secondary/15 flex items-center justify-center shrink-0">
                                    <span className="w-3 h-3 rounded-full bg-secondary animate-pulse" />
                                </div>
                                <div>
                                    <p className="text-secondary text-sm font-bold font-body">Session in progress</p>
                                    <p className="text-neutral-gray text-xs font-body">
                                        Started {formatTime(activeShift.loginAt)} · {activeShift.branchName}
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-white/50 dark:bg-brand-dark/50 rounded-xl px-3 py-2.5 text-center">
                                    <p className="text-text-dark dark:text-text-light text-lg font-bold font-body">{formatDuration(activeShift.loginAt)}</p>
                                    <p className="text-neutral-gray text-[10px] font-body">Duration</p>
                                </div>
                                <div className="bg-white/50 dark:bg-brand-dark/50 rounded-xl px-3 py-2.5 text-center">
                                    <p className="text-text-dark dark:text-text-light text-lg font-bold font-body">{activeShift.orderCount}</p>
                                    <p className="text-neutral-gray text-[10px] font-body">Orders</p>
                                </div>
                                <div className="bg-white/50 dark:bg-brand-dark/50 rounded-xl px-3 py-2.5 text-center">
                                    <p className="text-primary text-lg font-bold font-body">{formatGHS(activeShift.goodsSales)}</p>
                                    <p className="text-neutral-gray text-[10px] font-body">Revenue</p>
                                </div>
                            </div>
                            {activeShift.deliveryFees > 0 && (
                                <p className="text-neutral-gray text-[11px] font-body mt-3 flex items-center gap-1.5">
                                    <TruckIcon size={12} weight="fill" className="text-neutral-gray/70" />
                                    +{formatGHS(activeShift.deliveryFees)} delivery collected for 3rd-party riders (not revenue)
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="bg-neutral-card dark:bg-brand-dark border border-[#f0e8d8] dark:border-brown-light/15 rounded-2xl px-5 py-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-neutral-gray/10 flex items-center justify-center shrink-0">
                                <ClockIcon size={18} weight="fill" className="text-neutral-gray/50" />
                            </div>
                            <div>
                                <p className="text-text-dark dark:text-text-light text-sm font-semibold font-body">No active session</p>
                                <p className="text-neutral-gray text-xs font-body">You&apos;re currently off-shift.</p>
                            </div>
                        </div>
                    )}

                    {/* ── Today's Summary ─────────────────────────────────────────── */}
                    <div>
                        <p className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-widest mb-3">Today&apos;s Summary</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                                { label: 'Sessions', value: todayShifts.length.toString(), icon: ClockIcon },
                                { label: 'Orders', value: todayOrders.toString(), icon: ShoppingBagIcon },
                                { label: 'Revenue', value: formatGHS(todaySales), icon: CurrencyCircleDollarIcon },
                                { label: 'Delivery', value: formatGHS(todayDelivery), icon: TruckIcon },
                            ].map(({ label, value, icon: Icon }) => (
                                <div key={label} className="bg-brown dark:bg-brand-dark border border-brown-light/15 rounded-2xl px-4 py-3.5 text-center">
                                    <Icon size={14} weight="fill" className="text-primary mx-auto mb-1.5" />
                                    <p className="text-text-light text-lg font-bold font-body leading-none">{value}</p>
                                    <p className="text-neutral-gray text-[10px] font-body mt-1">{label}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Calendar (collapsible) ──────────────────────────────────── */}
                    {showCalendar && (
                        <div className="bg-neutral-card dark:bg-brand-dark border border-[#f0e8d8] dark:border-brown-light/15 rounded-2xl p-4">
                            <ShiftsCalendar
                                selectedDate={selectedDate}
                                onSelectDate={handleSelectDate}
                                viewMonth={viewMonth}
                                onChangeMonth={setViewMonth}
                                monthData={monthData}
                                loadingDays={new Set()}
                            />
                        </div>
                    )}

                    {/* ── Selected Day Sessions ──────────────────────────────────── */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-text-dark dark:text-text-light text-base font-bold font-body">
                                {dateLabel(selectedDate)}{selectedDate !== today ? "'s" : ''} Sessions
                            </h2>
                            {dayShifts.length > 0 && (
                                <div className="flex items-center gap-4 text-xs font-body">
                                    <span className="text-text-dark dark:text-text-light">
                                        <span className="font-bold">{dayShifts.length}</span> session{dayShifts.length !== 1 ? 's' : ''}
                                    </span>
                                    <span className="text-text-dark dark:text-text-light">
                                        <span className="font-bold">{dayShifts.reduce((s, sh) => s + sh.orderCount, 0)}</span> orders
                                    </span>
                                    <span className="text-primary font-bold">{formatGHS(dayShifts.reduce((s, sh) => s + sh.goodsSales, 0))}</span>
                                    {dayShifts.reduce((s, sh) => s + sh.deliveryFees, 0) > 0 && (
                                        <span className="text-neutral-gray flex items-center gap-1">
                                            <TruckIcon size={11} weight="fill" />
                                            {formatGHS(dayShifts.reduce((s, sh) => s + sh.deliveryFees, 0))}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {dayShifts.length === 0 ? (
                            <div className="py-8 text-center bg-neutral-card dark:bg-brand-dark border border-[#f0e8d8] dark:border-brown-light/15 rounded-2xl">
                                <ClockIcon size={28} weight="thin" className="text-neutral-gray/30 mx-auto mb-2" />
                                <p className="text-neutral-gray text-sm font-body">No sessions on this day</p>
                            </div>
                        ) : (
                            <div className="bg-neutral-card dark:bg-brand-dark border border-[#f0e8d8] dark:border-brown-light/15 rounded-2xl overflow-hidden">
                                {dayShifts.map((shift, i) => {
                                    const active = !shift.logoutAt;
                                    return (
                                        <div
                                            key={shift.id}
                                            className={`px-5 py-4 ${i < dayShifts.length - 1 ? 'border-b border-[#f0e8d8] dark:border-brown-light/15' : ''}`}
                                        >
                                            <div className="flex items-start gap-3">
                                                {/* Time column */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <div className="flex items-center gap-3 text-xs font-body text-neutral-gray">
                                                            <span className="flex items-center gap-1">
                                                                <SignInIcon size={11} weight="bold" className="text-secondary" />
                                                                <span className="text-text-dark dark:text-text-light font-bold text-base font-body tabular-nums">{formatTime(shift.loginAt)}</span>
                                                            </span>
                                                            <ArrowRightIcon size={12} weight="bold" className="text-neutral-gray/40" />
                                                            {shift.logoutAt ? (
                                                                <span className="flex items-center gap-1">
                                                                    <SignOutIcon size={11} weight="bold" className="text-error/70" />
                                                                    <span className="text-text-dark dark:text-text-light font-bold text-base font-body tabular-nums">{formatTime(shift.logoutAt)}</span>
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
                                                            <p className="text-text-dark dark:text-text-light text-sm font-bold font-body">{shift.orderCount}</p>
                                                        </div>
                                                        <p className="text-neutral-gray text-[10px] font-body">orders</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="flex items-center gap-1 justify-center">
                                                            <CurrencyCircleDollarIcon size={12} weight="fill" className="text-primary" />
                                                            <p className="text-primary text-sm font-bold font-body">{formatGHS(shift.goodsSales)}</p>
                                                        </div>
                                                        <p className="text-neutral-gray text-[10px] font-body">revenue</p>
                                                    </div>
                                                    {shift.deliveryFees > 0 && (
                                                        <div className="text-center">
                                                            <div className="flex items-center gap-1 justify-center">
                                                                <TruckIcon size={12} weight="fill" className="text-neutral-gray" />
                                                                <p className="text-text-dark dark:text-text-light text-sm font-bold font-body">{formatGHS(shift.deliveryFees)}</p>
                                                            </div>
                                                            <p className="text-neutral-gray text-[10px] font-body">delivery</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
