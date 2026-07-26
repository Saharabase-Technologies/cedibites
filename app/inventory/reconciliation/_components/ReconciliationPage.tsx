'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ScalesIcon, WarningIcon } from '@phosphor-icons/react';
import {
  PageHeader,
  DataTable,
  ReconciliationStatusBadge,
  FormField,
  Select,
  type DataTableColumn,
} from '../../_components';
import {
  useReconciliations,
  useOpenReconciliation,
} from '@/lib/api/hooks/inventory/useReconciliations';
import { useInventoryLocations } from '@/lib/api/hooks/inventory/useInventoryLocations';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import type { InventoryReconciliationCycle } from '@/types/inventory';
import { formatDateTime, formatGHS } from '../utils';
import { getErrorMessage } from '@/lib/utils/error-handler';
import { toast } from '@/lib/utils/toast';

export function ReconciliationPage() {
  const router = useRouter();
  const { can } = useStaffAuth();
  const canOpen = can('inventory.reconciliation.open_cycle');

  const { data: locations = [] } = useInventoryLocations({ is_active: true });
  const [locationId, setLocationId] = useState<string>('');
  const effectiveLocationId = locationId || (locations[0] ? String(locations[0].id) : '');
  const locId = Number(effectiveLocationId) || 0;

  const { data: cycles = [], isLoading } = useReconciliations({ location_id: locId || undefined });
  const open = useOpenReconciliation();

  const hasOpenCycle = cycles.some((c) => c.status === 'open');

  const startCycle = async () => {
    if (!locId) return;
    try {
      const cycle = await open.mutateAsync({ location_id: locId });
      router.push(`/inventory/reconciliation/${cycle.id}`);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const columns: DataTableColumn<InventoryReconciliationCycle>[] = [
    {
      key: 'opened_at',
      header: 'Opened',
      sortValue: (c) => c.opened_at ?? '',
      cell: (c) => (
        <div>
          <p className="text-text-dark text-sm font-medium">{formatDateTime(c.opened_at)}</p>
          {c.opened_by && <p className="text-neutral-gray text-[11px] mt-0.5">by {c.opened_by}</p>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (c) => c.status,
      cell: (c) => <ReconciliationStatusBadge status={c.status} />,
    },
    {
      key: 'counted',
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
      key: 'flags',
      header: 'Over threshold',
      hideBelow: 'lg',
      align: 'right',
      sortValue: (c) => c.over_threshold_count,
      cell: (c) =>
        c.over_threshold_count > 0 ? (
          <span className="inline-flex items-center gap-1 text-amber-700 text-sm font-semibold">
            <WarningIcon size={13} weight="fill" />
            {c.over_threshold_count}
          </span>
        ) : (
          <span className="text-neutral-gray/60">-</span>
        ),
    },
    {
      key: 'net_variance',
      header: 'Net variance',
      align: 'right',
      sortValue: (c) => c.net_variance_value ?? 0,
      cell: (c) =>
        c.net_variance_value === null ? (
          <span className="text-neutral-gray/60">-</span>
        ) : (
          <span
            className={`tabular-nums text-sm font-semibold ${
              c.net_variance_value === 0
                ? 'text-text-dark'
                : c.net_variance_value < 0
                  ? 'text-rose-700'
                  : 'text-amber-700'
            }`}
          >
            {formatGHS(c.net_variance_value)}
          </span>
        ),
    },
  ];

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <PageHeader
        title="Reconciliation"
        subtitle="Count everything, cancel out the variance, and reset the books - then a new cycle begins."
      />

      {/* Location + open cycle */}
      <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5 mb-5">
        <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-end">
          <FormField label="Location" htmlFor="rec-location">
            <Select
              id="rec-location"
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

          {canOpen && (
            <button
              type="button"
              onClick={startCycle}
              disabled={!locId || open.isPending || hasOpenCycle}
              title={hasOpenCycle ? 'A cycle is already open for this location' : undefined}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold font-body bg-primary text-white hover:bg-primary/90 min-h-11 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ScalesIcon size={16} weight="bold" />
              {open.isPending ? 'Opening…' : 'Open reconciliation'}
            </button>
          )}
        </div>
        <p className="text-neutral-gray text-xs font-body mt-2">
          {hasOpenCycle
            ? 'A cycle is already open for this location - continue it below. Only one runs at a time.'
            : 'Opening a cycle snapshots the expected quantities. Post it to write the adjustments and reset the books.'}
        </p>
      </div>

      {!isLoading && cycles.length === 0 ? (
        <EmptyState />
      ) : (
        <DataTable<InventoryReconciliationCycle>
          data={cycles}
          columns={columns}
          rowKey={(c) => c.id}
          isLoading={isLoading}
          defaultSortKey="opened_at"
          defaultSortDir="desc"
          pageSize={15}
          onRowClick={(c) => router.push(`/inventory/reconciliation/${c.id}`)}
        />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl py-16 flex flex-col items-center text-center">
      <ScalesIcon size={40} weight="thin" className="text-neutral-gray/40 mb-3" />
      <p className="text-text-dark font-medium font-body">No reconciliation cycles yet</p>
      <p className="text-neutral-gray text-sm font-body mt-1 max-w-sm">
        Open a cycle to count this location&apos;s stock and reconcile it against the system.
      </p>
    </div>
  );
}
