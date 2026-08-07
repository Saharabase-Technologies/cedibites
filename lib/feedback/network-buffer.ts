/**
 * Network breadcrumbs. Records one entry per API response/error: method,
 * redacted URL, status, duration, request id. Fed from the shared axios
 * interceptors (lib/api/client.ts).
 *
 * I5 redaction is structural: we never read headers or bodies. Sensitive
 * query-param VALUES are stripped by name-match — over-redacting is the safe
 * direction. An unparseable URL drops its whole query string.
 * I1: every push wrapped.
 */
import { RingBuffer } from './ring-buffer';
import type { NetworkEntry } from './types';

const ENTRIES = new RingBuffer<NetworkEntry>(50);

const SENSITIVE = /token|secret|password|key|auth|otp|code|session/i;

/** Strip sensitive query-param values; on any parse failure, drop the query. */
export function redactUrl(raw: string): string {
  try {
    // Relative URLs need a base to parse; the origin is discarded afterward.
    const u = new URL(raw, 'http://x');
    u.searchParams.forEach((_v, k) => {
      if (SENSITIVE.test(k)) u.searchParams.set(k, '‹redacted›');
    });
    const path = u.pathname;
    const query = u.searchParams.toString();
    return query ? `${path}?${query}` : path;
  } catch {
    const q = raw.indexOf('?');
    return q === -1 ? raw : raw.slice(0, q);
  }
}

export function recordNetwork(entry: Omit<NetworkEntry, 'at' | 'url'> & { url: string }): void {
  try {
    ENTRIES.push({ ...entry, url: redactUrl(entry.url), at: Date.now() });
  } catch {
    /* I1 */
  }
}

export function networkEntries(): NetworkEntry[] {
  return ENTRIES.toArray();
}
