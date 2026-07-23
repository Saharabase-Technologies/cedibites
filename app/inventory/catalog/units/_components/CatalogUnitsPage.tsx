'use client';

import { useState } from 'react';
import { RulerIcon, PlusIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import {
  InventoryModal,
  FormField,
  TextInput,
  Select,
  PrimaryButton,
  Toggle,
  DataTable,
  RowActionsMenu,
  type DataTableColumn,
} from '../../../_components';
import {
  useInventoryUnits,
  useCreateInventoryUnit,
} from '@/lib/api/hooks/inventory/useInventoryCatalog';
import { useStaffAuthOptional } from '@/app/components/providers/StaffAuthProvider';
import type { InventoryUnit, UnitDimension } from '@/types/inventory';

const DIMENSION_LABEL: Record<UnitDimension, string> = {
  mass:   'Mass',
  volume: 'Volume',
  count:  'Count',
  length: 'Length',
};

// ─── Add unit form ────────────────────────────────────────────────────────────

function AddUnitForm({ onClose }: { onClose: () => void }) {
  const [name,       setName]       = useState('');
  const [code,       setCode]       = useState('');
  const [symbol,     setSymbol]     = useState('');
  const [dimension,  setDimension]  = useState<UnitDimension>('mass');
  const [isBase,     setIsBase]     = useState(false);

  const create = useCreateInventoryUnit();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await create.mutateAsync({
      code: code || name.toLowerCase().replace(/\s+/g, '_'),
      name,
      symbol,
      dimension,
      is_base_unit: isBase,
    });
    onClose();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <FormField label="Name" htmlFor="unit-name" required>
        <TextInput
          id="unit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Kilogram"
          required
          autoFocus
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Symbol" htmlFor="unit-symbol" required>
          <TextInput
            id="unit-symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="kg"
            required
          />
        </FormField>
        <FormField label="Code" htmlFor="unit-code" hint="Auto from name if blank">
          <TextInput
            id="unit-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="kilogram"
          />
        </FormField>
      </div>

      <FormField label="Dimension" htmlFor="unit-dimension" required>
        <Select
          id="unit-dimension"
          value={dimension}
          onChange={(e) => setDimension(e.target.value as UnitDimension)}
        >
          <option value="mass">Mass (kg, g)</option>
          <option value="volume">Volume (L, ml)</option>
          <option value="count">Count (piece, dozen)</option>
          <option value="length">Length (m, cm)</option>
        </Select>
      </FormField>

      <FormField
        label="Base unit for this dimension"
        htmlFor="unit-isbase"
        hint="The canonical unit of its dimension (e.g. kilogram for mass, litre for volume). Other units of the same dimension convert to and from this one."
      >
        <Toggle
          checked={isBase}
          onChange={setIsBase}
          label={isBase ? 'Yes — this is the base unit' : 'No — this converts to a base unit'}
        />
      </FormField>

      <PrimaryButton type="submit" loading={create.isPending}>
        Save unit
      </PrimaryButton>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function CatalogUnitsPage() {
  const can = useStaffAuthOptional()?.can;
  const canManage = !can || can('inventory.unit.manage');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { data: units = [], isLoading } = useInventoryUnits();

  const columns: DataTableColumn<InventoryUnit>[] = [
    {
      key: 'name',
      header: 'Name',
      sortValue: (u) => u.name.toLowerCase(),
      cell: (u) => <span className="font-medium">{u.name}</span>,
    },
    {
      key: 'symbol',
      header: 'Symbol',
      sortValue: (u) => u.symbol,
      cell: (u) => <span className="tabular-nums">{u.symbol}</span>,
    },
    {
      key: 'code',
      header: 'Code',
      hideBelow: 'sm',
      sortValue: (u) => u.code,
      cell: (u) => <span className="text-neutral-gray font-mono text-[11px]">{u.code}</span>,
    },
    {
      key: 'dimension',
      header: 'Dimension',
      hideBelow: 'md',
      sortValue: (u) => u.dimension,
      cell: (u) => DIMENSION_LABEL[u.dimension],
    },
    {
      key: 'base',
      header: 'Base',
      hideBelow: 'sm',
      sortValue: (u) => (u.is_base_unit ? 0 : 1),
      cell: (u) =>
        u.is_base_unit ? (
          <span className="text-text-dark">Yes</span>
        ) : (
          <span className="text-neutral-gray/60">—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      width: 'w-12',
      align: 'right',
      cell: (u) => (
        <RowActionsMenu
          actions={[
            {
              label: 'Edit',
              icon: <PencilSimpleIcon size={14} weight="bold" />,
              onClick: () => console.info('edit', u),
            },
            {
              label: 'Delete',
              icon: <TrashIcon size={14} weight="bold" />,
              destructive: true,
              onClick: () => console.info('delete', u),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-3 mb-5 flex flex-wrap items-center gap-3">
        <p className="text-sm font-body text-neutral-gray flex-1">
          Define the units used to measure inventory items.
        </p>
        {canManage && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold font-body hover:bg-primary/90 transition-colors min-h-11 cursor-pointer shadow-sm"
          >
            <PlusIcon size={16} weight="bold" />
            Add Unit
          </button>
        )}
      </div>

      <DataTable<InventoryUnit>
        data={units}
        columns={columns}
        rowKey={(u) => u.id}
        defaultSortKey="dimension"
        isLoading={isLoading}
        pageSize={10}
        emptyState={
          <div className="py-16 flex flex-col items-center text-center">
            <RulerIcon size={40} weight="thin" className="text-neutral-gray/40 mb-3" />
            <p className="text-text-dark font-medium font-body">No units yet</p>
            <p className="text-neutral-gray text-sm font-body mt-1 mb-5 max-w-xs">
              Units describe how items are measured (kg, L, piece, etc).
            </p>
            {canManage && (
              <button
                onClick={() => setIsAddOpen(true)}
                className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold font-body hover:bg-primary/90 transition-colors cursor-pointer"
              >
                <PlusIcon size={16} weight="bold" />
                Add first unit
              </button>
            )}
          </div>
        }
      />

      <InventoryModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add unit of measure"
      >
        <AddUnitForm onClose={() => setIsAddOpen(false)} />
      </InventoryModal>
    </>
  );
}
