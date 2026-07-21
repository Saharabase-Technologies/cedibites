'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  MapPinIcon,
  ScalesIcon,
  UserIcon,
  WarningIcon,
  WarningCircleIcon,
  CheckCircleIcon,
  ListChecksIcon,
} from '@phosphor-icons/react';
import {
  ReconciliationStatusBadge,
  PrimaryButton,
  InventoryModal,
  Textarea,
  TextInput,
  FormField,
} from '../../_components';
import {
  useReconciliation,
  useSaveReconciliation,
  usePostReconciliation,
} from '@/lib/api/hooks/inventory/useReconciliations';
import { useReconciliationRealtime } from '@/lib/api/hooks/inventory/useReconciliationRealtime';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import type {
  InventoryReconciliationCycle,
  InventoryReconciliationLine,
} from '@/types/inventory';
import { formatDateTime, formatGHS, formatVariance } from '../utils';
import { getErrorMessage } from '@/lib/utils/error-handler';
import { toast } from '@/lib/utils/toast';

export function ReconciliationDetailPage({ id }: { id: number }) {
  const { data: cycle, isLoading, error } = useReconciliation(id);
  const { can } = useStaffAuth();
  const save = useSaveReconciliation(id);
  useReconciliationRealtime();

  const [counts, setCounts] = useState<Record<number, string>>({});
  const [hydrated, setHydrated] = useState(false);
  const [postOpen, setPostOpen] = useState(false);

  useEffect(() => {
    if (!cycle || hydrated) return;
    const initial: Record<number, string> = {};
    for (const line of cycle.lines) {
      if (line.counted_qty !== null) initial[line.id] = String(line.counted_qty);
    }
    setCounts(initial);
    setHydrated(true);
  }, [cycle, hydrated]);

  const isOpen = !!cycle && cycle.status === 'open';
  const canCount = isOpen && can('inventory.reconciliation.open_cycle');
  const canPost = isOpen && can('inventory.reconciliation.adjust');

  const enteredLines = useMemo(
    () =>
      cycle
        ? cycle.lines
            .filter((l) => counts[l.id] !== undefined && counts[l.id] !== '')
            .map((l) => ({ line_id: l.id, counted_qty: Number(counts[l.id]) }))
        : [],
    [cycle, counts],
  );
  const allCounted = !!cycle && enteredLines.length === cycle.lines.length;

  if (isLoading) return <DetailSkeleton />;
  if (error || !cycle) return <DetailMissing />;

  const setCount = (lineId: number, value: string) =>
    setCounts((prev) => ({ ...prev, [lineId]: value }));
  const matchAllToSystem = () =>
    setCounts(Object.fromEntries(cycle.lines.map((l) => [l.id, String(l.system_qty)])));

  const saveProgress = async () => {
    if (enteredLines.some((l) => Number.isNaN(l.counted_qty) || l.counted_qty < 0)) {
      toast.error('Counted quantities must be zero or more.');
      return;
    }
    try {
      await save.mutateAsync({ lines: enteredLines });
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <Link
        href="/inventory/reconciliation"
        className="inline-flex items-center gap-1.5 text-neutral-gray hover:text-text-dark transition-colors text-sm font-body mb-4"
      >
        <ArrowLeftIcon size={14} weight="bold" />
        All cycles
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold font-brand text-text-dark">
              {cycle.location?.name ?? 'Reconciliation'}
            </h1>
            <ReconciliationStatusBadge status={cycle.status} />
          </div>
          <p className="text-neutral-gray text-sm font-body mt-1">
            Opened {formatDateTime(cycle.opened_at)}
            {cycle.opened_by ? <> by {cycle.opened_by}</> : null}
          </p>
        </div>

        {isOpen && (
          <div className="flex items-center gap-2 flex-wrap">
            {canCount && (
              <>
                <button
                  type="button"
                  onClick={matchAllToSystem}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold font-body min-h-11 bg-neutral-light text-text-dark hover:bg-neutral-light/70 border border-[#f0e8d8] cursor-pointer"
                >
                  <ListChecksIcon size={14} weight="bold" />
                  Match all to system
                </button>
                <button
                  type="button"
                  onClick={saveProgress}
                  disabled={save.isPending || enteredLines.length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold font-body min-h-11 bg-neutral-light text-text-dark hover:bg-neutral-light/70 border border-[#f0e8d8] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save progress
                </button>
              </>
            )}
            {canPost && (
              <button
                type="button"
                onClick={() => setPostOpen(true)}
                disabled={!allCounted}
                title={allCounted ? undefined : 'Count every item to post'}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold font-body min-h-11 bg-primary text-white hover:bg-primary/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ScalesIcon size={14} weight="bold" />
                Post &amp; reset
              </button>
            )}
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <MetaCard icon={<MapPinIcon size={16} />} label="Location" value={cycle.location?.name ?? '—'} />
        <MetaCard icon={<ListChecksIcon size={16} />} label="Counted" value={`${cycle.counted_count} / ${cycle.line_count}`} hint={`${cycle.variance_line_count} with variance`} />
        <MetaCard
          icon={<WarningIcon size={16} />}
          label="Over threshold"
          value={cycle.over_threshold_count > 0 ? String(cycle.over_threshold_count) : '—'}
          hint={cycle.threshold_amount ? `> ${formatGHS(cycle.threshold_amount)}` : undefined}
        />
        <MetaCard
          icon={<UserIcon size={16} />}
          label={cycle.closed_by ? 'Posted by' : 'Opened by'}
          value={cycle.closed_by ?? cycle.opened_by ?? '—'}
          hint={cycle.closed_at ? formatDateTime(cycle.closed_at) : undefined}
        />
      </div>

      {/* Closed summary */}
      {cycle.status === 'closed' && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-5 flex items-start gap-3">
          <CheckCircleIcon size={20} weight="fill" className="text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-emerald-900 text-sm font-semibold font-body">Books balanced</p>
            <p className="text-emerald-800/80 text-xs font-body mt-0.5">
              Adjustments were posted to match the counts. Net variance value{' '}
              <span className="font-semibold">{formatGHS(cycle.net_variance_value ?? 0)}</span>. This
              cycle is closed — a new one can be opened when you next count.
            </p>
          </div>
        </div>
      )}

      {/* Count table */}
      <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#f0e8d8]">
          <h2 className="text-sm font-semibold font-body text-text-dark">
            Items <span className="text-neutral-gray font-normal">({cycle.lines.length})</span>
          </h2>
        </div>
        {cycle.lines.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-neutral-gray text-sm font-body">
              This location has no stock on record, so there is nothing to reconcile.
            </p>
          </div>
        ) : (
          <CountTable lines={cycle.lines} editable={canCount} counts={counts} onChange={setCount} />
        )}
      </div>

      <PostDialog
        id={id}
        cycle={cycle}
        counts={counts}
        isOpen={postOpen}
        onClose={() => setPostOpen(false)}
      />
    </div>
  );
}

// ─── Post confirmation ────────────────────────────────────────────────────────

function PostDialog({
  id,
  cycle,
  counts,
  isOpen,
  onClose,
}: {
  id: number;
  cycle: InventoryReconciliationCycle;
  counts: Record<number, string>;
  isOpen: boolean;
  onClose: () => void;
}) {
  const post = usePostReconciliation(id);
  const [notes, setNotes] = useState('');

  // Client-side preview of the adjustment the post will write.
  const preview = useMemo(() => {
    let varianceLines = 0;
    let netValue = 0;
    for (const line of cycle.lines) {
      const raw = counts[line.id];
      const counted = raw === undefined || raw === '' ? line.counted_qty : Number(raw);
      if (counted === null || Number.isNaN(counted)) continue;
      const variance = counted - line.system_qty;
      if (variance !== 0) varianceLines += 1;
      netValue += variance * (line.unit_cost ?? 0);
    }
    return { varianceLines, netValue: Math.round(netValue * 10000) / 10000 };
  }, [cycle.lines, counts]);

  const confirm = async () => {
    try {
      await post.mutateAsync({ notes: notes.trim() || undefined });
      onClose();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <InventoryModal isOpen={isOpen} onClose={onClose} title="Post reconciliation" size="md">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-neutral-gray font-body">
          This writes stock adjustments so the system matches your physical count, then closes the
          cycle. It corrects the ledger and <span className="font-semibold text-text-dark">cannot be undone</span> —
          a new cycle would be needed to change anything.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-neutral-light/60 rounded-xl p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-gray">Items to adjust</p>
            <p className="text-text-dark text-lg font-bold tabular-nums">{preview.varianceLines}</p>
          </div>
          <div className="bg-neutral-light/60 rounded-xl p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-gray">Net variance value</p>
            <p
              className={`text-lg font-bold tabular-nums ${
                preview.netValue === 0 ? 'text-text-dark' : preview.netValue < 0 ? 'text-rose-700' : 'text-amber-700'
              }`}
            >
              {formatGHS(preview.netValue)}
            </p>
          </div>
        </div>

        <FormField label="Notes" htmlFor="rec-post-notes" hint="Optional — record why the count differed.">
          <Textarea
            id="rec-post-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Quarter-end stock-take; spillage on the cold line"
            rows={2}
          />
        </FormField>

        <PrimaryButton type="button" onClick={confirm} loading={post.isPending}>
          Post adjustments &amp; close cycle
        </PrimaryButton>
      </div>
    </InventoryModal>
  );
}

// ─── Count table ──────────────────────────────────────────────────────────────

function CountTable({
  lines,
  editable,
  counts,
  onChange,
}: {
  lines: InventoryReconciliationLine[];
  editable: boolean;
  counts: Record<number, string>;
  onChange: (lineId: number, value: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm font-body">
        <thead>
          <tr className="text-left bg-neutral-light/60 text-[11px] font-semibold uppercase tracking-wider text-neutral-gray">
            <th className="px-5 py-2.5">Item</th>
            <th className="px-5 py-2.5 text-right">System</th>
            <th className="px-5 py-2.5 text-right w-36">Counted</th>
            <th className="px-5 py-2.5 text-right">Variance</th>
            <th className="px-5 py-2.5 text-right">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0e8d8]">
          {lines.map((line) => {
            const unit = line.item?.unit ?? null;
            const liveInput = counts[line.id];
            const counted =
              editable && liveInput !== undefined && liveInput !== ''
                ? Number(liveInput)
                : line.counted_qty;
            const variance =
              counted !== null && counted !== undefined && !Number.isNaN(counted)
                ? Math.round((counted - line.system_qty) * 10000) / 10000
                : null;
            const value = variance !== null ? Math.round(variance * (line.unit_cost ?? 0) * 100) / 100 : null;
            return (
              <tr key={line.id} className="hover:bg-primary/5">
                <td className="px-5 py-3 text-text-dark">
                  <span className="inline-flex items-center gap-1.5">
                    {line.item?.name ?? `#${line.item_id}`}
                    {line.over_threshold && (
                      <WarningIcon size={13} weight="fill" className="text-amber-600" aria-label="Over threshold" />
                    )}
                  </span>
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-neutral-gray">
                  {line.system_qty}
                  {unit ? ` ${unit}` : ''}
                </td>
                <td className="px-5 py-3 text-right">
                  {editable ? (
                    <TextInput
                      type="number"
                      step="0.01"
                      min="0"
                      value={counts[line.id] ?? ''}
                      onChange={(e) => onChange(line.id, e.target.value)}
                      placeholder={String(line.system_qty)}
                      aria-label={`Counted quantity for ${line.item?.name ?? line.item_id}`}
                      className="text-right"
                    />
                  ) : (
                    <span className="tabular-nums text-text-dark">
                      {line.counted_qty !== null ? `${line.counted_qty}${unit ? ` ${unit}` : ''}` : '—'}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {variance === null ? (
                    <span className="text-neutral-gray/50">—</span>
                  ) : variance === 0 ? (
                    <span className="text-emerald-700 font-semibold">0</span>
                  ) : (
                    <span className={variance < 0 ? 'text-rose-700 font-semibold' : 'text-amber-700 font-semibold'}>
                      {formatVariance(variance)}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {value === null || value === 0 ? (
                    <span className="text-neutral-gray/50">—</span>
                  ) : (
                    <span className={value < 0 ? 'text-rose-700' : 'text-amber-700'}>{formatGHS(value)}</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Meta card ────────────────────────────────────────────────────────────────

function MetaCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-4">
      <div className="flex items-center gap-1.5 text-neutral-gray text-[10px] font-semibold uppercase tracking-wider mb-1.5">
        <span className="text-neutral-gray/70">{icon}</span>
        {label}
      </div>
      <p className="text-text-dark text-sm font-semibold font-body truncate">{value}</p>
      {hint && <p className="text-neutral-gray text-[11px] mt-0.5 truncate">{hint}</p>}
    </div>
  );
}

// ─── Loading + missing ────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <div className="h-4 w-32 bg-neutral-light rounded animate-pulse mb-4" />
      <div className="h-8 w-64 bg-neutral-light rounded animate-pulse mb-2" />
      <div className="h-4 w-48 bg-neutral-light rounded animate-pulse mb-6" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-neutral-light rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="h-64 bg-neutral-light rounded-2xl animate-pulse" />
    </div>
  );
}

function DetailMissing() {
  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <Link
        href="/inventory/reconciliation"
        className="inline-flex items-center gap-1.5 text-neutral-gray hover:text-text-dark transition-colors text-sm font-body mb-4"
      >
        <ArrowLeftIcon size={14} weight="bold" />
        All cycles
      </Link>
      <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl py-16 flex flex-col items-center text-center">
        <WarningCircleIcon size={40} weight="thin" className="text-neutral-gray/40 mb-3" />
        <p className="text-text-dark font-medium font-body">Reconciliation not found</p>
        <p className="text-neutral-gray text-sm font-body mt-1 max-w-sm">
          It may have been deleted or you may not have permission to view it.
        </p>
      </div>
    </div>
  );
}
