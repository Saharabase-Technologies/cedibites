'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PlusIcon,
  ArrowsLeftRightIcon,
  ArrowRightIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import {
  PageHeader,
  FilterBar,
  SearchBar,
  FilterSelect,
  DataTable,
  TransferStatusBadge,
  type DataTableColumn,
} from '../../_components';
import { useTransfers } from '@/lib/api/hooks/inventory/useTransfers';
import { useInventoryLocations } from '@/lib/api/hooks/inventory/useInventoryLocations';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import type { InventoryTransfer, TransferStatus } from '@/types/inventory';
import { formatGHS, formatDateTime, transferValue } from '../utils';

const STATUS_OPTIONS: { value: TransferStatus | ''; label: string }[] = [
  { value: 'draft',           label: 'Draft' },
  { value: 'submitted',       label: 'Submitted' },
  { value: 'approved',        label: 'Approved' },
  { value: 'sent',            label: 'In transit' },
  { value: 'received',        label: 'Received' },
  { value: 'disputed',        label: 'Disputed' },
  { value: 'closed_disputed', label: 'Closed (disputed)' },
  { value: 'cancelled',       label: 'Cancelled' },
];

export function TransfersPage() {
  const router = useRouter();
  const { can } = useStaffAuth();
  const canCreate = can('inventory.transfer.create');

  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState<string>('');
  const [sourceId, setSourceId] = useState<string>('');
  const [destId, setDestId]     = useState<string>('');

  const { data: locations = [] } = useInventoryLocations({ is_active: true });
  const { data: transfers = [], isLoading } = useTransfers({
    search:                  search || undefined,
    status:                  (status as TransferStatus) || undefined,
    source_location_id:      sourceId ? Number(sourceId) : undefined,
    destination_location_id: destId ? Number(destId) : undefined,
  });

  const locationOptions = locations.map((l) => ({ value: String(l.id), label: l.name }));

  const columns: DataTableColumn<InventoryTransfer>[] = [
    {
      key: 'reference',
      header: 'Reference',
      sortValue: (t) => t.reference,
      cell: (t) => (
        <div>
          <p className="font-mono text-text-dark text-sm font-semibold">{t.reference}</p>
          <p className="text-neutral-gray text-[11px] mt-0.5">
            {formatDateTime(t.created_at)}
            {t.created_by ? <> · by {t.created_by}</> : null}
          </p>
        </div>
      ),
    },
    {
      key: 'route',
      header: 'Route',
      cell: (t) => (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-text-dark">{t.source_location?.name ?? '-'}</span>
          <ArrowRightIcon size={13} weight="bold" className="text-neutral-gray/60 shrink-0" />
          <span className="text-text-dark">{t.destination_location?.name ?? '-'}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (t) => t.status,
      cell: (t) => (
        <div className="flex items-center gap-1.5">
          <TransferStatusBadge status={t.status} />
          {t.parent_transfer_id && (
            <span
              title="Corrective transfer for a disputed transfer"
              className="text-[10px] font-semibold text-amber-700"
            >
              ↩ corrective
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      hideBelow: 'md',
      align: 'right',
      sortValue: (t) => t.lines.length,
      cell: (t) => <span className="tabular-nums text-text-dark text-sm">{t.lines.length}</span>,
    },
    {
      key: 'value',
      header: 'Value',
      hideBelow: 'lg',
      align: 'right',
      sortValue: (t) => transferValue(t),
      cell: (t) => {
        const value = transferValue(t);
        return value > 0 ? (
          <span className="text-text-dark text-sm font-semibold tabular-nums">
            {formatGHS(value)}
          </span>
        ) : (
          <span className="text-neutral-gray/60">-</span>
        );
      },
    },
  ];

  const hasFilters = !!(search || status || sourceId || destId);

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <PageHeader
        title="Transfers"
        subtitle="Move stock between the mother kitchen and branches."
        action={
          canCreate
            ? {
                label: 'New Transfer',
                icon: <PlusIcon size={16} weight="bold" />,
                onClick: () => router.push('/inventory/transfers/new'),
              }
            : undefined
        }
      />

      <FilterBar>
        <SearchBar value={search} onChange={setSearch} placeholder="Search reference…" />
        <FilterSelect
          value={status}
          onChange={setStatus}
          placeholder="All statuses"
          options={STATUS_OPTIONS as { value: string; label: string }[]}
        />
        <FilterSelect
          value={sourceId}
          onChange={setSourceId}
          placeholder="Any source"
          options={locationOptions}
        />
        <FilterSelect
          value={destId}
          onChange={setDestId}
          placeholder="Any destination"
          options={locationOptions}
        />
      </FilterBar>

      {!isLoading && transfers.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <DataTable<InventoryTransfer>
          data={transfers}
          columns={columns}
          rowKey={(t) => t.id}
          isLoading={isLoading}
          defaultSortKey="reference"
          needsAttention={(t) => t.status === 'sent' || t.status === 'disputed'}
          defaultSortDir="desc"
          pageSize={15}
          onRowClick={(t) => router.push(`/inventory/transfers/${t.id}`)}
        />
      )}
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl py-16 flex flex-col items-center text-center">
      {hasFilters ? (
        <WarningCircleIcon size={40} weight="thin" className="text-neutral-gray/40 mb-3" />
      ) : (
        <ArrowsLeftRightIcon size={40} weight="thin" className="text-neutral-gray/40 mb-3" />
      )}
      <p className="text-text-dark font-medium font-body">
        {hasFilters ? 'No transfers match your filters' : 'No transfers yet'}
      </p>
      <p className="text-neutral-gray text-sm font-body mt-1 max-w-sm">
        {hasFilters
          ? 'Try clearing filters or adjusting your search.'
          : 'Create a transfer to move stock from the warehouse to a branch.'}
      </p>
    </div>
  );
}
