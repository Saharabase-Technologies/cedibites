import type { ShiftSalesRow } from '@/lib/api/hooks/useShiftSales';
import { TONE, type StatusTone } from '@/app/inventory/_components/status-tokens';
import { firstName, timeOf } from './orderFormat';

// The words for a shift on Staff Sales, the same on the manager's end and the
// admin's (staff portal Section 6). One place, so both ends say the same.

const ms = (iso: string) => Date.parse(iso);

/** "6:00 am to 2:05 pm", "8:02 am to now". */
export function spanOf(row: ShiftSalesRow): string {
    return `${timeOf(ms(row.login_at))} to ${row.logout_at ? timeOf(ms(row.logout_at)) : 'now'}`;
}

/** "Kofi". */
export function firstOf(row: ShiftSalesRow): string {
    return firstName(row.staff_name) ?? 'They';
}

export type State = { label: string } & StatusTone;

/** The person's own sign-off. */
export function clockOutState(row: ShiftSalesRow): State {
    if (row.on_shift) return { label: 'On shift', ...TONE.neutral };
    if (row.clock_out) return { label: `Confirmed ${timeOf(ms(row.clock_out.at))}`, ...TONE.done };
    return { label: 'Not confirmed', ...TONE.waiting };
}

/**
 * The manager's sign-off. `meId` is the viewer's employee id; `viewer` says
 * whose screen it is, since an admin reads "No manager" where a manager would
 * never see one.
 */
export function managerState(row: ShiftSalesRow, meId: number | null, viewer: 'manager' | 'admin'): State {
    if (row.manager_confirm) return { label: `Confirmed ${timeOf(ms(row.manager_confirm.at))}`, ...TONE.done };
    if (meId !== null && row.employee_id === meId) return { label: 'Your own', ...TONE.neutral };
    if (row.is_manager) return { label: 'Own shift', ...TONE.neutral };
    if (row.on_shift) return { label: 'When it ends', ...TONE.neutral };
    if (viewer === 'admin' && !row.branch_has_manager) return { label: 'No manager', ...TONE.waiting };
    return { label: 'To confirm', ...TONE.waiting };
}

/** Whether the viewer may confirm this shift now. The server decides; this only hides the form. */
export function canConfirm(row: ShiftSalesRow, meId: number | null, viewer: 'manager' | 'admin'): boolean {
    if (row.manager_confirm || row.on_shift || row.is_manager) return false;
    if (meId !== null && row.employee_id === meId) return false;
    return viewer === 'manager' ? true : !row.branch_has_manager;
}

/** Waiting on this viewer's confirm. */
export function waitsOn(row: ShiftSalesRow, meId: number | null, viewer: 'manager' | 'admin'): boolean {
    return canConfirm(row, meId, viewer);
}
