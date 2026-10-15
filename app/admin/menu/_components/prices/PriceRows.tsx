'use client';

import { useState } from 'react';
import { XIcon } from '@phosphor-icons/react';
import type { BoardDish, BoardOption } from '@/lib/api/services/menuPrices.service';
import { formatGHS } from '@/lib/utils/currency';
import { toast } from '@/lib/utils/toast';
import { optionName } from './format';
import { Pill } from './Pill';

export interface RowActions {
    savePrice: (dish: BoardDish, option: BoardOption, value: number | null) => Promise<void>;
    removeDraft: (draftId: number) => Promise<void>;
    openDish: (dish: BoardDish) => void;
}

/** One card per category, a row per option, a box for the new price. */
export function PriceRows({ groups, actions }: { groups: { category: string; dishes: BoardDish[] }[]; actions: RowActions }) {
    return (
        <div className="space-y-4">
            {groups.map(group => (
                <section key={group.category} className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-[#f0e8d8]">
                        <h3 className="flex-1 text-sm font-semibold font-body text-text-dark">{group.category}</h3>
                        <span className="hidden sm:block w-24 text-right text-neutral-gray text-[10px] font-bold uppercase tracking-wider">Today</span>
                        <span className="w-28 text-right text-neutral-gray text-[10px] font-bold uppercase tracking-wider">New price</span>
                    </div>
                    {group.dishes.map(dish => (
                        <DishBlock key={dish.id} dish={dish} actions={actions} />
                    ))}
                </section>
            ))}
        </div>
    );
}

function DishBlock({ dish, actions }: { dish: BoardDish; actions: RowActions }) {
    const single = dish.options.length === 1 && dish.options[0].option_key === 'standard' && dish.new_options.length === 0;
    const rename = dish.drafts.name?.value;

    const heading = (
        <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
                <p className={`text-sm font-semibold font-body ${dish.is_available ? 'text-text-dark' : 'text-neutral-gray'}`}>{dish.name}</p>
                {!dish.is_available && <Pill tone="neutral">Off sale</Pill>}
                {dish.drafts.off_sale && <Pill tone="problem">Comes off sale</Pill>}
            </div>
            {rename && <p className="text-xs font-body text-amber-700 mt-0.5">Will be named {rename}</p>}
            <button
                type="button"
                onClick={() => actions.openDish(dish)}
                className="text-xs font-medium font-body text-primary hover:opacity-80 cursor-pointer mt-0.5"
            >
                Names and options
            </button>
        </div>
    );

    if (single) {
        const option = dish.options[0];
        return (
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#f0e8d8] last:border-0">
                {heading}
                <PriceCells dish={dish} option={option} actions={actions} />
            </div>
        );
    }

    return (
        <div className="px-4 py-3 border-b border-[#f0e8d8] last:border-0">
            {heading}
            <ul className="mt-2 space-y-1">
                {dish.options.map(option => (
                    <li key={option.id} className="flex items-center gap-3">
                        <OptionName dish={dish} option={option} />
                        <PriceCells dish={dish} option={option} actions={actions} />
                    </li>
                ))}
                {dish.new_options.map(added => (
                    <li key={`new-${added.draft_id}`} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0 pl-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-body text-text-dark">{added.display_name}</p>
                                <Pill tone="waiting">New</Pill>
                            </div>
                            <p className="text-xs font-body text-neutral-gray">Option: {added.option_label}</p>
                        </div>
                        <span className="hidden sm:block w-24 text-right text-sm font-body text-neutral-gray">Not sold yet</span>
                        <div className="w-28 flex items-center justify-end gap-1">
                            <span className="text-sm font-semibold font-body text-text-dark tabular-nums">{formatGHS(added.price)}</span>
                            <button
                                type="button"
                                onClick={() => actions.removeDraft(added.draft_id)}
                                aria-label={`Remove ${added.display_name}`}
                                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-neutral-gray hover:text-text-dark hover:bg-neutral-light cursor-pointer"
                            >
                                <XIcon size={14} weight="bold" />
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function OptionName({ dish, option }: { dish: BoardDish; option: BoardOption }) {
    const label = option.drafts.option_label?.value;
    const receipt = option.drafts.display_name?.value;

    return (
        <div className="flex-1 min-w-0 pl-3">
            <p className="text-sm font-body text-text-dark">{optionName(dish, option)}</p>
            {/* Only when the name does not already say it: "Plain Jollof Rice" needs no "Option: Plain". */}
            {option.display_name && !option.display_name.toLowerCase().includes(option.option_label.toLowerCase()) && (
                <p className="text-xs font-body text-neutral-gray">Option: {option.option_label}</p>
            )}
            {label && <p className="text-xs font-body text-amber-700">Option will read {label}</p>}
            {receipt && <p className="text-xs font-body text-amber-700">Receipt will read {receipt}</p>}
        </div>
    );
}

function PriceCells({ dish, option, actions }: { dish: BoardDish; option: BoardOption; actions: RowActions }) {
    const draft = option.drafts.price?.value;

    return (
        <>
            <span className="hidden sm:block w-24 text-right text-sm font-body text-neutral-gray tabular-nums">
                {formatGHS(option.price)}
            </span>
            {/* Keyed on the saved value, so a new answer from the server resets the box without an effect. */}
            <PriceInput
                key={`${option.id}:${draft ?? ''}`}
                today={option.price}
                draft={draft}
                label={`New price for ${optionName(dish, option)}`}
                onSave={value => actions.savePrice(dish, option, value)}
            />
        </>
    );
}

function PriceInput({
    today,
    draft,
    label,
    onSave,
}: {
    today: number;
    draft: number | undefined;
    label: string;
    onSave: (value: number | null) => Promise<void>;
}) {
    const [text, setText] = useState(draft !== undefined ? draft.toFixed(2) : '');
    const [saving, setSaving] = useState(false);

    async function commit() {
        const trimmed = text.trim().replace(/^₵/, '');

        if (trimmed === '') {
            if (draft !== undefined) await save(null);
            return;
        }

        const value = Number(trimmed);
        if (!Number.isFinite(value) || value < 0) {
            toast.error('That is not a price. Type a number, like 110.');
            setText(draft !== undefined ? draft.toFixed(2) : '');
            return;
        }

        const rounded = Math.round(value * 100) / 100;
        if (rounded === draft) return;
        await save(rounded);
    }

    async function save(value: number | null) {
        setSaving(true);
        try {
            await onSave(value);
        } finally {
            setSaving(false);
        }
    }

    const changed = draft !== undefined;
    const goesUp = draft !== undefined && draft > today;

    return (
        <div className="w-28 shrink-0">
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-body text-neutral-gray pointer-events-none">₵</span>
                <input
                    type="text"
                    inputMode="decimal"
                    aria-label={label}
                    placeholder="Same"
                    value={text}
                    disabled={saving}
                    onChange={e => setText(e.target.value)}
                    onBlur={commit}
                    onKeyDown={e => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        if (e.key === 'Escape') setText(draft !== undefined ? draft.toFixed(2) : '');
                    }}
                    className={`w-full min-h-11 pl-7 pr-3 rounded-xl border text-right text-sm font-body tabular-nums text-text-dark placeholder:text-neutral-gray/50 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-colors disabled:opacity-50 ${
                        changed ? 'bg-amber-50 border-amber-300 font-semibold' : 'bg-[#f5f4f2] border-[#e3e1de]'
                    }`}
                />
            </div>
            {changed ? (
                <p className="text-[11px] font-body text-right text-neutral-gray mt-0.5 tabular-nums">
                    {goesUp ? 'Up' : 'Down'} {formatGHS(Math.abs((draft ?? 0) - today))}
                </p>
            ) : (
                // The Today column is hidden on a phone, so today's price sits here.
                <p className="sm:hidden text-[11px] font-body text-right text-neutral-gray mt-0.5 tabular-nums">
                    Today {formatGHS(today)}
                </p>
            )}
        </div>
    );
}
