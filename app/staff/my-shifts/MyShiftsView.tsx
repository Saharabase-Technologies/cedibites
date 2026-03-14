'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    ClockIcon,
    ShoppingBagIcon,
    CurrencyCircleDollarIcon,
    SpinnerGapIcon,
    ArrowRightIcon,
    CalendarBlankIcon,
    TimerIcon,
    TrendUpIcon,
} from '@phosphor-icons/react';
import { getShiftService, type StaffShift } from '@/lib/services/shifts/shift.service';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';

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

// Returns 0–100 representing position within the 24h day
function timeToPercent(ts: number): number {
    const d = new Date(ts);
    return ((d.getHours() * 60 + d.getMinutes()) / 1440) * 100;
}

// Group shifts by calendar date (YYYY-MM-DD)
function groupByDay(shifts: StaffShift[]): { date: string; shifts: StaffShift[] }[] {
    const map = new Map<string, StaffShift[]>();
    for (const s of shifts) {
        const key = new Date(s.loginAt).toISOString().slice(0, 10);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(s);
    }
    return Array.from(map.entries())
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, shifts]) => ({ date, shifts }));
}

function formatDayLabel(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-GH', { weekday: 'long', day: 'numeric', month: 'short' });
}

// ─── Timeline bar ──────────────────────────────────────────────────────────────

function DayTimeline({ shifts }: { shifts: StaffShift[] }) {
    return (
        <div className="relative h-2 bg-neutral-gray/10 rounded-full overflow-hidden">
            {shifts.map(shift => {
                const start = timeToPercent(shift.loginAt);
                const end = shift.logoutAt ? timeToPercent(shift.logoutAt) : timeToPercent(Date.now());
                const width = Math.max(end - start, 1.5);
                const active = !shift.logoutAt;
                return (
                    <div
                        key={shift.id}
                        className={`absolute top-0 h-full rounded-full ${active ? 'bg-secondary' : 'bg-primary/60'}`}
                        style={{ left: `${start}%`, width: `${width}%` }}
                    />
                );
            })}
            {/* Hour ticks at 6h, 12h, 18h */}
            {[25, 50, 75].map(pct => (
                <div key={pct} className="absolute top-0 h-full w-px bg-neutral-gray/20" style={{ left: `${pct}%` }} />
            ))}
        </div>
    );
}

// ─── Shift card ────────────────────────────────────────────────────────────────

function ShiftCard({ shift }: { shift: StaffShift }) {
    const active = !shift.logoutAt;

    return (
        <div className={`rounded-2xl border px-5 py-4 flex flex-col gap-3 ${
            active
                ? 'bg-secondary/5 border-secondary/25'
                : 'bg-neutral-card border-[#f0e8d8]'
        }`}>

            {/* Time window row */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-text-dark font-bold text-xl font-body tabular-nums leading-none">
                        {formatTime(shift.loginAt)}
                    </span>
                    <ArrowRightIcon size={14} weight="bold" className="text-neutral-gray shrink-0" />
                    {shift.logoutAt ? (
                        <span className="text-text-dark font-bold text-xl font-body tabular-nums leading-none">
                            {formatTime(shift.logoutAt)}
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 text-secondary font-bold text-base font-body">
                            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse shrink-0" />
                            Now
                        </span>
                    )}
                </div>

                {/* Duration pill */}
                <span className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold font-body ${
                    active ? 'bg-secondary/15 text-secondary' : 'bg-neutral-gray/10 text-neutral-gray'
                }`}>
                    <TimerIcon size={11} weight="fill" />
                    {formatDuration(shift.loginAt, shift.logoutAt)}
                </span>
            </div>

            {/* Branch */}
            <p className="text-neutral-gray text-xs font-body -mt-1">{shift.branchName}</p>

            {/* Stats row */}
            <div className="flex items-center gap-4 pt-1 border-t border-[#f0e8d8]">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <ShoppingBagIcon size={14} weight="fill" className="text-primary" />
                    </div>
                    <div>
                        <p className="text-text-dark text-base font-bold font-body leading-none">{shift.orderCount}</p>
                        <p className="text-neutral-gray text-[10px] font-body">order{shift.orderCount !== 1 ? 's' : ''}</p>
                    </div>
                </div>

                <div className="w-px h-8 bg-[#f0e8d8]" />

                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                        <CurrencyCircleDollarIcon size={14} weight="fill" className="text-secondary" />
                    </div>
                    <div>
                        <p className="text-primary text-base font-bold font-body leading-none">{formatGHS(shift.totalSales)}</p>
                        <p className="text-neutral-gray text-[10px] font-body">in sales</p>
                    </div>
                </div>

                {shift.orderCount > 0 && (
                    <>
                        <div className="w-px h-8 bg-[#f0e8d8]" />
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-neutral-gray/10 flex items-center justify-center shrink-0">
                                <TrendUpIcon size={14} weight="fill" className="text-neutral-gray" />
                            </div>
                            <div>
                                <p className="text-text-dark text-base font-bold font-body leading-none">
                                    {formatGHS(shift.totalSales / shift.orderCount)}
                                </p>
                                <p className="text-neutral-gray text-[10px] font-body">avg / order</p>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ─── Day group ─────────────────────────────────────────────────────────────────

function DayGroup({ date, shifts }: { date: string; shifts: StaffShift[] }) {
    const daySales = shifts.reduce((s, sh) => s + sh.totalSales, 0);
    const dayOrders = shifts.reduce((s, sh) => s + sh.orderCount, 0);

    return (
        <div className="flex flex-col gap-3">
            {/* Day header */}
            <div className="flex items-end justify-between gap-2">
                <div className="flex items-center gap-2">
                    <CalendarBlankIcon size={13} weight="fill" className="text-neutral-gray" />
                    <span className="text-text-dark text-sm font-semibold font-body">{formatDayLabel(date)}</span>
                    {shifts.length > 1 && (
                        <span className="text-neutral-gray text-xs font-body">· {shifts.length} sessions</span>
                    )}
                </div>
                <div className="text-right">
                    <span className="text-primary text-sm font-bold font-body">{formatGHS(daySales)}</span>
                    <span className="text-neutral-gray text-xs font-body ml-1.5">· {dayOrders} orders</span>
                </div>
            </div>

            {/* Timeline bar for the day */}
            <DayTimeline shifts={shifts} />

            {/* Shift cards */}
            <div className="flex flex-col gap-2">
                {shifts.map(shift => (
                    <ShiftCard key={shift.id} shift={shift} />
                ))}
            </div>
        </div>
    );
}

// ─── View ──────────────────────────────────────────────────────────────────────

export default function MyShiftsView() {
    const { staffUser } = useStaffAuth();
    const [shifts, setShifts] = useState<StaffShift[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!staffUser) return;
        const data = await getShiftService().getByStaff(staffUser.id);
        data.sort((a, b) => {
            if (!a.logoutAt && b.logoutAt) return -1;
            if (a.logoutAt && !b.logoutAt) return 1;
            return b.loginAt - a.loginAt;
        });
        setShifts(data);
        setLoading(false);
    }, [staffUser]);

    useEffect(() => { load(); }, [load]);

    const groups = groupByDay(shifts);
    const totalOrders = shifts.reduce((s, sh) => s + sh.orderCount, 0);
    const totalSales = shifts.reduce((s, sh) => s + sh.totalSales, 0);
    const activeShift = shifts.find(s => !s.logoutAt);

    return (
        <div className="px-4 md:px-8 py-6 max-w-2xl mx-auto">

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
            ) : shifts.length === 0 ? (
                <div className="py-16 text-center">
                    <ClockIcon size={32} weight="thin" className="text-neutral-gray/30 mx-auto mb-3" />
                    <p className="text-text-dark text-sm font-semibold font-body">No sessions yet</p>
                    <p className="text-neutral-gray text-sm font-body mt-1">
                        Your sales sessions will appear here automatically when you log in and place orders.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-8">

                    {/* Summary banner */}
                    {!activeShift && (
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: 'Sessions', value: shifts.length.toString(), icon: ClockIcon },
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
                    )}

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

                    {/* Day groups */}
                    {groups.map(({ date, shifts }) => (
                        <DayGroup key={date} date={date} shifts={shifts} />
                    ))}
                </div>
            )}
        </div>
    );
}
