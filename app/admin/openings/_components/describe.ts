import { clock } from '@/app/components/opening/openingFormat';
import type { BranchOpening } from '@/types/opening';

/**
 * One sentence on how a branch started its day, for head office.
 *
 * Names the person and the time, because "opened late" is a question to ask
 * somebody, and the page should say who.
 */
export function describeOpening(o: BranchOpening): string {
    const problems = o.problems.items.filter((p) => !p.resolved_at).map((p) => p.short);

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
