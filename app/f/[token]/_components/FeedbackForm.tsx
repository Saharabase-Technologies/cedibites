'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { StarIcon, SpinnerGapIcon, CheckCircleIcon, HeartIcon } from '@phosphor-icons/react';
import { orderFeedbackService } from '@/lib/api/services/orderFeedback.service';

/**
 * Three taps and a box, on a phone, standing up.
 *
 * Only the overall score is required. The breakdown is there for people who want
 * to be specific, and skipping it still counts as a complete answer — demanding
 * all three is how a response rate dies.
 */
export function FeedbackForm({ token }: { token: string }) {
    const [overall, setOverall] = useState(0);
    const [food, setFood] = useState(0);
    const [service, setService] = useState(0);
    const [comment, setComment] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { data: prompt, isPending, error: loadError } = useQuery({
        queryKey: ['order-feedback', token],
        queryFn: () => orderFeedbackService.getPrompt(token),
        retry: false,
    });

    async function submit(event: React.FormEvent) {
        event.preventDefault();

        if (overall === 0) {
            setError('Tap a star to tell us how it went.');
            return;
        }

        setSending(true);
        setError(null);

        try {
            await orderFeedbackService.submit(token, {
                rating_overall: overall,
                rating_food: food || null,
                rating_service: service || null,
                comment: comment.trim() || null,
            });
            setSent(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'That did not go through. Try once more?');
        } finally {
            setSending(false);
        }
    }

    if (isPending) {
        return (
            <Shell>
                <div className="flex items-center justify-center gap-3 py-16 text-neutral-gray font-body">
                    <SpinnerGapIcon size={22} className="animate-spin" />
                    One moment…
                </div>
            </Shell>
        );
    }

    /*
     * Expired and never-existed are one message by design, so this page cannot
     * be used to test whether a token is real.
     */
    if (loadError) {
        return (
            <Shell>
                <div className="text-center py-10">
                    <h1 className="text-text-dark dark:text-text-light text-xl font-semibold font-body">
                        This link has expired
                    </h1>
                    <p className="text-neutral-gray text-sm mt-2 font-body">
                        Feedback links only last a few days. If something went wrong with an order, give your branch a
                        call and they will sort it out.
                    </p>
                </div>
            </Shell>
        );
    }

    if (sent || prompt?.already_submitted) {
        return (
            <Shell>
                <div className="text-center py-10">
                    <CheckCircleIcon size={48} weight="fill" className="text-secondary mx-auto" />
                    <h1 className="text-text-dark dark:text-text-light text-xl font-semibold font-body mt-4">
                        {sent ? 'Thank you' : 'We already have this'}
                    </h1>
                    <p className="text-neutral-gray text-sm mt-2 font-body max-w-xs mx-auto">
                        {sent
                            ? 'That genuinely helps. We read every one of these.'
                            : 'Your feedback on this order is already in. Thanks for taking the time.'}
                    </p>
                </div>
            </Shell>
        );
    }

    return (
        <Shell>
            <form onSubmit={submit} className="flex flex-col gap-6">
                <div className="text-center">
                    <h1 className="text-text-dark dark:text-text-light text-xl font-semibold font-body">
                        How was your order?
                    </h1>
                    <p className="text-neutral-gray text-sm mt-1 font-body">
                        {prompt?.branch_name
                            ? `${prompt.branch_name} · ${prompt.order_number}`
                            : prompt?.order_number}
                    </p>
                </div>

                {error && (
                    <p className="text-error text-sm font-body text-center">{error}</p>
                )}

                <Stars label="Overall" value={overall} onChange={setOverall} large required />

                {/*
                    Revealed only once they have committed to a score. Three empty
                    star rows is a form; one is a question.
                */}
                {overall > 0 && (
                    <div className="flex flex-col gap-4 pt-1">
                        <p className="text-neutral-gray text-xs font-body text-center">
                            Want to be more specific? Optional.
                        </p>
                        <Stars label="The food" value={food} onChange={setFood} />
                        <Stars label="Service" value={service} onChange={setService} />
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-text-dark dark:text-neutral-light mb-1.5 font-body">
                        Anything you want to tell us?
                    </label>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={3}
                        maxLength={2000}
                        placeholder="The jollof was perfect, but the rider took a while."
                        className="w-full rounded-2xl border border-brown-light/25 bg-white dark:bg-brand-darker px-4 py-3 text-sm font-body text-text-dark dark:text-text-light focus:outline-none focus:border-primary resize-y"
                    />
                </div>

                <button
                    type="submit"
                    disabled={sending}
                    className="w-full rounded-2xl bg-primary hover:bg-primary-hover disabled:opacity-60 text-white text-sm font-semibold font-body py-3.5 transition-colors flex items-center justify-center gap-2"
                >
                    {sending && <SpinnerGapIcon size={16} className="animate-spin" />}
                    Send
                </button>

                <p className="text-neutral-gray text-xs text-center font-body flex items-center justify-center gap-1.5">
                    <HeartIcon size={12} weight="fill" className="text-primary/60" />
                    Takes ten seconds. We read every one.
                </p>
            </form>
        </Shell>
    );
}

function Stars({
    label, value, onChange, large, required,
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    large?: boolean;
    required?: boolean;
}) {
    const size = large ? 40 : 28;

    return (
        <div className={large ? 'text-center' : 'flex items-center justify-between gap-4'}>
            <p className={`font-body ${large
                ? 'text-neutral-gray text-sm mb-3'
                : 'text-text-dark dark:text-text-light text-sm font-medium'}`}
            >
                {label}
                {required && <span className="text-primary"> *</span>}
            </p>

            <div className={`flex gap-1.5 ${large ? 'justify-center' : ''}`}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => onChange(star === value ? 0 : star)}
                        aria-label={`${label}: ${star} out of 5`}
                        aria-pressed={star <= value}
                        className="transition-transform active:scale-90"
                    >
                        <StarIcon
                            size={size}
                            weight={star <= value ? 'fill' : 'regular'}
                            className={star <= value ? 'text-primary' : 'text-neutral-gray/35'}
                        />
                    </button>
                ))}
            </div>
        </div>
    );
}

function Shell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-neutral-light dark:bg-brand-darker flex flex-col items-center px-4 py-10">
            <Image src="/cblogo.webp" alt="CediBites" width={44} height={44} className="mb-6" priority />

            <div className="w-full max-w-sm bg-white dark:bg-brand-dark rounded-3xl border border-brown-light/20 shadow-sm px-6 py-7">
                {children}
            </div>
        </div>
    );
}
