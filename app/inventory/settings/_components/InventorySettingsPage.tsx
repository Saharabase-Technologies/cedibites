'use client';

import { useState, useEffect } from 'react';
import { TrashIcon, UserPlusIcon, FloppyDiskIcon } from '@phosphor-icons/react';
import {
  PageHeader,
  DataTable,
  RowActionsMenu,
  type DataTableColumn,
} from '../../_components';
import {
  useImsStaff,
  useRemoveImsRole,
  useInventorySettings,
  useUpdateInventorySettings,
} from '@/lib/api/hooks/inventory/useInventorySettings';
import type { ImsStaffAssignment, ImsRole } from '@/types/inventory';

// ─── Role badge ───────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<ImsRole, string> = {
  warehouse_manager: 'Warehouse Manager',
  purchasing_clerk:  'Purchasing Clerk',
};

const ROLE_STYLES: Record<ImsRole, string> = {
  warehouse_manager:
    'bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium px-2 py-0.5 rounded-full',
  purchasing_clerk:
    'bg-purple-50 text-purple-700 border border-purple-200 text-xs font-medium px-2 py-0.5 rounded-full',
};

// ─── Wastage threshold (Admin-only) ───────────────────────────────────────────

function WastageThresholdCard() {
  const { data: settings, isLoading } = useInventorySettings();
  const update = useUpdateInventorySettings();

  const [threshold, setThreshold] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) setThreshold(String(settings.wastage_threshold_amount));
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(threshold);
    if (isNaN(value) || value < 0) return;
    await update.mutateAsync({ wastage_threshold_amount: value });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-4">
      <p className="text-sm font-semibold font-body text-text-dark">Wastage threshold</p>
      <p className="text-sm font-body text-neutral-gray mt-0.5 mb-3">
        Wastage events above this amount require warehouse manager approval. Events below are
        auto-accepted (unless marked as spoiled from warehouse).
      </p>

      <form onSubmit={handleSave} className="flex items-center gap-2 max-w-xs">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-gray font-body pointer-events-none select-none">
            GH₵
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            disabled={isLoading}
            className="
              w-full pl-11 pr-3 py-2 rounded-xl min-h-10
              border border-[#e3e1de] bg-[#f5f4f2]
              text-sm font-body text-text-dark
              focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10
              transition-shadow disabled:opacity-50
            "
          />
        </div>
        <button
          type="submit"
          disabled={update.isPending || isLoading}
          className="
            flex items-center gap-1.5 bg-primary text-white
            px-3 py-2 rounded-xl min-h-10 shrink-0
            text-sm font-semibold font-body
            hover:bg-primary/90 transition-colors cursor-pointer
            disabled:opacity-60
          "
        >
          <FloppyDiskIcon size={14} weight="bold" />
          {update.isPending ? 'Saving…' : saved ? 'Saved!' : 'Save'}
        </button>
      </form>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InventorySettingsPage() {
  const { data: staff = [], isLoading } = useImsStaff();
  const remove = useRemoveImsRole();

  const columns: DataTableColumn<ImsStaffAssignment>[] = [
    {
      key: 'name',
      header: 'Name',
      sortValue: (a) => a.name.toLowerCase(),
      cell: (a) => <span className="font-medium">{a.name}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      hideBelow: 'md',
      sortValue: (a) => a.email ?? '',
      cell: (a) => (
        <span className="text-neutral-gray text-sm">{a.email || '—'}</span>
      ),
    },
    {
      key: 'ims_role',
      header: 'IMS Role',
      sortValue: (a) => ROLE_LABELS[a.ims_role],
      cell: (a) => (
        <span className={ROLE_STYLES[a.ims_role]}>{ROLE_LABELS[a.ims_role]}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: 'w-10',
      align: 'right',
      cell: (a) => (
        <RowActionsMenu
          actions={[
            {
              label: 'Remove from IMS',
              icon: <TrashIcon size={14} weight="bold" />,
              destructive: true,
              onClick: () => {
                if (
                  confirm(
                    `Remove ${a.name} from IMS? They will lose their ${ROLE_LABELS[a.ims_role]} role.`,
                  )
                ) {
                  void remove.mutate(a.id);
                }
              },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <PageHeader
        title="Settings"
        subtitle="Wastage threshold and IMS staff role assignments."
      />

      <WastageThresholdCard />

      {/* IMS staff roles ─────────────────────────────────────────────────── */}
      <div className="mt-8 mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold font-body text-text-dark">IMS staff roles</h2>
          <p className="text-sm font-body text-neutral-gray mt-0.5">
            Assign staff members to IMS roles to grant them access.
          </p>
        </div>
        <button
          onClick={() => {
            // TODO: open assign role modal when backend is ready
          }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold font-body hover:bg-primary/90 transition-colors min-h-11 cursor-pointer shadow-sm shrink-0"
        >
          <UserPlusIcon size={16} weight="bold" />
          Assign role
        </button>
      </div>

      <DataTable<ImsStaffAssignment>
        data={staff}
        columns={columns}
        rowKey={(a) => a.id}
        defaultSortKey="name"
        isLoading={isLoading}
        pageSize={10}
        emptyState={
          <div className="py-16 flex flex-col items-center text-center">
            <UserPlusIcon size={40} weight="thin" className="text-neutral-gray/40 mb-3" />
            <p className="text-text-dark font-medium font-body">No staff roles assigned</p>
            <p className="text-neutral-gray text-sm font-body mt-1">
              Assign staff members to IMS roles to grant them access.
            </p>
          </div>
        }
      />
    </div>
  );
}
