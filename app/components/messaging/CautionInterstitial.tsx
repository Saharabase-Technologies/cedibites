'use client';

import Image from 'next/image';
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
 * Visually it is a plain cream sheet with one primary rule across the top and
 * hairline dividers between its three parts. The previous version wrapped it in
 * a pale yellow alert band, which is a stock alert colour from outside this
 * brand's palette entirely — the thing that made it read as generic. Weight and
 * space carry the seriousness instead.
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
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-brand-darker/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg max-h-[88vh] flex flex-col rounded-2xl bg-neutral-card shadow-2xl overflow-hidden">

                {/* The one piece of colour in the whole sheet. A 3px rule reads as
                    a seal on an official notice; a filled band reads as a stock
                    browser alert. */}
                <div className="h-[3px] bg-primary shrink-0" />

                <div className="overflow-y-auto flex-1 min-h-0">
                    {/* ── Who and what ──────────────────────────────────── */}
                    <header className="px-6 pt-6 pb-5">
                        <p className="font-body text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-gray">
                            {pending.kind_label}
                        </p>
                        <h2 className="font-brand text-2xl font-bold text-text-dark leading-tight mt-1.5">
                            {pending.subject ?? 'A message for you'}
                        </h2>
                        <p className="font-body text-xs text-neutral-gray mt-1.5">
                            {pending.sender_name}
                            {pending.sent_at && ` · ${new Date(pending.sent_at).toLocaleString()}`}
                        </p>
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
