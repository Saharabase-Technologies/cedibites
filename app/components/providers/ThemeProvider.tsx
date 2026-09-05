'use client';

import { ThemeProvider as NextThemeProvider } from 'next-themes';

/**
 * Dark mode moved from the `prefers-color-scheme` media query to a `.dark`
 * class on <html>, because a media query cannot be overridden by a person.
 *
 * `defaultTheme="system"` keeps today's behaviour exactly: a visitor whose
 * phone is in dark mode still lands in dark. What changes is that a toggle is
 * now possible, and that a screen can be forced light or dark for a screenshot.
 *
 * `disableTransitionOnChange` stops the 0.2s background transition on `body`
 * from painting a grey wash across the whole page mid-switch.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
    return (
        <NextThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            {children}
        </NextThemeProvider>
    );
}
