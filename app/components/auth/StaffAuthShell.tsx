'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';

/** Shared card styling for the staff auth screens. */
export const authCardClass =
    'relative rounded-3xl border border-brown-light/15 bg-neutral-card/80 dark:bg-brand-dark/80 ' +
    'shadow-[0_20px_60px_-20px_rgba(55,43,30,0.35)] backdrop-blur-xl p-6 sm:p-8';

interface StaffAuthShellProps {
    children: ReactNode;
    /** Short rotating value-prop shown on the branded panel. */
    tagline?: string;
}

/**
 * Premium, responsive shell for every staff auth screen (login, forgot &
 * reset password). Uses `min-h-[100dvh]` + scroll so the form is never
 * clipped on short/embedded viewports such as the POS terminal — the old
 * `h-screen` + vertically-centred layout cut off the top/bottom there.
 *
 * On large screens it splits into a branded panel + form column; on smaller
 * screens it collapses to a single centred column with a compact logo.
 */
export default function StaffAuthShell({ children, tagline }: StaffAuthShellProps) {
    return (
        <div className="relative min-h-[100dvh] w-full overflow-y-auto bg-neutral-light dark:bg-brand-darker lg:flex">

            {/* Ambient background — warm gradient wash + dotted texture */}
            <div className="pointer-events-none fixed inset-0" aria-hidden="true">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-light/40 via-transparent to-secondary-light/30 dark:from-primary/10 dark:via-transparent dark:to-secondary/10" />
                <div
                    className="absolute inset-0 opacity-[0.035]"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e49925' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                />
            </div>

            {/* ── Branded panel (lg+) ── */}
            <aside className="relative hidden lg:flex lg:w-[44%] xl:w-[40%] flex-col justify-between overflow-hidden p-12 text-text-light">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-dark via-brown to-brand-darker" />
                <div
                    className="absolute inset-0 opacity-[0.06]"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffe2b5' fill-opacity='1'%3E%3Cpath d='M20 18v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4z'/%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                    aria-hidden="true"
                />
                {/* glow accents */}
                <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/25 blur-3xl" aria-hidden="true" />
                <div className="absolute bottom-0 -left-20 h-72 w-72 rounded-full bg-secondary/20 blur-3xl" aria-hidden="true" />

                <div className="relative animate-fade-in-down">
                    <div className="flex items-center gap-3">
                        <div className="animate-float">
                            <Image src="/cblogo.webp" alt="" width={48} height={48} priority />
                        </div>
                        <span className="text-2xl font-bold tracking-tight text-primary-light">CediBites</span>
                    </div>
                </div>

                <div className="relative animate-fade-in-up anim-delay-150">
                    <h2 className="text-3xl xl:text-4xl font-semibold leading-tight tracking-tight">
                        {tagline ?? 'Run your kitchen,\ncounter and deliveries\nfrom one place.'}
                    </h2>
                    <p className="mt-4 max-w-sm text-text-light/60 leading-relaxed">
                        The CediBites staff portal: orders, POS, kitchen and analytics, built for speed.
                    </p>
                </div>

                <p className="relative text-xs text-text-light/40">
                    &copy; {new Date().getFullYear()} CediBites &mdash; Internal Staff Portal
                </p>
            </aside>

            {/* ── Form column ── */}
            <main className="relative flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
                <div className="w-full max-w-md">

                    {/* Compact logo — only when the branded panel is hidden */}
                    <div className="mb-8 flex flex-col items-center lg:hidden animate-fade-in-down">
                        <div className="animate-float">
                            <Image src="/cblogo.webp" alt="CediBites" width={64} height={64} priority />
                        </div>
                        <h1 className="mt-3 text-2xl font-bold tracking-tight text-primary">CediBites</h1>
                        <p className="mt-0.5 text-sm text-neutral-gray">Staff Portal</p>
                    </div>

                    {children}

                    <p className="mt-6 text-center text-xs text-neutral-gray/40 lg:hidden">
                        CediBites &copy; {new Date().getFullYear()} &mdash; Internal Staff Portal
                    </p>
                </div>
            </main>
        </div>
    );
}
