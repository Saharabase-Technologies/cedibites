import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { isReportSlug } from '@/lib/constants/reports';

/**
 * A written report, served as one page anybody with the link can open.
 *
 * The page is a single self-contained HTML file built outside this repo, and it
 * stays outside: the repo is public and a report carries the business's own
 * figures. The file sits on the server at REPORTS_DIR/<slug>.html. A new
 * version is a copy over the old file, with no build and no deploy.
 *
 * REPORTS_DIR defaults to two folders above the app, which is
 * /var/www/production/reports on prod and /var/www/beta/reports on beta. Both
 * belong to the deploy user, so no root is needed to add one.
 *
 * The slug must be on the list in lib/constants/reports.ts, so nothing else in
 * that folder is ever served, and a path can never climb out of it.
 */

/** Read on every request, so a new copy of the file shows at once. */
export const dynamic = 'force-dynamic';

const REPORTS_DIR =
    process.env.REPORTS_DIR ||
    path.join(/* turbopackIgnore: true */ process.cwd(), '..', '..', 'reports');

const HEADERS = {
    'Content-Type': 'text/html; charset=utf-8',
    // "Check before using", so the browser asks again and gets a new version.
    'Cache-Control': 'no-cache',
    // Open to anybody with the link, but kept out of search results.
    'X-Robots-Tag': 'noindex, nofollow',
    'X-Content-Type-Options': 'nosniff',
};

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ slug: string }> },
) {
    const { slug } = await params;

    if (!isReportSlug(slug)) return notFound();

    try {
        const html = await readFile(path.join(REPORTS_DIR, `${slug}.html`), 'utf8');
        return new Response(html, { headers: HEADERS });
    } catch {
        // Listed but not copied to this server yet.
        return notFound();
    }
}

function notFound() {
    return new Response(
        '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        + '<title>Report not found</title>'
        + '<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;color:#1f1a14">'
        + '<h1 style="font-size:1.25rem">This report is not here.</h1>'
        + '<p>Check the link, or ask the person who sent it.</p></body>',
        { status: 404, headers: HEADERS },
    );
}
