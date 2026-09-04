/**
 * The time according to the server, not according to this machine.
 *
 * A till at Ashaiman printed a reprint stamped 01:28:00 pm for an order the
 * server had recorded at 02:28:51 pm. Nothing was out of order: the receipt's
 * Date line comes from the server and was correct to the second, and the
 * Reprinted line was the one thing on the slip asking the local computer what
 * time it was. That computer is an hour behind, and had been since it was set
 * up. Nobody could have noticed until a reprint and an original appeared on the
 * same piece of paper.
 *
 * Ghana is UTC+0 all year with no daylight saving, so a clean one-hour gap can
 * never come from our own formatting. It can only come from the clock.
 *
 * The offset is learned passively from the `Date` header that every HTTP
 * response already carries, so this costs no extra request and no setup. One
 * second of resolution and a little network latency are irrelevant here: the
 * problem being solved is measured in hours.
 *
 * The rule this exists to enforce: anything a customer or an auditor will read
 * takes its time from here, never from `new Date()`. See CLAUDE.md.
 */

/** serverTime - clientTime, in ms. Zero until a response has been seen. */
let offsetMs = 0;
let learned = false;

/**
 * Record the server's clock from a response.
 *
 * Called from the API client's response interceptor for every request, success
 * or failure, because a till with a broken clock is not necessarily a till with
 * a broken connection.
 */
export function noteServerTime(dateHeader: string | undefined | null): void {
  if (!dateHeader) return;

  const serverMs = Date.parse(dateHeader);
  if (Number.isNaN(serverMs)) return;

  offsetMs = serverMs - Date.now();
  learned = true;
}

/**
 * Now, corrected to the server's clock.
 *
 * Falls back to this machine's clock when no response has been seen yet, which
 * is the best available answer rather than a good one. A receipt printed before
 * the first API call of a session is not a situation that arises: the order it
 * describes had to be fetched or created first.
 */
export function serverNow(): Date {
  return new Date(Date.now() + offsetMs);
}

/**
 * How far this machine's clock is from the server's, in seconds.
 *
 * Positive means the machine is behind. Exposed so a screen can warn somebody
 * that the till they are standing at is wrong, which is a fixable thing that
 * otherwise stays invisible.
 */
export function clockSkewSeconds(): number | null {
  return learned ? Math.round(offsetMs / 1000) : null;
}
