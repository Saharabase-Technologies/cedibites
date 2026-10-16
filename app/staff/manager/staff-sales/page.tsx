'use client';

import { useMemo, useState } from 'react';
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { useManagerShiftSales, type ShiftSalesRow } from '@/lib/api/hooks/useShiftSales';
import { formatGHS } from '@/lib/utils/currency';
import { serverToday } from '@/lib/utils/serverClock';
import { DataTable, SegmentedTabs, type DataTableColumn } from '@/app/inventory/_components';
import { BranchMoneyBlock } from '@/app/staff/_components/BranchMoneyBlock';
import { ShiftReview } from '@/app/staff/_components/ShiftReview';
import { StatePill } from '@/app/staff/_components/StatePill';
import { dayLabel } from '@/app/staff/_components/orderFormat';
import { clockOutState, managerState, spanOf, waitsOn } from '@/app/staff/_components/shiftSalesFormat';

// Staff Sales, the branch manager's end (staff portal Section 6, D30), in the
// manager's own look and kit. One line a shift. The manager opens a shift that
// ended, reads what its person confirmed at Clock out, and confirms it.

type Tab = 'all' | 'confirm' | 'confirmed' | 'on';

const DAY_MS = 86_400_000;
const shiftDay = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

export default function StaffSalesPage() {
    const { staffUser } = useStaffAuth();
    const branch = staffUser?.branches?.[0];
    const branchId = branch?.id ? Number(branch.id) : null;
    const meId = staffUser?.id ? Number(staffUser.id) : null;

    const today = serverToday();
    const [date, setDate] = useState(today);
    const [tab, setTab] = useState<Tab>('all');

    const { data, isLoading } = useManagerShiftSales(branchId, date);
    const rows = useMemo(() => data ?? [], [data]);

    const waiting = rows.filter(r => waitsOn(r, meId, 'manager'));
    const shown = useMemo(() => {
        if (tab === 'confirm') return rows.filter(r => waitsOn(r, meId, 'manager'));
        if (tab === 'confirmed') return rows.filter(r => r.manager_confirm);
        if (tab === 'on') return rows.filter(r => r.on_shift);
        return rows;
    }, [tab, rows, meId]);

    const columns: DataTableColumn<ShiftSalesRow>[] = [
        {
            key: 'staff',
            header: 'Staff',
            cell: r => (
                <span className="whitespace-nowrap">
                    <span className="font-semibold">{r.staff_name}</span>
                    {r.employee_id === meId && <span className="text-neutral-gray"> · You</span>}
                    {r.clock_out?.note && <span className="text-amber-700 font-semibold"> · Note</span>}
                </span>
            ),
        },
        { key: 'shift', header: 'Shift', cell: r => <span className="tabular-nums whitespace-nowrap">{spanOf(r)}</span> },
        { key: 'total', header: 'Total', align: 'right', cell: r => <span className="font-bold tabular-nums">{formatGHS(r.total)}</span> },
        { key: 'clock', header: 'Clock out', cell: r => <StatePill state={clockOutState(r)} /> },
        { key: 'manager', header: 'Manager', cell: r => <StatePill state={managerState(r, meId, 'manager')} /> },
    ];

    const where = branch?.name ?? 'the branch';

    return (
        <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto flex flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold font-brand text-text-dark">Staff Sales</h1>
                    <p className="text-neutral-gray text-sm font-body mt-1">{branch?.name ? `${branch.name} · ` : ''}{dayLabel(date)}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setDate(d => shiftDay(d, -1))}
                        aria-label="The day before"
                        className="min-w-11 min-h-11 rounded-xl bg-neutral-card border border-hairline-mid flex items-center justify-center text-text-dark cursor-pointer"
                    >
                        <CaretLeftIcon size={14} weight="bold" />
                    </button>
                    <input
                        type="date"
                        value={date}
                        max={today}
                        onChange={e => e.target.value && setDate(e.target.value)}
                        aria-label="Day"
                        className="min-h-11 px-3 rounded-xl bg-neutral-card border border-hairline-mid text-sm font-semibold text-text-dark cursor-pointer"
                    />
                    <button
                        type="button"
                        onClick={() => setDate(d => shiftDay(d, 1))}
                        disabled={date >= today}
                        aria-label="The day after"
                        className="min-w-11 min-h-11 rounded-xl bg-neutral-card border border-hairline-mid flex items-center justify-center text-text-dark cursor-pointer disabled:opacity-30 disabled:cursor-default"
                    >
                        <CaretRightIcon size={14} weight="bold" />
                    </button>
                </div>
            </div>

            <BranchMoneyBlock
                title={`Money taken at ${where} ${date === today ? 'today' : `on ${dayLabel(date).split(' ').slice(0, 3).join(' ')}`}`}
                note={waiting.length > 0 ? `${waiting.length} ${waiting.length === 1 ? 'shift waits' : 'shifts wait'} for you to confirm` : undefined}
                rows={rows}
            />

            <div className="self-start">
                <SegmentedTabs<Tab>
                    value={tab}
                    onChange={setTab}
                    options={[
                        { value: 'all', label: `All ${rows.length}` },
                        { value: 'confirm', label: `To confirm ${waiting.length}` },
                        { value: 'confirmed', label: `Confirmed ${rows.filter(r => r.manager_confirm).length}` },
                        { value: 'on', label: `On shift ${rows.filter(r => r.on_shift).length}` },
                    ]}
                />
            </div>

            <DataTable<ShiftSalesRow>
                key={`${tab}|${date}`}
                data={shown}
                columns={columns}
                rowKey={r => r.id}
                isLoading={isLoading}
                expandedContent={r => <ShiftReview row={r} meId={meId} viewer="manager" />}
                expandOnRowClick
                oneOpenAtATime
                emptyState={
                    <p className="py-12 text-center text-sm text-neutral-gray">
                        {tab === 'confirm' ? 'Nothing waits for you to confirm.' : 'No shifts that day.'}
                    </p>
                }
            />
        </div>
    );
}
