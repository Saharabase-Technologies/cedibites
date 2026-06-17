import { HTMLAttributes, ReactNode } from 'react';

interface DividerProps extends HTMLAttributes<HTMLDivElement> {
    orientation?: 'horizontal' | 'vertical';
    /** Optional centered label, e.g. "or". Horizontal only. */
    label?: ReactNode;
}

/**
 * Uniform divider. Always uses the `--cb-divider` token so every hairline
 * across the app matches and adapts to light/dark.
 */
export default function Divider({
    orientation = 'horizontal',
    label,
    className = '',
    ...props
}: DividerProps) {
    if (orientation === 'vertical') {
        return <div role="separator" aria-orientation="vertical" className={`divider-vertical ${className}`} {...props} />;
    }

    if (label) {
        return (
            <div className={`flex items-center gap-3 ${className}`} {...props}>
                <span className="divider flex-1" />
                <span className="text-xs font-medium text-fg-subtle whitespace-nowrap">{label}</span>
                <span className="divider flex-1" />
            </div>
        );
    }

    return <hr role="separator" className={`divider ${className}`} {...props} />;
}
