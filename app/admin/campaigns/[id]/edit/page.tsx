'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, SpinnerGapIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useCampaign } from '@/lib/api/hooks/useCampaigns';
import { CampaignWizard } from '../../_components/CampaignWizard';

/**
 * Editing a campaign that has not gone out, through the same four steps that
 * built it. Every step is reachable immediately here — you came to change one
 * thing, not to walk the whole path again.
 */
export default function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { campaign, isLoading, error } = useCampaign(Number(id));

    return (
        <div className="h-full overflow-y-auto bg-neutral-light">
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
                <Link
                    href={`/admin/campaigns/${id}`}
                    className="inline-flex items-center gap-2 text-neutral-gray hover:text-text-dark text-sm font-body mb-4 transition-colors"
                >
                    <ArrowLeftIcon size={15} />
                    Back to the campaign
                </Link>

                {isLoading ? (
                    <div className="flex items-center justify-center gap-3 py-20 text-neutral-gray font-body">
                        <SpinnerGapIcon size={22} className="animate-spin" />
                        Loading…
                    </div>
                ) : error || !campaign ? (
                    <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3">
                        <WarningCircleIcon size={20} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
                        <p className="text-rose-700 text-sm font-body">
                            {error instanceof Error ? error.message : 'Could not load this campaign.'}
                        </p>
                    </div>
                ) : !campaign.is_editable ? (
                    /* The server refuses this too. Saying so here saves them
                       filling in four steps to be told at the end. */
                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                        <WarningCircleIcon size={20} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-neutral-gray text-sm font-body">
                            <span className="text-text-dark font-semibold">This campaign has already gone out.</span>{' '}
                            It cannot be changed. Copy it into a new campaign
                            instead.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold font-brand text-text-dark">Edit campaign</h1>
                            <p className="text-neutral-gray text-sm font-body mt-1">
                                Changes are saved as a draft. Sending is still a separate step.
                            </p>
                        </div>

                        <CampaignWizard campaign={campaign} />
                    </>
                )}
            </div>
        </div>
    );
}
