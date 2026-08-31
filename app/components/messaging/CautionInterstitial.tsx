'use client';

import Image from 'next/image';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { useStaffAuthOptional } from '@/app/components/providers/StaffAuthProvider';
import { useInterruptionGate } from '@/app/components/providers/InterruptionGate';
import { useStaffInbox } from '@/lib/api/hooks/useStaffInbox';
import { renderMessageBody } from '@/lib/utils/messageMarkdown';
import { ReplyPanel } from './ReplyPanel';
import type { InboxMessage } from '@/types/messaging';

/**
 * A caution, shown once the person is not mid-task.
 *
 * The only thing in the app that takes over the screen uninvited, so the
 * conditions are narrow: the interruption gate must be open (no cart with
 * lines, no payment sheet), only cautions reach here, and they come one at a
 * time, oldest first — four stacked modals is an ambush and everything after the
 * first gets dismissed unread.
 *
 * Deliberately NOT built on InventoryModal: that closes on Escape and on a
 * backdrop click, which is exactly what this kind must not do.
 *
 * Visually it is a plain cream sheet: a large icon on the left, the kind far
 * right, and hairline dividers between its three parts. The first version used a
 * pale yellow alert band — a stock colour from outside this brand's palette —
 * and the second traded it for a rule across the top, which was still a bar of
 * colour doing a job the icon does better. Weight and space carry the
 * seriousness now.
 */
export function CautionInterstitial() {
    const staffAuth = useStaffAuthOptional();
    const userId = staffAuth?.staffUser?.user_id ?? null;
    const { summary, acknowledge, reply, isAcknowledging, isReplying } = useStaffInbox(userId);
    const { isIdle } = useInterruptionGate();

    // The pending set now carries every kind that takes over the screen, so
    // this has to say which it wants. A caution and a release are both
    // interruptions but they are not interchangeable: one is about the person's
    // own work and the other is news, and rendering a release in this chrome
    // would put a warning icon above "What's new".
    const pending = summary.pending.find((message) => message.kind === 'caution') ?? null;

    if (!staffAuth?.staffUser || !pending || !isIdle) return null;

    return (
        // Keyed by the message, so moving to the next caution resets the draft by
        // remounting rather than by an effect that clears it a render late and
        // attaches a reply to the wrong caution.
        <CautionCard
            key={pending.id}
            pending={pending}
            remaining={summary.pending.filter((m) => m.kind === 'caution').length - 1}
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
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-brand-darker/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg max-h-[88vh] flex flex-col rounded-2xl bg-neutral-card shadow-2xl overflow-hidden">

                <div className="overflow-y-auto flex-1 min-h-0">
                    {/* Icon left, big, centred against the whole block; the kind
                        sits far right. No rule across the top — a bar of colour
                        above a card is decoration, and the icon says the same
                        thing with more authority. */}
                    <header className="flex items-center gap-4 px-6 py-5">
                        <WarningCircleIcon
                            size={40}
                            weight="fill"
                            className="text-primary shrink-0"
                        />

                        <div className="min-w-0 flex-1">
                            <h2 className="font-brand text-2xl font-bold text-text-dark leading-tight">
                                {pending.subject ?? 'A message for you'}
                            </h2>
                            <p className="font-body text-xs text-neutral-gray mt-1">
                                {pending.sender_name}
                                {pending.sent_at && ` · ${new Date(pending.sent_at).toLocaleString()}`}
                            </p>
                        </div>

                        <span className="hidden sm:inline shrink-0 font-body text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-gray">
                            {pending.kind_label}
                        </span>
                    </header>

                    <div className="h-px bg-[#f0e8d8]" />

                    {/* ── What it says ──────────────────────────────────── */}
                    <div className="px-6 py-5 font-body text-[15px] text-text-dark leading-relaxed">
                        {renderMessageBody(pending.body)}

                        {pending.image_url && (
                            <Image
                                src={pending.image_url}
                                alt=""
                                width={800}
                                height={600}
                                unoptimized
                                className="mt-4 w-full h-auto rounded-xl border border-[#e3ddd0]"
                            />
                        )}
                    </div>

                    <div className="h-px bg-[#f0e8d8]" />

                    {/* ── What to do about it ───────────────────────────── */}
                    <div className="px-6 py-5">
                        <ReplyPanel
                            message={pending}
                            busy={busy}
                            onSubmit={({ quickReply, body }) => onConfirm({ quickReply, body })}
                        />
                    </div>
                </div>

                {remaining > 0 && (
                    <footer className="px-6 py-3 border-t border-[#f0e8d8] bg-neutral-light shrink-0">
                        <p className="font-body text-[11px] text-neutral-gray">
                            {remaining} more {remaining === 1 ? 'message' : 'messages'} after this
                        </p>
                    </footer>
                )}
            </div>
        </div>
    );
}
