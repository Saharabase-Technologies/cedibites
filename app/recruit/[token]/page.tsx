import type { Metadata } from 'next';
import { RecruitmentForm } from './RecruitmentForm';

/**
 * The public joining form.
 *
 * Deliberately outside (staff-auth), /admin and /staff: no auth provider, no
 * session, no staff chrome. Whoever opens this has already been taken on but does
 * not have an account yet, and filling the form in does not create one — the
 * submission waits for someone to check it.
 */
export const metadata: Metadata = {
    title: 'Join CediBites',
    // A joining link is sent to specific people for a few weeks. It has no
    // business in a search index.
    robots: { index: false, follow: false },
};

export default async function RecruitPage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;

    return <RecruitmentForm token={token} />;
}
