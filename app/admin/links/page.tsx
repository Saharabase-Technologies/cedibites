'use client';

import { useState } from 'react';
import {
    PlusIcon,
    LinkSimpleIcon,
    SpinnerGapIcon,
    WarningCircleIcon,
} from '@phosphor-icons/react';
import { useLinks } from '@/lib/api/hooks/useLinks';
import type { ShortLink } from '@/types/marketing';
import { LinkRow } from './_components/LinkRow';
import { LinkDialog } from './_components/LinkDialog';

/**
 * Short links.
 *
 * These exist for one reason: SMS is billed in 160-character steps, not per
 * character. A campaign URL of 77 characters is what pushes an otherwise
 * one-segment message into two, and doubles the cost of the entire send. At
 * 28,000 recipients that is four figures on a single campaign.
 */
export default function AdminLinksPage() {
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<ShortLink | null>(null);

    const { links, isLoading, error, refetch } = useLinks({ per_page: 100 });

    const totalClicks = links.reduce((sum, link) => sum + link.click_count, 0);
    const liveCount = links.filter((link) => !link.is_expired).length;

    return (
        <div className="h-full overflow-y-auto bg-neutral-light dark:bg-brand-darker">
            <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">

                <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-text-dark dark:text-text-light text-2xl font-semibold font-body tracking-tight">
                            Short links
                        </h1>
                        <p className="text-neutral-gray text-sm mt-1 font-body max-w-xl">
                            Turn a long web address into <span className="font-mono">cedibites.com/r/A7X9Kp</span> so a
                            promo fits in one text instead of two.
                        </p>
                    </div>

                    <button
                        onClick={() => setCreating(true)}
                        className="flex items-center gap-2 rounded-2xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold font-body px-4 py-2.5 transition-colors"
                    >
                        <PlusIcon size={16} weight="bold" />
                        New link
                    </button>
                </header>

                {links.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                        <Stat label="Links" value={links.length} />
                        <Stat label="Still live" value={liveCount} />
                        <Stat label="Taps" value={totalClicks} />
                    </div>
                )}

                {error && (
                    <div className="mb-6 flex items-start gap-3 bg-error/10 border border-error/30 rounded-2xl px-4 py-3">
                        <WarningCircleIcon size={20} weight="fill" className="text-error shrink-0 mt-0.5" />
                        <p className="text-error text-sm font-body">
                            {error instanceof Error ? error.message : 'Could not load your links.'}
                        </p>
                    </div>
                )}

                {isLoading ? (
                    <div className="flex items-center justify-center gap-3 py-20 text-neutral-gray font-body">
                        <SpinnerGapIcon size={22} className="animate-spin" />
                        Loading…
                    </div>
                ) : links.length === 0 ? (
                    <div className="flex flex-col items-center text-center py-20">
                        <LinkSimpleIcon size={40} className="text-neutral-gray/50" />
                        <h3 className="text-text-dark dark:text-text-light font-semibold font-body mt-4">
                            No links yet
                        </h3>
                        <p className="text-neutral-gray text-sm mt-1.5 font-body max-w-sm">
                            Make one, drop it into a campaign, and every tap is counted here.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {links.map((link) => (
                            <LinkRow key={link.id} link={link} onEdit={() => setEditing(link)} />
                        ))}
                    </div>
                )}
            </div>

            {creating && (
                <LinkDialog
                    onClose={() => setCreating(false)}
                    onSaved={() => { setCreating(false); void refetch(); }}
                />
            )}

            {editing && (
                <LinkDialog
                    link={editing}
                    onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); void refetch(); }}
                />
            )}
        </div>
    );
}

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-2xl border border-brown-light/25 bg-white dark:bg-brand-dark px-4 py-3">
            <p className="text-neutral-gray text-xs font-body">{label}</p>
            <p className="text-text-dark dark:text-text-light text-xl font-semibold font-body mt-0.5">
                {value.toLocaleString()}
            </p>
        </div>
    );
}
