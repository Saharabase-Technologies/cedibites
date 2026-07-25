'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PlusIcon,
  ClipboardTextIcon,
  ArrowRightIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import {
  PageHeader,
  FilterBar,
  SearchBar,
  FilterSelect,
  DataTable,
  RequisitionStatusBadge,
  type DataTableColumn,
} from '../../_components';
import { useRequisitions } from '@/lib/api/hooks/inventory/useRequisitions';
import { useInventoryLocations } from '@/lib/api/hooks/inventory/useInventoryLocations';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import type {
  InventoryRequisition,
  RequisitionStatus,
  RequisitionPurpose,
} from '@/types/inventory';
import { formatDateTime, PURPOSE_LABEL } from '../utils';

const STATUS_OPTIONS: { value: RequisitionStatus | ''; label: string }[] = [
  { value: 'draft',     label: 'Draft' },
  { value: 'submitted', label: 'Awaiting approval' },
  { value: 'approved',  label: 'Approved' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'rejected',  label: 'Rejected' },
];

const PURPOSE_OPTIONS: { value: RequisitionPurpose | ''; label: string }[] = [
  { value: 'opening',       label: 'Opening stock' },
  { value: 'supplementary', label: 'Supplementary' },
];

export function RequisitionsPage() {
  const router = useRouter();
  const { can } = useStaffAuth();
  const canCreate = can('inventory.requisition.create');

  const [search, setSearch]       = useState('');
  const [status, setStatus]       = useState<string>('');
  const [requesting, setRequesting] = useState<string>('');
  const [purpose, setPurpose]     = useState<string>('');

  const { data: locations = [] } = useInventoryLocations({ is_active: true });
  const { data: requisitions = [], isLoading } = useRequisitions({
    search:                 search || undefined,
    status:                 (status as RequisitionStatus) || undefined,
    requesting_location_id: requesting ? Number(requesting) : undefined,
    purpose:                (purpose as RequisitionPurpose) || undefined,
  });

  const branchOptions = locations
    .filter((l) => l.type === 'satellite')
    .map((l) => ({ value: String(l.id), label: l.name }));

  const columns: DataTableColumn<InventoryRequisition>[] = [
    {
      key: 'reference',
      header: 'Reference',
      sortValue: (r) => r.reference,
      cell: (r) => (
        <div>
          <p className="font-mono text-text-dark text-sm font-semibold">{r.reference}</p>
          <p className="text-neutral-gray text-[11px] mt-0.5">
            {formatDateTime(r.created_at)}
            {r.requested_by ? <> · by {r.requested_by}</> : null}
          </p>
        </div>
      ),
    },
    {
      key: 'route',
      header: 'Fulfil from → for',
      cell: (r) => (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-text-dark">{r.source_location?.name ?? '—'}</span>
          <ArrowRightIcon size={13} weight="bold" className="text-neutral-gray/60 shrink-0" />
          <span className="text-text-dark">{r.requesting_location?.name ?? '—'}</span>
        </div>
      ),
    },
    {
      key: 'purpose',
      header: 'Purpose',
      hideBelow: 'lg',
      sortValue: (r) => r.purpose,
      cell: (r) => <span className="text-text-dark text-sm">{PURPOSE_LABEL[r.purpose]}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (r) => r.status,
      cell: (r) => <RequisitionStatusBadge status={r.status} />,
    },
    {
      key: 'items',
      header: 'Items',
      hideBelow: 'md',
      align: 'right',
      sortValue: (r) => r.lines.length,
      cell: (r) => <span className="tabular-nums text-text-dark text-sm">{r.lines.length}</span>,
    },
  ];

  const hasFilters = !!(search || status || requesting || purpose);

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <PageHeader
        title="Requisitions"
        subtitle="Branch stock requests. Approving one dispatches a transfer from the warehouse."
        action={
          canCreate
            ? {
                label: 'New Requisition',
                icon: <PlusIcon size={16} weight="bold" />,
                onClick: () => router.push('/inventory/requisitions/new'),
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
          value={requesting}
          onChange={setRequesting}
          placeholder="Any branch"
          options={branchOptions}
        />
        <FilterSelect
          value={purpose}
          onChange={setPurpose}
          placeholder="Any purpose"
          options={PURPOSE_OPTIONS as { value: string; label: string }[]}
        />
      </FilterBar>

      {!isLoading && requisitions.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <DataTable<InventoryRequisition>
          data={requisitions}
          columns={columns}
          rowKey={(r) => r.id}
          isLoading={isLoading}
          defaultSortKey="reference"
          needsAttention={(r) => r.status === 'submitted'}
          defaultSortDir="desc"
          pageSize={15}
          onRowClick={(r) => router.push(`/inventory/requisitions/${r.id}`)}
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
        <ClipboardTextIcon size={40} weight="thin" className="text-neutral-gray/40 mb-3" />
      )}
      <p className="text-text-dark font-medium font-body">
        {hasFilters ? 'No requisitions match your filters' : 'No requisitions yet'}
      </p>
      <p className="text-neutral-gray text-sm font-body mt-1 max-w-sm">
        {hasFilters
          ? 'Try clearing filters or adjusting your search.'
          : 'Raise a requisition to request stock from the warehouse.'}
      </p>
    </div>
  );
}
