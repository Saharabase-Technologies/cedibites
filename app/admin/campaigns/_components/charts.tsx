'use client';

import { useState, type ReactNode } from 'react';

/**
 * The charts the campaign console draws.
 *
 * Hand built, because the repo carries no chart library and none of these needs
 * one. Each is a part of a whole or a short list of magnitudes, which is a row
 * of boxes and some arithmetic.
 *
 * Three rules hold across all of them:
 *
 *   Colour is never the only way to read a value. Every bar sits beside its
 *   label and its count, so the figures are there without hovering and without
 *   telling green from red.
 *
 *   Touching marks are separated by a 2px gap of the card showing through, not
 *   by a border drawn round them.
 *
 *   Text is ink. Only the marks carry the colours below.
 */

/**
 * What each colour means, and nothing else uses them.
 *
 * Checked against the cream card (#fffbf3) for separation between neighbours,
 * including for red-green colour blindness. The gold sits under 3:1 on cream,
 * which is why every segment also carries a written label and count.
 */
export const CHART = {
    delivered: '#2f8f4e',
    /** Taken by Hubtel, no receipt from the handset yet. */
    onItsWay: '#3f7fd0',
    /** Held, not sent. The brand gold: waiting on a person. */
    waiting: '#e49925',
    refused: '#d32f2f',
    /** Sent with no answer back. Deliberately not red: it may have arrived. */
    unsure: '#7d55b5',
    /** Not part of the story: numbers nobody can send to, people who never ordered. */
    muted: '#a89c87',
    /** One hue, dark to light, for things that come in an order. */
    ramp: ['#2f5570', '#4f7a99', '#86a9c2'],
    /** The empty part of a bar. A step off the card, so it reads as absence. */
    track: '#efe7d7',
} as const;

export interface Segment {
    key: string;
    label: string;
    /** One short clause saying what the label means, shown under it in the key. */
    note?: string;
    value: number;
    color: string;
}

/** "under 1%" for a sliver, because "0%" beside 39 people is a lie. */
export function share(value: number, total: number): string {
    if (total <= 0 || value <= 0) return '0%';

    const pct = (value / total) * 100;

    if (pct < 1) return 'under 1%';
    if (pct > 99 && pct < 100) return 'over 99%';

    return `${Math.round(pct)}%`;
}

/**
 * Parts of a whole, as one bar and a key that doubles as the table.
 *
 * The key is not decoration. It holds every figure the bar shows, so nothing
 * here depends on a tooltip, and pointing at a row lights its segment (and the
 * other way round) so the two can be read against each other.
 */
export function PartsBar({
    segments,
    total,
    label,
    keyLayout = 'rows',
    unit = 'people',
}: {
    segments: Segment[];
    total: number;
    /** What the bar is, for a screen reader. */
    label: string;
    /** `rows` for the main chart on a page, `inline` where space is tight. */
    keyLayout?: 'rows' | 'inline';
    unit?: string;
}) {
    const [active, setActive] = useState<string | null>(null);

    const shown = segments.filter((s) => s.value > 0);

    if (total <= 0 || shown.length === 0) {
        return null;
    }

    // Where each segment's middle falls, so its tooltip can lean away from the
    // card's edge instead of being cut off by it.
    let run = 0;
    const middles = new Map<string, number>();

    for (const s of shown) {
        middles.set(s.key, (run + s.value / 2) / total);
        run += s.value;
    }

    const focus = (key: string | null) => () => setActive(key);

    return (
        <div>
            <div className="flex gap-0.5" role="img" aria-label={label}>
                {shown.map((s, i) => {
                    const middle = middles.get(s.key) ?? 0.5;
                    const lean =
                        middle < 0.25 ? 'left-0' : middle > 0.75 ? 'right-0' : 'left-1/2 -translate-x-1/2';

                    return (
                        <div
                            key={s.key}
                            // The padding is the hit area. A 14px bar is a thin
                            // thing to land a pointer on.
                            className="relative py-2 outline-none group/seg"
                            style={{ flexGrow: s.value, flexBasis: 0, minWidth: 6 }}
                            tabIndex={0}
                            onMouseEnter={focus(s.key)}
                            onMouseLeave={focus(null)}
                            onFocus={focus(s.key)}
                            onBlur={focus(null)}
                        >
                            <div
                                className={`h-3.5 transition-opacity duration-150 ease-out motion-reduce:transition-none group-focus-visible/seg:ring-2 group-focus-visible/seg:ring-text-dark/40 ${
                                    i === 0 ? 'rounded-l' : ''
                                } ${i === shown.length - 1 ? 'rounded-r' : ''} ${
                                    active && active !== s.key ? 'opacity-30' : ''
                                }`}
                                style={{ backgroundColor: s.color }}
                            />

                            {active === s.key && (
                                <div
                                    role="tooltip"
                                    className={`absolute bottom-full mb-1 z-10 whitespace-nowrap rounded-lg bg-text-dark px-2.5 py-1.5 text-xs font-body text-white shadow-md pointer-events-none ${lean}`}
                                >
                                    <span className="font-semibold tabular-nums">{s.value.toLocaleString()}</span>
                                    <span className="text-white/75">
                                        {' '}
                                        {s.label.toLowerCase()}, {share(s.value, total)}
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {keyLayout === 'rows' ? (
                <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                    {shown.map((s) => (
                        <div
                            key={s.key}
                            onMouseEnter={focus(s.key)}
                            onMouseLeave={focus(null)}
                            className={`flex items-start gap-2.5 py-2 border-b border-[#f0e8d8] transition-opacity duration-150 ease-out motion-reduce:transition-none ${
                                active && active !== s.key ? 'opacity-45' : ''
                            }`}
                        >
                            <span
                                className="mt-1 h-2.5 w-2.5 rounded-xs shrink-0"
                                style={{ backgroundColor: s.color }}
                                aria-hidden
                            />
                            <dt className="min-w-0 flex-1 text-sm font-body text-text-dark">
                                {s.label}
                                {s.note && (
                                    <span className="block text-xs text-neutral-gray mt-0.5">{s.note}</span>
                                )}
                            </dt>
                            <dd className="text-right shrink-0 font-body">
                                <span className="text-sm font-semibold text-text-dark tabular-nums">
                                    {s.value.toLocaleString()}
                                </span>
                                <span className="block text-xs text-neutral-gray tabular-nums">
                                    {share(s.value, total)}
                                </span>
                            </dd>
                        </div>
                    ))}
                </dl>
            ) : (
                <ul className="flex flex-wrap gap-x-5 gap-y-1 mt-0.5">
                    {shown.map((s) => (
                        <li
                            key={s.key}
                            onMouseEnter={focus(s.key)}
                            onMouseLeave={focus(null)}
                            className={`flex items-center gap-1.5 text-xs font-body text-neutral-gray transition-opacity duration-150 ease-out motion-reduce:transition-none ${
                                active && active !== s.key ? 'opacity-45' : ''
                            }`}
                        >
                            <span
                                className="h-2 w-2 rounded-xs shrink-0"
                                style={{ backgroundColor: s.color }}
                                aria-hidden
                            />
                            <span className="text-text-dark">{s.label}</span>
                            <span className="tabular-nums">{s.value.toLocaleString()}</span>
                        </li>
                    ))}
                </ul>
            )}

            <p className="sr-only">
                {shown.map((s) => `${s.label}: ${s.value.toLocaleString()} ${unit}`).join('. ')}
            </p>
        </div>
    );
}

export interface MagnitudeRow {
    key: string;
    label: string;
    value: number;
    /** Set on the row that is not really one of the set, so it reads as an aside. */
    muted?: boolean;
    /** Parts of this row's bar, drawn in order from the left. Defaults to one solid bar. */
    parts?: { key: string; value: number; color: string }[];
    /** What to print at the end of the row instead of the bare value. */
    readout?: ReactNode;
}

/**
 * A short list of things compared by size, biggest reading longest.
 *
 * One colour for every row, because the rows are the same kind of thing and
 * the length already says which is bigger. Colouring them differently would
 * spend the only free channel on something the bar shows already.
 */
export function MagnitudeBars({
    rows,
    color = CHART.ramp[1],
    label,
}: {
    rows: MagnitudeRow[];
    color?: string;
    label: string;
}) {
    const max = Math.max(0, ...rows.map((r) => r.value));

    if (max <= 0) {
        return null;
    }

    return (
        <ul className="space-y-2.5" aria-label={label}>
            {rows.map((row) => {
                const width = `${(row.value / max) * 100}%`;
                const parts = row.parts ?? [
                    { key: 'all', value: row.value, color: row.muted ? CHART.muted : color },
                ];
                const drawn = parts.reduce((sum, p) => sum + p.value, 0);

                return (
                    // The label column fits the longest name this chart carries,
                    // "Not a mobile number", on one line from tablet up. On a
                    // phone it wraps to two instead of being cut short.
                    <li key={row.key} className="grid grid-cols-[6rem_1fr] sm:grid-cols-[9.5rem_1fr] items-center gap-3 font-body">
                        <span className={`text-sm leading-tight ${row.muted ? 'text-neutral-gray' : 'text-text-dark'}`}>
                            {row.label}
                        </span>
                        <span className="flex items-center gap-2.5 min-w-0">
                            <span className="flex-1 min-w-0">
                                {/* A floor on the width, so the smallest row is
                                    still a bar and not a gap between two gaps. */}
                                <span
                                    className="flex h-3 gap-0.5 rounded-r overflow-hidden"
                                    style={{ width, minWidth: row.value > 0 ? 12 : 0 }}
                                >
                                    {parts
                                        .filter((p) => p.value > 0)
                                        .map((p) => (
                                            <span
                                                key={p.key}
                                                style={{ flexGrow: p.value, flexBasis: 0, backgroundColor: p.color }}
                                            />
                                        ))}
                                    {/* Whatever the parts do not account for is the
                                        empty end of the bar, drawn as track. */}
                                    {row.value - drawn > 0 && (
                                        <span
                                            style={{
                                                flexGrow: row.value - drawn,
                                                flexBasis: 0,
                                                backgroundColor: CHART.track,
                                            }}
                                        />
                                    )}
                                </span>
                            </span>
                            <span className="shrink-0 text-sm text-text-dark tabular-nums text-right">
                                {row.readout ?? row.value.toLocaleString()}
                            </span>
                        </span>
                    </li>
                );
            })}
        </ul>
    );
}

/**
 * How many had arrived by each of four marks after the send.
 *
 * Columns, not a line. The server reports four checkpoints, unevenly spaced
 * (one hour, six, a day, two days), and a line drawn through them would invent
 * a slope between marks nobody measured.
 *
 * Every column is measured against what Hubtel accepted, marked by the rule
 * across the top, so a short column reads as "most of them had not arrived yet"
 * without a second scale.
 */
export function CheckpointColumns({
    marks,
    ceiling,
    ceilingLabel,
}: {
    marks: { key: string; label: string; value: number; reached: boolean }[];
    ceiling: number;
    ceilingLabel: string;
}) {
    if (ceiling <= 0 || marks.length === 0) {
        return null;
    }

    return (
        <div className="font-body">
            <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] text-neutral-gray tabular-nums shrink-0">{ceilingLabel}</span>
                <span className="h-px flex-1 bg-[#e3d9c6]" aria-hidden />
            </div>

            <div className="grid grid-cols-4 gap-2 h-28 items-end border-b border-[#ddd2bd]">
                {marks.map((m) => {
                    const height = m.reached ? Math.max((m.value / ceiling) * 100, m.value > 0 ? 3 : 0) : 0;

                    return (
                        <div
                            key={m.key}
                            className="h-full flex flex-col items-center justify-end group/col"
                            title={
                                m.reached
                                    ? `${m.value.toLocaleString()} delivered by ${m.label}, ${share(m.value, ceiling)} of those accepted`
                                    : `${m.label} has not passed yet`
                            }
                        >
                            <span
                                className={`text-xs tabular-nums mb-1 ${
                                    m.reached ? 'text-text-dark font-semibold' : 'text-neutral-gray'
                                }`}
                            >
                                {m.reached ? m.value.toLocaleString() : 'not yet'}
                            </span>
                            <span
                                className="w-6 rounded-t transition-opacity duration-150 ease-out motion-reduce:transition-none group-hover/col:opacity-80"
                                style={{ height: `${height}%`, backgroundColor: CHART.delivered }}
                            />
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-4 gap-2 mt-1.5">
                {marks.map((m) => (
                    <span key={m.key} className="text-center text-[11px] text-neutral-gray">
                        {m.label}
                    </span>
                ))}
            </div>
        </div>
    );
}

/** A small key for charts whose rows share the reach colours. */
export function ChartKey({ items }: { items: { label: string; color: string }[] }) {
    return (
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {items.map((item) => (
                <li key={item.label} className="flex items-center gap-1.5 text-xs font-body text-neutral-gray">
                    <span
                        className="h-2 w-2 rounded-xs shrink-0"
                        style={{ backgroundColor: item.color }}
                        aria-hidden
                    />
                    {item.label}
                </li>
            ))}
        </ul>
    );
}
