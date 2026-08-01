'use client';

import { useState } from 'react';
import { XIcon, SpinnerGapIcon, WarningCircleIcon, TrashIcon } from '@phosphor-icons/react';
import Input from '@/app/components/base/Input';
import { recruitmentService } from '@/lib/api/services/recruitment.service';
import type { RecruitmentLink } from '@/types/recruitment';

/** `expires_at` is an ISO instant; the date input wants a plain day. */
function toDateInput(iso: string): string {
    return new Date(iso).toISOString().slice(0, 10);
}

/**
 * Editing a posting that is already out there.
 *
 * Two things only: what you call it, and when it closes. The kind and the
 * branch are shown but fixed — people already have this URL, and moving the
 * branch would hand every pending applicant to a branch they never chose.
 * The server refuses to read either field, so this is not the only guard.
 */
export function EditLinkDialog({
    link,
    onClose,
    onChanged,
}: {
    link: RecruitmentLink;
    onClose: () => void;
    onChanged: () => void;
}) {
    const [label, setLabel] = useState(link.label ?? '');
    const [expiresOn, setExpiresOn] = useState(toDateInput(link.expires_at));

    const [busy, setBusy] = useState<'save' | 'close' | 'delete' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    const hasApplications = (link.applications_count ?? 0) > 0;

    async function run(action: 'save' | 'close' | 'delete', work: () => Promise<unknown>) {
        setBusy(action);
        setError(null);

        try {
            await work();
            onChanged();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'That did not work.');
            setBusy(null);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8 overflow-y-auto">
            <div className="w-full max-w-md bg-white dark:bg-brand-dark rounded-3xl shadow-xl border border-brown-light/20">

                <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[#f0e8d8] dark:border-brown-light/20">
                    <div>
                        <h2 className="text-text-dark dark:text-text-light text-lg font-semibold font-body">
                            {link.posting}
                        </h2>
                        <p className="text-neutral-gray text-sm font-body">
                            {link.kind_label} posting
                            {link.applications_count !== undefined
                                && ` · ${link.applications_count} application${link.applications_count === 1 ? '' : 's'}`}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-neutral-gray hover:text-text-dark transition-colors">
                        <XIcon size={20} />
                    </button>
                </div>

                <div className="px-6 py-5 flex flex-col gap-5">

                    {error && (
                        <div className="flex items-start gap-3 bg-error/10 border border-error/30 rounded-2xl px-4 py-3">
                            <WarningCircleIcon size={18} weight="fill" className="text-error shrink-0 mt-0.5" />
                            <p className="text-error text-sm font-body leading-snug">{error}</p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-text-dark dark:text-neutral-light mb-1.5 font-body">
                            Name it
                        </label>
                        <Input value={label} onChange={setLabel} placeholder="Lakeside November intake" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-dark dark:text-neutral-light mb-1.5 font-body">
                            Closes on
                        </label>
                        <input
                            type="date"
                            value={expiresOn}
                            onChange={(e) => setExpiresOn(e.target.value)}
                            className="w-full rounded-2xl border border-brown-light/25 bg-white dark:bg-brand-darker px-4 py-3 text-sm font-body text-text-dark dark:text-text-light focus:outline-none focus:border-primary"
                        />
                        <p className="text-neutral-gray text-xs mt-1.5 font-body leading-relaxed">
                            Move it forward to reopen a closed posting, or back to shut one early.
                        </p>
                    </div>

                    <div className="rounded-2xl bg-neutral-light dark:bg-brand-darker px-4 py-3">
                        <p className="text-neutral-gray text-xs font-body leading-relaxed">
                            The branch and the type cannot change. People already have this link, and some may
                            have applied through it — switching the branch would move them to one they never
                            applied to. If it was set up wrong, close it and make a new one.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={busy !== null}
                            className="flex-1 rounded-2xl border border-brown-light/25 text-text-dark dark:text-text-light text-sm font-semibold font-body py-3 hover:bg-neutral-light dark:hover:bg-brand-darker transition-colors disabled:opacity-60"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => run('save', () => recruitmentService.updateLink(link.id, {
                                label: label.trim() || null,
                                expires_at: new Date(`${expiresOn}T23:59:59`).toISOString(),
                            }))}
                            disabled={busy !== null}
                            className="flex-1 rounded-2xl bg-primary hover:bg-primary-hover disabled:opacity-60 text-white text-sm font-semibold font-body py-3 transition-colors flex items-center justify-center gap-2"
                        >
                            {busy === 'save' && <SpinnerGapIcon size={16} className="animate-spin" />}
                            Save changes
                        </button>
                    </div>

                    {!link.is_expired && (
                        <button
                            onClick={() => run('close', () => recruitmentService.updateLink(link.id, {
                                // A moment ago, so the link is shut the instant this returns.
                                expires_at: new Date(Date.now() - 60_000).toISOString(),
                            }))}
                            disabled={busy !== null}
                            className="rounded-2xl border border-brown-light/25 text-text-dark dark:text-text-light text-sm font-semibold font-body py-3 hover:bg-neutral-light dark:hover:bg-brand-darker transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                            {busy === 'close' && <SpinnerGapIcon size={16} className="animate-spin" />}
                            Close this posting now
                        </button>
                    )}

                    <div className="border-t border-[#f0e8d8] dark:border-brown-light/20 pt-4">
                        {hasApplications ? (
                            <p className="text-neutral-gray text-xs font-body leading-relaxed">
                                This posting can&rsquo;t be deleted — {link.applications_count} application
                                {link.applications_count === 1 ? '' : 's'} came through it, and deleting it would
                                take {link.applications_count === 1 ? 'it' : 'them'} too. Close it instead.
                            </p>
                        ) : (
                            <>
                                <button
                                    onClick={() => (confirmingDelete
                                        ? run('delete', () => recruitmentService.deleteLink(link.id))
                                        : setConfirmingDelete(true))}
                                    disabled={busy !== null}
                                    className={`w-full rounded-2xl border text-sm font-semibold font-body py-3 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 ${
                                        confirmingDelete
                                            ? 'border-error bg-error/10 text-error'
                                            : 'border-brown-light/25 text-neutral-gray hover:text-error hover:border-error/40'
                                    }`}
                                >
                                    {busy === 'delete'
                                        ? <SpinnerGapIcon size={16} className="animate-spin" />
                                        : <TrashIcon size={15} />}
                                    {confirmingDelete ? 'Yes, delete it' : 'Delete this posting'}
                                </button>
                                {confirmingDelete && (
                                    <p className="text-neutral-gray text-xs font-body text-center mt-2">
                                        The link stops working immediately. Nobody has applied, so nothing is lost.
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
