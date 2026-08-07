'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    SpinnerGapIcon,
    WarningCircleIcon,
    FloppyDiskIcon,
} from '@phosphor-icons/react';
import { FormField, TextInput } from '@/app/inventory/_components';
import { useAudienceCount, useCampaignMutations, useCampaignSegments } from '@/lib/api/hooks/useCampaigns';
import { useLinks } from '@/lib/api/hooks/useLinks';
import type { AudienceRules, Campaign, CampaignSegmentValue } from '@/types/marketing';
import { WizardShell, type WizardStep } from './WizardShell';
import { AudienceStep } from './AudienceStep';
import { MessageStep } from './MessageStep';
import { ReviewStep } from './ReviewStep';

const STEPS: WizardStep[] = [
    { key: 'basics', label: 'Basics', blurb: 'Give it a name you will recognise in the list later.' },
    { key: 'audience', label: 'Audience', blurb: 'Who receives this. The count beside each group is live.' },
    { key: 'message', label: 'Message', blurb: 'What they read, and what it costs to say it.' },
    { key: 'review', label: 'Review', blurb: 'Check the total before anything is spent.' },
];

/** The estimate rate, mirrored from config/campaigns.php. */
const RATE_PER_SEGMENT = 0.05;

export function CampaignWizard({ campaign }: { campaign?: Campaign }) {
    const router = useRouter();
    const editing = !!campaign;

    const { create, update } = useCampaignMutations();
    const { segments, seedMode, recipientCap, isLoading: segmentsLoading } = useCampaignSegments();
    const { links } = useLinks({ per_page: 100 });

    const [step, setStep] = useState(0);
    const [furthest, setFurthest] = useState(editing ? STEPS.length - 1 : 0);
    const [error, setError] = useState<string | null>(null);

    const [name, setName] = useState(campaign?.name ?? '');
    const [segment, setSegment] = useState<CampaignSegmentValue>(campaign?.segment ?? 'all');
    const [rules, setRules] = useState<AudienceRules>(campaign?.audience_rules ?? {});
    const [message, setMessage] = useState(campaign?.message ?? '');
    const [shortLinkId, setShortLinkId] = useState<number | null>(campaign?.short_link?.id ?? null);

    const saving = create.isPending || update.isPending;
    const chosenSegment = segments.find((s) => s.value === segment);
    const chosenLink = links.find((l) => l.id === shortLinkId);

    /*
     * How many people this actually reaches, which is not always the preset's
     * count. Once conditions are added the rules take over, and the cost shown
     * on the message and review steps has to follow them — otherwise the
     * operator narrows an audience from 4,000 to 300 and still sees the bill
     * for 4,000.
     */
    const custom = Object.keys(rules).length > 0;
    const { count: ruleCount } = useAudienceCount(rules, custom);
    const recipients = custom ? (ruleCount ?? 0) : (chosenSegment?.count ?? 0);

    /** What stops you leaving the step you are on. */
    const blocker = ((): string | null => {
        if (step === 0 && !name.trim()) return 'Give the campaign a name first.';
        if (step === 2 && !message.trim()) return 'Write the message first.';
        return null;
    })();

    function goTo(next: number) {
        setError(null);
        setStep(next);
        setFurthest((f) => Math.max(f, next));
    }

    function advance() {
        if (blocker) {
            setError(blocker);
            return;
        }
        goTo(Math.min(step + 1, STEPS.length - 1));
    }

    async function save() {
        setError(null);

        const payload = {
            name: name.trim(),
            message: message.trim(),
            segment,
            // Null rather than an empty object when no conditions were added —
            // that is what tells the server to fall back to the preset.
            audience_rules: Object.keys(rules).length > 0 ? rules : null,
            short_link_id: shortLinkId,
        };

        try {
            const saved = editing
                ? await update.mutateAsync({ id: campaign.id, payload })
                : await create.mutateAsync(payload);

            // Straight to the campaign, which is where sending happens. Saving
            // and sending are deliberately separate acts.
            router.push(`/admin/campaigns/${saved.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save the campaign.');
        }
    }

    return (
        <WizardShell
            steps={STEPS}
            current={step}
            furthest={furthest}
            onStepClick={goTo}
            footer={
                <>
                    <button
                        type="button"
                        onClick={() => (step === 0 ? router.push('/admin/campaigns') : goTo(step - 1))}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#f0e8d8] bg-neutral-card text-sm font-medium font-body text-neutral-gray hover:text-text-dark transition-colors min-h-11 cursor-pointer"
                    >
                        <ArrowLeftIcon size={15} />
                        {step === 0 ? 'Cancel' : STEPS[step - 1].label}
                    </button>

                    {step < STEPS.length - 1 ? (
                        <button
                            type="button"
                            onClick={advance}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold font-body hover:bg-primary/90 transition-colors min-h-11 cursor-pointer shadow-sm"
                        >
                            {STEPS[step + 1].label}
                            <ArrowRightIcon size={15} weight="bold" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={save}
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold font-body hover:bg-primary/90 transition-colors min-h-11 cursor-pointer shadow-sm disabled:opacity-60"
                        >
                            {saving ? <SpinnerGapIcon size={15} className="animate-spin" /> : <FloppyDiskIcon size={15} weight="fill" />}
                            {editing ? 'Save changes' : 'Save as draft'}
                        </button>
                    )}
                </>
            }
        >
            {error && (
                <div className="mb-5 flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3">
                    <WarningCircleIcon size={18} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
                    <p className="text-rose-700 text-sm font-body">{error}</p>
                </div>
            )}

            {step === 0 && (
                <div className="max-w-md">
                    <FormField
                        label="Campaign name"
                        required
                        hint="Only you see this. It is what makes the list readable in a month."
                    >
                        <TextInput
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="August Friday jollof"
                            autoFocus
                        />
                    </FormField>
                </div>
            )}

            {step === 1 && (
                <AudienceStep
                    segments={segments}
                    value={segment}
                    onChange={setSegment}
                    rules={rules}
                    onRulesChange={setRules}
                    isLoading={segmentsLoading}
                    recipientCap={recipientCap}
                    seedMode={seedMode}
                />
            )}

            {step === 2 && (
                <MessageStep
                    message={message}
                    onMessageChange={setMessage}
                    links={links}
                    shortLinkId={shortLinkId}
                    onShortLinkChange={setShortLinkId}
                    recipients={recipients}
                    ratePerSegment={RATE_PER_SEGMENT}
                />
            )}

            {step === 3 && (
                <ReviewStep
                    name={name}
                    message={message}
                    audienceLabel={custom ? 'Custom audience' : (chosenSegment?.label ?? '—')}
                    recipients={recipients}
                    link={chosenLink}
                    ratePerSegment={RATE_PER_SEGMENT}
                    seedMode={seedMode}
                    seedCount={null}
                />
            )}
        </WizardShell>
    );
}
