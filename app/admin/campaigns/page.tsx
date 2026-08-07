'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    PlusIcon,
    MegaphoneIcon,
    SpinnerGapIcon,
    WarningCircleIcon,
    FlaskIcon,
} from '@phosphor-icons/react';
import { useCampaigns, useCampaignSegments } from '@/lib/api/hooks/useCampaigns';
import { CampaignRow } from './_components/CampaignRow';
import { ComposeDialog } from './_components/ComposeDialog';

/**
 * The campaign console — what replaces logging into the Hubtel dashboard.
 */
export default function AdminCampaignsPage() {
    const [composing, setComposing] = useState(false);
    const { campaigns, isLoading, error, refetch } = useCampaigns();
    const { seedMode } = useCampaignSegments();

    return (
        <div className="h-full overflow-y-auto bg-neutral-light dark:bg-brand-darker">
            <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">

                <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-text-dark dark:text-text-light text-2xl font-semibold font-body tracking-tight">
                            Campaigns
                        </h1>
                        <p className="text-neutral-gray text-sm mt-1 font-body max-w-xl">
                            Write a text, pick who gets it, see what it costs, and send — without leaving here.
                        </p>
                    </div>

                    <button
                        onClick={() => setComposing(true)}
                        className="flex items-center gap-2 rounded-2xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold font-body px-4 py-2.5 transition-colors"
                    >
                        <PlusIcon size={16} weight="bold" />
                        New campaign
                    </button>
                </header>

                {/*
                    Stated plainly and at the top, because the alternative is
                    somebody finding out after a demo that nothing reached a
                    customer — or worse, assuming it is on when it is not.
                */}
                {seedMode && (
                    <div className="mb-6 flex items-start gap-3 bg-secondary/10 border border-secondary/30 rounded-2xl px-4 py-3">
                        <FlaskIcon size={20} weight="fill" className="text-secondary shrink-0 mt-0.5" />
                        <div>
                            <p className="text-text-dark dark:text-text-light text-sm font-semibold font-body">
                                Test mode is on
                            </p>
                            <p className="text-neutral-gray text-sm font-body mt-0.5">
                                Every send goes to the staff test numbers only. No customer receives anything,
                                whichever audience you pick.
                            </p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mb-6 flex items-start gap-3 bg-error/10 border border-error/30 rounded-2xl px-4 py-3">
                        <WarningCircleIcon size={20} weight="fill" className="text-error shrink-0 mt-0.5" />
                        <p className="text-error text-sm font-body">
                            {error instanceof Error ? error.message : 'Could not load campaigns.'}
                        </p>
                    </div>
                )}

                {isLoading ? (
                    <div className="flex items-center justify-center gap-3 py-20 text-neutral-gray font-body">
                        <SpinnerGapIcon size={22} className="animate-spin" />
                        Loading…
                    </div>
                ) : campaigns.length === 0 ? (
                    <div className="flex flex-col items-center text-center py-20">
                        <MegaphoneIcon size={40} className="text-neutral-gray/50" />
                        <h3 className="text-text-dark dark:text-text-light font-semibold font-body mt-4">
                            No campaigns yet
                        </h3>
                        <p className="text-neutral-gray text-sm mt-1.5 font-body max-w-sm">
                            Write one, and you will see the recipient count and the cost before anything goes out.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {campaigns.map((campaign) => (
                            <Link key={campaign.id} href={`/admin/campaigns/${campaign.id}`} className="block">
                                <CampaignRow campaign={campaign} />
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {composing && (
                <ComposeDialog
                    onClose={() => setComposing(false)}
                    onSaved={() => { setComposing(false); void refetch(); }}
                />
            )}
        </div>
    );
}
