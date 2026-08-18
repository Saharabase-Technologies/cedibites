'use client';

import { useState } from 'react';
import { CheckCircleIcon, PaperPlaneTiltIcon } from '@phosphor-icons/react';
import type { InboxMessage } from '@/types/messaging';

/**
 * The reply-and-acknowledge block, in one place.
 *
 * Previously written twice — once in the caution modal and once on the inbox
 * card — with different affordances in each, so the same message offered a
 * different set of actions depending on where you happened to open it. Two
 * implementations of "did you understand this?" is exactly the thing that ends
 * up disagreeing.
 *
 * Structured as a labelled section rather than loose controls, because the
 * acknowledgement is a commitment recorded against somebody's name and it
 * should not look like an afterthought below the text.
 */
export function ReplyPanel({
    message,
    busy,
    onSubmit,
    compact,
}: {
    message: InboxMessage;
    busy?: boolean;
    /** Quick reply, free text, and whether to acknowledge. */
    onSubmit: (payload: { quickReply: string | null; body: string; acknowledge: boolean }) => void;
    /** Inbox cards sit in a list and get tighter spacing than the modal. */
    compact?: boolean;
}) {
    const [quickReply, setQuickReply] = useState<string | null>(null);
    const [body, setBody] = useState('');

    const alreadyReplied = message.replied_at !== null;
    const needsAck = message.requires_acknowledgement && message.acknowledged_at === null;
    const hasSomethingToSay = quickReply !== null || body.trim() !== '';

    // Nothing left to do: replied, and either no acknowledgement was asked for
    // or it has been given. Show what they said rather than dead controls.
    if (alreadyReplied && !needsAck) {
        return (
            <div className={compact ? 'mt-3' : 'mt-4'}>
                <p className="rounded-xl bg-neutral-light border border-[#e3ddd0] px-3 py-2 font-body text-xs text-neutral-gray">
                    <span className="text-text-dark font-semibold">You replied:</span>{' '}
                    {message.quick_reply}
                    {message.quick_reply && message.reply_body ? ' — ' : ''}
                    {message.reply_body}
                </p>
            </div>
        );
    }

    return (
        <div className={compact ? 'mt-3' : 'mt-4'}>
            <p className="font-body text-xs font-semibold text-text-dark mb-2">
                {needsAck ? 'Confirm you have seen this' : 'Reply'}
            </p>

            {message.quick_replies.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {message.quick_replies.map((text) => (
                        <button
                            key={text}
                            type="button"
                            onClick={() => setQuickReply((current) => (current === text ? null : text))}
                            className={`px-3 py-1.5 rounded-full text-xs font-body border transition-colors cursor-pointer ${
                                quickReply === text
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-neutral-card text-text-dark border-[#e3ddd0] hover:border-neutral-gray/50'
                            }`}
                        >
                            {text}
                        </button>
                    ))}
                </div>
            )}

            {/* Enforced on the server too — a toggle the server does not honour
                is decoration. */}
            {message.allow_custom_reply && (
                <textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    rows={compact ? 2 : 3}
                    placeholder={needsAck ? 'Anything to add? (optional)' : 'Write a reply…'}
                    className="w-full bg-neutral-card border border-[#e3ddd0] rounded-xl px-3.5 py-2.5 text-sm font-body text-text-dark placeholder:text-neutral-gray/70 focus:outline-none focus:border-primary transition-colors resize-none"
                />
            )}

            <div className="flex items-center justify-between gap-3 mt-3">
                <p className="font-body text-[11px] text-neutral-gray">
                    {needsAck ? 'Recorded against your name.' : ''}
                </p>

                <button
                    type="button"
                    disabled={busy || (!needsAck && !hasSomethingToSay)}
                    onClick={() =>
                        onSubmit({ quickReply, body, acknowledge: needsAck })
                    }
                    className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-semibold font-body hover:bg-primary/90 transition-colors min-h-11 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                >
                    {needsAck ? (
                        <CheckCircleIcon size={16} weight="fill" />
                    ) : (
                        <PaperPlaneTiltIcon size={15} weight="fill" />
                    )}
                    {busy ? 'Saving…' : needsAck ? 'Got it' : 'Send reply'}
                </button>
            </div>
        </div>
    );
}
