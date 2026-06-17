import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    active?: boolean;
    icon?: ReactNode;
}

/**
 * Selectable pill (e.g. menu category filters). Active uses the primary
 * fill; idle uses a bordered neutral that flips cleanly with the theme.
 */
export default function Chip({
    children,
    active = false,
    icon,
    className = '',
    ...props
}: ChipProps) {
    return (
        <button
            type="button"
            aria-pressed={active}
            className={`cursor-pointer shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
                border transition-all duration-200 active:scale-[0.97]
                ${active
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-transparent border-border text-fg-muted hover:text-fg hover:border-primary/40 hover:bg-primary/8'
                } ${className}`}
            {...props}
        >
            {icon && <span className="shrink-0">{icon}</span>}
            {children}
        </button>
    );
}
