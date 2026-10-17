/**
 * The written reports served at /reports/<slug>, newest first.
 *
 * Only the title and the dates live here. The page itself is an HTML file on
 * the server (see app/reports/[slug]/route.ts), because this repo is public and
 * a report carries the business's figures. Adding a report is a line here plus
 * a copy of its file to the server's reports folder.
 */
export interface Report {
    /** The address: app.cedibites.com/reports/<slug>. Lowercase, digits, hyphens. */
    slug: string;
    title: string;
    /** What it is about, in one line, for the admin's list. */
    summary: string;
    /** The days its figures cover. */
    period: string;
    /** When the version on the server was written. */
    updated: string;
}

export const REPORTS: Report[] = [
    {
        slug: 'bolt-food',
        title: 'Bolt Food at CediBites',
        summary: 'What Bolt orders brought in, what Bolt takes from each one, and how they reach the tills.',
        period: '30 Mar to 11 Oct 2026',
        updated: '16 Oct 2026',
    },
];

export function isReportSlug(slug: string): boolean {
    return REPORTS.some((r) => r.slug === slug);
}
