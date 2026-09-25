'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { STATUS_LABEL, statusTone } from '@/app/components/opening/openingFormat';
import { openingService } from '@/lib/api/services/opening.service';

/**
 * Today's openings, on the admin dashboard, for the branches that use the
 * checklist. Late and unfinished ones first, since those are the ones to ring.
 * Shows nothing at all until a branch is switched onto the checklist.
 */
export function TodayOpenings() {
    const { data } = useQuery({
        queryKey: ['openings', null],
        queryFn: () => openingService.listForDay(),
        refetchInterval: 60_000,
    });

    const rows = (data?.branches ?? []).filter((r) => r.required && r.schedule.trading_day);
    if (rows.length === 0) return null;

    const rank = (s: string, late: boolean) => (late ? 0 : s === 'open_with_problems' ? 1 : s === 'open' ? 3 : 2);
    const sorted = [...rows].sort((a, b) => rank(a.status, a.is_late && !a.opened_at) - rank(b.status, b.is_late && !b.opened_at));

    return (
        <div className="mb-7 flex flex-wrap items-center gap-2 rounded-2xl border border-[#f0e8d8] bg-neutral-card px-4 py-3">
            <Link href="/admin/openings" className="mr-1 min-h-11 inline-flex items-center text-sm font-semibold font-body text-text-dark hover:text-primary">
                Openings today
            </Link>
            {sorted.map((r) => {
                const late = r.is_late && !r.opened_at;
                const tone = statusTone(r.status, r.is_late);
                return (
                    <Link
                        key={r.branch.id}
                        href={r.id ? `/admin/openings/${r.id}` : '/admin/openings'}
                        className={`inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-body ${tone.bg} ${tone.text}`}
                    >
                        <span className="font-semibold">{r.branch.name}</span>
                        <span>{late ? 'Late' : STATUS_LABEL[r.status]}</span>
                    </Link>
                );
            })}
        </div>
    );
}
