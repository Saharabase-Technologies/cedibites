'use client';

import { useMemo } from 'react';
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DayShiftSummary {
    count: number;
    orders: number;
    sales: number;
    hasActive: boolean;
}

interface ShiftsCalendarProps {
    selectedDate: string;                           // 'YYYY-MM-DD'
    onSelectDate: (date: string) => void;
    viewMonth: Date;                                // 1st of displayed month
    onChangeMonth: (month: Date) => void;
    monthData: Map<string, DayShiftSummary>;        // keyed by 'YYYY-MM-DD'
    loadingDays: Set<string>;                       // days currently fetching
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function toISO(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function formatGHS(n: number): string {
    return n >= 1000 ? `₵${(n / 1000).toFixed(1)}k` : `₵${Math.round(n)}`;
}

function getMonthGrid(year: number, month: number): (Date | null)[][] {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    // Week starts on Monday (1)
    let startDay = first.getDay() - 1;
    if (startDay < 0) startDay = 6;

    const weeks: (Date | null)[][] = [];
    let week: (Date | null)[] = new Array(startDay).fill(null);

    for (let d = 1; d <= last.getDate(); d++) {
        week.push(new Date(year, month, d));
        if (week.length === 7) {
            weeks.push(week);
            week = [];
        }
    }
    if (week.length > 0) {
        while (week.length < 7) week.push(null);
        weeks.push(week);
    }
    return weeks;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ShiftsCalendar({
    selectedDate,
    onSelectDate,
    viewMonth,
    onChangeMonth,
    monthData,
    loadingDays,
}: ShiftsCalendarProps) {
    const today = toISO(new Date());
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();

    const weeks = useMemo(() => getMonthGrid(year, month), [year, month]);

    const monthLabel = viewMonth.toLocaleDateString('en-GH', { month: 'long', year: 'numeric' });

    const canGoNext = (() => {
        const nextMonth = new Date(year, month + 1, 1);
        const todayDate = new Date();
        return nextMonth <= new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 1);
    })();

    const prevMonth = () => onChangeMonth(new Date(year, month - 1, 1));
    const nextMonth = () => {
        if (canGoNext) onChangeMonth(new Date(year, month + 1, 1));
    };

    return (
        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
            {/* Month header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#f0e8d8]">
                <button
                    type="button"
                    onClick={prevMonth}
                    className="w-8 h-8 rounded-lg bg-neutral-light flex items-center justify-center text-neutral-gray hover:text-text-dark cursor-pointer"
                >
                    <CaretLeftIcon size={14} weight="bold" />
                </button>
                <h2 className="text-text-dark text-base font-bold font-body">{monthLabel}</h2>
                <button
                    type="button"
                    onClick={nextMonth}
                    disabled={!canGoNext}
                    className="w-8 h-8 rounded-lg bg-neutral-light flex items-center justify-center text-neutral-gray hover:text-text-dark disabled:opacity-30 cursor-pointer disabled:cursor-default"
                >
                    <CaretRightIcon size={14} weight="bold" />
                </button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 border-b border-[#f0e8d8]">
                {DAYS_OF_WEEK.map(d => (
                    <div key={d} className="text-center text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider py-2">
                        {d}
                    </div>
                ))}
            </div>

            {/* Weeks */}
            <div>
                {weeks.map((week, wi) => (
                    <div key={wi} className="grid grid-cols-7 border-b border-[#f0e8d8] last:border-b-0">
                        {week.map((day, di) => {
                            if (!day) {
                                return <div key={`empty-${di}`} className="min-h-18 sm:min-h-20 bg-neutral-light/30" />;
                            }

                            const iso = toISO(day);
                            const isToday = iso === today;
                            const isSelected = iso === selectedDate;
                            const isFuture = iso > today;
                            const summary = monthData.get(iso);
                            const isLoading = loadingDays.has(iso);

                            return (
                                <button
                                    key={iso}
                                    type="button"
                                    disabled={isFuture}
                                    onClick={() => !isFuture && onSelectDate(iso)}
                                    className={`
                                        min-h-18 sm:min-h-20 p-1.5 sm:p-2 text-left cursor-pointer
                                        border-r border-[#f0e8d8] last:border-r-0
                                        transition-colors relative
                                        ${isFuture ? 'opacity-30 cursor-default' : 'hover:bg-primary/5'}
                                        ${isSelected ? 'bg-primary/10 ring-2 ring-primary ring-inset' : ''}
                                        ${isToday && !isSelected ? 'bg-secondary/5' : ''}
                                    `}
                                >
                                    {/* Day number */}
                                    <div className="flex items-center gap-1 mb-1">
                                        <span
                                            className={`
                                                text-xs font-bold font-body leading-none
                                                ${isSelected ? 'text-primary' : isToday ? 'text-secondary' : 'text-text-dark'}
                                            `}
                                        >
                                            {day.getDate()}
                                        </span>
                                        {isToday && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                                        )}
                                        {summary?.hasActive && !isToday && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse shrink-0" />
                                        )}
                                    </div>

                                    {/* Shift data or loading */}
                                    {isLoading && !summary ? (
                                        <div className="space-y-1">
                                            <div className="h-2.5 w-8 rounded bg-neutral-gray/10 animate-pulse" />
                                            <div className="h-2 w-6 rounded bg-neutral-gray/10 animate-pulse" />
                                        </div>
                                    ) : summary && summary.count > 0 ? (
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] font-bold font-body text-text-dark leading-tight">
                                                {summary.count} shift{summary.count !== 1 ? 's' : ''}
                                            </p>
                                            <p className="text-[9px] font-body text-neutral-gray leading-tight hidden sm:block">
                                                {summary.orders} order{summary.orders !== 1 ? 's' : ''}
                                            </p>
                                            {summary.sales > 0 && (
                                                <p className="text-[9px] font-bold font-body text-primary leading-tight">
                                                    {formatGHS(summary.sales)}
                                                </p>
                                            )}
                                        </div>
                                    ) : null}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
