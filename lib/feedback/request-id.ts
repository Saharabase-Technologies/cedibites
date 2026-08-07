/**
 * Request-ID correlation — the crown jewel.
 *
 * Every outgoing API call gets a unique id stamped as `X-Request-ID`. The
 * backend echoes it into its request-log rows; a report ships the recent ids;
 * the triage dashboard joins on them to show exactly the backend lines for that
 * one user's actions — zero noise from other concurrent users.
 *
 * Wired into the shared axios request interceptor (lib/api/client.ts).
 */
import { RingBuffer } from './ring-buffer';

const RECENT_IDS = new RingBuffer<string>(50);

function uuid(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  // Non-secure fallback for older browsers — correlation ids need uniqueness,
  // not cryptographic strength.
  return 'rid-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
}

/** Mint a fresh request id and remember it. Called once per outgoing request. */
export function nextRequestId(): string {
  const id = uuid();
  RECENT_IDS.push(id);
  return id;
}

/** The recent request ids, oldest-first — shipped with a report. */
export function recentRequestIds(): string[] {
  return RECENT_IDS.toArray();
}
