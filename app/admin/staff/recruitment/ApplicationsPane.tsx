'use client';

import { useState } from 'react';
import {
    UsersThreeIcon,
    CaretRightIcon,
    SpinnerGapIcon,
    WarningCircleIcon,
} from '@phosphor-icons/react';
import { recruitmentService } from '@/lib/api/services/recruitment.service';
import { rolesForKind, type RecruitmentApplication } from '@/types/recruitment';
import { EmptyState } from './LinksPane';

function roleLabel(role: string): string {
    return role.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function whenSubmitted(iso?: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * New staff waiting to be switched on.
 *
 * Waiting by default — everything else is history. Creating the account happens
 * there and then, so the role picker only offers what the link may appoint, and
 * there is no branch control anywhere: the branch comes from the link.
 */
export function ApplicationsPane({
    applications,
    showHistory,
    onToggleHistory,
    onChanged,
}: {
    applications: RecruitmentApplication[];
    showHistory: boolean;
    onToggleHistory: (value: boolean) => void;
    onChanged: () => void;
}) {
    const [open, setOpen] = useState<RecruitmentApplication | null>(null);

    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <p className="text-neutral-gray text-sm font-body">
                    {applications.length} {showHistory ? 'in total' : 'waiting to be added'}
                </p>
                <label className="flex items-center gap-2 text-sm font-body text-neutral-gray cursor-pointer">
                    <input
                        type="checkbox"
                        checked={showHistory}
                        onChange={(e) => onToggleHistory(e.target.checked)}
                        className="accent-primary"
                    />
                    Show everyone
                </label>
            </div>

            {applications.length === 0 ? (
                <EmptyState
                    icon={<UsersThreeIcon size={40} className="text-neutral-gray/50" />}
                    title={showHistory ? 'Nobody here yet' : 'Nobody waiting'}
                    note="New staff appear here as they fill in the form you sent them."
                />
            ) : (
                <div className="flex flex-col gap-2">
                    {applications.map((application) => (
                        <button
                            key={application.id}
                            onClick={() => setOpen(application)}
                            className="flex items-center justify-between gap-4 rounded-2xl border border-brown-light/25 bg-white dark:bg-brand-dark px-5 py-4 text-left hover:border-primary/40 transition-colors"
                        >
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-text-dark dark:text-text-light font-semibold font-body truncate">
                                        {application.name}
                                    </h3>
                                    <StatusChip status={application.status} label={application.status_label} />
                                </div>
                                <p className="text-neutral-gray text-sm mt-0.5 font-body">
                                    {application.phone}
                                    {application.link && ` · ${application.link.posting}`}
                                    {application.submitted_at && ` · ${whenSubmitted(application.submitted_at)}`}
                                </p>
                            </div>
                            <CaretRightIcon size={18} className="text-neutral-gray shrink-0" />
                        </button>
                    ))}
                </div>
            )}

            {open && (
                <ApplicationDialog
                    application={open}
                    onClose={() => setOpen(null)}
                    onDecided={() => { setOpen(null); onChanged(); }}
                />
            )}
        </>
    );
}

function StatusChip({ status, label }: { status: string; label: string }) {
    const tone =
        status === 'approved' ? 'bg-secondary/15 text-secondary'
        : status === 'rejected' ? 'bg-neutral-gray/15 text-neutral-gray'
        : 'bg-primary/15 text-primary';

    return (
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold font-body shrink-0 ${tone}`}>
            {label}
        </span>
    );
}

function ApplicationDialog({
    application,
    onClose,
    onDecided,
}: {
    application: RecruitmentApplication;
    onClose: () => void;
    onDecided: () => void;
}) {
    // Prefer what the server said this posting may appoint; fall back to the
    // local rules only if an older response did not carry them.
    const roles =
        application.link?.assignable_roles?.map((r) => r.value)
        ?? (application.link ? rolesForKind(application.link.kind) : []);

    const [role, setRole] = useState<string>(roles[0] ?? '');
    const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [confirmingReject, setConfirmingReject] = useState(false);

    const decided = application.status !== 'pending';

    async function act(action: 'approve' | 'reject') {
        setBusy(action);
        setError(null);

        try {
            if (action === 'approve') await recruitmentService.approve(application.id, role);
            else await recruitmentService.reject(application.id);

            onDecided();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'That did not work.');
            setBusy(null);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-8 overflow-y-auto">
            <div className="w-full max-w-lg bg-white dark:bg-brand-dark rounded-3xl shadow-xl border border-brown-light/20">

                <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[#f0e8d8] dark:border-brown-light/20">
                    <div>
                        <h2 className="text-text-dark dark:text-text-light text-lg font-semibold font-body">
                            {application.name}
                        </h2>
                        <p className="text-neutral-gray text-sm font-body">
                            Joining {application.link?.posting ?? 'CediBites'}
                            {application.submitted_at && ` · sent ${whenSubmitted(application.submitted_at)}`}
                        </p>
                    </div>
                    <StatusChip status={application.status} label={application.status_label} />
                </div>

                <div className="px-6 py-5 flex flex-col gap-5">

                    {error && (
                        <div className="flex items-start gap-3 bg-error/10 border border-error/30 rounded-2xl px-4 py-3">
                            <WarningCircleIcon size={18} weight="fill" className="text-error shrink-0 mt-0.5" />
                            <p className="text-error text-sm font-body">{error}</p>
                        </div>
                    )}

                    <DetailGroup title="Contact">
                        <Detail label="Phone" value={application.phone} />
                        <Detail label="Email" value={application.email} />
                    </DetailGroup>

                    <DetailGroup title="About them">
                        <Detail label="Date of birth" value={application.date_of_birth} />
                        <Detail label="Nationality" value={application.nationality} />
                        <Detail label="Ghana Card" value={application.ghana_card_id} />
                    </DetailGroup>

                    <DetailGroup title="Emergency contact">
                        <Detail label="Name" value={application.emergency_contact_name} />
                        <Detail label="Phone" value={application.emergency_contact_phone} />
                        <Detail label="Relationship" value={application.emergency_contact_relationship} />
                    </DetailGroup>

                    {decided ? (
                        <p className="text-neutral-gray text-sm font-body">
                            {application.status_label}
                            {application.reviewed_by && ` by ${application.reviewed_by}`}.
                        </p>
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-text-dark dark:text-neutral-light mb-1.5 font-body">
                                    Add them as
                                </label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full rounded-2xl border border-brown-light/25 bg-white dark:bg-brand-darker px-4 py-3 text-sm font-body text-text-dark dark:text-text-light focus:outline-none focus:border-primary"
                                >
                                    {roles.map((r) => (
                                        <option key={r} value={r}>{roleLabel(r)}</option>
                                    ))}
                                </select>
                                <p className="text-neutral-gray text-xs mt-1.5 font-body leading-relaxed">
                                    {application.link?.kind === 'call_center'
                                        ? 'Call centre staff belong to no branch — they take calls for all of them.'
                                        : `They will be assigned to ${application.link?.posting}, from the link they were sent.`}
                                </p>
                            </div>

                            <div className="rounded-2xl bg-neutral-light dark:bg-brand-darker px-4 py-3">
                                <p className="text-neutral-gray text-xs font-body leading-relaxed">
                                    This creates their account straight away and sends them a message. They sign in
                                    with the password they chose on the form — nobody here can read it, so there is
                                    nothing to pass on.
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => (confirmingReject ? act('reject') : setConfirmingReject(true))}
                                    disabled={busy !== null}
                                    className={`flex-1 rounded-2xl border text-sm font-semibold font-body py-3 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 ${
                                        confirmingReject
                                            ? 'border-error bg-error/10 text-error'
                                            : 'border-brown-light/25 text-text-dark dark:text-text-light hover:bg-neutral-light dark:hover:bg-brand-darker'
                                    }`}
                                >
                                    {busy === 'reject' && <SpinnerGapIcon size={16} className="animate-spin" />}
                                    {confirmingReject ? 'Yes, discard' : 'Discard'}
                                </button>
                                <button
                                    onClick={() => act('approve')}
                                    disabled={busy !== null || !role}
                                    className="flex-1 rounded-2xl bg-primary hover:bg-primary-hover disabled:opacity-60 text-white text-sm font-semibold font-body py-3 transition-colors flex items-center justify-center gap-2"
                                >
                                    {busy === 'approve' && <SpinnerGapIcon size={16} className="animate-spin" />}
                                    Create their account
                                </button>
                            </div>

                            {confirmingReject && (
                                /* Discarding is for a duplicate, a wrong number, or
                                   somebody who did not end up starting — not a
                                   judgement on the person, who was taken on before
                                   the link was ever sent. */
                                <p className="text-neutral-gray text-xs font-body text-center -mt-2">
                                    Use this for a duplicate or a mistake. They are told nothing, and their
                                    details stay on record.
                                </p>
                            )}
                        </>
                    )}

                    <button
                        onClick={onClose}
                        className="text-neutral-gray text-sm font-body hover:text-text-dark transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

function DetailGroup({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <h3 className="text-neutral-gray text-xs font-semibold font-body uppercase tracking-wide mb-2">
                {title}
            </h3>
            <dl className="flex flex-col gap-1.5">{children}</dl>
        </div>
    );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
    return (
        <div className="flex items-baseline justify-between gap-4">
            <dt className="text-neutral-gray text-sm font-body shrink-0">{label}</dt>
            <dd className="text-text-dark dark:text-text-light text-sm font-body text-right wrap-break-word">
                {value || <span className="text-neutral-gray/60">Not given</span>}
            </dd>
        </div>
    );
}
