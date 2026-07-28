'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CaretDownIcon, CaretRightIcon, PackageIcon, ReceiptIcon } from '@phosphor-icons/react';
import { PageHeader } from '../../_components';
import { getDailyConsumption, type ConsumedItem } from '@/lib/api/services/inventory/reports.service';

/**
 * What the kitchen used today.
 *
 * Reads the sale movements the recipe deduction writes, so this is the ledger's
 * own account of consumption rather than a guess from the order list. A dish
 * that sold without deducting — no recipe yet — is absent rather than assumed,
 * which is the honest answer and also a hint that a recipe is missing.
 *
 * Each line expands to the orders that consumed it, so a figure that looks
 * wrong can be traced to the sales that produced it without leaving the page.
 */
export function DailyConsumptionReport() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['inventory', 'daily-consumption', date],
    queryFn: () => getDailyConsumption({ date }),
    staleTime: 30_000,
  });

  const items = data?.items ?? [];
  const isToday = date === new Date().toISOString().slice(0, 10);

  return (
    <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">
      <PageHeader
        title="Consumption"
        subtitle={
          isToday
            ? 'What the kitchen has used today, and the sales that used it'
            : 'What the kitchen used on this day, and the sales that used it'
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          type="date"
          value={date}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2.5 bg-neutral-card border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40"
        />
        {data && (
          <p className="text-neutral-gray text-sm font-body">
            <span className="font-semibold text-text-dark">{data.totals.items}</span> item
            {data.totals.items !== 1 ? 's' : ''} across{' '}
            <span className="font-semibold text-text-dark">{data.totals.orders}</span> order
            {data.totals.orders !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_130px_110px_40px] gap-4 px-4 py-3 border-b border-[#f0e8d8] bg-[#faf6f0]">
          {['Item', 'Used', 'Orders', ''].map((h) => (
            <span
              key={h}
              className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-wider"
            >
              {h}
            </span>
          ))}
        </div>

        {isLoading ? (
          <div className="px-4 py-16 text-center">
            <p className="text-neutral-gray text-sm font-body">Loading…</p>
          </div>
        ) : isError ? (
          <div className="px-4 py-16 text-center">
            <p className="text-neutral-gray text-sm font-body">Could not load consumption.</p>
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <PackageIcon size={32} weight="thin" className="text-neutral-gray/40 mx-auto mb-3" />
            <p className="text-neutral-gray text-sm font-body">
              Nothing was deducted {isToday ? 'today' : 'on this day'}.
            </p>
            <p className="text-neutral-gray/70 text-xs font-body mt-1 max-w-sm mx-auto">
              Sales only appear here once the dish has a recipe — without one there is nothing to
              deduct.
            </p>
          </div>
        ) : (
          items.map((item, i) => (
            <ConsumptionRow
              key={item.item_id}
              item={item}
              isLast={i === items.length - 1}
              isOpen={expanded === item.item_id}
              onToggle={() => setExpanded(expanded === item.item_id ? null : item.item_id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ConsumptionRow({
  item,
  isLast,
  isOpen,
  onToggle,
}: {
  item: ConsumedItem;
  isLast: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const hasOrders = item.orders.length > 0;

  return (
    <div className={isLast && !isOpen ? '' : 'border-b border-[#f0e8d8]'}>
      <button
        type="button"
        onClick={onToggle}
        disabled={!hasOrders}
        className={`w-full px-4 py-3.5 flex flex-col md:grid md:grid-cols-[1fr_130px_110px_40px] gap-2 md:gap-4 md:items-center text-left transition-colors ${
          hasOrders ? 'hover:bg-neutral-light/50 cursor-pointer' : 'cursor-default'
        }`}
      >
        <div className="min-w-0">
          <p className="text-text-dark text-sm font-semibold font-body truncate">{item.name}</p>
          <p className="text-neutral-gray text-[10px] font-body mt-0.5 truncate">
            {item.sku ? `${item.sku} · ` : ''}
            {item.location ?? '—'}
          </p>
        </div>

        <span className="text-text-dark text-sm font-bold font-body">
          {item.quantity}
          {item.unit ? <span className="text-neutral-gray font-normal"> {item.unit}</span> : null}
        </span>

        <span className="text-neutral-gray text-xs font-body">
          {item.orders.length > 0
            ? `${item.orders.length} order${item.orders.length !== 1 ? 's' : ''}`
            : `${item.movements} movement${item.movements !== 1 ? 's' : ''}`}
        </span>

        <span className="hidden md:flex justify-end text-neutral-gray">
          {hasOrders ? (
            isOpen ? (
              <CaretDownIcon size={14} weight="bold" />
            ) : (
              <CaretRightIcon size={14} weight="bold" />
            )
          ) : null}
        </span>
      </button>

      {isOpen && hasOrders && (
        <div className={`px-4 pb-4 ${isLast ? '' : ''}`}>
          <div className="rounded-xl bg-neutral-light border border-[#f0e8d8] divide-y divide-[#f0e8d8]">
            {item.orders.map((order) => (
              <div
                key={order.order_id}
                className="px-3 py-2.5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ReceiptIcon size={13} className="text-primary shrink-0" />
                  <span className="text-text-dark text-xs font-semibold font-body truncate">
                    {order.order_number ?? `Order #${order.order_id}`}
                  </span>
                  {order.at && (
                    <span className="text-neutral-gray text-[10px] font-body shrink-0">
                      {new Date(order.at).toLocaleTimeString('en-GH', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>
                <span className="text-neutral-gray text-xs font-body whitespace-nowrap">
                  {order.quantity}
                  {item.unit ? ` ${item.unit}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
