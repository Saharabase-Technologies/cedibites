'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    ClockIcon,
    UserCircleIcon,
    SignInIcon,
    SignOutIcon,
    ShoppingBagIcon,
    CurrencyCircleDollarIcon,
    SpinnerGapIcon,
    ArrowRightIcon,
    TimerIcon,
    CalendarDotsIcon,
    UsersThreeIcon,
} from '@phosphor-icons/react';
import { getShiftService, type StaffShift } from '@/lib/services/shifts/shift.service';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import ShiftsCalendar, { type DayShiftSummary } from './ShiftsCalendar';

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

function dateLabel(iso: string): string {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (iso === today) return 'Today';
    if (iso === yesterday) return 'Yesterday';
    return new Date(iso).toLocaleDateString('en-GH', { weekday: 'long', day: 'numeric', month: 'short' });
}

function toISO(d: Date): string {
    return d.toISOString().slice(0, 10);
}

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

// ─── Shift Card ───────────────────────────────────────────────────────────────

function ShiftCard({ shift, showName, isLast }: { shift: StaffShift; showName: boolean; isLast: boolean }) {
    const active = !shift.logoutAt;
    return (
        <div className={`px-5 py-4 ${!isLast ? 'border-b border-[#f0e8d8]' : ''}`}>
            <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                    {showName && (
                        <div className="flex items-center gap-2 mb-1.5">
                            <UserCircleIcon size={16} weight="fill" className={active ? 'text-secondary' : 'text-neutral-gray'} />
                            <p className="text-text-dark text-sm font-semibold font-body">{shift.staffName}</p>
                            {active && (
                                <span className="text-[10px] font-bold font-body px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">Active</span>
                            )}
                        </div>
                    )}
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
                        {!showName && active && (
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
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ShiftsPage() {
    const { staffUser } = useStaffAuth();
    const today = toISO(new Date());
    const [tab, setTab] = useState<'all' | 'mine'>('all');
    const [selectedDate, setSelectedDate] = useState(today);
    const [showCalendar, setShowCalendar] = useState(false);
    const [viewMonth, setViewMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });

    // ── All Staff data ───────────────────────────────────────────────────────
    const [monthData, setMonthData] = useState<Map<string, DayShiftSummary>>(new Map());
    const [loadingDays, setLoadingDays] = useState<Set<string>>(new Set());
    const loadedMonths = useRef<Set<string>>(new Set());
    const [shifts, setShifts] = useState<StaffShift[]>([]);
    const [loading, setLoading] = useState(true);

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

    useEffect(() => {
        loadMonth(viewMonth.getFullYear(), viewMonth.getMonth());
    }, [viewMonth, loadMonth]);

    const loadDay = useCallback(async (d: string) => {
        setLoading(true);
        const data = await getShiftService().getByDate(d);
        data.sort((a, b) => {
            if (!a.logoutAt && b.logoutAt) return -1;
            if (a.logoutAt && !b.logoutAt) return 1;
            return b.loginAt - a.loginAt;
        });
        setShifts(data);
        setLoading(false);
    }, []);

    useEffect(() => { loadDay(selectedDate); }, [selectedDate, loadDay]);

    // ── My Shifts data ───────────────────────────────────────────────────────
    const [myShifts, setMyShifts] = useState<StaffShift[]>([]);
    const [myLoading, setMyLoading] = useState(true);

    const loadMyShifts = useCallback(async () => {
        if (!staffUser) return;
        const data = await getShiftService().getByStaff(staffUser.id);
        data.sort((a, b) => b.loginAt - a.loginAt);
        setMyShifts(data);
        setMyLoading(false);
    }, [staffUser]);

    useEffect(() => { loadMyShifts(); }, [loadMyShifts]);

    const myMonthData = useMemo(() => {
        const map = new Map<string, DayShiftSummary>();
        for (const s of myShifts) {
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
    }, [myShifts]);

    const myDayShifts = useMemo(() => {
        return myShifts
            .filter(s => new Date(s.loginAt).toISOString().slice(0, 10) === selectedDate)
            .sort((a, b) => {
                if (!a.logoutAt && b.logoutAt) return -1;
                if (a.logoutAt && !b.logoutAt) return 1;
                return b.loginAt - a.loginAt;
            });
    }, [myShifts, selectedDate]);

    const myActiveShift = myShifts.find(s => !s.logoutAt);

    // ── Derived stats ────────────────────────────────────────────────────────
    const activeShifts = shifts.filter(s => !s.logoutAt);
    const todayOrders = shifts.reduce((s, sh) => s + sh.orderCount, 0);
    const todaySales = shifts.reduce((s, sh) => s + sh.totalSales, 0);

    const myTodayShifts = useMemo(() => {
        return myShifts.filter(s => new Date(s.loginAt).toISOString().slice(0, 10) === today);
    }, [myShifts, today]);
    const myTodayOrders = myTodayShifts.reduce((s, sh) => s + sh.orderCount, 0);
    const myTodaySales = myTodayShifts.reduce((s, sh) => s + sh.totalSales, 0);

    const handleSelectDate = useCallback((date: string) => {
        setSelectedDate(date);
        setShowCalendar(false);
    }, []);

    return (
        <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">

            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-text-dark text-xl font-bold font-body">Shifts</h1>
                    <p className="text-neutral-gray text-sm font-body mt-0.5">
                        {tab === 'all' ? 'Track staff sessions, orders, and sales.' : 'Your personal sessions and performance.'}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowCalendar(v => !v)}
                    className="flex items-center gap-2 bg-neutral-card border border-[#f0e8d8] rounded-xl px-3 py-2 text-xs font-body font-medium text-text-dark hover:bg-brown-light/10 transition-colors cursor-pointer"
                >
                    <CalendarDotsIcon size={14} weight="fill" className="text-primary" />
                    {selectedDate === today ? 'Today' : dateLabel(selectedDate)}
                </button>
            </div>

            {/* Tab toggle */}
            <div className="flex gap-1 bg-neutral-light rounded-xl p-1 mb-6 w-fit">
                {([{ key: 'all', label: 'All Staff' }, { key: 'mine', label: 'My Shifts' }] as const).map(({ key, label }) => (
                    <button key={key} type="button" onClick={() => setTab(key)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium font-body transition-all cursor-pointer ${tab === key ? 'bg-neutral-card text-text-dark shadow-sm' : 'text-neutral-gray hover:text-text-dark'}`}>
                        {label}
                    </button>
                ))}
            </div>

            {tab === 'all' ? (
                /* ── ALL STAFF ───────────────────────────────────────────────── */
                loading ? (
                    <div className="py-16 flex items-center justify-center gap-2 text-neutral-gray text-sm font-body">
                        <SpinnerGapIcon size={18} className="animate-spin" />
                        Loading...
                    </div>
                ) : (
                    <div className="flex flex-col gap-5">

                        {/* Active sessions hero */}
                        {activeShifts.length > 0 ? (
                            <div className="bg-secondary/5 border border-secondary/25 rounded-2xl px-5 py-5">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-secondary/15 flex items-center justify-center shrink-0">
                                        <span className="w-3 h-3 rounded-full bg-secondary animate-pulse" />
                                    </div>
                                    <div>
                                        <p className="text-secondary text-sm font-bold font-body">
                                            {activeShifts.length} active session{activeShifts.length !== 1 ? 's' : ''}
                                        </p>
                                        <p className="text-neutral-gray text-xs font-body">
                                            {activeShifts.map(s => s.staffName.split(' ')[0]).join(', ')}
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-white/50 rounded-xl px-3 py-2.5 text-center">
                                        <p className="text-text-dark text-lg font-bold font-body">{activeShifts.length}</p>
                                        <p className="text-neutral-gray text-[10px] font-body">Staff Online</p>
                                    </div>
                                    <div className="bg-white/50 rounded-xl px-3 py-2.5 text-center">
                                        <p className="text-text-dark text-lg font-bold font-body">{activeShifts.reduce((s, sh) => s + sh.orderCount, 0)}</p>
                                        <p className="text-neutral-gray text-[10px] font-body">Orders</p>
                                    </div>
                                    <div className="bg-white/50 rounded-xl px-3 py-2.5 text-center">
                                        <p className="text-primary text-lg font-bold font-body">{formatGHS(activeShifts.reduce((s, sh) => s + sh.totalSales, 0))}</p>
                                        <p className="text-neutral-gray text-[10px] font-body">Sales</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl px-5 py-4 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-neutral-gray/10 flex items-center justify-center shrink-0">
                                    <UsersThreeIcon size={18} weight="fill" className="text-neutral-gray/50" />
                                </div>
                                <div>
                                    <p className="text-text-dark text-sm font-semibold font-body">No active sessions</p>
                                    <p className="text-neutral-gray text-xs font-body">No staff currently on shift.</p>
                                </div>
                            </div>
                        )}

                        {/* Today's Summary */}
                        <div>
                            <p className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-widest mb-3">Today&apos;s Summary</p>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: 'Sessions', value: shifts.length.toString(), icon: ClockIcon },
                                    { label: 'Orders', value: todayOrders.toString(), icon: ShoppingBagIcon },
                                    { label: 'Revenue', value: formatGHS(todaySales), icon: CurrencyCircleDollarIcon },
                                ].map(({ label, value, icon: Icon }) => (
                                    <div key={label} className="bg-neutral-card border border-[#f0e8d8] rounded-2xl px-4 py-3.5 text-center">
                                        <Icon size={14} weight="fill" className="text-primary mx-auto mb-1.5" />
                                        <p className="text-text-dark text-lg font-bold font-body leading-none">{value}</p>
                                        <p className="text-neutral-gray text-[10px] font-body mt-1">{label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Calendar (collapsible) */}
                        {showCalendar && (
                            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-4">
                                <ShiftsCalendar
                                    selectedDate={selectedDate}
                                    onSelectDate={handleSelectDate}
                                    viewMonth={viewMonth}
                                    onChangeMonth={setViewMonth}
                                    monthData={monthData}
                                    loadingDays={loadingDays}
                                />
                            </div>
                        )}

                        {/* Selected Day Sessions */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-text-dark text-base font-bold font-body">
                                    {dateLabel(selectedDate)}{selectedDate !== today ? "'s" : ''} Sessions
                                </h2>
                                {shifts.length > 0 && (
                                    <div className="flex items-center gap-4 text-xs font-body">
                                        <span className="text-text-dark">
                                            <span className="font-bold">{shifts.length}</span> session{shifts.length !== 1 ? 's' : ''}
                                        </span>
                                        <span className="text-text-dark">
                                            <span className="font-bold">{todayOrders}</span> orders
                                        </span>
                                        <span className="text-primary font-bold">{formatGHS(todaySales)}</span>
                                    </div>
                                )}
                            </div>

                            {shifts.length === 0 ? (
                                <div className="py-8 text-center bg-neutral-card border border-[#f0e8d8] rounded-2xl">
                                    <ClockIcon size={28} weight="thin" className="text-neutral-gray/30 mx-auto mb-2" />
                                    <p className="text-neutral-gray text-sm font-body">
                                        {selectedDate === today ? 'No staff have logged in today.' : 'No sessions on this day'}
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
                                    {shifts.map((shift, i) => (
                                        <ShiftCard key={shift.id} shift={shift} showName isLast={i === shifts.length - 1} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )
            ) : (
                /* ── MY SHIFTS ───────────────────────────────────────────────── */
                myLoading ? (
                    <div className="py-16 flex items-center justify-center gap-2 text-neutral-gray text-sm font-body">
                        <SpinnerGapIcon size={18} className="animate-spin" />
                        Loading...
                    </div>
                ) : myShifts.length === 0 ? (
                    <div className="py-16 text-center">
                        <ClockIcon size={32} weight="thin" className="text-neutral-gray/30 mx-auto mb-3" />
                        <p className="text-text-dark text-sm font-semibold font-body">No sessions yet</p>
                        <p className="text-neutral-gray text-sm font-body mt-1">
                            Your sales sessions will appear here automatically when you log in and place orders.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-5">

                        {/* Active session hero */}
                        {myActiveShift ? (
                            <div className="bg-secondary/5 border border-secondary/25 rounded-2xl px-5 py-5">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-secondary/15 flex items-center justify-center shrink-0">
                                        <span className="w-3 h-3 rounded-full bg-secondary animate-pulse" />
                                    </div>
                                    <div>
                                        <p className="text-secondary text-sm font-bold font-body">Session in progress</p>
                                        <p className="text-neutral-gray text-xs font-body">
                                            Started {formatTime(myActiveShift.loginAt)} · {myActiveShift.branchName}
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-white/50 rounded-xl px-3 py-2.5 text-center">
                                        <p className="text-text-dark text-lg font-bold font-body">{formatDuration(myActiveShift.loginAt)}</p>
                                        <p className="text-neutral-gray text-[10px] font-body">Duration</p>
                                    </div>
                                    <div className="bg-white/50 rounded-xl px-3 py-2.5 text-center">
                                        <p className="text-text-dark text-lg font-bold font-body">{myActiveShift.orderCount}</p>
                                        <p className="text-neutral-gray text-[10px] font-body">Orders</p>
                                    </div>
                                    <div className="bg-white/50 rounded-xl px-3 py-2.5 text-center">
                                        <p className="text-primary text-lg font-bold font-body">{formatGHS(myActiveShift.totalSales)}</p>
                                        <p className="text-neutral-gray text-[10px] font-body">Sales</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl px-5 py-4 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-neutral-gray/10 flex items-center justify-center shrink-0">
                                    <ClockIcon size={18} weight="fill" className="text-neutral-gray/50" />
                                </div>
                                <div>
                                    <p className="text-text-dark text-sm font-semibold font-body">No active session</p>
                                    <p className="text-neutral-gray text-xs font-body">You&apos;re currently off-shift.</p>
                                </div>
                            </div>
                        )}

                        {/* Today's Summary */}
                        <div>
                            <p className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-widest mb-3">Today&apos;s Summary</p>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: 'Sessions', value: myTodayShifts.length.toString(), icon: ClockIcon },
                                    { label: 'Orders', value: myTodayOrders.toString(), icon: ShoppingBagIcon },
                                    { label: 'Revenue', value: formatGHS(myTodaySales), icon: CurrencyCircleDollarIcon },
                                ].map(({ label, value, icon: Icon }) => (
                                    <div key={label} className="bg-neutral-card border border-[#f0e8d8] rounded-2xl px-4 py-3.5 text-center">
                                        <Icon size={14} weight="fill" className="text-primary mx-auto mb-1.5" />
                                        <p className="text-text-dark text-lg font-bold font-body leading-none">{value}</p>
                                        <p className="text-neutral-gray text-[10px] font-body mt-1">{label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Calendar (collapsible) */}
                        {showCalendar && (
                            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-4">
                                <ShiftsCalendar
                                    selectedDate={selectedDate}
                                    onSelectDate={handleSelectDate}
                                    viewMonth={viewMonth}
                                    onChangeMonth={setViewMonth}
                                    monthData={myMonthData}
                                    loadingDays={new Set()}
                                />
                            </div>
                        )}

                        {/* Selected Day Sessions */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-text-dark text-base font-bold font-body">
                                    {dateLabel(selectedDate)}{selectedDate !== today ? "'s" : ''} Sessions
                                </h2>
                                {myDayShifts.length > 0 && (
                                    <div className="flex items-center gap-4 text-xs font-body">
                                        <span className="text-text-dark">
                                            <span className="font-bold">{myDayShifts.length}</span> session{myDayShifts.length !== 1 ? 's' : ''}
                                        </span>
                                        <span className="text-text-dark">
                                            <span className="font-bold">{myDayShifts.reduce((s, sh) => s + sh.orderCount, 0)}</span> orders
                                        </span>
                                        <span className="text-primary font-bold">{formatGHS(myDayShifts.reduce((s, sh) => s + sh.totalSales, 0))}</span>
                                    </div>
                                )}
                            </div>

                            {myDayShifts.length === 0 ? (
                                <div className="py-8 text-center bg-neutral-card border border-[#f0e8d8] rounded-2xl">
                                    <ClockIcon size={28} weight="thin" className="text-neutral-gray/30 mx-auto mb-2" />
                                    <p className="text-neutral-gray text-sm font-body">No sessions on this day</p>
                                </div>
                            ) : (
                                <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
                                    {myDayShifts.map((shift, i) => (
                                        <ShiftCard key={shift.id} shift={shift} showName={false} isLast={i === myDayShifts.length - 1} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )
            )}
        </div>
    );
}
