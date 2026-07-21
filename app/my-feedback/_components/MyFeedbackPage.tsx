'use client';

import { ChatCircleDotsIcon, CheckCircleIcon } from '@phosphor-icons/react';
import { useMyFeedbackReports } from '@/lib/api/hooks/useFeedback';
import { SEVERITY_CONFIG, STATUS_CONFIG } from '@/lib/constants/feedback.constants';
import { timeAgo } from '@/types/order';

/**
 * Where a reporter follows their own reports — the visible half of "close the
 * loop". Deep-linked from the "your report was fixed" notification.
 */
export function MyFeedbackPage() {
  const { reports, isLoading } = useMyFeedbackReports();

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-10">
      <h1 className="flex items-center gap-2 font-body text-2xl font-bold text-text-dark">
        <ChatCircleDotsIcon size={26} weight="fill" className="text-primary" />
        My feedback
      </h1>
      <p className="mt-1 font-body text-sm text-neutral-gray">Reports you&apos;ve sent, and where they stand.</p>

      <div className="mt-6 flex flex-col gap-2">
        {isLoading ? (
          <p className="py-16 text-center font-body text-sm text-neutral-gray">Loading…</p>
        ) : reports.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#e3d9c4] bg-neutral-card py-16 text-center">
            <p className="font-body text-sm text-neutral-gray">You haven&apos;t sent any reports yet.</p>
          </div>
        ) : (
          reports.map((r) => {
            const st = STATUS_CONFIG[r.status];
            const sev = SEVERITY_CONFIG[r.severity];
            return (
              <div key={r.id} className="rounded-2xl border border-[#f0e8d8] bg-neutral-card p-4">
                <div className="flex items-center gap-2">
                  {r.number != null && <span className="font-mono text-xs font-semibold text-neutral-gray">#{r.number}</span>}
                  <span className={`rounded-full border px-2 py-0.5 font-body text-[10px] font-bold uppercase tracking-wide ${st.chip}`}>
                    {r.status === 'fixed' && <CheckCircleIcon size={11} weight="fill" className="mr-0.5 inline" />}
                    {st.label}
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 font-body text-[10px] font-semibold ${sev.chip}`}>{sev.label}</span>
                  <span className="ml-auto font-body text-[11px] text-neutral-gray">{timeAgo(new Date(r.created_at).getTime())}</span>
                </div>
                <p className="mt-1.5 font-body text-sm text-text-dark">
                  {r.description?.trim() || <span className="italic text-neutral-gray/60">No description</span>}
                </p>
                {r.route && <p className="mt-0.5 font-mono text-[11px] text-neutral-gray">{r.route}</p>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
