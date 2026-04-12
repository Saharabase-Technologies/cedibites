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
    BuildingsIcon,
    MagnifyingGlassIcon,
    XIcon,
} from '@phosphor-icons/react';
import { getShiftService, type StaffShift } from '@/lib/services/shifts/shift.service';
import { useBranchesApi } from '@/lib/api/hooks/useBranchesApi';
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

function ShiftCard({ shift, isLast }: { shift: StaffShift; isLast: boolean }) {
    const active = !shift.logoutAt;
    return (
        <div className={`px-5 py-4 ${!isLast ? 'border-b border-[#f0e8d8]' : ''}`}>
            <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                        <UserCircleIcon size={16} weight="fill" className={active ? 'text-secondary' : 'text-neutral-gray'} />
                        <p className="text-text-dark text-sm font-semibold font-body">{shift.staffName}</p>
                        {active && (
                            <span className="text-[10px] font-bold font-body px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">Active</span>
                        )}
                    </div>
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
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs font-body text-neutral-gray">
                        <span className="flex items-center gap-1">
                            <TimerIcon size={11} weight="fill" />
                            {formatDuration(shift.loginAt, shift.logoutAt)}
                        </span>
                        <span className="flex items-center gap-1">
                            <BuildingsIcon size={11} weight="fill" />
                            {shift.branchName}
                        </span>
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

export default function AdminShiftsPage() {
    const { branches } = useBranchesApi();
    const today = toISO(new Date());
    const [selectedDate, setSelectedDate] = useState(today);
    const [showCalendar, setShowCalendar] = useState(false);
    const [branchFilter, setBranchFilter] = useState<number | ''>('');
    const [search, setSearch] = useState('');
    const [viewMonth, setViewMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });

    // ── Shift data ───────────────────────────────────────────────────────────
    const [monthData, setMonthData] = useState<Map<string, DayShiftSummary>>(new Map());
    const [loadingDays, setLoadingDays] = useState<Set<string>>(new Set());
    const loadedMonths = useRef<Set<string>>(new Set());
    const [shifts, setShifts] = useState<StaffShift[]>([]);
    const [loading, setLoading] = useState(true);

    // Reset loaded months when branch filter changes to force re-fetch
    useEffect(() => {
        loadedMonths.current.clear();
        setMonthData(new Map());
    }, [branchFilter]);

    const loadMonth = useCallback(async (year: number, month: number) => {
        const key = `${year}-${month}-${branchFilter}`;
        if (loadedMonths.current.has(key)) return;
        loadedMonths.current.add(key);

        const dates = getMonthDates(year, month);
        setLoadingDays(prev => new Set([...prev, ...dates]));

        const service = getShiftService();
        const results = await Promise.allSettled(
            dates.map(async d => {
                let data = await service.getByDate(d);
                if (branchFilter) {
                    data = data.filter(s => String(s.branchId) === String(branchFilter));
                }
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
    }, [branchFilter]);

    useEffect(() => {
        loadMonth(viewMonth.getFullYear(), viewMonth.getMonth());
    }, [viewMonth, loadMonth]);

    const loadDay = useCallback(async (d: string) => {
        setLoading(true);
        let data = await getShiftService().getByDate(d);
        if (branchFilter) {
            data = data.filter(s => String(s.branchId) === String(branchFilter));
        }
        data.sort((a, b) => {
            if (!a.logoutAt && b.logoutAt) return -1;
            if (a.logoutAt && !b.logoutAt) return 1;
            return b.loginAt - a.loginAt;
        });
        setShifts(data);
        setLoading(false);
    }, [branchFilter]);

    useEffect(() => { loadDay(selectedDate); }, [selectedDate, loadDay]);

    // ── Filtered shifts (search) ─────────────────────────────────────────────
    const filteredShifts = useMemo(() => {
        if (!search.trim()) return shifts;
        const q = search.toLowerCase();
        return shifts.filter(s =>
            s.staffName.toLowerCase().includes(q) ||
            s.branchName.toLowerCase().includes(q)
        );
    }, [shifts, search]);

    // ── Derived stats ────────────────────────────────────────────────────────
    const activeShifts = filteredShifts.filter(s => !s.logoutAt);
    const todayOrders = filteredShifts.reduce((s, sh) => s + sh.orderCount, 0);
    const todaySales = filteredShifts.reduce((s, sh) => s + sh.totalSales, 0);

    const handleSelectDate = useCallback((date: string) => {
        setSelectedDate(date);
        setShowCalendar(false);
    }, []);

    return (
        <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">

            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-text-dark text-xl font-bold font-body">Shifts</h1>
                    <p className="text-neutral-gray text-sm font-body mt-0.5">
                        Track staff sessions, orders, and sales across all branches.
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

            {/* Filters row */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
                {/* Branch filter */}
                <select
                    value={branchFilter}
                    onChange={e => setBranchFilter(e.target.value ? Number(e.target.value) : '')}
                    className="bg-neutral-card border border-[#f0e8d8] rounded-xl px-3 py-2 text-sm font-body text-text-dark focus:outline-none focus:border-primary/50 cursor-pointer"
                >
                    <option value="">All Branches</option>
                    {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                </select>

                {/* Staff search */}
                <div className="relative flex-1 max-w-xs">
                    <MagnifyingGlassIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-gray" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search staff..."
                        className="w-full pl-8 pr-8 py-2 bg-neutral-card border border-[#f0e8d8] rounded-xl text-sm font-body text-text-dark placeholder:text-neutral-gray/50 focus:outline-none focus:border-primary/50"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-gray hover:text-text-dark cursor-pointer"
                        >
                            <XIcon size={12} weight="bold" />
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
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
                                <p className="text-neutral-gray text-xs font-body">No staff currently on shift{branchFilter ? ' at this branch' : ''}.</p>
                            </div>
                        </div>
                    )}

                    {/* Today's Summary */}
                    <div>
                        <p className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-widest mb-3">{dateLabel(selectedDate)}&apos;s Summary</p>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: 'Sessions', value: filteredShifts.length.toString(), icon: ClockIcon },
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
                        <ShiftsCalendar
                            selectedDate={selectedDate}
                            onSelectDate={handleSelectDate}
                            viewMonth={viewMonth}
                            onChangeMonth={setViewMonth}
                            monthData={monthData}
                            loadingDays={loadingDays}
                        />
                    )}

                    {/* Selected Day Sessions */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-text-dark text-base font-bold font-body">
                                {dateLabel(selectedDate)}{selectedDate !== today ? "'s" : ''} Sessions
                            </h2>
                            {filteredShifts.length > 0 && (
                                <div className="flex items-center gap-4 text-xs font-body">
                                    <span className="text-text-dark">
                                        <span className="font-bold">{filteredShifts.length}</span> session{filteredShifts.length !== 1 ? 's' : ''}
                                    </span>
                                    <span className="text-text-dark">
                                        <span className="font-bold">{todayOrders}</span> orders
                                    </span>
                                    <span className="text-primary font-bold">{formatGHS(todaySales)}</span>
                                </div>
                            )}
                        </div>

                        {filteredShifts.length === 0 ? (
                            <div className="py-8 text-center bg-neutral-card border border-[#f0e8d8] rounded-2xl">
                                <ClockIcon size={28} weight="thin" className="text-neutral-gray/30 mx-auto mb-2" />
                                <p className="text-neutral-gray text-sm font-body">
                                    {search
                                        ? `No shifts matching "${search}".`
                                        : selectedDate === today
                                            ? 'No staff have logged in today.'
                                            : 'No sessions on this day.'
                                    }
                                </p>
                            </div>
                        ) : (
                            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
                                {filteredShifts.map((shift, i) => (
                                    <ShiftCard key={shift.id} shift={shift} isLast={i === filteredShifts.length - 1} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
