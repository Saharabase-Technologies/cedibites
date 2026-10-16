'use client';

import { useState } from 'react';
import { boltSums, type BoltDish, type BoltOption, type BoltSettings } from '@/lib/api/services/bolt.service';
import { formatGHS } from '@/lib/utils/currency';
import { receiptName } from '@/lib/utils/receiptName.mjs';
import { toast } from '@/lib/utils/toast';
import { Pill } from '../prices/Pill';

export type SaveOption = (option: BoltOption, boltPrice: number | null, promoPercent: number | null) => Promise<void>;

/** The option's name on its own, by the receipt name rule. */
function lineName(dish: BoltDish, option: BoltOption): string {
    return receiptName(dish.name, option.display_name || option.option_label);
}

const HEAD = 'text-neutral-gray text-[10px] font-bold uppercase tracking-wider text-right';

/** One card per category, a row per option, Bolt's price and promo beside ours. */
export function BoltRows({
    groups,
    settings,
    onSave,
}: {
    groups: { category: string; dishes: BoltDish[] }[];
    settings: BoltSettings;
    onSave: SaveOption;
}) {
    return (
        <div className="space-y-4">
            {groups.map(group => (
                <section key={group.category} className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-[#f0e8d8]">
                        <h3 className="flex-1 text-sm font-semibold font-body text-text-dark">{group.category}</h3>
                        <span className={`hidden sm:block w-20 ${HEAD}`}>Counter</span>
                        <span className={`w-28 ${HEAD}`}>Bolt price</span>
                        <span className={`w-20 ${HEAD}`}>Promo</span>
                        <span className={`hidden md:block w-28 ${HEAD}`}>We keep</span>
                    </div>
                    {group.dishes.flatMap(dish =>
                        dish.options.map(option => (
                            <BoltRow key={option.id} dish={dish} option={option} settings={settings} onSave={onSave} />
                        )),
                    )}
                </section>
            ))}
        </div>
    );
}

function BoltRow({
    dish,
    option,
    settings,
    onSave,
}: {
    dish: BoltDish;
    option: BoltOption;
    settings: BoltSettings;
    onSave: SaveOption;
}) {
    const name = lineName(dish, option);
    const onBolt = option.bolt_price != null;
    const sums = onBolt ? boltSums(option.bolt_price as number, option.bolt_promo_percent, settings) : null;
    const against = sums ? Math.round((sums.keep - option.price) * 100) / 100 : 0;

    return (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#f0e8d8] last:border-0">
            <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <p className={`text-sm font-body ${onBolt ? 'font-semibold text-text-dark' : 'text-neutral-gray'}`}>{name}</p>
                    {!dish.is_available && <Pill tone="neutral">Off sale</Pill>}
                </div>
                {sums ? (
                    <p className="text-xs font-body text-neutral-gray mt-0.5 tabular-nums">
                        {sums.promo > 0 && <>Customer pays {formatGHS(sums.paid)} · </>}
                        <span className="md:hidden">We keep {formatGHS(sums.keep)} · </span>
                        <span className={against < 0 ? 'text-rose-700' : 'text-emerald-700'}>
                            {against < 0 ? `${formatGHS(-against)} less than the counter` : against > 0 ? `${formatGHS(against)} more than the counter` : 'Same as the counter'}
                        </span>
                    </p>
                ) : (
                    <p className="sm:hidden text-xs font-body text-neutral-gray mt-0.5 tabular-nums">Counter {formatGHS(option.price)}</p>
                )}
            </div>

            <span className="hidden sm:block w-20 text-right text-sm font-body text-neutral-gray tabular-nums">
                {formatGHS(option.price)}
            </span>

            {/* Keyed on the saved values, so a new answer from the server resets the boxes without an effect. */}
            <NumberBox
                key={`p${option.id}:${option.bolt_price ?? ''}`}
                width="w-28"
                prefix="₵"
                saved={option.bolt_price}
                placeholder="Not on Bolt"
                label={`Bolt price for ${name}`}
                rule={value => value > 0 ? null : 'A Bolt price is more than 0. Clear the box to take the dish off Bolt.'}
                onSave={value => onSave(option, value, value === null ? null : option.bolt_promo_percent)}
            />
            <NumberBox
                key={`r${option.id}:${option.bolt_promo_percent ?? ''}:${onBolt}`}
                width="w-20"
                suffix="%"
                saved={option.bolt_promo_percent}
                placeholder="None"
                label={`Bolt promo for ${name}`}
                disabled={!onBolt}
                rule={value => value <= 100 ? null : 'A promo is 100% at most.'}
                onSave={value => onSave(option, option.bolt_price, value === 0 ? null : value)}
            />

            <span className="hidden md:block w-28 text-right text-sm font-body font-semibold text-text-dark tabular-nums">
                {sums ? formatGHS(sums.keep) : ''}
            </span>
        </div>
    );
}

/** A money or percent box that saves when you leave it, like the New prices boxes. */
function NumberBox({
    width,
    prefix,
    suffix,
    saved,
    placeholder,
    label,
    disabled = false,
    rule,
    onSave,
}: {
    width: string;
    prefix?: string;
    suffix?: string;
    saved: number | null;
    placeholder: string;
    label: string;
    disabled?: boolean;
    rule: (value: number) => string | null;
    onSave: (value: number | null) => Promise<void>;
}) {
    const shown = saved !== null ? String(saved) : '';
    const [text, setText] = useState(shown);
    const [saving, setSaving] = useState(false);

    async function commit() {
        const trimmed = text.trim().replace(/^₵/, '').replace(/%$/, '');

        if (trimmed === '') {
            if (saved !== null) await save(null);
            return;
        }

        const value = Number(trimmed);
        const problem = Number.isFinite(value) && value >= 0 ? rule(value) : 'That is not a number. Type one, like 80.';
        if (problem) {
            toast.error(problem);
            setText(shown);
            return;
        }

        const rounded = Math.round(value * 100) / 100;
        if (rounded === saved) return;
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

    return (
        <div className={`${width} shrink-0 relative`}>
            {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-body text-neutral-gray pointer-events-none">{prefix}</span>}
            <input
                type="text"
                inputMode="decimal"
                aria-label={label}
                placeholder={placeholder}
                value={text}
                disabled={saving || disabled}
                onChange={e => setText(e.target.value)}
                onBlur={commit}
                onKeyDown={e => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    if (e.key === 'Escape') setText(shown);
                }}
                className={`w-full min-h-11 ${prefix ? 'pl-7' : 'pl-3'} ${suffix ? 'pr-7' : 'pr-3'} rounded-xl border text-right text-sm font-body tabular-nums text-text-dark placeholder:text-neutral-gray/50 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-colors disabled:opacity-40 ${
                    saved !== null ? 'bg-white border-[#e3e1de] font-semibold' : 'bg-[#f5f4f2] border-[#e3e1de]'
                }`}
            />
            {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-body text-neutral-gray pointer-events-none">{suffix}</span>}
        </div>
    );
}
