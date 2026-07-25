'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon, ReceiptIcon, LightningIcon } from '@phosphor-icons/react';
import {
  PageHeader,
  FilterBar,
  SearchBar,
  FilterSelect,
  DataTable,
  type DataTableColumn,
} from '../../_components';
import { usePurchases } from '@/lib/api/hooks/inventory/usePurchases';
import { useInventorySuppliers } from '@/lib/api/hooks/inventory/useInventoryCatalog';
import type { Purchase } from '@/types/inventory';
import { formatGHS, formatDateTime } from '../utils';

const URGENT_OPTIONS = [
  { value: 'true',  label: 'Urgent buys only' },
  { value: 'false', label: 'PO-linked only' },
];

export function PurchasesPage() {
  const router = useRouter();
  const [search, setSearch]         = useState('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [urgent, setUrgent]         = useState<string>('');

  const { data: suppliers = [] } = useInventorySuppliers();
  const { data: purchases = [], isLoading } = usePurchases({
    search:         search   || undefined,
    supplier_id:    supplierId ? Number(supplierId) : undefined,
    is_urgent_buy:  urgent === '' ? undefined : urgent === 'true',
  });

  const columns: DataTableColumn<Purchase>[] = [
    {
      key: 'reference',
      header: 'Reference',
      sortValue: (p) => p.reference,
      cell: (p) => (
        <div>
          <p className="font-mono text-text-dark text-sm font-semibold">{p.reference}</p>
          <p className="text-neutral-gray text-[11px] mt-0.5">
            {formatDateTime(p.received_at)}
          </p>
        </div>
      ),
    },
    {
      key: 'po',
      header: 'Source',
      hideBelow: 'sm',
      cell: (p) =>
        p.is_urgent_buy ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700">
            <LightningIcon size={10} weight="fill" />
            Urgent buy
          </span>
        ) : p.purchase_order ? (
          <span className="font-mono text-text-dark text-xs">{p.purchase_order.reference}</span>
        ) : (
          <span className="text-neutral-gray/60">—</span>
        ),
    },
    {
      key: 'supplier',
      header: 'Supplier',
      sortValue: (p) => p.supplier.name.toLowerCase(),
      cell: (p) => (
        <div>
          <p className="text-text-dark text-sm">{p.supplier.name}</p>
          <p className="text-neutral-gray text-[11px] font-mono mt-0.5">{p.supplier.code}</p>
        </div>
      ),
    },
    {
      key: 'destination',
      header: 'Destination',
      hideBelow: 'lg',
      cell: (p) => <span className="text-text-dark text-sm">{p.destination_location.name}</span>,
    },
    {
      key: 'items',
      header: 'Items',
      hideBelow: 'md',
      align: 'right',
      sortValue: (p) => p.items.length,
      cell: (p) => <span className="tabular-nums text-text-dark text-sm">{p.items.length}</span>,
    },
    {
      key: 'recorded_by',
      header: 'Recorded by',
      hideBelow: 'lg',
      cell: (p) => <span className="text-text-dark text-sm">{p.recorded_by.name}</span>,
    },
    {
      key: 'total',
      header: 'Total paid',
      align: 'right',
      sortValue: (p) => p.total_paid,
      cell: (p) => (
        <span className="text-text-dark text-sm font-semibold tabular-nums">
          {formatGHS(p.total_paid)}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <PageHeader
        title="Purchases"
        subtitle="Recorded supplier receipts. Each entry posts stock into the destination warehouse."
        action={{
          label: 'Record purchase',
          icon: <PlusIcon size={16} weight="bold" />,
          onClick: () => router.push('/inventory/purchases/new'),
        }}
      />

      <FilterBar>
        <SearchBar value={search} onChange={setSearch} placeholder="Search reference, supplier, invoice…" />
        <FilterSelect
          value={supplierId}
          onChange={setSupplierId}
          placeholder="All suppliers"
          options={suppliers.map((s) => ({ value: String(s.id), label: s.name }))}
        />
        <FilterSelect
          value={urgent}
          onChange={setUrgent}
          placeholder="All sources"
          options={URGENT_OPTIONS}
        />
      </FilterBar>

      {!isLoading && purchases.length === 0 ? (
        <EmptyState hasFilters={!!(search || supplierId || urgent)} />
      ) : (
        <DataTable<Purchase>
          data={purchases}
          columns={columns}
          rowKey={(p) => p.id}
          isLoading={isLoading}
          defaultSortKey="reference"
          defaultSortDir="desc"
          pageSize={15}
          onRowClick={(p) => router.push(`/inventory/purchases/${p.id}`)}
        />
      )}
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl py-16 flex flex-col items-center text-center">
      <ReceiptIcon size={40} weight="thin" className="text-neutral-gray/40 mb-3" />
      <p className="text-text-dark font-medium font-body">
        {hasFilters ? 'No purchases match your filters' : 'No purchases recorded yet'}
      </p>
      <p className="text-neutral-gray text-sm font-body mt-1 max-w-sm">
        {hasFilters
          ? 'Try clearing filters or adjusting your search.'
          : 'Record the first supplier receipt to post stock into the warehouse.'}
      </p>
    </div>
  );
}
