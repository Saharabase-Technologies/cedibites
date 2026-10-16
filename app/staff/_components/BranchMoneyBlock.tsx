'use client';

import type { ShiftSalesRow } from '@/lib/api/hooks/useShiftSales';
import type { MoneyGroup, MoneyLine } from '@/lib/api/services/staff.service';
import { formatGHS } from '@/lib/utils/currency';
import { lastOfOdd } from './QuietRow';

// The lead block on Staff Sales, the manager's end and the admin's: the money
// the shifts took, by method (D15, D23). Built on the kit's card and tokens,
// so it takes each end's own look.

const COLUMNS: { group: MoneyGroup; label: string; always: boolean }[] = [
    { group: 'cash', label: 'Cash', always: true },
    { group: 'momo', label: 'MoMo', always: true },
    { group: 'ussd', label: 'USSD', always: true },
    { group: 'manual_momo', label: 'Direct MoMo', always: true },
    { group: 'card', label: 'Card', always: false },
    { group: 'other', label: 'Other', always: false },
];

const ZERO: MoneyLine = { amount: 0, count: 0 };

export function BranchMoneyBlock({ title, note, rows }: { title: string; note?: string; rows: ShiftSalesRow[] }) {
    const sum = (pick: (r: ShiftSalesRow) => MoneyLine | undefined): MoneyLine => rows.reduce(
        (acc, r) => {
            const line = pick(r) ?? ZERO;
            return { amount: acc.amount + line.amount, count: acc.count + line.count };
        },
        { ...ZERO },
    );

    const columns = COLUMNS
        .map(c => ({ ...c, line: sum(r => r.money[c.group]) }))
        .filter(c => c.always || c.line.count > 0);
    const total = columns.reduce((s, c) => s + c.line.amount, 0);
    const free = sum(r => r.no_charge);
    const cells = columns.length + (free.count > 0 ? 1 : 0);

    return (
        <section aria-label={title} className="bg-neutral-card border border-hairline rounded-2xl px-5 py-4.5 flex flex-col gap-5">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
                <div className="flex flex-col gap-1.5">
                    <h2 className="text-[13px] font-bold text-neutral-gray">{title}</h2>
                    <span className="text-[36px] font-extrabold leading-none tabular-nums text-text-dark">{formatGHS(total)}</span>
                </div>
                {note && <p className="text-[13px] font-bold text-amber-700">{note}</p>}
            </div>
            <dl className="grid grid-cols-2 sm:grid-flow-col sm:auto-cols-fr gap-px bg-row-line">
                {columns.map((c, i) => (
                    <div key={c.group} className={`bg-neutral-card flex flex-col gap-1 px-3 py-2 sm:px-4 sm:py-0.5 sm:first:pl-0 sm:last:pr-0 ${lastOfOdd(i, cells)}`}>
                        <dt className="text-xs font-bold text-neutral-gray">{c.label}</dt>
                        <dd className="m-0 text-xl font-bold leading-none tabular-nums text-text-dark">{formatGHS(c.line.amount)}</dd>
                        <dd className="m-0 text-[11px] text-neutral-gray">{c.line.count} {c.line.count === 1 ? 'payment' : 'payments'}</dd>
                    </div>
                ))}
                {free.count > 0 && (
                    <div className={`bg-neutral-card flex flex-col gap-1 px-3 py-2 sm:px-4 sm:py-0.5 sm:last:pr-0 ${lastOfOdd(cells - 1, cells)}`}>
                        <dt className="text-xs font-bold text-neutral-gray">No Charge</dt>
                        <dd className="m-0 text-xl font-bold leading-none tabular-nums text-text-dark">{formatGHS(free.amount)}</dd>
                        <dd className="m-0 text-[11px] text-neutral-gray">Given free, not in the total</dd>
                    </div>
                )}
            </dl>
        </section>
    );
}
