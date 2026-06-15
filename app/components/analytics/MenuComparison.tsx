'use client';

import { useMemo, useState } from 'react';
import {
    ScalesIcon,
    PlusIcon,
    XIcon,
    MagnifyingGlassIcon,
    CaretDownIcon,
    TrophyIcon,
    SpinnerIcon,
} from '@phosphor-icons/react';
import { formatPrice } from '@/types/order';
import { useMenuCatalog, useMenuComparison, type AnalyticsPeriod } from '@/lib/api/hooks/useAnalytics';
import type { CustomRange } from './PeriodFilter';
import type { ComparisonSubjectInput, MenuCatalogItem } from '@/lib/api/services/analytics.service';
import LineChart, { type LinePoint, type LineSeries } from './LineChart';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COLORS = ['#e49925', '#6c833f', '#1976d2'];

interface Subject {
    id: string;
    label: string;
    itemIds: number[];
    optionIds: number[];
}

const newSubject = (id: string): Subject => ({ id, label: '', itemIds: [], optionIds: [] });

interface MenuComparisonProps {
    period: AnalyticsPeriod;
    customRange?: CustomRange;
    branchId?: number;
    branchIds?: number[];
}

// ─── Piece picker (items + options) ───────────────────────────────────────────

function PiecePicker({ catalog, subject, onToggleItem, onToggleOption, onClose }: {
    catalog: MenuCatalogItem[];
    subject: Subject;
    onToggleItem: (id: number) => void;
    onToggleOption: (id: number) => void;
    onClose: () => void;
}) {
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState<number | null>(null);

    const filtered = useMemo(() => {
        if (!search.trim()) return catalog;
        const q = search.toLowerCase();
        return catalog.filter(it => it.name.toLowerCase().includes(q));
    }, [catalog, search]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div className="bg-neutral-card rounded-2xl w-full max-w-md shadow-xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#f0e8d8]">
                    <h3 className="text-text-dark text-sm font-bold font-body">Add items & options</h3>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-light text-neutral-gray cursor-pointer"><XIcon size={16} /></button>
                </div>
                <div className="p-4 border-b border-[#f0e8d8]">
                    <div className="relative">
                        <MagnifyingGlassIcon size={15} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-gray" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search menu items…"
                            className="w-full pl-9 pr-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary" />
                    </div>
                </div>
                <div className="overflow-y-auto px-2 py-2">
                    {filtered.length === 0 ? (
                        <p className="text-neutral-gray text-sm font-body text-center py-8">No items found.</p>
                    ) : filtered.map(it => {
                        const itemOn = subject.itemIds.includes(it.id);
                        const isExpanded = expanded === it.id;
                        return (
                            <div key={it.id} className="rounded-xl">
                                <div className="flex items-center gap-2 px-3 py-2">
                                    <button type="button" onClick={() => onToggleItem(it.id)}
                                        className={`flex-1 flex items-center gap-2 text-left text-sm font-semibold font-body rounded-lg px-2 py-1.5 transition-colors cursor-pointer ${itemOn ? 'bg-primary/10 text-primary' : 'text-text-dark hover:bg-neutral-light'}`}>
                                        <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${itemOn ? 'bg-primary border-primary' : 'border-neutral-gray/40'}`}>
                                            {itemOn && <span className="text-white text-[9px] font-bold">✓</span>}
                                        </span>
                                        {it.name}
                                        <span className="text-[10px] font-normal text-neutral-gray ml-1">whole</span>
                                    </button>
                                    {it.options.length > 0 && (
                                        <button type="button" onClick={() => setExpanded(isExpanded ? null : it.id)}
                                            className="p-1.5 rounded-lg text-neutral-gray hover:bg-neutral-light cursor-pointer">
                                            <CaretDownIcon size={13} weight="bold" className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                        </button>
                                    )}
                                </div>
                                {isExpanded && it.options.length > 0 && (
                                    <div className="pl-8 pr-3 pb-2 flex flex-col gap-1">
                                        {it.options.map(opt => {
                                            const optOn = subject.optionIds.includes(opt.id);
                                            return (
                                                <button key={opt.id} type="button" onClick={() => onToggleOption(opt.id)}
                                                    className={`flex items-center gap-2 text-left text-xs font-body rounded-lg px-2 py-1.5 transition-colors cursor-pointer ${optOn ? 'bg-secondary/10 text-secondary font-semibold' : 'text-neutral-gray hover:bg-neutral-light'}`}>
                                                    <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${optOn ? 'bg-secondary border-secondary' : 'border-neutral-gray/40'}`}>
                                                        {optOn && <span className="text-white text-[8px] font-bold">✓</span>}
                                                    </span>
                                                    {opt.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="px-4 py-3 border-t border-[#f0e8d8]">
                    <button type="button" onClick={onClose} className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold font-body hover:bg-primary-hover transition-colors cursor-pointer">Done</button>
                </div>
            </div>
        </div>
    );
}

// ─── Subject builder card ─────────────────────────────────────────────────────

function SubjectCard({ subject, color, itemName, optionLabel, onLabel, onAdd, onRemoveItem, onRemoveOption, onDelete, canDelete }: {
    subject: Subject;
    color: string;
    itemName: (id: number) => string;
    optionLabel: (id: number) => string;
    onLabel: (v: string) => void;
    onAdd: () => void;
    onRemoveItem: (id: number) => void;
    onRemoveOption: (id: number) => void;
    onDelete: () => void;
    canDelete: boolean;
}) {
    const empty = subject.itemIds.length === 0 && subject.optionIds.length === 0;
    return (
        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
                <input value={subject.label} onChange={e => onLabel(e.target.value)} placeholder="Name this subject…"
                    className="flex-1 min-w-0 bg-transparent text-text-dark text-sm font-bold font-body focus:outline-none placeholder:text-neutral-gray/60 placeholder:font-normal" />
                {canDelete && (
                    <button type="button" onClick={onDelete} className="p-1 rounded-lg text-neutral-gray/60 hover:text-error hover:bg-error/10 cursor-pointer"><XIcon size={14} /></button>
                )}
            </div>
            <div className="flex flex-wrap gap-1.5">
                {subject.itemIds.map(id => (
                    <span key={`i${id}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold font-body">
                        {itemName(id)}
                        <button type="button" onClick={() => onRemoveItem(id)} className="hover:text-error cursor-pointer"><XIcon size={10} weight="bold" /></button>
                    </span>
                ))}
                {subject.optionIds.map(id => (
                    <span key={`o${id}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/10 text-secondary text-[11px] font-semibold font-body">
                        {optionLabel(id)}
                        <button type="button" onClick={() => onRemoveOption(id)} className="hover:text-error cursor-pointer"><XIcon size={10} weight="bold" /></button>
                    </span>
                ))}
                {empty && <span className="text-neutral-gray/70 text-[11px] font-body py-1">No items yet</span>}
            </div>
            <button type="button" onClick={onAdd}
                className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-[#e0d4bf] text-neutral-gray text-xs font-semibold font-body hover:border-primary/40 hover:text-primary transition-colors cursor-pointer">
                <PlusIcon size={13} weight="bold" /> Add items / options
            </button>
        </div>
    );
}

// ─── Metric row in the comparison device ──────────────────────────────────────

function MetricRow({ label, values, format, leaderHigh = true }: {
    label: string;
    values: (number | null)[];
    format: (v: number) => string;
    leaderHigh?: boolean;
}) {
    const nums = values.filter((v): v is number => v !== null);
    const leader = nums.length ? (leaderHigh ? Math.max(...nums) : Math.min(...nums)) : null;
    return (
        <div className="grid items-center gap-2 py-2.5 border-b border-[#f0e8d8] last:border-0" style={{ gridTemplateColumns: `1.1fr repeat(${values.length}, 1fr)` }}>
            <span className="text-neutral-gray text-[11px] font-semibold font-body uppercase tracking-wider">{label}</span>
            {values.map((v, i) => {
                const isLeader = v !== null && leader !== null && v === leader && nums.length > 1;
                return (
                    <span key={i} className={`text-sm font-body text-right ${isLeader ? 'text-text-dark font-bold' : 'text-neutral-gray'}`}>
                        {v === null ? '—' : format(v)}
                        {isLeader && <TrophyIcon size={11} weight="fill" className="inline-block ml-1 -mt-0.5 text-primary" />}
                    </span>
                );
            })}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MenuComparison({ period, customRange, branchId, branchIds }: MenuComparisonProps) {
    const { data: catalog = [] } = useMenuCatalog();
    const [subjects, setSubjects] = useState<Subject[]>([newSubject('a'), newSubject('b')]);
    const [pickerFor, setPickerFor] = useState<string | null>(null);

    // Lookup maps for chip labels.
    const { itemName, optionLabel } = useMemo(() => {
        const items = new Map<number, string>();
        const opts = new Map<number, string>();
        for (const it of catalog) {
            items.set(it.id, it.name);
            for (const o of it.options) opts.set(o.id, `${it.name} · ${o.label}`);
        }
        return {
            itemName: (id: number) => items.get(id) ?? `#${id}`,
            optionLabel: (id: number) => opts.get(id) ?? `#${id}`,
        };
    }, [catalog]);

    const autoLabel = (s: Subject): string => {
        if (s.label.trim()) return s.label.trim();
        if (s.itemIds[0] !== undefined) return itemName(s.itemIds[0]);
        if (s.optionIds[0] !== undefined) return optionLabel(s.optionIds[0]);
        return 'Subject';
    };

    const compareSubjects: ComparisonSubjectInput[] = subjects.map(s => ({
        label: autoLabel(s),
        item_ids: s.itemIds,
        option_ids: s.optionIds,
    }));

    const { data: comparison, isFetching } = useMenuComparison(compareSubjects, period, branchId, customRange, branchIds);

    const update = (id: string, fn: (s: Subject) => Subject) =>
        setSubjects(prev => prev.map(s => (s.id === id ? fn(s) : s)));

    const toggle = (arr: number[], id: number) => (arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);

    const picker = subjects.find(s => s.id === pickerFor);

    // Build overlaid line chart points (shared revenue scale).
    const { points, series } = useMemo(() => {
        const subs = comparison?.subjects ?? [];
        const dates = subs[0]?.series.map(p => p.date) ?? [];
        const pts: LinePoint[] = dates.map((date, i) => {
            const d = new Date(date + 'T00:00:00');
            const values: Record<string, number> = {};
            subs.forEach((s, si) => { values[`s${si}`] = s.series[i]?.revenue ?? 0; });
            return {
                label: `${d.getDate()} ${MONTHS[d.getMonth()]}`,
                fullLabel: d.toLocaleDateString('en-GH', { weekday: 'short', day: 'numeric', month: 'short' }),
                values,
            };
        });
        const ser: LineSeries[] = subs.map((s, si) => ({ key: `s${si}`, label: s.label, color: COLORS[si % COLORS.length], format: (v) => formatPrice(v) }));
        return { points: pts, series: ser };
    }, [comparison]);

    const hasResults = (comparison?.subjects ?? []).some(s => s.revenue > 0 || s.units > 0);
    const subs = comparison?.subjects ?? [];

    return (
        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-1">
                <ScalesIcon size={18} weight="fill" className="text-primary" />
                <h3 className="text-text-dark text-sm font-bold font-body">Menu Comparison</h3>
            </div>
            <p className="text-neutral-gray text-xs font-body mb-4">
                Build subjects from whole items and/or specific options, then compare their historical performance.
            </p>

            {/* Subject builders */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                {subjects.map((s, i) => (
                    <SubjectCard
                        key={s.id}
                        subject={s}
                        color={COLORS[i % COLORS.length]}
                        itemName={itemName}
                        optionLabel={optionLabel}
                        onLabel={v => update(s.id, x => ({ ...x, label: v }))}
                        onAdd={() => setPickerFor(s.id)}
                        onRemoveItem={id => update(s.id, x => ({ ...x, itemIds: x.itemIds.filter(y => y !== id) }))}
                        onRemoveOption={id => update(s.id, x => ({ ...x, optionIds: x.optionIds.filter(y => y !== id) }))}
                        onDelete={() => setSubjects(prev => prev.filter(x => x.id !== s.id))}
                        canDelete={subjects.length > 2}
                    />
                ))}
                {subjects.length < 3 && (
                    <button type="button" onClick={() => setSubjects(prev => [...prev, newSubject(Math.random().toString(36).slice(2, 7))])}
                        className="min-h-[120px] flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[#e0d4bf] text-neutral-gray hover:border-primary/40 hover:text-primary transition-colors cursor-pointer">
                        <PlusIcon size={18} weight="bold" />
                        <span className="text-xs font-semibold font-body">Add subject</span>
                    </button>
                )}
            </div>

            {/* Results device */}
            {isFetching ? (
                <div className="flex items-center justify-center py-12"><SpinnerIcon size={26} className="text-primary animate-spin" /></div>
            ) : !hasResults ? (
                <div className="text-center py-10 border-t border-[#f0e8d8]">
                    <ScalesIcon size={26} weight="thin" className="text-neutral-gray/30 mx-auto mb-2" />
                    <p className="text-neutral-gray text-sm font-body">Pick items or options above to compare their sales.</p>
                </div>
            ) : (
                <div className="border-t border-[#f0e8d8] pt-4">
                    {/* Overlaid revenue trajectories */}
                    {points.length >= 2 && (
                        <div className="mb-4">
                            <p className="text-neutral-gray text-[11px] font-semibold font-body uppercase tracking-wider mb-2">Revenue over time</p>
                            <LineChart points={points} series={series} sharedScale height={180} />
                        </div>
                    )}

                    {/* Metric comparison grid */}
                    <div className="overflow-x-auto">
                        <div className="min-w-[420px]">
                            {/* Header row with subject labels */}
                            <div className="grid items-center gap-2 pb-2 border-b-2 border-[#f0e8d8]" style={{ gridTemplateColumns: `1.1fr repeat(${subs.length}, 1fr)` }}>
                                <span />
                                {subs.map((s, i) => (
                                    <span key={i} className="text-right text-xs font-bold font-body text-text-dark truncate flex items-center justify-end gap-1.5">
                                        <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                                        {s.label}
                                    </span>
                                ))}
                            </div>
                            <MetricRow label="Revenue" values={subs.map(s => s.revenue)} format={formatPrice} />
                            <MetricRow label="Units sold" values={subs.map(s => s.units)} format={v => Math.round(v).toLocaleString('en-GH')} />
                            <MetricRow label="Orders" values={subs.map(s => s.orders)} format={v => Math.round(v).toLocaleString('en-GH')} />
                            <MetricRow label="Avg. order value" values={subs.map(s => s.aov)} format={formatPrice} />
                            <MetricRow label="Avg. sales / day" values={subs.map(s => s.avg_per_day)} format={formatPrice} />
                            <MetricRow label="Best day" values={subs.map(s => s.max_day?.revenue ?? null)} format={formatPrice} />
                            <MetricRow label="Slowest day" values={subs.map(s => s.min_day?.revenue ?? null)} format={formatPrice} leaderHigh={false} />
                        </div>
                    </div>
                </div>
            )}

            {picker && (
                <PiecePicker
                    catalog={catalog}
                    subject={picker}
                    onToggleItem={id => update(picker.id, x => ({ ...x, itemIds: toggle(x.itemIds, id) }))}
                    onToggleOption={id => update(picker.id, x => ({ ...x, optionIds: toggle(x.optionIds, id) }))}
                    onClose={() => setPickerFor(null)}
                />
            )}
        </div>
    );
}
