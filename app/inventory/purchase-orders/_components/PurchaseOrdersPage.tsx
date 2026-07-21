'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PlusIcon,
  ClipboardIcon,
  SealCheckIcon,
} from '@phosphor-icons/react';
import {
  PageHeader,
  FilterBar,
  SearchBar,
  FilterSelect,
  DataTable,
  POStatusBadge,
  type DataTableColumn,
} from '../../_components';
import { usePurchaseOrders } from '@/lib/api/hooks/inventory/usePurchaseOrders';
import { usePurchaseOrderRealtime } from '@/lib/api/hooks/inventory/usePurchaseOrderRealtime';
import { useInventorySuppliers } from '@/lib/api/hooks/inventory/useInventoryCatalog';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import type { PurchaseOrder, PurchaseOrderStatus } from '@/types/inventory';
import { formatGHS, formatShortDate } from '../utils';

const STATUS_OPTIONS: { value: PurchaseOrderStatus | ''; label: string }[] = [
  { value: 'draft',              label: 'Draft' },
  { value: 'pending_approval',   label: 'Pending approval' },
  { value: 'sent',               label: 'Sent' },
  { value: 'partially_received', label: 'Partial' },
  { value: 'received',           label: 'Received' },
  { value: 'closed',             label: 'Closed' },
  { value: 'cancelled',          label: 'Cancelled' },
];

export function PurchaseOrdersPage() {
  const router = useRouter();
  const { can } = useStaffAuth();
  const canCreate = can('inventory.purchase_order.create');
  usePurchaseOrderRealtime();
  const [search, setSearch]         = useState('');
  const [status, setStatus]         = useState<string>('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [verifyCode, setVerifyCode] = useState('');

  const submitVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const code = verifyCode.trim();
    if (code) router.push(`/inventory/purchase-orders/verify/${encodeURIComponent(code)}`);
  };

  const { data: suppliers = [] } = useInventorySuppliers();
  const { data: orders = [], isLoading } = usePurchaseOrders({
    search:      search   || undefined,
    status:      (status as PurchaseOrderStatus) || undefined,
    supplier_id: supplierId ? Number(supplierId) : undefined,
  });

  const columns: DataTableColumn<PurchaseOrder>[] = [
    {
      key: 'reference',
      header: 'Reference',
      sortValue: (po) => po.reference,
      cell: (po) => (
        <div>
          <p className="font-mono text-text-dark text-sm font-semibold">{po.reference}</p>
          <p className="text-neutral-gray text-[11px] mt-0.5">
            {formatShortDate(po.created_at)} · by {po.created_by.name}
          </p>
        </div>
      ),
    },
    {
      key: 'supplier',
      header: 'Supplier',
      hideBelow: 'sm',
      sortValue: (po) => po.supplier.name.toLowerCase(),
      cell: (po) => (
        <div>
          <p className="text-text-dark text-sm">{po.supplier.name}</p>
          <p className="text-neutral-gray text-[11px] font-mono mt-0.5">{po.supplier.code}</p>
        </div>
      ),
    },
    {
      key: 'destination',
      header: 'Destination',
      hideBelow: 'lg',
      cell: (po) => (
        <span className="text-text-dark text-sm">{po.destination_location.name}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (po) => po.status,
      cell: (po) => <POStatusBadge status={po.status} />,
    },
    {
      key: 'items',
      header: 'Items',
      hideBelow: 'md',
      align: 'right',
      sortValue: (po) => po.items.length,
      cell: (po) => (
        <span className="tabular-nums text-text-dark text-sm">{po.items.length}</span>
      ),
    },
    {
      key: 'expected',
      header: 'Expected',
      hideBelow: 'md',
      sortValue: (po) => po.expected_delivery_date ?? '',
      cell: (po) =>
        po.expected_delivery_date ? (
          <span className="text-text-dark text-sm tabular-nums">
            {formatShortDate(po.expected_delivery_date)}
          </span>
        ) : (
          <span className="text-neutral-gray/60">—</span>
        ),
    },
    {
      key: 'total',
      header: 'Estimated',
      align: 'right',
      sortValue: (po) => po.estimated_total,
      cell: (po) => (
        <span className="text-text-dark text-sm font-semibold tabular-nums">
          {formatGHS(po.estimated_total)}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <PageHeader
        title="Purchase Orders"
        subtitle="Authorise stock orders sent to suppliers."
        action={
          canCreate
            ? {
                label: 'New PO',
                icon: <PlusIcon size={16} weight="bold" />,
                onClick: () => router.push('/inventory/purchase-orders/new'),
              }
            : undefined
        }
      />

      <FilterBar>
        <SearchBar value={search} onChange={setSearch} placeholder="Search reference, supplier…" />
        <FilterSelect
          value={status}
          onChange={setStatus}
          placeholder="All statuses"
          options={STATUS_OPTIONS as { value: string; label: string }[]}
        />
        <FilterSelect
          value={supplierId}
          onChange={setSupplierId}
          placeholder="All suppliers"
          options={suppliers.map((s) => ({ value: String(s.id), label: s.name }))}
        />
        <form onSubmit={submitVerify} className="flex items-center gap-2 ml-auto">
          <input
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value)}
            placeholder="Verify code…"
            className="w-40 px-3.5 py-2.5 border border-[#e3e1de] rounded-xl text-sm font-mono uppercase text-text-dark bg-[#f5f4f2] placeholder:font-body placeholder:normal-case placeholder:text-neutral-gray/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 min-h-11"
          />
          <button
            type="submit"
            disabled={!verifyCode.trim()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold font-body bg-neutral-light text-text-dark hover:bg-neutral-light/70 border border-[#f0e8d8] min-h-11 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Verify purchase order code"
          >
            <SealCheckIcon size={15} weight="bold" />
            Verify
          </button>
        </form>
      </FilterBar>

      {!isLoading && orders.length === 0 ? (
        <EmptyState hasFilters={!!(search || status || supplierId)} />
      ) : (
        <DataTable<PurchaseOrder>
          data={orders}
          columns={columns}
          rowKey={(po) => po.id}
          isLoading={isLoading}
          defaultSortKey="reference"
          pageSize={15}
          onRowClick={(po) => router.push(`/inventory/purchase-orders/${po.id}`)}
        />
      )}
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl py-16 flex flex-col items-center text-center">
      <ClipboardIcon size={40} weight="thin" className="text-neutral-gray/40 mb-3" />
      <p className="text-text-dark font-medium font-body">
        {hasFilters ? 'No purchase orders match your filters' : 'No purchase orders yet'}
      </p>
      <p className="text-neutral-gray text-sm font-body mt-1 max-w-sm">
        {hasFilters
          ? 'Try clearing filters or adjusting your search.'
          : 'Create the first purchase order to send to a supplier.'}
      </p>
    </div>
  );
}
