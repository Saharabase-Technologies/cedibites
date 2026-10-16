'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { SignOutIcon, SpinnerGapIcon, XIcon } from '@phosphor-icons/react';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { getShiftService, type ClockOutView, type StaffShift } from '@/lib/services/shifts/shift.service';
import type { MoneyGroup, MoneyLine, MoneyOnOthersOrder } from '@/lib/api/services/staff.service';
import { ApiError } from '@/lib/api/client';
import { formatGHS } from '@/lib/utils/currency';
import { serverNow, serverToday } from '@/lib/utils/serverClock';
import { useConfirmShift, useManagerShiftSales } from '@/lib/api/hooks/useShiftSales';
import { timeOf } from './orderFormat';
import { OWES } from './salesTones';
import { spanOf, waitsOn } from './shiftSalesFormat';

// Clock out (staff portal D29). A confirmation, not a count: the person sees
// the money they took by method and what is still owed, may leave a note, and
// one button confirms it, ends the shift and signs out, in one server call.
// No counted figure is typed. No voice note (D22).

/** "6h 48m", "45m". */
export function lengthOf(fromMs: number, toMs: number): string {
    const mins = Math.max(0, Math.floor((toMs - fromMs) / 60000));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const LINE: { group: MoneyGroup; label: string; proof: 'checked' | 'not checked' | null; always: boolean }[] = [
    { group: 'cash', label: 'Cash', proof: null, always: true },
    { group: 'momo', label: 'MoMo', proof: 'checked', always: true },
    { group: 'ussd', label: 'USSD', proof: 'checked', always: true },
    { group: 'manual_momo', label: 'Direct MoMo', proof: 'not checked', always: true },
    { group: 'card', label: 'Card', proof: null, always: false },
    { group: 'other', label: 'Other', proof: null, always: false },
];

const OF_THE: Record<MoneyGroup, string> = {
    cash: 'the cash', momo: 'the MoMo', ussd: 'the USSD', manual_momo: 'the Direct MoMo', card: 'the card money', other: 'this',
};

function payments(n: number): string {
    return `${n} ${n === 1 ? 'payment' : 'payments'}`;
}

/**
 * The money by method, one line each, with how many payments and whether
 * Hubtel checked them. Card and Other only when there is some (D23); No
 * Charge after them, never in the total. Clock out, and the manager's and
 * admin's review of a shift, show the same lines.
 */
export function MoneyLines({ money, noCharge }: { money: Record<MoneyGroup, MoneyLine>; noCharge?: MoneyLine }) {
    return (
        <>
            {LINE.filter(l => l.always || (money[l.group]?.count ?? 0) > 0).map(l => {
                const line = money[l.group] ?? { amount: 0, count: 0 };
                return (
                    <div key={l.group} className="flex justify-between gap-3 py-2 border-b border-row-line">
                        <span>
                            <span className="font-semibold">{l.label}</span>
                            <span className="text-neutral-gray"> · {payments(line.count)}</span>
                            {l.proof && line.count > 0 && (
                                <span className={l.proof === 'checked' ? 'text-success-ink' : OWES}> · {l.proof}</span>
                            )}
                        </span>
                        <span className="font-semibold">{formatGHS(line.amount)}</span>
                    </div>
                );
            })}
            {noCharge && noCharge.count > 0 && (
                <div className="flex justify-between gap-3 py-2 border-b border-row-line text-neutral-gray">
                    <span><span className="font-semibold">No Charge</span> · not in the total</span>
                    <span>{formatGHS(noCharge.amount)}</span>
                </div>
            )}
        </>
    );
}

/** "₵50.00 of the cash came from Kofi's order #A398." One line each (D24). */
export function FromOthers({ lines }: { lines: MoneyOnOthersOrder[] }) {
    return (
        <>
            {lines.map(o => (
                <p key={`${o.order_id}-${o.group}`} className="pt-2 text-xs text-neutral-gray">
                    {formatGHS(o.amount)} of {OF_THE[o.group]} came from {o.assigned_to ? `${o.assigned_to}'s order` : 'order'} #{o.order_number}.
                </p>
            ))}
        </>
    );
}

type State =
    | { kind: 'loading' }
    | { kind: 'none' }
    | { kind: 'ready'; shift: StaffShift; view: ClockOutView }
    | { kind: 'failed'; message: string };

/** The sheet from the right. Finds the person's open shift itself. */
/**
 * The manager's own Clock out lists the staff shifts they have not confirmed,
 * each with a Confirm button. A reminder, not a block (Q4).
 */
function NotConfirmed({ branchId, meId }: { branchId: number | null; meId: number | null }) {
    const { data } = useManagerShiftSales(branchId, serverToday());
    const confirm = useConfirmShift();
    const [problem, setProblem] = useState<string | null>(null);
    const waiting = (data ?? []).filter(r => waitsOn(r, meId, 'manager'));

    if (waiting.length === 0) return null;

    const send = async (id: number) => {
        setProblem(null);
        try {
            await confirm.mutateAsync({ shiftId: id, note: '' });
        } catch (error) {
            setProblem(error instanceof ApiError ? error.message : 'The confirm did not go through. Try again.');
        }
    };

    return (
        <section aria-labelledby="not-confirmed" className="flex flex-col">
            <h3 id="not-confirmed" className="pb-2 border-b border-hairline text-[13px] font-bold text-neutral-gray">Shifts you have not confirmed</h3>
            {waiting.map(r => (
                <div key={r.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-row-line">
                    <span className="min-w-0">
                        <span className="font-semibold">{r.staff_name}</span>
                        <span className="text-neutral-gray"> · {spanOf(r)}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold">{formatGHS(r.total)}</span>
                        <button
                            type="button"
                            onClick={() => send(r.id)}
                            disabled={confirm.isPending}
                            className="min-h-11 px-3 rounded-xl border border-hairline-mid text-[13px] font-bold text-text-dark hover:bg-neutral-light cursor-pointer disabled:opacity-60"
                        >
                            Confirm
                        </button>
                    </span>
                </div>
            ))}
            {problem && <p role="alert" className="pt-2 text-[13px] font-semibold text-danger-ink">{problem}</p>}
        </section>
    );
}

export function ClockOutSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { staffUser, logout } = useStaffAuth();
    const isManager = staffUser?.role === 'manager';
    const branchId = isManager && staffUser?.branches[0]?.id ? Number(staffUser.branches[0].id) : null;
    const meId = staffUser?.id ? Number(staffUser.id) : null;
    const [state, setState] = useState<State>({ kind: 'loading' });
    const [note, setNote] = useState('');
    const [sending, setSending] = useState(false);
    const [problem, setProblem] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!staffUser) return;
        setState({ kind: 'loading' });
        setProblem(null);
        try {
            const shift = await getShiftService().getActive(staffUser.id);
            if (!shift) {
                setState({ kind: 'none' });
                return;
            }
            const view = await getShiftService().getClockOut(shift.id);
            setState({ kind: 'ready', shift, view });
        } catch {
            setState({ kind: 'failed', message: 'Clock out did not load. Check the connection and try again.' });
        }
    }, [staffUser]);

    useEffect(() => {
        if (open) load();
    }, [open, load]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !sending) onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, sending, onClose]);

    const confirm = async () => {
        if (state.kind !== 'ready') return;
        setSending(true);
        setProblem(null);
        try {
            await getShiftService().clockOut(state.shift.id, note.trim(), state.view.total);
            await logout('/staff/login', { serverDone: true });
        } catch (error) {
            const fresh = error instanceof ApiError
                ? (error.payload as { data?: ClockOutView } | undefined)?.data
                : undefined;
            if (error instanceof ApiError && error.status === 409 && fresh) {
                setState({ ...state, view: fresh });
                setProblem('The money changed while this was open. Check it again, then confirm.');
            } else {
                setProblem(error instanceof ApiError ? error.message : 'Clock out did not go through. Try again.');
            }
            setSending(false);
        }
    };

    if (!open || typeof document === 'undefined') return null;

    const branch = staffUser?.branches[0]?.name;

    return createPortal(
        <div className="fixed inset-0 z-60 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="clock-out-title">
            <div className="absolute inset-0 bg-black/40" onClick={sending ? undefined : onClose} />

            <div className="relative w-full sm:w-105 h-full bg-bg shadow-float flex flex-col">
                <div className="shrink-0 flex items-start justify-between gap-3 px-5 pt-5 pb-3">
                    <div>
                        <h2 id="clock-out-title" className="text-[22px] font-bold text-text-dark">Clock out</h2>
                        {state.kind === 'ready' && (
                            <p className="text-[13px] text-neutral-gray mt-0.5 tabular-nums">
                                On since {timeOf(state.shift.loginAt)} · {lengthOf(state.shift.loginAt, serverNow().getTime())}
                                {branch ? ` · ${branch}` : ''}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={sending}
                        aria-label="Close"
                        className="min-w-11 min-h-11 -mr-2 -mt-1 flex items-center justify-center rounded-xl text-neutral-gray hover:text-text-dark hover:bg-neutral-light cursor-pointer"
                    >
                        <XIcon size={18} weight="bold" />
                    </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4 flex flex-col gap-5 text-sm tabular-nums">
                    {state.kind === 'loading' && (
                        <div className="flex items-center gap-2 py-10 text-neutral-gray">
                            <SpinnerGapIcon size={18} className="animate-spin" /> Working out your money
                        </div>
                    )}
                    {state.kind === 'failed' && <p className="py-6 text-danger-ink">{state.message}</p>}
                    {state.kind === 'none' && <p className="py-6 text-neutral-gray">You have no shift open. There is nothing to clock out.</p>}

                    {state.kind === 'ready' && (
                        <>
                            <section aria-labelledby="money-took" className="flex flex-col">
                                <div className="flex items-baseline justify-between gap-3 pb-2 border-b border-hairline">
                                    <h3 id="money-took" className="text-[13px] font-bold text-neutral-gray">Money you took</h3>
                                    <span className="text-[28px] font-extrabold leading-none text-text-dark">{formatGHS(state.view.total)}</span>
                                </div>
                                <MoneyLines money={state.view.money} noCharge={state.view.no_charge} />
                                <FromOthers lines={state.view.on_others_orders} />
                            </section>

                            <section aria-labelledby="still-owed" className="flex flex-col">
                                <div className="flex items-baseline justify-between gap-3 pb-2 border-b border-hairline">
                                    <h3 id="still-owed" className="text-[13px] font-bold text-neutral-gray">Still owed on your orders</h3>
                                    <span className={`text-base font-extrabold ${state.view.owing.length > 0 ? OWES : 'text-text-dark'}`}>
                                        {formatGHS(state.view.owing.reduce((s, o) => s + o.amount, 0))}
                                    </span>
                                </div>
                                {state.view.owing.length === 0 && <p className="py-2 text-neutral-gray">Nothing is owed.</p>}
                                {state.view.owing.map(o => (
                                    <div key={o.order_id} className="flex justify-between gap-3 py-2 border-b border-row-line">
                                        <span className="min-w-0 truncate"><span className="font-semibold">#{o.order_number}</span> {o.customer}</span>
                                        <span className={`font-semibold ${OWES}`}>{formatGHS(o.amount)}</span>
                                    </div>
                                ))}
                            </section>

                            {isManager && <NotConfirmed branchId={branchId} meId={meId} />}

                            <label className="flex flex-col gap-1.5">
                                <span className="text-[13px] font-bold text-neutral-gray">Leave a note</span>
                                <textarea
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                    maxLength={1000}
                                    rows={3}
                                    placeholder="Anything wrong or missing"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-hairline-mid bg-bg text-sm text-text-dark placeholder:text-neutral-gray/70 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none"
                                />
                            </label>
                        </>
                    )}
                </div>

                {state.kind === 'ready' && (
                    <div className="shrink-0 px-5 pt-3 pb-5 border-t border-hairline flex flex-col gap-2.5">
                        {problem && <p role="alert" className="text-[13px] font-semibold text-danger-ink">{problem}</p>}
                        <p className="text-[13px] text-text-dark">I have seen this money and it is right.</p>
                        <button
                            type="button"
                            onClick={confirm}
                            disabled={sending}
                            className="min-h-12 w-full rounded-xl bg-primary hover:bg-primary-hover text-white text-[15px] font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                        >
                            {sending && <SpinnerGapIcon size={18} className="animate-spin" />}
                            {sending ? 'Clocking out' : 'Confirm and clock out'}
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
}

/**
 * Sign out for sales staff (Q1): Clock out first, Sign out only second. Sign
 * out only ends the shift with no confirmation, and the admin sees that.
 */
export function ClockOutSignOutDialog({ isOpen, onCancel, onSignOutOnly }: {
    isOpen: boolean;
    onCancel: () => void;
    onSignOutOnly: () => void;
}) {
    const [clocking, setClocking] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const closeSheet = useCallback(() => setClocking(false), []);

    return (
        <>
            {isOpen && !clocking && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="sign-out-title">
                    <div className="bg-bg rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
                        <div>
                            <h3 id="sign-out-title" className="text-lg font-bold text-text-dark">Sign out</h3>
                            <p className="text-sm text-neutral-gray mt-1">Clock out confirms the money you took. Sign out only ends your shift without it.</p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={() => setClocking(true)}
                                className="min-h-12 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold cursor-pointer"
                            >
                                Clock out
                            </button>
                            <button
                                type="button"
                                disabled={leaving}
                                onClick={() => { setLeaving(true); onSignOutOnly(); }}
                                className="min-h-11 rounded-xl border border-hairline-mid text-text-dark font-semibold flex items-center justify-center gap-2 cursor-pointer hover:bg-neutral-light disabled:opacity-60"
                            >
                                <SignOutIcon size={16} />
                                {leaving ? 'Signing out' : 'Sign out only'}
                            </button>
                            <button type="button" onClick={onCancel} className="min-h-11 rounded-xl text-sm text-neutral-gray hover:text-text-dark cursor-pointer">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <ClockOutSheet open={isOpen && clocking} onClose={() => { closeSheet(); onCancel(); }} />
        </>
    );
}
