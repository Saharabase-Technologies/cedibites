'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    ClockIcon,
    CaretLeftIcon,
    CaretRightIcon,
    UserCircleIcon,
    SignInIcon,
    SignOutIcon,
    ShoppingBagIcon,
    CurrencyCircleDollarIcon,
    SpinnerGapIcon,
} from '@phosphor-icons/react';
import { getShiftService, type StaffShift } from '@/lib/services/shifts/shift.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(ts: number): string {
    return new Date(ts).toISOString().slice(0, 10);
}

function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' });
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

function dateLabel(iso: string): string {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (iso === today) return 'Today';
    if (iso === yesterday) return 'Yesterday';
    return new Date(iso).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ShiftsPage() {
    const today = new Date().toISOString().slice(0, 10);
    const [date, setDate] = useState(today);
    const [shifts, setShifts] = useState<StaffShift[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async (d: string) => {
        setLoading(true);
        const service = getShiftService();
        const data = await service.getByDate(d);
        // Sort: active shifts first, then by loginAt desc
        data.sort((a, b) => {
            if (!a.logoutAt && b.logoutAt) return -1;
            if (a.logoutAt && !b.logoutAt) return 1;
            return b.loginAt - a.loginAt;
        });
        setShifts(data);
        setLoading(false);
    }, []);

    useEffect(() => { load(date); }, [date, load]);

    const prevDay = () => {
        const d = new Date(date);
        d.setDate(d.getDate() - 1);
        setDate(d.toISOString().slice(0, 10));
    };

    const nextDay = () => {
        if (date >= today) return;
        const d = new Date(date);
        d.setDate(d.getDate() + 1);
        setDate(d.toISOString().slice(0, 10));
    };

    const activeCount = shifts.filter(s => !s.logoutAt).length;
    const totalOrders = shifts.reduce((s, sh) => s + sh.orderCount, 0);
    const totalSales  = shifts.reduce((s, sh) => s + sh.totalSales, 0);

    return (
        <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <ClockIcon size={20} weight="fill" className="text-primary" />
                    <h1 className="text-text-dark text-2xl font-bold font-body">Shift Report</h1>
                </div>

                {/* Date nav */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={prevDay}
                        className="w-8 h-8 rounded-lg bg-neutral-light flex items-center justify-center text-neutral-gray hover:text-text-dark cursor-pointer"
                    >
                        <CaretLeftIcon size={14} weight="bold" />
                    </button>
                    <span className="text-text-dark text-sm font-semibold font-body min-w-24 text-center">
                        {dateLabel(date)}
                    </span>
                    <button
                        type="button"
                        onClick={nextDay}
                        disabled={date >= today}
                        className="w-8 h-8 rounded-lg bg-neutral-light flex items-center justify-center text-neutral-gray hover:text-text-dark disabled:opacity-30 cursor-pointer disabled:cursor-default"
                    >
                        <CaretRightIcon size={14} weight="bold" />
                    </button>
                </div>
            </div>

            {/* Summary row */}
            {!loading && shifts.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl px-4 py-3 text-center">
                        <p className="text-text-dark text-xl font-bold font-body">{shifts.length}</p>
                        <p className="text-neutral-gray text-xs font-body mt-0.5">
                            Shifts{activeCount > 0 && <span className="text-secondary font-semibold"> · {activeCount} active</span>}
                        </p>
                    </div>
                    <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl px-4 py-3 text-center">
                        <p className="text-text-dark text-xl font-bold font-body">{totalOrders}</p>
                        <p className="text-neutral-gray text-xs font-body mt-0.5">Total Orders</p>
                    </div>
                    <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl px-4 py-3 text-center">
                        <p className="text-primary text-xl font-bold font-body">{formatGHS(totalSales)}</p>
                        <p className="text-neutral-gray text-xs font-body mt-0.5">Total Sales</p>
                    </div>
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="py-16 flex items-center justify-center gap-2 text-neutral-gray text-sm font-body">
                    <SpinnerGapIcon size={18} className="animate-spin" />
                    Loading shifts...
                </div>
            ) : shifts.length === 0 ? (
                <div className="py-16 text-center">
                    <ClockIcon size={32} weight="thin" className="text-neutral-gray/30 mx-auto mb-3" />
                    <p className="text-text-dark text-sm font-medium font-body">No shifts recorded</p>
                    <p className="text-neutral-gray text-sm font-body mt-1">
                        {date === today ? 'No staff have logged in today.' : `No shift data for ${dateLabel(date)}.`}
                    </p>
                </div>
            ) : (
                <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
                    {shifts.map((shift, i) => {
                        const active = !shift.logoutAt;
                        return (
                            <div
                                key={shift.id}
                                className={`px-5 py-4 ${i < shifts.length - 1 ? 'border-b border-[#f0e8d8]' : ''}`}
                            >
                                <div className="flex items-start gap-3">
                                    {/* Avatar */}
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${active ? 'bg-secondary/10' : 'bg-neutral-light'}`}>
                                        <UserCircleIcon size={22} weight="fill" className={active ? 'text-secondary' : 'text-neutral-gray'} />
                                    </div>

                                    {/* Main info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-text-dark text-sm font-semibold font-body">{shift.staffName}</p>
                                            {active && (
                                                <span className="text-[10px] font-bold font-body px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">
                                                    Active
                                                </span>
                                            )}
                                            <span className="text-[10px] font-body text-neutral-gray bg-neutral-light px-2 py-0.5 rounded-full">
                                                {shift.branchName}
                                            </span>
                                        </div>

                                        {/* Times */}
                                        <div className="flex items-center gap-3 mt-1.5 text-xs font-body text-neutral-gray">
                                            <span className="flex items-center gap-1">
                                                <SignInIcon size={11} weight="bold" className="text-secondary" />
                                                {formatTime(shift.loginAt)}
                                            </span>
                                            {shift.logoutAt ? (
                                                <span className="flex items-center gap-1">
                                                    <SignOutIcon size={11} weight="bold" className="text-error/70" />
                                                    {formatTime(shift.logoutAt)}
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-secondary">
                                                    <SignOutIcon size={11} weight="bold" />
                                                    Still active
                                                </span>
                                            )}
                                            <span className="text-neutral-gray/60">
                                                {formatDuration(shift.loginAt, shift.logoutAt)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex items-center gap-4 shrink-0">
                                        <div className="text-center">
                                            <div className="flex items-center gap-1 justify-center">
                                                <ShoppingBagIcon size={12} weight="fill" className="text-neutral-gray" />
                                                <p className="text-text-dark text-sm font-bold font-body">{shift.orderCount}</p>
                                            </div>
                                            <p className="text-neutral-gray text-[10px] font-body">orders</p>
                                        </div>
                                        <div className="text-center">
                                            <div className="flex items-center gap-1 justify-center">
                                                <CurrencyCircleDollarIcon size={12} weight="fill" className="text-primary" />
                                                <p className="text-primary text-sm font-bold font-body">{formatGHS(shift.totalSales)}</p>
                                            </div>
                                            <p className="text-neutral-gray text-[10px] font-body">sales</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
