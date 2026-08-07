import type { Metadata } from 'next';
import { FeedbackForm } from './_components/FeedbackForm';

/**
 * "How was your order?"
 *
 * A page, not a redirect. Because the apex already forwards to the app,
 * cedibites.com/f/K3mQ9xR2 can *be* the form rather than bounce to it — one
 * fewer hop, and no row in short_links for every order.
 *
 * Deliberately outside (customer), /admin and /staff: no auth provider, no
 * session, no chrome. Whoever opens this is a customer who ate something a few
 * hours ago, and the token in the URL is the only credential they have or need.
 */
export const metadata: Metadata = {
    title: 'How was your order? · CediBites',
    // One person, one order, a few days. It has no business in a search index.
    robots: { index: false, follow: false },
};

export default async function OrderFeedbackPage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;

    return <FeedbackForm token={token} />;
}
