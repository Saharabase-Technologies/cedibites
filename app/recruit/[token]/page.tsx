import type { Metadata } from 'next';
import { RecruitmentForm } from './RecruitmentForm';

/**
 * The public recruitment form.
 *
 * Deliberately outside (staff-auth), /admin and /staff: no auth provider, no
 * session, no staff chrome. Whoever opens this does not have an account and is
 * not going to get one by filling it in — a submission is a row waiting for a
 * reviewer.
 */
export const metadata: Metadata = {
    title: 'Apply — CediBites',
    // A recruitment link is sent to specific people for a few weeks. It has no
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
