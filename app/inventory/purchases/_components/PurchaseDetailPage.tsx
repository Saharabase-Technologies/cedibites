'use client';

import Link from 'next/link';
import {
  ArrowLeftIcon,
  TruckIcon,
  MapPinIcon,
  CalendarIcon,
  UserIcon,
  ReceiptIcon,
  LightningIcon,
  ClipboardIcon,
} from '@phosphor-icons/react';
import { usePurchase } from '@/lib/api/hooks/inventory/usePurchases';
import type { PurchaseItem } from '@/types/inventory';
import { formatGHS, formatShortDate, formatDateTime } from '../utils';

export function PurchaseDetailPage({ id }: { id: number }) {
  const { data: purchase, isLoading, error } = usePurchase(id);

  if (isLoading) return <DetailSkeleton />;
  if (error || !purchase) return <DetailMissing />;

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <Link
        href="/inventory/purchases"
        className="inline-flex items-center gap-1.5 text-neutral-gray hover:text-text-dark transition-colors text-sm font-body mb-4"
      >
        <ArrowLeftIcon size={14} weight="bold" />
        All purchases
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold font-brand text-text-dark font-mono">
              {purchase.reference}
            </h1>
            {purchase.is_urgent_buy && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700">
                <LightningIcon size={11} weight="fill" />
                Urgent buy
              </span>
            )}
          </div>
          <p className="text-neutral-gray text-sm font-body mt-1">
            Received {formatDateTime(purchase.received_at)} · recorded by {purchase.recorded_by.name}
          </p>
        </div>
      </div>

      {/* Urgent-buy reason banner */}
      {purchase.is_urgent_buy && purchase.urgent_buy_reason && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 mb-1">
            Reason for urgent buy
          </p>
          <p className="text-amber-900 text-sm font-body">{purchase.urgent_buy_reason}</p>
        </div>
      )}

      {/* Linked PO link */}
      {purchase.purchase_order && (
        <Link
          href={`/inventory/purchase-orders/${purchase.purchase_order.id}`}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-light/60 border border-[#f0e8d8] hover:bg-neutral-light text-sm font-body text-text-dark mb-5"
        >
          <ClipboardIcon size={14} weight="bold" />
          Linked to <span className="font-mono font-semibold">{purchase.purchase_order.reference}</span>
        </Link>
      )}

      {/* Meta cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <MetaCard icon={<TruckIcon size={16} />} label="Supplier" value={purchase.supplier.name} hint={purchase.supplier.code} />
        <MetaCard icon={<MapPinIcon size={16} />} label="Destination" value={purchase.destination_location.name} />
        <MetaCard
          icon={<CalendarIcon size={16} />}
          label="Received"
          value={formatShortDate(purchase.received_at)}
        />
        <MetaCard
          icon={<ReceiptIcon size={16} />}
          label="Invoice"
          value={purchase.invoice_number ?? '—'}
        />
      </div>

      {/* Items table */}
      <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden mb-5">
        <div className="px-5 py-4 border-b border-[#f0e8d8] flex items-baseline justify-between">
          <h2 className="text-sm font-semibold font-body text-text-dark">
            Line items <span className="text-neutral-gray font-normal">({purchase.items.length})</span>
          </h2>
          <p className="text-xs text-neutral-gray">
            Total paid · <span className="text-text-dark font-semibold tabular-nums">{formatGHS(purchase.total_paid)}</span>
          </p>
        </div>
        <ItemsTable items={purchase.items} />
      </div>

      {/* Notes */}
      {purchase.notes && (
        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5 mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-gray mb-1">Notes</p>
          <p className="text-text-dark text-sm font-body whitespace-pre-wrap">{purchase.notes}</p>
        </div>
      )}

      {/* Recorded-by footer */}
      <div className="flex items-center gap-2 text-xs text-neutral-gray font-body">
        <UserIcon size={12} weight="bold" />
        Recorded by {purchase.recorded_by.name} · {formatDateTime(purchase.created_at)}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────

function MetaCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-4">
      <div className="flex items-center gap-1.5 text-neutral-gray mb-1.5">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-text-dark text-sm font-semibold font-body wrap-break-word">{value}</p>
      {hint && <p className="text-neutral-gray text-[11px] font-mono mt-0.5">{hint}</p>}
    </div>
  );
}

function ItemsTable({ items }: { items: PurchaseItem[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm font-body">
        <thead>
          <tr className="text-left bg-neutral-light/60 text-[11px] font-semibold uppercase tracking-wider text-neutral-gray">
            <th className="px-5 py-2.5">Item</th>
            <th className="px-5 py-2.5 text-right">Received</th>
            <th className="px-5 py-2.5 text-right">Unit cost paid</th>
            <th className="px-5 py-2.5 text-right">Line total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0e8d8]">
          {items.map((line) => (
            <tr key={line.id}>
              <td className="px-5 py-3">
                <p className="text-text-dark font-medium">{line.item.name}</p>
                <p className="text-neutral-gray text-[11px] font-mono mt-0.5">{line.item.sku}</p>
              </td>
              <td className="px-5 py-3 text-right tabular-nums text-text-dark">
                {line.received_qty} {line.unit.symbol}
              </td>
              <td className="px-5 py-3 text-right tabular-nums text-text-dark">
                {formatGHS(line.unit_cost_paid)}
              </td>
              <td className="px-5 py-3 text-right tabular-nums text-text-dark font-semibold">
                {formatGHS(line.line_total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <p className="text-neutral-gray text-sm font-body">Loading purchase…</p>
    </div>
  );
}

function DetailMissing() {
  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <h1 className="text-xl font-bold font-brand text-text-dark mb-2">Purchase not found</h1>
      <p className="text-neutral-gray text-sm font-body">
        It may have been removed.{' '}
        <Link href="/inventory/purchases" className="text-primary hover:underline">
          Back to all purchases
        </Link>
      </p>
    </div>
  );
}
