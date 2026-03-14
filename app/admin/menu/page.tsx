'use client';

import { useState, useMemo, useRef } from 'react';
import {
    PlusIcon,
    PencilSimpleIcon,
    ArchiveIcon,
    ArrowCounterClockwiseIcon,
    TrashIcon,
    MagnifyingGlassIcon,
    XIcon,
    XCircleIcon,
    StarIcon,
    SparkleIcon,
    CheckCircleIcon,
    ToggleLeftIcon,
    ToggleRightIcon,
    UploadSimpleIcon,
    ForkKnifeIcon,
    WarningCircleIcon,
    CaretDownIcon,
    ImageIcon,
} from '@phosphor-icons/react';
import { sampleMenuItems } from '@/lib/data/SampleMenu';
import type { MenuItem, SizeKey } from '@/lib/data/SampleMenu';
import { useMenuConfig, DEFAULT_CONFIG } from '@/lib/hooks/useMenuConfig';
import type { OptionTemplate, AddOn } from '@/lib/hooks/useMenuConfig';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GlobalMenuItem extends MenuItem {
    globallyAvailable: boolean;
    archived: boolean;
    tags: string[];
    branchAvailability: Record<string, { available: boolean; priceOverride?: number }>;
    sortOrder: number;
}

type PricingType = 'simple' | 'options';
interface OptionRow { label: string; price: string; image?: string; }

interface ItemFormState {
    name: string;
    description: string;
    category: string;
    pricingType: PricingType;
    simplePrice: string;
    image?: string;
    options: OptionRow[];
    addOns: string[];
    tags: string[];
    globallyAvailable: boolean;
    branchAvailability: Record<string, { available: boolean; priceOverride?: number }>;
}

const BRANCHES = ['Osu', 'East Legon', 'Spintex'];

// ─── Seed ─────────────────────────────────────────────────────────────────────

const INITIAL_ITEMS: GlobalMenuItem[] = sampleMenuItems.map((item, i) => ({
    ...item,
    globallyAvailable: true,
    archived: false,
    tags: item.popular ? ['popular'] : item.isNew ? ['new'] : [],
    branchAvailability: Object.fromEntries(
        BRANCHES.map(b => [b, { available: b !== 'Spintex' || ['Basic Meals', 'Combos', 'Drinks'].includes(item.category) }])
    ),
    sortOrder: i,
}));

const ALL_CATEGORIES = ['All', ...Array.from(new Set(sampleMenuItems.map(i => i.category)))];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasPricingOptions(item: MenuItem): boolean {
    return !!(item.sizes?.length) || !!(item.hasVariants && item.variants);
}

function getOptionRows(item: MenuItem): OptionRow[] {
    if (item.hasVariants && item.variants) {
        const rows: OptionRow[] = [];
        if (item.variants.plain != null) rows.push({ label: 'Plain', price: String(item.variants.plain) });
        if (item.variants.assorted != null) rows.push({ label: 'Assorted', price: String(item.variants.assorted) });
        return rows;
    }
    if (item.sizes?.length) {
        return item.sizes.map(s => ({ label: s.label, price: String(s.price), image: s.image }));
    }
    return [{ label: '', price: '' }, { label: '', price: '' }];
}

function PriceDisplay({ item }: { item: MenuItem }) {
    if (hasPricingOptions(item)) {
        const rows = getOptionRows(item);
        const prices = rows.map(r => Number(r.price)).filter(Boolean);
        if (!prices.length) return <span className="text-neutral-gray text-xs font-body">—</span>;
        const min = Math.min(...prices), max = Math.max(...prices);
        if (min === max) return <span className="text-text-dark text-xs font-bold font-body">₵{min}</span>;
        if (rows.length <= 4) {
            return (
                <div className="flex flex-wrap gap-1">
                    {rows.map(r => (
                        <span key={r.label} className="inline-flex items-center gap-1 bg-neutral-gray/10 border border-neutral-gray/20 rounded-full px-2 py-0.5 text-[10px] font-body font-medium text-text-dark whitespace-nowrap">
                            {r.label}
                            <span className="text-primary font-bold">₵{r.price}</span>
                        </span>
                    ))}
                </div>
            );
        }
        return <span className="text-text-dark text-xs font-bold font-body">₵{min} – {max}</span>;
    }
    if (item.price != null) return <span className="text-text-dark text-xs font-bold font-body">₵{item.price}</span>;
    return <span className="text-neutral-gray text-xs font-body">—</span>;
}

function itemToForm(item: GlobalMenuItem): ItemFormState {
    const isMulti = hasPricingOptions(item);
    return {
        name: item.name,
        description: item.description,
        category: item.category,
        pricingType: isMulti ? 'options' : 'simple',
        simplePrice: !isMulti && item.price != null ? String(item.price) : '',
        image: !isMulti ? item.image : undefined,
        options: isMulti ? getOptionRows(item) : [{ label: '', price: '' }, { label: '', price: '' }],
        addOns: item.availableAddOns ?? [],
        tags: item.tags,
        globallyAvailable: item.globallyAvailable,
        branchAvailability: item.branchAvailability,
    };
}

function blankForm(): ItemFormState {
    return {
        name: '', description: '', category: 'Basic Meals',
        pricingType: 'simple', simplePrice: '',
        options: [{ label: '', price: '' }, { label: '', price: '' }],
        addOns: [], tags: [],
        globallyAvailable: true,
        branchAvailability: Object.fromEntries(BRANCHES.map(b => [b, { available: true }])),
    };
}

function formToGlobalItem(form: ItemFormState, existing?: GlobalMenuItem): GlobalMenuItem {
    const id = existing?.id ?? `item-${Date.now()}`;
    const base: GlobalMenuItem = {
        id,
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category as MenuItem['category'],
        url: existing?.url ?? `/menu?item=${id}`,
        image: existing?.image,
        popular: form.tags.includes('popular') || undefined,
        isNew: form.tags.includes('new') || undefined,
        availableAddOns: form.addOns.length > 0 ? form.addOns : undefined,
        globallyAvailable: form.globallyAvailable,
        archived: existing?.archived ?? false,
        tags: form.tags,
        branchAvailability: form.branchAvailability,
        sortOrder: existing?.sortOrder ?? INITIAL_ITEMS.length,
    };

    if (form.pricingType === 'simple') {
        base.price = Number(form.simplePrice);
        base.image = form.image;
    } else {
        const validOptions = form.options.filter(o => o.label.trim() && o.price);
        base.sizes = validOptions.map(o => ({
            key: o.label.trim().toLowerCase().replace(/\s+/g, '-') as SizeKey,
            label: o.label.trim(),
            price: Number(o.price),
            image: o.image,
        }));
    }

    return base;
}

// ─── Tag badge ────────────────────────────────────────────────────────────────

const TAG_STYLES: Record<string, string> = {
    popular:    'bg-primary/10 text-primary',
    new:        'bg-info/10 text-info',
    spicy:      'bg-error/10 text-error',
    vegetarian: 'bg-secondary/10 text-secondary',
};

function TagBadge({ tag }: { tag: string }) {
    return (
        <span className={`text-[10px] font-medium font-body px-2 py-0.5 rounded-full capitalize ${TAG_STYLES[tag] ?? 'bg-neutral-light text-neutral-gray'}`}>
            {tag}
        </span>
    );
}

// ─── Confirm delete modal ─────────────────────────────────────────────────────

function ConfirmModal({ title, desc, onConfirm, onCancel }: { title: string; desc: string; onConfirm: () => void; onCancel: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <div className="bg-neutral-card rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
                <div className="h-1.5 bg-error" />
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <WarningCircleIcon size={18} weight="fill" className="text-error" />
                        <h3 className="text-text-dark text-base font-bold font-body">{title}</h3>
                    </div>
                    <p className="text-neutral-gray text-sm font-body mb-5">{desc}</p>
                    <div className="flex gap-3">
                        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2.5 bg-neutral-light text-text-dark rounded-xl text-sm font-medium font-body cursor-pointer">Cancel</button>
                        <button type="button" onClick={onConfirm} className="flex-1 px-4 py-2.5 bg-error text-white rounded-xl text-sm font-medium font-body cursor-pointer">Delete</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Image picker ─────────────────────────────────────────────────────────────

function ImagePicker({ value, onChange, size = 'md' }: { value?: string; onChange: (url: string) => void; size?: 'sm' | 'md' }) {
    const ref = useRef<HTMLInputElement>(null);
    const dim = size === 'sm' ? 'w-9 h-9 rounded-lg' : 'w-20 h-20 rounded-xl';
    return (
        <>
            <button type="button" onClick={() => ref.current?.click()}
                className={`${dim} border-2 border-dashed border-[#f0e8d8] hover:border-primary/40 flex items-center justify-center overflow-hidden shrink-0 transition-colors cursor-pointer bg-neutral-light`}>
                {value
                    ? <img src={value} alt="" className="w-full h-full object-cover" />
                    : <ImageIcon size={size === 'sm' ? 14 : 22} className="text-neutral-gray/40" />
                }
            </button>
            <input type="file" ref={ref} accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) onChange(URL.createObjectURL(f)); }} />
        </>
    );
}

// ─── Item edit modal ──────────────────────────────────────────────────────────

function ItemModal({
    item, optionTemplates, addOns, onClose, onSave,
}: {
    item: GlobalMenuItem | null;
    optionTemplates: OptionTemplate[];
    addOns: AddOn[];
    onClose: () => void;
    onSave: (item: GlobalMenuItem) => void;
}) {
    const isNew = !item;
    const [form, setForm] = useState<ItemFormState>(item ? itemToForm(item) : blankForm());
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showTemplatePicker, setShowTemplatePicker] = useState(false);

    const ALL_TAGS = ['popular', 'new', 'spicy', 'vegetarian'];

    function set<K extends keyof ItemFormState>(key: K, value: ItemFormState[K]) {
        setForm(prev => ({ ...prev, [key]: value }));
        setErrors(prev => { const e = { ...prev }; delete e[key]; return e; });
    }

    function validate(): boolean {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = 'Name is required';
        if (form.pricingType === 'simple') {
            if (!form.simplePrice || isNaN(Number(form.simplePrice)) || Number(form.simplePrice) <= 0)
                e.simplePrice = 'Enter a valid price';
        } else {
            const valid = form.options.filter(o => o.label.trim() && o.price && Number(o.price) > 0);
            if (valid.length < 1) e.options = 'Add at least one option with a name and price';
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    }

    function handleSubmit() {
        if (!validate()) return;
        onSave(formToGlobalItem(form, item ?? undefined));
    }

    function updateOption(i: number, field: keyof OptionRow, value: string) {
        set('options', form.options.map((o, idx) => idx === i ? { ...o, [field]: value } : o));
    }

    function addOption() {
        set('options', [...form.options, { label: '', price: '' }]);
    }

    function removeOption(i: number) {
        if (form.options.length <= 1) return;
        set('options', form.options.filter((_, idx) => idx !== i));
    }

    function toggleAddOn(id: string) {
        set('addOns', form.addOns.includes(id) ? form.addOns.filter(a => a !== id) : [...form.addOns, id]);
    }

    function toggleTag(tag: string) {
        set('tags', form.tags.includes(tag) ? form.tags.filter(t => t !== tag) : [...form.tags, tag]);
    }

    function loadTemplate(tpl: OptionTemplate) {
        set('pricingType', 'options');
        set('options', tpl.options.map(o => ({ label: o.label, price: o.price })));
        setShowTemplatePicker(false);
    }

    const inputCls = 'w-full px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40';

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/30 backdrop-blur-sm overflow-y-auto">
            <div className="bg-neutral-card rounded-2xl shadow-2xl w-full max-w-xl my-8">
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0e8d8]">
                    <h2 className="text-text-dark text-lg font-bold font-body">{isNew ? 'Add Menu Item' : `Edit — ${item?.name}`}</h2>
                    <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-light cursor-pointer">
                        <XIcon size={16} className="text-neutral-gray" />
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-5">

                    {/* ── Basic info ──────────────────────────────────────────── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1.5">Item Name</label>
                            <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                                placeholder="e.g. Jollof Rice with Chicken"
                                className={inputCls} />
                            {errors.name && <p className="text-error text-xs font-body mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1.5">Category</label>
                            <select value={form.category} onChange={e => set('category', e.target.value)}
                                className={`${inputCls} cursor-pointer`}>
                                {ALL_CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1.5">Description</label>
                            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
                                placeholder="Short description shown on the menu..."
                                className={`${inputCls} resize-none`} />
                        </div>
                    </div>

                    {/* ── Pricing ─────────────────────────────────────────────── */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider">Pricing</p>
                            {optionTemplates.length > 0 && (
                                <div className="relative">
                                    <button type="button"
                                        onClick={() => setShowTemplatePicker(p => !p)}
                                        className="flex items-center gap-1.5 text-xs font-medium font-body text-primary hover:text-primary-hover transition-colors cursor-pointer">
                                        Load template
                                        <CaretDownIcon size={11} weight="bold" className={`transition-transform ${showTemplatePicker ? 'rotate-180' : ''}`} />
                                    </button>
                                    {showTemplatePicker && (
                                        <div className="absolute right-0 top-full mt-1 z-10 bg-neutral-card border border-[#f0e8d8] rounded-2xl shadow-xl overflow-hidden min-w-48">
                                            {optionTemplates.map(tpl => (
                                                <button key={tpl.id} type="button"
                                                    onClick={() => loadTemplate(tpl)}
                                                    className="w-full text-left px-4 py-3 hover:bg-neutral-light transition-colors cursor-pointer border-b border-[#f0e8d8] last:border-b-0">
                                                    <p className="text-text-dark text-sm font-medium font-body">{tpl.name}</p>
                                                    <p className="text-neutral-gray text-xs font-body mt-0.5">{tpl.options.map(o => o.label).join(' · ')}</p>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2 mb-3">
                            {(['simple', 'options'] as PricingType[]).map(type => (
                                <button key={type} type="button"
                                    onClick={() => set('pricingType', type)}
                                    className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium font-body border transition-all cursor-pointer
                                        ${form.pricingType === type
                                            ? 'bg-primary/15 border-primary/50 text-primary'
                                            : 'border-[#f0e8d8] text-neutral-gray hover:text-text-dark'
                                        }`}>
                                    {type === 'simple' ? 'Single price' : 'Named options'}
                                </button>
                            ))}
                        </div>

                        {form.pricingType === 'simple' && (
                            <div className="flex items-start gap-3">
                                <div className="flex-1">
                                    <input type="number" min="0" step="1" value={form.simplePrice}
                                        onChange={e => set('simplePrice', e.target.value)}
                                        placeholder="Price in GHS" className={inputCls} />
                                    {errors.simplePrice && <p className="text-error text-xs font-body mt-1">{errors.simplePrice}</p>}
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <ImagePicker value={form.image} onChange={url => set('image', url)} size="md" />
                                    <span className="text-[10px] text-neutral-gray font-body">Photo</span>
                                </div>
                            </div>
                        )}

                        {form.pricingType === 'options' && (
                            <div>
                                <div className="grid grid-cols-[36px_1fr_100px_24px] gap-2 mb-1.5 px-0.5">
                                    <span className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider">Img</span>
                                    <span className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider">Option name</span>
                                    <span className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider">Price (GHS)</span>
                                    <span />
                                </div>
                                <div className="flex flex-col gap-2">
                                    {form.options.map((opt, i) => (
                                        <div key={i} className="grid grid-cols-[36px_1fr_100px_24px] gap-2 items-center">
                                            <ImagePicker value={opt.image} onChange={url => updateOption(i, 'image', url)} size="sm" />
                                            <input type="text" value={opt.label}
                                                onChange={e => updateOption(i, 'label', e.target.value)}
                                                placeholder="e.g. Small, Plain…"
                                                className={inputCls} />
                                            <input type="number" min="0" step="1" value={opt.price}
                                                onChange={e => updateOption(i, 'price', e.target.value)}
                                                placeholder="0"
                                                className={inputCls} />
                                            <button type="button" onClick={() => removeOption(i)}
                                                className={`flex items-center justify-center transition-colors ${form.options.length > 1 ? 'text-neutral-gray/40 hover:text-error cursor-pointer' : 'opacity-20 cursor-not-allowed'}`}>
                                                <XCircleIcon size={18} weight="fill" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={addOption}
                                    className="flex items-center gap-1.5 text-xs font-medium font-body text-primary hover:text-primary-hover transition-colors cursor-pointer w-fit mt-2">
                                    <PlusIcon size={13} weight="bold" />
                                    Add option
                                </button>
                                {errors.options && <p className="text-error text-xs font-body mt-1">{errors.options}</p>}
                            </div>
                        )}
                    </div>

                    {/* ── Add-ons ─────────────────────────────────────────────── */}
                    {addOns.length > 0 && (
                        <div>
                            <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Available Add-ons</p>
                            <div className="flex flex-col gap-2">
                                {addOns.map(addon => (
                                    <button key={addon.id} type="button" onClick={() => toggleAddOn(addon.id)}
                                        className="flex items-center gap-3 cursor-pointer w-fit">
                                        <div className={`w-4.5 h-4.5 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 ${form.addOns.includes(addon.id) ? 'bg-primary border-primary' : 'border-[#d0c8b8]'}`}>
                                            {form.addOns.includes(addon.id) && (
                                                <svg width="9" height="7" viewBox="0 0 10 8" fill="none">
                                                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )}
                                        </div>
                                        <span className="text-sm font-body text-text-dark">
                                            {addon.name}
                                            <span className="text-neutral-gray ml-1.5 text-xs">₵{addon.price}{addon.perPiece ? '/pc' : ''}</span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Tags ────────────────────────────────────────────────── */}
                    <div>
                        <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Tags</p>
                        <div className="flex gap-2 flex-wrap">
                            {ALL_TAGS.map(tag => (
                                <button key={tag} type="button" onClick={() => toggleTag(tag)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium font-body transition-all cursor-pointer capitalize flex items-center gap-1.5
                                        ${form.tags.includes(tag) ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-neutral-light text-neutral-gray hover:text-text-dark border border-transparent'}`}>
                                    {tag === 'popular' && <StarIcon size={11} weight="fill" />}
                                    {tag === 'new' && <SparkleIcon size={11} weight="fill" />}
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Global availability ─────────────────────────────────── */}
                    <div className="flex items-center justify-between p-3 bg-neutral-light rounded-xl">
                        <div>
                            <p className="text-text-dark text-sm font-semibold font-body">Global Availability</p>
                            <p className="text-neutral-gray text-xs font-body">Enable/disable across all branches instantly</p>
                        </div>
                        <button type="button" onClick={() => set('globallyAvailable', !form.globallyAvailable)}>
                            {form.globallyAvailable
                                ? <ToggleRightIcon size={28} weight="fill" className="text-primary cursor-pointer" />
                                : <ToggleLeftIcon size={28} weight="fill" className="text-neutral-gray/40 cursor-pointer" />
                            }
                        </button>
                    </div>

                    {/* ── Branch overrides ────────────────────────────────────── */}
                    <div>
                        <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Branch Overrides</p>
                        <div className="bg-neutral-light rounded-xl overflow-hidden">
                            {BRANCHES.map((branch, i) => (
                                <div key={branch} className={`flex items-center justify-between px-4 py-3 ${i < BRANCHES.length - 1 ? 'border-b border-[#f0e8d8]' : ''}`}>
                                    <div className="flex items-center gap-3">
                                        <button type="button" onClick={() => set('branchAvailability', {
                                            ...form.branchAvailability,
                                            [branch]: { ...form.branchAvailability[branch], available: !form.branchAvailability[branch].available }
                                        })} className="cursor-pointer">
                                            {form.branchAvailability[branch]?.available
                                                ? <CheckCircleIcon size={18} weight="fill" className="text-secondary" />
                                                : <XCircleIcon size={18} weight="fill" className="text-neutral-gray/40" />
                                            }
                                        </button>
                                        <span className="text-text-dark text-sm font-body">{branch}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-neutral-gray text-xs font-body">Price override</span>
                                        <input
                                            type="number"
                                            placeholder="—"
                                            value={form.branchAvailability[branch]?.priceOverride ?? ''}
                                            onChange={e => set('branchAvailability', {
                                                ...form.branchAvailability,
                                                [branch]: { ...form.branchAvailability[branch], priceOverride: e.target.value ? Number(e.target.value) : undefined }
                                            })}
                                            className="w-20 px-2 py-1.5 bg-neutral-card border border-[#f0e8d8] rounded-lg text-text-dark text-xs font-body focus:outline-none focus:border-primary/40"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 px-6 py-4 border-t border-[#f0e8d8]">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-neutral-light text-text-dark rounded-xl text-sm font-medium font-body cursor-pointer hover:bg-[#f0e8d8] transition-colors">Cancel</button>
                    <button type="button" onClick={handleSubmit} className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium font-body cursor-pointer hover:bg-primary-hover transition-colors">{isNew ? 'Add Item' : 'Save Changes'}</button>
                </div>
            </div>
        </div>
    );
}

// ─── Bulk import modal ────────────────────────────────────────────────────────

function BulkImportModal({ onClose }: { onClose: () => void }) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [step, setStep] = useState<'upload' | 'preview'>('upload');

    const PREVIEW_ROWS = [
        { name: 'Grilled Chicken Rice', category: 'Basic Meals', price: '75', status: 'valid' },
        { name: 'Coconut Rice', category: 'Basic Meals', price: '65', status: 'valid' },
        { name: 'Milo Drink', category: 'Drinks', price: '', status: 'error' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <div className="bg-neutral-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0e8d8]">
                    <h2 className="text-text-dark text-lg font-bold font-body">Bulk Import Menu Items</h2>
                    <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-light cursor-pointer">
                        <XIcon size={16} className="text-neutral-gray" />
                    </button>
                </div>
                <div className="p-6">
                    {step === 'upload' ? (
                        <>
                            <div
                                onClick={() => fileRef.current?.click()}
                                className="border-2 border-dashed border-[#f0e8d8] rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/40 transition-colors"
                            >
                                <UploadSimpleIcon size={32} weight="thin" className="text-neutral-gray" />
                                <p className="text-text-dark text-sm font-semibold font-body">Drop CSV here or click to upload</p>
                                <p className="text-neutral-gray text-xs font-body text-center">File must follow the CediBites import template</p>
                                <input type="file" ref={fileRef} accept=".csv" className="hidden" onChange={() => setStep('preview')} />
                            </div>
                            <button type="button" className="mt-4 w-full px-4 py-2.5 bg-neutral-light text-text-dark text-sm font-medium font-body rounded-xl hover:bg-[#f0e8d8] transition-colors cursor-pointer">
                                Download Template CSV
                            </button>
                        </>
                    ) : (
                        <>
                            <p className="text-neutral-gray text-sm font-body mb-4">3 rows parsed — 2 valid, 1 with errors.</p>
                            <div className="bg-neutral-light rounded-xl overflow-hidden mb-4">
                                {PREVIEW_ROWS.map((row, i) => (
                                    <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i < PREVIEW_ROWS.length - 1 ? 'border-b border-[#f0e8d8]' : ''}`}>
                                        {row.status === 'valid'
                                            ? <CheckCircleIcon size={16} weight="fill" className="text-secondary shrink-0" />
                                            : <XCircleIcon size={16} weight="fill" className="text-error shrink-0" />
                                        }
                                        <div className="flex-1 min-w-0">
                                            <p className="text-text-dark text-xs font-semibold font-body">{row.name}</p>
                                            <p className="text-neutral-gray text-[10px] font-body">{row.category} · {row.price ? `₵${row.price}` : <span className="text-error">Missing price</span>}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setStep('upload')} className="flex-1 px-4 py-2.5 bg-neutral-light text-text-dark rounded-xl text-sm font-medium font-body cursor-pointer">Back</button>
                                <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium font-body cursor-pointer">Import 2 valid items</button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminMenuPage() {
    const [items, setItems] = useState<GlobalMenuItem[]>(INITIAL_ITEMS);
    const [category, setCategory] = useState('All');
    const [search, setSearch] = useState('');
    const [showArchived, setShowArchived] = useState(false);
    const [editItem, setEditItem] = useState<GlobalMenuItem | null | 'new'>(null);
    const [deleteItem, setDeleteItem] = useState<GlobalMenuItem | null>(null);
    const [showImport, setShowImport] = useState(false);

    const { config } = useMenuConfig();
    const optionTemplates = config?.optionTemplates ?? DEFAULT_CONFIG.optionTemplates;
    const addOns = config?.addOns ?? DEFAULT_CONFIG.addOns;

    const active = useMemo(() => {
        let list = items.filter(i => !i.archived);
        if (category !== 'All') list = list.filter(i => i.category === category);
        if (search.trim()) list = list.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
        return list;
    }, [items, category, search]);

    const archived = useMemo(() => items.filter(i => i.archived), [items]);

    function saveItem(item: GlobalMenuItem) {
        setItems(prev => {
            const idx = prev.findIndex(x => x.id === item.id);
            if (idx >= 0) { const n = [...prev]; n[idx] = item; return n; }
            return [...prev, item];
        });
        setEditItem(null);
    }

    function archiveItem(item: GlobalMenuItem) {
        setItems(prev => prev.map(x => x.id === item.id ? { ...x, archived: true } : x));
    }

    function restoreItem(item: GlobalMenuItem) {
        setItems(prev => prev.map(x => x.id === item.id ? { ...x, archived: false } : x));
    }

    function deleteItemFn(item: GlobalMenuItem) {
        setItems(prev => prev.filter(x => x.id !== item.id));
        setDeleteItem(null);
    }

    function toggleGlobal(item: GlobalMenuItem) {
        setItems(prev => prev.map(x => x.id === item.id ? { ...x, globallyAvailable: !x.globallyAvailable } : x));
    }

    const branchCount = (item: GlobalMenuItem) => Object.values(item.branchAvailability).filter(b => b.available).length;

    return (
        <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-text-dark text-2xl font-bold font-body">Menu Management</h1>
                    <p className="text-neutral-gray text-sm font-body mt-0.5">Global master menu · {active.length} active items</p>
                </div>
                <div className="flex gap-2">
                    <button type="button" onClick={() => setShowImport(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-neutral-card border border-[#f0e8d8] text-text-dark rounded-xl text-sm font-medium font-body hover:border-primary/40 transition-colors cursor-pointer">
                        <UploadSimpleIcon size={15} weight="bold" className="text-primary" />
                        Bulk Import
                    </button>
                    <button type="button" onClick={() => setEditItem('new')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium font-body hover:bg-primary-hover transition-colors cursor-pointer">
                        <PlusIcon size={15} weight="bold" />
                        Add Item
                    </button>
                </div>
            </div>

            {/* Category tabs + search */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {ALL_CATEGORIES.map(cat => (
                        <button key={cat} type="button" onClick={() => setCategory(cat)}
                            className={`px-3 py-2 rounded-xl text-sm font-medium font-body whitespace-nowrap transition-all cursor-pointer ${category === cat ? 'bg-primary text-white' : 'bg-neutral-card border border-[#f0e8d8] text-neutral-gray hover:text-text-dark'}`}>
                            {cat}
                        </button>
                    ))}
                </div>
                <div className="relative flex-1 min-w-[200px]">
                    <MagnifyingGlassIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-gray" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…"
                        className="w-full pl-9 pr-3 py-2.5 bg-neutral-card border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40" />
                </div>
            </div>

            {/* Items list */}
            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden mb-6">
                <div className="hidden md:grid grid-cols-[40px_1fr_110px_160px_120px_80px_100px] gap-4 px-4 py-3 border-b border-[#f0e8d8] bg-[#faf6f0]">
                    {['', 'Item', 'Category', 'Price', 'Branches', 'Global', 'Actions'].map(h => (
                        <span key={h} className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-wider">{h}</span>
                    ))}
                </div>

                {active.length === 0 ? (
                    <div className="px-4 py-16 text-center">
                        <ForkKnifeIcon size={32} weight="thin" className="text-neutral-gray/40 mx-auto mb-3" />
                        <p className="text-neutral-gray text-sm font-body">No items match your filters.</p>
                    </div>
                ) : (
                    active.map((item, i) => (
                        <div key={item.id}
                            className={`px-4 py-3.5 flex flex-col md:grid md:grid-cols-[40px_1fr_110px_160px_120px_80px_100px] gap-2 md:gap-4 md:items-center ${i < active.length - 1 ? 'border-b border-[#f0e8d8]' : ''} hover:bg-neutral-light/50 transition-colors`}>

                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                                {item.image
                                    ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                    : item.sizes?.some(s => s.image)
                                        ? <img src={item.sizes.find(s => s.image)!.image} alt={item.name} className="w-full h-full object-cover" />
                                        : <ForkKnifeIcon size={14} weight="fill" className="text-primary" />
                                }
                            </div>

                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-text-dark text-sm font-semibold font-body truncate">{item.name}</p>
                                    {item.tags.map(t => <TagBadge key={t} tag={t} />)}
                                </div>
                                <p className="text-neutral-gray text-[10px] font-body mt-0.5 truncate">{item.description}</p>
                            </div>

                            <span className="text-neutral-gray text-xs font-body">{item.category}</span>

                            <PriceDisplay item={item} />

                            <span className="text-neutral-gray text-xs font-body">{branchCount(item)} of {BRANCHES.length} branches</span>

                            <button type="button" onClick={() => toggleGlobal(item)} className="cursor-pointer w-fit">
                                {item.globallyAvailable
                                    ? <ToggleRightIcon size={22} weight="fill" className="text-primary" />
                                    : <ToggleLeftIcon size={22} weight="fill" className="text-neutral-gray/40" />
                                }
                            </button>

                            <div className="flex items-center gap-1.5">
                                <button type="button" onClick={() => setEditItem(item)}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-neutral-light transition-colors cursor-pointer">
                                    <PencilSimpleIcon size={14} weight="bold" className="text-primary" />
                                </button>
                                <button type="button" onClick={() => archiveItem(item)}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-neutral-light transition-colors cursor-pointer">
                                    <ArchiveIcon size={14} weight="bold" className="text-neutral-gray" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Archived section */}
            {archived.length > 0 && (
                <div>
                    <button type="button" onClick={() => setShowArchived(!showArchived)}
                        className="flex items-center gap-2 text-neutral-gray text-sm font-medium font-body mb-3 hover:text-text-dark transition-colors cursor-pointer">
                        <CaretDownIcon size={14} weight="bold" className={`transition-transform ${showArchived ? 'rotate-0' : '-rotate-90'}`} />
                        Archived items ({archived.length})
                    </button>
                    {showArchived && (
                        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden opacity-70">
                            {archived.map((item, i) => (
                                <div key={item.id} className={`px-4 py-3 flex items-center justify-between gap-4 ${i < archived.length - 1 ? 'border-b border-[#f0e8d8]' : ''}`}>
                                    <span className="text-neutral-gray text-sm font-body line-through">{item.name}</span>
                                    <div className="flex items-center gap-2">
                                        <button type="button" onClick={() => restoreItem(item)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/10 text-secondary rounded-lg text-xs font-medium font-body cursor-pointer">
                                            <ArrowCounterClockwiseIcon size={12} weight="bold" />
                                            Restore
                                        </button>
                                        <button type="button" onClick={() => setDeleteItem(item)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-error/10 text-error rounded-lg text-xs font-medium font-body cursor-pointer">
                                            <TrashIcon size={12} weight="bold" />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Modals */}
            {editItem !== null && (
                <ItemModal
                    item={editItem === 'new' ? null : editItem as GlobalMenuItem}
                    optionTemplates={optionTemplates}
                    addOns={addOns}
                    onClose={() => setEditItem(null)}
                    onSave={saveItem}
                />
            )}
            {deleteItem && (
                <ConfirmModal
                    title="Delete item permanently?"
                    desc={`"${deleteItem.name}" will be permanently removed from the menu and cannot be recovered.`}
                    onConfirm={() => deleteItemFn(deleteItem)}
                    onCancel={() => setDeleteItem(null)}
                />
            )}
            {showImport && <BulkImportModal onClose={() => setShowImport(false)} />}
        </div>
    );
}
