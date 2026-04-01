'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    PlusIcon,
    PencilSimpleIcon,
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
import { useMenuItems } from '@/lib/api/hooks/useMenuItems';
import { useMenuCategories } from '@/lib/api/hooks/useMenuCategories';
import { useBranch } from '@/app/components/providers/BranchProvider';
import { menuService, CreateMenuItemData } from '@/lib/api/services/menu.service';
import { menuTagService } from '@/lib/api/services/menuTag.service';
import { menuAddOnService } from '@/lib/api/services/menuAddOn.service';
import apiClient from '@/lib/api/client';
import type { DisplayMenuItem } from '@/lib/api/adapters/menu.adapter';
import type { MenuTag } from '@/types/api';
import { toast } from '@/lib/utils/toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GlobalMenuItem extends Omit<DisplayMenuItem, 'tags'> {
    globallyAvailable: boolean;
    tags: string[];
    branchAvailability: Record<string, { available: boolean; optionPrices: Record<string, string> }>;
    sortOrder: number;
    imageFile?: File;
    optionImageFiles?: (File | undefined)[];
    rating?: number | null;
    rating_count?: number;
}

type PricingType = 'simple' | 'options';
interface OptionRow { label: string; displayName: string; price: string; image?: string; imageFile?: File; }
interface OptionTemplate { id: string; name: string; options: Array<{ label: string; price: string }>; }
interface AddOn { id: string; name: string; price: string; perPiece?: boolean; }

interface ItemFormState {
    name: string;
    description: string;
    category: string;
    branchId: number;
    pricingType: PricingType;
    simplePrice: string;
    image?: string;
    imageFile?: File;
    options: OptionRow[];
    addOns: string[];
    tags: string[];
    globallyAvailable: boolean;
    branchAvailability: Record<string, { available: boolean; optionPrices: Record<string, string> }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasPricingOptions(item: Omit<DisplayMenuItem, 'tags'>): boolean {
    if (!item.sizes?.length && !(item.hasVariants && item.variants)) return false;
    // A single 'standard' option is the backend representation of simple/single pricing
    if (item.sizes?.length === 1 && item.sizes[0].key === 'standard') return false;
    return true;
}

function getOptionRows(item: Omit<DisplayMenuItem, 'tags'>): OptionRow[] {
    if (item.hasVariants && item.variants) {
        const rows: OptionRow[] = [];
        if (item.variants.plain != null) rows.push({ label: 'Plain', displayName: '', price: String(item.variants.plain) });
        if (item.variants.assorted != null) rows.push({ label: 'Assorted', displayName: '', price: String(item.variants.assorted) });
        return rows;
    }
    if (item.sizes?.length) {
        return item.sizes.map(s => ({ label: s.label, displayName: s.displayName ?? '', price: String(s.price), image: s.image }));
    }
    return [{ label: '', displayName: '', price: '' }, { label: '', displayName: '', price: '' }];
}

function PriceDisplay({ item }: { item: Omit<DisplayMenuItem, 'tags'> }) {
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
        branchId: item.branchId ?? 0,
        pricingType: isMulti ? 'options' : 'simple',
        simplePrice: !isMulti && item.price != null ? String(item.price) : '',
        image: item.image,
        options: isMulti ? getOptionRows(item) : [{ label: '', displayName: '', price: '' }, { label: '', displayName: '', price: '' }],
        addOns: item.availableAddOns ?? [],
        tags: item.tags,
        globallyAvailable: item.globallyAvailable,
        branchAvailability: item.branchAvailability,
    };
}

function blankForm(categoryOptions: string[], defaultBranchId: number): ItemFormState {
    const defaultCategory = categoryOptions.find(cat => cat !== 'All') || 'Basic Meals';
    return {
        name: '', description: '', category: defaultCategory,
        branchId: defaultBranchId,
        pricingType: 'simple', simplePrice: '',
        options: [{ label: '', displayName: '', price: '' }, { label: '', displayName: '', price: '' }],
        addOns: [], tags: [],
        globallyAvailable: true,
        branchAvailability: {},
    };
}

function formToGlobalItem(form: ItemFormState, existing?: GlobalMenuItem): GlobalMenuItem {
    const id = existing?.id ?? `item-${Date.now()}`;
    const base: GlobalMenuItem = {
        id,
        numericId: existing?.numericId ?? (parseInt(id, 10) || 0),
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category as DisplayMenuItem['category'],
        url: existing?.url ?? `/menu?item=${id}`,
        image: form.image ?? existing?.image,
        availableAddOns: form.addOns.length > 0 ? form.addOns : undefined,
        branchId: form.branchId,
        globallyAvailable: form.globallyAvailable,
        tags: form.tags,
        branchAvailability: form.branchAvailability,
        sortOrder: existing?.sortOrder ?? 0,
    };

    let imageFile = form.imageFile;
    if (!imageFile && form.pricingType === 'options') {
        const optWithFile = form.options.find(o => o.imageFile);
        if (optWithFile?.imageFile) {
            imageFile = optWithFile.imageFile;
        }
    }
    base.imageFile = imageFile;

    if (form.pricingType === 'simple') {
        base.price = Number(form.simplePrice);
    } else {
        const validOptions = form.options.filter(o => o.label.trim() && o.price);
        base.sizes = validOptions.map((o, index) => ({
            id: index + 1,
            key: o.label.trim().toLowerCase().replace(/\s+/g, '-'),
            label: o.label.trim(),
            displayName: o.displayName?.trim() || undefined,
            price: Number(o.price),
            image: o.image,
        }));
        base.optionImageFiles = validOptions.map(o => o.imageFile);
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

function ImagePicker({ value, onChange, size = 'md' }: { value?: string; onChange: (url: string, file: File) => void; size?: 'sm' | 'md' }) {
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
                onChange={e => { const f = e.target.files?.[0]; if (f) onChange(URL.createObjectURL(f), f); }} />
        </>
    );
}

// ─── Item edit modal ──────────────────────────────────────────────────────────

function ItemModal({
    item, optionTemplates, addOns, menuTags, categoryOptions, branches, onClose, onSave, isSaving = false,
}: {
    item: GlobalMenuItem | null;
    optionTemplates: OptionTemplate[];
    addOns: AddOn[];
    menuTags: MenuTag[];
    categoryOptions: string[];
    branches: import('@/app/components/providers/BranchProvider').Branch[];
    onClose: () => void;
    onSave: (item: GlobalMenuItem) => void;
    isSaving?: boolean;
}) {
    const isNew = !item;
    const defaultBranchId = Number(branches[0]?.id ?? 0);
    const [form, setForm] = useState<ItemFormState>(item ? itemToForm(item) : blankForm(categoryOptions, defaultBranchId));
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showTemplatePicker, setShowTemplatePicker] = useState(false);

    function set<K extends keyof ItemFormState>(key: K, value: ItemFormState[K]) {
        setForm(prev => ({ ...prev, [key]: value }));
        setErrors(prev => { const e = { ...prev }; delete e[key]; return e; });
    }

    function setListingPhoto(url: string, file: File) {
        setForm(prev => ({ ...prev, image: url, imageFile: file }));
        setErrors(prev => { const e = { ...prev }; delete e.image; return e; });
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

    function updateOptionImage(i: number, url: string, file: File) {
        setForm(prev => ({
            ...prev,
            options: prev.options.map((o, idx) => (idx === i ? { ...o, image: url, imageFile: file } : o)),
        }));
    }

    function addOption() {
        set('options', [...form.options, { label: '', displayName: '', price: '' }]);
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
        set('options', tpl.options.map(o => ({ label: o.label, displayName: '', price: o.price })));
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
                            <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1.5">Branch</label>
                            <select value={form.branchId} onChange={e => set('branchId', Number(e.target.value))}
                                className={`${inputCls} cursor-pointer`}>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1.5">Category</label>
                            <select value={form.category} onChange={e => set('category', e.target.value)}
                                className={`${inputCls} cursor-pointer`}>
                                {categoryOptions.filter((c: string) => c !== 'All').map((c: string) => <option key={c} value={c}>{c}</option>)}
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
                        <div className="flex gap-2 mb-1">
                            {(['simple', 'options'] as PricingType[]).map(type => (
                                <button key={type} type="button"
                                    onClick={() => set('pricingType', type)}
                                    className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium font-body border transition-all cursor-pointer
                                        ${form.pricingType === type
                                            ? 'bg-primary/15 border-primary/50 text-primary'
                                            : 'border-[#f0e8d8] text-neutral-gray hover:text-text-dark'
                                        }`}>
                                    {type === 'simple' ? 'Single price' : 'Combined (options)'}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-neutral-gray font-body mb-3">
                            {form.pricingType === 'simple'
                                ? 'One item, one price. Shows the menu item name on receipts.'
                                : 'Multiple variations with their own prices. Each option has a display name shown on receipts & orders.'}
                        </p>

                        {form.pricingType === 'simple' && (
                            <div className="flex items-start gap-3">
                                <div className="flex-1">
                                    <input type="number" min="0" step="1" value={form.simplePrice}
                                        onChange={e => set('simplePrice', e.target.value)}
                                        placeholder="Price in GHS" className={inputCls} />
                                    {errors.simplePrice && <p className="text-error text-xs font-body mt-1">{errors.simplePrice}</p>}
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <ImagePicker value={form.image} onChange={setListingPhoto} size="md" />
                                    <span className="text-[10px] text-neutral-gray font-body">Photo</span>
                                </div>
                            </div>
                        )}

                        {form.pricingType === 'options' && (
                            <div>
                                <div className="grid grid-cols-[36px_1fr_1fr_90px_24px] gap-2 mb-1.5 px-0.5">
                                    <span className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider">Img</span>
                                    <span className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider">Option (pill)</span>
                                    <span className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider">Receipt name</span>
                                    <span className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider">Price</span>
                                    <span />
                                </div>
                                <div className="flex flex-col gap-2">
                                    {form.options.map((opt, i) => (
                                        <div key={i} className="grid grid-cols-[36px_1fr_1fr_90px_24px] gap-2 items-center">
                                            <ImagePicker value={opt.image} onChange={(url, file) => updateOptionImage(i, url, file)} size="sm" />
                                            <input type="text" value={opt.label}
                                                onChange={e => updateOption(i, 'label', e.target.value)}
                                                placeholder="e.g. Fried Rice"
                                                className={inputCls} />
                                            <input type="text" value={opt.displayName}
                                                onChange={e => updateOption(i, 'displayName', e.target.value)}
                                                placeholder="e.g. Assorted Fried Rice + 3 Drums"
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
                            {menuTags.filter(t => t.is_active).map(tag => (
                                <button key={tag.slug} type="button" onClick={() => toggleTag(tag.slug)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium font-body transition-all cursor-pointer capitalize flex flex-col items-start gap-0.5
                                        ${form.tags.includes(tag.slug) ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-neutral-light text-neutral-gray hover:text-text-dark border border-transparent'}`}>
                                    <span className="flex items-center gap-1.5">
                                        {tag.slug === 'popular' && <StarIcon size={11} weight="fill" />}
                                        {tag.slug === 'new' && <SparkleIcon size={11} weight="fill" />}
                                        {tag.name}
                                    </span>
                                    {tag.rule_description && (
                                        <span className="text-[9px] font-normal opacity-60 leading-tight text-left">{tag.rule_description}</span>
                                    )}
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
                            {Object.keys(form.branchAvailability).length === 0 && (
                                <p className="px-4 py-3 text-neutral-gray text-xs font-body">Save the item first to configure per-branch overrides.</p>
                            )}
                            {Object.keys(form.branchAvailability).map((branch, i, arr) => {
                                const branchState = form.branchAvailability[branch];
                                const activeOptions = form.pricingType === 'options'
                                    ? form.options.filter(o => o.label.trim())
                                    : [];
                                return (
                                    <div key={`${branch}-${i}`} className={`${i < arr.length - 1 ? 'border-b border-[#f0e8d8]' : ''}`}>
                                        <div className="flex items-center gap-3 px-4 py-3">
                                            <button type="button" onClick={() => set('branchAvailability', {
                                                ...form.branchAvailability,
                                                [branch]: { ...branchState, available: !branchState.available }
                                            })} className="cursor-pointer">
                                                {branchState.available
                                                    ? <CheckCircleIcon size={18} weight="fill" className="text-secondary" />
                                                    : <XCircleIcon size={18} weight="fill" className="text-neutral-gray/40" />
                                                }
                                            </button>
                                            <span className="text-text-dark text-sm font-body">{branch}</span>
                                        </div>
                                        {activeOptions.length > 0 && (
                                            <div className="px-4 pb-3 flex flex-col gap-1.5 pl-10">
                                                {activeOptions.map(opt => {
                                                    const optKey = opt.label.trim().toLowerCase().replace(/\s+/g, '-');
                                                    return (
                                                        <div key={optKey} className="flex items-center justify-between">
                                                            <span className="text-neutral-gray text-xs font-body capitalize">{opt.label}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-neutral-gray text-[10px] font-body">base ₵{opt.price || '—'}</span>
                                                                <input
                                                                    type="number"
                                                                    placeholder="—"
                                                                    min="0"
                                                                    value={branchState.optionPrices?.[optKey] ?? ''}
                                                                    onChange={e => set('branchAvailability', {
                                                                        ...form.branchAvailability,
                                                                        [branch]: {
                                                                            ...branchState,
                                                                            optionPrices: {
                                                                                ...branchState.optionPrices,
                                                                                [optKey]: e.target.value,
                                                                            },
                                                                        },
                                                                    })}
                                                                    className="w-20 px-2 py-1.5 bg-neutral-card border border-[#f0e8d8] rounded-lg text-text-dark text-xs font-body focus:outline-none focus:border-primary/40"
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 px-6 py-4 border-t border-[#f0e8d8]">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-neutral-light text-text-dark rounded-xl text-sm font-medium font-body cursor-pointer hover:bg-[#f0e8d8] transition-colors">Cancel</button>
                    <button type="button" onClick={(e) => { e.preventDefault(); handleSubmit(); }} disabled={isSaving} className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium font-body cursor-pointer hover:bg-primary-hover disabled:opacity-60 transition-colors">{isSaving ? 'Saving...' : isNew ? 'Add Item' : 'Save Changes'}</button>
                </div>
            </div>
        </div>
    );
}

// ─── Bulk import modal ────────────────────────────────────────────────────────

function BulkImportModal({ onClose, branchId }: { onClose: () => void; branchId: number }) {
    const router = useRouter();
    const fileRef = useRef<HTMLInputElement>(null);
    const [step, setStep] = useState<'upload' | 'preview'>('upload');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [previewing, setPreviewing] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);

    function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            handlePreview(file);
        }
    }

    function handlePreview(file: File) {
        setPreviewing(true);
        menuService.bulkImportPreview(file, branchId)
            .then(response => {
                console.log('Preview successful:', response.data);
                setPreviewData(response.data);
                setStep('preview');
            })
            .catch(error => {
                console.error('Preview failed:', error);
                toast.error(`Preview failed: ${error.message || 'Unknown error occurred'}`);
            })
            .finally(() => {
                setPreviewing(false);
            });
    }

    function handleImport() {
        if (!selectedFile) return;
        
        setImporting(true);
        menuService.bulkImport(selectedFile, branchId)
            .then(response => {
                console.log('Bulk import successful:', response.data);
                const { imported, failed = 0, skipped = 0 } = response.data;
                toast.success(`Import completed! Imported: ${imported}, Failed: ${failed}, Skipped: ${skipped}`);
                onClose();
                // Refresh menu items
                router.refresh();
            })
            .catch(error => {
                console.error('Bulk import failed:', error);
                toast.error(`Import failed: ${error.message || 'Unknown error occurred'}`);
            })
            .finally(() => {
                setImporting(false);
            });
    }

    function downloadTemplate() {
        // Create CSV template with proper headers
        const csvContent = 'name,category,description,price,is_available,is_popular\n' +
                          'Jollof Rice with Chicken,Basic Meals,Delicious jollof rice served with grilled chicken,75,true,false\n' +
                          'Coconut Rice,Basic Meals,Aromatic coconut rice,65,true,false\n' +
                          'Fried Rice,Rice Dishes,Tasty fried rice with vegetables,70,true,true\n' +
                          'Milo Drink,Drinks,Hot chocolate milo drink,15,true,false\n' +
                          'Grilled Chicken,Grilled Items,Perfectly grilled chicken breast,85,true,true';
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'menu-items-template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast.success('Template CSV downloaded successfully!');
    }

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
                                <p className="text-text-dark text-sm font-semibold font-body">
                                    {previewing ? 'Processing...' : 'Drop CSV/Excel here or click to upload'}
                                </p>
                                <p className="text-neutral-gray text-xs font-body text-center">
                                    Supports CSV, XLS, and XLSX files (max 5MB)
                                </p>
                                <input 
                                    type="file" 
                                    ref={fileRef} 
                                    accept=".csv,.xlsx,.xls" 
                                    className="hidden" 
                                    onChange={handleFileSelect}
                                    disabled={previewing}
                                />
                            </div>
                            <button 
                                type="button" 
                                onClick={downloadTemplate} 
                                className="mt-4 w-full px-4 py-2.5 bg-neutral-light text-text-dark text-sm font-medium font-body rounded-xl hover:bg-[#f0e8d8] transition-colors cursor-pointer"
                            >
                                Download Template CSV
                            </button>
                        </>
                    ) : (
                        <>
                            <p className="text-neutral-gray text-sm font-body mb-4">
                                {previewData?.total_rows} rows parsed — {previewData?.valid_rows} valid, {previewData?.invalid_rows} with errors.
                            </p>
                            <div className="bg-neutral-light rounded-xl overflow-hidden mb-4 max-h-60 overflow-y-auto">
                                {previewData?.preview?.slice(0, 10).map((row: any, i: number) => (
                                    <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i < Math.min(previewData.preview.length, 10) - 1 ? 'border-b border-[#f0e8d8]' : ''}`}>
                                        {row.status === 'valid'
                                            ? <CheckCircleIcon size={16} weight="fill" className="text-secondary shrink-0" />
                                            : <XCircleIcon size={16} weight="fill" className="text-error shrink-0" />
                                        }
                                        <div className="flex-1 min-w-0">
                                            <p className="text-text-dark text-xs font-semibold font-body">{row.name}</p>
                                            <p className="text-neutral-gray text-[10px] font-body">
                                                {row.category} · {row.price ? `₵${row.price}` : <span className="text-error">No price</span>}
                                                {row.errors?.length > 0 && (
                                                    <span className="text-error ml-2">({row.errors.join(', ')})</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {previewData?.preview?.length > 10 && (
                                    <div className="px-4 py-2 text-center text-neutral-gray text-xs">
                                        ... and {previewData.preview.length - 10} more rows
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => setStep('upload')} 
                                    className="flex-1 px-4 py-2.5 bg-neutral-light text-text-dark rounded-xl text-sm font-medium font-body cursor-pointer"
                                >
                                    Back
                                </button>
                                <button 
                                    type="button" 
                                    onClick={handleImport} 
                                    disabled={importing || !previewData?.can_import}
                                    className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium font-body cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {importing ? 'Importing...' : `Import ${previewData?.valid_rows} valid items`}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Menu sub-tabs ────────────────────────────────────────────────────────────

const MENU_SUB_TABS = [
    { href: '/admin/menu',         label: 'Items'   },
    { href: '/admin/menu-add-ons', label: 'Add-ons' },
    { href: '/admin/menu-tags',    label: 'Tags'    },
];

function MenuSubTabs() {
    const pathname = usePathname();
    return (
        <div className="flex gap-6 border-b border-[#f0e8d8] mb-5">
            {MENU_SUB_TABS.map(tab => (
                <Link
                    key={tab.href}
                    href={tab.href}
                    className={`pb-2.5 text-sm font-medium font-body transition-colors border-b-2 -mb-px ${
                        pathname === tab.href
                            ? 'text-primary border-primary'
                            : 'text-neutral-gray border-transparent hover:text-text-dark'
                    }`}
                >
                    {tab.label}
                </Link>
            ))}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminMenuPage() {
    const { branches } = useBranch();
    const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);

    useEffect(() => {
        if (branches.length > 0 && selectedBranchId === null) {
            setSelectedBranchId(parseInt(branches[0].id));
        }
    }, [branches]);
    const { items: menuItems, isLoading: menuLoading, refetch: refetchMenuItems } = useMenuItems(
        selectedBranchId ? { branch_id: selectedBranchId } : undefined
    );
    const { data: menuCategories = [], isLoading: categoriesLoading } = useMenuCategories({ is_active: true });
    const [items, setItems] = useState<GlobalMenuItem[]>([]);
    const hasInitialized = useRef(false);

    // Create category name to ID mapping
    const categoryMap = useMemo(() => {
        const map = new Map<string, number>();
        menuCategories.forEach(cat => {
            // Use the first occurrence of each category name
            if (!map.has(cat.name)) {
                map.set(cat.name, cat.id);
            }
        });
        return map;
    }, [menuCategories]);

    // Get category options for the form
    const categoryOptions = useMemo(() => {
        // Deduplicate categories by name since we might have the same category across multiple branches
        const uniqueCategories = Array.from(new Set(menuCategories.map(cat => cat.name)));
        return ['All', ...uniqueCategories];
    }, [menuCategories]);

    // Reset initialization when branch filter changes so items reload
    useEffect(() => {
        hasInitialized.current = false;
    }, [selectedBranchId]);

    useEffect(() => {
        if (!hasInitialized.current && menuItems.length > 0) {
            hasInitialized.current = true;
            setItems(menuItems.map((item, i) => ({
                ...item,
                branchId: item.branchId ?? 0,
                globallyAvailable: true,
                tags: item.tags?.map(t => t.slug) ?? [],
                branchAvailability: {},
                sortOrder: i,
            })));
        }
    }, [menuItems]);
    const [category, setCategory] = useState('All');
    const [search, setSearch] = useState('');
    const [editItem, setEditItem] = useState<GlobalMenuItem | null | 'new'>(null);
    const [deleteItem, setDeleteItem] = useState<GlobalMenuItem | null>(null);
    const [showImport, setShowImport] = useState(false);
    const [savingItem, setSavingItem] = useState(false);
    const [menuTags, setMenuTags] = useState<MenuTag[]>([]);
    const [addOns, setAddOns] = useState<AddOn[]>([]);

    const optionTemplates: OptionTemplate[] = [];
    useEffect(() => {
        menuTagService.list().then(setMenuTags).catch(() => {});
    }, []);

    useEffect(() => {
        const selectedBranchId = Number(branches[0]?.id);
        if (!selectedBranchId) {
            setAddOns([]);
            return;
        }

        menuAddOnService
            .list(selectedBranchId)
            .then((response) => {
                setAddOns(
                    response
                        .filter((addOn) => addOn.is_active)
                        .map((addOn) => ({
                            id: String(addOn.id),
                            name: addOn.name,
                            price: String(addOn.price),
                            perPiece: addOn.is_per_piece,
                        })),
                );
            })
            .catch(() => {
                setAddOns([]);
            });
    }, [branches]);

    const active = useMemo(() => {
        let list = items;
        if (category !== 'All') list = list.filter(i => i.category === category);
        if (search.trim()) list = list.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
        return list;
    }, [items, category, search]);

    function saveItem(item: GlobalMenuItem) {
        // Validate we have a valid branch
        if (!branches.length) {
            toast.error('No branches available. Please ensure branches are loaded.');
            return;
        }

        const selectedBranchId = item.branchId || branches[0]?.id;
        if (!selectedBranchId) {
            toast.error('Invalid branch selected. Please try again.');
            return;
        }

        // Generate a unique slug by appending timestamp if needed
        const baseSlug = item.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const slug = baseSlug + '-' + Date.now();

        // Map category name to ID
        const categoryId = categoryMap.get(item.category) || undefined;

        // Convert GlobalMenuItem to API format
        const selectedTagIds = item.tags
            .map((slug) => menuTags.find(tag => tag.slug === slug)?.id)
            .filter((id): id is number => typeof id === 'number');

        const isSinglePrice = item.price != null && !item.sizes?.length;

        const apiData: CreateMenuItemData = {
            branch_id: Number(selectedBranchId),
            category_id: categoryId,
            name: item.name,
            slug: slug,
            description: item.description || undefined,
            is_available: item.globallyAvailable,
            tag_ids: selectedTagIds,
            add_on_ids: (item.availableAddOns ?? []).map(x => Number(x)).filter(Number.isFinite),
            ...(isSinglePrice ? { pricing_type: 'simple', price: item.price } : {}),
        };

        // Check if this is a new item or update
        const isNew = !item.numericId || item.id.startsWith('item-');

        setSavingItem(true);
        const savePromise = isNew
            ? menuService.createItem(apiData)
            : menuService.updateItem(item.numericId, apiData);

        savePromise
            .then(response => {
                const savedId = response.data.id;

                const desiredOptions = item.sizes?.length
                    ? item.sizes
                    : [{ id: 0, key: 'standard', label: 'Standard', price: item.price ?? 0, image: item.image }];

                const syncOptions = async () => {
                    if (!desiredOptions.length || isSinglePrice) {
                        return;
                    }

                    const existingResponse = await apiClient.get(`/admin/menu-items/${savedId}/options`);
                    const existing = ((existingResponse as unknown as { data?: Array<{ id: number; option_key: string }> }).data ?? []) as Array<{ id: number; option_key: string }>;
                    const existingByKey = Object.fromEntries(existing.map(o => [o.option_key, o]));
                    const desiredKeys = new Set(desiredOptions.map(o => o.key));

                    // Delete options that are no longer desired
                    for (const existingOpt of existing) {
                        if (!desiredKeys.has(existingOpt.option_key)) {
                            await apiClient.delete(`/admin/menu-items/${savedId}/options/${existingOpt.id}`);
                        }
                    }

                    // Upsert desired options (update if key exists, create if new)
                    const upsertedOptions: Array<{ id: number }> = [];
                    for (let i = 0; i < desiredOptions.length; i += 1) {
                        const opt = desiredOptions[i];
                        const existingOpt = existingByKey[opt.key];
                        if (existingOpt) {
                            await apiClient.patch(`/admin/menu-items/${savedId}/options/${existingOpt.id}`, {
                                option_label: opt.label,
                                display_name: opt.displayName || null,
                                price: opt.price,
                                display_order: i,
                                is_available: true,
                            });
                            upsertedOptions.push({ id: existingOpt.id });
                        } else {
                            const created = await apiClient.post(`/admin/menu-items/${savedId}/options`, {
                                option_key: opt.key,
                                option_label: opt.label,
                                display_name: opt.displayName || null,
                                price: opt.price,
                                display_order: i,
                                is_available: true,
                            }) as unknown as { data?: { id: number } };
                            if (created.data?.id) {
                                upsertedOptions.push({ id: created.data.id });
                            }
                        }
                    }

                    // Upload per-option images
                    for (let i = 0; i < upsertedOptions.length; i += 1) {
                        const imageFile = item.optionImageFiles?.[i];
                        if (imageFile) {
                            await menuService.uploadOptionImage(savedId, upsertedOptions[i].id, imageFile);
                        }
                    }
                };

                const syncBranchOverrides = async () => {
                    if (!desiredOptions.length) {
                        return;
                    }

                    const branchesPayload: Record<string, { options: Array<{ option_key: string; price: number | null; is_available: boolean }> }> = {};

                    Object.entries(item.branchAvailability).forEach(([branchName, override]) => {
                        const branchId = branches.find(branch => branch.name === branchName)?.id;
                        if (!branchId) {
                            return;
                        }

                        branchesPayload[String(branchId)] = {
                            options: desiredOptions.map((option) => {
                                const overridePrice = override.optionPrices?.[option.key];
                                return {
                                    option_key: option.key,
                                    price: overridePrice ? Number(overridePrice) : null,
                                    is_available: override.available,
                                };
                            }),
                        };
                    });

                    if (Object.keys(branchesPayload).length > 0) {
                        await apiClient.put(`/admin/menu-items/${savedId}/branch-options`, {
                            branches: branchesPayload,
                        });
                    }
                };

                const afterSave = () => {
                    // Update local state with the response from server
                    setItems(prev => {
                        if (isNew) {
                            const idx = prev.findIndex(x => x.id === item.id);
                            if (idx >= 0) {
                                const n = [...prev];
                                n[idx] = { ...item, numericId: savedId };
                                return n;
                            }
                            return [...prev, { ...item, numericId: savedId }];
                        } else {
                            return prev.map(x => x.id === item.id ? item : x);
                        }
                    });

                    refetchMenuItems();
                    toast.success(`Menu item ${isNew ? 'created' : 'updated'} successfully!`);
                    setEditItem(null);
                    setSavingItem(false);
                };

                syncOptions()
                    .then(syncBranchOverrides)
                    .then(afterSave)
                    .catch(() => {
                        toast.error('Item saved but option or branch override sync failed. Please re-open and retry.');
                        afterSave();
                    });
            })
            .catch(error => {
                setSavingItem(false);
                if (error.errors) {
                    // Show validation errors
                    const errorMessages = Object.entries(error.errors as Record<string, string[]>)
                        .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
                        .join(', ');
                    toast.error(`Validation errors: ${errorMessages}`);
                } else {
                    toast.error(`Failed to ${isNew ? 'create' : 'update'} menu item: ${error.message || 'Unknown error occurred'}`);
                }
            });
    }

    async function openItemEditor(item: GlobalMenuItem) {
        if (!item.numericId) {
            setEditItem(item);
            return;
        }

        try {
            const res = await apiClient.get(`/admin/menu-items/${item.numericId}/branch-overrides`) as { data?: Record<string, { available: boolean; options: Record<string, number | null> }> };
            const overrides = res.data ?? {};

            const updatedAvailability: Record<string, { available: boolean; optionPrices: Record<string, string> }> = {};
            for (const [branchIdStr, branchData] of Object.entries(overrides)) {
                const branch = branches.find(b => String(b.id) === branchIdStr);
                if (!branch) {
                    continue;
                }
                updatedAvailability[branch.name] = {
                    available: branchData.available,
                    optionPrices: Object.fromEntries(
                        Object.entries(branchData.options)
                            .filter(([, v]) => v !== null)
                            .map(([k, v]) => [k, String(v)])
                    ),
                };
            }

            setEditItem({ ...item, branchAvailability: updatedAvailability });
        } catch {
            setEditItem(item);
        }
    }

    function deleteItemFn(item: GlobalMenuItem) {
        if (!item.numericId || item.id.startsWith('item-')) {
            // Item only exists locally, just remove from state
            setItems(prev => prev.filter(x => x.id !== item.id));
            setDeleteItem(null);
            toast.success('Menu item deleted successfully!');
            return;
        }

        // Delete from server
        menuService.deleteItem(item.numericId)
            .then(() => {
                console.log('Item deleted successfully');
                setItems(prev => prev.filter(x => x.id !== item.id));
                refetchMenuItems(); // Refresh from server
                setDeleteItem(null);
                toast.success('Menu item deleted successfully!');
            })
            .catch(error => {
                console.error('Failed to delete item:', error);
                toast.error(`Failed to delete menu item: ${error.message || 'Unknown error occurred'}`);
            });
    }

    function toggleGlobal(item: GlobalMenuItem) {
        setItems(prev => prev.map(x => x.id === item.id ? { ...x, globallyAvailable: !x.globallyAvailable } : x));
    }

    return (
        <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                    <h1 className="text-text-dark text-2xl font-bold font-body">Menu Management</h1>
                    <p className="text-neutral-gray text-sm font-body mt-0.5">{active.length} item{active.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex gap-2">
                    <button type="button" onClick={() => setShowImport(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-neutral-card border border-[#f0e8d8] text-text-dark rounded-xl text-sm font-medium font-body hover:border-primary/40 transition-colors cursor-pointer">
                        <UploadSimpleIcon size={15} weight="bold" className="text-primary" />
                        Bulk Import
                    </button>
                    <button
                        type="button"
                        onClick={() => setEditItem('new')}
                        disabled={categoriesLoading}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium font-body hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <PlusIcon size={15} weight="bold" />
                        {categoriesLoading ? 'Loading...' : 'Add Item'}
                    </button>
                </div>
            </div>

            {/* Menu sub-tabs */}
            <MenuSubTabs />

            {/* Category tabs + branch select + search (all in one row) */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {categoriesLoading ? (
                        <div className="px-3 py-2 bg-neutral-light rounded-xl text-sm text-neutral-gray">Loading categories...</div>
                    ) : (
                        categoryOptions.map(cat => (
                            <button key={cat} type="button" onClick={() => setCategory(cat)}
                                className={`px-3 py-2 rounded-xl text-sm font-medium font-body whitespace-nowrap transition-all cursor-pointer ${category === cat ? 'bg-primary text-white' : 'bg-neutral-card border border-[#f0e8d8] text-neutral-gray hover:text-text-dark'}`}>
                                {cat}
                            </button>
                        ))
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <select
                        value={selectedBranchId ?? ''}
                        onChange={e => setSelectedBranchId(parseInt(e.target.value))}
                        className="px-3 py-2.5 bg-neutral-card border border-[#f0e8d8] rounded-xl text-sm font-body text-neutral-gray focus:outline-none focus:border-primary/40 cursor-pointer"
                    >
                        {branches.map(branch => (
                            <option key={branch.id} value={branch.id}>{branch.name}</option>
                        ))}
                    </select>
                </div>
                <div className="relative flex-1 min-w-50">
                    <MagnifyingGlassIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-gray" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…"
                        className="w-full pl-9 pr-3 py-2.5 bg-neutral-card border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40" />
                </div>
            </div>

            {/* Items list */}
            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden mb-6">
                <div className="hidden md:grid grid-cols-[40px_1fr_110px_160px_120px_80px_100px] gap-4 px-4 py-3 border-b border-[#f0e8d8] bg-[#faf6f0]">
                    {['', 'Item', 'Category', 'Price', 'Branch', 'Global', 'Actions'].map(h => (
                        <span key={h} className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-wider">{h}</span>
                    ))}
                </div>

                {menuLoading && items.length === 0 ? (
                    <div className="px-4 py-16 text-center">
                        <p className="text-neutral-gray text-sm font-body">Loading menu…</p>
                    </div>
                ) : active.length === 0 ? (
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

                            {item.rating != null && (
                                <span className="text-neutral-gray text-xs font-body flex items-center gap-0.5">
                                    <StarIcon size={11} weight="fill" className="text-primary" />
                                    {item.rating.toFixed(1)}
                                    <span className="opacity-60">({item.rating_count ?? 0})</span>
                                </span>
                            )}

                            <span className="text-neutral-gray text-xs font-body">{branches.find(b => b.id === String(item.branchId))?.name ?? '—'}</span>

                            <button type="button" onClick={() => toggleGlobal(item)} className="cursor-pointer w-fit">
                                {item.globallyAvailable
                                    ? <ToggleRightIcon size={22} weight="fill" className="text-primary" />
                                    : <ToggleLeftIcon size={22} weight="fill" className="text-neutral-gray/40" />
                                }
                            </button>

                            <div className="flex items-center gap-1.5">
                                <button type="button" onClick={() => openItemEditor(item)}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-neutral-light transition-colors cursor-pointer">
                                    <PencilSimpleIcon size={14} weight="bold" className="text-primary" />
                                </button>
                                <button type="button" onClick={() => setDeleteItem(item)}
                                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-error/10 transition-colors cursor-pointer">
                                    <TrashIcon size={14} weight="bold" className="text-error" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modals */}
            {editItem !== null && !categoriesLoading && (
                <ItemModal
                    item={editItem === 'new' ? null : editItem as GlobalMenuItem}
                    optionTemplates={optionTemplates}
                    addOns={addOns}
                    menuTags={menuTags}
                    categoryOptions={categoryOptions}
                    branches={branches}
                    onClose={() => setEditItem(null)}
                    onSave={saveItem}
                    isSaving={savingItem}
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
            {showImport && <BulkImportModal onClose={() => setShowImport(false)} branchId={Number(branches[0]?.id) || 1} />}
        </div>
    );
}
