'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { ArrowLeftIcon, ArrowRightIcon } from '@phosphor-icons/react';

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

/**
 * The card.
 *
 * Shaped after the way a browser announces its own update: the screenshot is the
 * thing, given the top of the card at full width, with the heading and the words
 * underneath it. Staff are being told about a screen they are about to stand in
 * front of, so showing them that screen is worth more than any amount of prose.
 *
 * Deliberately absent, because each is a house rule: no icon tile above the
 * heading, no "WHAT'S NEW" kicker over the top of it, no card nested inside the
 * card, and no border and drop shadow on the same edge.
 */
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

    // Which way the next slide should travel in from. Paging back and paging
    // forward moving the same direction reads as a redraw rather than a move.
    const [direction, setDirection] = useState<1 | -1>(1);

    // Slides whose image did not load, by position. A screenshot can be missing
    // for reasons this screen cannot fix — the file never reached this
    // environment, the URL points at another host — and the one thing it must
    // not do is leave a broken frame sitting under the heading. On failure the
    // layout closes over it and the slide reads as a text slide.
    const [brokenImages, setBrokenImages] = useState<Record<number, true>>({});

    // A release always has slides — the API refuses one without. The fallback
    // exists so a payload from an older backend renders its body rather than an
    // empty card somebody still has to acknowledge.
    const steps = release.steps?.length
        ? release.steps
        : [{ id: 0, position: 1, title: release.subject, body: release.body, image_url: release.image_url }];

    const step = steps[index];
    const isLast = index === steps.length - 1;
    const isFirst = index === 0;

    const go = useCallback(
        (by: 1 | -1) => {
            setDirection(by);
            setIndex((current) => Math.min(steps.length - 1, Math.max(0, current + by)));
        },
        [steps.length],
    );

    // Arrow keys page the deck. A till and a kitchen tablet both have a keyboard
    // more often than not, and reaching for the mouse to read six slides is the
    // sort of small friction that gets a walkthrough clicked through unread.
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (busy) return;
            if (event.key === 'ArrowRight' && !isLast) go(1);
            if (event.key === 'ArrowLeft' && !isFirst) go(-1);
        };

        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [busy, isFirst, isLast, go]);

    const showImage = Boolean(step.image_url) && !brokenImages[index];

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-brand-darker/75 p-4 sm:p-6">
            <div
                role="dialog"
                aria-modal="true"
                aria-label={release.subject ?? 'Changes to the platform'}
                className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-[28px] bg-neutral-card shadow-[0_24px_60px_-12px_rgba(18,15,13,0.45)] overflow-hidden"
            >
                {/* Keyed on the index so every slide replays its entrance, and so
                    the scroll position returns to the top of a long slide rather
                    than carrying the last one's offset into it. */}
                <div
                    key={index}
                    className={`flex-1 min-h-0 overflow-y-auto ${
                        direction === 1 ? 'walkthrough-enter-next' : 'walkthrough-enter-prev'
                    }`}
                >
                    {showImage && (
                        <div className="relative w-full aspect-[16/10] max-h-[46vh] bg-neutral-light">
                            <Image
                                src={step.image_url as string}
                                alt=""
                                fill
                                unoptimized
                                sizes="(max-width: 768px) 100vw, 768px"
                                // object-contain, not cover: this is a screenshot
                                // of a screen somebody has to recognise, and a
                                // crop that eats the toolbar being described
                                // defeats the point of showing it.
                                className="object-contain"
                                onError={() => setBrokenImages((current) => ({ ...current, [index]: true }))}
                            />
                        </div>
                    )}

                    <div className={`px-7 sm:px-10 pb-8 ${showImage ? 'pt-7' : 'pt-10'}`}>
                        {step.title && (
                            <h2 className="font-brand text-[27px] sm:text-[32px] text-text-dark leading-[1.15] text-balance">
                                {step.title}
                            </h2>
                        )}

                        <div className="mt-3 font-body text-[15px] sm:text-base text-text-gray leading-relaxed max-w-[58ch]">
                            {renderMessageBody(step.body)}
                        </div>
                    </div>
                </div>

                <footer className="shrink-0 bg-neutral-light px-5 sm:px-7 py-4 flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => go(-1)}
                        disabled={isFirst || busy}
                        className="flex items-center gap-1.5 px-3 min-h-11 rounded-xl font-body text-sm font-medium text-neutral-gray hover:text-text-dark disabled:opacity-0 disabled:pointer-events-none transition-colors duration-150 cursor-pointer"
                    >
                        <ArrowLeftIcon size={15} />
                        Back
                    </button>

                    <div className="flex-1 flex items-center justify-center gap-2">
                        {steps.map((s, i) => (
                            <span
                                key={s.id || i}
                                aria-hidden
                                className={`h-1.5 rounded-full transition-all duration-200 ease-out ${
                                    i === index ? 'w-6 bg-primary' : 'w-1.5 bg-neutral-gray/30'
                                }`}
                            />
                        ))}
                        <span className="ml-2 font-body text-xs text-neutral-gray tabular-nums">
                            {index + 1} of {steps.length}
                        </span>
                    </div>

                    {!isLast ? (
                        <button
                            type="button"
                            onClick={() => go(1)}
                            disabled={busy}
                            className="flex items-center gap-1.5 px-5 min-h-11 rounded-xl bg-primary text-white font-body text-sm font-semibold hover:bg-primary-hover disabled:opacity-60 transition-colors duration-150 cursor-pointer"
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
                                className="px-4 min-h-11 rounded-xl bg-neutral-card font-body text-sm font-medium text-neutral-gray hover:text-text-dark disabled:opacity-60 transition-colors duration-150 cursor-pointer"
                            >
                                I have questions
                            </button>
                            <button
                                type="button"
                                onClick={() => void onFinish(false)}
                                disabled={busy}
                                className="px-5 min-h-11 rounded-xl bg-primary text-white font-body text-sm font-semibold hover:bg-primary-hover disabled:opacity-60 transition-colors duration-150 cursor-pointer"
                            >
                                {busy ? 'Saving' : 'Got it'}
                            </button>
                        </div>
                    )}
                </footer>
            </div>
        </div>
    );
}
