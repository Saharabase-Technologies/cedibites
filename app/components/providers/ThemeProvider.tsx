'use client';

import { ThemeProvider as NextThemeProvider } from 'next-themes';

/**
 * Light only, everywhere, by decision.
 *
 * `forcedTheme` is the strict form: it ignores the operating system and any
 * preference already stored in localStorage, so a phone set to dark still gets
 * the light interface. Nothing ever writes `.dark` onto <html>, which means
 * every `dark:` utility in the codebase is inert rather than merely unused.
 *
 * The dark token blocks in globals.css stay. They cost nothing while no element
 * carries `.dark`, and deleting them would make bringing dark back a rebuild
 * rather than a one-line change here.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
    return (
        <NextThemeProvider
            attribute="class"
            forcedTheme="light"
            enableSystem={false}
            disableTransitionOnChange
        >
            {children}
        </NextThemeProvider>
    );
}
