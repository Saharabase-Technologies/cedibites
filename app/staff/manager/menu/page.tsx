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
    DotsThreeVerticalIcon,
} from '@phosphor-icons/react';
import { useMenuItems } from '@/lib/api/hooks/useMenuItems';
import { useMenuCategories } from '@/lib/api/hooks/useMenuCategories';
import { menuService, type CreateMenuItemData } from '@/lib/api/services/menu.service';
import { menuTagService } from '@/lib/api/services/menuTag.service';
import { menuAddOnService } from '@/lib/api/services/menuAddOn.service';
import apiClient from '@/lib/api/client';
import type { DisplayMenuItem } from '@/lib/api/adapters/menu.adapter';
import type { MenuTag } from '@/types/api';
import { toast } from '@/lib/utils/toast';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ManagerMenuItem extends Omit<DisplayMenuItem, 'tags'> {
    tags: string[];
    sortOrder: number;
    imageFile?: File;
    optionImageFiles?: (File | undefined)[];
    rating?: number | null;
    rating_count?: number;
    available?: boolean;
}

type PricingType = 'simple' | 'options';
interface OptionRow { label: string; displayName: string; price: string; image?: string; imageFile?: File; }
interface OptionTemplate { id: string; name: string; options: Array<{ label: string; price: string }>; }
interface AddOn { id: string; name: string; price: string; perPiece?: boolean; }

interface ItemFormState {
    name: string;
    description: string;
    category: string;
    pricingType: PricingType;
    simplePrice: string;
    image?: string;
    imageFile?: File;
    options: OptionRow[];
    addOns: string[];
    tags: string[];
    available: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasPricingOptions(item: Omit<DisplayMenuItem, 'tags'>): boolean {
    if (!item.sizes?.length && !(item.hasVariants && item.variants)) return false;
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

function itemToForm(item: ManagerMenuItem): ItemFormState {
    const isMulti = hasPricingOptions(item);
    return {
        name: item.name,
        description: item.description,
        category: item.category,
        pricingType: isMulti ? 'options' : 'simple',
        simplePrice: !isMulti && item.price != null ? String(item.price) : '',
        image: item.image,
        options: isMulti ? getOptionRows(item) : [{ label: '', displayName: '', price: '' }, { label: '', displayName: '', price: '' }],
        addOns: item.availableAddOns ?? [],
        tags: item.tags,
        available: item.available !== false,
    };
}

function blankForm(categoryOptions: string[]): ItemFormState {
    const defaultCategory = categoryOptions.find(cat => cat !== 'All') || 'Basic Meals';
    return {
        name: '', description: '', category: defaultCategory,
        pricingType: 'simple', simplePrice: '',
        options: [{ label: '', displayName: '', price: '' }, { label: '', displayName: '', price: '' }],
        addOns: [], tags: [], available: true,
    };
}

function formToItem(form: ItemFormState, branchId: number, existing?: ManagerMenuItem): ManagerMenuItem {
    const id = existing?.id ?? `item-${Date.now()}`;
    const base: ManagerMenuItem = {
        id,
        numericId: existing?.numericId ?? (parseInt(id, 10) || 0),
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category as DisplayMenuItem['category'],
        url: existing?.url ?? `/menu?item=${id}`,
        image: form.image ?? existing?.image,
        availableAddOns: form.addOns.length > 0 ? form.addOns : undefined,
        branchId: branchId,
        tags: form.tags,
        sortOrder: existing?.sortOrder ?? 0,
        available: form.available,
    };

    let imageFile = form.imageFile;
    if (!imageFile && form.pricingType === 'options') {
        const optWithFile = form.options.find(o => o.imageFile);
        if (optWithFile?.imageFile) imageFile = optWithFile.imageFile;
    }
    base.imageFile = imageFile;

    if (form.pricingType === 'simple') {
        base.price = Number(form.simplePrice);
    } else {
        const validOptions = form.options.filter(o => o.label.trim() && o.price);
        base.sizes = validOptions.map((o, index) => ({
            id: index + 1,
            key: o.label.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, ''),
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

// ─── Action menu (3-dot) ────────────────────────────────────────────────────────

function ActionMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        function close(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    return (
        <div ref={menuRef} className="relative">
            <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-neutral-light transition-colors cursor-pointer">
                <DotsThreeVerticalIcon size={16} weight="bold" className="text-neutral-gray" />
            </button>
            {open ? (
                <div className="absolute right-0 top-full mt-1 z-20 bg-neutral-card border border-[#f0e8d8] rounded-xl shadow-lg overflow-hidden min-w-36">
                    <button type="button" onClick={() => { setOpen(false); onEdit(); }}
                        className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 hover:bg-neutral-light transition-colors cursor-pointer text-text-dark text-sm font-body">
                        <PencilSimpleIcon size={14} weight="bold" className="text-primary" />
                        Edit
                    </button>
                    <button type="button" onClick={() => { setOpen(false); onDelete(); }}
                        className="w-full text-left px-4 py-2.5 flex items-center gap-2.5 hover:bg-error/5 transition-colors cursor-pointer text-error text-sm font-body">
                        <TrashIcon size={14} weight="bold" />
                        Delete
                    </button>
                </div>
            ) : null}
        </div>
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
    item, optionTemplates, addOns, menuTags, categoryOptions, onClose, onSave, isSaving = false,
}: {
    item: ManagerMenuItem | null;
    optionTemplates: OptionTemplate[];
    addOns: AddOn[];
    menuTags: MenuTag[];
    categoryOptions: string[];
    onClose: () => void;
    onSave: (item: ManagerMenuItem) => void;
    isSaving?: boolean;
}) {
    const isNew = !item;
    const [form, setForm] = useState<ItemFormState>(item ? itemToForm(item) : blankForm(categoryOptions));
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
        onSave(formToItem(form, item?.branchId ?? 0, item ?? undefined));
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

    function addOption() { set('options', [...form.options, { label: '', displayName: '', price: '' }]); }
    function removeOption(i: number) { if (form.options.length <= 1) return; set('options', form.options.filter((_, idx) => idx !== i)); }
    function toggleAddOn(id: string) { set('addOns', form.addOns.includes(id) ? form.addOns.filter(a => a !== id) : [...form.addOns, id]); }
    function toggleTag(tag: string) { set('tags', form.tags.includes(tag) ? form.tags.filter(t => t !== tag) : [...form.tags, tag]); }

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
                                placeholder="e.g. Jollof Rice with Chicken" className={inputCls} />
                            {errors.name && <p className="text-error text-xs font-body mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1.5">Category</label>
                            <select value={form.category} onChange={e => set('category', e.target.value)} className={`${inputCls} cursor-pointer`}>
                                {categoryOptions.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1.5">Availability</label>
                            <button type="button" onClick={() => set('available', !form.available)} className="flex items-center gap-2 cursor-pointer">
                                {form.available
                                    ? <ToggleRightIcon size={28} weight="fill" className="text-secondary" />
                                    : <ToggleLeftIcon size={28} weight="fill" className="text-neutral-gray/40" />
                                }
                                <span className="text-sm font-body text-text-dark">{form.available ? 'Available' : 'Hidden'}</span>
                            </button>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1.5">Description</label>
                            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
                                placeholder="Short description shown on the menu..." className={`${inputCls} resize-none`} />
                        </div>
                    </div>

                    {/* ── Pricing ─────────────────────────────────────────────── */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider">Pricing</p>
                            {optionTemplates.length > 0 && (
                                <div className="relative">
                                    <button type="button" onClick={() => setShowTemplatePicker(p => !p)}
                                        className="flex items-center gap-1.5 text-xs font-medium font-body text-primary hover:text-primary-hover transition-colors cursor-pointer">
                                        Load template <CaretDownIcon size={11} weight="bold" className={`transition-transform ${showTemplatePicker ? 'rotate-180' : ''}`} />
                                    </button>
                                    {showTemplatePicker && (
                                        <div className="absolute right-0 top-full mt-1 z-10 bg-neutral-card border border-[#f0e8d8] rounded-2xl shadow-xl overflow-hidden min-w-48">
                                            {optionTemplates.map(tpl => (
                                                <button key={tpl.id} type="button" onClick={() => loadTemplate(tpl)}
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
                                <button key={type} type="button" onClick={() => set('pricingType', type)}
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
                                                placeholder="e.g. Fried Rice" className={inputCls} />
                                            <input type="text" value={opt.displayName}
                                                onChange={e => updateOption(i, 'displayName', e.target.value)}
                                                placeholder="e.g. Assorted Fried Rice + 3 Drums" className={inputCls} />
                                            <input type="number" min="0" step="1" value={opt.price}
                                                onChange={e => updateOption(i, 'price', e.target.value)}
                                                placeholder="0" className={inputCls} />
                                            <button type="button" onClick={() => removeOption(i)}
                                                className={`flex items-center justify-center transition-colors ${form.options.length > 1 ? 'text-neutral-gray/40 hover:text-error cursor-pointer' : 'opacity-20 cursor-not-allowed'}`}>
                                                <XCircleIcon size={18} weight="fill" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={addOption}
                                    className="flex items-center gap-1.5 text-xs font-medium font-body text-primary hover:text-primary-hover transition-colors cursor-pointer w-fit mt-2">
                                    <PlusIcon size={13} weight="bold" /> Add option
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
        if (file) { setSelectedFile(file); handlePreview(file); }
    }

    function handlePreview(file: File) {
        setPreviewing(true);
        menuService.bulkImportPreview(file, branchId)
            .then(response => { setPreviewData(response.data); setStep('preview'); })
            .catch(error => { toast.error(`Preview failed: ${error.message || 'Unknown error'}`); })
            .finally(() => setPreviewing(false));
    }

    function handleImport() {
        if (!selectedFile) return;
        setImporting(true);
        menuService.bulkImport(selectedFile, branchId)
            .then(response => {
                const { imported, failed = 0, skipped = 0 } = response.data;
                toast.success(`Import completed! Imported: ${imported}, Failed: ${failed}, Skipped: ${skipped}`);
                onClose();
                router.refresh();
            })
            .catch(error => { toast.error(`Import failed: ${error.message || 'Unknown error'}`); })
            .finally(() => setImporting(false));
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
                        <div onClick={() => fileRef.current?.click()}
                            className="border-2 border-dashed border-[#f0e8d8] rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/40 transition-colors">
                            <UploadSimpleIcon size={32} weight="thin" className="text-neutral-gray" />
                            <p className="text-text-dark text-sm font-semibold font-body">{previewing ? 'Processing...' : 'Drop CSV/Excel here or click to upload'}</p>
                            <p className="text-neutral-gray text-xs font-body text-center">Supports CSV, XLS, and XLSX files (max 5MB)</p>
                            <input type="file" ref={fileRef} accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileSelect} disabled={previewing} />
                        </div>
                    ) : (
                        <>
                            <p className="text-neutral-gray text-sm font-body mb-4">{previewData?.total_rows} rows parsed — {previewData?.valid_rows} valid, {previewData?.invalid_rows} with errors.</p>
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
                                                {row.errors?.length > 0 && <span className="text-error ml-2">({row.errors.join(', ')})</span>}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setStep('upload')} className="flex-1 px-4 py-2.5 bg-neutral-light text-text-dark rounded-xl text-sm font-medium font-body cursor-pointer">Back</button>
                                <button type="button" onClick={handleImport} disabled={importing || !previewData?.can_import}
                                    className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium font-body cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
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
    { href: '/staff/manager/menu',           label: 'Items'     },
    { href: '/staff/manager/menu/tags',      label: 'Tags'      },
];

function MenuSubTabs() {
    const pathname = usePathname();
    const isActive = (href: string) => {
        if (href === '/staff/manager/menu') return pathname === '/staff/manager/menu';
        return pathname === href || pathname.startsWith(href + '/');
    };
    return (
        <div className="flex gap-6 border-b border-[#f0e8d8] mb-5">
            {MENU_SUB_TABS.map(tab => (
                <Link key={tab.href} href={tab.href}
                    className={`pb-2.5 text-sm font-medium font-body transition-colors border-b-2 -mb-px ${
                        isActive(tab.href) ? 'text-primary border-primary' : 'text-neutral-gray border-transparent hover:text-text-dark'
                    }`}>
                    {tab.label}
                </Link>
            ))}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ManagerMenuPage() {
    const { staffUser } = useStaffAuth();
    const branchId = staffUser?.branches[0]?.id ? Number(staffUser.branches[0].id) : undefined;
    const branchName = staffUser?.branches[0]?.name ?? 'Branch';

    const { items: menuItems, isLoading: menuLoading, refetch: refetchMenuItems } = useMenuItems(
        branchId ? { branch_id: branchId } : undefined
    );
    const { data: menuCategories = [], isLoading: categoriesLoading } = useMenuCategories({ is_active: true, branch_id: branchId });
    const [items, setItems] = useState<ManagerMenuItem[]>([]);
    const hasInitialized = useRef(false);

    const categoryMap = useMemo(() => {
        const map = new Map<string, number>();
        menuCategories.forEach(cat => { if (!map.has(cat.name)) map.set(cat.name, cat.id); });
        return map;
    }, [menuCategories]);

    const categoryOptions = useMemo(() => {
        const uniqueCategories = Array.from(new Set(menuCategories.map(cat => cat.name)));
        return ['All', ...uniqueCategories];
    }, [menuCategories]);

    useEffect(() => { hasInitialized.current = false; }, [branchId]);

    useEffect(() => {
        if (!hasInitialized.current && menuItems.length > 0) {
            hasInitialized.current = true;
            setItems(menuItems.map((item, i) => ({
                ...item,
                branchId: item.branchId ?? 0,
                tags: item.tags?.map(t => t.slug) ?? [],
                sortOrder: i,
            })));
        }
    }, [menuItems]);

    const [category, setCategory] = useState('All');
    const [search, setSearch] = useState('');
    const [editItem, setEditItem] = useState<ManagerMenuItem | null | 'new'>(null);
    const [deleteItem, setDeleteItem] = useState<ManagerMenuItem | null>(null);
    const [showImport, setShowImport] = useState(false);
    const [savingItem, setSavingItem] = useState(false);
    const [menuTags, setMenuTags] = useState<MenuTag[]>([]);
    const [addOns, setAddOns] = useState<AddOn[]>([]);

    const optionTemplates: OptionTemplate[] = [];
    useEffect(() => { menuTagService.list().then(setMenuTags).catch(() => {}); }, []);

    useEffect(() => {
        if (!branchId) { setAddOns([]); return; }
        menuAddOnService
            .list(branchId)
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
            .catch(() => setAddOns([]));
    }, [branchId]);

    const active = useMemo(() => {
        let list = items;
        if (category !== 'All') list = list.filter(i => i.category === category);
        if (search.trim()) list = list.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
        return list;
    }, [items, category, search]);

    function saveItem(item: ManagerMenuItem) {
        if (!branchId) { toast.error('No branch found.'); return; }

        const slug = item.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
        const categoryId = categoryMap.get(item.category) || undefined;
        const selectedTagIds = item.tags
            .map(slug => menuTags.find(tag => tag.slug === slug)?.id)
            .filter((id): id is number => typeof id === 'number');
        const isSinglePrice = item.price != null && !item.sizes?.length;

        const apiData: CreateMenuItemData = {
            branch_id: branchId,
            category_id: categoryId,
            name: item.name,
            slug,
            description: item.description || undefined,
            is_available: item.available !== false,
            tag_ids: selectedTagIds,
            add_on_ids: (item.availableAddOns ?? []).map(x => Number(x)).filter(Number.isFinite),
            ...(isSinglePrice ? { pricing_type: 'simple', price: item.price } : {}),
        };

        const isNew = !item.numericId || item.id.startsWith('item-');
        setSavingItem(true);
        const savePromise = isNew ? menuService.createItem(apiData) : menuService.updateItem(item.numericId, apiData);

        savePromise
            .then(response => {
                const savedId = response.data.id;
                const desiredOptions = item.sizes?.length
                    ? item.sizes
                    : (isSinglePrice ? [] : [{ id: 0, key: 'standard', label: 'Standard', price: item.price ?? 0 }]);

                const uploadSimpleImage = async () => {
                    if (!isSinglePrice || !item.imageFile) return;
                    const existingResponse = await apiClient.get(`/admin/menu-items/${savedId}/options`);
                    const existing = ((existingResponse as unknown as { data?: Array<{ id: number; option_key: string }> }).data ?? []) as Array<{ id: number; option_key: string }>;
                    const standardOpt = existing.find(o => o.option_key === 'standard');
                    if (standardOpt) {
                        await menuService.uploadOptionImage(savedId, standardOpt.id, item.imageFile);
                    }
                };

                const syncOptions = async () => {
                    if (!desiredOptions.length || isSinglePrice) return;

                    const existingResponse = await apiClient.get(`/admin/menu-items/${savedId}/options`);
                    const existing = ((existingResponse as unknown as { data?: Array<{ id: number; option_key: string }> }).data ?? []) as Array<{ id: number; option_key: string }>;
                    const existingByKey = Object.fromEntries(existing.map(o => [o.option_key, o]));
                    const desiredKeys = new Set(desiredOptions.map(o => o.key));

                    // Upsert desired options FIRST - must happen before deletes so the item always has >=1 option.
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
                            if (created.data?.id) upsertedOptions.push({ id: created.data.id });
                        }
                    }

                    // Delete options that are no longer desired (safe now - new options exist)
                    for (const existingOpt of existing) {
                        if (!desiredKeys.has(existingOpt.option_key)) await apiClient.delete(`/admin/menu-items/${savedId}/options/${existingOpt.id}`);
                    }

                    for (let i = 0; i < upsertedOptions.length; i += 1) {
                        const imageFile = item.optionImageFiles?.[i];
                        if (imageFile) await menuService.uploadOptionImage(savedId, upsertedOptions[i].id, imageFile);
                    }
                };

                const afterSave = () => {
                    setItems(prev => {
                        if (isNew) {
                            const idx = prev.findIndex(x => x.id === item.id);
                            if (idx >= 0) { const n = [...prev]; n[idx] = { ...item, numericId: savedId }; return n; }
                            return [...prev, { ...item, numericId: savedId }];
                        }
                        return prev.map(x => x.id === item.id ? item : x);
                    });
                    refetchMenuItems();
                    toast.success(`Menu item ${isNew ? 'created' : 'updated'} successfully!`);
                    setEditItem(null);
                    setSavingItem(false);
                };

                uploadSimpleImage().then(syncOptions).then(afterSave).catch(() => {
                    toast.error('Item saved but image/option sync failed. Please re-open and retry.');
                    afterSave();
                });
            })
            .catch(error => {
                setSavingItem(false);
                if (error.errors) {
                    const errorMessages = Object.entries(error.errors as Record<string, string[]>)
                        .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
                        .join(', ');
                    toast.error(`Validation errors: ${errorMessages}`);
                } else {
                    toast.error(`Failed to ${isNew ? 'create' : 'update'} menu item: ${error.message || 'Unknown error'}`);
                }
            });
    }

    function deleteItemFn(item: ManagerMenuItem) {
        if (!item.numericId || item.id.startsWith('item-')) {
            setItems(prev => prev.filter(x => x.id !== item.id));
            setDeleteItem(null);
            toast.success('Menu item deleted successfully!');
            return;
        }
        menuService.deleteItem(item.numericId)
            .then(() => {
                setItems(prev => prev.filter(x => x.id !== item.id));
                refetchMenuItems();
                setDeleteItem(null);
                toast.success('Menu item deleted successfully!');
            })
            .catch(error => { toast.error(`Failed to delete: ${error.message || 'Unknown error'}`); });
    }

    async function toggleAvailability(item: ManagerMenuItem) {
        if (!item.numericId) return;
        try {
            const newAvail = item.available === false;
            await menuService.updateItem(item.numericId, { is_available: newAvail });
            setItems(prev => prev.map(x => x.id === item.id ? { ...x, available: newAvail } : x));
            refetchMenuItems();
        } catch {
            toast.error('Failed to update availability.');
        }
    }

    return (
        <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                    <h1 className="text-text-dark text-2xl font-bold font-body">Menu Management</h1>
                    <p className="text-neutral-gray text-sm font-body mt-0.5">{branchName} · {active.length} item{active.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex gap-2">
                    <button type="button" onClick={() => setShowImport(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-neutral-card border border-[#f0e8d8] text-text-dark rounded-xl text-sm font-medium font-body hover:border-primary/40 transition-colors cursor-pointer">
                        <UploadSimpleIcon size={15} weight="bold" className="text-primary" /> Bulk Import
                    </button>
                    <button type="button" onClick={() => setEditItem('new')} disabled={categoriesLoading}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium font-body hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                        <PlusIcon size={15} weight="bold" /> {categoriesLoading ? 'Loading...' : 'Add Item'}
                    </button>
                </div>
            </div>

            <MenuSubTabs />

            {/* Category tabs + search */}
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
                <div className="relative flex-1 min-w-50">
                    <MagnifyingGlassIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-gray" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…"
                        className="w-full pl-9 pr-3 py-2.5 bg-neutral-card border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40" />
                </div>
            </div>

            {/* Items table */}
            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden mb-6">
                <div className="hidden md:grid grid-cols-[40px_1fr_110px_160px_80px_40px] gap-4 px-4 py-3 border-b border-[#f0e8d8] bg-[#faf6f0]">
                    {['', 'Item', 'Category', 'Price', 'Status', ''].map(h => (
                        <span key={h} className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-wider">{h}</span>
                    ))}
                </div>

                {menuLoading && items.length === 0 ? (
                    <div className="px-4 py-16 text-center"><p className="text-neutral-gray text-sm font-body">Loading menu…</p></div>
                ) : active.length === 0 ? (
                    <div className="px-4 py-16 text-center">
                        <ForkKnifeIcon size={32} weight="thin" className="text-neutral-gray/40 mx-auto mb-3" />
                        <p className="text-neutral-gray text-sm font-body">No items match your filters.</p>
                    </div>
                ) : (
                    active.map((item, i) => (
                        <div key={item.id}
                            className={`px-4 py-3.5 flex flex-col md:grid md:grid-cols-[40px_1fr_110px_160px_80px_40px] gap-2 md:gap-4 md:items-center ${i < active.length - 1 ? 'border-b border-[#f0e8d8]' : ''} hover:bg-neutral-light/50 transition-colors`}>

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

                            <button type="button" onClick={() => toggleAvailability(item)} className="cursor-pointer w-fit">
                                {item.available !== false
                                    ? <CheckCircleIcon size={18} weight="fill" className="text-secondary" />
                                    : <XCircleIcon size={18} weight="fill" className="text-neutral-gray/40" />
                                }
                            </button>

                            <ActionMenu onEdit={() => setEditItem(item)} onDelete={() => setDeleteItem(item)} />
                        </div>
                    ))
                )}
            </div>

            {/* Modals */}
            {editItem !== null && !categoriesLoading && (
                <ItemModal
                    item={editItem === 'new' ? null : editItem as ManagerMenuItem}
                    optionTemplates={optionTemplates}
                    addOns={addOns}
                    menuTags={menuTags}
                    categoryOptions={categoryOptions}
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
            {showImport && branchId && <BulkImportModal onClose={() => setShowImport(false)} branchId={branchId} />}
        </div>
    );
}
