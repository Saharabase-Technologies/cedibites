'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BellIcon, ChatCircleTextIcon, RobotIcon, WarningCircleIcon } from '@phosphor-icons/react';
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
export function StaffMessageBell({
    className,
    align = 'right',
}: {
    className?: string;
    /**
     * Which edge the panel hangs from.
     *
     * `right` suits a bell in the top-right of a full-width header. In the
     * 224px-wide desktop sidebar it is wrong and badly so: the panel is 320px,
     * so anchoring its right edge to the bell puts its left edge at roughly
     * -112px and the first two words of every message are off the screen.
     * Sidebar callers pass `left` and the panel opens rightward over the page.
     */
    align?: 'left' | 'right';
}) {
    const staffAuth = useStaffAuthOptional();
    const userId = staffAuth?.staffUser?.user_id ?? null;
    const { summary, messages } = useStaffInbox(userId);
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
    const pending = summary.pending.length;

    return (
        <div className={`relative ${className ?? ''}`} ref={panelRef}>
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-label={`Messages: ${unread} unread`}
                className="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-brown-light/15 transition-colors cursor-pointer"
            >
                <BellIcon
                    size={20}
                    weight={unread > 0 ? 'fill' : 'regular'}
                    className={unread > 0 ? 'text-primary' : 'text-neutral-gray'}
                />
                {unread > 0 && (
                    <span
                        className={`absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-4.5 h-4.5 px-1 rounded-full text-[10px] font-bold font-body leading-none text-white ${
                            // A caution waiting on a confirmation is a different
                            // thing from an unread notice, and the badge says so.
                            pending > 0 ? 'bg-error animate-pulse' : 'bg-primary text-brand-darker'
                        }`}
                    >
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {open && (
                <div
                    className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] rounded-2xl bg-neutral-card shadow-xl border border-[#e3ddd0] z-50 overflow-hidden`}
                >
                    <header className="flex items-center justify-between gap-2 px-4 py-3 bg-neutral-light border-b border-[#f0e8d8]">
                        <p className="font-body font-semibold text-sm text-text-dark">Messages</p>
                        {unread > 0 && (
                            <span className="font-body text-[11px] text-neutral-gray">{unread} unread</span>
                        )}
                    </header>

                    <div className="max-h-[60vh] overflow-y-auto">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center text-center py-10 px-4">
                                <ChatCircleTextIcon size={28} className="text-neutral-gray mb-2" />
                                <p className="font-body text-sm text-neutral-gray">Nothing here yet.</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-[#f0e8d8]">
                                {messages.slice(0, 8).map((message) => (
                                    <BellRow
                                        key={message.id}
                                        message={message}
                                        onOpen={() => setOpen(false)}
                                    />
                                ))}
                            </ul>
                        )}
                    </div>

                    <footer className="px-4 py-2.5 bg-neutral-light border-t border-[#f0e8d8]">
                        <Link
                            href="/staff/messages"
                            onClick={() => setOpen(false)}
                            className="font-body text-xs font-semibold text-primary hover:underline"
                        >
                            See all messages
                        </Link>
                    </footer>
                </div>
            )}
        </div>
    );
}

/**
 * A row is a link, not a reply surface.
 *
 * Replying inline from the bell was tempting and wrong: the acknowledgement is
 * recorded against somebody's name, and it should not be one stray tap away in a
 * panel that opens over whatever they were doing.
 */
function BellRow({ message, onOpen }: { message: InboxMessage; onOpen: () => void }) {
    const isUnread = message.read_at === null;
    const isCaution = message.kind === 'caution';

    return (
        <li>
            <Link
                href="/staff/messages"
                onClick={onOpen}
                className={`block px-4 py-3 hover:bg-neutral-light transition-colors ${
                    isUnread ? 'bg-primary-light/15' : ''
                }`}
            >
                <div className="flex items-start gap-2.5">
                    {isCaution ? (
                        <WarningCircleIcon size={16} weight="fill" className="text-amber-600 mt-0.5 shrink-0" />
                    ) : (
                        <ChatCircleTextIcon size={16} className="text-neutral-gray mt-0.5 shrink-0" />
                    )}

                    <div className="min-w-0 flex-1">
                        {message.subject && (
                            <p className="font-body text-sm font-semibold text-text-dark truncate">
                                {message.subject}
                            </p>
                        )}
                        <p className="font-body text-xs text-neutral-gray line-clamp-2 mt-0.5">
                            {message.body}
                        </p>
                        <p className="font-body text-[11px] text-neutral-gray/80 mt-1 flex items-center gap-1">
                            {message.is_automatic && <RobotIcon size={12} />}
                            {message.is_automatic ? 'Automatic' : message.sender_name}
                        </p>
                    </div>

                    {message.requires_acknowledgement && message.acknowledged_at === null && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-body text-amber-700">
                            Confirm
                        </span>
                    )}
                </div>
            </Link>
        </li>
    );
}
