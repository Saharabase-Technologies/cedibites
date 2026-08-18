'use client';

import { useState } from 'react';
import { RobotIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useStaffAuthOptional } from '@/app/components/providers/StaffAuthProvider';
import { useInterruptionGate } from '@/app/components/providers/InterruptionGate';
import { useStaffInbox } from '@/lib/api/hooks/useStaffInbox';
import type { InboxMessage } from '@/types/messaging';

/**
 * A caution, shown once the person is not mid-task.
 *
 * This is the only thing in the app that takes over the screen uninvited, so the
 * conditions are deliberately narrow:
 *
 *  - The interruption gate must be open. No cart with lines, no payment sheet,
 *    no order being built. Decided with the user: the question comes after a
 *    transaction, never during one.
 *  - Only cautions. A notice never reaches here.
 *  - One at a time, oldest first. Four stacked modals is not a message, it is an
 *    ambush, and everything after the first gets dismissed unread.
 *
 * There is no close button and no escape-to-dismiss. That is the point of the
 * kind — but it is also why the gate has to be right, because a modal somebody
 * cannot escape while a customer waits is a genuinely bad thing to ship.
 */
export function CautionInterstitial() {
    const staffAuth = useStaffAuthOptional();
    const userId = staffAuth?.staffUser?.user_id ?? null;
    const { summary, acknowledge, reply, isAcknowledging } = useStaffInbox(userId);
    const { isIdle } = useInterruptionGate();

    const pending = summary.pending[0] ?? null;

    if (!staffAuth?.staffUser || !pending || !isIdle) return null;

    return (
        // Keyed by the message, so moving to the next caution resets the draft
        // by remounting rather than by an effect that clears it a render late.
        // The stale-draft bug that would cause is subtle and lands on the worst
        // possible screen: somebody's reply to caution A attached to caution B.
        <CautionCard
            key={pending.id}
            pending={pending}
            remaining={summary.pending.length - 1}
            isSaving={isAcknowledging}
            onConfirm={async (quickReply, customReply) => {
                // Reply first, acknowledge second. Acknowledging removes it from
                // the pending set, which unmounts this card — doing it first
                // would discard whatever they had typed.
                if (quickReply || customReply.trim()) {
                    await reply({
                        recipientId: pending.id,
                        ...(quickReply ? { quick_reply: quickReply } : {}),
                        ...(customReply.trim() ? { body: customReply.trim() } : {}),
                    });
                }

                await acknowledge(pending.id);
            }}
        />
    );
}

function CautionCard({
    pending,
    remaining,
    isSaving,
    onConfirm,
}: {
    pending: InboxMessage;
    remaining: number;
    isSaving: boolean;
    onConfirm: (quickReply: string | null, customReply: string) => Promise<void>;
}) {
    const [customReply, setCustomReply] = useState('');
    const [chosenQuickReply, setChosenQuickReply] = useState<string | null>(null);

    async function confirm() {
        await onConfirm(chosenQuickReply, customReply);
    }

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-brand-darker/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-neutral-card shadow-xl overflow-hidden">
                <div className="flex items-start gap-3 px-5 py-4 bg-warning/10 border-b border-warning/20">
                    <WarningCircleIcon size={22} weight="fill" className="text-warning shrink-0 mt-0.5" />
                    <div className="min-w-0">
                        <p className="font-body font-semibold text-brand-dark">
                            {pending.subject ?? 'A message for you'}
                        </p>
                        <p className="font-body text-xs text-neutral-gray flex items-center gap-1 mt-0.5">
                            {pending.is_automatic && <RobotIcon size={12} />}
                            {pending.is_automatic ? 'Automatic message' : pending.sender_name}
                        </p>
                    </div>
                </div>

                <div className="px-5 py-4">
                    <p className="font-body text-sm text-brand-dark whitespace-pre-line leading-relaxed">
                        {pending.body}
                    </p>

                    {pending.quick_replies.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                            {pending.quick_replies.map((text) => (
                                <button
                                    key={text}
                                    type="button"
                                    onClick={() =>
                                        setChosenQuickReply((current) => (current === text ? null : text))
                                    }
                                    className={`px-3 py-1.5 rounded-full text-xs font-body border transition-colors cursor-pointer ${
                                        chosenQuickReply === text
                                            ? 'bg-primary text-brand-darker border-primary'
                                            : 'bg-neutral-light/60 text-brand-dark border-black/10 hover:bg-primary-light'
                                    }`}
                                >
                                    {text}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Only when the sender allowed it. The server enforces this
                        too — a toggle the server does not honour is decoration. */}
                    {pending.allow_custom_reply && (
                        <textarea
                            value={customReply}
                            onChange={(event) => setCustomReply(event.target.value)}
                            placeholder="Anything to add? (optional)"
                            rows={2}
                            className="w-full mt-3 px-3 py-2 rounded-xl border border-black/10 bg-neutral-light/40 text-sm font-body text-brand-dark placeholder:text-neutral-gray/70 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                        />
                    )}
                </div>

                <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-black/5">
                    <p className="font-body text-[11px] text-neutral-gray">
                        {remaining > 0
                            ? `${remaining} more after this`
                            : 'Your reply is recorded against your name.'}
                    </p>

                    <button
                        type="button"
                        onClick={confirm}
                        disabled={isSaving}
                        className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-brand-darker text-sm font-body font-semibold transition-colors disabled:opacity-60 cursor-pointer"
                    >
                        {isSaving ? 'Saving…' : 'Got it'}
                    </button>
                </div>
            </div>
        </div>
    );
}
