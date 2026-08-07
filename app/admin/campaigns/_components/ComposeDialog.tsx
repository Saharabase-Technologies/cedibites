'use client';

import { useState } from 'react';
import { XIcon, SpinnerGapIcon, WarningCircleIcon } from '@phosphor-icons/react';
import Input from '@/app/components/base/Input';
import { useCampaignMutations, useCampaignSegments } from '@/lib/api/hooks/useCampaigns';
import { useLinks } from '@/lib/api/hooks/useLinks';
import type { Campaign, CampaignSegmentValue } from '@/types/marketing';
import { MessageComposer } from './MessageComposer';

/**
 * Writing a campaign.
 *
 * Nothing here sends anything. Saving produces a draft; sending is a separate
 * act on the campaign's own page, behind a confirmation showing the real
 * recipient count and cost.
 */
export function ComposeDialog({
    campaign,
    onClose,
    onSaved,
}: {
    campaign?: Campaign;
    onClose: () => void;
    onSaved: () => void;
}) {
    const editing = !!campaign;
    const { create, update } = useCampaignMutations();
    const { segments, recipientCap } = useCampaignSegments();
    const { links } = useLinks({ per_page: 100 });

    const [name, setName] = useState(campaign?.name ?? '');
    const [message, setMessage] = useState(campaign?.message ?? '');
    const [segment, setSegment] = useState<CampaignSegmentValue>(campaign?.segment ?? 'all');
    const [shortLinkId, setShortLinkId] = useState<number | null>(campaign?.short_link?.id ?? null);
    const [error, setError] = useState<string | null>(null);

    const saving = create.isPending || update.isPending;
    const chosen = segments.find((s) => s.value === segment);
    const overCap = !!chosen && recipientCap > 0 && chosen.count > recipientCap;

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        setError(null);

        const payload = {
            name: name.trim(),
            message: message.trim(),
            segment,
            short_link_id: shortLinkId,
        };

        try {
            if (editing) {
                await update.mutateAsync({ id: campaign.id, payload });
            } else {
                await create.mutateAsync(payload);
            }
            onSaved();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save the campaign.');
        }
    }

    /** Drop the link's short address into the message where the cursor would be. */
    function insertLink(id: number) {
        setShortLinkId(id);

        const link = links.find((l) => l.id === id);
        if (link && !message.includes(link.sms_url)) {
            setMessage((current) => (current ? `${current.trimEnd()} ${link.sms_url}` : link.sms_url));
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-8 overflow-y-auto">
            <div className="w-full max-w-lg bg-white dark:bg-brand-dark rounded-3xl shadow-xl border border-brown-light/20 my-auto">

                <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0e8d8] dark:border-brown-light/20">
                    <h2 className="text-text-dark dark:text-text-light text-lg font-semibold font-body">
                        {editing ? 'Edit campaign' : 'New campaign'}
                    </h2>
                    <button onClick={onClose} className="text-neutral-gray hover:text-text-dark transition-colors">
                        <XIcon size={20} />
                    </button>
                </div>

                <form onSubmit={submit} className="px-6 py-5 flex flex-col gap-5">

                    {error && (
                        <div className="flex items-start gap-3 bg-error/10 border border-error/30 rounded-2xl px-4 py-3">
                            <WarningCircleIcon size={18} weight="fill" className="text-error shrink-0 mt-0.5" />
                            <p className="text-error text-sm font-body">{error}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-text-dark dark:text-neutral-light mb-1.5 font-body">
                            Name it <span className="text-primary">*</span>
                        </label>
                        <Input value={name} onChange={setName} placeholder="August Friday jollof" />
                        <p className="text-neutral-gray text-xs mt-1.5 font-body">
                            Only you see this.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-dark dark:text-neutral-light mb-2 font-body">
                            Who gets it <span className="text-primary">*</span>
                        </label>
                        <div className="flex flex-col gap-2">
                            {segments.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setSegment(option.value)}
                                    className={`text-left rounded-2xl border px-4 py-3 transition-colors ${
                                        segment === option.value
                                            ? 'border-primary bg-primary/5'
                                            : 'border-brown-light/25 hover:border-neutral-gray/40'
                                    }`}
                                >
                                    <div className="flex items-baseline justify-between gap-3">
                                        <p className={`text-sm font-semibold font-body ${
                                            segment === option.value ? 'text-primary' : 'text-text-dark dark:text-text-light'
                                        }`}>
                                            {option.label}
                                        </p>
                                        {/*
                                            The count is the point. "Lapsed"
                                            means nothing to anybody until it
                                            says 4,812 people beside it.
                                        */}
                                        <p className="text-neutral-gray text-xs font-body shrink-0">
                                            {option.count.toLocaleString()} people
                                        </p>
                                    </div>
                                    <p className="text-neutral-gray text-xs mt-0.5 font-body">{option.description}</p>
                                </button>
                            ))}
                        </div>

                        {overCap && (
                            <p className="text-warning text-xs mt-2 font-body leading-relaxed">
                                That is more than the {recipientCap.toLocaleString()} allowed in one campaign. You can
                                still save this, but sending will be refused until the limit is raised or you pick a
                                narrower audience.
                            </p>
                        )}
                    </div>

                    <MessageComposer
                        value={message}
                        onChange={setMessage}
                        recipients={chosen?.count ?? 0}
                    />

                    {links.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-text-dark dark:text-neutral-light mb-1.5 font-body">
                                Attach a short link
                            </label>
                            <select
                                value={shortLinkId ?? ''}
                                onChange={(e) => (e.target.value ? insertLink(Number(e.target.value)) : setShortLinkId(null))}
                                className="w-full rounded-2xl border border-brown-light/25 bg-white dark:bg-brand-darker px-4 py-3 text-sm font-body text-text-dark dark:text-text-light focus:outline-none focus:border-primary"
                            >
                                <option value="">No link</option>
                                {links.filter((l) => !l.is_expired).map((link) => (
                                    <option key={link.id} value={link.id}>
                                        {link.label} — {link.sms_url}
                                    </option>
                                ))}
                            </select>
                            <p className="text-neutral-gray text-xs mt-1.5 font-body leading-relaxed">
                                Attaching a link is what makes the taps countable afterwards. Without one you can say
                                how many messages went out, but not how many people did anything about it.
                            </p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-2xl border border-brown-light/25 text-text-dark dark:text-text-light text-sm font-semibold font-body py-3 hover:bg-neutral-light dark:hover:bg-brand-darker transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 rounded-2xl bg-primary hover:bg-primary-hover disabled:opacity-60 text-white text-sm font-semibold font-body py-3 transition-colors flex items-center justify-center gap-2"
                        >
                            {saving && <SpinnerGapIcon size={16} className="animate-spin" />}
                            Save draft
                        </button>
                    </div>

                    <p className="text-neutral-gray text-xs text-center font-body">
                        Saving does not send anything. You will see the count and the cost before it goes.
                    </p>
                </form>
            </div>
        </div>
    );
}
