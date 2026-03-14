'use client';

import { useState, useMemo } from 'react';
import {
    MagnifyingGlassIcon,
    PlusIcon,
    MinusIcon,
    CaretRightIcon,
    XIcon,
    ShoppingCartSimpleIcon,
} from '@phosphor-icons/react';
import Input from '@/app/components/base/Input';
import { sampleMenuItems, menuCategories, type MenuItem } from '@/lib/data/SampleMenu';
import type { StaffCartItem } from '../types';
import { useNewOrder } from '../context';
import { formatGHS} from '../utils';

// ─── Menu item row ─────────────────────────────────────────────────────────────

function MenuItemRow({
    item,
    cart,
    addItem,
    removeItem,
}: {
    item: MenuItem;
    cart: StaffCartItem[];
    addItem: (item: MenuItem, variantKey: string, price: number, variantLabel?: string) => void;
    removeItem: (cartKey: string) => void;
}) {
    const hasVariants = !!item.hasVariants && !!item.variants;
    const hasSizes = !!item.sizes?.length;

    const variantOptions = hasVariants
        ? (Object.keys(item.variants!) as ('plain' | 'assorted')[])
        : [];

    const [selectedVariant, setSelectedVariant] = useState<'plain' | 'assorted'>(
        variantOptions[0] ?? 'plain'
    );
    const [selectedSizeKey, setSelectedSizeKey] = useState<string>(
        item.sizes?.[0]?.key ?? 'regular'
    );

    let activeKey: string;
    let activePrice: number;
    let activeLabel: string | undefined;

    if (hasVariants) {
        activeKey = selectedVariant;
        activePrice = item.variants![selectedVariant] ?? 0;
        activeLabel = selectedVariant.charAt(0).toUpperCase() + selectedVariant.slice(1);
    } else if (hasSizes) {
        const size = item.sizes!.find(s => s.key === selectedSizeKey) ?? item.sizes![0];
        activeKey = size.key;
        activePrice = size.price;
        activeLabel = size.label;
    } else {
        activeKey = 'regular';
        activePrice = item.price ?? 0;
    }

    const cartKey = `${item.id}|${activeKey}`;
    const qty = cart.find(c => c.cartKey === cartKey)?.quantity ?? 0;
    const inCart = qty > 0;

    return (
        <div
            className={`
                flex flex-col px-4 py-3.5 rounded-2xl border
                transition-colors duration-150
                ${inCart ? 'border-primary/40 bg-primary/5' : 'border-brown-light/20'}
            `}
        >
            {/* Name + qty controls */}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className="text-text-dark dark:text-text-light text-sm font-medium font-body leading-snug">
                        {item.name}
                    </p>
                    <p className="text-primary text-sm font-bold font-body mt-0.5">
                        {formatGHS(activePrice)}
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 mt-0.5">
                    {inCart ? (
                        <>
                            <button
                                type="button"
                                onClick={() => removeItem(cartKey)}
                                className="w-8 h-8 rounded-full border border-brown-light/30 flex items-center justify-center text-neutral-gray hover:text-error hover:border-error/50 transition-colors cursor-pointer"
                            >
                                <MinusIcon size={14} weight="bold" />
                            </button>
                            <span className="text-text-dark dark:text-text-light text-sm font-bold font-body w-5 text-center">
                                {qty}
                            </span>
                            <button
                                type="button"
                                onClick={() => addItem(item, activeKey, activePrice, activeLabel)}
                                className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-brand-darker hover:bg-primary-hover transition-colors cursor-pointer"
                            >
                                <PlusIcon size={14} weight="bold" />
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={() => addItem(item, activeKey, activePrice, activeLabel)}
                            className="w-8 h-8 rounded-full border border-brown-light/30 flex items-center justify-center text-neutral-gray hover:text-primary hover:border-primary transition-colors cursor-pointer"
                        >
                            <PlusIcon size={14} weight="bold" />
                        </button>
                    )}
                </div>
            </div>

            {/* Variant pills */}
            {hasVariants && (
                <div className="flex gap-1.5 flex-wrap mt-2.5">
                    {variantOptions.map(v => (
                        <button
                            key={v}
                            type="button"
                            onClick={() => setSelectedVariant(v)}
                            className={`
                                px-2.5 py-0.5 rounded-full text-[10px] font-medium border
                                transition-colors duration-150 capitalize
                                ${selectedVariant === v
                                    ? 'bg-neutral-gray text-white border-neutral-gray'
                                    : 'border-neutral-gray/30 text-neutral-gray hover:border-primary/60'
                                }
                            `}
                        >
                            {v}
                        </button>
                    ))}
                </div>
            )}

            {/* Size pills */}
            {hasSizes && (
                <div className="flex gap-1.5 flex-wrap mt-2.5">
                    {item.sizes!.map(s => (
                        <button
                            key={s.key}
                            type="button"
                            onClick={() => setSelectedSizeKey(s.key)}
                            className={`
                                px-2.5 py-0.5 rounded-full text-[10px] font-medium border
                                transition-colors duration-150
                                ${selectedSizeKey === s.key
                                    ? 'bg-neutral-gray text-white border-neutral-gray'
                                    : 'border-neutral-gray/30 text-neutral-gray hover:border-primary/60'
                                }
                            `}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Step 2: Menu ─────────────────────────────────────────────────────────────

export default function StepMenu() {
    const { cart, addItem, removeItem, clearItem, setStep } = useNewOrder();
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');

    const filtered = useMemo(() => {
        let items = sampleMenuItems;
        if (category !== 'all') items = items.filter(i => i.category === category);
        if (search.trim()) {
            const q = search.toLowerCase();
            items = items.filter(i => i.name.toLowerCase().includes(q));
        }
        return items;
    }, [search, category]);

    const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
    const canProceed = cartCount > 0;

    return (
        <div className="flex flex-col md:flex-row md:h-full md:gap-0">

            {/* ── Left: search + categories + item list ────────────────────── */}
            <div className="flex flex-col gap-4 flex-  min-w-0 md:min-h-0 md:overflow-y-auto custom-scrollbar2 md:no-scrollbar md:pr-6">

                {/* Search */}
                <Input
                    type="search"
                    placeholder="Search menu..."
                    value={search}
                    onChange={val => { setSearch(val); setCategory('all'); }}
                    leftIcon={<MagnifyingGlassIcon size={20} weight="bold" />}
                    clearable
                />

                {/* Category tabs */}
                <div className='w-full'>
                    <div className="flex gap-2 h- bg-red-20 custom-scrollbar2 overflow-x-auto pb-4 nscrollbar">
                        {menuCategories.map(cat => (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => { setCategory(cat.id); setSearch(''); }}
                                className={`
                  shrink-0 px-4 py-1.5 rounded-full text-sm font-medium font-body
                  border transition-all duration-150 cursor-pointer
                  ${category === cat.id
                                        ? 'bg-primary text-brand-darker border-primary'
                                        : 'border-brown-light/25 text-neutral-gray hover:text-text-dark dark:hover:text-text-light hover:border-brown-light/50'
                                    }
                `}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>                </div>

                {/* Menu items */}
                <div className="flex flex-col gap-1.5 pb-2">
                    {filtered.length === 0 && (
                        <p className="text-neutral-gray text-sm font-body text-center py-8">No items found.</p>
                    )}
                    {filtered.map(item => (
                        <MenuItemRow
                            key={item.id}
                            item={item}
                            cart={cart}
                            addItem={addItem}
                            removeItem={removeItem}
                        />
                    ))}
                </div>

                {/* Mobile: sticky cart footer */}
                <div className="md:hidden sticky bottom-0 pt-4 pb-2 bg-brand-darker">
                    <div className={`rounded-2xl p-4 border transition-all duration-200 ${canProceed ? 'border-primary/40 bg-brown' : 'border-brown-light/20 bg-brown/60'}`}>
                        {canProceed ? (
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-text-light text-sm font-semibold font-body">
                                        {cartCount} item{cartCount > 1 ? 's' : ''} &mdash; {formatGHS(cartTotal)}
                                    </p>
                                    <p className="text-neutral-gray text-xs font-body">Subtotal, excl. delivery</p>
                                </div>
                                <div className="flex flex-reverse gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setStep(3)}
                                        className="flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-brand-darker text-sm font-semibold font-body transition-colors cursor-pointer"
                                    >
                                        Customer <CaretRightIcon size={14} weight="bold" />
                                    </button>
                                    <button type="button" onClick={() => setStep(1)} className="px-4 py-2.5 rounded-full border border-brown-light/50 dark:hover:border-neutral-light text-text-dark dark:text-text-neutral-gray text-sm font-body hover:text-text-dark dark:hover:text-text-light  transition-colors cursor-pointer">
                                        Back
                                    </button>

                                </div>
                            </div>
                        ) : (
                            <p className="text-neutral-gray text-sm font-body text-center">Add at least one item to continue.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Right: cart sidebar (desktop only) ───────────────────────── */}
            <aside className="hidden md:flex flex-col w-72 shrink-0 border-l border-brown-light/15 pl-6">

                {/* Header */}
                <div className="shrink-0 flex items-center justify-between mb-4">
                    <p className="text-text-light text-sm font-semibold font-body">Cart</p>
                    {cartCount > 0 && (
                        <span className="text-[10px] font-bold font-body px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                            {cartCount} item{cartCount > 1 ? 's' : ''}
                        </span>
                    )}
                </div>

                {/* Cart items */}
                {cart.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
                        <ShoppingCartSimpleIcon size={32} weight="thin" className="text-neutral-gray/40" />
                        <p className="text-neutral-gray/60 text-sm font-body">
                            Add items from<br />the menu
                        </p>
                    </div>
                ) : (
                    <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col gap-2">
                        {cart.map(item => (
                            <div
                                key={item.cartKey}
                                className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-brown border border-brown-light/20"
                            >
                                {/* Qty badge */}
                                <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold font-body flex items-center justify-center">
                                    {item.quantity}
                                </span>

                                {/* Info */}
                                <div className="min-w-0 flex-1">
                                    <p className="text-text-light text-xs font-medium font-body leading-snug line-clamp-2">
                                        {item.name}
                                    </p>
                                    {item.variantLabel && (
                                        <p className="text-neutral-gray text-[10px] font-body mt-0.5">{item.variantLabel}</p>
                                    )}
                                    <p className="text-primary text-xs font-bold font-body mt-1">
                                        {formatGHS(item.price * item.quantity)}
                                    </p>
                                </div>

                                {/* Remove entire line */}
                                <button
                                    type="button"
                                    onClick={() => clearItem(item.cartKey)}
                                    className="shrink-0 w-6 h-6 rounded-full border border-brown-light/30 flex items-center justify-center text-neutral-gray hover:text-error hover:border-error/40 transition-colors cursor-pointer mt-0.5"
                                    aria-label="Remove from cart"
                                >
                                    <XIcon size={10} weight="bold" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer: subtotal + navigation */}
                <div className="shrink-0 pt-4 mt-4 border-t border-brown-light/15 flex flex-col gap-3">
                    {cartCount > 0 && (
                        <div className="flex items-center justify-between">
                            <span className="text-neutral-gray text-xs font-body">Subtotal</span>
                            <span className="text-text-light text-sm font-bold font-body">{formatGHS(cartTotal)}</span>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="w-full px-4 py-2.5 rounded-full border border-brown-light text-neutral-gray hover:text-text-dark text-sm font-body dark:hover:text-text-light transition-colors cursor-pointer"
                    >
                        Back
                    </button>
                    <button
                        type="button"
                        onClick={() => setStep(3)}
                        disabled={!canProceed}
                        className="
                w-full flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full
                bg-primary hover:bg-primary-hover
                disabled:opacity-40 disabled:cursor-not-allowed
                text-brand-darker text-sm font-semibold font-body
                transition-colors cursor-pointer
              "
                    >
                        Customer <CaretRightIcon size={14} weight="bold" />
                    </button>
                </div>
            </aside>
        </div>
    );
}
