'use client';

import { useMemo, useState } from 'react';
import {
  EyeIcon,
  PencilSimpleIcon,
  LockSimpleIcon,
  TrashIcon,
  BowlFoodIcon,
  PlusIcon,
} from '@phosphor-icons/react';
import {
  InventoryModal,
  FilterBar,
  FilterSelect,
  DataTable,
  RowActionsMenu,
  FormField,
  TextInput,
  Select,
  PrimaryButton,
  type DataTableColumn,
} from '../../_components';
import {
  useInventoryRecipes,
  useCreateRecipe,
  useUpdateRecipe,
  useDeleteRecipe,
  useLockRecipe,
} from '@/lib/api/hooks/inventory/useInventoryRecipes';
import { useInventoryItems } from '@/lib/api/hooks/inventory/useInventoryCatalog';
import { useMenu } from '@/lib/api/hooks/useMenu';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { getErrorMessage } from '@/lib/utils/error-handler';
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

function recipeTitle(recipe: InventoryRecipe): string {
  const opt = recipe.menu_item_option;
  if (!opt) return `Recipe #${recipe.id}`;
  // Display name only — avoids the long combo menu-item name.
  return opt.label || opt.menu_item?.name || 'Item';
}

// ─── Recipe editor (create / edit) ──────────────────────────────────────────────

interface EditorLine {
  key: string;
  item_id: string;
  quantity: string;
}

let lineSeq = 0;
function emptyLine(): EditorLine {
  lineSeq += 1;
  return { key: `ing-${lineSeq}`, item_id: '', quantity: '' };
}

function RecipeEditor({
  recipe,
  onClose,
}: {
  recipe: InventoryRecipe | null; // null = create
  onClose: () => void;
}) {
  const editing = recipe !== null;
  const { items: menuItems = [] } = useMenu({ per_page: 500 });
  const { data: invItems = [] } = useInventoryItems({ is_active: true });
  const create = useCreateRecipe();
  const update = useUpdateRecipe(recipe?.id ?? 0);

  const [optionId, setOptionId] = useState(
    recipe ? String(recipe.menu_item_option_id) : '',
  );
  const [yieldQty, setYieldQty] = useState(recipe ? String(recipe.yield_qty) : '1');
  const [lines, setLines] = useState<EditorLine[]>(() =>
    recipe && recipe.ingredients.length
      ? recipe.ingredients.map((ing) => ({
          key: `ing-${ing.id}`,
          item_id: String(ing.item_id),
          quantity: String(ing.quantity),
        }))
      : [emptyLine()],
  );
  const [error, setError] = useState('');

  const itemById = useMemo(() => new Map(invItems.map((i) => [i.id, i])), [invItems]);

  // Group sellable options under their menu item (the recipe granularity),
  // using the option's display name. Mirrors the analytics menu grouping.
  const optionGroups = useMemo(
    () =>
      [...menuItems]
        .map((mi) => ({
          id: mi.id,
          name: mi.name,
          options: (mi.options ?? []).map((op) => ({
            id: op.id,
            label: op.display_name || op.option_label || 'Standard',
          })),
        }))
        .filter((g) => g.options.length > 0)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [menuItems],
  );

  const updateLine = (key: string, patch: Partial<EditorLine>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (key: string) =>
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((l) => l.key !== key)));

  const validLines = lines.filter((l) => l.item_id !== '' && Number(l.quantity) > 0);
  const canSubmit = optionId !== '' && validLines.length > 0 && Number(yieldQty) > 0;
  const submitting = create.isPending || update.isPending;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!canSubmit) return;

    const ingredients = validLines.map((l) => {
      const item = itemById.get(Number(l.item_id));
      return {
        item_id: Number(l.item_id),
        // Ingredients are tracked in the item's base unit (deduction uses base unit).
        unit_id: item?.base_unit?.id ?? 0,
        quantity: Number(l.quantity),
      };
    });

    const payload = {
      menu_item_option_id: Number(optionId),
      yield_qty: Number(yieldQty) || 1,
      ingredients,
    };

    try {
      if (editing) await update.mutateAsync(payload);
      else await create.mutateAsync(payload);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <InventoryModal isOpen title={editing ? 'Edit recipe' : 'New recipe'} onClose={onClose} size="lg">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-sm font-body text-neutral-gray">
          Define the ingredients used per portion of a menu option. Stock is auto-deducted from the
          warehouse when an order for it is paid.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Menu item / option" htmlFor="recipe-option" required>
            <Select
              id="recipe-option"
              value={optionId}
              onChange={(e) => setOptionId(e.target.value)}
              required
              disabled={editing}
            >
              <option value="">Select option…</option>
              {optionGroups.map((g) => (
                <optgroup key={g.id} label={g.name}>
                  {g.options.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </FormField>
          <FormField label="Yield (portions)" htmlFor="recipe-yield" required hint="Ingredient amounts are per this many portions">
            <TextInput
              id="recipe-yield"
              type="number"
              min="0.01"
              step="0.01"
              value={yieldQty}
              onChange={(e) => setYieldQty(e.target.value)}
              required
            />
          </FormField>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold font-body text-text-dark">Ingredients</span>
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-body bg-neutral-light text-text-dark hover:bg-neutral-light/70 border border-[#f0e8d8] cursor-pointer"
            >
              <PlusIcon size={12} weight="bold" />
              Add ingredient
            </button>
          </div>

          {lines.map((line) => {
            const item = itemById.get(Number(line.item_id));
            const unit = item?.base_unit?.symbol ?? '';
            return (
              <div key={line.key} className="grid grid-cols-[1fr_8rem_auto] gap-2 items-start">
                <Select
                  value={line.item_id}
                  onChange={(e) => updateLine(line.key, { item_id: e.target.value })}
                  required
                >
                  <option value="">Select item…</option>
                  {invItems.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name} ({it.base_unit?.symbol ?? ''})
                    </option>
                  ))}
                </Select>
                <TextInput
                  type="number"
                  min="0"
                  step="0.0001"
                  value={line.quantity}
                  onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                  placeholder={`Qty ${unit}`.trim()}
                  required
                />
                <button
                  type="button"
                  onClick={() => removeLine(line.key)}
                  disabled={lines.length === 1}
                  className="self-start p-2.5 rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  aria-label="Remove ingredient"
                >
                  <TrashIcon size={16} weight="bold" />
                </button>
              </div>
            );
          })}
        </div>

        {error && (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{error}</p>
        )}

        <PrimaryButton type="submit" loading={submitting} disabled={!canSubmit}>
          {editing ? 'Save recipe' : 'Create recipe'}
        </PrimaryButton>
      </form>
    </InventoryModal>
  );
}

// ─── Ingredients view modal ─────────────────────────────────────────────────────

function IngredientsModal({ recipe, onClose }: { recipe: InventoryRecipe; onClose: () => void }) {
  return (
    <InventoryModal isOpen title={`Ingredients — ${recipeTitle(recipe)}`} onClose={onClose}>
      <div className="space-y-2">
        <p className="text-xs text-neutral-500 mb-3">
          Version {recipe.version} · {STATUS_LABELS[recipe.status]} · yields {recipe.yield_qty}
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
  const [viewing, setViewing] = useState<InventoryRecipe | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryRecipe | null>(null);

  const { data: recipes = [], isLoading } = useInventoryRecipes();
  const lock = useLockRecipe();
  const remove = useDeleteRecipe();

  // Recipe authoring/locking is Admin-only — everyone else (e.g. Warehouse
  // Manager) gets a read-only view. Mirrors the backend route middleware so the
  // page never shows an action the API would reject.
  const { can } = useStaffAuth();
  const canEdit = can('inventory.recipe.edit_global');
  const canLock = can('inventory.recipe.lock');

  const filtered = statusFilter ? recipes.filter((r) => r.status === statusFilter) : recipes;

  const openCreate = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (r: InventoryRecipe) => { setEditing(r); setEditorOpen(true); };

  const columns: DataTableColumn<InventoryRecipe>[] = [
    {
      key: 'menu_item',
      header: 'Menu item / option',
      sortValue: (r) => recipeTitle(r).toLowerCase(),
      cell: (r) => <span className="font-medium">{recipeTitle(r)}</span>,
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
      align: 'right' as const,
      sortValue: (r) => r.ingredients.length,
      cell: (r) => <span className="tabular-nums">{r.ingredients.length}</span>,
    },
    {
      key: 'version',
      header: 'Version',
      hideBelow: 'md' as const,
      sortValue: (r) => r.version,
      cell: (r) => <span className="text-neutral-gray font-mono text-[11px]">v{r.version}</span>,
    },
    {
      key: 'locked_by',
      header: 'Locked by',
      hideBelow: 'lg' as const,
      sortValue: (r) => r.locked_by?.name ?? '',
      cell: (r) =>
        r.locked_by ? <span className="text-sm">{r.locked_by.name}</span> : <span className="text-neutral-gray/60">—</span>,
    },
    {
      key: 'actions',
      header: '',
      width: 'w-10',
      align: 'right' as const,
      cell: (r) => (
        <RowActionsMenu
          actions={[
            { label: 'View ingredients', icon: <EyeIcon size={14} weight="bold" />, onClick: () => setViewing(r) },
            ...(canEdit
              ? [{ label: 'Edit', icon: <PencilSimpleIcon size={14} weight="bold" />, onClick: () => openEdit(r) }]
              : []),
            ...(canLock && r.status !== 'locked'
              ? [{
                  label: 'Lock',
                  icon: <LockSimpleIcon size={14} weight="bold" />,
                  onClick: () => { void lock.mutate(r.id); },
                }]
              : []),
            ...(canEdit
              ? [{
                  label: 'Delete',
                  icon: <TrashIcon size={14} weight="bold" />,
                  destructive: true,
                  onClick: () => {
                    if (confirm(`Delete recipe for ${recipeTitle(r)}?`)) void remove.mutate(r.id);
                  },
                }]
              : []),
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <FilterBar>
        <p className="text-sm font-body text-neutral-gray flex-1 min-w-0">
          Ingredient bills of materials per menu option. Drives auto-deduction on paid orders.
        </p>
        <FilterSelect
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="All statuses"
          options={[
            { value: 'draft', label: 'Draft' },
            { value: 'observation', label: 'Observation' },
            { value: 'locked', label: 'Locked' },
          ]}
        />
        {canEdit && (
          <button
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold font-body hover:bg-primary/90 transition-colors min-h-11 cursor-pointer shadow-sm shrink-0"
            onClick={openCreate}
          >
            <PlusIcon size={16} weight="bold" />
            Add Recipe
          </button>
        )}
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
              Add a recipe to link a menu option to its ingredients.
            </p>
          </div>
        }
      />

      {viewing && <IngredientsModal recipe={viewing} onClose={() => setViewing(null)} />}
      {editorOpen && (
        <RecipeEditor recipe={editing} onClose={() => { setEditorOpen(false); setEditing(null); }} />
      )}
    </>
  );
}
