import type { BranchOpeningSummary } from '@/types/opening';

/**
 * Whether a customer can order from a branch right now, in one word.
 *
 *   open           open by its hours, and opened for the day (or no checklist)
 *   getting_ready  open by its hours, the manager is still on the opening
 *                  checklist, and an order placed now waits for the till
 *   not_open_yet   open by its hours, but late opening: online stops taking
 *                  orders rather than take money for food nobody is cooking
 *   closed         outside its hours, shut, or not taking orders at all
 */
export type BranchOpenState = 'open' | 'getting_ready' | 'not_open_yet' | 'closed';

export function branchOpenState(branch: { isActive: boolean; isOpen: boolean; opening?: BranchOpeningSummary }): BranchOpenState {
    if (!branch.isActive || !branch.isOpen) return 'closed';
    const opening = branch.opening;
    if (!opening || !opening.required || opening.opened) return 'open';
    return opening.getting_ready ? 'getting_ready' : 'not_open_yet';
}

export const OPEN_STATE_LABEL: Record<BranchOpenState, string> = {
    open: 'Open now',
    getting_ready: 'Getting ready',
    not_open_yet: 'Not open yet',
    closed: 'Closed',
};

/** Green for open, yellow while getting ready, red otherwise. */
export const OPEN_STATE_INK: Record<BranchOpenState, { dot: string; text: string }> = {
    open: { dot: 'bg-success', text: 'text-success-ink' },
    getting_ready: { dot: 'bg-accent', text: 'text-warning-ink' },
    not_open_yet: { dot: 'bg-danger', text: 'text-danger-ink' },
    closed: { dot: 'bg-danger', text: 'text-danger-ink' },
};
