'use client';

import { ElementType, ReactNode, useEffect, useRef, useState } from 'react';

/**
 * Transform-free entrances only — opacity / blur, never translate, so a
 * reveal can never shift layout or push content off-screen.
 */
type RevealAnimation = 'fade-in' | 'blur-in';

interface RevealProps {
    children: ReactNode;
    /** Which globals.css entrance keyframe to play. */
    animation?: RevealAnimation;
    /** Delay in ms before the animation runs. */
    delay?: number;
    /** Render as a different element (default div). */
    as?: ElementType;
    className?: string;
    /** Re-animate every time it enters the viewport (default: once). */
    once?: boolean;
}

/**
 * Plays one of the existing `.animate-*` CSS entrance animations the first
 * time the element scrolls into view — no JS animation library needed.
 * Falls back to visible immediately when reduced motion is preferred.
 */
export default function Reveal({
    children,
    animation = 'fade-in',
    delay = 0,
    as: Tag = 'div',
    className = '',
    once = true,
}: RevealProps) {
    const ref = useRef<HTMLElement | null>(null);
    const [shown, setShown] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce) { setShown(true); return; }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setShown(true);
                    if (once) observer.disconnect();
                } else if (!once) {
                    setShown(false);
                }
            },
            { threshold: 0.12, rootMargin: '0px 0px -10% 0px' }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [once]);

    return (
        <Tag
            ref={ref as React.Ref<HTMLElement>}
            className={`${shown ? `animate-${animation}` : 'opacity-0'} ${className}`}
            style={shown && delay ? { animationDelay: `${delay}ms` } : undefined}
        >
            {children}
        </Tag>
    );
}
