'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ArrowLeftIcon, ArrowRightIcon, SparkleIcon } from '@phosphor-icons/react';

import { useStaffAuthOptional } from '@/app/components/providers/StaffAuthProvider';
import { useInterruptionGate } from '@/app/components/providers/InterruptionGate';
import { useStaffInbox } from '@/lib/api/hooks/useStaffInbox';
import { renderMessageBody } from '@/lib/utils/messageMarkdown';
import type { InboxMessage } from '@/types/messaging';

/**
 * "What's new" — the platform explaining itself, one change at a time.
 *
 * The second thing in the app allowed to take over the screen, and it plays by
 * the same rules as the first: the interruption gate must be open, so it never
 * lands mid-sale, and it cannot be dismissed with Escape or a click outside.
 * What differs is why. A caution is about the person's own conduct; this is
 * news, and it wears none of that chrome.
 *
 * It keeps coming back at every sign-in until the person has actually been
 * through it. That is deliberate: somebody who has not been told the rules
 * changed will go on working to the old ones, and a notice they closed without
 * reading is indistinguishable from one they never got. Reaching the last slide
 * and confirming is what stops it — not closing the window, because there is no
 * way to close the window.
 *
 * Cautions come first. If someone has both waiting, the warning about their own
 * work is the more urgent thing and this stays out of its way.
 */
export function ReleaseWalkthrough() {
    const staffAuth = useStaffAuthOptional();
    const userId = staffAuth?.staffUser?.user_id ?? null;
    const { summary, acknowledge, reply, isAcknowledging, isReplying } = useStaffInbox(userId);
    const { isIdle } = useInterruptionGate();

    const hasCaution = summary.pending.some((message) => message.kind === 'caution');
    const pending = summary.pending.find((message) => message.kind === 'release') ?? null;

    if (!staffAuth?.staffUser || !pending || !isIdle || hasCaution) return null;

    return (
        // Keyed by the message so moving to a second release starts at its first
        // slide, rather than inheriting the page index of the one before it.
        <WalkthroughCard
            key={pending.id}
            release={pending}
            busy={isAcknowledging || isReplying}
            onFinish={async (askedQuestion) => {
                // Reply first, acknowledge second. Acknowledging removes it from
                // the pending set, which unmounts this card — the other order
                // would drop the question on the floor.
                if (askedQuestion) {
                    await reply({ recipientId: pending.id, quick_reply: 'I have questions' });
                }
                await acknowledge(pending.id);
            }}
        />
    );
}

function WalkthroughCard({
    release,
    busy,
    onFinish,
}: {
    release: InboxMessage;
    busy: boolean;
    onFinish: (askedQuestion: boolean) => Promise<void>;
}) {
    const [index, setIndex] = useState(0);

    // A release always has slides — the API refuses one without. The fallback
    // exists so a payload from an older backend renders its body rather than an
    // empty card somebody still has to acknowledge.
    const steps = release.steps?.length
        ? release.steps
        : [{ id: 0, position: 1, title: release.subject, body: release.body, image_url: release.image_url }];

    const step = steps[index];
    const isLast = index === steps.length - 1;

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-brand-darker/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-xl max-h-[88vh] flex flex-col rounded-2xl bg-neutral-card shadow-2xl overflow-hidden">

                {/* ── What this is ──────────────────────────────────────── */}
                <header className="flex items-center gap-3 px-6 pt-5 pb-4 shrink-0">
                    <span className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                        <SparkleIcon size={18} weight="fill" className="text-primary" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="font-body text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-gray">
                            What&apos;s new
                        </p>
                        <p className="font-body text-sm text-text-dark font-semibold truncate">
                            {release.subject ?? 'Changes to the platform'}
                        </p>
                    </div>
                    <span className="shrink-0 font-body text-xs text-neutral-gray tabular-nums">
                        {index + 1} of {steps.length}
                    </span>
                </header>

                <div className="h-px bg-[#f0e8d8] shrink-0" />

                {/* ── The slide ─────────────────────────────────────────── */}
                <div className="overflow-y-auto flex-1 min-h-0 px-6 py-6">
                    {step.title && (
                        <h2 className="font-brand text-2xl font-bold text-text-dark leading-tight mb-3 text-balance">
                            {step.title}
                        </h2>
                    )}

                    <div className="font-body text-[15px] text-text-dark leading-relaxed">
                        {renderMessageBody(step.body)}
                    </div>

                    {step.image_url && (
                        <Image
                            src={step.image_url}
                            alt=""
                            width={900}
                            height={600}
                            unoptimized
                            className="mt-4 w-full h-auto rounded-xl border border-[#e3ddd0]"
                        />
                    )}
                </div>

                {/* ── Getting through it ────────────────────────────────── */}
                <footer className="shrink-0 border-t border-[#f0e8d8] bg-neutral-light px-6 py-4 flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setIndex((i) => Math.max(0, i - 1))}
                        disabled={index === 0 || busy}
                        className="flex items-center gap-1.5 px-3 h-11 rounded-xl font-body text-sm font-medium text-neutral-gray hover:text-text-dark disabled:opacity-0 disabled:pointer-events-none transition-colors cursor-pointer"
                    >
                        <ArrowLeftIcon size={15} />
                        Back
                    </button>

                    {/* Dots, so the length of the thing is visible from the
                        first slide. Nobody pages willingly through something
                        whose end they cannot see. */}
                    <div className="flex-1 flex items-center justify-center gap-1.5">
                        {steps.map((s, i) => (
                            <span
                                key={s.id || i}
                                aria-hidden
                                className={`h-1.5 rounded-full transition-all ${
                                    i === index ? 'w-5 bg-primary' : 'w-1.5 bg-neutral-gray/30'
                                }`}
                            />
                        ))}
                    </div>

                    {!isLast ? (
                        <button
                            type="button"
                            onClick={() => setIndex((i) => Math.min(steps.length - 1, i + 1))}
                            disabled={busy}
                            className="flex items-center gap-1.5 px-5 h-11 rounded-xl bg-primary text-white font-body text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors cursor-pointer"
                        >
                            Next
                            <ArrowRightIcon size={15} weight="bold" />
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => void onFinish(true)}
                                disabled={busy}
                                className="px-4 h-11 rounded-xl border border-[#e3ddd0] bg-neutral-card font-body text-sm font-medium text-neutral-gray hover:text-text-dark hover:border-neutral-gray/50 disabled:opacity-60 transition-colors cursor-pointer"
                            >
                                I have questions
                            </button>
                            <button
                                type="button"
                                onClick={() => void onFinish(false)}
                                disabled={busy}
                                className="px-5 h-11 rounded-xl bg-primary text-white font-body text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors cursor-pointer"
                            >
                                {busy ? 'Saving…' : 'Got it'}
                            </button>
                        </div>
                    )}
                </footer>
            </div>
        </div>
    );
}
