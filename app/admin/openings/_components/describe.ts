import { STATUS_LABEL, clock, statusTone } from '@/app/components/opening/openingFormat';
import { TONE, type StatusTone } from '@/app/inventory/_components/status-tokens';
import { serverNow } from '@/lib/utils/serverClock';
import type { AdminOpeningRow, BranchOpening } from '@/types/opening';

/**
 * One sentence on how a branch started its day, for head office.
 *
 * Names the person and the time, because "opened late" is a question to ask
 * somebody, and the page should say who.
 */
export function describeOpening(o: BranchOpening): string {
    const problems = o.problems.items.filter((p) => !p.resolved_at).map((p) => p.short);

    if (closedThatDay(o)) return o.status === 'closed_today' ? 'Closed today.' : 'Closed that day.';

    switch (o.status) {
        case 'not_required':
            return 'Does not use the opening checklist.';
        case 'closed_today':
            return 'Closed today.';
        case 'not_started':
            return o.schedule.opens_at
                ? `Not open. Due at ${clock(o.schedule.opens_at)}. Nobody has started the checklist.`
                : 'Not open. Nobody has started the checklist.';
        case 'in_progress':
            return `Not open yet. ${o.started_by ?? 'The manager'} started the checklist at ${clock(o.started_at)}, ${o.progress.answered} of ${o.progress.total} answered.`;
        case 'opened_by_head_office':
            return `Opened by ${o.opened_by} at ${clock(o.opened_at)} without the checklist. ${o.override_reason ?? ''}`.trim();
        case 'open_with_problems':
            return `Opened at ${clock(o.opened_at)} by ${o.completed_by}. ${problems.length} to fix by ${clock(o.grace_ends_at)}: ${problems.join(', ')}.`;
        case 'open':
            return o.is_override
                ? `Opened by ${o.opened_by} at ${clock(o.opened_at)} without the checklist. Finished by ${o.completed_by} at ${clock(o.completed_at)}.`
                : `Opened at ${clock(o.opened_at)} by ${o.completed_by}.${o.problems.total ? ` ${o.problems.total} ${o.problems.total === 1 ? 'problem' : 'problems'} admitted, all fixed.` : ''}`;
        case 'not_opened':
            return 'Never opened.';
    }
}

/** Not a trading day, and nobody opened it anyway. */
export function closedThatDay(o: BranchOpening): boolean {
    return !o.schedule.trading_day && !o.opened_at;
}

/** Past its late mark today and still not selling. */
export function isLateNow(o: BranchOpening): boolean {
    return o.is_late && !o.opened_at;
}

/**
 * The branch did not use the checklist that day.
 *
 * The server calls a past day with no opening "never opened" whether or not
 * the branch used the checklist, so a branch that is off it now and has no
 * opening that day is read as off it then.
 */
export function offChecklist(row: AdminOpeningRow, isToday: boolean): boolean {
    if (row.status === 'not_required') return true;
    return !isToday && !row.id && !row.required;
}

/** The hour to fix admitted problems has run out, with some still open. */
export function graceRanOut(o: BranchOpening): boolean {
    return o.problems.outstanding > 0 && !!o.grace_ends_at && new Date(o.grace_ends_at) < serverNow();
}

/** The badge a branch wears on head office's screens. */
export function openingBadge(o: BranchOpening): { label: string; tone: StatusTone } {
    if (closedThatDay(o)) return { label: 'Closed', tone: TONE.neutral };
    if (isLateNow(o)) return { label: 'Late', tone: TONE.problem };
    return { label: STATUS_LABEL[o.status], tone: statusTone(o.status, o.is_late) };
}

/**
 * The order head office wants them in: the ones to ring first.
 * Late or never opened, then problems to fix, then still to finish, then the rest.
 */
export function urgency(o: BranchOpening): number {
    if (closedThatDay(o)) return 7;
    if (isLateNow(o) || o.status === 'not_opened') return 0;
    switch (o.status) {
        case 'open_with_problems':
            return 1;
        case 'opened_by_head_office':
            return 2;
        case 'in_progress':
            return 3;
        case 'not_started':
            return 4;
        case 'open':
            return 5;
        default:
            return 6;
    }
}

/** "Ashaiman", "Ashaiman and Tema", or "3 branches" once names stop helping. */
export function who(rows: { branch: { name: string } }[]): string {
    if (rows.length === 1) return rows[0].branch.name;
    if (rows.length === 2) return `${rows[0].branch.name} and ${rows[1].branch.name}`;
    return `${rows.length} branches`;
}

/**
 * The page's opening line: how the day stands, naming the branches that need
 * somebody, in the order they need them.
 */
export function summarise(rows: AdminOpeningRow[], isToday: boolean): string {
    if (rows.length === 0) return '';

    const trading = rows.filter((r) => !closedThatDay(r));
    if (trading.length === 0) {
        return isToday ? 'Every branch on the checklist is closed today.' : 'Every branch on the checklist was closed that day.';
    }

    const opened = trading.filter((r) => r.opened_at);
    const late = isToday ? trading.filter(isLateNow) : [];
    const parts: string[] = [];

    if (trading.length === 1) {
        const r = trading[0];
        // "Ashaiman is late" says it all; "is not open yet" first would say it twice.
        if (!late.length) {
            parts.push(r.opened_at
                ? `${r.branch.name} ${isToday ? 'is open' : 'opened'}.`
                : `${r.branch.name} ${isToday ? 'is not open yet' : 'never opened'}.`);
        }
    } else if (opened.length === trading.length) {
        parts.push(isToday ? `All ${trading.length} are open.` : `All ${trading.length} opened.`);
    } else if (opened.length === 0) {
        parts.push(isToday ? `None of the ${trading.length} is open yet.` : `None of the ${trading.length} opened.`);
    } else {
        parts.push(`${opened.length} of ${trading.length} ${isToday ? 'open' : 'opened'}.`);
    }

    if (late.length) parts.push(`${who(late)} ${late.length === 1 ? 'is' : 'are'} late.`);

    if (!isToday && trading.length > 1) {
        const never = trading.filter((r) => !r.opened_at);
        if (never.length && opened.length) parts.push(`${who(never)} never opened.`);
    }

    const openedLate = trading.filter((r) => r.is_late && r.opened_at);
    if (openedLate.length) parts.push(`${who(openedLate)} opened late.`);

    const fixing = trading.filter((r) => r.problems.outstanding > 0);
    if (fixing.length === 1) {
        const n = fixing[0].problems.outstanding;
        parts.push(isToday
            ? `${fixing[0].branch.name} has ${n} ${n === 1 ? 'problem' : 'problems'} to fix.`
            : `${fixing[0].branch.name} left ${n} ${n === 1 ? 'problem' : 'problems'} unfixed.`);
    } else if (fixing.length > 1) {
        parts.push(isToday ? `${fixing.length} branches have problems to fix.` : `${fixing.length} branches left problems unfixed.`);
    }

    return parts.join(' ');
}
