'use client';

import { useState } from 'react';
import { XIcon, SpinnerGapIcon, WarningCircleIcon } from '@phosphor-icons/react';
import Input from '@/app/components/base/Input';
import { useBranchesApi } from '@/lib/api/hooks/useBranchesApi';
import { recruitmentService } from '@/lib/api/services/recruitment.service';
import { rolesForKind, type RecruitmentLinkKind } from '@/types/recruitment';

/** Default life of a link. Short on purpose — see the note in the dialog. */
const DEFAULT_DAYS = 30;

function isoDaysFromNow(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

/**
 * Opening a posting.
 *
 * The kind is the only decision that matters and it cannot be changed later:
 * a branch posting stamps its branch on whoever is approved, a call-centre
 * posting deliberately stamps nothing, because the call centre serves every
 * branch and belongs to none.
 */
export function CreateLinkDialog({
    onClose,
    onCreated,
}: {
    onClose: () => void;
    onCreated: () => void;
}) {
    const { branches } = useBranchesApi();

    const [kind, setKind] = useState<RecruitmentLinkKind>('branch');
    const [branchId, setBranchId] = useState<number | null>(null);
    const [label, setLabel] = useState('');
    const [expiresOn, setExpiresOn] = useState(isoDaysFromNow(DEFAULT_DAYS));

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const roles = rolesForKind(kind);

    async function submit(event: React.FormEvent) {
        event.preventDefault();

        if (kind === 'branch' && !branchId) {
            setError('Pick the branch this posting is for.');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await recruitmentService.createLink({
                kind,
                // Null for the call centre, and that null is the point.
                branch_id: kind === 'branch' ? branchId : null,
                label: label.trim() || null,
                // End of the chosen day, so a link dated today is still open today.
                expires_at: new Date(`${expiresOn}T23:59:59`).toISOString(),
            });

            onCreated();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Could not create the link.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8 overflow-y-auto">
            <div className="w-full max-w-md bg-white dark:bg-brand-dark rounded-3xl shadow-xl border border-brown-light/20">

                <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0e8d8] dark:border-brown-light/20">
                    <h2 className="text-text-dark dark:text-text-light text-lg font-semibold font-body">
                        New posting
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
                        <label className="block text-sm font-medium text-text-dark dark:text-neutral-light mb-2 font-body">
                            What are you hiring for?
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <KindOption
                                selected={kind === 'branch'}
                                onSelect={() => setKind('branch')}
                                title="A branch"
                                note="Sales staff, kitchen, riders, a manager."
                            />
                            <KindOption
                                selected={kind === 'call_center'}
                                onSelect={() => { setKind('call_center'); setBranchId(null); }}
                                title="Call centre"
                                note="Takes calls for every branch. No branch of their own."
                            />
                        </div>
                    </div>

                    {kind === 'branch' && (
                        <div>
                            <label className="block text-sm font-medium text-text-dark dark:text-neutral-light mb-1.5 font-body">
                                Branch <span className="text-primary">*</span>
                            </label>
                            <select
                                value={branchId ?? ''}
                                onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : null)}
                                className="w-full rounded-2xl border border-brown-light/25 bg-white dark:bg-brand-darker px-4 py-3 text-sm font-body text-text-dark dark:text-text-light focus:outline-none focus:border-primary"
                            >
                                <option value="">Choose a branch…</option>
                                {branches.map((b) => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-text-dark dark:text-neutral-light mb-1.5 font-body">
                            Name it
                        </label>
                        <Input
                            value={label}
                            onChange={setLabel}
                            placeholder="Lakeside November intake"
                        />
                        <p className="text-neutral-gray text-xs mt-1.5 font-body">
                            Only you see this. It makes the list readable later.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-dark dark:text-neutral-light mb-1.5 font-body">
                            Closes on <span className="text-primary">*</span>
                        </label>
                        <input
                            type="date"
                            value={expiresOn}
                            min={isoDaysFromNow(1)}
                            onChange={(e) => setExpiresOn(e.target.value)}
                            className="w-full rounded-2xl border border-brown-light/25 bg-white dark:bg-brand-darker px-4 py-3 text-sm font-body text-text-dark dark:text-text-light focus:outline-none focus:border-primary"
                        />
                        <p className="text-neutral-gray text-xs mt-1.5 font-body leading-relaxed">
                            This is the only thing that shuts the link — there is no close button and no limit on
                            how many people can apply. Keep it short and make a new one next time you hire.
                        </p>
                    </div>

                    <div className="rounded-2xl bg-neutral-light dark:bg-brand-darker px-4 py-3">
                        <p className="text-neutral-gray text-xs font-body mb-1.5">
                            Roles you&rsquo;ll be able to appoint from this posting:
                        </p>
                        <p className="text-text-dark dark:text-text-light text-xs font-body">
                            {roles.length > 0 ? roles.map(roleLabel).join(' · ') : '—'}
                        </p>
                    </div>

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
                            Create link
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function roleLabel(role: string): string {
    return role
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

function KindOption({
    selected, onSelect, title, note,
}: {
    selected: boolean;
    onSelect: () => void;
    title: string;
    note: string;
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`text-left rounded-2xl border px-3.5 py-3 transition-colors ${
                selected
                    ? 'border-primary bg-primary/5'
                    : 'border-brown-light/25 hover:border-neutral-gray/40'
            }`}
        >
            <p className={`text-sm font-semibold font-body ${selected ? 'text-primary' : 'text-text-dark dark:text-text-light'}`}>
                {title}
            </p>
            <p className="text-neutral-gray text-xs mt-1 font-body leading-snug">{note}</p>
        </button>
    );
}
