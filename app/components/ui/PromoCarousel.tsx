'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRightIcon, StarIcon, SealPercentIcon, FireIcon, ForkKnifeIcon } from '@phosphor-icons/react';

type Deal = {
    id: number;
    tag: string;
    tagIcon: React.ReactNode;
    name: string;
    sub: string;
    cta: string;
    accent: string; // brand accent for this card
    bg: string;     // dark base
};

const DEALS: Deal[] = [
    { id: 1, tag: 'Best Combo', tagIcon: <StarIcon weight="fill" size={12} />, name: 'Jollof + 3 Drumsticks', sub: 'Street Package · GHS 95', cta: 'Order', accent: '#efa52e', bg: '#372b1e' },
    { id: 2, tag: 'Big Budget', tagIcon: <SealPercentIcon weight="fill" size={12} />, name: 'Assorted Jollof + Full Chicken', sub: '+ Korkoor · GHS 255', cta: 'Grab deal', accent: '#8fa84e', bg: '#2a2018' },
    { id: 3, tag: 'Grilled', tagIcon: <FireIcon weight="fill" size={12} />, name: 'Banku & Grilled Tilapia', sub: 'Freshly grilled · GHS 110', cta: 'Try it', accent: '#ce3b2b', bg: '#372b1e' },
    { id: 4, tag: 'Chef’s Choice', tagIcon: <ForkKnifeIcon weight="fill" size={12} />, name: 'Fried Rice + 7 Drums + Korkoor', sub: 'Big Budget Meal · GHS 145', cta: 'See menu', accent: '#f1ab3e', bg: '#2a2018' },
];

export default function PromoCarousel() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState(0);
    const paused = useRef(false);

    const stride = () => {
        const el = scrollRef.current;
        return el ? el.scrollWidth / DEALS.length : 0;
    };

    const scrollToIndex = useCallback((i: number) => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTo({ left: i * stride(), behavior: 'smooth' });
    }, []);

    const onScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        const s = stride();
        if (s > 0) setActive(Math.round(el.scrollLeft / s));
    };

    // Gentle auto-advance; pauses while the user interacts.
    useEffect(() => {
        const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) return;
        const t = setInterval(() => {
            if (paused.current) return;
            const next = (active + 1) % DEALS.length;
            scrollToIndex(next);
        }, 5000);
        return () => clearInterval(t);
    }, [active, scrollToIndex]);

    return (
        <div
            onPointerDown={() => { paused.current = true; }}
            onPointerUp={() => { paused.current = false; }}
            onMouseEnter={() => { paused.current = true; }}
            onMouseLeave={() => { paused.current = false; }}
        >
            <div
                ref={scrollRef}
                onScroll={onScroll}
                className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth -mx-1 px-1 pb-1"
            >
                {DEALS.map((d) => (
                    <article
                        key={d.id}
                        className="snap-start shrink-0 w-[86%] sm:w-[340px] relative overflow-hidden rounded-2xl border border-white/8 p-4 md:p-5"
                        style={{ backgroundColor: d.bg }}
                    >
                        {/* subtle diagonal texture */}
                        <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
                            style={{ backgroundImage: `repeating-linear-gradient(45deg, ${d.accent} 0 1px, transparent 1px 16px)` }} />
                        {/* accent glow */}
                        <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none"
                            style={{ backgroundColor: d.accent }} />

                        <div className="relative z-10 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full mb-2"
                                    style={{ backgroundColor: `${d.accent}26`, color: d.accent }}>
                                    {d.tagIcon}{d.tag}
                                </span>
                                <h3 className="text-base md:text-lg font-bold text-white leading-tight truncate">{d.name}</h3>
                                <p className="text-xs md:text-sm text-white/55 mt-0.5 truncate">{d.sub}</p>
                            </div>

                            <button
                                className="cb-press shrink-0 inline-flex items-center gap-1.5 text-xs font-bold pl-3.5 pr-3 py-2.5 rounded-full hover:brightness-110"
                                style={{ backgroundColor: d.accent, color: '#120f0d' }}
                            >
                                {d.cta}
                                <ArrowRightIcon weight="bold" size={13} />
                            </button>
                        </div>
                    </article>
                ))}
            </div>

            {/* Dots */}
            <div className="flex items-center justify-center gap-1.5 mt-2.5">
                {DEALS.map((d, i) => (
                    <button
                        key={d.id}
                        onClick={() => scrollToIndex(i)}
                        aria-label={`Go to deal ${i + 1}`}
                        className="h-1.5 rounded-full transition-all duration-300"
                        style={{
                            width: i === active ? 18 : 6,
                            backgroundColor: i === active ? 'var(--cb-gold-500)' : 'var(--cb-divider)',
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
