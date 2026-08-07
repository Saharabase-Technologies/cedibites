'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChatCircleDotsIcon,
  MicrophoneIcon,
  ImageIcon,
  CaretRightIcon,
  ArrowClockwiseIcon,
} from '@phosphor-icons/react';
import { useFeedbackReports } from '@/lib/api/hooks/useFeedback';
import { SEVERITY_CONFIG, STATUS_CONFIG, SEVERITY_FILTERS } from '@/lib/constants/feedback.constants';
import type { FeedbackStatus } from '@/types/feedback';
import { timeAgo } from '@/types/order';

const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'triaged', label: 'Triaged' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'wont_fix', label: "Won't fix" },
];

export function FeedbackInboxPage() {
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');

  const filters = useMemo(
    () => ({ status: status || undefined, severity: severity || undefined }),
    [status, severity],
  );
  const { reports, meta, isLoading, refetch } = useFeedbackReports(filters);

  return (
    <div className="mx-auto w-full max-w-5xl p-6 pb-24">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-body text-2xl font-bold text-text-dark">
            <ChatCircleDotsIcon size={26} weight="fill" className="text-primary" />
            Feedback
          </h1>
          <p className="mt-1 font-body text-sm text-neutral-gray">
            Reports from testers, with the exact context around each one.
            {meta ? ` ${meta.total} total.` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="flex items-center gap-1.5 rounded-xl border border-[#f0e8d8] px-3 py-2 font-body text-sm text-neutral-gray hover:bg-neutral-light cursor-pointer"
        >
          <ArrowClockwiseIcon size={16} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setStatus(t.value)}
              className={`rounded-full px-3.5 py-1.5 font-body text-xs font-semibold transition-colors cursor-pointer ${
                status === t.value
                  ? 'bg-primary text-white'
                  : 'bg-neutral-card text-neutral-gray hover:bg-neutral-light border border-[#f0e8d8]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSeverity('')}
            className={`rounded-full px-3 py-1 font-body text-[11px] font-medium cursor-pointer ${
              severity === '' ? 'bg-text-dark text-white' : 'text-neutral-gray hover:bg-neutral-light'
            }`}
          >
            Any severity
          </button>
          {SEVERITY_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSeverity(s)}
              className={`rounded-full border px-3 py-1 font-body text-[11px] font-medium cursor-pointer ${
                severity === s ? SEVERITY_CONFIG[s].chip : 'border-transparent text-neutral-gray hover:bg-neutral-light'
              }`}
            >
              {SEVERITY_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="py-20 text-center font-body text-sm text-neutral-gray">Loading reports…</div>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#e3d9c4] bg-neutral-card py-20 text-center">
          <ChatCircleDotsIcon size={40} className="mx-auto mb-3 text-neutral-gray/40" />
          <p className="font-body text-sm text-neutral-gray">No reports match these filters.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {reports.map((r) => {
            const sev = SEVERITY_CONFIG[r.severity];
            const st = STATUS_CONFIG[r.status];
            return (
              <Link
                key={r.id}
                href={`/admin/feedback/${r.id}`}
                className="group flex items-center gap-3 rounded-2xl border border-[#f0e8d8] bg-neutral-card p-4 transition-colors hover:border-primary/40 hover:bg-[#fffdf8]"
              >
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${sev.dot}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {r.number != null && (
                      <span className="font-mono text-xs font-semibold text-neutral-gray">#{r.number}</span>
                    )}
                    <span className={`rounded-full border px-2 py-0.5 font-body text-[10px] font-bold uppercase tracking-wide ${st.chip}`}>
                      {st.label}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 font-body text-[10px] font-semibold ${sev.chip}`}>
                      {sev.label}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-body text-sm text-text-dark">
                    {r.description?.trim() || <span className="text-neutral-gray/60 italic">No description</span>}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-body text-[11px] text-neutral-gray">
                    <span>{r.reporter?.name ?? 'Unknown'}</span>
                    {r.route && <span className="font-mono">{r.route}</span>}
                    {r.branch && <span>{r.branch.name}</span>}
                    <span>{timeAgo(new Date(r.created_at).getTime())}</span>
                    {r.screenshot_count > 0 && (
                      <span className="flex items-center gap-0.5"><ImageIcon size={12} /> {r.screenshot_count}</span>
                    )}
                    {r.has_audio && <MicrophoneIcon size={12} />}
                  </div>
                </div>
                <CaretRightIcon size={16} className="shrink-0 text-neutral-gray/40 group-hover:text-primary" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
