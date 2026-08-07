/**
 * Slice a report's capture buffers by page.
 *
 * A report roams: the reporter walks several screens before submitting, so one
 * flat list of steps, console lines and network calls mixes evidence from pages
 * that have nothing to do with each other. Triage needs "what happened on THIS
 * page".
 *
 * Nothing extra is captured to make this work. `nav` breadcrumbs already record
 * every route change with a timestamp, so the page a given moment belongs to is
 * derivable — which means this also works on reports submitted before per-page
 * notes existed.
 *
 * A page can be visited more than once, so a page's span is a set of intervals,
 * not one range.
 */

import type { FeedbackBreadcrumb } from '@/types/feedback';

/** Anything the capture layer stamps with a millisecond timestamp. */
interface Timestamped {
  at: number;
}

export interface PageSegment {
  route: string;
  /** Half-open [from, to) intervals this route was on screen for. */
  intervals: Array<{ from: number; to: number }>;
  /** Wall-clock of the first visit — orders the page list as the user walked it. */
  firstSeenAt: number;
}

/**
 * Build the page timeline from nav breadcrumbs.
 *
 * `fallbackRoute` (the report's own `route`) covers the common case of a report
 * whose capture contains no navigation at all — everything then belongs to the
 * single page it was filed from.
 */
export function buildPageSegments(
  breadcrumbs: FeedbackBreadcrumb[],
  fallbackRoute?: string | null,
): PageSegment[] {
  const navs = breadcrumbs
    .filter((b) => b.kind === 'nav' && typeof b.label === 'string' && b.label !== '')
    .sort((a, b) => a.at - b.at);

  if (navs.length === 0) {
    if (!fallbackRoute) return [];
    return [
      {
        route: fallbackRoute,
        intervals: [{ from: -Infinity, to: Infinity }],
        firstSeenAt: -Infinity,
      },
    ];
  }

  const byRoute = new Map<string, PageSegment>();

  navs.forEach((nav, i) => {
    // The first page starts at -Infinity: everything captured before the first
    // navigation happened on the page the session opened on.
    const from = i === 0 ? -Infinity : nav.at;
    const to = i + 1 < navs.length ? navs[i + 1].at : Infinity;

    const existing = byRoute.get(nav.label);
    if (existing) {
      existing.intervals.push({ from, to });
    } else {
      byRoute.set(nav.label, {
        route: nav.label,
        intervals: [{ from, to }],
        firstSeenAt: nav.at,
      });
    }
  });

  return [...byRoute.values()].sort((a, b) => a.firstSeenAt - b.firstSeenAt);
}

/** Whether a timestamp falls inside any of a page's intervals. */
export function isWithinSegment(at: number, segment: PageSegment): boolean {
  return segment.intervals.some(({ from, to }) => at >= from && at < to);
}

/**
 * Keep only the entries captured while the given page was on screen. A null
 * segment means "all pages" and passes everything through untouched.
 */
export function filterToSegment<T extends Timestamped>(
  entries: T[],
  segment: PageSegment | null,
): T[] {
  if (!segment) return entries;
  return entries.filter((entry) => isWithinSegment(entry.at, segment));
}
