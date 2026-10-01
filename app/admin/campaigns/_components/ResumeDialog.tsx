'use client';

import { useState } from 'react';
import { PaperPlaneTiltIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { InventoryModal, PrimaryButton } from '@/app/inventory/_components';
import { useCampaignMutations, useCampaignSegments } from '@/lib/api/hooks/useCampaigns';
import { breakDownCost, GHS } from '@/lib/sms/cost';
import { toast } from '@/lib/utils/toast';
import type { Campaign, CampaignReach } from '@/types/marketing';

/**
 * Send to the people a campaign missed.
 *
 * The confirm for the second send in the console that spends money. It says
 * three things a person needs before pressing: who gets it, who does not get it
 * again, and what it costs.
 *
 * The people we got no answer about are a separate tick, off by default. Some
 * of them have the message already, and a second copy is a choice somebody
 * should make on purpose.
 */
export function ResumeDialog({
    campaign,
    reach,
    onClose,
    onSent,
}: {
    campaign: Campaign;
    /** Null on an API that does not serve the report. The campaign's own count is used. */
    reach: CampaignReach | null;
    onClose: () => void;
    onSent: () => void;
}) {
    const { resume } = useCampaignMutations();
    const { ratePerSegment } = useCampaignSegments();

    const [includeUnsure, setIncludeUnsure] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const unsure = reach?.unsure ?? 0;
    const base = reach?.resumable ?? campaign.resumable_count;
    const going = includeUnsure ? (reach?.resumable_with_unsure ?? base + unsure) : base;

    const cost = breakDownCost(campaign.segments_per_message, going, ratePerSegment);
    const outOfCredit = campaign.pause_reason === 'no_credit';

    const send = async () => {
        setError(null);

        try {
            await resume.mutateAsync({ id: campaign.id, includeUnsure });
            toast.success(`Sending to ${going.toLocaleString()} people.`);
            onSent();
        } catch (e) {
            setError(
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                    (e instanceof Error ? e.message : 'That could not be sent.'),
            );
        }
    };

    return (
        <InventoryModal isOpen onClose={onClose} title="Send to the people who were missed" size="md">
            <div className="space-y-4">
                <dl className="rounded-2xl bg-white border border-[#f0e8d8] divide-y divide-[#f0e8d8]">
                    <Line
                        label="Going to"
                        value={`${going.toLocaleString()} ${going === 1 ? 'person' : 'people'}`}
                        strong
                    />
                    <Line
                        label="Already sent to"
                        value={`${campaign.sent_count.toLocaleString()}. They do not get it again.`}
                    />
                    <div className="flex items-baseline justify-between gap-4 px-4 py-3.5">
                        <dt className="text-text-dark text-sm font-semibold font-body">
                            Total we pay for this send
                            <span className="block text-neutral-gray text-xs font-normal mt-0.5">
                                {cost.workingOut}
                            </span>
                        </dt>
                        <dd className="text-text-dark text-xl font-bold font-body">{GHS(cost.total)}</dd>
                    </div>
                </dl>

                {unsure > 0 && (
                    <label className="flex items-start gap-3 rounded-2xl border border-[#f0e8d8] px-4 py-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={includeUnsure}
                            onChange={(e) => setIncludeUnsure(e.target.checked)}
                            className="mt-0.5 h-4 w-4 accent-primary cursor-pointer"
                        />
                        <span className="text-sm font-body text-text-dark">
                            Also send to the {unsure.toLocaleString()} we got no answer about
                            <span className="block text-xs text-neutral-gray mt-0.5">
                                Hubtel never said whether it took these. Some of them will get the text twice.
                            </span>
                        </span>
                    </label>
                )}

                {outOfCredit && (
                    <div className="flex gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                        <WarningCircleIcon size={16} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-text-dark text-xs font-body leading-relaxed">
                            This stopped because the Hubtel account ran out of credit. Check that it now holds at
                            least {GHS(cost.total)}. If it does not, the campaign pauses again and nothing is lost.
                        </p>
                    </div>
                )}

                <p className="text-neutral-gray text-xs font-body leading-relaxed">
                    The words are the ones that went out the first time. Once this starts, it cannot be recalled.
                </p>

                {error && (
                    <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3">
                        <WarningCircleIcon size={16} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
                        <p className="text-rose-700 text-sm font-body">{error}</p>
                    </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-1">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 text-sm font-body text-neutral-gray hover:text-text-dark transition-colors cursor-pointer min-h-11"
                    >
                        Not yet
                    </button>
                    <PrimaryButton
                        onClick={send}
                        disabled={going === 0 || resume.isPending}
                        className="w-auto px-5 flex items-center justify-center gap-2"
                    >
                        <PaperPlaneTiltIcon size={15} weight="fill" />
                        {resume.isPending ? 'Sending…' : `Send to ${going.toLocaleString()}`}
                    </PrimaryButton>
                </div>
            </div>
        </InventoryModal>
    );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
    return (
        <div className="flex items-baseline justify-between gap-4 px-4 py-3">
            <dt className="text-neutral-gray text-sm font-body">{label}</dt>
            <dd
                className={`text-text-dark text-sm font-body text-right ${strong ? 'font-semibold' : 'font-medium'}`}
            >
                {value}
            </dd>
        </div>
    );
}
