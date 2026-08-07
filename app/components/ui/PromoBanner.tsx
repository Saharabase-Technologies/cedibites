'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRightIcon, ClockIcon, SealPercentIcon, MotorcycleIcon, StarIcon } from '@phosphor-icons/react';

// ============================================
// BANNER DATA — swap these out for real promos
// ============================================
const BANNERS = [
    {
        id: 1,
        tag: 'Best Combo',
        tagIcon: <StarIcon weight="fill" size={14} />,
        headline: 'Jollof + 3 Drumsticks',
        subheadline: 'Street Package • GHS 95',
        cta: 'Order Now',
        accent: '#e49925',
        bg: '#372b1e',
        pattern: 'diagonal',
    },
    {
        id: 2,
        tag: 'Big Budget',
        tagIcon: <SealPercentIcon weight="fill" size={14} />,
        headline: 'Assorted Jollof + Full Chicken',
        subheadline: '+ Korkoor • GHS 255',
        cta: 'Grab the Deal',
        accent: '#6c833f',
        bg: '#1d1a16',
        pattern: 'dots',
    },
    {
        id: 3,
        tag: 'Grilled Special',
        tagIcon: <MotorcycleIcon weight="fill" size={14} />,
        headline: 'Banku & Grilled Tilapia',
        subheadline: 'GHS 110 • Freshly grilled',
        cta: 'Try It Now',
        accent: '#e49925',
        bg: '#120f0d',
        pattern: 'circles',
    },
    {
        id: 4,
        tag: 'Chef’s Choice',
        tagIcon: <ClockIcon weight="fill" size={14} />,
        headline: 'Fried Rice + 7 Drums + Korkoor',
        subheadline: 'Big Budget Meal • GHS 145',
        cta: 'See Menu',
        accent: '#f1ab3e',
        bg: '#372b1e',
        pattern: 'diagonal',
    },
];

// ============================================
// PATTERN BACKGROUNDS (pure CSS, no images)
// ============================================
function PatternBg({ type, accent }: { type: string; accent: string }) {
    if (type === 'diagonal') {
        return (
            <div
                className="absolute inset-0 opacity-[0.07]"
                style={{
                    backgroundImage: `repeating-linear-gradient(
                        45deg,
                        ${accent} 0px,
                        ${accent} 1px,
                        transparent 1px,
                        transparent 18px
                    )`,
                }}
            />
        );
    }
    if (type === 'dots') {
        return (
            <div
                className="absolute inset-0 opacity-[0.08]"
                style={{
                    backgroundImage: `radial-gradient(circle, ${accent} 1px, transparent 1px)`,
                    backgroundSize: '20px 20px',
                }}
            />
        );
    }
    // circles
    return (
        <div className="absolute inset-0 overflow-hidden opacity-[0.06]">
            {[120, 200, 80].map((size, i) => (
                <div
                    key={i}
                    className="absolute rounded-full border-2"
                    style={{
                        width: size,
                        height: size,
                        borderColor: accent,
                        right: `${i * 80 - 40}px`,
                        top: '50%',
                        transform: 'translateY(-50%)',
                    }}
                />
            ))}
        </div>
    );
}

// ============================================
// DOT INDICATOR
// ============================================
function Dots({ total, active, onDotClick }: { total: number; active: number; onDotClick: (i: number) => void }) {
    return (
        <div className="flex items-center gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
                <button
                    key={i}
                    onClick={() => onDotClick(i)}
                    className="transition-all duration-300 rounded-full"
                    style={{
                        width: i === active ? 20 : 6,
                        height: 6,
                        backgroundColor: i === active ? '#e49925' : 'rgba(255,255,255,0.3)',
                    }}
                    aria-label={`Go to banner ${i + 1}`}
                />
            ))}
        </div>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function PromoBanner() {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    const goTo = useCallback((index: number) => {
        if (isAnimating) return;
        setIsAnimating(true);
        setTimeout(() => {
            setActiveIndex(index);
            setIsAnimating(false);
        }, 200);
    }, [isAnimating]);

    // Auto-rotate every 5 seconds
    useEffect(() => {
        const timer = setInterval(() => {
            goTo((activeIndex + 1) % BANNERS.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [activeIndex, goTo]);

    const banner = BANNERS[activeIndex];

    return (
        <div className="w-full mx-auto mb- mt-">
            {/* Card */}
            <div
                className="relative overflow-hidden rounded-2xl px-6 py-5 md:px-10 md:py-7 transition-all duration-300"
                style={{ backgroundColor: banner.bg }}
            >
                {/* Pattern overlay */}
                <PatternBg type={banner.pattern} accent={banner.accent} />

                {/* Glow blob */}
                <div
                    className="absolute -right-16 -top-16 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
                    style={{ backgroundColor: banner.accent }}
                />

                {/* Content */}
                <div
                    className="relative z-10 flex items-center justify-between gap-4"
                    style={{ opacity: isAnimating ? 0 : 1, transition: 'opacity 0.2s ease' }}
                >
                    {/* Left */}
                    <div className="flex flex-col gap-2 min-w-0">
                        {/* Tag */}
                        <span
                            className="self-start flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full"
                            style={{ backgroundColor: `${banner.accent}25`, color: banner.accent }}
                        >
                            {banner.tagIcon}
                            {banner.tag}
                        </span>

                        {/* Headline */}
                        <h3 className="text-xl md:text-3xl font-bold text-white leading-tight">
                            {banner.headline}
                        </h3>

                        {/* Subheadline */}
                        <p className="text-sm md:text-base text-white/60 leading-snug">
                            {banner.subheadline}
                        </p>

                        {/* Bottom row: CTA + Dots */}
                        <div className="flex items-center gap-4 mt-2">
                            <button
                                className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-full transition-all duration-150 active:scale-95 hover:brightness-110"
                                style={{ backgroundColor: banner.accent, color: '#120f0d' }}
                            >
                                {banner.cta}
                                <ArrowRightIcon weight="bold" size={14} />
                            </button>

                            {/* Dots — mobile */}
                            <div className="flex md:hidden">
                                <Dots
                                    total={BANNERS.length}
                                    active={activeIndex}
                                    onDotClick={goTo}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right — dots desktop + progress ring */}
                    <div className="hidden md:flex flex-col items-center gap-4 shrink-0">
                        <Dots
                            total={BANNERS.length}
                            active={activeIndex}
                            onDotClick={goTo}
                        />
                        <p className="text-white/30 text-xs tabular-nums">
                            {activeIndex + 1} / {BANNERS.length}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}