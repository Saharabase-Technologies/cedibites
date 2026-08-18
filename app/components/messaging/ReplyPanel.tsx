'use client';

import { useState } from 'react';
import { CheckIcon, PaperPlaneTiltIcon } from '@phosphor-icons/react';
import type { InboxMessage } from '@/types/messaging';

/**
 * The reply-and-acknowledge block, in one place.
 *
 * Previously written twice — once in the caution modal and once on the inbox
 * card — with different affordances in each, so the same message offered
 * different actions depending on where you opened it.
 *
 * Reads as its own numbered step rather than controls loose under the text: the
 * acknowledgement is a commitment recorded against somebody's name, and it
 * should not look like an afterthought.
 */
export function ReplyPanel({
    message,
    busy,
    onSubmit,
}: {
    message: InboxMessage;
    busy?: boolean;
    onSubmit: (payload: { quickReply: string | null; body: string; acknowledge: boolean }) => void;
}) {
    const [quickReply, setQuickReply] = useState<string | null>(null);
    const [body, setBody] = useState('');

    const alreadyReplied = message.replied_at !== null;
    const needsAck = message.requires_acknowledgement && message.acknowledged_at === null;
    const hasSomethingToSay = quickReply !== null || body.trim() !== '';

    // Nothing left to do. Show what they said rather than dead controls.
    if (alreadyReplied && !needsAck) {
        return (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-neutral-light rounded-xl">
                <CheckIcon size={15} weight="bold" className="text-secondary shrink-0 mt-0.5" />
                <p className="font-body text-xs text-neutral-gray">
                    <span className="text-text-dark font-semibold">You replied</span>
                    {' — '}
                    {message.quick_reply}
                    {message.quick_reply && message.reply_body ? '. ' : ''}
                    {message.reply_body}
                </p>
            </div>
        );
    }

    return (
        <section>
            <h3 className="font-body text-sm font-semibold text-text-dark">
                {needsAck ? 'Confirm you have seen this' : 'Reply'}
            </h3>
            {needsAck && (
                <p className="font-body text-xs text-neutral-gray mt-0.5">
                    Your answer is recorded against your name.
                </p>
            )}

            {message.quick_replies.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                    {message.quick_replies.map((text) => (
                        <button
                            key={text}
                            type="button"
                            onClick={() => setQuickReply((current) => (current === text ? null : text))}
                            className={`px-3.5 py-2 rounded-xl text-sm font-body border transition-colors cursor-pointer ${
                                quickReply === text
                                    ? 'bg-text-dark text-neutral-card border-text-dark font-semibold'
                                    : 'bg-neutral-card text-text-dark border-[#e3ddd0] hover:border-neutral-gray/60'
                            }`}
                        >
                            {text}
                        </button>
                    ))}
                </div>
            )}

            {/* Enforced on the server too — a toggle the server does not honour
                is decoration. Generous gap above: this is a separate act from
                picking a canned answer, not a continuation of it. */}
            {message.allow_custom_reply && (
                <textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    rows={3}
                    placeholder={needsAck ? 'Add something, if you want to' : 'Write a reply…'}
                    className="w-full mt-4 bg-neutral-card border border-[#e3ddd0] rounded-xl px-3.5 py-3 text-sm font-body text-text-dark placeholder:text-neutral-gray/70 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-colors resize-none"
                />
            )}

            <div className="flex justify-end mt-4">
                <button
                    type="button"
                    disabled={busy || (!needsAck && !hasSomethingToSay)}
                    onClick={() => onSubmit({ quickReply, body, acknowledge: needsAck })}
                    className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl text-sm font-semibold font-body hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                    {needsAck ? (
                        <CheckIcon size={16} weight="bold" />
                    ) : (
                        <PaperPlaneTiltIcon size={15} weight="fill" />
                    )}
                    {busy ? 'Saving…' : needsAck ? 'Got it' : 'Send reply'}
                </button>
            </div>
        </section>
    );
}
