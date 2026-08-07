'use client';

import { useMemo, useState } from 'react';
import { PlusIcon, XIcon, SpinnerGapIcon, UsersThreeIcon } from '@phosphor-icons/react';
import { TextInput, Select } from '@/app/inventory/_components';
import { useAudienceCount, useAudienceOptions } from '@/lib/api/hooks/useCampaigns';
import { useDebounced } from '@/lib/hooks/useDebounced';
import type { AudienceRules, GhanaNetwork } from '@/types/marketing';

/**
 * Assembling an audience out of conditions.
 *
 * Conditions are added one at a time and every one narrows — they combine with
 * AND, so the count can only go down as you add. That is the property that makes
 * this safe to hand to somebody: there is no arrangement of filters that
 * accidentally sends to more people than you started with.
 *
 * The live count is the whole point. "Lapsed MTN customers who bought jollof" is
 * a sentence; it becomes a decision only when it says 312 beside it.
 */

type ConditionKey =
    | 'recency'
    | 'dormancy'
    | 'window'
    | 'dishes'
    | 'branches'
    | 'networks'
    | 'orders'
    | 'spend'
    | 'hours';

const CONDITIONS: { key: ConditionKey; label: string; hint: string }[] = [
    { key: 'recency', label: 'Ordered recently', hint: 'Bought in the last N days' },
    { key: 'dormancy', label: 'Gone quiet', hint: 'Has not bought for N days' },
    { key: 'window', label: 'Ordered between dates', hint: 'A specific period' },
    { key: 'dishes', label: 'Bought a dish', hint: 'Ever ordered specific items' },
    { key: 'branches', label: 'From a branch', hint: 'Ordered at specific branches' },
    { key: 'networks', label: 'On a network', hint: 'MTN, Telecel, AirtelTigo' },
    { key: 'orders', label: 'How many orders', hint: 'At least / at most' },
    { key: 'spend', label: 'How much spent', hint: 'Total across all orders' },
    { key: 'hours', label: 'Time of day', hint: 'Lunch crowd, dinner crowd' },
];

/** Which rule keys each condition owns, so removing one clears exactly its own. */
const OWNED_KEYS: Record<ConditionKey, (keyof AudienceRules)[]> = {
    recency: ['ordered_within_days'],
    dormancy: ['not_ordered_for_days'],
    window: ['ordered_after', 'ordered_before'],
    dishes: ['menu_item_ids'],
    branches: ['branch_ids'],
    networks: ['networks'],
    orders: ['min_orders', 'max_orders'],
    spend: ['min_spend', 'max_spend'],
    hours: ['hour_from', 'hour_to'],
};

function activeConditions(rules: AudienceRules): ConditionKey[] {
    return (Object.keys(OWNED_KEYS) as ConditionKey[]).filter((key) =>
        OWNED_KEYS[key].some((k) => {
            const v = rules[k];
            return Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== '';
        }),
    );
}

export function AudienceBuilder({
    rules,
    onChange,
}: {
    rules: AudienceRules;
    onChange: (rules: AudienceRules) => void;
}) {
    const { branches, menuItems, networks } = useAudienceOptions();

    // Conditions added but not yet filled in still need to show their inputs,
    // so the visible set is what is in the rules plus what was just added.
    const [added, setAdded] = useState<ConditionKey[]>(() => activeConditions(rules));
    const [picking, setPicking] = useState(false);

    const visible = useMemo(() => {
        const fromRules = activeConditions(rules);
        return CONDITIONS.map((c) => c.key).filter((k) => added.includes(k) || fromRules.includes(k));
    }, [rules, added]);

    // Counting is a scan of the order history; one per keystroke would run it
    // for numbers nobody had finished typing.
    const debounced = useDebounced(rules, 400);
    const { count, isCounting } = useAudienceCount(debounced);

    function set(patch: Partial<AudienceRules>) {
        onChange({ ...rules, ...patch });
    }

    function remove(key: ConditionKey) {
        const next = { ...rules };
        OWNED_KEYS[key].forEach((k) => delete next[k]);
        setAdded((a) => a.filter((k) => k !== key));
        onChange(next);
    }

    const available = CONDITIONS.filter((c) => !visible.includes(c.key));

    return (
        <div className="flex flex-col gap-4">

            {/* ── The count ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 rounded-2xl bg-white border border-[#f0e8d8] px-4 py-3">
                <UsersThreeIcon size={20} weight="fill" className="text-primary shrink-0" />
                <div className="min-w-0">
                    <p className="text-text-dark font-semibold font-body tabular-nums">
                        {count === null ? '—' : count.toLocaleString()}{' '}
                        <span className="font-normal text-neutral-gray">
                            {count === 1 ? 'person matches' : 'people match'}
                        </span>
                    </p>
                    <p className="text-neutral-gray text-xs font-body">
                        {visible.length === 0
                            ? 'No conditions yet — this is everybody we hold a number for.'
                            : `${visible.length} condition${visible.length === 1 ? '' : 's'}, all of which must be true`}
                    </p>
                </div>
                {isCounting && <SpinnerGapIcon size={16} className="animate-spin text-neutral-gray ml-auto shrink-0" />}
            </div>

            {/* ── The conditions ────────────────────────────────────────── */}
            {visible.map((key) => (
                <ConditionRow key={key} label={CONDITIONS.find((c) => c.key === key)!.label} onRemove={() => remove(key)}>
                    {key === 'recency' && (
                        <Inline>
                            <span>Ordered in the last</span>
                            <NumberBox
                                value={rules.ordered_within_days}
                                onChange={(v) => set({ ordered_within_days: v })}
                                placeholder="30"
                            />
                            <span>days</span>
                        </Inline>
                    )}

                    {key === 'dormancy' && (
                        <Inline>
                            <span>Has not ordered for</span>
                            <NumberBox
                                value={rules.not_ordered_for_days}
                                onChange={(v) => set({ not_ordered_for_days: v })}
                                placeholder="60"
                            />
                            <span>days or more</span>
                        </Inline>
                    )}

                    {key === 'window' && (
                        <Inline>
                            <span>Ordered between</span>
                            <DateBox value={rules.ordered_after} onChange={(v) => set({ ordered_after: v })} />
                            <span>and</span>
                            <DateBox value={rules.ordered_before} onChange={(v) => set({ ordered_before: v })} />
                        </Inline>
                    )}

                    {key === 'dishes' && (
                        <Chips
                            options={menuItems.map((m) => ({ value: Number(m.value), label: m.label }))}
                            selected={rules.menu_item_ids ?? []}
                            onChange={(ids) => set({ menu_item_ids: ids })}
                            empty="No dishes on the menu yet."
                        />
                    )}

                    {key === 'branches' && (
                        <Chips
                            options={branches.map((b) => ({ value: Number(b.value), label: b.label }))}
                            selected={rules.branch_ids ?? []}
                            onChange={(ids) => set({ branch_ids: ids })}
                            empty="No branches yet."
                        />
                    )}

                    {key === 'networks' && (
                        <Chips
                            options={networks.map((n) => ({ value: n.value, label: n.label }))}
                            selected={rules.networks ?? []}
                            onChange={(v) => set({ networks: v as GhanaNetwork[] })}
                            empty=""
                            note="Read from the number's prefix. A number ported to another network still reports the one it was issued by."
                        />
                    )}

                    {key === 'orders' && (
                        <Inline>
                            <span>At least</span>
                            <NumberBox value={rules.min_orders} onChange={(v) => set({ min_orders: v })} placeholder="2" />
                            <span>and at most</span>
                            <NumberBox value={rules.max_orders} onChange={(v) => set({ max_orders: v })} placeholder="any" />
                            <span>orders</span>
                        </Inline>
                    )}

                    {key === 'spend' && (
                        <Inline>
                            <span>Spent at least GHS</span>
                            <NumberBox value={rules.min_spend} onChange={(v) => set({ min_spend: v })} placeholder="100" />
                            <span>and at most GHS</span>
                            <NumberBox value={rules.max_spend} onChange={(v) => set({ max_spend: v })} placeholder="any" />
                        </Inline>
                    )}

                    {key === 'hours' && (
                        <Inline>
                            <span>Ordered between</span>
                            <HourBox value={rules.hour_from} onChange={(v) => set({ hour_from: v })} />
                            <span>and</span>
                            <HourBox value={rules.hour_to} onChange={(v) => set({ hour_to: v })} />
                        </Inline>
                    )}
                </ConditionRow>
            ))}

            {/* ── Adding one ────────────────────────────────────────────── */}
            {available.length > 0 && (
                picking ? (
                    <div className="rounded-2xl border border-[#f0e8d8] bg-white p-3">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-text-dark text-sm font-semibold font-body">Narrow it by…</p>
                            <button
                                onClick={() => setPicking(false)}
                                className="text-neutral-gray hover:text-text-dark cursor-pointer"
                            >
                                <XIcon size={16} />
                            </button>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-2">
                            {available.map((c) => (
                                <button
                                    key={c.key}
                                    type="button"
                                    onClick={() => { setAdded((a) => [...a, c.key]); setPicking(false); }}
                                    className="text-left rounded-xl border border-[#f0e8d8] px-3 py-2 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer"
                                >
                                    <p className="text-text-dark text-sm font-medium font-body">{c.label}</p>
                                    <p className="text-neutral-gray text-xs font-body">{c.hint}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setPicking(true)}
                        className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-[#d9d2c4] px-4 py-3 text-sm font-medium font-body text-neutral-gray hover:text-text-dark hover:border-primary transition-colors cursor-pointer"
                    >
                        <PlusIcon size={15} weight="bold" />
                        Add a condition
                    </button>
                )
            )}
        </div>
    );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function ConditionRow({
    label, onRemove, children,
}: {
    label: string;
    onRemove: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-[#f0e8d8] bg-white px-4 py-3">
            <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-text-dark text-sm font-semibold font-body">{label}</p>
                <button
                    type="button"
                    onClick={onRemove}
                    aria-label={`Remove ${label}`}
                    className="text-neutral-gray hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                >
                    <XIcon size={15} />
                </button>
            </div>
            {children}
        </div>
    );
}

function Inline({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-wrap items-center gap-2 text-sm font-body text-neutral-gray">{children}</div>
    );
}

function NumberBox({
    value, onChange, placeholder,
}: {
    value: number | null | undefined;
    onChange: (v: number | null) => void;
    placeholder: string;
}) {
    return (
        <TextInput
            type="number"
            min={0}
            value={value ?? ''}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
            className="w-24 min-h-9 py-1.5"
        />
    );
}

function DateBox({
    value, onChange,
}: {
    value: string | null | undefined;
    onChange: (v: string | null) => void;
}) {
    return (
        <TextInput
            type="date"
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value || null)}
            className="w-40 min-h-9 py-1.5"
        />
    );
}

function HourBox({
    value, onChange,
}: {
    value: number | null | undefined;
    onChange: (v: number | null) => void;
}) {
    return (
        <Select
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
            className="w-28 min-h-9 py-1.5"
        >
            <option value="">any time</option>
            {Array.from({ length: 25 }, (_, h) => (
                <option key={h} value={h}>
                    {String(h).padStart(2, '0')}:00
                </option>
            ))}
        </Select>
    );
}

function Chips<T extends number | string>({
    options, selected, onChange, empty, note,
}: {
    options: { value: T; label: string }[];
    selected: T[];
    onChange: (values: T[]) => void;
    empty: string;
    note?: string;
}) {
    if (options.length === 0 && empty) {
        return <p className="text-neutral-gray text-sm font-body">{empty}</p>;
    }

    function toggle(value: T) {
        onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
    }

    return (
        <div>
            <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto">
                {options.map((o) => {
                    const active = selected.includes(o.value);
                    return (
                        <button
                            key={String(o.value)}
                            type="button"
                            onClick={() => toggle(o.value)}
                            aria-pressed={active}
                            className={`
                                rounded-full px-3 py-1.5 text-xs font-medium font-body transition-colors cursor-pointer
                                ${active
                                    ? 'bg-primary text-white'
                                    : 'bg-neutral-light text-neutral-gray hover:text-text-dark'}
                            `}
                        >
                            {o.label}
                        </button>
                    );
                })}
            </div>
            {/* Any one of the chosen options is a match — it is between
                conditions that everything must hold, not within one. */}
            {selected.length > 1 && (
                <p className="text-neutral-gray text-xs font-body mt-2">Any one of these counts.</p>
            )}
            {note && <p className="text-neutral-gray text-xs font-body mt-2">{note}</p>}
        </div>
    );
}
