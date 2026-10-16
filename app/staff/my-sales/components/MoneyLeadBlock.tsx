'use client';

import {
    CreditCardIcon, DeviceMobileIcon, GiftIcon, HandCoinsIcon, HashIcon, MoneyIcon, WalletIcon,
} from '@phosphor-icons/react';
import type { MoneyLine, MyMoney } from '@/lib/api/services/staff.service';
import { formatGHS } from '@/lib/utils/currency';
import { LEAD_LINE, LEAD_TINT } from '@/app/staff/_components/salesTones';
import { lastOfOdd } from '@/app/staff/_components/QuietRow';

// My Sales' lead block: the money the person took today, by method (staff
// portal D14, D15, D23, D24). The total is money only. No Charge sits beside
// it when there was any, and is never added in.

type Column = {
    key: string;
    label: string;
    note: string;
    icon: React.ElementType;
    line: MoneyLine;
};

const ZERO: MoneyLine = { amount: 0, count: 0 };

/** "₵50.00 of this came from Kofi's order #A398." One line an order, three at most. */
function fromOthers(money: MyMoney | undefined): string[] {
    const byOrder = new Map<number, { number: string; name: string | null; amount: number }>();
    for (const line of money?.on_others_orders ?? []) {
        const seen = byOrder.get(line.order_id);
        byOrder.set(line.order_id, {
            number: line.order_number,
            name: line.assigned_to,
            amount: (seen?.amount ?? 0) + line.amount,
        });
    }

    const lines = [...byOrder.values()].map(o =>
        `${formatGHS(o.amount)} of this came from ${o.name ? `${o.name}'s order` : 'order'} #${o.number}.`,
    );
    if (lines.length <= 3) return lines;

    const rest = [...byOrder.values()].slice(2);
    const restAmount = rest.reduce((s, o) => s + o.amount, 0);
    return [...lines.slice(0, 2), `${formatGHS(restAmount)} came from ${rest.length} other orders.`];
}

export function MoneyLeadBlock({ money }: { money: MyMoney | undefined }) {
    const m = money?.money;
    const columns: Column[] = [
        { key: 'cash', label: 'Cash', note: 'Notes and coins', icon: MoneyIcon, line: m?.cash ?? ZERO },
        { key: 'momo', label: 'MoMo', note: 'Sent from the POS', icon: DeviceMobileIcon, line: m?.momo ?? ZERO },
        { key: 'ussd', label: 'USSD', note: 'Branch code', icon: HashIcon, line: m?.ussd ?? ZERO },
        { key: 'manual_momo', label: 'Direct MoMo', note: 'To branch number', icon: HandCoinsIcon, line: m?.manual_momo ?? ZERO },
    ];
    // Only on a day that has some (D23).
    if ((m?.card.count ?? 0) > 0) {
        columns.push({ key: 'card', label: 'Card', note: 'POS card machine', icon: CreditCardIcon, line: m!.card });
    }
    if ((m?.other.count ?? 0) > 0) {
        columns.push({ key: 'other', label: 'Other', note: 'Wallet or QR', icon: WalletIcon, line: m!.other });
    }
    const total = columns.reduce((s, c) => s + c.line.amount, 0);
    if ((money?.no_charge?.count ?? 0) > 0) {
        columns.push({ key: 'no_charge', label: 'No Charge', note: 'Given free, not in the total', icon: GiftIcon, line: money!.no_charge! });
    }

    const others = fromOthers(money);

    return (
        <section aria-labelledby="money-today" className={`${LEAD_TINT} rounded-2xl px-5 py-4.5 flex flex-col gap-5.5`}>
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
                <div className="flex flex-col gap-1.5">
                    <h2 id="money-today" className="m-0 text-[13px] font-bold text-neutral-gray">Money you took today</h2>
                    {money ? (
                        <span className="text-[40px] font-extrabold leading-none tabular-nums text-text-dark">{formatGHS(total)}</span>
                    ) : (
                        <span className="block h-10 w-48 rounded-lg bg-white/60 animate-pulse" aria-label="Loading" />
                    )}
                </div>
                {others.length > 0 && (
                    <div className="flex flex-col gap-0.5">
                        {others.map(line => (
                            <p key={line} className="m-0 text-xs text-neutral-gray">{line}</p>
                        ))}
                    </div>
                )}
            </div>

            <div className={`grid grid-cols-2 sm:grid-flow-col sm:auto-cols-fr gap-px ${LEAD_LINE}`}>
                {columns.map(({ key, label, note, icon: Icon, line }, i) => (
                    <div key={key} className={`${LEAD_TINT} flex flex-col gap-1.5 px-3 py-2 sm:px-4 sm:py-0.5 sm:first:pl-0 sm:last:pr-0 ${lastOfOdd(i, columns.length)}`}>
                        <span className="flex items-center gap-1.5 text-xs font-bold text-neutral-gray">
                            <Icon size={15} aria-hidden />
                            {label}
                        </span>
                        <span className="text-[22px] font-bold leading-none tabular-nums text-text-dark">{formatGHS(line.amount)}</span>
                        <span className="text-[11px] text-neutral-gray">{note}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}
