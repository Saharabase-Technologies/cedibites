'use client';

import { forwardRef, useState } from 'react';
import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react';

type SearchSize = 'sm' | 'md' | 'lg';

interface SearchFieldProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    size?: SearchSize;
    onFocus?: () => void;
    onBlur?: () => void;
    onEnter?: () => void;
    /** Called after the field is cleared (value already reset to ''). */
    onClear?: () => void;
    className?: string;
    autoFocus?: boolean;
    name?: string;
    id?: string;
    'aria-label'?: string;
}

const sizeMap: Record<SearchSize, { pad: string; text: string; icon: number; iconLeft: string; pl: string; pr: string; clear: string; clearPos: string }> = {
    sm: { pad: 'py-2',           text: 'text-sm',                icon: 17, iconLeft: 'left-3',   pl: 'pl-9',  pr: 'pr-9',  clear: 'w-6 h-6',   clearPos: 'right-2' },
    md: { pad: 'py-2.5 md:py-3', text: 'text-[15px] md:text-base', icon: 19, iconLeft: 'left-3.5', pl: 'pl-11', pr: 'pr-11', clear: 'w-7 h-7',   clearPos: 'right-2.5' },
    lg: { pad: 'py-3 md:py-3.5', text: 'text-base md:text-lg',   icon: 22, iconLeft: 'left-4',   pl: 'pl-12', pr: 'pr-12', clear: 'w-8 h-8',   clearPos: 'right-3' },
};

/**
 * Reusable search input — magnifier + clear button, pill shape, gold focus
 * border (never reads as an error), semantic tokens so it flips with the
 * theme. forwardRef so callers can focus it (e.g. ⌘K). Stateless beyond its
 * own focus styling; the caller owns value + any results dropdown.
 */
const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(({
    value,
    onChange,
    placeholder = 'Search…',
    size = 'md',
    onFocus,
    onBlur,
    onEnter,
    onClear,
    className = '',
    autoFocus = false,
    name,
    id,
    'aria-label': ariaLabel,
}, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const s = sizeMap[size];

    const handleClear = () => {
        onChange('');
        onClear?.();
        if (ref && typeof ref !== 'function') ref.current?.focus();
    };

    return (
        <div className={`relative w-full flex items-center ${className}`}>
            <MagnifyingGlassIcon
                size={s.icon}
                weight="bold"
                aria-hidden="true"
                className={`absolute ${s.iconLeft} top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${isFocused ? 'text-tertiary' : 'text-fg-subtle'}`}
            />

            <input
                ref={ref}
                id={id || name}
                name={name}
                type="search"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                autoFocus={autoFocus}
                aria-label={ariaLabel || placeholder}
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => { setIsFocused(true); onFocus?.(); }}
                onBlur={() => { setIsFocused(false); onBlur?.(); }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') onEnter?.();
                    if (e.key === 'Escape') (e.target as HTMLInputElement).blur();
                }}
                className={`w-full ${s.pad} ${s.text} ${s.pl} ${value ? s.pr : 'pr-4'}
                    bg-surface-sunken border rounded-full
                    ${isFocused ? 'border-tertiary' : 'border-border hover:border-fg/25'}
                    text-fg font-medium placeholder:text-fg-subtle placeholder:font-normal
                    transition-colors duration-150 outline-none
                    [&::-webkit-search-cancel-button]:appearance-none`}
            />

            {value && (
                <button
                    type="button"
                    onClick={handleClear}
                    aria-label="Clear search"
                    className={`absolute ${s.clearPos} ${s.clear} top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full text-fg-subtle hover:text-fg hover:bg-fg/8 transition-colors`}
                >
                    <XIcon size={size === 'sm' ? 14 : 16} weight="bold" />
                </button>
            )}
        </div>
    );
});

SearchField.displayName = 'SearchField';

export default SearchField;
