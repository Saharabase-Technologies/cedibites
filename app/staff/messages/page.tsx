'use client';

import { useState } from 'react';
import { ChatCircleTextIcon, PaperPlaneTiltIcon, RobotIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { useStaffInbox } from '@/lib/api/hooks/useStaffInbox';
import type { InboxMessage } from '@/types/messaging';

/**
 * The staff member's own messages, and the way to raise something upward.
 *
 * The upward half is not decoration. A channel that only ever points downward
 * reads as surveillance; one that answers back is a way of working. It goes to
 * the whole IT team rather than a named person, so a query cannot sit unread
 * because somebody is on leave.
 */
export default function StaffMessagesPage() {
    const { staffUser } = useStaffAuth();
    const { messages, isLoading, acknowledge, reply, raise, isRaising } = useStaffInbox(
        staffUser?.user_id ?? null,
    );

    const [askOpen, setAskOpen] = useState(false);
    const [askSubject, setAskSubject] = useState('');
    const [askBody, setAskBody] = useState('');
    const [askSent, setAskSent] = useState(false);

    async function submitQuery() {
        await raise({ subject: askSubject.trim() || undefined, body: askBody.trim() });
        setAskSent(true);
        setAskSubject('');
        setAskBody('');
        setAskOpen(false);
    }

    return (
        <div className="p-4 sm:p-6 max-w-2xl mx-auto">
            <header className="flex items-start justify-between gap-3 mb-5">
                <div>
                    <h1 className="font-brand text-2xl text-brand-dark">Messages</h1>
                    <p className="font-body text-sm text-neutral-gray mt-1">
                        From the office, and from the system.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setAskOpen((value) => !value)}
                    className="shrink-0 px-3 py-2 rounded-xl bg-neutral-light hover:bg-primary-light text-sm font-body text-brand-dark transition-colors cursor-pointer"
                >
                    Ask IT
                </button>
            </header>

            {askSent && (
                <p className="mb-4 rounded-xl bg-secondary-light/60 px-4 py-3 font-body text-sm text-secondary">
                    Sent to the IT team. They will reply here.
                </p>
            )}

            {askOpen && (
                <div className="rounded-2xl bg-neutral-card shadow-sm p-4 mb-5">
                    <input
                        value={askSubject}
                        onChange={(event) => setAskSubject(event.target.value)}
                        placeholder="What is it about? (optional)"
                        className="w-full px-3 py-2 mb-2 rounded-xl border border-black/10 bg-neutral-light/40 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <textarea
                        value={askBody}
                        onChange={(event) => setAskBody(event.target.value)}
                        rows={3}
                        placeholder="Tell them what is happening."
                        className="w-full px-3 py-2 rounded-xl border border-black/10 bg-neutral-light/40 text-sm font-body resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <button
                        type="button"
                        onClick={submitQuery}
                        disabled={isRaising || !askBody.trim()}
                        className="flex items-center gap-2 mt-3 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-brand-darker text-sm font-body font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        <PaperPlaneTiltIcon size={15} weight="fill" />
                        {isRaising ? 'Sending…' : 'Send to IT'}
                    </button>
                </div>
            )}

            {isLoading ? (
                <p className="font-body text-sm text-neutral-gray">Loading…</p>
            ) : messages.length === 0 ? (
                <div className="rounded-2xl bg-neutral-card shadow-sm p-8 text-center">
                    <ChatCircleTextIcon size={30} className="text-neutral-gray mx-auto mb-2" />
                    <p className="font-body text-sm text-neutral-gray">No messages.</p>
                </div>
            ) : (
                <ul className="space-y-3">
                    {messages.map((message) => (
                        <MessageCard
                            key={message.id}
                            message={message}
                            onAcknowledge={() => acknowledge(message.id)}
                            onQuickReply={(text) => reply({ recipientId: message.id, quick_reply: text })}
                            onCustomReply={(text) => reply({ recipientId: message.id, body: text })}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
}

function MessageCard({
    message,
    onAcknowledge,
    onQuickReply,
    onCustomReply,
}: {
    message: InboxMessage;
    onAcknowledge: () => void;
    onQuickReply: (text: string) => void;
    onCustomReply: (text: string) => void;
}) {
    const [draft, setDraft] = useState('');
    const isCaution = message.kind === 'caution';

    return (
        <li
            className={`rounded-2xl shadow-sm p-4 ${
                isCaution ? 'bg-warning/5 border border-warning/20' : 'bg-neutral-card'
            }`}
        >
            <div className="flex items-start gap-2">
                {isCaution && (
                    <WarningCircleIcon size={18} weight="fill" className="text-warning shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                    {message.subject && (
                        <p className="font-body font-semibold text-brand-dark">{message.subject}</p>
                    )}
                    <p className="font-body text-sm text-brand-dark whitespace-pre-line mt-1 leading-relaxed">
                        {message.body}
                    </p>
                    <p className="font-body text-[11px] text-neutral-gray mt-2 flex items-center gap-1">
                        {message.is_automatic && <RobotIcon size={12} />}
                        {message.is_automatic ? 'Automatic' : message.sender_name}
                    </p>
                </div>
            </div>

            {message.replied_at ? (
                <p className="mt-3 rounded-xl bg-neutral-light/60 px-3 py-2 font-body text-xs text-neutral-gray">
                    You replied: {message.quick_reply}
                    {message.quick_reply && message.reply_body ? ' — ' : ''}
                    {message.reply_body}
                </p>
            ) : (
                <>
                    {message.quick_replies.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                            {message.quick_replies.map((text) => (
                                <button
                                    key={text}
                                    type="button"
                                    onClick={() => onQuickReply(text)}
                                    className="px-2.5 py-1 rounded-full border border-black/10 bg-neutral-light/60 text-xs font-body text-brand-dark hover:bg-primary-light transition-colors cursor-pointer"
                                >
                                    {text}
                                </button>
                            ))}
                        </div>
                    )}

                    {message.allow_custom_reply && (
                        <div className="flex gap-2 mt-2">
                            <input
                                value={draft}
                                onChange={(event) => setDraft(event.target.value)}
                                placeholder="Reply…"
                                className="flex-1 px-3 py-1.5 rounded-xl border border-black/10 bg-neutral-light/40 text-xs font-body focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    if (draft.trim()) {
                                        onCustomReply(draft.trim());
                                        setDraft('');
                                    }
                                }}
                                className="px-3 py-1.5 rounded-xl bg-neutral-light hover:bg-primary-light text-xs font-body text-brand-dark transition-colors cursor-pointer"
                            >
                                Send
                            </button>
                        </div>
                    )}
                </>
            )}

            {message.requires_acknowledgement && !message.acknowledged_at && (
                <button
                    type="button"
                    onClick={onAcknowledge}
                    className="mt-3 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-brand-darker text-xs font-body font-semibold transition-colors cursor-pointer"
                >
                    Got it
                </button>
            )}
        </li>
    );
}
