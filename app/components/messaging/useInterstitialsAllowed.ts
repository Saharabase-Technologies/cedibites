'use client';

import { usePathname } from 'next/navigation';

/**
 * Screens that nothing is allowed to take over.
 *
 * Signing in, recovering a password and being made to change one are all
 * moments where the person has not finished identifying themselves. A message
 * addressed to them cannot be shown before that is settled, and a modal with no
 * Escape and no close button sitting on top of a login form reads as a broken
 * site rather than as news.
 */
const CLOSED_TO_INTERSTITIALS = [
    '/staff/login',
    '/staff/forgot-password',
    '/staff/reset-password',
    '/staff/change-password',
];

/**
 * Whether an interstitial may render on the current route.
 *
 * This lives in the components rather than at each mount site on purpose. The
 * staff shell already refuses to draw its chrome on these paths, but
 * CautionInterstitial and ReleaseWalkthrough are mounted as siblings of that
 * shell so a claim survives navigation, which put them outside the guard: a
 * walkthrough rendered over /staff/login for anybody whose user object was
 * still in localStorage. Guarding inside the components means the next shell to
 * mount them cannot reintroduce it.
 */
export function useInterstitialsAllowed(): boolean {
    const pathname = usePathname();

    if (!pathname) return false;

    return !CLOSED_TO_INTERSTITIALS.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`),
    );
}
