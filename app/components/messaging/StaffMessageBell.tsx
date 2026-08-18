'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BellIcon, CheckCircleIcon, RobotIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useStaffAuthOptional } from '@/app/components/providers/StaffAuthProvider';
import { useStaffInbox } from '@/lib/api/hooks/useStaffInbox';
import type { InboxMessage } from '@/types/messaging';

/**
 * The bell. Notices live here and never interrupt anything.
 *
 * Cautions appear here too, but the interstitial is what actually puts them in
 * front of somebody — the bell alone is opt-in attention, and the whole point of
 * a caution is that it is not.
 */
export function StaffMessageBell({ className }: { className?: string }) {
    const staffAuth = useStaffAuthOptional();
    const userId = staffAuth?.staffUser?.user_id ?? null;
    const { summary, messages, reply } = useStaffInbox(userId);
    const [open, setOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    // Close on an outside click. Without it the panel sits over the order board
    // and the next tap lands on whatever is behind it.
    useEffect(() => {
        if (!open) return;

        function onPointerDown(event: MouseEvent) {
            if (!panelRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        }

        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, [open]);

    if (!staffAuth?.staffUser) return null;

    const unread = summary.unread;

    return (
        <div className={`relative ${className ?? ''}`} ref={panelRef}>
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-label={`Messages: ${unread} unread`}
                className="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-neutral-light transition-colors cursor-pointer"
            >
                <BellIcon
                    size={20}
                    weight={unread > 0 ? 'fill' : 'regular'}
                    className={unread > 0 ? 'text-primary' : 'text-neutral-gray'}
                />
                {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-4.5 h-4.5 px-1 rounded-full bg-error text-white text-[10px] font-bold font-body leading-none">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[70vh] overflow-y-auto rounded-2xl bg-neutral-card shadow-lg border border-black/5 z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-black/5">
                        <p className="font-body font-semibold text-sm text-brand-dark">Messages</p>
                        <Link
                            href="/staff/messages"
                            onClick={() => setOpen(false)}
                            className="text-xs font-body text-primary hover:underline"
                        >
                            See all
                        </Link>
                    </div>

                    {messages.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm font-body text-neutral-gray">
                            Nothing here yet.
                        </p>
                    ) : (
                        <ul className="divide-y divide-black/5">
                            {messages.slice(0, 8).map((message) => (
                                <BellRow
                                    key={message.id}
                                    message={message}
                                    onQuickReply={(text) =>
                                        reply({ recipientId: message.id, quick_reply: text })
                                    }
                                    onOpen={() => setOpen(false)}
                                />
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

function BellRow({
    message,
    onQuickReply,
    onOpen,
}: {
    message: InboxMessage;
    onQuickReply: (text: string) => void;
    onOpen: () => void;
}) {
    const isUnread = message.read_at === null;

    return (
        <li className={isUnread ? 'bg-primary-light/20' : ''}>
            <Link
                href={`/staff/messages/${message.id}`}
                onClick={onOpen}
                className="block px-4 py-3 hover:bg-neutral-light/60 transition-colors"
            >
                <div className="flex items-start gap-2">
                    {message.kind === 'caution' ? (
                        <WarningCircleIcon size={16} weight="fill" className="text-warning mt-0.5 shrink-0" />
                    ) : (
                        <CheckCircleIcon size={16} className="text-neutral-gray mt-0.5 shrink-0" />
                    )}

                    <div className="min-w-0 flex-1">
                        {message.subject && (
                            <p className="font-body text-sm font-semibold text-brand-dark truncate">
                                {message.subject}
                            </p>
                        )}
                        <p className="font-body text-xs text-neutral-gray line-clamp-2 mt-0.5">
                            {message.body}
                        </p>
                        <p className="font-body text-[11px] text-neutral-gray/80 mt-1 flex items-center gap-1">
                            {/* A rule sent it, not a person. Saying so stops an
                                automatic caution reading as a personal rebuke. */}
                            {message.is_automatic && <RobotIcon size={12} />}
                            {message.is_automatic ? 'Automatic' : message.sender_name}
                        </p>
                    </div>
                </div>
            </Link>

            {/* Quick replies inline, so "Got it" costs one tap from the bell
                rather than opening the message and finding the button. */}
            {message.replied_at === null && message.quick_replies.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                    {message.quick_replies.map((text) => (
                        <button
                            key={text}
                            type="button"
                            onClick={(event) => {
                                event.preventDefault();
                                onQuickReply(text);
                            }}
                            className="px-2.5 py-1 rounded-full border border-black/10 bg-neutral-light/60 text-[11px] font-body text-brand-dark hover:bg-primary-light transition-colors cursor-pointer"
                        >
                            {text}
                        </button>
                    ))}
                </div>
            )}
        </li>
    );
}
