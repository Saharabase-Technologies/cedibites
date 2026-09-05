import React from 'react';

type Tone = 'red' | 'ink' | 'plain';

const TONE: Record<Tone, string> = {
    red: 'bg-primary text-white',
    ink: 'bg-fg text-bg',
    plain: 'text-fg',
};

const SIZE = {
    sm: 'text-xl md:text-2xl',
    md: 'text-2xl md:text-3xl',
    lg: 'text-3xl md:text-5xl',
};

/**
 * The brand's headline device: white condensed caps in a solid red block.
 *
 * It is the one thing every CediBites flyer has in common, and it is the reason
 * the artwork reads as CediBites from across a room. Bringing it into the app
 * is what stops the product looking like a generic ordering template that
 * happens to be red.
 *
 * The block is display type only. At 24px and up in a heavy condensed face,
 * white on #f40002 clears AA as large text; at body sizes it would not, which
 * is why there is no small variant and why running copy never gets this.
 */
export default function BlockHeading({
    children,
    tone = 'red',
    size = 'md',
    className = '',
    as: Tag = 'h2',
}: {
    children: React.ReactNode;
    tone?: Tone;
    size?: keyof typeof SIZE;
    className?: string;
    as?: 'h1' | 'h2' | 'h3';
}) {
    return (
        <Tag className={`font-brand leading-[1.15] tracking-wide ${SIZE[size]} ${className}`}>
            <span
                className={`block-heading ${TONE[tone]} ${
                    tone === 'plain' ? '' : 'px-3 py-1'
                }`}
            >
                {children}
            </span>
        </Tag>
    );
}
