'use client';

import { TrashIcon, UserPlusIcon } from '@phosphor-icons/react';
import {
  PageHeader,
  DataTable,
  RowActionsMenu,
  type DataTableColumn,
} from '../../_components';
import { useImsStaff, useRemoveImsRole } from '@/lib/api/hooks/inventory/useInventorySettings';
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
        subtitle="Manage IMS staff role assignments."
        action={{
          label: 'Assign role',
          icon: <UserPlusIcon size={16} weight="bold" />,
          onClick: () => {
            // TODO: open assign role modal when backend is ready
          },
        }}
      />

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

