'use client';

import { useRef, useState } from 'react';
import { ImageIcon, PlusIcon, XCircleIcon } from '@phosphor-icons/react';
import {
    FormField,
    InventoryModal,
    PrimaryButton,
    Select,
    TextInput,
    Textarea,
    Toggle,
} from '@/app/inventory/_components';
import type { MenuTag } from '@/types/api';
import type { AdminMenuItem, ItemFormState, OptionRow, PricingType } from './types';
import { blankForm, itemToForm } from './types';

// ─── Image picker ─────────────────────────────────────────────────────────────

function ImagePicker({
    value,
    onChange,
    size = 'md',
}: {
    value?: string;
    onChange: (url: string, file: File) => void;
    size?: 'sm' | 'md';
}) {
    const ref = useRef<HTMLInputElement>(null);
    const dim = size === 'sm' ? 'w-10 h-10 rounded-lg' : 'w-20 h-20 rounded-xl';
    return (
        <>
            <button
                type="button"
                onClick={() => ref.current?.click()}
                aria-label="Choose photo"
                className={`${dim} border-2 border-dashed border-[#e3e1de] hover:border-primary/50 flex items-center justify-center overflow-hidden shrink-0 transition-colors cursor-pointer bg-[#f5f4f2]`}
            >
                {value
                    ? <img src={value} alt="" className="w-full h-full object-cover" />
                    : <ImageIcon size={size === 'sm' ? 15 : 22} className="text-neutral-gray/40" />}
            </button>
            <input
                type="file"
                ref={ref}
                accept="image/*"
                className="hidden"
                onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) onChange(URL.createObjectURL(f), f);
                }}
            />
        </>
    );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function ItemModal({
    item,
    menuTags,
    categoryOptions,
    onClose,
    onSave,
    isSaving = false,
}: {
    item: AdminMenuItem | null;
    menuTags: MenuTag[];
    categoryOptions: string[];
    onClose: () => void;
    onSave: (form: ItemFormState, existing: AdminMenuItem | null) => void;
    isSaving?: boolean;
}) {
    const isNew = !item;
    const [form, setForm] = useState<ItemFormState>(
        item ? itemToForm(item) : blankForm(categoryOptions),
    );
    const [errors, setErrors] = useState<Record<string, string>>({});

    function set<K extends keyof ItemFormState>(key: K, value: ItemFormState[K]) {
        setForm(prev => ({ ...prev, [key]: value }));
        setErrors(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    }

    function validate(): boolean {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = 'Name is required';
        if (!form.category) e.category = 'Pick a category';

        if (form.pricingType === 'simple') {
            if (!form.simplePrice || Number.isNaN(Number(form.simplePrice)) || Number(form.simplePrice) <= 0) {
                e.simplePrice = 'Enter a valid price';
            }
        } else if (!form.options.filter(o => o.label.trim() && Number(o.price) > 0).length) {
            e.options = 'Add at least one option with a name and price';
        }

        setErrors(e);
        return Object.keys(e).length === 0;
    }

    function updateOption(i: number, field: keyof OptionRow, value: string) {
        set('options', form.options.map((o, idx) => (idx === i ? { ...o, [field]: value } : o)));
    }

    function updateOptionImage(i: number, url: string, file: File) {
        setForm(prev => ({
            ...prev,
            options: prev.options.map((o, idx) => (idx === i ? { ...o, image: url, imageFile: file } : o)),
        }));
    }

    function toggleTag(slug: string) {
        set('tags', form.tags.includes(slug) ? form.tags.filter(t => t !== slug) : [...form.tags, slug]);
    }

    return (
        <InventoryModal
            isOpen
            onClose={onClose}
            title={isNew ? 'Add menu item' : `Edit — ${item?.name}`}
            size="lg"
        >
            <div className="flex flex-col gap-5">

                {/* ── Basics ─────────────────────────────────────────────── */}
                <FormField label="Item name" error={errors.name} required>
                    <TextInput
                        value={form.name}
                        onChange={e => set('name', e.target.value)}
                        placeholder="e.g. Jollof Rice with Chicken"
                    />
                </FormField>

                <FormField label="Category" error={errors.category} required>
                    <Select value={form.category} onChange={e => set('category', e.target.value)}>
                        <option value="">Choose a category…</option>
                        {categoryOptions.filter(c => c !== 'All').map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </Select>
                </FormField>

                <FormField label="Description" hint="Shown under the item name on the menu.">
                    <Textarea
                        value={form.description}
                        onChange={e => set('description', e.target.value)}
                        rows={2}
                        placeholder="Short description…"
                    />
                </FormField>

                {/* ── Pricing ────────────────────────────────────────────── */}
                <div>
                    <p className="text-text-dark text-sm font-medium font-body mb-2">Pricing</p>
                    <div className="flex gap-2 mb-2">
                        {(['simple', 'options'] as PricingType[]).map(type => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => set('pricingType', type)}
                                className={`
                                    flex-1 py-2.5 px-3 rounded-xl text-sm font-medium font-body border transition-all cursor-pointer min-h-11
                                    ${form.pricingType === type
                                        ? 'bg-primary/10 border-primary text-primary'
                                        : 'border-[#e3e1de] text-neutral-gray hover:text-text-dark'}
                                `}
                            >
                                {type === 'simple' ? 'Single price' : 'Multiple options'}
                            </button>
                        ))}
                    </div>
                    <p className="text-neutral-gray text-xs font-body mb-3">
                        {form.pricingType === 'simple'
                            ? 'One price. The item name is what appears on the receipt.'
                            : 'Each option carries its own price, and its own name on receipts and orders.'}
                    </p>

                    {form.pricingType === 'simple' ? (
                        <div className="flex items-start gap-3">
                            <div className="flex-1">
                                <TextInput
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={form.simplePrice}
                                    onChange={e => set('simplePrice', e.target.value)}
                                    placeholder="Price in GHS"
                                />
                                {errors.simplePrice && (
                                    <p className="text-red-500 text-xs font-body mt-1.5">{errors.simplePrice}</p>
                                )}
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <ImagePicker
                                    value={form.image}
                                    onChange={(url, file) => setForm(p => ({ ...p, image: url, imageFile: file }))}
                                />
                                <span className="text-[10px] text-neutral-gray font-body">Photo</span>
                            </div>
                        </div>
                    ) : (
                        <div>
                            {/* Stacked cards rather than a five-column grid: the
                                old layout put four inputs and a delete button on
                                one row, which stopped fitting well before phone
                                width. */}
                            <div className="flex flex-col gap-2.5">
                                {form.options.map((opt, i) => (
                                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-[#e3e1de] bg-[#f5f4f2]">
                                        <ImagePicker
                                            value={opt.image}
                                            onChange={(url, file) => updateOptionImage(i, url, file)}
                                            size="sm"
                                        />
                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_1fr_100px] gap-2 min-w-0">
                                            <TextInput
                                                value={opt.label}
                                                onChange={e => updateOption(i, 'label', e.target.value)}
                                                placeholder="Option, e.g. Fried Rice"
                                                className="bg-white"
                                            />
                                            <TextInput
                                                value={opt.displayName}
                                                onChange={e => updateOption(i, 'displayName', e.target.value)}
                                                placeholder="Receipt name (optional)"
                                                className="bg-white"
                                            />
                                            <TextInput
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={opt.price}
                                                onChange={e => updateOption(i, 'price', e.target.value)}
                                                placeholder="₵"
                                                className="bg-white"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => form.options.length > 1 && set('options', form.options.filter((_, idx) => idx !== i))}
                                            disabled={form.options.length <= 1}
                                            aria-label={`Remove option ${i + 1}`}
                                            className="mt-2.5 text-neutral-gray/40 hover:text-red-500 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                        >
                                            <XCircleIcon size={18} weight="fill" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={() => set('options', [...form.options, { label: '', displayName: '', price: '' }])}
                                className="flex items-center gap-1.5 text-sm font-medium font-body text-primary hover:opacity-80 transition-opacity cursor-pointer w-fit mt-3"
                            >
                                <PlusIcon size={14} weight="bold" />
                                Add option
                            </button>
                            {errors.options && (
                                <p className="text-red-500 text-xs font-body mt-1.5">{errors.options}</p>
                            )}
                            <p className="text-neutral-gray text-xs font-body mt-2">
                                The first option&apos;s photo is used as the item&apos;s listing photo.
                            </p>
                        </div>
                    )}
                </div>

                {/* ── Tags ───────────────────────────────────────────────── */}
                {menuTags.length > 0 && (
                    <div>
                        <p className="text-text-dark text-sm font-medium font-body mb-1">Tags</p>
                        <p className="text-neutral-gray text-xs font-body mb-2">
                            Attributes of the dish. Popularity and newness are worked out from orders — they are not set here.
                        </p>
                        <div className="flex gap-2 flex-wrap">
                            {menuTags.map(tag => (
                                <button
                                    key={tag.slug}
                                    type="button"
                                    onClick={() => toggleTag(tag.slug)}
                                    className={`
                                        px-3 py-2 rounded-lg text-sm font-medium font-body transition-all cursor-pointer capitalize border
                                        ${form.tags.includes(tag.slug)
                                            ? 'bg-primary/10 text-primary border-primary/40'
                                            : 'bg-[#f5f4f2] text-neutral-gray hover:text-text-dark border-transparent'}
                                    `}
                                >
                                    {tag.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── On sale ────────────────────────────────────────────── */}
                <div className="flex items-start justify-between gap-4 p-3.5 bg-[#f5f4f2] rounded-xl">
                    <div>
                        <p className="text-text-dark text-sm font-medium font-body">On sale</p>
                        <p className="text-neutral-gray text-xs font-body mt-0.5">
                            Off withdraws it from every branch. To take it off one branch only, use the Availability tab.
                        </p>
                    </div>
                    <Toggle checked={form.isAvailable} onChange={v => set('isAvailable', v)} />
                </div>

                <PrimaryButton
                    onClick={() => validate() && onSave(form, item)}
                    loading={isSaving}
                >
                    {isNew ? 'Add item' : 'Save changes'}
                </PrimaryButton>
            </div>
        </InventoryModal>
    );
}
