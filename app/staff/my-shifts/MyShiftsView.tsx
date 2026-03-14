'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    ClockIcon,
    SignInIcon,
    SignOutIcon,
    ShoppingBagIcon,
    CurrencyCircleDollarIcon,
    CircleIcon,
    SpinnerGapIcon,
} from '@phosphor-icons/react';
import { getShiftService, type StaffShift } from '@/lib/services/shifts/shift.service';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString('en-GH', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatDuration(loginAt: number, logoutAt?: number): string {
    const end = logoutAt ?? Date.now();
    const mins = Math.floor((end - loginAt) / 60000);
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatGHS(n: number): string {
    return `GHS ${n.toFixed(2)}`;
}

// ─── Shift Row ─────────────────────────────────────────────────────────────────

function ShiftRow({ shift }: { shift: StaffShift }) {
    const active = !shift.logoutAt;

    return (
        <div className="px-5 py-4 flex items-center gap-4">
            {/* Date + status dot */}
            <div className="w-12 shrink-0 text-center">
                <p className="text-text-dark text-xs font-bold font-body leading-tight">
                    {formatDate(shift.loginAt).split(',')[0]}
                </p>
                <p className="text-neutral-gray text-[10px] font-body">
                    {formatDate(shift.loginAt).split(',')[1]?.trim()}
                </p>
                {active && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-bold font-body text-secondary mt-0.5">
                        <CircleIcon size={6} weight="fill" />live
                    </span>
                )}
            </div>

            {/* Times + duration */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 text-sm font-body">
                    <span className="flex items-center gap-1 text-text-dark">
                        <SignInIcon size={12} weight="bold" className="text-secondary" />
                        {formatTime(shift.loginAt)}
                    </span>
                    {shift.logoutAt ? (
                        <span className="flex items-center gap-1 text-text-dark">
                            <SignOutIcon size={12} weight="bold" className="text-neutral-gray" />
                            {formatTime(shift.logoutAt)}
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-secondary text-xs font-semibold">
                            <SignOutIcon size={12} weight="bold" />
                            Active
                        </span>
                    )}
                </div>
                <p className="text-neutral-gray text-xs font-body mt-0.5">
                    {shift.branchName} · {formatDuration(shift.loginAt, shift.logoutAt)}
                </p>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-5 shrink-0">
                <div className="text-center">
                    <div className="flex items-center gap-1 justify-center">
                        <ShoppingBagIcon size={11} weight="fill" className="text-neutral-gray" />
                        <p className="text-text-dark text-sm font-bold font-body">{shift.orderCount}</p>
                    </div>
                    <p className="text-neutral-gray text-[10px] font-body">orders</p>
                </div>
                <div className="text-center min-w-20">
                    <p className="text-primary text-sm font-bold font-body">{formatGHS(shift.totalSales)}</p>
                    <p className="text-neutral-gray text-[10px] font-body">sales</p>
                </div>
            </div>
        </div>
    );
}

// ─── View ──────────────────────────────────────────────────────────────────────

export default function MyShiftsView() {
    const { staffUser } = useStaffAuth();
    const [shifts, setShifts] = useState<StaffShift[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!staffUser) return;
        const data = await getShiftService().getByStaff(staffUser.id);
        // Newest first; active shift always at top
        data.sort((a, b) => {
            if (!a.logoutAt && b.logoutAt) return -1;
            if (a.logoutAt && !b.logoutAt) return 1;
            return b.loginAt - a.loginAt;
        });
        setShifts(data);
        setLoading(false);
    }, [staffUser]);

    useEffect(() => { load(); }, [load]);

    const activeShift = shifts.find(s => !s.logoutAt);
    const completedShifts = shifts.filter(s => !!s.logoutAt);
    const totalOrders = shifts.reduce((s, sh) => s + sh.orderCount, 0);
    const totalSales  = shifts.reduce((s, sh) => s + sh.totalSales, 0);

    return (
        <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto">

            {/* Header */}
            <div className="flex items-center gap-2 mb-6">
                <ClockIcon size={20} weight="fill" className="text-primary" />
                <div>
                    <h1 className="text-text-dark text-2xl font-bold font-body">My Shifts</h1>
                    {!loading && shifts.length > 0 && (
                        <p className="text-neutral-gray text-sm font-body">
                            {shifts.length} shift{shifts.length !== 1 ? 's' : ''} · {totalOrders} orders · {formatGHS(totalSales)} total
                        </p>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="py-16 flex items-center justify-center gap-2 text-neutral-gray text-sm font-body">
                    <SpinnerGapIcon size={18} className="animate-spin" />
                    Loading shifts...
                </div>
            ) : shifts.length === 0 ? (
                <div className="py-16 text-center">
                    <ClockIcon size={32} weight="thin" className="text-neutral-gray/30 mx-auto mb-3" />
                    <p className="text-text-dark text-sm font-medium font-body">No shift history yet</p>
                    <p className="text-neutral-gray text-sm font-body mt-1">Your shifts will appear here after your first login.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">

                    {/* Active shift highlight */}
                    {activeShift && (
                        <div className="bg-secondary/5 border border-secondary/20 rounded-2xl overflow-hidden">
                            <div className="px-5 py-2.5 bg-secondary/10 border-b border-secondary/20">
                                <p className="text-secondary text-xs font-bold font-body uppercase tracking-wider">Current Shift</p>
                            </div>
                            <ShiftRow shift={activeShift} />
                        </div>
                    )}

                    {/* Past shifts */}
                    {completedShifts.length > 0 && (
                        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
                            <div className="px-5 py-2.5 border-b border-[#f0e8d8]">
                                <p className="text-neutral-gray text-xs font-body uppercase tracking-wider">Shift History</p>
                            </div>
                            {completedShifts.map((shift, i) => (
                                <div key={shift.id} className={i < completedShifts.length - 1 ? 'border-b border-[#f0e8d8]' : ''}>
                                    <ShiftRow shift={shift} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
