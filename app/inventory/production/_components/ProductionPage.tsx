'use client';

import { useEffect, useMemo, useState } from 'react';
import { CookingPotIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react';
import {
  InventoryModal,
  FilterBar,
  FormField,
  TextInput,
  Textarea,
  Select,
  PrimaryButton,
  DataTable,
  type DataTableColumn,
} from '../../_components';
import { useInventoryItems } from '@/lib/api/hooks/inventory/useInventoryCatalog';
import { useInventoryLocations } from '@/lib/api/hooks/inventory/useInventoryLocations';
import { useProductionRuns, useRecordProductionRun } from '@/lib/api/hooks/inventory/useProductionRuns';
import { formatGHS } from '@/lib/utils/currency';
import { getErrorMessage } from '@/lib/utils/error-handler';
import type { ProductionLog } from '@/types/inventory';

function fmtQty(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Record production form ─────────────────────────────────────────────────────

interface InputLine {
  key: string;
  item_id: string;
  quantity: string;
}

let lineSeq = 0;
function emptyLine(): InputLine {
  lineSeq += 1;
  return { key: `pin-${lineSeq}`, item_id: '', quantity: '' };
}

function RecordProductionForm({ onClose }: { onClose: () => void }) {
  const { data: items = [] } = useInventoryItems({ is_active: true });
  const { data: warehouses = [] } = useInventoryLocations({ type: 'warehouse', is_active: true });
  const record = useRecordProductionRun();

  const [locationId, setLocationId] = useState('');
  const [outputId, setOutputId] = useState('');
  const [outputQty, setOutputQty] = useState('');
  const [expiry, setExpiry] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<InputLine[]>(() => [emptyLine()]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!locationId && warehouses.length) setLocationId(String(warehouses[0].id));
  }, [warehouses, locationId]);

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const outputItem = itemById.get(Number(outputId));
  const outputUnit = outputItem?.base_unit?.symbol ?? '';

  const updateLine = (key: string, patch: Partial<InputLine>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (key: string) =>
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((l) => l.key !== key)));

  const validLines = lines.filter((l) => l.item_id !== '' && Number(l.quantity) > 0);
  const overdrawn = lines.some((l) => {
    const it = itemById.get(Number(l.item_id));
    return it != null && Number(l.quantity) > it.stock_on_hand;
  });

  // Live cost preview from current weighted-avg costs.
  const inputCost = useMemo(
    () =>
      validLines.reduce((sum, l) => {
        const it = itemById.get(Number(l.item_id));
        return sum + (it ? Number(l.quantity) * it.weighted_avg_cost : 0);
      }, 0),
    [validLines, itemById],
  );
  const unitCost = Number(outputQty) > 0 ? inputCost / Number(outputQty) : 0;

  const canSubmit =
    locationId !== '' && outputId !== '' && Number(outputQty) > 0 && validLines.length > 0 && !overdrawn;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!canSubmit) return;
    try {
      await record.mutateAsync({
        location_id: Number(locationId),
        output_item_id: Number(outputId),
        output_qty: Number(outputQty),
        expiry_date: outputItem?.expiry_tracked && expiry ? expiry : undefined,
        notes: notes.trim() || undefined,
        occurred_at: `${date}T${new Date().toTimeString().slice(0, 8)}`,
        inputs: validLines.map((l) => ({ item_id: Number(l.item_id), quantity: Number(l.quantity) })),
      });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="text-sm font-body text-neutral-gray">
        Record a batch the mother kitchen prepared: pick the item produced + how much, then the raw
        items consumed. The output is added to stock, costed by the inputs.
      </p>

      {/* Output */}
      <div className="grid sm:grid-cols-2 gap-4">
        <FormField label="Produced item" htmlFor="prod-output" required>
          <Select id="prod-output" value={outputId} onChange={(e) => setOutputId(e.target.value)} required>
            <option value="">Select item…</option>
            {items.map((it) => (
              <option key={it.id} value={it.id}>{it.name} ({it.base_unit?.symbol ?? ''})</option>
            ))}
          </Select>
        </FormField>
        <FormField label={`Quantity produced${outputUnit ? ` (${outputUnit})` : ''}`} htmlFor="prod-qty" required>
          <TextInput id="prod-qty" type="number" min="0" step="0.01" value={outputQty} onChange={(e) => setOutputQty(e.target.value)} placeholder="0" required />
        </FormField>
        <FormField label="From location" htmlFor="prod-loc" required>
          <Select id="prod-loc" value={locationId} onChange={(e) => setLocationId(e.target.value)} required>
            <option value="">Select…</option>
            {warehouses.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
          </Select>
        </FormField>
        <FormField label="Date" htmlFor="prod-date" required>
          <TextInput id="prod-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </FormField>
        {outputItem?.expiry_tracked && (
          <FormField label="Output expiry date" htmlFor="prod-expiry" hint="Tracked item - sets the produced batch's expiry.">
            <TextInput id="prod-expiry" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          </FormField>
        )}
      </div>

      {/* Inputs */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold font-body text-text-dark">Inputs consumed</span>
          <button type="button" onClick={addLine} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-body bg-neutral-light text-text-dark hover:bg-neutral-light/70 border border-[#f0e8d8] cursor-pointer">
            <PlusIcon size={12} weight="bold" />
            Add input
          </button>
        </div>
        {lines.map((line) => {
          const it = itemById.get(Number(line.item_id));
          const unit = it?.base_unit?.symbol ?? '';
          const over = it != null && Number(line.quantity) > it.stock_on_hand;
          return (
            <div key={line.key} className="grid grid-cols-[1fr_8rem_auto] gap-2 items-start">
              <Select value={line.item_id} onChange={(e) => updateLine(line.key, { item_id: e.target.value })} required>
                <option value="">Select item…</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>{i.name} ({fmtQty(i.stock_on_hand)} {i.base_unit?.symbol ?? ''})</option>
                ))}
              </Select>
              <div>
                <TextInput type="number" min="0" step="0.0001" value={line.quantity} onChange={(e) => updateLine(line.key, { quantity: e.target.value })} placeholder={`Qty ${unit}`.trim()} required />
                {over && <p className="text-[11px] text-rose-600 mt-1">Only {fmtQty(it!.stock_on_hand)} {unit} on hand</p>}
              </div>
              <button type="button" onClick={() => removeLine(line.key)} disabled={lines.length === 1} className="self-start p-2.5 rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer" aria-label="Remove input">
                <TrashIcon size={16} weight="bold" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Cost preview */}
      <div className="flex items-center justify-between bg-neutral-light/50 border border-[#f0e8d8] rounded-xl px-4 py-2.5 text-sm font-body">
        <span className="text-neutral-gray">Input cost <span className="text-text-dark font-semibold">{formatGHS(inputCost)}</span></span>
        <span className="text-neutral-gray">Output cost/unit{' '}
          <span className="text-text-dark font-semibold tabular-nums">{Number(outputQty) > 0 ? formatGHS(unitCost) : '-'}</span>
        </span>
      </div>

      <FormField label="Notes" htmlFor="prod-notes">
        <Textarea id="prod-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional batch notes" rows={2} />
      </FormField>

      {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{error}</p>}

      <PrimaryButton type="submit" loading={record.isPending} disabled={!canSubmit}>Record production</PrimaryButton>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductionPage() {
  const [open, setOpen] = useState(false);
  const { data: logs = [], isLoading } = useProductionRuns();

  const columns: DataTableColumn<ProductionLog>[] = [
    {
      key: 'reference',
      header: 'Reference',
      sortValue: (l) => l.reference,
      cell: (l) => <span className="font-mono text-xs">{l.reference}</span>,
    },
    {
      key: 'output',
      header: 'Produced',
      sortValue: (l) => l.output_item?.name ?? '',
      cell: (l) => <span className="font-medium">{l.output_item?.name ?? '-'}</span>,
    },
    {
      key: 'qty',
      header: 'Qty',
      align: 'right' as const,
      sortValue: (l) => l.output_qty,
      cell: (l) => <span className="tabular-nums">{fmtQty(l.output_qty)} {l.output_item?.unit ?? ''}</span>,
    },
    {
      key: 'cost',
      header: 'Cost/unit',
      align: 'right' as const,
      hideBelow: 'sm' as const,
      sortValue: (l) => l.output_unit_cost,
      cell: (l) => <span className="tabular-nums">{formatGHS(l.output_unit_cost)}</span>,
    },
    {
      key: 'inputs',
      header: 'Inputs',
      align: 'right' as const,
      hideBelow: 'md' as const,
      sortValue: (l) => l.inputs.length,
      cell: (l) => <span className="tabular-nums">{l.inputs.length}</span>,
    },
    {
      key: 'by',
      header: 'By',
      hideBelow: 'lg' as const,
      sortValue: (l) => l.produced_by?.name ?? '',
      cell: (l) => <span className="text-neutral-gray">{l.produced_by?.name ?? '-'}</span>,
    },
    {
      key: 'when',
      header: 'When',
      hideBelow: 'md' as const,
      sortValue: (l) => l.produced_at ?? '',
      cell: (l) => <span className="text-neutral-gray whitespace-nowrap">{fmtDateTime(l.produced_at)}</span>,
    },
  ];

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <FilterBar>
        <p className="text-sm font-body text-neutral-gray flex-1 min-w-0">
          Mother-kitchen batch prep - consume raw items, produce prepared stock.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-semibold font-body hover:bg-primary/90 transition-colors min-h-11 cursor-pointer shadow-sm shrink-0"
        >
          <PlusIcon size={16} weight="bold" />
          Record production
        </button>
      </FilterBar>

      <DataTable<ProductionLog>
        data={logs}
        columns={columns}
        rowKey={(l) => l.id}
        defaultSortKey="when"
        defaultSortDir="desc"
        isLoading={isLoading}
        pageSize={10}
        emptyState={
          <div className="py-16 flex flex-col items-center text-center">
            <CookingPotIcon size={40} weight="thin" className="text-neutral-gray/40 mb-3" />
            <p className="text-text-dark font-medium font-body">No production recorded</p>
            <p className="text-neutral-gray text-sm font-body mt-1 max-w-xs">
              Record a batch to turn raw materials into prepared stock.
            </p>
          </div>
        }
      />

      <InventoryModal isOpen={open} onClose={() => setOpen(false)} title="Record production" size="lg">
        <RecordProductionForm onClose={() => setOpen(false)} />
      </InventoryModal>
    </div>
  );
}
