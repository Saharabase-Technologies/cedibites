'use client';

import { useState } from 'react';
import {
    CopyIcon,
    CheckIcon,
    CursorClickIcon,
    PencilSimpleIcon,
    ArrowSquareOutIcon,
    WarningCircleIcon,
} from '@phosphor-icons/react';
import type { ShortLink } from '@/types/marketing';

/**
 * One link.
 *
 * The copy button copies the SMS form — no scheme — because that is the form
 * that goes in a message and the eight characters `https://` costs are the whole
 * margin on a message sitting at 161.
 */
export function LinkRow({ link, onEdit }: { link: ShortLink; onEdit: () => void }) {
    const [copied, setCopied] = useState(false);

    async function copy() {
        try {
            await navigator.clipboard.writeText(link.sms_url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* clipboard blocked — the link is on screen anyway */
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
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-text-dark dark:text-text-light font-semibold font-body truncate">
                            {link.label}
                        </h3>
                        {link.is_expired && (
                            <span className="rounded-full bg-neutral-gray/15 text-neutral-gray text-xs font-semibold px-2 py-0.5 font-body">
                                Expired
                            </span>
                        )}
                        {link.is_external && (
                            /* Our brand pointing at somebody else's page. Worth
                               seeing at a glance, because a branded short domain
                               is trusted by carriers in a way bit.ly is not. */
                            <span className="flex items-center gap-1 rounded-full bg-warning/15 text-warning text-xs font-semibold px-2 py-0.5 font-body">
                                <WarningCircleIcon size={11} weight="fill" />
                                Off-site
                            </span>
                        )}
                    </div>

                    <a
                        href={link.target_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-neutral-gray hover:text-primary text-sm mt-1 font-body truncate max-w-full transition-colors"
                    >
                        <span className="truncate">{link.target_url}</span>
                        <ArrowSquareOutIcon size={13} className="shrink-0" />
                    </a>

                    <p className="text-neutral-gray text-xs mt-2 font-body flex items-center gap-1.5">
                        <CursorClickIcon size={13} weight="fill" className="text-primary/70" />
                        {link.click_count.toLocaleString()} tap{link.click_count === 1 ? '' : 's'}
                        {link.expires_at && (
                            <>
                                {' · '}
                                {link.is_expired ? 'Expired' : 'Expires'}{' '}
                                {new Date(link.expires_at).toLocaleDateString('en-GH', {
                                    day: 'numeric',
                                    month: 'short',
                                })}
                            </>
                        )}
                        {link.created_by && ` · by ${link.created_by}`}
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={copy}
                        className="flex items-center gap-2 rounded-xl border border-brown-light/25 px-3 py-2 text-sm font-medium font-body text-text-dark dark:text-text-light hover:bg-neutral-light dark:hover:bg-brand-darker transition-colors"
                    >
                        {copied ? <CheckIcon size={15} weight="bold" className="text-secondary" /> : <CopyIcon size={15} />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>

                    <button
                        onClick={onEdit}
                        aria-label={`Edit ${link.label}`}
                        className="flex items-center gap-2 rounded-xl border border-brown-light/25 px-3 py-2 text-sm font-medium font-body text-neutral-gray hover:text-text-dark dark:hover:text-text-light hover:bg-neutral-light dark:hover:bg-brand-darker transition-colors"
                    >
                        <PencilSimpleIcon size={15} />
                        Edit
                    </button>
                </div>
            </div>

            <p className="mt-3 text-text-dark dark:text-text-light text-xs font-mono break-all bg-neutral-light dark:bg-brand-darker rounded-xl px-3 py-2">
                {link.sms_url}
                <span className="text-neutral-gray ml-2">· {link.sms_url.length} characters</span>
            </p>
        </div>
    );
}
