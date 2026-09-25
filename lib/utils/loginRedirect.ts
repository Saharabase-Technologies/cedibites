/**
 * Sending someone to sign in, and back to where they were going.
 *
 * Head office's alerts arrive as texts with a link to the exact page: the
 * opening that went wrong, the cancel request, the error. Staff tokens last a
 * day, so the link often lands signed out. Without this, signing in dropped
 * them on their dashboard and they had to find the page again.
 */

const LOGIN = '/staff/login';

/**
 * The sign-in page, remembering `path`. Pass nothing to remember the page the
 * browser is on now.
 */
export function loginUrlFor(path?: string): string {
    const here = path ?? (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '');
    const next = safeNextPath(here);
    return next ? `${LOGIN}?next=${encodeURIComponent(next)}` : LOGIN;
}

/**
 * A path on this site worth returning to, or null.
 *
 * Only a path, never an address: `//evil.example` and `https://…` are
 * refused, or a link in a text could sign somebody in and hand them to
 * another site. Sign-in pages are refused so nobody lands back on one.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
    if (!raw) return null;
    if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return null;
    if (/^\/staff\/(login|forgot-password|reset-password|change-password)\b/.test(raw)) return null;
    return raw;
}

/** The `next` of the sign-in page's own address, checked. */
export function nextFromLocation(): string | null {
    if (typeof window === 'undefined') return null;
    return safeNextPath(new URLSearchParams(window.location.search).get('next'));
}
