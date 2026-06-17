import { HTMLAttributes, ReactNode } from 'react';

type Elevation = 'flat' | 'raised' | 'sunken';
type Padding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    elevation?: Elevation;
    padding?: Padding;
    /** Adds hover lift + pointer affordance for clickable cards. */
    interactive?: boolean;
}

const surfaceClasses: Record<Elevation, string> = {
    flat: 'bg-surface',
    raised: 'bg-surface-raised shadow-sm',
    sunken: 'bg-surface-sunken',
};

const paddingClasses: Record<Padding, string> = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6 md:p-8',
};

/** Theme-aware surface container. Backgrounds + border flip with the theme. */
export default function Card({
    children,
    elevation = 'flat',
    padding = 'md',
    interactive = false,
    className = '',
    ...props
}: CardProps) {
    const interactiveClasses = interactive
        ? 'cursor-pointer cb-press transition-all duration-200 hover:shadow-md hover:border-primary/30'
        : '';

    return (
        <div
            className={`rounded-2xl border border-border text-fg ${surfaceClasses[elevation]} ${paddingClasses[padding]} ${interactiveClasses} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}
