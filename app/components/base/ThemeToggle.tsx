'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { MoonIcon, SunIcon } from '@phosphor-icons/react';

interface ThemeToggleProps {
    className?: string;
}

/**
 * Light/Dark toggle. Renders a stable placeholder until mounted to avoid
 * a hydration mismatch (the server can't know the resolved theme).
 */
export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const isDark = resolvedTheme === 'dark';

    return (
        <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`relative w-10 h-10 flex items-center justify-center rounded-full cursor-pointer
                bg-surface-sunken hover:bg-fg/5 border border-border text-fg
                transition-colors ${className}`}
        >
            {mounted && (
                <>
                    <SunIcon
                        weight="fill"
                        size={20}
                        className={`absolute transition-all duration-300 text-tertiary ${isDark ? 'opacity-0 scale-50 -rotate-90' : 'opacity-100 scale-100 rotate-0'}`}
                    />
                    <MoonIcon
                        weight="fill"
                        size={18}
                        className={`absolute transition-all duration-300 ${isDark ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 rotate-90'}`}
                    />
                </>
            )}
        </button>
    );
}
