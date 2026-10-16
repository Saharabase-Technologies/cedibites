'use client';

import { useState } from 'react';
import type { ShiftSalesRow } from '@/lib/api/hooks/useShiftSales';
import { useConfirmShift } from '@/lib/api/hooks/useShiftSales';
import { ApiError } from '@/lib/api/client';
import { formatGHS } from '@/lib/utils/currency';
import { toast } from '@/lib/utils/toast';
import { FromOthers, MoneyLines } from './ClockOut';
import { QuietRow } from './QuietRow';
import { firstName, timeOf } from './orderFormat';
import { canConfirm, firstOf } from './shiftSalesFormat';

// One shift opened on Staff Sales, the manager's end and the admin's (staff
// portal Section 6, D30). What the person confirmed at Clock out, as it was
// at the button; their orders; both notes; and, when it is the viewer's to
// do, the confirm. The page around it gives the look: this uses the tokens
// only, so it takes the manager's or the admin's own.

const ms = (iso: string) => Date.parse(iso);

function Heading({ children }: { children: React.ReactNode }) {
    return <h3 className="pb-2 border-b border-hairline text-[13px] font-bold text-neutral-gray">{children}</h3>;
}

export function ShiftReview({ row, meId, viewer }: { row: ShiftSalesRow; meId: number | null; viewer: 'manager' | 'admin' }) {
    const [note, setNote] = useState('');
    const [problem, setProblem] = useState<string | null>(null);
    const confirm = useConfirmShift();
    const who = firstOf(row);
    const snapshot = row.clock_out?.money;

    const send = async () => {
        setProblem(null);
        try {
            await confirm.mutateAsync({ shiftId: row.id, note: note.trim() });
            toast.success(`${who}'s sales are confirmed.`);
        } catch (error) {
            setProblem(error instanceof ApiError ? error.message : 'The confirm did not go through. Try again.');
        }
    };

    return (
        <div className="flex flex-col gap-5 py-2 text-sm tabular-nums" onClick={e => e.stopPropagation()}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5">
                <section className="flex flex-col">
                    {snapshot ? (
                        <>
                            <Heading>What {who} confirmed at {timeOf(ms(row.clock_out!.at))}</Heading>
                            <MoneyLines money={snapshot.money} noCharge={snapshot.no_charge} />
                            <div className="flex justify-between gap-3 pt-2.5 text-base font-extrabold">
                                <span>Money Taken</span>
                                <span>{formatGHS(snapshot.total)}</span>
                            </div>
                            {Math.abs(row.total - snapshot.total) > 0.004 && (
                                <p className="pt-1 text-xs font-semibold text-amber-700">
                                    {formatGHS(row.total)} now. Money came in on this shift after the Clock out.
                                </p>
                            )}
                            <FromOthers lines={snapshot.on_others_orders} />
                        </>
                    ) : (
                        <>
                            <Heading>
                                {row.on_shift ? `${who} is on shift. Money so far` : `${who} signed out without Clock out`}
                            </Heading>
                            <MoneyLines money={row.money} noCharge={row.no_charge} />
                            <div className="flex justify-between gap-3 pt-2.5 text-base font-extrabold">
                                <span>Money Taken</span>
                                <span>{formatGHS(row.total)}</span>
                            </div>
                        </>
                    )}
                </section>

                <section className="flex flex-col gap-4">
                    <QuietRow
                        plain
                        label={`${who}'s orders on this shift`}
                        figures={[
                            { label: 'Orders Attended', value: String(row.orders_attended) },
                            { label: 'Order Value', value: formatGHS(row.order_value) },
                            {
                                label: 'Still owed',
                                value: formatGHS(row.still_owed),
                                note: row.still_owed > 0 ? 'On their orders' : undefined,
                                noteOwes: row.still_owed > 0,
                            },
                        ]}
                    />

                    {row.clock_out?.note && (
                        <div>
                            <Heading>{who}&apos;s note</Heading>
                            <p className="pt-2 whitespace-pre-line text-text-dark">{row.clock_out.note}</p>
                        </div>
                    )}

                    {row.manager_confirm ? (
                        <div>
                            <Heading>
                                Confirmed by {meId !== null && row.manager_confirm.by_employee_id === meId ? 'you' : (firstName(row.manager_confirm.by_name) ?? 'the manager')} at {timeOf(ms(row.manager_confirm.at))}
                            </Heading>
                            {row.manager_confirm.note && <p className="pt-2 whitespace-pre-line text-text-dark">{row.manager_confirm.note}</p>}
                        </div>
                    ) : viewer === 'admin' && row.branch_has_manager && !row.is_manager && !row.on_shift ? (
                        <p className="font-semibold text-amber-700">The manager has not confirmed this shift.</p>
                    ) : null}
                </section>
            </div>

            {canConfirm(row, meId, viewer) && (
                <div className="flex flex-col gap-2.5 max-w-xl">
                    <label className="flex flex-col gap-1.5">
                        <span className="text-[13px] font-bold text-neutral-gray">Your note</span>
                        <textarea
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            maxLength={1000}
                            rows={2}
                            placeholder="Anything you found"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-hairline-mid bg-neutral-card text-sm text-text-dark placeholder:text-neutral-gray/70 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none"
                        />
                    </label>
                    {problem && <p role="alert" className="text-[13px] font-semibold text-danger-ink">{problem}</p>}
                    <p className="text-[13px] text-text-dark">I have checked {who}&apos;s money and it is right.</p>
                    <button
                        type="button"
                        onClick={send}
                        disabled={confirm.isPending}
                        className="self-start min-h-11 px-5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-bold cursor-pointer disabled:opacity-60"
                    >
                        {confirm.isPending ? 'Confirming' : `Confirm ${who}'s sales`}
                    </button>
                </div>
            )}
        </div>
    );
}
