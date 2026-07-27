'use client';

import Link from 'next/link';
import {
  ArrowLeftIcon,
  PackageIcon,
  TruckIcon,
  ReceiptIcon,
  ClipboardTextIcon,
  WarningCircleIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ClockCountdownIcon,
} from '@phosphor-icons/react';
import { formatGHS } from '@/lib/utils/currency';
import { useInventoryItemMovements } from '@/lib/api/hooks/inventory/useInventoryCatalog';
import type { InventoryItem, ItemMovement } from '@/types/inventory';

function fmtQty(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Expiry label + colour: expired (red), ≤7 days (amber), else neutral.
function batchExpiry(date: string | null): { label: string; className: string } {
  if (!date) return { label: 'No expiry', className: 'text-neutral-gray' };
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return { label: date, className: 'text-neutral-gray' };
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  const pretty = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  if (days < 0) return { label: `${pretty} · expired`, className: 'text-rose-700 font-semibold' };
  if (days <= 7) return { label: `${pretty} · ${days}d left`, className: 'text-amber-700 font-semibold' };
  return { label: pretty, className: 'text-text-dark' };
}

// ─── Stock level ────────────────────────────────────────────────────────────────

function stockBadge(item: InventoryItem) {
  const qty = item.stock_on_hand;
  if (qty <= 0) return { label: 'Out of stock', className: 'bg-rose-100 text-rose-700' };
  if (item.min_threshold != null && qty <= item.min_threshold)
    return { label: 'Critical', className: 'bg-rose-50 text-rose-700' };
  if (item.reorder_level != null && qty <= item.reorder_level)
    return { label: 'Low - reorder', className: 'bg-amber-50 text-amber-700' };
  return { label: 'In stock', className: 'bg-emerald-50 text-emerald-700' };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ItemDetailPage({ id }: { id: number }) {
  const { data, isLoading, error } = useInventoryItemMovements(id);

  if (isLoading) return <DetailSkeleton />;
  if (error || !data) return <DetailMissing />;

  const { item, suppliers, batches, movements } = data;
  const badge = stockBadge(item);
  const unit = item.base_unit?.symbol ?? '';

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <Link
        href="/inventory/catalog/items"
        className="inline-flex items-center gap-1.5 text-neutral-gray hover:text-text-dark transition-colors text-sm font-body mb-4"
      >
        <ArrowLeftIcon size={14} weight="bold" />
        All items
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold font-brand text-text-dark">{item.name}</h1>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge.className}`}>
              {badge.label}
            </span>
          </div>
          <p className="text-neutral-gray text-sm font-body mt-1">
            <span className="font-mono">{item.sku}</span>
            {item.category ? ` · ${item.category.name}` : ''}
            {` · ${item.storage_type}`}
          </p>
          {item.description && (
            <p className="text-neutral-gray text-sm font-body mt-1 max-w-2xl">{item.description}</p>
          )}
        </div>
      </div>

      {/* Stock summary */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <MetaCard
          icon={<PackageIcon size={16} />}
          label="On hand"
          value={`${fmtQty(item.stock_on_hand)} ${unit}`.trim()}
        />
        <MetaCard label="Avg cost / unit" value={formatGHS(item.weighted_avg_cost)} />
        <MetaCard
          label="Reorder level"
          value={item.reorder_level != null ? `${fmtQty(item.reorder_level)} ${unit}`.trim() : '-'}
        />
        <MetaCard
          label="Min threshold"
          value={item.min_threshold != null ? `${fmtQty(item.min_threshold)} ${unit}`.trim() : '-'}
        />
      </div>

      {/* Suppliers */}
      <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5 mb-5">
        <div className="flex items-center gap-1.5 text-neutral-gray text-[11px] font-semibold uppercase tracking-wider mb-3">
          <TruckIcon size={14} />
          Supplied by
        </div>
        {suppliers.length === 0 ? (
          <p className="text-neutral-gray text-sm font-body">No purchases recorded yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {suppliers.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-body bg-neutral-light border border-[#f0e8d8] text-text-dark"
              >
                {s.name}
                <span className="text-neutral-gray text-[11px] font-mono">{s.code}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Batches (expiry-tracked items) */}
      {item.expiry_tracked && (
        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5 mb-5">
          <div className="flex items-center gap-1.5 text-neutral-gray text-[11px] font-semibold uppercase tracking-wider mb-3">
            <ClockCountdownIcon size={14} />
            Batches (FEFO) <span className="text-neutral-gray/60 normal-case font-normal">· soonest expiry first</span>
          </div>
          {batches.length === 0 ? (
            <p className="text-neutral-gray text-sm font-body">No open batches.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-body">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-gray">
                    <th className="py-2 pr-4">Expiry</th>
                    <th className="py-2 pr-4 text-right">Remaining</th>
                    <th className="py-2 pr-4 text-right">Received</th>
                    <th className="py-2 text-right">Unit cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0e8d8]">
                  {batches.map((b) => {
                    const exp = batchExpiry(b.expiry_date);
                    return (
                      <tr key={b.id}>
                        <td className="py-2 pr-4">
                          <span className={`inline-flex items-center gap-1.5 ${exp.className}`}>
                            {exp.label}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums text-text-dark font-semibold">
                          {fmtQty(b.remaining_qty)} {unit}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums text-neutral-gray">
                          {fmtQty(b.received_qty)} {unit}
                        </td>
                        <td className="py-2 text-right tabular-nums text-text-dark">{formatGHS(b.unit_cost)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Supply / movement history */}
      <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#f0e8d8] flex items-baseline justify-between">
          <h2 className="text-sm font-semibold font-body text-text-dark">
            Supply history{' '}
            <span className="text-neutral-gray font-normal">({movements.length})</span>
          </h2>
          <p className="text-xs text-neutral-gray">Newest first · running balance</p>
        </div>
        {movements.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-center">
            <ClipboardTextIcon size={40} weight="thin" className="text-neutral-gray/40 mb-3" />
            <p className="text-text-dark font-medium font-body">No movements yet</p>
            <p className="text-neutral-gray text-sm font-body mt-1 max-w-xs">
              Stock changes appear here as you record purchases, transfers and adjustments.
            </p>
          </div>
        ) : (
          <MovementsTable movements={movements} unit={unit} />
        )}
      </div>
    </div>
  );
}

// ─── Movements table ─────────────────────────────────────────────────────────

function MovementsTable({ movements, unit }: { movements: ItemMovement[]; unit: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm font-body">
        <thead>
          <tr className="text-left bg-neutral-light/60 text-[11px] font-semibold uppercase tracking-wider text-neutral-gray">
            <th className="px-5 py-2.5">Date</th>
            <th className="px-5 py-2.5">Type</th>
            {/* Without this the ledger was unreadable for anyone who sees every
                location. A user looking at the mother kitchen saw a branch's
                transfer_out interleaved with no way to tell them apart, and
                reasonably read it as the mother kitchen being deducted twice. */}
            <th className="px-5 py-2.5">Location</th>
            <th className="px-5 py-2.5 text-right">Change</th>
            <th className="px-5 py-2.5 text-right">Balance</th>
            <th className="px-5 py-2.5 text-right">Unit cost</th>
            <th className="px-5 py-2.5">Source</th>
            <th className="px-5 py-2.5">By</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0e8d8]">
          {movements.map((m) => {
            const isIn = m.quantity >= 0;
            return (
              <tr key={m.id} className="hover:bg-primary/5">
                <td className="px-5 py-3 text-text-dark whitespace-nowrap">{fmtDateTime(m.occurred_at)}</td>
                <td className="px-5 py-3">
                  <span className="capitalize text-text-dark">{m.movement_type.replace(/_/g, ' ')}</span>
                </td>
                <td className="px-5 py-3 text-text-dark whitespace-nowrap">
                  {m.location?.name ?? '-'}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">
                  <span className={`inline-flex items-center gap-0.5 font-semibold ${isIn ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {isIn ? <ArrowUpIcon size={12} weight="bold" /> : <ArrowDownIcon size={12} weight="bold" />}
                    {isIn ? '+' : ''}{fmtQty(m.quantity)} {unit}
                  </span>
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-text-dark font-semibold">
                  {fmtQty(m.balance_after)} {unit}
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-text-dark">
                  {m.unit_cost_at_time != null ? formatGHS(m.unit_cost_at_time) : '-'}
                </td>
                <td className="px-5 py-3">
                  {m.reference?.type === 'purchase' ? (
                    <div className="flex flex-col gap-0.5">
                      <Link
                        href={`/inventory/purchases/${m.reference.purchase_id}`}
                        className="inline-flex items-center gap-1 text-primary hover:underline font-mono text-xs"
                      >
                        <ReceiptIcon size={12} weight="bold" />
                        {m.reference.purchase_reference}
                      </Link>
                      {m.reference.purchase_order && (
                        <Link
                          href={`/inventory/purchase-orders/${m.reference.purchase_order.id}`}
                          className="inline-flex items-center gap-1 text-neutral-gray hover:text-primary font-mono text-xs"
                        >
                          <ClipboardTextIcon size={12} weight="bold" />
                          {m.reference.purchase_order.reference}
                        </Link>
                      )}
                    </div>
                  ) : m.reference?.type === 'order' ? (
                    <Link
                      href={`/staff/orders?select=${m.reference.order_id}`}
                      className="inline-flex items-center gap-1 text-primary hover:underline font-mono text-xs"
                    >
                      <ReceiptIcon size={12} weight="bold" />
                      {m.reference.order_number}
                    </Link>
                  ) : (
                    <span className="text-neutral-gray/60">-</span>
                  )}
                </td>
                <td className="px-5 py-3 text-neutral-gray">{m.user?.name ?? '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Meta card ───────────────────────────────────────────────────────────────

function MetaCard({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-4">
      <div className="flex items-center gap-1.5 text-neutral-gray text-[10px] font-semibold uppercase tracking-wider mb-1.5">
        {icon && <span className="text-neutral-gray/70">{icon}</span>}
        {label}
      </div>
      <p className="text-text-dark text-sm font-semibold font-body truncate">{value}</p>
    </div>
  );
}

// ─── Loading + missing ───────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <div className="h-4 w-24 bg-neutral-light rounded animate-pulse mb-4" />
      <div className="h-8 w-64 bg-neutral-light rounded animate-pulse mb-2" />
      <div className="h-4 w-48 bg-neutral-light rounded animate-pulse mb-6" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-neutral-light rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="h-64 bg-neutral-light rounded-2xl animate-pulse" />
    </div>
  );
}

function DetailMissing() {
  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <Link
        href="/inventory/catalog/items"
        className="inline-flex items-center gap-1.5 text-neutral-gray hover:text-text-dark transition-colors text-sm font-body mb-4"
      >
        <ArrowLeftIcon size={14} weight="bold" />
        All items
      </Link>
      <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl py-16 flex flex-col items-center text-center">
        <WarningCircleIcon size={40} weight="thin" className="text-neutral-gray/40 mb-3" />
        <p className="text-text-dark font-medium font-body">Item not found</p>
        <p className="text-neutral-gray text-sm font-body mt-1 max-w-sm">
          It may have been removed or you may not have permission to view it.
        </p>
      </div>
    </div>
  );
}
