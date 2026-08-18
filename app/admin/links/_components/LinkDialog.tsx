'use client';

import { useState } from 'react';
import { XIcon, SpinnerGapIcon, WarningCircleIcon, TrashIcon } from '@phosphor-icons/react';
import Input from '@/app/components/base/Input';
import { useLinkMutations } from '@/lib/api/hooks/useLinks';
import type { ShortLink } from '@/types/marketing';

/**
 * Making a link, and changing one.
 *
 * Repointing a live link is deliberately allowed. It is the reason the redirect
 * answers 302 rather than 301 — a mistyped target on a link already sitting in
 * 28,000 inboxes is fixable here rather than being a wasted campaign. The token
 * never changes, so everything already sent keeps working.
 */
export function LinkDialog({
    link,
    onClose,
    onSaved,
}: {
    link?: ShortLink;
    onClose: () => void;
    onSaved: () => void;
}) {
    const editing = !!link;
    const { create, update, remove } = useLinkMutations();

    const [label, setLabel] = useState(link?.label ?? '');
    const [targetUrl, setTargetUrl] = useState(link?.target_url ?? '');
    const [expiresOn, setExpiresOn] = useState(link?.expires_at ? link.expires_at.slice(0, 10) : '');
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const saving = create.isPending || update.isPending || remove.isPending;

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        setError(null);

        const payload = {
            label: label.trim(),
            target_url: targetUrl.trim(),
            // End of the chosen day, so a link dated today still works today.
            expires_at: expiresOn ? new Date(`${expiresOn}T23:59:59`).toISOString() : null,
        };

        try {
            if (editing) {
                await update.mutateAsync({ id: link.id, payload });
            } else {
                await create.mutateAsync(payload);
            }
            onSaved();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not save the link.');
        }
    }

    async function destroy() {
        if (!link) return;
        setError(null);

        try {
            await remove.mutateAsync(link.id);
            onSaved();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not delete the link.');
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8 overflow-y-auto">
            <div className="w-full max-w-md bg-white dark:bg-brand-dark rounded-3xl shadow-xl border border-brown-light/20">

                <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0e8d8] dark:border-brown-light/20">
                    <h2 className="text-text-dark dark:text-text-light text-lg font-semibold font-body">
                        {editing ? 'Edit link' : 'New short link'}
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
                        <Input value={label} onChange={setLabel} placeholder="August Friday jollof promo" />
                        <p className="text-neutral-gray text-xs mt-1.5 font-body">
                            Only you see this. It makes the list readable later.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-dark dark:text-neutral-light mb-1.5 font-body">
                            Where should it go? <span className="text-primary">*</span>
                        </label>
                        <Input
                            value={targetUrl}
                            onChange={setTargetUrl}
                            placeholder="https://app.cedibites.com/promo/friday"
                        />
                        {editing && (
                            <p className="text-neutral-gray text-xs mt-1.5 font-body leading-relaxed">
                                Changing this repoints the link for everyone who has it, including people who already
                                tapped it. The short address itself stays the same.
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-dark dark:text-neutral-light mb-1.5 font-body">
                            Stop working on
                        </label>
                        <input
                            type="date"
                            value={expiresOn}
                            onChange={(e) => setExpiresOn(e.target.value)}
                            className="w-full rounded-2xl border border-brown-light/25 bg-white dark:bg-brand-darker px-4 py-3 text-sm font-body text-text-dark dark:text-text-light focus:outline-none focus:border-primary"
                        />
                        <p className="text-neutral-gray text-xs mt-1.5 font-body leading-relaxed">
                            Leave this empty for a link that never expires. Set it for a promo, so somebody forwarding
                            the message in November does not land on an offer that ended in August.
                        </p>
                    </div>

                    {editing && link && (
                        <div className="rounded-2xl bg-neutral-light dark:bg-brand-darker px-4 py-3">
                            <p className="text-neutral-gray text-xs font-body">The short address</p>
                            <p className="text-text-dark dark:text-text-light text-sm font-mono mt-1 break-all">
                                {link.sms_url}
                            </p>
                            <p className="text-neutral-gray text-xs font-body mt-1.5">
                                {link.click_count.toLocaleString()} tap{link.click_count === 1 ? '' : 's'} so far
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
                            {editing ? 'Save' : 'Create link'}
                        </button>
                    </div>

                    {editing && (
                        <div className="pt-2 border-t border-[#f0e8d8] dark:border-brown-light/20">
                            {confirmingDelete ? (
                                <div className="flex flex-col gap-2 pt-3">
                                    <p className="text-neutral-gray text-xs font-body leading-relaxed">
                                        Deleting takes the tap count with it, and anyone who still has the message will
                                        land on the home page. Setting an expiry above keeps the history.
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setConfirmingDelete(false)}
                                            className="flex-1 rounded-xl border border-brown-light/25 text-text-dark dark:text-text-light text-sm font-medium font-body py-2.5"
                                        >
                                            Keep it
                                        </button>
                                        <button
                                            type="button"
                                            onClick={destroy}
                                            disabled={saving}
                                            className="flex-1 rounded-xl bg-error hover:bg-error/90 disabled:opacity-60 text-white text-sm font-semibold font-body py-2.5 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setConfirmingDelete(true)}
                                    className="flex items-center gap-2 pt-3 text-neutral-gray hover:text-error text-sm font-medium font-body transition-colors"
                                >
                                    <TrashIcon size={15} />
                                    Delete this link
                                </button>
                            )}
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
