'use client';

import { useState } from 'react';
import { PackageIcon, PlusIcon } from '@phosphor-icons/react';
import {
  InventoryModal,
  FormField,
  TextInput,
  Textarea,
  Select,
  Toggle,
  PrimaryButton,
  SearchBar,
  FilterBar,
  FilterSelect,
  DataTable,
  type DataTableColumn,
} from '../../../_components';
import {
  useInventoryItems,
  useInventoryCategories,
  useInventoryUnits,
  useInventorySuppliers,
  useCreateInventoryItem,
} from '@/lib/api/hooks/inventory/useInventoryCatalog';
import type { InventoryItem, StorageType } from '@/types/inventory';

// ─── Add Item form ────────────────────────────────────────────────────────────

function AddItemForm({ onClose }: { onClose: () => void }) {
  const [name,           setName]           = useState('');
  const [description,    setDescription]    = useState('');
  const [categoryId,     setCategoryId]     = useState<string>('');
  const [baseUnitId,     setBaseUnitId]     = useState<string>('');
  const [supplierId,     setSupplierId]     = useState<string>('');
  const [storageType,    setStorageType]    = useState<StorageType>('dry');
  const [reorderLevel,   setReorderLevel]   = useState<string>('');
  const [minThreshold,   setMinThreshold]   = useState<string>('');
  const [trackExpiry,    setTrackExpiry]    = useState(false);
  const [isConsumable,   setIsConsumable]   = useState(true);

  const { data: categories = [] } = useInventoryCategories();
  const { data: units      = [] } = useInventoryUnits();
  const { data: suppliers  = [] } = useInventorySuppliers();

  const create = useCreateInventoryItem();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseUnitId) return;
    await create.mutateAsync({
      sku: `ITM-${Date.now().toString().slice(-6)}`,
      name,
      description: description || undefined,
      category_id: categoryId ? Number(categoryId) : undefined,
      base_unit_id: Number(baseUnitId),
      default_supplier_id: supplierId ? Number(supplierId) : undefined,
      storage_type: storageType,
      reorder_level: reorderLevel ? Number(reorderLevel) : undefined,
      min_threshold: minThreshold ? Number(minThreshold) : undefined,
      expiry_tracked: trackExpiry,
      is_consumable: isConsumable,
    });
    onClose();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <FormField label="Name" htmlFor="item-name" required>
        <TextInput
          id="item-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Chicken Thighs (Frozen)"
          required
          autoFocus
        />
      </FormField>

      <FormField label="Description" htmlFor="item-desc">
        <Textarea
          id="item-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional spec, brand, packaging notes…"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Category" htmlFor="item-cat">
          <Select
            id="item-cat"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Base unit" htmlFor="item-unit" required>
          <Select
            id="item-unit"
            value={baseUnitId}
            onChange={(e) => setBaseUnitId(e.target.value)}
            required
          >
            <option value="">Select unit</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.symbol})
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <FormField label="Default supplier" htmlFor="item-sup">
        <Select
          id="item-sup"
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
        >
          <option value="">No default supplier</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
      </FormField>

      <FormField label="Storage type" htmlFor="item-storage" required>
        <Select
          id="item-storage"
          value={storageType}
          onChange={(e) => setStorageType(e.target.value as StorageType)}
        >
          <option value="dry">Dry</option>
          <option value="cold">Cold</option>
          <option value="frozen">Frozen</option>
          <option value="ambient">Ambient</option>
        </Select>
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Reorder level" htmlFor="item-reorder" hint="Trigger to reorder">
          <TextInput
            id="item-reorder"
            type="number"
            min="0"
            step="0.01"
            value={reorderLevel}
            onChange={(e) => setReorderLevel(e.target.value)}
            placeholder="0"
          />
        </FormField>

        <FormField label="Minimum threshold" htmlFor="item-min" hint="Critical low alert">
          <TextInput
            id="item-min"
            type="number"
            min="0"
            step="0.01"
            value={minThreshold}
            onChange={(e) => setMinThreshold(e.target.value)}
            placeholder="0"
          />
        </FormField>
      </div>

      <div className="flex flex-col gap-3 pt-1">
        <Toggle
          checked={isConsumable}
          onChange={setIsConsumable}
          label="Consumable (deducts from stock on order completion)"
        />
        <Toggle
          checked={trackExpiry}
          onChange={setTrackExpiry}
          label="Track expiry / batches (FEFO)"
        />
      </div>

      <PrimaryButton type="submit" loading={create.isPending}>
        Save item
      </PrimaryButton>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InventoryItemsPage() {
  const [isAddOpen,   setIsAddOpen]   = useState(false);
  const [search,      setSearch]      = useState('');
  const [categoryId,  setCategoryId]  = useState('');
  const [storageType, setStorageType] = useState('');
  const [status,      setStatus]      = useState('');

  const { data: items = [], isLoading } = useInventoryItems({
    search:       search || undefined,
    category_id:  categoryId ? Number(categoryId) : undefined,
    storage_type: (storageType as StorageType) || undefined,
    is_active:    status === '' ? undefined : status === 'active',
  });

  const { data: categories = [] } = useInventoryCategories();

  const columns: DataTableColumn<InventoryItem>[] = [
    {
      key: 'name',
      header: 'Item',
      sortValue: (i) => i.name.toLowerCase(),
      cell: (i) => <span className="font-medium">{i.name}</span>,
    },
    {
      key: 'unit',
      header: 'Unit',
      hideBelow: 'sm',
      sortValue: (i) => i.base_unit?.symbol ?? '',
      cell: (i) => i.base_unit?.symbol ?? <span className="text-neutral-gray/60">—</span>,
    },
    {
      key: 'category',
      header: 'Category',
      hideBelow: 'md',
      sortValue: (i) => i.category?.name ?? '',
      cell: (i) => i.category?.name ?? <span className="text-neutral-gray/60">—</span>,
    },
    {
      key: 'supplier',
      header: 'Supplier',
      hideBelow: 'lg',
      sortValue: (i) => i.default_supplier?.name ?? '',
      cell: (i) => i.default_supplier?.name ?? <span className="text-neutral-gray/60">—</span>,
    },
    {
      key: 'storage',
      header: 'Storage',
      hideBelow: 'md',
      sortValue: (i) => i.storage_type,
      cell: (i) => <span className="capitalize">{i.storage_type}</span>,
    },
    {
      key: 'cost',
      header: 'Cost/Unit',
      align: 'right',
      hideBelow: 'lg',
      sortValue: (i) => i.weighted_avg_cost,
      cell: (i) => (
        <span className="tabular-nums">GH₵ {i.weighted_avg_cost.toFixed(2)}</span>
      ),
    },
  ];

  return (
    <>
      <FilterBar>
        <SearchBar value={search} onChange={setSearch} placeholder="Search items…" />
        <FilterSelect
          value={categoryId}
          onChange={setCategoryId}
          placeholder="All Categories"
          options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
        />
        <FilterSelect
          value={storageType}
          onChange={setStorageType}
          placeholder="All Storage"
          options={[
            { value: 'dry',     label: 'Dry'     },
            { value: 'cold',    label: 'Cold'    },
            { value: 'frozen',  label: 'Frozen'  },
            { value: 'ambient', label: 'Ambient' },
          ]}
        />
        <FilterSelect
          value={status}
          onChange={setStatus}
          placeholder="All Status"
          options={[
            { value: 'active',   label: 'Active'   },
            { value: 'inactive', label: 'Inactive' },
          ]}
        />
        <button
          onClick={() => setIsAddOpen(true)}
          className="ml-auto flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold font-body hover:bg-primary/90 transition-colors min-h-11 cursor-pointer shadow-sm"
        >
          <PlusIcon size={16} weight="bold" />
          Add Item
        </button>
      </FilterBar>

      <DataTable<InventoryItem>
        data={items}
        columns={columns}
        rowKey={(i) => i.id}
        defaultSortKey="name"
        isLoading={isLoading}
        pageSize={10}
        emptyState={
          <div className="py-16 flex flex-col items-center text-center">
            <PackageIcon size={40} weight="thin" className="text-neutral-gray/40 mb-3" />
            <p className="text-text-dark font-medium font-body">No items found</p>
            <p className="text-neutral-gray text-sm font-body mt-1 mb-5 max-w-xs">
              Add inventory items to start tracking stock, recipes and transfers.
            </p>
            <button
              onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold font-body hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <PlusIcon size={16} weight="bold" />
              Add first item
            </button>
          </div>
        }
      />

      <InventoryModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Inventory Item"
        size="lg"
      >
        <AddItemForm onClose={() => setIsAddOpen(false)} />
      </InventoryModal>
    </>
  );
}
