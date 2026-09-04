'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { ArrowLeftIcon, ArrowRightIcon, XIcon } from '@phosphor-icons/react';

import { useStaffAuthOptional } from '@/app/components/providers/StaffAuthProvider';
import { useInterruptionGate } from '@/app/components/providers/InterruptionGate';
import { useStaffInbox } from '@/lib/api/hooks/useStaffInbox';
import { renderMessageBody } from '@/lib/utils/messageMarkdown';
import { useInterstitialsAllowed } from './useInterstitialsAllowed';
import { useTriggerReady } from './useTriggerReady';
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
 * and confirming is what stops it, since there is no way to close the window.
 *
 * Cautions come first. If someone has both waiting, the warning about their own
 * work is the more urgent thing and this stays out of its way.
 */
export function ReleaseWalkthrough() {
    const staffAuth = useStaffAuthOptional();
    const userId = staffAuth?.staffUser?.user_id ?? null;
    const { summary, acknowledge, reply, markShown, isAcknowledging, isReplying } = useStaffInbox(userId);
    const { isIdle } = useInterruptionGate();
    const allowedHere = useInterstitialsAllowed();

    const hasCaution = summary.pending.some((message) => message.kind === 'caution');
    const pending = summary.pending.find((message) => message.kind === 'release') ?? null;

    // Called before the early return, unconditionally, because hooks must be.
    // It tolerates a null message and answers false.
    const triggerReady = useTriggerReady(pending);

    if (!allowedHere || !staffAuth?.staffUser || !pending || !isIdle || !triggerReady || hasCaution) {
        return null;
    }

    return (
        // Keyed by the message so moving to a second release starts at its cover
        // rather than inheriting the page index of the one before it.
        <WalkthroughCard
            key={pending.id}
            release={pending}
            busy={isAcknowledging || isReplying}
            onShown={() => markShown(pending.id)}
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

/** The cover sits at this index. The first real slide is 0. */
const COVER = -1;

/**
 * The card.
 *
 * Shaped after the way a browser announces its own update: the screenshot is the
 * thing, given the top of the card at full width, with the heading and the words
 * underneath it. Staff are being told about a screen they are about to stand in
 * front of, so showing them that screen is worth more than any amount of prose.
 *
 * Deliberately absent, because each is a house rule: no icon tile above the
 * heading, no kicker over the top of it, no card nested inside the card, and no
 * border and drop shadow on the same edge.
 */
function WalkthroughCard({
    release,
    busy,
    onShown,
    onFinish,
}: {
    release: InboxMessage;
    busy: boolean;
    onShown: () => void;
    onFinish: (askedQuestion: boolean) => Promise<void>;
}) {
    // Report the appearance once per mount, on the cover.
    //
    // The card is keyed on the message, so it remounts when a different release
    // takes over and this fires again for that one. Paging between slides does
    // not remount it, which is right: eight slides are one appearance, not
    // eight. The gate closing and reopening mid-shift is a second appearance and
    // is counted as one, which is what makes "shown four times, still not
    // acknowledged" mean something.
    useEffect(() => {
        onShown();
        // Deliberately mount-only. Adding onShown to the deps would refire on
        // every parent render, which is every poll of the summary.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Opens on the cover, not on the first change. Somebody who is handed a
    // modal mid-shift needs to know what it is and how long it will take before
    // they start reading detail, and a deck whose length is a surprise gets
    // clicked through rather than read.
    const [index, setIndex] = useState<number>(COVER);

    // Which way the next slide should travel in from. Paging back and paging
    // forward moving the same direction reads as a redraw rather than a move.
    const [direction, setDirection] = useState<1 | -1>(1);

    // The screenshot, opened to fill the screen. A slide is capped at 46vh so
    // the buttons stay reachable, which is too small to read a receipt total or
    // a row of small controls in.
    const [zoomed, setZoomed] = useState(false);

    // Slides whose image did not load, by position. A screenshot can be missing
    // for reasons this screen cannot fix, and the one thing it must not do is
    // leave a broken frame sitting under the heading. On failure the layout
    // closes over it and the slide reads as a text slide.
    const [brokenImages, setBrokenImages] = useState<Record<number, true>>({});

    // A release always has slides — the API refuses one without. The fallback
    // exists so a payload from an older backend renders its body rather than an
    // empty card somebody still has to acknowledge.
    const steps = release.steps?.length
        ? release.steps
        : [{ id: 0, position: 1, title: release.subject, body: release.body, image_url: release.image_url }];

    const onCover = index === COVER;
    const step = onCover ? null : steps[index];
    const isLast = index === steps.length - 1;

    const go = useCallback(
        (by: 1 | -1) => {
            setDirection(by);
            setIndex((current) => Math.min(steps.length - 1, Math.max(COVER, current + by)));
        },
        [steps.length],
    );

    // Arrow keys page the deck. A till and a kitchen tablet both have a keyboard
    // more often than not, and reaching for the mouse to read six slides is the
    // sort of small friction that gets a walkthrough clicked through unread.
    //
    // Escape closes the zoom and nothing else. The walkthrough itself still has
    // no Escape, because reaching the end is what dismisses it.
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && zoomed) {
                setZoomed(false);
                return;
            }
            if (busy || zoomed) return;
            if (event.key === 'ArrowRight' && !isLast) go(1);
            if (event.key === 'ArrowLeft' && index > COVER) go(-1);
        };

        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [busy, zoomed, isLast, index, go]);

    const imageUrl = step?.image_url;
    const showImage = Boolean(imageUrl) && !brokenImages[index];

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
                    {onCover ? (
                        <div className="px-7 sm:px-12 py-14 sm:py-20">
                            <h2 className="font-brand text-[30px] sm:text-[38px] text-text-dark leading-[1.12] text-balance">
                                {release.subject ?? 'What we changed'}
                            </h2>
                            <p className="mt-4 font-body text-[15px] sm:text-base text-neutral-gray">
                                {steps.length === 1
                                    ? 'One change to go through.'
                                    : `${steps.length} changes to go through.`}
                            </p>
                        </div>
                    ) : (
                        <>
                            {showImage && (
                                <button
                                    type="button"
                                    onClick={() => setZoomed(true)}
                                    aria-label="Open the screenshot full size"
                                    className="relative block w-full aspect-[16/10] max-h-[46vh] bg-neutral-light cursor-zoom-in"
                                >
                                    <Image
                                        src={imageUrl as string}
                                        alt=""
                                        fill
                                        unoptimized
                                        sizes="(max-width: 768px) 100vw, 768px"
                                        // object-contain, not cover: this is a
                                        // screenshot of a screen somebody has to
                                        // recognise, and a crop that eats the
                                        // toolbar being described defeats the
                                        // point of showing it.
                                        className="object-contain"
                                        onError={() =>
                                            setBrokenImages((current) => ({ ...current, [index]: true }))
                                        }
                                    />
                                </button>
                            )}

                            <div className={`px-7 sm:px-10 pb-8 ${showImage ? 'pt-7' : 'pt-10'}`}>
                                {step?.title && (
                                    <h2 className="font-brand text-[27px] sm:text-[32px] text-text-dark leading-[1.15] text-balance">
                                        {step.title}
                                    </h2>
                                )}

                                <div className="mt-3 font-body text-[15px] sm:text-base text-text-gray leading-relaxed max-w-[58ch]">
                                    {renderMessageBody(step?.body ?? '')}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <footer className="shrink-0 bg-neutral-light px-5 sm:px-7 py-4 flex items-center gap-3">
                    {onCover ? (
                        <>
                            <div className="flex-1" />
                            <button
                                type="button"
                                onClick={() => go(1)}
                                disabled={busy}
                                className="flex items-center gap-1.5 px-6 min-h-11 rounded-xl bg-primary text-white font-body text-sm font-semibold hover:bg-primary-hover disabled:opacity-60 transition-colors duration-150 cursor-pointer"
                            >
                                Start
                                <ArrowRightIcon size={15} weight="bold" />
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => go(-1)}
                                disabled={busy}
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
                        </>
                    )}
                </footer>
            </div>

            {/* The screenshot at full size. Its own layer above the card, so the
                card keeps its scroll position and the deck stays where it was. */}
            {zoomed && imageUrl && (
                <div
                    className="fixed inset-0 z-101 flex items-center justify-center bg-brand-darker/90 p-4 sm:p-8 cursor-zoom-out"
                    onClick={() => setZoomed(false)}
                    role="presentation"
                >
                    <button
                        type="button"
                        onClick={() => setZoomed(false)}
                        aria-label="Close the screenshot"
                        className="absolute top-4 right-4 w-11 h-11 flex items-center justify-center rounded-full bg-neutral-card/10 text-neutral-card hover:bg-neutral-card/20 transition-colors duration-150 cursor-pointer"
                    >
                        <XIcon size={18} weight="bold" />
                    </button>

                    <div className="relative w-full h-full">
                        <Image
                            src={imageUrl}
                            alt=""
                            fill
                            unoptimized
                            sizes="100vw"
                            className="object-contain"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
