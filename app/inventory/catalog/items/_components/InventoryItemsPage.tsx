'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PackageIcon, PlusIcon, TrashIcon, MinusCircleIcon } from '@phosphor-icons/react';
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
  useRecordConsumption,
} from '@/lib/api/hooks/inventory/useInventoryCatalog';
import { useInventoryLocations } from '@/lib/api/hooks/inventory/useInventoryLocations';
import { getErrorMessage } from '@/lib/utils/error-handler';
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
      // SKU is assigned server-side (sequential ITM-000001); never sent from here.
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

// ─── Record consumption (mother kitchen using stock) ──────────────────────────

interface ConsumeLine {
  key: string;
  item_id: string;
  quantity: string;
}

let consumeSeq = 0;
function emptyConsumeLine(): ConsumeLine {
  consumeSeq += 1;
  return { key: `consume-${consumeSeq}`, item_id: '', quantity: '' };
}

function RecordConsumptionForm({ onClose }: { onClose: () => void }) {
  const { data: items = [] } = useInventoryItems({ is_active: true });
  const { data: warehouses = [] } = useInventoryLocations({ type: 'warehouse', is_active: true });
  const record = useRecordConsumption();

  const [locationId, setLocationId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<ConsumeLine[]>(() => [emptyConsumeLine()]);
  const [error, setError] = useState('');

  // Default to the (usually single) mother-kitchen warehouse.
  useEffect(() => {
    if (!locationId && warehouses.length) setLocationId(String(warehouses[0].id));
  }, [warehouses, locationId]);

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  // You can only consume what's actually in stock — hide zero/negative on-hand items.
  const consumableItems = useMemo(() => items.filter((i) => i.stock_on_hand > 0), [items]);

  const updateLine = (key: string, patch: Partial<ConsumeLine>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, emptyConsumeLine()]);
  const removeLine = (key: string) =>
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((l) => l.key !== key)));

  const validLines = lines.filter((l) => l.item_id !== '' && Number(l.quantity) > 0);
  const overdrawn = lines.some((l) => {
    const item = itemById.get(Number(l.item_id));
    return item != null && Number(l.quantity) > item.stock_on_hand;
  });
  const canSubmit = locationId !== '' && validLines.length > 0 && !overdrawn;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!canSubmit) return;
    try {
      // Stamp with the current time-of-day so an entry recorded today sorts
      // after earlier same-day movements (a bare date = midnight would sort first
      // and break the running balance).
      const occurredAt = `${date}T${new Date().toTimeString().slice(0, 8)}`;
      await record.mutateAsync({
        location_id: Number(locationId),
        occurred_at: occurredAt,
        items: validLines.map((l) => ({ item_id: Number(l.item_id), quantity: Number(l.quantity) })),
      });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="text-sm font-body text-neutral-gray">
        Record raw materials used by the mother kitchen. This lowers on-hand stock and shows in each
        item&apos;s supply history.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="From location" htmlFor="consume-loc" required>
          <Select id="consume-loc" value={locationId} onChange={(e) => setLocationId(e.target.value)} required>
            <option value="">Select location</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="Date used" htmlFor="consume-date" required>
          <TextInput
            id="consume-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </FormField>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold font-body text-text-dark">Items used</span>
          <button
            type="button"
            onClick={addLine}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-body bg-neutral-light text-text-dark hover:bg-neutral-light/70 border border-[#f0e8d8] cursor-pointer"
          >
            <PlusIcon size={12} weight="bold" />
            Add line
          </button>
        </div>

        {lines.map((line) => {
          const item = itemById.get(Number(line.item_id));
          const unit = item?.base_unit?.symbol ?? '';
          const over = item != null && Number(line.quantity) > item.stock_on_hand;
          return (
            <div key={line.key} className="grid grid-cols-[1fr_7rem_auto] gap-2 items-start">
              <Select
                value={line.item_id}
                onChange={(e) => updateLine(line.key, { item_id: e.target.value })}
                required
              >
                <option value="">
                  {consumableItems.length ? 'Select item' : 'No items in stock'}
                </option>
                {consumableItems.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name} ({fmtQtyShort(it.stock_on_hand)} {it.base_unit?.symbol ?? ''})
                  </option>
                ))}
              </Select>
              <div>
                <TextInput
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.quantity}
                  onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                  placeholder={`Qty ${unit}`.trim()}
                  required
                />
                {over && (
                  <p className="text-[11px] text-rose-600 mt-1">
                    Only {fmtQtyShort(item!.stock_on_hand)} {unit} on hand
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeLine(line.key)}
                disabled={lines.length === 1}
                className="self-start p-2.5 rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                aria-label="Remove line"
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

      <PrimaryButton type="submit" loading={record.isPending} disabled={!canSubmit}>
        Record consumption
      </PrimaryButton>
    </form>
  );
}

function fmtQtyShort(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

// ─── Stock level ────────────────────────────────────────────────────────────────

type StockLevel = 'out' | 'critical' | 'low' | 'ok';

/**
 * Reorder signal from the on-hand quantity against the item's thresholds:
 * out (≤0) → critical (≤ min_threshold) → low (≤ reorder_level) → ok.
 */
function stockLevel(item: InventoryItem): StockLevel {
  const qty = item.stock_on_hand;
  if (qty <= 0) return 'out';
  if (item.min_threshold != null && qty <= item.min_threshold) return 'critical';
  if (item.reorder_level != null && qty <= item.reorder_level) return 'low';
  return 'ok';
}

const STOCK_TAG: Record<Exclude<StockLevel, 'ok'>, { label: string; className: string }> = {
  out:      { label: 'Out',      className: 'bg-rose-100 text-rose-700' },
  critical: { label: 'Critical', className: 'bg-rose-50 text-rose-700' },
  low:      { label: 'Low',      className: 'bg-amber-50 text-amber-700' },
};

function StockCell({ item }: { item: InventoryItem }) {
  const level = stockLevel(item);
  const tag = level === 'ok' ? null : STOCK_TAG[level];
  return (
    <div className="flex items-center justify-end gap-2">
      <span
        className={`tabular-nums ${
          level === 'out' || level === 'critical'
            ? 'text-rose-700 font-semibold'
            : level === 'low'
              ? 'text-amber-700 font-semibold'
              : 'text-text-dark'
        }`}
      >
        {item.stock_on_hand.toLocaleString('en-US', { maximumFractionDigits: 2 })}
        {item.base_unit?.symbol ? ` ${item.base_unit.symbol}` : ''}
      </span>
      {tag && (
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${tag.className}`}>
          {tag.label}
        </span>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InventoryItemsPage() {
  const router = useRouter();
  const [isAddOpen,   setIsAddOpen]   = useState(false);
  const [isUseOpen,   setIsUseOpen]   = useState(false);
  const [search,      setSearch]      = useState('');
  const [categoryId,  setCategoryId]  = useState('');
  const [storageType, setStorageType] = useState('');
  const [status,      setStatus]      = useState('');
  const [stockFilter, setStockFilter] = useState('');

  const { data: items = [], isLoading } = useInventoryItems({
    search:       search || undefined,
    category_id:  categoryId ? Number(categoryId) : undefined,
    storage_type: (storageType as StorageType) || undefined,
    is_active:    status === '' ? undefined : status === 'active',
  });

  const { data: categories = [] } = useInventoryCategories();

  // Reorder/stock filter is client-side — the catalog endpoint returns the full set.
  const visibleItems = useMemo(() => {
    if (!stockFilter) return items;
    return items.filter((i) => {
      const level = stockLevel(i);
      if (stockFilter === 'reorder') return level !== 'ok';
      if (stockFilter === 'out')     return level === 'out';
      if (stockFilter === 'in')      return level === 'ok';
      return true;
    });
  }, [items, stockFilter]);

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
      key: 'storage',
      header: 'Storage',
      hideBelow: 'md',
      sortValue: (i) => i.storage_type,
      cell: (i) => <span className="capitalize">{i.storage_type}</span>,
    },
    {
      key: 'stock',
      header: 'On hand',
      align: 'right',
      sortValue: (i) => i.stock_on_hand,
      cell: (i) => <StockCell item={i} />,
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
          value={stockFilter}
          onChange={setStockFilter}
          placeholder="All Stock"
          options={[
            { value: 'reorder', label: 'Needs reorder' },
            { value: 'out',     label: 'Out of stock'  },
            { value: 'in',      label: 'In stock'      },
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
          onClick={() => setIsUseOpen(true)}
          className="ml-auto flex items-center gap-2 bg-neutral-light text-text-dark border border-[#f0e8d8] px-4 py-2.5 rounded-xl text-sm font-semibold font-body hover:bg-neutral-light/70 transition-colors min-h-11 cursor-pointer shadow-sm"
        >
          <MinusCircleIcon size={16} weight="bold" />
          Use stock
        </button>
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold font-body hover:bg-primary/90 transition-colors min-h-11 cursor-pointer shadow-sm"
        >
          <PlusIcon size={16} weight="bold" />
          Add Item
        </button>
      </FilterBar>

      <DataTable<InventoryItem>
        data={visibleItems}
        columns={columns}
        rowKey={(i) => i.id}
        onRowClick={(i) => router.push(`/inventory/catalog/items/${i.id}`)}
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

      <InventoryModal
        isOpen={isUseOpen}
        onClose={() => setIsUseOpen(false)}
        title="Use stock — mother kitchen"
        size="lg"
      >
        <RecordConsumptionForm onClose={() => setIsUseOpen(false)} />
      </InventoryModal>
    </>
  );
}
