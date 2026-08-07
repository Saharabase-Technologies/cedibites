'use client';

import { CursorClickIcon, UsersThreeIcon } from '@phosphor-icons/react';
import type { Campaign, CampaignStatus } from '@/types/marketing';

const STATUS_STYLES: Record<CampaignStatus, string> = {
    draft: 'bg-neutral-gray/15 text-neutral-gray',
    scheduled: 'bg-secondary/15 text-secondary',
    sending: 'bg-primary/15 text-primary',
    sent: 'bg-success/15 text-success',
    failed: 'bg-error/15 text-error',
    cancelled: 'bg-neutral-gray/15 text-neutral-gray',
};

export function CampaignRow({ campaign }: { campaign: Campaign }) {
    const started = campaign.status !== 'draft' && campaign.status !== 'scheduled';

    return (
        <div className="rounded-2xl border border-brown-light/25 bg-white dark:bg-brand-dark px-5 py-4 hover:border-primary/40 transition-colors">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-text-dark dark:text-text-light font-semibold font-body truncate">
                            {campaign.name}
                        </h3>
                        <span
                            className={`rounded-full text-xs font-semibold px-2 py-0.5 font-body ${STATUS_STYLES[campaign.status]}`}
                        >
                            {campaign.status_label}
                        </span>
                    </div>

                    <p className="text-neutral-gray text-sm mt-1 font-body line-clamp-2">
                        {campaign.message}
                    </p>

                    <p className="text-neutral-gray text-xs mt-2 font-body flex items-center gap-1.5 flex-wrap">
                        <UsersThreeIcon size={13} weight="fill" className="text-primary/70" />
                        {campaign.segment_label}
                        {started && (
                            <>
                                {' · '}
                                {campaign.sent_count.toLocaleString()} of{' '}
                                {campaign.recipient_count.toLocaleString()} sent
                                {campaign.failed_count > 0 && (
                                    <span className="text-error">
                                        {' · '}{campaign.failed_count.toLocaleString()} failed
                                    </span>
                                )}
                            </>
                        )}
                        {campaign.scheduled_for && !started && (
                            <>
                                {' · '}
                                {new Date(campaign.scheduled_for).toLocaleString('en-GH', {
                                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                                })}
                            </>
                        )}
                    </p>
                </div>

                <div className="text-right shrink-0">
                    {/*
                        Actual where we have it, projected where we do not, and
                        labelled either way — the gap between the two is the
                        thing worth knowing.
                    */}
                    <p className="text-text-dark dark:text-text-light text-lg font-semibold font-body">
                        GHS {(campaign.actual_cost ?? campaign.estimated_cost).toFixed(2)}
                    </p>
                    <p className="text-neutral-gray text-[10px] font-body uppercase tracking-wide">
                        {campaign.actual_cost === null ? 'Projected' : 'Actual'}
                    </p>

                    {/*
                        Null, not zero, when the campaign had no link. Zero would
                        read as "nobody clicked" — the difference between a bad
                        campaign and one that was never measured.
                    */}
                    {campaign.click_through_rate !== null && (
                        <p className="text-primary text-xs font-semibold font-body mt-1.5 flex items-center justify-end gap-1">
                            <CursorClickIcon size={12} weight="fill" />
                            {campaign.click_through_rate}% tapped
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
