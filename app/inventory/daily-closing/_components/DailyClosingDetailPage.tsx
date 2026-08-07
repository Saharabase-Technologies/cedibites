'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  MapPinIcon,
  CalendarBlankIcon,
  ClipboardTextIcon,
  EyeSlashIcon,
  UserIcon,
  WarningCircleIcon,
  CheckCircleIcon,
  ListChecksIcon,
} from '@phosphor-icons/react';
import {
  DailyClosingStatusBadge,
  PrimaryButton,
  Select,
  TextInput,
} from '../../_components';
import {
  useDailyClosing,
  useSaveDailyClosing,
} from '@/lib/api/hooks/inventory/useDailyClosings';
import { useWastageReasons } from '@/lib/api/hooks/inventory/useWastages';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import type {
  InventoryDailyClosingLine,
  SaveDailyClosingPayload,
  WastageReasonOption,
} from '@/types/inventory';
import { formatBusinessDate, formatDateTime, formatVariance } from '../utils';
import { getErrorMessage } from '@/lib/utils/error-handler';
import { toast } from '@/lib/utils/toast';

export function DailyClosingDetailPage({ id }: { id: number }) {
  const { data: closing, isLoading, error } = useDailyClosing(id);
  const { can } = useStaffAuth();
  const save = useSaveDailyClosing(id);
  const { data: reasonCatalog } = useWastageReasons();

  const [counts, setCounts] = useState<Record<number, string>>({});
  const [reasons, setReasons] = useState<Record<number, { reason: string; note: string }>>({});
  const [hydrated, setHydrated] = useState(false);

  // Hydrate inputs from any previously-saved counts once.
  useEffect(() => {
    if (!closing || hydrated) return;
    const initialCounts: Record<number, string> = {};
    const initialReasons: Record<number, { reason: string; note: string }> = {};
    for (const line of closing.lines) {
      if (line.counted_qty !== null) initialCounts[line.id] = String(line.counted_qty);
      if (line.reason) initialReasons[line.id] = { reason: line.reason, note: line.reason_note ?? '' };
    }
    setCounts(initialCounts);
    setReasons(initialReasons);
    setHydrated(true);
  }, [closing, hydrated]);

  const editable = !!closing && closing.status === 'open' && can('inventory.daily_closing.enter');

  const enteredLines = useMemo(
    () =>
      closing
        ? closing.lines
            .filter((l) => counts[l.id] !== undefined && counts[l.id] !== '')
            .map((l) => ({
              line_id: l.id,
              counted_qty: Number(counts[l.id]),
              reason: (reasons[l.id]?.reason || null) as SaveDailyClosingPayload['lines'][number]['reason'],
              reason_note: reasons[l.id]?.note?.trim() || null,
            }))
        : [],
    [closing, counts, reasons],
  );

  const allCounted = !!closing && enteredLines.length === closing.lines.length;

  if (isLoading) return <DetailSkeleton />;
  if (error || !closing) return <DetailMissing />;

  const setCount = (lineId: number, value: string) =>
    setCounts((prev) => ({ ...prev, [lineId]: value }));

  const setReason = (lineId: number, patch: Partial<{ reason: string; note: string }>) =>
    setReasons((prev) => {
      const current = prev[lineId] ?? { reason: '', note: '' };
      return { ...prev, [lineId]: { ...current, ...patch } };
    });

  const persist = async (complete: boolean) => {
    if (enteredLines.some((l) => Number.isNaN(l.counted_qty) || l.counted_qty < 0)) {
      toast.error('Counted quantities must be zero or more.');
      return;
    }
    if (complete && !allCounted) {
      toast.error('Count every item before completing, or use "Save progress".');
      return;
    }
    const missingNote = enteredLines.find((l) => l.reason === 'other' && !l.reason_note);
    if (missingNote) {
      toast.error('Choosing “Other” means saying what happened - add a note.');
      return;
    }
    try {
      await save.mutateAsync({ lines: enteredLines, complete });
      if (complete) toast.success('Day closed. The books now read exactly what you counted.');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-6xl mx-auto w-full">
      <Link
        href="/inventory/daily-closing"
        className="inline-flex items-center gap-1.5 text-neutral-gray hover:text-text-dark transition-colors text-sm font-body mb-4"
      >
        <ArrowLeftIcon size={14} weight="bold" />
        All closings
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold font-brand text-text-dark">
              {formatBusinessDate(closing.business_date)}
            </h1>
            <DailyClosingStatusBadge status={closing.status} />
          </div>
          <p className="text-neutral-gray text-sm font-body mt-1">
            {closing.location?.name ?? '-'}
          </p>
        </div>

        {editable && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* "Match all to expected" used to live here. It was one click to a
                perfect count, which is the exact opposite of what a stock count
                is for - and it needed the expected figures on screen to work.
                Both are gone; the count is blind now. */}
            <button
              type="button"
              onClick={() => persist(false)}
              disabled={save.isPending || enteredLines.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold font-body min-h-11 bg-neutral-light text-text-dark hover:bg-neutral-light/70 border border-[#f0e8d8] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save progress
            </button>
            <button
              type="button"
              onClick={() => persist(true)}
              disabled={save.isPending || !allCounted}
              title={allCounted ? undefined : 'Count every item to complete'}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold font-body min-h-11 bg-primary text-white hover:bg-primary/90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircleIcon size={14} weight="bold" />
              {save.isPending ? 'Saving…' : 'Complete count'}
            </button>
          </div>
        )}
      </div>

      {/* Blind-count notice. The counter needs to know the missing "Expected"
          column is deliberate, or they will report it as a bug. */}
      {closing.blind && (
        <div className="flex items-start gap-2.5 bg-sky-50 border border-sky-200 rounded-2xl px-4 py-3 mb-5">
          <EyeSlashIcon size={18} weight="fill" className="text-sky-600 shrink-0 mt-0.5" />
          <p className="text-sky-800 text-sm font-body">
            <span className="font-semibold">Count what is actually there.</span> The expected
            figures are hidden until you finish, so what you write down is what is on the shelf.
            Completing the count sets the books to your numbers - tomorrow opens exactly where
            tonight closes.
          </p>
        </div>
      )}

      {!closing.blind && closing.wastage && (
        <div className="flex items-start gap-2.5 bg-neutral-light border border-[#f0e8d8] rounded-2xl px-4 py-3 mb-5">
          <ClipboardTextIcon size={18} weight="bold" className="text-neutral-gray shrink-0 mt-0.5" />
          <p className="text-neutral-gray text-sm font-body">
            The explained shortfalls were filed as{' '}
            <Link
              href={`/inventory/wastage/${closing.wastage.id}`}
              className="font-semibold text-primary hover:text-primary/80"
            >
              {closing.wastage.reference}
            </Link>
            . It records why - the stock itself was already corrected by this count.
          </p>
        </div>
      )}

      {/* Meta */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <MetaCard icon={<MapPinIcon size={16} />} label="Location" value={closing.location?.name ?? '-'} />
        <MetaCard icon={<CalendarBlankIcon size={16} />} label="Business date" value={formatBusinessDate(closing.business_date)} />
        <MetaCard
          icon={<ListChecksIcon size={16} />}
          label="Counted"
          value={`${closing.counted_count} / ${closing.line_count}`}
          hint={closing.blind ? 'Variances shown once complete' : `${closing.discrepancy_count} discrepancies`}
        />
        <MetaCard
          icon={<UserIcon size={16} />}
          label={closing.completed_by ? 'Completed by' : 'Opened by'}
          value={closing.completed_by ?? closing.opened_by ?? '-'}
          hint={closing.completed_at ? formatDateTime(closing.completed_at) : undefined}
        />
      </div>

      {/* Count table */}
      <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#f0e8d8] flex items-baseline justify-between">
          <h2 className="text-sm font-semibold font-body text-text-dark">
            Items <span className="text-neutral-gray font-normal">({closing.lines.length})</span>
          </h2>
          {!closing.blind && closing.net_variance !== 0 && (
            <p className="text-xs text-neutral-gray">
              Net variance ·{' '}
              <span className={`font-semibold tabular-nums ${closing.net_variance < 0 ? 'text-rose-700' : 'text-amber-700'}`}>
                {formatVariance(closing.net_variance)}
              </span>
            </p>
          )}
        </div>

        {closing.lines.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-neutral-gray text-sm font-body">
              This location has no stock on record, so there is nothing to count.
            </p>
          </div>
        ) : (
          <CountTable
            lines={closing.lines}
            blind={closing.blind}
            editable={editable}
            counts={counts}
            reasons={reasons}
            reasonOptions={reasonCatalog?.reasons ?? []}
            onChange={setCount}
            onReasonChange={setReason}
          />
        )}
      </div>
    </div>
  );
}

// ─── Count table ──────────────────────────────────────────────────────────────

function CountTable({
  lines,
  blind,
  editable,
  counts,
  reasons,
  reasonOptions,
  onChange,
  onReasonChange,
}: {
  lines: InventoryDailyClosingLine[];
  blind: boolean;
  editable: boolean;
  counts: Record<number, string>;
  reasons: Record<number, { reason: string; note: string }>;
  reasonOptions: WastageReasonOption[];
  onChange: (lineId: number, value: string) => void;
  onReasonChange: (lineId: number, patch: Partial<{ reason: string; note: string }>) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm font-body">
        <thead>
          <tr className="text-left bg-neutral-light/60 text-[11px] font-semibold uppercase tracking-wider text-neutral-gray">
            <th className="px-5 py-2.5">Item</th>
            {/* No "Expected" column while counting - see the blind-count notice. */}
            {!blind && <th className="px-5 py-2.5 text-right">Expected</th>}
            <th className="px-5 py-2.5 text-right w-40">Counted</th>
            {!blind && <th className="px-5 py-2.5 text-right">Variance</th>}
            <th className="px-5 py-2.5">{blind ? 'If something went wrong' : 'Reason'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0e8d8]">
          {lines.map((line) => {
            const unit = line.item?.unit ?? null;
            const entry = reasons[line.id];
            const needsNote = entry?.reason === 'other';
            // Variance is only meaningful once the expected figure is revealed.
            const variance = blind ? null : line.variance;

            return (
              <tr key={line.id} className="hover:bg-primary/5 align-top">
                <td className="px-5 py-3 text-text-dark">{line.item?.name ?? `#${line.item_id}`}</td>

                {!blind && (
                  <td className="px-5 py-3 text-right tabular-nums text-neutral-gray">
                    {line.expected_qty ?? '-'}
                    {unit ? ` ${unit}` : ''}
                  </td>
                )}

                <td className="px-5 py-3 text-right">
                  {editable ? (
                    <TextInput
                      type="number"
                      step="0.01"
                      min="0"
                      value={counts[line.id] ?? ''}
                      onChange={(e) => onChange(line.id, e.target.value)}
                      placeholder="0"
                      aria-label={`Counted quantity for ${line.item?.name ?? line.item_id}`}
                      className="text-right"
                    />
                  ) : (
                    <span className="tabular-nums text-text-dark">
                      {line.counted_qty !== null ? `${line.counted_qty}${unit ? ` ${unit}` : ''}` : '-'}
                    </span>
                  )}
                </td>

                {!blind && (
                  <td className="px-5 py-3 text-right tabular-nums">
                    {variance === null ? (
                      <span className="text-neutral-gray/50">-</span>
                    ) : variance === 0 ? (
                      <span className="text-emerald-700 font-semibold">0</span>
                    ) : (
                      <span className={variance < 0 ? 'text-rose-700 font-semibold' : 'text-amber-700 font-semibold'}>
                        {formatVariance(variance)}
                        {line.adjusted && (
                          <span className="block text-[10px] font-normal text-neutral-gray">
                            books corrected
                          </span>
                        )}
                      </span>
                    )}
                  </td>
                )}

                <td className="px-5 py-3 min-w-56">
                  {editable ? (
                    <div className="space-y-1.5">
                      <Select
                        value={entry?.reason ?? ''}
                        onChange={(e) => onReasonChange(line.id, { reason: e.target.value })}
                        aria-label={`Reason for ${line.item?.name ?? line.item_id}`}
                      >
                        <option value="">No reason / nothing wrong</option>
                        {reasonOptions.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </Select>
                      {needsNote && (
                        <TextInput
                          value={entry?.note ?? ''}
                          onChange={(e) => onReasonChange(line.id, { note: e.target.value })}
                          placeholder="Say what happened"
                          aria-label={`Note for ${line.item?.name ?? line.item_id}`}
                        />
                      )}
                    </div>
                  ) : line.reason ? (
                    <div>
                      <span className="text-text-dark">{line.reason_label}</span>
                      {line.reason_note && (
                        <p className="text-neutral-gray text-xs mt-0.5">{line.reason_note}</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-neutral-gray/50">-</span>
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
        href="/inventory/daily-closing"
        className="inline-flex items-center gap-1.5 text-neutral-gray hover:text-text-dark transition-colors text-sm font-body mb-4"
      >
        <ArrowLeftIcon size={14} weight="bold" />
        All closings
      </Link>
      <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl py-16 flex flex-col items-center text-center">
        <WarningCircleIcon size={40} weight="thin" className="text-neutral-gray/40 mb-3" />
        <p className="text-text-dark font-medium font-body">Closing not found</p>
        <p className="text-neutral-gray text-sm font-body mt-1 max-w-sm">
          It may have been deleted or you may not have permission to view it.
        </p>
      </div>
    </div>
  );
}
