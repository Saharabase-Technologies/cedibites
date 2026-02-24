'use client';

import { useState } from 'react';
import { CalendarIcon, XIcon } from '@phosphor-icons/react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DatePreset = 'today' | 'yesterday' | 'last7' | 'custom';

export interface DateRange {
    preset: DatePreset;
    from: Date;
    to: Date;
}

interface DateFilterProps {
    value: DateRange | null;
    onChange: (range: DateRange | null) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date): Date { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }
function toInputDate(d: Date): string { return d.toISOString().slice(0, 10); }
function formatShort(d: Date): string {
    return d.toLocaleDateString('en-GH', { day: 'numeric', month: 'short' });
}

const PRESETS: { id: DatePreset; label: string; build?: () => { from: Date; to: Date } }[] = [
    {
        id: 'today',
        label: 'Today',
        build: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }),
    },
    {
        id: 'yesterday',
        label: 'Yesterday',
        build: () => {
            const d = new Date(); d.setDate(d.getDate() - 1);
            return { from: startOfDay(d), to: endOfDay(d) };
        },
    },
    {
        id: 'last7',
        label: 'Last 7 days',
        build: () => {
            const from = new Date(); from.setDate(from.getDate() - 6);
            return { from: startOfDay(from), to: endOfDay(new Date()) };
        },
    },
    { id: 'custom', label: 'Custom range' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function DateFilter({ value, onChange }: DateFilterProps) {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<DatePreset>(value?.preset ?? 'today');
    const [customFrom, setCustomFrom] = useState(toInputDate(new Date()));
    const [customTo, setCustomTo] = useState(toInputDate(new Date()));

    const applyPreset = (preset: DatePreset) => {
        const p = PRESETS.find(x => x.id === preset);
        if (!p?.build) return;
        const { from, to } = p.build();
        onChange({ preset, from, to });
        setOpen(false);
    };

    const applyCustom = () => {
        onChange({
            preset: 'custom',
            from: startOfDay(new Date(customFrom)),
            to: endOfDay(new Date(customTo)),
        });
        setOpen(false);
    };

    const clear = () => { onChange(null); setOpen(false); };

    const triggerLabel = value
        ? value.preset === 'custom'
            ? `${formatShort(value.from)} – ${formatShort(value.to)}`
            : PRESETS.find(p => p.id === value.preset)?.label ?? 'Date'
        : 'Date';

    return (
        <div className="relative">

            {/* ── Trigger ─────────────────────────────────────────────── */}
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`
          flex items-center gap-2 px-3.5 py-2.5 rounded-full border text-sm font-body
          transition-all duration-150 cursor-pointer whitespace-nowrap
          ${value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-brown-light/25 text-neutral-gray hover:text-text-light hover:border-brown-light/40'
                    }
        `}
            >
                <CalendarIcon size={15} weight={value ? 'fill' : 'regular'} />
                {triggerLabel}
                {value && (
                    <span
                        role="button"
                        tabIndex={0}
                        onClick={e => { e.stopPropagation(); clear(); }}
                        onKeyDown={e => e.key === 'Enter' && clear()}
                        className="ml-0.5 hover:text-error cursor-pointer"
                        aria-label="Clear date filter"
                    >
                        <XIcon size={12} weight="bold" />
                    </span>
                )}
            </button>

            {/* ── Dropdown ──────────────────────────────────────────────── */}
            {open && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />

                    <div className="absolute left-0 top-full mt-2 z-30 w-64 bg-brown border border-brown-light/20 rounded-2xl shadow-2xl overflow-hidden">

                        {/* Preset list */}
                        <div className="p-2 flex flex-col gap-0.5">
                            {PRESETS.map(preset => (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => {
                                        setActiveTab(preset.id);
                                        if (preset.id !== 'custom') applyPreset(preset.id);
                                    }}
                                    className={`
                    flex items-center justify-between px-3 py-2.5 rounded-xl
                    text-sm font-body text-left transition-colors duration-150 cursor-pointer
                    ${activeTab === preset.id
                                            ? 'bg-primary/15 text-primary'
                                            : 'text-text-light hover:bg-brown-light/10'
                                        }
                  `}
                                >
                                    {preset.label}
                                    {activeTab === preset.id && value?.preset === preset.id && preset.id !== 'custom' && (
                                        <span className="w-4 h-4 rounded-full bg-primary flex items-center justify-center shrink-0">
                                            <span className="w-1.5 h-1.5 rounded-full bg-brand-darker" />
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Custom range inputs */}
                        {activeTab === 'custom' && (
                            <div className="border-t border-brown-light/15 p-3 flex flex-col gap-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] text-neutral-gray font-body uppercase tracking-wider">From</label>
                                        <input
                                            type="date"
                                            value={customFrom}
                                            max={customTo}
                                            onChange={e => setCustomFrom(e.target.value)}
                                            className="
                        bg-brand-dark border border-brown-light/20 focus:border-primary
                        rounded-xl px-2.5 py-2 text-text-light text-xs font-body
                        outline-none transition-colors cursor-pointer
                      "
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] text-neutral-gray font-body uppercase tracking-wider">To</label>
                                        <input
                                            type="date"
                                            value={customTo}
                                            min={customFrom}
                                            onChange={e => setCustomTo(e.target.value)}
                                            className="
                        bg-brand-dark border border-brown-light/20 focus:border-primary
                        rounded-xl px-2.5 py-2 text-text-light text-xs font-body
                        outline-none transition-colors cursor-pointer
                      "
                                        />
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={applyCustom}
                                    className="w-full bg-primary hover:bg-primary-hover text-brand-darker font-semibold font-body py-2.5 rounded-xl text-sm transition-colors cursor-pointer"
                                >
                                    Apply
                                </button>
                            </div>
                        )}

                        {/* Clear */}
                        {value && (
                            <div className="border-t border-brown-light/15 p-2">
                                <button
                                    type="button"
                                    onClick={clear}
                                    className="w-full text-center text-xs text-neutral-gray hover:text-error font-body py-1.5 transition-colors cursor-pointer"
                                >
                                    Clear filter
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
