import { serverNow } from './serverClock';

/**
 * When a closed branch opens again, in words a customer can plan around.
 *
 * "Nothing leaves the kitchen until it opens again" was true and told nobody
 * anything. "Ashaiman opens at 10:00 am" tells them whether to wait or go
 * elsewhere, which is the only decision they are making at that moment.
 *
 * Read off the server's clock, not the phone's. Ghana is UTC+0 all year with no
 * daylight saving, so the UTC fields of `serverNow()` are the local time.
 */

/** One day of a branch's week, as `operating_hours` stores it. */
export interface DayHours {
    isOpen: boolean;
    /** "HH:MM" or "HH:MM:SS", 24-hour. */
    openTime: string | null;
    closeTime: string | null;
    /** Set when somebody at the branch opened or shut it by hand. */
    overrideOpen: boolean | null;
}

/** Keyed by lowercase day name, the way the API sends it. */
export type WeekHours = Record<string, DayHours>;

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MIDNIGHT = 24 * 60;

function toMinutes(time: string | null): number | null {
    const m = time ? /^(\d{1,2}):(\d{2})/.exec(time) : null;
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    return h < 24 && min < 60 ? h * 60 + min : null;
}

/** 600 as "10:00 am". */
function clock(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = String(minutes % 60).padStart(2, '0');
    return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h < 12 ? 'am' : 'pm'}`;
}

/** A day's shift in minutes, or null when the day is shut or has no opening time. */
function shift(day: DayHours | undefined): { open: number; close: number } | null {
    if (!day?.isOpen) return null;
    const open = toMinutes(day.openTime);
    if (open === null) return null;
    return { open, close: toMinutes(day.closeTime) ?? MIDNIGHT };
}

/**
 * "at 10:00 am", "tomorrow at 10:00 am" or "on Monday at 10:00 am".
 *
 * Null whenever the timetable cannot honestly answer. That covers a branch
 * shut by hand, and a branch closed during hours it should be open, because
 * something other than the timetable shut it and the timetable does not know
 * when it comes back. A missing time reads better than a wrong one.
 */
export function nextOpening(hours: WeekHours | undefined, now: Date = serverNow()): string | null {
    if (!hours) return null;

    const dayIndex = now.getUTCDay();
    const nowMin = now.getUTCHours() * 60 + now.getUTCMinutes();
    const today = hours[DAYS[dayIndex]];

    if (today?.overrideOpen === false) return null;

    const t = shift(today);
    const y = shift(hours[DAYS[(dayIndex + 6) % 7]]);

    // A shift that runs past midnight is still open in the small hours of the
    // next day, so both today's and yesterday's count.
    const insideToday = t !== null && (t.close > t.open ? nowMin >= t.open && nowMin < t.close : nowMin >= t.open);
    const insideYesterday = y !== null && y.close <= y.open && nowMin < y.close;
    if (insideToday || insideYesterday) return null;

    if (t !== null && nowMin < t.open) return `at ${clock(t.open)}`;

    for (let i = 1; i <= 7; i++) {
        const name = DAYS[(dayIndex + i) % 7];
        const next = shift(hours[name]);
        if (!next) continue;
        if (i === 1) return `tomorrow at ${clock(next.open)}`;
        return `on ${name[0].toUpperCase()}${name.slice(1)} at ${clock(next.open)}`;
    }

    return null;
}
