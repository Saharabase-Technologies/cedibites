'use client';

import { useMemo, useState } from 'react';
import {
  FoldersIcon,
  PlusIcon,
  PencilSimpleIcon,
  TrashIcon,
  CaretRightIcon,
} from '@phosphor-icons/react';
import {
  InventoryModal,
  FormField,
  TextInput,
  Select,
  PrimaryButton,
  DataTable,
  RowActionButton,
  type DataTableColumn,
} from '../../../_components';
import {
  useInventoryCategories,
  useCreateInventoryCategory,
} from '@/lib/api/hooks/inventory/useInventoryCatalog';
import type { InventoryCategory } from '@/types/inventory';

// ─── Add category form ────────────────────────────────────────────────────────

function AddCategoryForm({
  parents,
  onClose,
}: {
  parents: InventoryCategory[];
  onClose: () => void;
}) {
  const [name,     setName]     = useState('');
  const [parentId, setParentId] = useState<string>('');

  const create = useCreateInventoryCategory();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await create.mutateAsync({
      name,
      parent_id: parentId ? Number(parentId) : undefined,
    });
    onClose();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <FormField label="Category name" htmlFor="cat-name" required>
        <TextInput
          id="cat-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Proteins, Drinks, Packaging"
          required
          autoFocus
        />
      </FormField>

      <FormField
        label="Parent category"
        htmlFor="cat-parent"
        hint="Optional — leave blank for top-level"
      >
        <Select
          id="cat-parent"
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
        >
          <option value="">No parent (top-level)</option>
          {parents
            .filter((c) => c.parent_id === null)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </Select>
      </FormField>

      <PrimaryButton type="submit" loading={create.isPending}>
        Save category
      </PrimaryButton>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type CategoryRow = InventoryCategory & {
  depth: number;
  childrenCount: number;
};

export function CatalogCategoriesPage() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { data: categories = [], isLoading } = useInventoryCategories();

  // Flatten into a parent-first list with depth so child rows render indented.
  const rows = useMemo<CategoryRow[]>(() => {
    const childrenOf = (id: number | null) =>
      categories.filter((c) => c.parent_id === id);
    const result: CategoryRow[] = [];
    childrenOf(null).forEach((parent) => {
      const kids = childrenOf(parent.id);
      result.push({ ...parent, depth: 0, childrenCount: kids.length });
      kids.forEach((child) => {
        result.push({ ...child, depth: 1, childrenCount: 0 });
      });
    });
    return result;
  }, [categories]);

  const columns: DataTableColumn<CategoryRow>[] = [
    {
      key: 'name',
      header: 'Name',
      sortValue: (r) => `${r.depth}-${r.name.toLowerCase()}`,
      cell: (r) =>
        r.depth === 0 ? (
          <span className="font-medium text-text-dark">{r.name}</span>
        ) : (
          <span className="inline-flex items-center gap-1.5 pl-5 text-neutral-gray">
            <CaretRightIcon size={10} className="text-neutral-gray/60" />
            {r.name}
          </span>
        ),
    },
    {
      key: 'type',
      header: 'Type',
      hideBelow: 'sm',
      sortValue: (r) => r.depth,
      cell: (r) =>
        r.depth === 0 ? (
          <span className="text-text-dark">Parent</span>
        ) : (
          <span className="text-neutral-gray">Sub-category</span>
        ),
    },
    {
      key: 'sub',
      header: 'Sub-categories',
      hideBelow: 'md',
      align: 'right',
      sortValue: (r) => r.childrenCount,
      cell: (r) =>
        r.depth === 0 ? (
          <span className="tabular-nums">{r.childrenCount}</span>
        ) : (
          <span className="text-neutral-gray/60">—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      width: 'w-24',
      align: 'right',
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <RowActionButton
            icon={<PencilSimpleIcon size={14} weight="bold" />}
            label={`Edit ${r.name}`}
            onClick={() => {
              // TODO: wire up edit modal
              console.info('edit', r);
            }}
          />
          <RowActionButton
            icon={<TrashIcon size={14} weight="bold" />}
            label={`Delete ${r.name}`}
            destructive
            onClick={() => {
              // TODO: wire up delete confirm
              console.info('delete', r);
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-3 mb-5 flex flex-wrap items-center gap-3">
        <p className="text-sm font-body text-neutral-gray flex-1">
          Group inventory items for easier reporting and search.
        </p>
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold font-body hover:bg-primary/90 transition-colors min-h-11 cursor-pointer shadow-sm"
        >
          <PlusIcon size={16} weight="bold" />
          Add Category
        </button>
      </div>

      <DataTable<CategoryRow>
        data={rows}
        columns={columns}
        rowKey={(r) => r.id}
        defaultSortKey="name"
        isLoading={isLoading}
        pageSize={10}
        emptyState={
          <div className="py-16 flex flex-col items-center text-center">
            <FoldersIcon size={40} weight="thin" className="text-neutral-gray/40 mb-3" />
            <p className="text-text-dark font-medium font-body">No categories yet</p>
            <p className="text-neutral-gray text-sm font-body mt-1 mb-5 max-w-xs">
              Categories help group items for reporting and discovery.
            </p>
            <button
              onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold font-body hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <PlusIcon size={16} weight="bold" />
              Add first category
            </button>
          </div>
        }
      />

      <InventoryModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add category"
      >
        <AddCategoryForm
          parents={categories}
          onClose={() => setIsAddOpen(false)}
        />
      </InventoryModal>
    </>
  );
}
