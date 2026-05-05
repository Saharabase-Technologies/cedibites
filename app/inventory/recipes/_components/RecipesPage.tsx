'use client';

import { useState } from 'react';
import { EyeIcon, ArrowsClockwiseIcon, BowlFoodIcon, PlusIcon } from '@phosphor-icons/react';
import {
  InventoryModal,
  FilterBar,
  FilterSelect,
  DataTable,
  RowActionsMenu,
  type DataTableColumn,
} from '../../_components';
import { useInventoryRecipes } from '@/lib/api/hooks/inventory/useInventoryRecipes';
import type { InventoryRecipe, RecipeStatus } from '@/types/inventory';

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<RecipeStatus, string> = {
  draft:
    'bg-neutral-light text-neutral-gray border border-[#f0e8d8] text-xs font-medium px-2 py-0.5 rounded-full',
  observation:
    'bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium px-2 py-0.5 rounded-full',
  locked:
    'bg-green-50 text-green-700 border border-green-200 text-xs font-medium px-2 py-0.5 rounded-full',
};

const STATUS_LABELS: Record<RecipeStatus, string> = {
  draft: 'Draft',
  observation: 'Observation',
  locked: 'Locked',
};

function StatusBadge({ status }: { status: RecipeStatus }) {
  return <span className={STATUS_STYLES[status]}>{STATUS_LABELS[status]}</span>;
}

// ─── Ingredients modal ────────────────────────────────────────────────────────

function IngredientsModal({
  recipe,
  onClose,
}: {
  recipe: InventoryRecipe;
  onClose: () => void;
}) {
  return (
    <InventoryModal
      isOpen
      title={`Ingredients — ${recipe.menu_item.name}`}
      onClose={onClose}
    >
      <div className="space-y-2">
        <p className="text-xs text-neutral-500 mb-3">
          Version {recipe.version} · {STATUS_LABELS[recipe.status]}
          {recipe.locked_by && ` · Locked by ${recipe.locked_by.name}`}
        </p>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#f0e8d8]">
              <th className="text-left py-2 pr-4 font-medium text-neutral-600">Ingredient</th>
              <th className="text-right py-2 pr-4 font-medium text-neutral-600">Qty</th>
              <th className="text-right py-2 font-medium text-neutral-600">Unit</th>
            </tr>
          </thead>
          <tbody>
            {recipe.ingredients.map((ing) => (
              <tr key={ing.id} className="border-b border-[#f0e8d8] last:border-0">
                <td className="py-2 pr-4 text-neutral-800">{ing.item.name}</td>
                <td className="py-2 pr-4 text-right text-neutral-700">{ing.quantity}</td>
                <td className="py-2 text-right text-neutral-500">{ing.unit.symbol}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pt-3 border-t border-[#f0e8d8]">
          <p className="text-xs text-neutral-400">
            {recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </InventoryModal>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RecipesPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<InventoryRecipe | null>(null);

  const { data: recipes = [], isLoading } = useInventoryRecipes();

  const filtered = statusFilter
    ? recipes.filter((r) => r.status === statusFilter)
    : recipes;

  const columns: DataTableColumn<InventoryRecipe>[] = [
    {
      key: 'menu_item',
      header: 'Menu item',
      sortValue: (r) => r.menu_item.name.toLowerCase(),
      cell: (r) => <span className="font-medium">{r.menu_item.name}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (r) => r.status,
      cell: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'ingredients',
      header: 'Ingredients',
      sortValue: (r) => r.ingredients.length,
      cell: (r) => <span className="tabular-nums">{r.ingredients.length}</span>,
    },
    {
      key: 'version',
      header: 'Version',
      hideBelow: 'md' as const,
      sortValue: (r) => r.version,
      cell: (r) => (
        <span className="text-neutral-gray font-mono text-[11px]">v{r.version}</span>
      ),
    },
    {
      key: 'locked_by',
      header: 'Locked by',
      hideBelow: 'lg' as const,
      sortValue: (r) => r.locked_by?.name ?? '',
      cell: (r) =>
        r.locked_by ? (
          <span className="text-sm">{r.locked_by.name}</span>
        ) : (
          <span className="text-neutral-gray/60">—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      width: 'w-10',
      align: 'right' as const,
      cell: (r) => (
        <RowActionsMenu
          actions={[
            {
              label: 'View ingredients',
              icon: <EyeIcon size={14} weight="bold" />,
              onClick: () => setSelected(r),
            },
            {
              label: 'Change status',
              icon: <ArrowsClockwiseIcon size={14} weight="bold" />,
              onClick: () => {
                // TODO: wire up when backend ready
              },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <FilterBar>
        <p className="text-sm font-body text-neutral-gray flex-1 min-w-0">
          Ingredient bills of materials for each menu item.
        </p>
        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="All statuses"
          options={[
            { value: 'draft',       label: 'Draft'       },
            { value: 'observation', label: 'Observation' },
            { value: 'locked',      label: 'Locked'      },
          ]}
        />
        <button
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold font-body hover:bg-primary/90 transition-colors min-h-11 cursor-pointer shadow-sm shrink-0"
          onClick={() => {
            // TODO: open add recipe modal
          }}
        >
          <PlusIcon size={16} weight="bold" />
          Add Recipe
        </button>
      </FilterBar>

      <DataTable<InventoryRecipe>
        data={filtered}
        columns={columns}
        rowKey={(r) => r.id}
        defaultSortKey="menu_item"
        isLoading={isLoading}
        pageSize={10}
        emptyState={
          <div className="py-16 flex flex-col items-center text-center">
            <BowlFoodIcon size={40} weight="thin" className="text-neutral-gray/40 mb-3" />
            <p className="text-text-dark font-medium font-body">No recipes found</p>
            <p className="text-neutral-gray text-sm font-body mt-1">
              Add a recipe to link menu items to their ingredients.
            </p>
          </div>
        }
      />

      {selected && (
        <IngredientsModal recipe={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
