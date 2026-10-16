'use client';

import { useMemo, useState } from 'react';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { useBranchesApi } from '@/lib/api/hooks/useBranchesApi';
import { getDateRange, type AnalyticsPeriod } from '@/lib/api/hooks/useAnalytics';
import { useAdminShiftSales, type ShiftSalesRow } from '@/lib/api/hooks/useShiftSales';
import type { MoneyGroup } from '@/lib/api/services/staff.service';
import { formatGHS } from '@/lib/utils/currency';
import {
    DataTable, FilterBar, FilterSelect, PageHeader, SearchBar, SegmentedTabs, type DataTableColumn,
} from '@/app/inventory/_components';
import { TONE } from '@/app/inventory/_components/status-tokens';
import { BranchMoneyBlock } from '@/app/staff/_components/BranchMoneyBlock';
import { ShiftReview } from '@/app/staff/_components/ShiftReview';
import { StatePill } from '@/app/staff/_components/StatePill';
import { lengthOf } from '@/app/staff/_components/ClockOut';
import { clockOutState, managerState, spanOf, waitsOn } from '@/app/staff/_components/shiftSalesFormat';

// Staff Sales, the admin's end (staff portal Section 6, D30), in the admin's
// own look and kit. Each shift, as its person confirmed it at Clock out and as
// their manager confirmed it, side by side. Or each person, opening to their
// shifts. At a branch with no manager, the admin confirms (Q2).

const PERIODS: { value: AnalyticsPeriod; label: string; money: string }[] = [
    { value: 'today', label: 'Today', money: 'Money taken today' },
    { value: 'yesterday', label: 'Yesterday', money: 'Money taken yesterday' },
    { value: 'week', label: 'This Week', money: 'Money taken this week' },
    { value: 'last_week', label: 'Last Week', money: 'Money taken last week' },
    { value: 'month', label: 'This Month', money: 'Money taken this month' },
    { value: 'last_month', label: 'Last Month', money: 'Money taken last month' },
    { value: '30d', label: 'Last 30 Days', money: 'Money taken in the last 30 days' },
];

type Lines = 'shift' | 'person';
type Tab = 'all' | 'on' | 'not' | 'manager' | 'both' | 'note';

const ms = (iso: string) => Date.parse(iso);

const inTab: Record<Tab, (r: ShiftSalesRow) => boolean> = {
    all: () => true,
    on: r => r.on_shift,
    not: r => !r.on_shift && !r.clock_out,
    manager: r => !r.on_shift && !r.is_manager && !r.manager_confirm,
    both: r => !!r.clock_out && !!r.manager_confirm,
    note: r => !!r.clock_out?.note || !!r.manager_confirm?.note,
};

const METHOD_COLUMNS: { group: MoneyGroup; header: string }[] = [
    { group: 'cash', header: 'Cash' },
    { group: 'momo', header: 'MoMo' },
    { group: 'ussd', header: 'USSD' },
    { group: 'manual_momo', header: 'Direct' },
];

type Person = {
    employee_id: number;
    staff_name: string;
    branches: string;
    shifts: ShiftSalesRow[];
    money: Record<MoneyGroup, number>;
    total: number;
    ms: number;
};

function people(rows: ShiftSalesRow[]): Person[] {
    const map = new Map<number, Person>();
    for (const r of rows) {
        const p = map.get(r.employee_id) ?? {
            employee_id: r.employee_id,
            staff_name: r.staff_name,
            branches: '',
            shifts: [],
            money: { cash: 0, momo: 0, ussd: 0, manual_momo: 0, card: 0, other: 0 },
            total: 0,
            ms: 0,
        };
        p.shifts.push(r);
        (Object.keys(p.money) as MoneyGroup[]).forEach(g => { p.money[g] += r.money[g]?.amount ?? 0; });
        p.total += r.total;
        p.ms += (r.logout_at ? ms(r.logout_at) : Date.now()) - ms(r.login_at);
        p.branches = [...new Set(p.shifts.map(s => s.branch_name).filter(Boolean))].join(', ');
        map.set(r.employee_id, p);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
}

export default function AdminStaffSalesPage() {
    const { staffUser } = useStaffAuth();
    const meId = staffUser?.id ? Number(staffUser.id) : null;
    const { branches } = useBranchesApi();

    const [period, setPeriod] = useState<AnalyticsPeriod>('today');
    const [branchId, setBranchId] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [lines, setLines] = useState<Lines>('shift');
    const [tab, setTab] = useState<Tab>('all');

    const range = getDateRange(period);
    const oneDay = range.date_from === range.date_to;
    const { data, isLoading } = useAdminShiftSales({ ...range, branch_id: branchId });

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return (data ?? []).filter(r => !q || r.staff_name.toLowerCase().includes(q));
    }, [data, search]);
    const shown = useMemo(() => rows.filter(inTab[tab]), [rows, tab]);
    const waiting = rows.filter(r => waitsOn(r, meId, 'admin'));

    const when = (r: ShiftSalesRow) => oneDay
        ? spanOf(r)
        : `${new Date(ms(r.login_at)).toLocaleDateString('en-GB', { timeZone: 'Africa/Accra', weekday: 'short', day: 'numeric', month: 'short' })} · ${spanOf(r)}`;

    const moneyColumns = <T,>(pick: (row: T, g: MoneyGroup) => number): DataTableColumn<T>[] =>
        METHOD_COLUMNS.map(m => ({
            key: m.group,
            header: m.header,
            align: 'right' as const,
            hideBelow: '2xl' as const,
            cell: (row: T) => <span className="tabular-nums">{formatGHS(pick(row, m.group))}</span>,
        }));

    const shiftColumns = (withStaff: boolean): DataTableColumn<ShiftSalesRow>[] => [
        ...(withStaff ? [{
            key: 'staff',
            header: 'Staff',
            cell: (r: ShiftSalesRow) => (
                <span className="whitespace-nowrap">
                    <span className="font-semibold">{r.staff_name}</span>
                    {r.is_manager && <span className="text-neutral-gray"> · Manager</span>}
                    {(r.clock_out?.note || r.manager_confirm?.note) && <span className="font-semibold text-amber-700"> · Note</span>}
                </span>
            ),
        }, {
            key: 'branch',
            header: 'Branch',
            hideBelow: 'md' as const,
            cell: (r: ShiftSalesRow) => r.branch_name ?? 'No branch',
        }] : []),
        { key: 'shift', header: 'Shift', cell: r => <span className="tabular-nums whitespace-nowrap">{when(r)}</span> },
        ...moneyColumns<ShiftSalesRow>((r, g) => r.money[g]?.amount ?? 0),
        { key: 'total', header: 'Total', align: 'right', cell: r => <span className="font-bold tabular-nums">{formatGHS(r.total)}</span> },
        { key: 'clock', header: 'Clock out', cell: r => <StatePill state={clockOutState(r)} /> },
        { key: 'manager', header: 'Manager', cell: r => <StatePill state={managerState(r, meId, 'admin')} /> },
    ];

    const personColumns: DataTableColumn<Person>[] = [
        { key: 'staff', header: 'Staff', cell: p => <span className="font-semibold whitespace-nowrap">{p.staff_name}</span> },
        { key: 'branch', header: 'Branch', hideBelow: 'md', cell: p => p.branches || 'No branch' },
        {
            key: 'shifts',
            header: 'Shifts',
            cell: p => <span className="tabular-nums whitespace-nowrap">{p.shifts.length} · {lengthOf(0, p.ms)}</span>,
        },
        ...moneyColumns<Person>((p, g) => p.money[g]),
        { key: 'total', header: 'Total', align: 'right', cell: p => <span className="font-bold tabular-nums">{formatGHS(p.total)}</span> },
        {
            key: 'clock',
            header: 'Clock out',
            cell: p => {
                const ended = p.shifts.filter(s => !s.on_shift);
                const done = ended.filter(s => s.clock_out).length;
                if (ended.length === 0) return <StatePill state={{ label: 'On shift', ...TONE.neutral }} />;
                return <StatePill state={{ label: `${done} of ${ended.length} confirmed`, ...(done === ended.length ? TONE.done : TONE.waiting) }} />;
            },
        },
        {
            key: 'manager',
            header: 'Manager',
            cell: p => {
                if (p.shifts.every(s => s.on_shift)) return <StatePill state={{ label: 'On shift', ...TONE.neutral }} />;
                const open = p.shifts.filter(s => !s.on_shift && !s.is_manager && !s.manager_confirm).length;
                return <StatePill state={open > 0 ? { label: `${open} to confirm`, ...TONE.waiting } : { label: 'All confirmed', ...TONE.done }} />;
            },
        },
    ];

    const counts = (t: Tab) => rows.filter(inTab[t]).length;
    const periodInfo = PERIODS.find(p => p.value === period) ?? PERIODS[0];

    return (
        <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto flex flex-col gap-5">
            <PageHeader
                title="Staff Sales"
                subtitle="Each shift, as the person confirmed it at clock out and as their manager confirmed it."
            />

            <FilterBar>
                <SearchBar value={search} onChange={setSearch} placeholder="Search staff" />
                <FilterSelect
                    value={period === 'today' ? '' : period}
                    onChange={v => setPeriod((v || 'today') as AnalyticsPeriod)}
                    placeholder="Today"
                    options={PERIODS.filter(p => p.value !== 'today').map(p => ({ value: p.value, label: p.label }))}
                />
                <FilterSelect
                    value={branchId ? String(branchId) : ''}
                    onChange={v => setBranchId(v ? Number(v) : null)}
                    placeholder="All branches"
                    options={branches.map(b => ({ value: String(b.id), label: b.name }))}
                />
            </FilterBar>

            <BranchMoneyBlock
                title={periodInfo.money}
                note={waiting.length > 0 ? `${waiting.length} ${waiting.length === 1 ? 'shift waits' : 'shifts wait'} for you to confirm: no manager` : undefined}
                rows={rows}
            />

            <div className="flex flex-wrap items-center gap-3">
                <SegmentedTabs<Lines>
                    value={lines}
                    onChange={setLines}
                    options={[{ value: 'shift', label: 'Each shift' }, { value: 'person', label: 'Each person' }]}
                />
                {lines === 'shift' && (
                    <SegmentedTabs<Tab>
                        value={tab}
                        onChange={setTab}
                        options={[
                            { value: 'all', label: `All ${rows.length}` },
                            { value: 'on', label: `On shift ${counts('on')}` },
                            { value: 'not', label: `Not confirmed ${counts('not')}` },
                            { value: 'manager', label: `Manager to confirm ${counts('manager')}` },
                            { value: 'both', label: `Both confirmed ${counts('both')}` },
                            { value: 'note', label: `With a note ${counts('note')}` },
                        ]}
                    />
                )}
            </div>

            {lines === 'shift' ? (
                <DataTable<ShiftSalesRow>
                    key={`shift|${tab}|${period}|${branchId}|${search}`}
                    data={shown}
                    columns={shiftColumns(true)}
                    rowKey={r => r.id}
                    isLoading={isLoading}
                    expandedContent={r => <ShiftReview row={r} meId={meId} viewer="admin" />}
                    expandOnRowClick
                    oneOpenAtATime
                    emptyState={<p className="py-12 text-center text-sm text-neutral-gray">No shifts match that.</p>}
                />
            ) : (
                <DataTable<Person>
                    key={`person|${period}|${branchId}|${search}`}
                    data={people(rows)}
                    columns={personColumns}
                    rowKey={p => p.employee_id}
                    isLoading={isLoading}
                    expandedContent={p => (
                        <DataTable<ShiftSalesRow>
                            data={p.shifts}
                            columns={shiftColumns(false)}
                            rowKey={r => r.id}
                            framed={false}
                            expandedContent={r => <ShiftReview row={r} meId={meId} viewer="admin" />}
                            expandOnRowClick
                            oneOpenAtATime
                        />
                    )}
                    expandOnRowClick
                    oneOpenAtATime
                    emptyState={<p className="py-12 text-center text-sm text-neutral-gray">No shifts match that.</p>}
                />
            )}
        </div>
    );
}
