'use client';

import { useState } from 'react';
import {
    CopyIcon,
    CheckIcon,
    LinkSimpleIcon,
    BuildingsIcon,
    HeadsetIcon,
    PencilSimpleIcon,
} from '@phosphor-icons/react';
import type { RecruitmentLink } from '@/types/recruitment';
import { EditLinkDialog } from './EditLinkDialog';

function recruitUrl(token: string): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/recruit/${token}`;
}

function daysLeft(expiresAt: string): number {
    return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
}

/**
 * The links you have out.
 *
 * Expired rows are greyed rather than hidden — you still want to see what you
 * sent out, and who came through it.
 */
export function LinksPane({ links, onChanged }: { links: RecruitmentLink[]; onChanged: () => void }) {
    const [editing, setEditing] = useState<RecruitmentLink | null>(null);

    if (links.length === 0) {
        return (
            <EmptyState
                icon={<LinkSimpleIcon size={40} className="text-neutral-gray/50" />}
                title="No links yet"
                note="Make one, send it to your new staff, and their details land in the next tab."
            />
        );
    }

    return (
        <>
            <div className="flex flex-col gap-3">
                {links.map((link) => (
                    <LinkRow key={link.id} link={link} onEdit={() => setEditing(link)} />
                ))}
            </div>

            {editing && (
                <EditLinkDialog
                    link={editing}
                    onClose={() => setEditing(null)}
                    onChanged={() => { setEditing(null); onChanged(); }}
                />
            )}
        </>
    );
}

function LinkRow({ link, onEdit }: { link: RecruitmentLink; onEdit: () => void }) {
    const [copied, setCopied] = useState(false);
    const remaining = daysLeft(link.expires_at);

    async function copy() {
        try {
            await navigator.clipboard.writeText(recruitUrl(link.token));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* clipboard blocked — the URL is visible on screen anyway */
        }
    }

    return (
        <div
            className={`rounded-2xl border bg-white dark:bg-brand-dark px-5 py-4 ${
                link.is_expired ? 'border-brown-light/15 opacity-60' : 'border-brown-light/25'
            }`}
        >
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        {link.kind === 'call_center'
                            ? <HeadsetIcon size={18} weight="fill" className="text-secondary shrink-0" />
                            : <BuildingsIcon size={18} weight="fill" className="text-primary shrink-0" />}
                        <h3 className="text-text-dark dark:text-text-light font-semibold font-body truncate">
                            {link.posting}
                        </h3>
                        {link.is_expired && (
                            <span className="rounded-full bg-neutral-gray/15 text-neutral-gray text-xs font-semibold px-2 py-0.5 font-body">
                                Closed
                            </span>
                        )}
                    </div>

                    {link.label && (
                        <p className="text-neutral-gray text-sm mt-0.5 font-body truncate">{link.label}</p>
                    )}

                    <p className="text-neutral-gray text-xs mt-2 font-body">
                        {link.is_expired
                            ? `Closed ${new Date(link.expires_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })}`
                            : `Closes in ${remaining} day${remaining === 1 ? '' : 's'}`}
                        {link.applications_count !== undefined && (
                            <>
                                {' · '}
                                {link.applications_count} sent in
                                {!!link.pending_applications_count && (
                                    <span className="text-primary font-semibold">
                                        {' '}({link.pending_applications_count} waiting)
                                    </span>
                                )}
                            </>
                        )}
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {!link.is_expired && (
                        <button
                            onClick={copy}
                            className="flex items-center gap-2 rounded-xl border border-brown-light/25 px-3 py-2 text-sm font-medium font-body text-text-dark dark:text-text-light hover:bg-neutral-light dark:hover:bg-brand-darker transition-colors"
                        >
                            {copied ? <CheckIcon size={15} weight="bold" className="text-secondary" /> : <CopyIcon size={15} />}
                            {copied ? 'Copied' : 'Copy link'}
                        </button>
                    )}

                    {/* Available on closed links too — this is how one is
                        reopened, and how a spent one is deleted. */}
                    <button
                        onClick={onEdit}
                        aria-label={`Edit the ${link.posting} link`}
                        className="flex items-center gap-2 rounded-xl border border-brown-light/25 px-3 py-2 text-sm font-medium font-body text-neutral-gray hover:text-text-dark dark:hover:text-text-light hover:bg-neutral-light dark:hover:bg-brand-darker transition-colors"
                    >
                        <PencilSimpleIcon size={15} />
                        Edit
                    </button>
                </div>
            </div>

            {!link.is_expired && (
                <p className="mt-3 text-neutral-gray text-xs font-mono break-all bg-neutral-light dark:bg-brand-darker rounded-xl px-3 py-2">
                    {recruitUrl(link.token)}
                </p>
            )}
        </div>
    );
}

export function EmptyState({
    icon, title, note,
}: {
    icon: React.ReactNode;
    title: string;
    note: string;
}) {
    return (
        <div className="flex flex-col items-center text-center py-20">
            {icon}
            <h3 className="text-text-dark dark:text-text-light font-semibold font-body mt-4">{title}</h3>
            <p className="text-neutral-gray text-sm mt-1.5 font-body max-w-sm">{note}</p>
        </div>
    );
}
