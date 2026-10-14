'use client';

import { useMemo } from 'react';
import { ChartLegend, ColumnChart, TipNote, TipRow, TipRows, TipTitle } from '../charts';
import { DOW, DOW3, weekday } from '@/lib/finance/figures';
import { compact, ghs, plural } from '@/lib/finance/format';
import { ChartPanel, useChartFilter } from '../ChartPanel';
import { useFinance } from '../FinanceProvider';

/** Average net sales on each day of the week. Ported from the review page's `drawWeek`. */
export function WeekPanel() {
  const { book, colours } = useFinance();
  const filter = useChartFilter();
  const res = filter.figures;
  const days = useMemo(() => res.branches.map(b => weekday(book, res, b)), [book, res]);

  return (
    <ChartPanel
      title="Average sales by day of the week"
      sub="Counts every day the branch was open, with a sale or without."
      filter={filter}
    >
      <ChartLegend items={res.branches.map(b => ({ name: b.name, colour: colours[b.id] }))} />
      <ColumnChart
        label="Average sales by day of the week"
        categories={DOW3}
        series={res.branches.map((b, j) => ({ name: b.name, colour: colours[b.id], values: days[j].map(d => d.average) }))}
        height={240}
        axisFormat={compact}
        tip={i => (
          <>
            <TipTitle>{DOW[i]}</TipTitle>
            <TipRows>
              {res.branches.map((b, j) => {
                const d = days[j][i];
                return (
                  <TipRow
                    key={b.id}
                    colour={colours[b.id]}
                    name={b.name}
                    value={d.average == null ? 'Not open' : ghs(d.average)}
                    extra={d.days ? plural(d.days, 'day') : null}
                  />
                );
              })}
            </TipRows>
            <TipNote>Average net sales on that day of the week.</TipNote>
          </>
        )}
      />
    </ChartPanel>
  );
}
