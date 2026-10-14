'use client';

import { bestMonth, lost } from '@/lib/finance/figures';
import { ghs, int, monthLong, plural } from '@/lib/finance/format';
import { useFinance } from '../FinanceProvider';

/**
 * The four figures at the top of Overview, for the page filters. Net sales
 * is first and larger: it is the figure the page is about.
 */
export function OverviewFigures() {
  const { figures } = useFinance();
  const g = figures.grand;
  const best = bestMonth(figures);
  const lostOrders = lost(g);

  const rest = [
    {
      label: 'Paid orders',
      value: int(g.orders),
      note: g.orders ? `Average order ${ghs(g.net / g.orders)}` : 'None match these filters',
    },
    {
      label: 'Best month',
      value: best ? monthLong(best.month) : 'None',
      note: best ? `${ghs(best.net)} net sales` : 'None match these filters',
    },
    {
      label: 'Cancelled after payment',
      value: lostOrders ? plural(lostOrders, 'order') : 'None',
      note: lostOrders ? `${ghs(g.refundedAmount)} refunded, ${ghs(g.keptAmount)} kept` : 'None in these filters',
    },
  ];

  return (
    <dl className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
      <div className="col-span-2 bg-neutral-card border border-[#f0e8d8] rounded-2xl p-4 md:p-5 flex flex-col gap-1 min-w-0">
        <dt className="text-sm font-semibold font-body text-neutral-gray">Net sales</dt>
        <dd className="text-3xl md:text-4xl font-bold font-body text-text-dark tabular-nums break-words">{ghs(g.net)}</dd>
        <dd className="text-sm font-body text-neutral-gray">
          {g.deliveryFee > 0 ? `Delivery fees of ${ghs(g.deliveryFee)} left out` : 'No delivery fees in these orders'}
        </dd>
      </div>
      {rest.map((tile, i) => (
        <div
          key={tile.label}
          className={`${i === rest.length - 1 ? 'col-span-2 lg:col-span-1' : ''} bg-neutral-card border border-[#f0e8d8] rounded-2xl p-4 flex flex-col gap-1 min-w-0`}
        >
          <dt className="text-sm font-semibold font-body text-neutral-gray">{tile.label}</dt>
          <dd className="text-xl font-bold font-body text-text-dark tabular-nums break-words">{tile.value}</dd>
          <dd className="text-sm font-body text-neutral-gray">{tile.note}</dd>
        </div>
      ))}
    </dl>
  );
}
