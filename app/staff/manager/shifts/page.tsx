'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    ClockIcon,
    UserCircleIcon,
    SignInIcon,
    SignOutIcon,
    ShoppingBagIcon,
    CurrencyCircleDollarIcon,
    SpinnerGapIcon,
} from '@phosphor-icons/react';
import { getShiftService, type StaffShift } from '@/lib/services/shifts/shift.service';
import ShiftsCalendar, { type DayShiftSummary } from './ShiftsCalendar';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(loginAt: number, logoutAt?: number): string {
    const end = logoutAt ?? Date.now();
    const mins = Math.floor((end - loginAt) / 60000);
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatGHS(n: number): string {
    return `₵${n.toFixed(2)}`;
}

function dateLabel(iso: string): string {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (iso === today) return 'Today';
    if (iso === yesterday) return 'Yesterday';
    return new Date(iso).toLocaleDateString('en-GH', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
}

function toISO(d: Date): string {
    return d.toISOString().slice(0, 10);
}

/** Get all dates in a month that are <= today */
function getMonthDates(year: number, month: number): string[] {
    const today = toISO(new Date());
    const last = new Date(year, month + 1, 0).getDate();
    const dates: string[] = [];
    for (let d = 1; d <= last; d++) {
        const iso = toISO(new Date(year, month, d));
        if (iso <= today) dates.push(iso);
    }
    return dates;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ShiftsPage() {
    const today = toISO(new Date());
    const [selectedDate, setSelectedDate] = useState(today);
    const [viewMonth, setViewMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });

    // Monthly shift summaries for calendar cells
    const [monthData, setMonthData] = useState<Map<string, DayShiftSummary>>(new Map());
    const [loadingDays, setLoadingDays] = useState<Set<string>>(new Set());
    const loadedMonths = useRef<Set<string>>(new Set());

    // Selected day shifts
    const [shifts, setShifts] = useState<StaffShift[]>([]);
    const [loading, setLoading] = useState(true);

    // Load all days for a month
    const loadMonth = useCallback(async (year: number, month: number) => {
        const key = `${year}-${month}`;
        if (loadedMonths.current.has(key)) return;
        loadedMonths.current.add(key);

        const dates = getMonthDates(year, month);
        setLoadingDays(prev => new Set([...prev, ...dates]));

        const service = getShiftService();
        const results = await Promise.allSettled(
            dates.map(async d => {
                const data = await service.getByDate(d);
                return { date: d, shifts: data };
            }),
        );

        setMonthData(prev => {
            const next = new Map(prev);
            for (const r of results) {
                if (r.status === 'fulfilled') {
                    const { date, shifts: dayShifts } = r.value;
                    next.set(date, {
                        count: dayShifts.length,
                        orders: dayShifts.reduce((s, sh) => s + sh.orderCount, 0),
                        sales: dayShifts.reduce((s, sh) => s + sh.totalSales, 0),
                        hasActive: dayShifts.some(sh => !sh.logoutAt),
                    });
                }
            }
            return next;
        });

        setLoadingDays(prev => {
            const next = new Set(prev);
            for (const d of dates) next.delete(d);
            return next;
        });
    }, []);

    // Load month data when viewMonth changes
    useEffect(() => {
        loadMonth(viewMonth.getFullYear(), viewMonth.getMonth());
    }, [viewMonth, loadMonth]);

    // Load selected day shifts
    const loadDay = useCallback(async (d: string) => {
        setLoading(true);
        const service = getShiftService();
        const data = await service.getByDate(d);
        data.sort((a, b) => {
            if (!a.logoutAt && b.logoutAt) return -1;
            if (a.logoutAt && !b.logoutAt) return 1;
            return b.loginAt - a.loginAt;
        });
        setShifts(data);
        setLoading(false);
    }, []);

    useEffect(() => { loadDay(selectedDate); }, [selectedDate, loadDay]);

    const activeCount = shifts.filter(s => !s.logoutAt).length;
    const totalOrders = shifts.reduce((s, sh) => s + sh.orderCount, 0);
    const totalSales  = shifts.reduce((s, sh) => s + sh.totalSales, 0);

    return (
        <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto">

            {/* Header */}
            <div className="flex items-center gap-2 mb-6">
                <ClockIcon size={20} weight="fill" className="text-primary" />
                <h1 className="text-text-dark text-2xl font-bold font-body">Shift Report</h1>
            </div>

            {/* Calendar */}
            <div className="mb-6">
                <ShiftsCalendar
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                    viewMonth={viewMonth}
                    onChangeMonth={setViewMonth}
                    monthData={monthData}
                    loadingDays={loadingDays}
                />
            </div>

            {/* Selected day header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-text-dark text-lg font-bold font-body">{dateLabel(selectedDate)}</h2>
                {!loading && shifts.length > 0 && (
                    <div className="flex items-center gap-4 text-xs font-body">
                        <span className="text-text-dark">
                            <span className="font-bold">{shifts.length}</span> shift{shifts.length !== 1 ? 's' : ''}
                            {activeCount > 0 && <span className="text-secondary font-bold"> · {activeCount} active</span>}
                        </span>
                        <span className="text-text-dark">
                            <span className="font-bold">{totalOrders}</span> orders
                        </span>
                        <span className="text-primary font-bold">{formatGHS(totalSales)}</span>
                    </div>
                )}
            </div>

            {/* Shift list for selected day */}
            {loading ? (
                <div className="py-12 flex items-center justify-center gap-2 text-neutral-gray text-sm font-body">
                    <SpinnerGapIcon size={18} className="animate-spin" />
                    Loading shifts...
                </div>
            ) : shifts.length === 0 ? (
                <div className="py-12 text-center">
                    <ClockIcon size={32} weight="thin" className="text-neutral-gray/30 mx-auto mb-3" />
                    <p className="text-text-dark text-sm font-medium font-body">No shifts recorded</p>
                    <p className="text-neutral-gray text-sm font-body mt-1">
                        {selectedDate === today ? 'No staff have logged in today.' : `No shift data for this day.`}
                    </p>
                </div>
            ) : (
                <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
                    {shifts.map((shift, i) => {
                        const active = !shift.logoutAt;
                        return (
                            <div
                                key={shift.id}
                                className={`px-5 py-4 ${i < shifts.length - 1 ? 'border-b border-[#f0e8d8]' : ''}`}
                            >
                                <div className="flex items-start gap-3">
                                    {/* Avatar */}
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${active ? 'bg-secondary/10' : 'bg-neutral-light'}`}>
                                        <UserCircleIcon size={22} weight="fill" className={active ? 'text-secondary' : 'text-neutral-gray'} />
                                    </div>

                                    {/* Main info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-text-dark text-sm font-semibold font-body">{shift.staffName}</p>
                                            {active && (
                                                <span className="text-[10px] font-bold font-body px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">
                                                    Active
                                                </span>
                                            )}
                                            <span className="text-[10px] font-body text-neutral-gray bg-neutral-light px-2 py-0.5 rounded-full">
                                                {shift.branchName}
                                            </span>
                                        </div>

                                        {/* Times */}
                                        <div className="flex items-center gap-3 mt-1.5 text-xs font-body text-neutral-gray">
                                            <span className="flex items-center gap-1">
                                                <SignInIcon size={11} weight="bold" className="text-secondary" />
                                                {formatTime(shift.loginAt)}
                                            </span>
                                            {shift.logoutAt ? (
                                                <span className="flex items-center gap-1">
                                                    <SignOutIcon size={11} weight="bold" className="text-error/70" />
                                                    {formatTime(shift.logoutAt)}
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-secondary">
                                                    <SignOutIcon size={11} weight="bold" />
                                                    Still active
                                                </span>
                                            )}
                                            <span className="text-neutral-gray/60">
                                                {formatDuration(shift.loginAt, shift.logoutAt)}
                                            </span>
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
    );
}
