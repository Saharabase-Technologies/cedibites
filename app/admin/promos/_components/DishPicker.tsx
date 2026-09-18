'use client';

import { SearchBar } from '@/app/inventory/_components';
import { useMenuItems } from '@/lib/api/hooks/useMenuItems';
import { CheckIcon } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';

/**
 * Which dishes a promo is for, grouped the way the menu is.
 *
 * The menu is one list across every branch, so the ids chosen here are the
 * same dish wherever it is sold.
 */
export function DishPicker({ selected, onChange }: { selected: string[]; onChange: (ids: string[]) => void }) {
    const { items, categories, isLoading } = useMenuItems();
    const [query, setQuery] = useState('');

    const groups = useMemo(() => {
        const q = query.trim().toLowerCase();
        return categories
            .map(c => ({
                name: c.name,
                dishes: items.filter(i => i.category === c.name && (!q || i.name.toLowerCase().includes(q))),
            }))
            .filter(g => g.dishes.length > 0);
    }, [items, categories, query]);

    const toggle = (id: string) =>
        onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
                <SearchBar value={query} onChange={setQuery} placeholder="Find a dish" />
                {selected.length > 0 && (
                    <button
                        type="button"
                        onClick={() => onChange([])}
                        className="min-h-11 shrink-0 rounded-xl px-3 text-sm font-medium font-body text-neutral-gray transition-colors duration-150 hover:text-text-dark"
                    >
                        Clear {selected.length}
                    </button>
                )}
            </div>

            <div className="max-h-72 overflow-y-auto rounded-xl border border-[#e3e1de] bg-[#f5f4f2]">
                {isLoading ? (
                    <p className="px-4 py-6 text-sm font-body text-neutral-gray">Loading the menu</p>
                ) : groups.length === 0 ? (
                    <p className="px-4 py-6 text-sm font-body text-neutral-gray">No dish called that.</p>
                ) : (
                    groups.map(group => (
                        <div key={group.name}>
                            <p className="sticky top-0 bg-[#efece7] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider font-body text-neutral-gray">
                                {group.name}
                            </p>
                            {group.dishes.map(dish => {
                                const on = selected.includes(dish.id);
                                return (
                                    <button
                                        key={dish.id}
                                        type="button"
                                        onClick={() => toggle(dish.id)}
                                        aria-pressed={on}
                                        className="flex min-h-11 w-full items-center gap-3 px-4 text-left transition-colors duration-150 hover:bg-white/70"
                                    >
                                        <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors duration-150 ${on ? 'border-primary bg-primary' : 'border-[#cfcac2] bg-white'}`}>
                                            {on && <CheckIcon size={12} weight="bold" className="text-white" />}
                                        </span>
                                        <span className={`text-sm font-body ${on ? 'font-medium text-text-dark' : 'text-text-dark/80'}`}>{dish.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
