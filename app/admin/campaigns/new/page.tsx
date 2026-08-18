'use client';

import Link from 'next/link';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import { CampaignWizard } from '../_components/CampaignWizard';

/**
 * Writing a campaign, on its own page rather than in a modal.
 *
 * Four unrelated decisions — what to call it, who gets it, what it says, and
 * whether to spend the money — do not fit in a dialog. In the modal the cost sat
 * below the fold, which is the one number that should never need scrolling to.
 *
 * Nothing here sends. Saving produces a draft; sending is a separate act on the
 * campaign's own page.
 */
export default function NewCampaignPage() {
    return (
        <div className="h-full overflow-y-auto bg-neutral-light">
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
                <Link
                    href="/admin/campaigns"
                    className="inline-flex items-center gap-2 text-neutral-gray hover:text-text-dark text-sm font-body mb-4 transition-colors"
                >
                    <ArrowLeftIcon size={15} />
                    All campaigns
                </Link>

                <div className="mb-6">
                    <h1 className="text-2xl font-bold font-brand text-text-dark">New campaign</h1>
                    <p className="text-neutral-gray text-sm font-body mt-1">
                        Four steps. Nothing goes out until you send it from the campaign itself.
                    </p>
                </div>

                <CampaignWizard />
            </div>
        </div>
    );
}
