'use client';

import { RobotIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useStaffAuthOptional } from '@/app/components/providers/StaffAuthProvider';
import { useInterruptionGate } from '@/app/components/providers/InterruptionGate';
import { useStaffInbox } from '@/lib/api/hooks/useStaffInbox';
import { ReplyPanel } from './ReplyPanel';
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
 * Deliberately NOT built on InventoryModal: that closes on Escape and on a
 * backdrop click, which is exactly what this kind must not do. The styling is
 * matched to it by hand instead.
 */
export function CautionInterstitial() {
    const staffAuth = useStaffAuthOptional();
    const userId = staffAuth?.staffUser?.user_id ?? null;
    const { summary, acknowledge, reply, isAcknowledging, isReplying } = useStaffInbox(userId);
    const { isIdle } = useInterruptionGate();

    const pending = summary.pending[0] ?? null;

    if (!staffAuth?.staffUser || !pending || !isIdle) return null;

    return (
        // Keyed by the message, so moving to the next caution resets the draft by
        // remounting rather than by an effect that clears it a render late and
        // attaches a reply to the wrong caution.
        <CautionCard
            key={pending.id}
            pending={pending}
            remaining={summary.pending.length - 1}
            busy={isAcknowledging || isReplying}
            onConfirm={async ({ quickReply, body }) => {
                // Reply first, acknowledge second. Acknowledging removes it from
                // the pending set, which unmounts this card — doing it first
                // would discard whatever they had typed.
                if (quickReply || body.trim()) {
                    await reply({
                        recipientId: pending.id,
                        ...(quickReply ? { quick_reply: quickReply } : {}),
                        ...(body.trim() ? { body: body.trim() } : {}),
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
    busy,
    onConfirm,
}: {
    pending: InboxMessage;
    remaining: number;
    busy: boolean;
    onConfirm: (payload: { quickReply: string | null; body: string }) => Promise<void>;
}) {
    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-brand-darker/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl bg-neutral-card shadow-xl overflow-hidden">

                {/* ── Header ─────────────────────────────────────────────── */}
                <header className="flex items-start gap-3 px-5 py-4 bg-amber-50 border-b border-amber-200 shrink-0">
                    <WarningCircleIcon size={22} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                        <p className="font-body text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                            Caution
                        </p>
                        <h2 className="font-brand text-lg font-bold text-text-dark leading-tight mt-0.5">
                            {pending.subject ?? 'A message for you'}
                        </h2>
                        <p className="font-body text-xs text-neutral-gray flex items-center gap-1 mt-1">
                            {/* A rule sent it, not a person. Saying so stops an
                                automatic caution reading as a personal rebuke. */}
                            {pending.is_automatic && <RobotIcon size={12} />}
                            {pending.is_automatic ? 'Sent automatically' : pending.sender_name}
                        </p>
                    </div>
                </header>

                {/* ── Body + reply ───────────────────────────────────────── */}
                <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">
                    <p className="font-body text-sm text-text-dark whitespace-pre-line leading-relaxed">
                        {pending.body}
                    </p>

                    <div className="mt-4 pt-4 border-t border-[#f0e8d8]">
                        <ReplyPanel
                            message={pending}
                            busy={busy}
                            onSubmit={({ quickReply, body }) => onConfirm({ quickReply, body })}
                        />
                    </div>
                </div>

                {/* ── Footer ─────────────────────────────────────────────── */}
                {remaining > 0 && (
                    <footer className="px-5 py-3 border-t border-[#f0e8d8] bg-neutral-light shrink-0">
                        <p className="font-body text-[11px] text-neutral-gray">
                            {remaining} more {remaining === 1 ? 'message' : 'messages'} after this
                        </p>
                    </footer>
                )}
            </div>
        </div>
    );
}
