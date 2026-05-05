'use client';

import Link from 'next/link';
import {
  ArrowsLeftRightIcon,
  TrashIcon,
  ClipboardTextIcon,
  CalendarXIcon,
} from '@phosphor-icons/react';
import { useInventoryDashboardStats } from '@/lib/api/hooks/inventory/useInventoryDashboard';

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5">
      <p className="text-neutral-gray text-xs font-body uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-2xl font-semibold font-brand text-text-dark">{value}</p>
      {sub && <p className="text-neutral-gray text-xs font-body mt-1">{sub}</p>}
    </div>
  );
}

// ─── Dashboard page ───────────────────────────────────────────────────────────

export default function InventoryDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useInventoryDashboardStats();

  const today = new Date().toLocaleDateString('en-GH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold font-brand text-text-dark">
          Inventory Dashboard
        </h1>
        <p className="text-neutral-gray text-sm font-body mt-1">{today}</p>
      </div>

      {/* Stats grid */}
      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5 animate-pulse h-24"
            />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Low stock items" value={stats.low_stock_count} />
          <StatCard
            label="Pending requisitions"
            value={stats.pending_requisitions_count}
          />
          <StatCard
            label="Today's transfers"
            value={stats.todays_transfers_count}
            sub={`₵${stats.todays_transfers_value.toLocaleString()} value`}
          />
          <StatCard
            label="Today's wastage"
            value={`₵${stats.todays_wastage_value.toLocaleString()}`}
            sub={`Threshold: ₵${stats.wastage_threshold.toLocaleString()}`}
          />
        </div>
      ) : null}

      {/* Quick actions */}
      <div>
        <h2 className="text-base font-semibold font-brand text-text-dark mb-3">
          Quick actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              href: '/inventory/transfers',
              label: 'New Transfer',
              icon: ArrowsLeftRightIcon,
            },
            {
              href: '/inventory/requisitions',
              label: 'New Requisition',
              icon: ClipboardTextIcon,
            },
            {
              href: '/inventory/wastage',
              label: 'Record Wastage',
              icon: TrashIcon,
            },
            {
              href: '/inventory/daily-closing',
              label: 'Enter Closing',
              icon: CalendarXIcon,
            },
          ].map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="
                flex items-center gap-2.5 bg-neutral-card border border-[#f0e8d8]
                rounded-xl px-4 py-3 min-h-11
                hover:bg-primary/10 hover:border-primary/30
                transition-all group cursor-pointer
              "
            >
              <Icon
                size={18}
                weight="bold"
                className="text-text-dark shrink-0 group-hover:text-text-dark"
              />
              <span className="text-sm font-medium font-body text-text-dark group-hover:font-semibold">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
