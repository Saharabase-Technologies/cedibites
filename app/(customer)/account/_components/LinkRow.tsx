'use client';

import { CaretRightIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import React from 'react';

/**
 * One way into something: an icon, what it is, and a caret.
 *
 * The version before put a grey Change beside every value, five of them down the
 * right edge of one phone screen, and the client said the side buttons did not
 * work. Every row here goes somewhere instead and the whole row is what you tap.
 * The caret is a mark, not a second button, so nothing stands in a column at
 * the edge.
 *
 * The icon sits in the same tile as the saved places at checkout.
 */
export default function LinkRow({ href, icon, title, badge, sub, active, external }: {
    href: string;
    icon: React.ReactNode;
    title: string;
    badge?: React.ReactNode;
    sub?: React.ReactNode;
    /** The screen showing beside the column on a desk. */
    active?: boolean;
    /** A call, a chat or an email, which leave the app. */
    external?: boolean;
}) {
    const body = (
        <>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-fg/5 text-fg">{icon}</span>
            <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="min-w-0 text-[15px] font-bold leading-snug break-words text-fg">{title}</span>
                    {badge}
                </span>
                {sub && <span className="mt-0.5 block text-[13px] leading-snug break-words text-fg-muted">{sub}</span>}
            </span>
            <CaretRightIcon
                size={16}
                weight="bold"
                aria-hidden
                className="shrink-0 text-fg-subtle transition-colors duration-150 ease-out group-hover:text-fg"
            />
        </>
    );

    const cls = `group flex min-h-15 w-full items-center gap-3.5 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 ease-out ${
        active ? 'bg-surface-sunken' : 'hover:bg-surface-sunken'
    }`;

    if (external) {
        // A web link, like WhatsApp's, opens beside the app. A call or an email
        // hands over to the phone and needs no new tab.
        const web = href.startsWith('http');
        return (
            <a href={href} target={web ? '_blank' : undefined} rel={web ? 'noopener noreferrer' : undefined} className={cls}>
                {body}
            </a>
        );
    }

    return (
        <Link href={href} aria-current={active ? 'page' : undefined} className={cls}>
            {body}
        </Link>
    );
}
