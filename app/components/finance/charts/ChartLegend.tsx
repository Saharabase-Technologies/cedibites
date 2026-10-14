import { SeriesKey } from './ChartTip';

/**
 * Which colour is which branch, in a row over a chart.
 *
 * One branch needs no legend: the chart's title already names it. The part
 * month key shows on its own when hollow dots are on the chart.
 */
export function ChartLegend({
  items,
  partMonth,
}: {
  items: { name: string; colour: string }[];
  /** Adds the key for a hollow dot. */
  partMonth?: boolean;
}) {
  const named = items.length > 1 ? items : [];
  if (!named.length && !partMonth) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm font-body text-text-dark">
      {named.map(item => (
        <li key={item.name} className="inline-flex items-center gap-1.5">
          <SeriesKey colour={item.colour} />
          {item.name}
        </li>
      ))}
      {partMonth && (
        <li className="inline-flex items-center gap-1.5">
          <SeriesKey colour="#6f6353" hollow />
          Part month
        </li>
      )}
    </ul>
  );
}
