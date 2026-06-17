import { HTMLAttributes, ReactNode } from 'react';
import type { Tone } from '@/types/components';

type BadgeVariant = 'soft' | 'solid' | 'outline';
type BadgeSize = 'sm' | 'md';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    children: ReactNode;
    tone?: Tone;
    variant?: BadgeVariant;
    size?: BadgeSize;
    /** Optional leading dot (e.g. status indicator). */
    dot?: boolean;
}

/** Per-tone classes. `soft` = tinted bg + colored text (legible on both themes). */
const toneClasses: Record<Tone, Record<BadgeVariant, string>> = {
    primary:   { soft: 'bg-primary/12 text-primary',     solid: 'bg-primary text-white',     outline: 'border border-primary/40 text-primary' },
    secondary: { soft: 'bg-secondary/15 text-secondary', solid: 'bg-secondary text-white',   outline: 'border border-secondary/40 text-secondary' },
    tertiary:  { soft: 'bg-tertiary/18 text-tertiary',   solid: 'bg-tertiary text-brown',    outline: 'border border-tertiary/50 text-tertiary' },
    success:   { soft: 'bg-success/15 text-success',     solid: 'bg-success text-white',     outline: 'border border-success/40 text-success' },
    warning:   { soft: 'bg-warning/18 text-warning',     solid: 'bg-warning text-brown',     outline: 'border border-warning/50 text-warning' },
    error:     { soft: 'bg-error/12 text-error',         solid: 'bg-error text-white',       outline: 'border border-error/40 text-error' },
    info:      { soft: 'bg-info/12 text-info',           solid: 'bg-info text-white',        outline: 'border border-info/40 text-info' },
    neutral:   { soft: 'bg-fg/8 text-fg-muted',          solid: 'bg-fg-muted text-bg',       outline: 'border border-border text-fg-muted' },
};

const dotColor: Record<Tone, string> = {
    primary: 'bg-primary', secondary: 'bg-secondary', tertiary: 'bg-tertiary',
    success: 'bg-success', warning: 'bg-warning', error: 'bg-error',
    info: 'bg-info', neutral: 'bg-fg-subtle',
};

const sizeClasses: Record<BadgeSize, string> = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
};

export default function Badge({
    children,
    tone = 'neutral',
    variant = 'soft',
    size = 'md',
    dot = false,
    className = '',
    ...props
}: BadgeProps) {
    return (
        <span
            className={`inline-flex items-center font-semibold rounded-full leading-none whitespace-nowrap ${toneClasses[tone][variant]} ${sizeClasses[size]} ${className}`}
            {...props}
        >
            {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${variant === 'solid' ? 'bg-current' : dotColor[tone]}`} />}
            {children}
        </span>
    );
}
