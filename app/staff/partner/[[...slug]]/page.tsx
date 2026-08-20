import { redirect } from 'next/navigation';

/**
 * The partner portal moved to /partner/* in the 2026-06 redesign, but a stale
 * copy of the old screens lived on here and /staff/dashboard still routed
 * partners into it — so some partners were served the pre-redesign portal,
 * branch switcher and all missing. The old screens are gone; these paths now
 * forward to their current equivalents so existing bookmarks still land.
 */
const LEGACY_ROUTES: Record<string, string> = {
    dashboard: '/partner/dashboard',
    orders: '/partner/orders',
    branch: '/partner/branch',
    analytics: '/partner/analytics',
    profile: '/partner/profile',
    // The standalone staff screen was folded into My Branch as a team roster.
    staff: '/partner/branch',
};

export default async function LegacyPartnerRedirect({ params }: { params: Promise<{ slug?: string[] }> }) {
    const { slug } = await params;
    redirect(LEGACY_ROUTES[slug?.[0] ?? ''] ?? '/partner/dashboard');
}
