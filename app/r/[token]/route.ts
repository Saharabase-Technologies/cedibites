import { NextRequest, NextResponse } from 'next/server';

/**
 * The short-link redirect.
 *
 * A customer taps `cedibites.com/r/A7X9Kp` in an SMS. Cloudflare 301s the apex
 * to `app.cedibites.com` and preserves the path, which lands here. We ask the
 * API where the token goes, and send them on.
 *
 *   cedibites.com/r/A7X9Kp
 *     → 301 (Cloudflare) app.cedibites.com/r/A7X9Kp
 *     → this handler → POST /v1/links/A7X9Kp/resolve
 *     → 302 → destination
 *
 * One extra hop nobody perceives, in exchange for a link 55 characters shorter
 * than the campaign URL it replaces — which is the difference between one billed
 * SMS segment and two, across the whole send.
 */

/** Never prerendered, never cached: every tap has to reach the API to be counted. */
export const dynamic = 'force-dynamic';

const API_BASE =
    process.env.API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:8000/api/v1';

/** Long enough for a cold API, short enough that a customer does not sit staring. */
const RESOLVE_TIMEOUT_MS = 4000;

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> },
) {
    const { token } = await params;

    const target = await resolveTarget(token, {
        // Forwarded explicitly. The API sees a request from *this server*, not
        // from the customer — reading the headers on its own end would record
        // our own user agent 28,000 times and tell us nothing.
        user_agent: request.headers.get('user-agent'),
        referer: request.headers.get('referer'),
    });

    if (!target) {
        // A dead link should not be a dead end. Somebody tapped a message we
        // sent them; the homepage is a better answer than a 404 for a promo
        // that has ended.
        return redirect(new URL('/?link=expired', request.nextUrl.origin).toString());
    }

    return redirect(target);
}

/**
 * Ask the API where this goes. Null for anything that is not a live link.
 *
 * Deliberately forgiving: a timeout, a 500 or a malformed body all resolve to
 * null and land the customer on the homepage. The alternative is a Next.js
 * error page shown to somebody who did nothing wrong.
 */
async function resolveTarget(
    token: string,
    forwarded: { user_agent: string | null; referer: string | null },
): Promise<string | null> {
    try {
        const response = await fetch(`${API_BASE}/links/${encodeURIComponent(token)}/resolve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(forwarded),
            cache: 'no-store',
            signal: AbortSignal.timeout(RESOLVE_TIMEOUT_MS),
        });

        if (!response.ok) return null;

        const body = (await response.json()) as { data?: { target_url?: string } };
        const target = body?.data?.target_url;

        // Only ever redirect to http(s). The API validates this on the way in;
        // checking again here means a bad row in the database cannot turn our
        // domain into a way of running somebody else's scheme handler.
        if (typeof target !== 'string' || !/^https?:\/\//i.test(target)) return null;

        return target;
    } catch {
        return null;
    }
}

/**
 * 302, not 301.
 *
 * A permanent redirect is cached by the browser, so the second tap never
 * reaches us: the click count silently undercounts, and a mistyped link can
 * never be repointed for anyone who already followed it once.
 */
function redirect(target: string): NextResponse {
    const response = NextResponse.redirect(target, 302);
    response.headers.set('Cache-Control', 'no-store, max-age=0');

    return response;
}
