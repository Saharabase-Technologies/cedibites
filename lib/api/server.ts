import 'server-only';

/**
 * Reads the server can do before the page is sent.
 *
 * Anything fetched from a `useEffect` arrives after the browser has already
 * painted, so the reader watches the answer pop into place. That is fine for
 * something volatile and wrong for something that barely changes: the order
 * number prefix is one value shared by everybody, and the tracking field was
 * rendering without it and then rewriting itself a moment later.
 *
 * These use the framework's own fetch cache with a revalidate window, so the
 * page stays statically renderable and the API is hit once per window per
 * server rather than once per visitor.
 */

const base = process.env.NEXT_PUBLIC_API_URL;

/**
 * The letters the order series is currently on, for prefilling the tracking
 * field. Null when the API cannot be reached, which the field handles by
 * asking for the whole code the way it always did.
 */
export async function getOrderPrefix(): Promise<string | null> {
    if (!base) return null;

    try {
        const res = await fetch(`${base}/orders/current-prefix`, {
            // Five minutes. A prefix covers 999 orders, so this is never the
            // reason somebody sees the wrong letters.
            next: { revalidate: 300 },
        });

        if (!res.ok) return null;

        const data = (await res.json()) as { prefix?: unknown };
        return typeof data.prefix === 'string' && /^[A-Z]{1,2}$/.test(data.prefix)
            ? data.prefix
            : null;
    } catch {
        // A build machine with no API, or an API having a bad minute. Neither is
        // a reason to fail the page.
        return null;
    }
}
