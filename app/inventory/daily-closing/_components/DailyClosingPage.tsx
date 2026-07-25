'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarCheckIcon, ClipboardTextIcon } from '@phosphor-icons/react';
import {
  PageHeader,
  DataTable,
  DailyClosingStatusBadge,
  FormField,
  Select,
  TextInput,
  type DataTableColumn,
} from '../../_components';
import {
  useDailyClosings,
  useClosingCalendar,
  useOpenDailyClosing,
} from '@/lib/api/hooks/inventory/useDailyClosings';
import { useInventoryLocations } from '@/lib/api/hooks/inventory/useInventoryLocations';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import type { InventoryDailyClosing } from '@/types/inventory';
import { formatBusinessDate, formatVariance, todayIso } from '../utils';
import { getErrorMessage } from '@/lib/utils/error-handler';
import { toast } from '@/lib/utils/toast';

export function DailyClosingPage() {
  const router = useRouter();
  const { can } = useStaffAuth();
  const canEnter = can('inventory.daily_closing.enter');

  const { data: locations = [] } = useInventoryLocations({ is_active: true });
  const [locationId, setLocationId] = useState<string>('');
  const [date, setDate] = useState<string>(todayIso());

  // Default to the first location once loaded.
  const effectiveLocationId = locationId || (locations[0] ? String(locations[0].id) : '');
  const locId = Number(effectiveLocationId) || 0;

  const { data: closings = [], isLoading } = useDailyClosings({
    location_id: locId || undefined,
  });

  const open = useOpenDailyClosing();

  const startCount = async () => {
    if (!locId || !date) return;
    try {
      const closing = await open.mutateAsync({ location_id: locId, business_date: date });
      router.push(`/inventory/daily-closing/${closing.id}`);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const columns: DataTableColumn<InventoryDailyClosing>[] = [
    {
      key: 'business_date',
      header: 'Date',
      sortValue: (c) => c.business_date,
      cell: (c) => (
        <span className="text-text-dark text-sm font-medium">{formatBusinessDate(c.business_date)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (c) => c.status,
      cell: (c) => <DailyClosingStatusBadge status={c.status} />,
    },
    {
      key: 'progress',
      header: 'Counted',
      hideBelow: 'md',
      align: 'right',
      cell: (c) => (
        <span className="tabular-nums text-text-dark text-sm">
          {c.counted_count}/{c.line_count}
        </span>
      ),
    },
    {
      key: 'discrepancies',
      header: 'Discrepancies',
      hideBelow: 'sm',
      align: 'right',
      sortValue: (c) => c.discrepancy_count,
      cell: (c) =>
        c.discrepancy_count > 0 ? (
          <span className="tabular-nums text-amber-700 text-sm font-semibold">
            {c.discrepancy_count}
          </span>
        ) : (
          <span className="text-neutral-gray/60">—</span>
        ),
    },
    {
      key: 'net_variance',
      header: 'Net variance',
      align: 'right',
      sortValue: (c) => c.net_variance,
      cell: (c) => {
        const v = c.net_variance;
        return (
          <span
            className={`tabular-nums text-sm font-semibold ${
              v === 0 ? 'text-text-dark' : v < 0 ? 'text-rose-700' : 'text-amber-700'
            }`}
          >
            {formatVariance(v)}
          </span>
        );
      },
    },
  ];

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <PageHeader
        title="Daily Closing"
        subtitle="Count stock at the end of each day and reconcile against the expected balance."
      />

      {/* Location + start count */}
      <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5 mb-5">
        <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-4 items-end">
          <FormField label="Location" htmlFor="dc-location">
            <Select
              id="dc-location"
              value={effectiveLocationId}
              onChange={(e) => setLocationId(e.target.value)}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Business date" htmlFor="dc-date">
            <TextInput
              id="dc-date"
              type="date"
              max={todayIso()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </FormField>

          {canEnter && (
            <button
              type="button"
              onClick={startCount}
              disabled={!locId || !date || open.isPending}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold font-body bg-primary text-white hover:bg-primary/90 min-h-11 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CalendarCheckIcon size={16} weight="bold" />
              {open.isPending ? 'Opening…' : 'Open count'}
            </button>
          )}
        </div>
        <p className="text-neutral-gray text-xs font-body mt-2">
          Opening a count snapshots the expected quantities from the ledger. Re-opening an existing
          date returns the same count.
        </p>
      </div>

      {/* Coverage strip */}
      {locId > 0 && <CoverageStrip locationId={locId} onPick={(id) => router.push(`/inventory/daily-closing/${id}`)} />}

      {/* Recent closings */}
      {!isLoading && closings.length === 0 ? (
        <EmptyState />
      ) : (
        <DataTable<InventoryDailyClosing>
          data={closings}
          columns={columns}
          rowKey={(c) => c.id}
          isLoading={isLoading}
          defaultSortKey="business_date"
          defaultSortDir="desc"
          pageSize={15}
          onRowClick={(c) => router.push(`/inventory/daily-closing/${c.id}`)}
        />
      )}
    </div>
  );
}

// ─── Coverage strip (last 14 days — flags missed days) ────────────────────────

function CoverageStrip({
  locationId,
  onPick,
}: {
  locationId: number;
  onPick: (id: number) => void;
}) {
  const { from, to } = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 13);
    const iso = (d: Date) => {
      const off = d.getTimezoneOffset();
      return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
    };
    return { from: iso(start), to: iso(end) };
  }, []);

  const { data: days = [] } = useClosingCalendar(locationId, from, to);
  const today = todayIso();

  if (days.length === 0) return null;

  return (
    <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5 mb-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-gray">
          Last 14 days
        </p>
        <div className="flex items-center gap-3 text-[10px] text-neutral-gray">
          <Legend color="bg-emerald-500" label="Completed" />
          <Legend color="bg-amber-500" label="Counting" />
          <Legend color="bg-rose-400" label="Missed" />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {days.map((day) => {
          const isToday = day.date === today;
          const missed = day.status === null && !isToday && day.date < today;
          const tone =
            day.status === 'completed'
              ? 'bg-emerald-500 text-white'
              : day.status === 'open'
                ? 'bg-amber-500 text-white'
                : missed
                  ? 'bg-rose-400 text-white'
                  : 'bg-neutral-light text-neutral-gray';
          const dd = day.date.slice(8, 10);
          return (
            <button
              key={day.date}
              type="button"
              disabled={!day.id}
              onClick={() => day.id && onPick(day.id)}
              title={`${day.date}${day.status ? ` · ${day.status}` : missed ? ' · missed' : ''}`}
              className={`w-8 h-8 rounded-lg text-[11px] font-semibold tabular-nums flex items-center justify-center ${tone} ${
                day.id ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
              } ${isToday ? 'ring-2 ring-primary ring-offset-1' : ''}`}
            >
              {dd}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl py-16 flex flex-col items-center text-center">
      <ClipboardTextIcon size={40} weight="thin" className="text-neutral-gray/40 mb-3" />
      <p className="text-text-dark font-medium font-body">No closings for this location yet</p>
      <p className="text-neutral-gray text-sm font-body mt-1 max-w-sm">
        Open a count for today to start reconciling stock.
      </p>
    </div>
  );
}
