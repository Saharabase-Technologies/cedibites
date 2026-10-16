'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDotsIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import type { Order } from '@/types/order';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { getShiftService, type StaffShift } from '@/lib/services/shifts/shift.service';
import { useEmployeeOrders } from '@/lib/api/hooks/useEmployeeOrders';
import { mapApiOrderToOrder } from '@/lib/api/adapters/order.adapter';
import { formatGHS } from '@/lib/utils/currency';
import { ghanaDayBounds, serverNow, serverToday } from '@/lib/utils/serverClock';
import { DataTable, PageHeader, type DataTableColumn } from '@/app/inventory/_components';
import ShiftsCalendar, { type DayShiftSummary } from '@/app/staff/manager/shifts/ShiftsCalendar';
import { QuietRow } from '@/app/staff/_components/QuietRow';
import { ClockOutSheet, lengthOf } from '@/app/staff/_components/ClockOut';
import { dayLabel, goodsOf, isNoCharge, timeOf } from '@/app/staff/_components/orderFormat';

// My Shifts, for sales staff (staff portal Section 6, D18). The current
// session leads, drawn as a timeline across the day, with its figures under
// the bar and Clock out at the row's end. Then the day, today's sessions, the
// days before this week, and the calendar for older days. Every time goes by
// the server's clock (D21). The manager and the call centre keep today's view.

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

/** The Ghana day, YYYY-MM-DD, of a time. Ghana is UTC+0. */
const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** "Thursday 15 October". */
function shortDay(date: string): string {
    return dayLabel(date).split(' ').slice(0, 3).join(' ');
}

/** "8 am". */
function hourLabel(ms: number): string {
    return new Date(ms).toLocaleTimeString('en-GH', { timeZone: 'Africa/Accra', hour: 'numeric', hour12: true });
}

type Figures = { orders: number; value: number };

function figuresIn(orders: Order[], from: number, to: number): Figures {
    const live = orders.filter(o => o.placedAt >= from && o.placedAt <= to && o.status !== 'cancelled');
    return {
        orders: live.length,
        value: live.filter(o => !isNoCharge(o)).reduce((s, o) => s + goodsOf(o), 0),
    };
}

// ─── The bar across the day ───────────────────────────────────────────────────

function Timeline({ sessions, now }: { sessions: StaffShift[]; now: number }) {
    if (sessions.length === 0) return null;

    // From the hour before the first session to the hour after the last end,
    // or now. Night shifts and late sales stay on the bar (Section 5).
    const first = Math.min(...sessions.map(s => s.loginAt));
    const last = Math.max(...sessions.map(s => s.logoutAt ?? now), now);
    const start = Math.floor(first / HOUR_MS) * HOUR_MS - HOUR_MS;
    const end = Math.min(Math.ceil(last / HOUR_MS) * HOUR_MS + HOUR_MS, start + DAY_MS);
    const span = end - start;
    const at = (ms: number) => `${(((Math.min(Math.max(ms, start), end) - start) / span) * 100).toFixed(2)}%`;

    const step = span <= 12 * HOUR_MS ? 2 * HOUR_MS : 3 * HOUR_MS;
    const ticks: number[] = [];
    for (let t = start + HOUR_MS; t < end; t += step) ticks.push(t);

    return (
        <div aria-hidden className="flex flex-col gap-1.5">
            <div className="relative h-7 rounded-lg bg-neutral-light overflow-hidden">
                {sessions.map(s => {
                    const left = at(s.loginAt);
                    const right = at(s.logoutAt ?? now);
                    return (
                        <div
                            key={s.id}
                            className={`absolute inset-y-0 rounded-md ${s.logoutAt ? 'bg-primary/30' : 'bg-primary'}`}
                            style={{ left, width: `calc(${right} - ${left})` }}
                        />
                    );
                })}
                <div className="absolute inset-y-0 w-0.5 bg-text-dark" style={{ left: at(now) }} />
            </div>
            <div className="relative h-4 text-[11px] text-neutral-gray tabular-nums">
                {ticks.map(t => (
                    <span key={t} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: at(t) }}>{hourLabel(t)}</span>
                ))}
            </div>
        </div>
    );
}

// ─── View ─────────────────────────────────────────────────────────────────────

export default function SalesMyShiftsView() {
    const { staffUser } = useStaffAuth();
    const [shifts, setShifts] = useState<StaffShift[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [now, setNow] = useState(() => serverNow().getTime());
    const [moneyTaken, setMoneyTaken] = useState<number | null>(null);
    const [clockingOut, setClockingOut] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [olderDay, setOlderDay] = useState<string | null>(null);
    const [viewMonth, setViewMonth] = useState(() => {
        const d = serverNow();
        return new Date(d.getUTCFullYear(), d.getUTCMonth(), 1);
    });

    const today = serverToday();
    const { from: todayFrom, to: todayTo } = ghanaDayBounds(today);
    const weekStart = dayOf(todayFrom - 6 * DAY_MS);

    const load = useCallback(async () => {
        if (!staffUser) return;
        const data = await getShiftService().getByStaff(staffUser.id).catch(() => null);
        if (data) setShifts([...data].sort((a, b) => b.loginAt - a.loginAt));
        setLoaded(true);
    }, [staffUser]);

    useEffect(() => {
        load();
        const tick = setInterval(() => setNow(serverNow().getTime()), 30_000);
        const refresh = setInterval(load, 60_000);
        return () => { clearInterval(tick); clearInterval(refresh); };
    }, [load]);

    const active = shifts.find(s => !s.logoutAt);

    useEffect(() => {
        if (!active) { setMoneyTaken(null); return; }
        let stop = false;
        const ask = () => getShiftService().getMoney(active.id)
            .then(m => { if (!stop) setMoneyTaken(Object.values(m).reduce((s, l) => s + l.amount, 0)); })
            .catch(() => {});
        ask();
        const every = setInterval(ask, 30_000);
        return () => { stop = true; clearInterval(every); };
    }, [active]);

    // The person's orders this week, from the server, for every figure here.
    const { orders: apiWeek } = useEmployeeOrders(
        staffUser ? { staff_id: staffUser.id, date_from: weekStart, date_to: today, per_page: 500 } : undefined,
        60_000,
    );
    const week = useMemo(() => apiWeek.map(mapApiOrderToOrder), [apiWeek]);

    // Today's sessions: started today, or still open from the night before.
    const todays = useMemo(
        () => shifts.filter(s => (s.loginAt >= todayFrom && s.loginAt <= todayTo) || (!s.logoutAt && s.loginAt < todayFrom)),
        [shifts, todayFrom, todayTo],
    );
    const last = todays.find(s => s.logoutAt) ?? shifts.find(s => s.logoutAt);

    const current = active ? figuresIn(week, active.loginAt, now) : null;
    const day = figuresIn(week, todayFrom, todayTo);

    // Earlier this week, one line a day with sessions.
    const earlier = useMemo(() => {
        const days = new Map<string, StaffShift[]>();
        for (const s of shifts) {
            const d = dayOf(s.loginAt);
            if (d >= weekStart && d < today) days.set(d, [...(days.get(d) ?? []), s]);
        }
        return [...days.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([date, list]) => {
            const { from, to } = ghanaDayBounds(date);
            return {
                date,
                sessions: list.length,
                ms: list.reduce((m, s) => m + ((s.logoutAt ?? now) - s.loginAt), 0),
                ...figuresIn(week, from, to),
            };
        });
    }, [shifts, weekStart, today, week, now]);

    // An older day, from the calendar.
    const { orders: apiOlder } = useEmployeeOrders(
        staffUser && olderDay ? { staff_id: staffUser.id, date_from: olderDay, date_to: olderDay, per_page: 200 } : undefined,
    );
    const older = useMemo(() => apiOlder.map(mapApiOrderToOrder), [apiOlder]);
    const olderSessions = useMemo(
        () => (olderDay ? shifts.filter(s => dayOf(s.loginAt) === olderDay) : []),
        [shifts, olderDay],
    );

    const monthData = useMemo(() => {
        const map = new Map<string, DayShiftSummary>();
        for (const s of shifts) {
            const key = dayOf(s.loginAt);
            const seen = map.get(key) ?? { count: 0, orders: 0, sales: 0, hasActive: false };
            map.set(key, { count: seen.count + 1, orders: seen.orders + s.orderCount, sales: seen.sales + s.goodsSales, hasActive: seen.hasActive || !s.logoutAt });
        }
        return map;
    }, [shifts]);

    const sessionColumns = (orders: Order[]): DataTableColumn<StaffShift>[] => [
        { key: 'start', header: 'Started', cell: s => <span className="tabular-nums whitespace-nowrap">{timeOf(s.loginAt)}</span> },
        {
            key: 'end',
            header: 'Ended',
            cell: s => s.logoutAt
                ? <span className="tabular-nums whitespace-nowrap">{timeOf(s.logoutAt)}</span>
                : <span className="font-bold text-primary whitespace-nowrap">On shift now</span>,
        },
        { key: 'length', header: 'Length', cell: s => <span className="tabular-nums">{lengthOf(s.loginAt, s.logoutAt ?? now)}</span> },
        { key: 'orders', header: 'Orders', align: 'right', cell: s => <span className="tabular-nums">{figuresIn(orders, s.loginAt, s.logoutAt ?? now).orders}</span> },
        {
            key: 'value',
            header: 'Order Value',
            align: 'right',
            cell: s => <span className="font-bold tabular-nums">{formatGHS(figuresIn(orders, s.loginAt, s.logoutAt ?? now).value)}</span>,
        },
    ];

    if (!loaded) {
        return (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-neutral-gray">
                <SpinnerGapIcon size={18} className="animate-spin" /> Loading your shifts
            </div>
        );
    }

    const branch = active?.branchName || staffUser?.branches[0]?.name;

    return (
        <div className="px-4 py-4 md:px-6 md:py-5 xl:px-10 xl:py-7 flex flex-col gap-4.5">
            <PageHeader title="My Shifts" subtitle={dayLabel(today)} />

            {/* ── The current session ─────────────────────────────────── */}
            <section aria-label="Your session now" className="rounded-2xl border border-hairline px-5 py-4.5 flex flex-col gap-4">
                <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
                    <div className="flex flex-col gap-1">
                        <p className="m-0 text-[13px] font-bold text-neutral-gray tabular-nums">
                            {active
                                ? `On shift since ${timeOf(active.loginAt)}${branch ? ` · ${branch}` : ''}`
                                : last?.logoutAt
                                    ? `Not on shift. Your last session ended at ${timeOf(last.logoutAt)}${dayOf(last.logoutAt) === today ? '' : `, ${shortDay(dayOf(last.logoutAt))}`}.`
                                    : 'Not on shift.'}
                        </p>
                        {active && (
                            <span className="text-[40px] font-extrabold leading-none tabular-nums text-text-dark">{lengthOf(active.loginAt, now)}</span>
                        )}
                    </div>
                </div>

                <Timeline sessions={todays} now={now} />

                {active && current && (
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div className="w-full sm:w-auto sm:flex-1 min-w-0">
                            <QuietRow
                                label="This session"
                                figures={[
                                    { label: 'Orders Attended', value: String(current.orders) },
                                    { label: 'Order Value', value: formatGHS(current.value) },
                                    { label: 'Money Taken', value: moneyTaken === null ? '…' : formatGHS(moneyTaken) },
                                ]}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => setClockingOut(true)}
                            className="min-h-11 px-3 rounded-xl text-[15px] font-bold text-primary hover:bg-primary-soft cursor-pointer"
                        >
                            Clock out
                        </button>
                    </div>
                )}
            </section>

            {/* ── The day ─────────────────────────────────────────────── */}
            <QuietRow
                label="Today"
                figures={[
                    { label: 'Sessions today', value: String(todays.length) },
                    { label: 'Orders today', value: String(day.orders) },
                    { label: 'Order Value today', value: formatGHS(day.value) },
                ]}
            />

            <section aria-labelledby="sessions-today" className="flex flex-col gap-2.5">
                <h2 id="sessions-today" className="text-[15px] font-bold text-text-dark">Sessions today</h2>
                <DataTable<StaffShift>
                    data={todays}
                    columns={sessionColumns(week)}
                    rowKey={s => s.id}
                    pageSize={10}
                    emptyState={<p className="py-10 text-center text-sm text-neutral-gray">No sessions today yet.</p>}
                />
            </section>

            {earlier.length > 0 && (
                <section aria-labelledby="earlier" className="flex flex-col gap-2.5">
                    <h2 id="earlier" className="text-[15px] font-bold text-text-dark">Earlier this week</h2>
                    <DataTable
                        data={earlier}
                        rowKey={d => d.date}
                        columns={[
                            { key: 'day', header: 'Day', cell: d => <span className="font-semibold">{shortDay(d.date)}</span> },
                            {
                                key: 'sessions',
                                header: 'Sessions',
                                cell: d => <span className="tabular-nums">{d.sessions} {d.sessions === 1 ? 'session' : 'sessions'} · {lengthOf(0, d.ms)}</span>,
                            },
                            { key: 'orders', header: 'Orders', align: 'right', cell: d => <span className="tabular-nums">{d.orders} {d.orders === 1 ? 'order' : 'orders'}</span> },
                            { key: 'value', header: 'Order Value', align: 'right', cell: d => <span className="font-bold tabular-nums">{formatGHS(d.value)}</span> },
                        ]}
                    />
                </section>
            )}

            {/* ── Older days ──────────────────────────────────────────── */}
            <section aria-label="Older days" className="flex flex-col gap-2.5">
                <button
                    type="button"
                    onClick={() => setShowCalendar(v => !v)}
                    aria-expanded={showCalendar}
                    className="self-start min-h-11 px-3 -ml-3 flex items-center gap-2 rounded-xl text-sm font-semibold text-text-dark hover:bg-neutral-light cursor-pointer"
                >
                    <CalendarDotsIcon size={16} /> {showCalendar ? 'Hide older days' : 'Older days'}
                </button>
                {showCalendar && (
                    <div className="rounded-2xl border border-hairline p-4">
                        <ShiftsCalendar
                            selectedDate={olderDay ?? today}
                            onSelectDate={setOlderDay}
                            viewMonth={viewMonth}
                            onChangeMonth={setViewMonth}
                            monthData={monthData}
                            loadingDays={new Set()}
                        />
                    </div>
                )}
                {showCalendar && olderDay && (
                    <div className="flex flex-col gap-2.5">
                        <h3 className="text-sm font-bold text-text-dark">{dayLabel(olderDay)}</h3>
                        <DataTable<StaffShift>
                            data={olderSessions}
                            columns={sessionColumns(older)}
                            rowKey={s => s.id}
                            pageSize={10}
                            emptyState={<p className="py-8 text-center text-sm text-neutral-gray">No sessions that day.</p>}
                        />
                    </div>
                )}
            </section>

            <ClockOutSheet open={clockingOut} onClose={() => { setClockingOut(false); load(); }} />
        </div>
    );
}
