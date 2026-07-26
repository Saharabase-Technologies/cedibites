'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon, TrashIcon, WarningIcon } from '@phosphor-icons/react';
import {
  PageHeader,
  DataTable,
  WastageStatusBadge,
  SearchBar,
  FilterBar,
  FilterSelect,
  type DataTableColumn,
} from '../../_components';
import { useWastages, useWastageReasons } from '@/lib/api/hooks/inventory/useWastages';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import type { InventoryWastage, WastageStatus } from '@/types/inventory';
import { RecordWastageForm } from './RecordWastageForm';
import { formatDateTime, formatGhs } from '../utils';

export function WastagePage() {
  const router = useRouter();
  const { can } = useStaffAuth();
  const canRecord = can('inventory.wastage.record');
  const canApprove = can('inventory.wastage.approve');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [recording, setRecording] = useState(false);

  const { data: wastages = [], isLoading } = useWastages({
    search: search || undefined,
    status: (status || undefined) as WastageStatus | undefined,
  });
  const { data: catalog } = useWastageReasons();

  // What the approver actually has to do. Counted from the same list rather
  // than a second request - a badge that disagrees with the table below it is
  // worse than no badge.
  const awaitingMe = useMemo(
    () => wastages.filter((w) => w.status === 'pending_approval').length,
    [wastages],
  );

  const columns: DataTableColumn<InventoryWastage>[] = [
    {
      key: 'reference',
      header: 'Reference',
      sortValue: (w) => w.reference,
      cell: (w) => (
        <div className="min-w-0">
          <p className="text-text-dark text-sm font-semibold truncate">{w.reference}</p>
          <p className="text-neutral-gray text-[11px] truncate">{w.origin_label}</p>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      hideBelow: 'md',
      sortValue: (w) => w.location?.name ?? '',
      cell: (w) => (
        <span className="text-neutral-gray text-sm">{w.location?.name ?? '-'}</span>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      hideBelow: 'sm',
      align: 'right',
      cell: (w) => <span className="tabular-nums text-neutral-gray text-sm">{w.line_count}</span>,
    },
    {
      key: 'value',
      header: 'Value',
      align: 'right',
      sortValue: (w) => w.total_value,
      cell: (w) => (
        <span
          className={`tabular-nums text-sm font-semibold ${
            w.over_threshold ? 'text-rose-700' : 'text-text-dark'
          }`}
        >
          {formatGhs(w.total_value)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (w) => w.status,
      cell: (w) => <WastageStatusBadge status={w.status} />,
    },
    {
      key: 'recorded_at',
      header: 'Recorded',
      hideBelow: 'lg',
      sortValue: (w) => w.recorded_at ?? '',
      cell: (w) => (
        <div className="min-w-0">
          <p className="text-neutral-gray text-xs">{formatDateTime(w.recorded_at)}</p>
          <p className="text-neutral-gray/70 text-[11px] truncate">{w.recorded_by ?? '-'}</p>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <PageHeader
        title="Wastage"
        subtitle="Every loss that leaves without being sold, and what happened to it."
        action={
          canRecord
            ? {
                label: 'Record wastage',
                onClick: () => setRecording(true),
                icon: <PlusIcon size={16} weight="bold" />,
              }
            : undefined
        }
      />

      {canApprove && awaitingMe > 0 && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-5">
          <WarningIcon size={18} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-amber-800 text-sm font-body">
            <span className="font-semibold">
              {awaitingMe} claim{awaitingMe === 1 ? '' : 's'} waiting on you.
            </span>{' '}
            Nothing is written off until you decide.
          </p>
        </div>
      )}

      {catalog && (
        <p className="text-neutral-gray text-xs font-body mb-4">
          Losses worth more than{' '}
          <span className="font-semibold text-text-dark">{formatGhs(catalog.threshold)}</span> at a
          branch must go back to the warehouse before they can be written off.
        </p>
      )}

      <FilterBar>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by reference…"
        />
        <FilterSelect
          value={status}
          onChange={setStatus}
          placeholder="All statuses"
          options={[
            { value: 'pending_return', label: 'Awaiting return' },
            { value: 'pending_approval', label: 'Awaiting approval' },
            { value: 'approved', label: 'Written off' },
            { value: 'rejected', label: 'Refused' },
            { value: 'cancelled', label: 'Withdrawn' },
          ]}
        />
      </FilterBar>

      {!isLoading && wastages.length === 0 ? (
        <EmptyState canRecord={canRecord} onRecord={() => setRecording(true)} />
      ) : (
        <DataTable<InventoryWastage>
          data={wastages}
          columns={columns}
          rowKey={(w) => w.id}
          isLoading={isLoading}
          defaultSortKey="recorded_at"
          defaultSortDir="desc"
          pageSize={20}
          onRowClick={(w) => router.push(`/inventory/wastage/${w.id}`)}
        />
      )}

      <RecordWastageForm isOpen={recording} onClose={() => setRecording(false)} />
    </div>
  );
}

function EmptyState({ canRecord, onRecord }: { canRecord: boolean; onRecord: () => void }) {
  return (
    <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl py-16 flex flex-col items-center text-center">
      <TrashIcon size={40} weight="thin" className="text-neutral-gray/40 mb-3" />
      <p className="text-text-dark font-medium font-body">Nothing written off yet</p>
      <p className="text-neutral-gray text-sm font-body mt-1 max-w-sm">
        Losses recorded here, at a daily count, or refused on delivery all end up on this page.
      </p>
      {canRecord && (
        <button
          type="button"
          onClick={onRecord}
          className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold font-body bg-primary text-white hover:bg-primary/90 min-h-11 cursor-pointer"
        >
          <PlusIcon size={16} weight="bold" />
          Record wastage
        </button>
      )}
    </div>
  );
}
