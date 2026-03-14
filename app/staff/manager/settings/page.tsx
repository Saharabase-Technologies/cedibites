'use client';

import { useState, useEffect } from 'react';
import {
    GearSixIcon,
    TagIcon,
    ListBulletsIcon,
    PlusIcon,
    PencilSimpleIcon,
    TrashIcon,
    XIcon,
    CheckIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    WarningCircleIcon,
    FloppyDiskIcon,
    StorefrontIcon,
    ClockIcon,
    TruckIcon,
    CreditCardIcon,
    PlusCircleIcon,
} from '@phosphor-icons/react';
import { useMenuConfig } from '@/lib/hooks/useMenuConfig';
import type { MenuConfig, OptionTemplate, AddOn, DayKey, BranchSettings } from '@/lib/hooks/useMenuConfig';

// ─── Shared input class (light text on dark bg) ───────────────────────────────

const inputCls = 'w-full bg-neutral-light border border-brown-light/20 rounded-xl px-3 py-2.5 text-sm font-body text-text-dark placeholder:text-neutral-gray/50 focus:outline-none focus:border-primary transition-colors';

// ─── Reusable toggle ──────────────────────────────────────────────────────────

function Toggle({ checked, onChange, size = 'md' }: { checked: boolean; onChange: () => void; size?: 'sm' | 'md' }) {
    const track = size === 'sm' ? 'w-8 h-5'  : 'w-10 h-6';
    const thumb = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
    const shift = size === 'sm' ? 'translate-x-3' : 'translate-x-4';
    return (
        <button type="button" onClick={onChange}
            className={`${track} rounded-full flex items-center px-0.5 transition-colors duration-200 cursor-pointer shrink-0 ${checked ? 'bg-secondary' : 'bg-brown-light/30'}`}>
            <div className={`${thumb} rounded-full bg-white shadow transition-transform duration-200 ${checked ? shift : 'translate-x-0'}`} />
        </button>
    );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, color, title, sub }: { icon: React.ElementType; color: string; title: string; sub: string }) {
    return (
        <div className="flex items-center gap-3 mb-3">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                <Icon size={15} weight="fill" className="text-white" />
            </div>
            <div>
                <h2 className="text-text-dark text-base font-bold font-body">{title}</h2>
                <p className="text-neutral-gray text-xs font-body">{sub}</p>
            </div>
        </div>
    );
}

// ─── Inline edit field ────────────────────────────────────────────────────────

function InlineEdit({ value, placeholder, onSave, onCancel }: {
    value: string; placeholder?: string; onSave: (v: string) => void; onCancel: () => void;
}) {
    const [text, setText] = useState(value);
    return (
        <div className="flex items-center gap-2 flex-1">
            <input
                type="text" value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') onSave(text.trim()); if (e.key === 'Escape') onCancel(); }}
                placeholder={placeholder} autoFocus
                className="flex-1 bg-neutral-light border border-primary/40 rounded-lg px-3 py-1.5 text-sm font-body text-text-dark placeholder:text-neutral-gray/50 focus:outline-none focus:border-primary transition-colors"
            />
            <button type="button" onClick={() => { if (text.trim()) onSave(text.trim()); }}
                className="p-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 transition-colors cursor-pointer">
                <CheckIcon size={14} weight="bold" />
            </button>
            <button type="button" onClick={onCancel}
                className="p-1.5 rounded-lg text-neutral-gray hover:text-text-dark hover:bg-brown-light/10 transition-colors cursor-pointer">
                <XIcon size={14} weight="bold" />
            </button>
        </div>
    );
}

// ─── Template editor modal ────────────────────────────────────────────────────

interface OptionRow { label: string; price: string; }

function TemplateEditor({ template, onSave, onClose }: {
    template: OptionTemplate | null; onSave: (t: OptionTemplate) => void; onClose: () => void;
}) {
    const [name,    setName]    = useState(template?.name ?? '');
    const [options, setOptions] = useState<OptionRow[]>(
        template?.options.length
            ? template.options.map(o => ({ label: o.label, price: o.price }))
            : [{ label: '', price: '' }, { label: '', price: '' }]
    );
    const [errors, setErrors] = useState<Record<string, string>>({});

    function handleSave() {
        const e: Record<string, string> = {};
        if (!name.trim()) e.name = 'Required';
        if (options.filter(o => o.label.trim()).length < 2) e.options = 'Add at least two options';
        setErrors(e);
        if (Object.keys(e).length > 0) return;
        onSave({
            id: template?.id ?? `tpl-${Date.now()}`,
            name: name.trim(),
            options: options.filter(o => o.label.trim()).map(o => ({ label: o.label.trim(), price: o.price })),
        });
    }

    function updateOpt(i: number, field: keyof OptionRow, v: string) {
        setOptions(prev => prev.map((o, idx) => idx === i ? { ...o, [field]: v } : o));
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-brand-darker/60 backdrop-blur-sm">
            <div className="bg-neutral-card border border-brown-light/20 rounded-3xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-text-dark text-lg font-bold font-body mb-5">
                    {template ? 'Edit Template' : 'New Pricing Template'}
                </h2>
                <div className="flex flex-col gap-4">
                    <div>
                        <label className="block text-xs font-medium font-body text-neutral-gray mb-1.5">Template Name <span className="text-primary">*</span></label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)}
                            placeholder="e.g. Small / Large" className={inputCls} />
                        {errors.name && <p className="text-error text-xs font-body mt-1">{errors.name}</p>}
                    </div>
                    <div>
                        <div className="grid grid-cols-[1fr_90px_24px] gap-2 mb-2">
                            <span className="text-xs font-medium font-body text-neutral-gray">Label</span>
                            <span className="text-xs font-medium font-body text-neutral-gray">Default price</span>
                            <span />
                        </div>
                        <div className="flex flex-col gap-2">
                            {options.map((opt, i) => (
                                <div key={i} className="grid grid-cols-[1fr_90px_24px] gap-2 items-center">
                                    <input type="text" value={opt.label} onChange={e => updateOpt(i, 'label', e.target.value)} placeholder="e.g. Small" className={inputCls} />
                                    <input type="number" min="0" step="1" value={opt.price} onChange={e => updateOpt(i, 'price', e.target.value)} placeholder="optional" className={inputCls} />
                                    <button type="button" onClick={() => options.length > 1 && setOptions(p => p.filter((_, idx) => idx !== i))}
                                        className={`flex items-center justify-center transition-colors ${options.length > 1 ? 'text-neutral-gray/40 hover:text-error cursor-pointer' : 'opacity-20 cursor-not-allowed'}`}>
                                        <XIcon size={16} weight="bold" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={() => setOptions(p => [...p, { label: '', price: '' }])}
                            className="flex items-center gap-1.5 text-xs font-medium font-body text-primary hover:text-primary-hover transition-colors cursor-pointer w-fit mt-2">
                            <PlusIcon size={12} weight="bold" /> Add option
                        </button>
                        {errors.options && <p className="text-error text-xs font-body mt-1">{errors.options}</p>}
                    </div>
                    <p className="text-neutral-gray/70 text-xs font-body">Default prices are optional — you can always adjust them on individual items.</p>
                </div>
                <div className="flex gap-3 mt-6">
                    <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-brown-light/20 text-sm font-medium font-body text-neutral-gray hover:text-text-dark transition-colors cursor-pointer">Cancel</button>
                    <button type="button" onClick={handleSave} className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-hover text-brand-darker text-sm font-bold font-body transition-colors cursor-pointer">
                        {template ? 'Save' : 'Create'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Add-on editor modal ──────────────────────────────────────────────────────

function AddOnEditor({ addon, onSave, onClose }: {
    addon: AddOn | null; onSave: (a: AddOn) => void; onClose: () => void;
}) {
    const [name,     setName]     = useState(addon?.name     ?? '');
    const [price,    setPrice]    = useState(addon ? String(addon.price) : '');
    const [perPiece, setPerPiece] = useState(addon?.perPiece ?? false);
    const [errors,   setErrors]   = useState<Record<string, string>>({});

    function handleSave() {
        const e: Record<string, string> = {};
        if (!name.trim()) e.name = 'Required';
        if (!price || isNaN(Number(price)) || Number(price) <= 0) e.price = 'Enter a valid price';
        setErrors(e);
        if (Object.keys(e).length > 0) return;
        onSave({ id: addon?.id ?? `addon-${Date.now()}`, name: name.trim(), price: Number(price), perPiece });
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-brand-darker/60 backdrop-blur-sm">
            <div className="bg-neutral-card border border-brown-light/20 rounded-3xl p-6 w-full max-w-sm shadow-xl">
                <h2 className="text-text-dark text-lg font-bold font-body mb-5">
                    {addon ? 'Edit Add-on' : 'New Add-on'}
                </h2>
                <div className="flex flex-col gap-4">
                    <div>
                        <label className="block text-xs font-medium font-body text-neutral-gray mb-1.5">Name <span className="text-primary">*</span></label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Extra Sauce" className={inputCls} />
                        {errors.name && <p className="text-error text-xs font-body mt-1">{errors.name}</p>}
                    </div>
                    <div>
                        <label className="block text-xs font-medium font-body text-neutral-gray mb-1.5">Price (GHS) <span className="text-primary">*</span></label>
                        <input type="number" min="0" step="0.5" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" className={inputCls} />
                        {errors.price && <p className="text-error text-xs font-body mt-1">{errors.price}</p>}
                    </div>
                    <button type="button" onClick={() => setPerPiece(p => !p)} className="flex items-center gap-3 cursor-pointer w-fit">
                        <Toggle checked={perPiece} onChange={() => setPerPiece(p => !p)} size="sm" />
                        <span className="text-sm font-body text-text-dark">Price is per piece</span>
                    </button>
                </div>
                <div className="flex gap-3 mt-6">
                    <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-brown-light/20 text-sm font-medium font-body text-neutral-gray hover:text-text-dark transition-colors cursor-pointer">Cancel</button>
                    <button type="button" onClick={handleSave} className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-hover text-brand-darker text-sm font-bold font-body transition-colors cursor-pointer">
                        {addon ? 'Save' : 'Add'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Delete confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({ label, onConfirm, onClose }: { label: string; onConfirm: () => void; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-darker/60 backdrop-blur-sm">
            <div className="bg-neutral-card border border-brown-light/20 rounded-3xl p-6 w-full max-w-sm shadow-xl text-center">
                <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
                    <WarningCircleIcon size={28} weight="fill" className="text-error" />
                </div>
                <h2 className="text-text-dark text-base font-bold font-body">Remove &ldquo;{label}&rdquo;?</h2>
                <p className="text-neutral-gray text-sm font-body mt-1 mb-6">This cannot be undone.</p>
                <div className="flex gap-3">
                    <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-brown-light/20 text-sm font-medium font-body text-neutral-gray hover:text-text-dark transition-colors cursor-pointer">Cancel</button>
                    <button type="button" onClick={onConfirm} className="flex-1 py-3 rounded-xl bg-error hover:bg-error/80 text-white text-sm font-bold font-body transition-colors cursor-pointer">Remove</button>
                </div>
            </div>
        </div>
    );
}

// ─── Day labels ───────────────────────────────────────────────────────────────

const DAY_LABELS: Record<DayKey, string> = {
    mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
    fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};
const DAY_KEYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MenuSettingsPage() {
    const { config, save, ready } = useMenuConfig();

    // Local working copies
    const [branch,     setBranch]     = useState<BranchSettings>(config.branch);
    const [categories, setCategories] = useState<string[]>(config.categories);
    const [templates,  setTemplates]  = useState<OptionTemplate[]>(config.optionTemplates);
    const [addOns,     setAddOns]     = useState<AddOn[]>(config.addOns);
    const [dirty, setDirty] = useState(false);

    const [editingCatIdx,   setEditingCatIdx]   = useState<number | null>(null);
    const [addingCat,       setAddingCat]       = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<OptionTemplate | null | 'new'>(null);
    const [deletingCat,     setDeletingCat]     = useState<string | null>(null);
    const [deletingTpl,     setDeletingTpl]     = useState<OptionTemplate | null>(null);
    const [editingAddOn,    setEditingAddOn]    = useState<AddOn | null | 'new'>(null);
    const [deletingAddOn,   setDeletingAddOn]   = useState<AddOn | null>(null);

    useEffect(() => {
        if (ready) {
            setBranch(config.branch);
            setCategories(config.categories);
            setTemplates(config.optionTemplates);
            setAddOns(config.addOns);
        }
    }, [ready, config]);

    function mark() { setDirty(true); }

    // ── Branch settings ──────────────────────────────────────────────────────

    function setBranchField<K extends keyof BranchSettings>(key: K, value: BranchSettings[K]) {
        setBranch(prev => ({ ...prev, [key]: value }));
        mark();
    }

    function setOrderType(key: keyof BranchSettings['orderTypes'], val: boolean) {
        setBranch(prev => ({ ...prev, orderTypes: { ...prev.orderTypes, [key]: val } }));
        mark();
    }

    function setPaymentMethod(key: keyof BranchSettings['paymentMethods'], val: boolean) {
        setBranch(prev => ({ ...prev, paymentMethods: { ...prev.paymentMethods, [key]: val } }));
        mark();
    }

    function setDayHours(day: DayKey, field: keyof import('@/lib/hooks/useMenuConfig').DayHours, value: string | boolean) {
        setBranch(prev => ({
            ...prev,
            hours: { ...prev.hours, [day]: { ...prev.hours[day], [field]: value } },
        }));
        mark();
    }

    // ── Categories ───────────────────────────────────────────────────────────

    function saveCategory(idx: number, value: string) {
        if (!value) return;
        setCategories(prev => prev.map((c, i) => i === idx ? value : c));
        setEditingCatIdx(null); mark();
    }

    function addCategory(value: string) {
        if (!value || categories.includes(value)) return;
        setCategories(prev => [...prev, value]);
        setAddingCat(false); mark();
    }

    function deleteCategory(cat: string) {
        setCategories(prev => prev.filter(c => c !== cat));
        setDeletingCat(null); mark();
    }

    function moveCat(idx: number, dir: -1 | 1) {
        const next = idx + dir;
        if (next < 0 || next >= categories.length) return;
        const arr = [...categories];
        [arr[idx], arr[next]] = [arr[next], arr[idx]];
        setCategories(arr); mark();
    }

    // ── Templates ────────────────────────────────────────────────────────────

    function saveTemplate(t: OptionTemplate) {
        setTemplates(prev => {
            const exists = prev.some(x => x.id === t.id);
            return exists ? prev.map(x => x.id === t.id ? t : x) : [...prev, t];
        });
        setEditingTemplate(null); mark();
    }

    function deleteTemplate(id: string) {
        setTemplates(prev => prev.filter(t => t.id !== id));
        setDeletingTpl(null); mark();
    }

    function moveTemplate(idx: number, dir: -1 | 1) {
        const next = idx + dir;
        if (next < 0 || next >= templates.length) return;
        const arr = [...templates];
        [arr[idx], arr[next]] = [arr[next], arr[idx]];
        setTemplates(arr); mark();
    }

    // ── Add-ons ──────────────────────────────────────────────────────────────

    function saveAddOn(a: AddOn) {
        setAddOns(prev => {
            const exists = prev.some(x => x.id === a.id);
            return exists ? prev.map(x => x.id === a.id ? a : x) : [...prev, a];
        });
        setEditingAddOn(null); mark();
    }

    function deleteAddOn(id: string) {
        setAddOns(prev => prev.filter(a => a.id !== id));
        setDeletingAddOn(null); mark();
    }

    // ── Commit ───────────────────────────────────────────────────────────────

    function handleSave() {
        const updated: MenuConfig = { categories, optionTemplates: templates, addOns, branch };
        save(updated);
        setDirty(false);
    }

    if (!ready) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-neutral-gray text-sm font-body">Loading…</p>
            </div>
        );
    }

    return (
        <>
            <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto pb-24">

                {/* ── Header ──────────────────────────────────────────────────── */}
                <div className="flex items-start justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-text-dark text-xl font-bold font-body">Configurator</h1>
                        <p className="text-neutral-gray text-sm font-body mt-0.5 flex items-center gap-1.5">
                            <GearSixIcon size={13} weight="fill" />
                            Branch settings, menu defaults &amp; operational config
                        </p>
                    </div>
                    {dirty && (
                        <button type="button" onClick={handleSave}
                            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-brand-darker font-semibold font-body text-sm px-4 py-2.5 rounded-xl transition-colors cursor-pointer shrink-0">
                            <FloppyDiskIcon size={16} weight="bold" />
                            Save Changes
                        </button>
                    )}
                </div>

                {/* ═══════════════════════════════════════════════════════════════
                    SECTION 1 — BRANCH STATUS
                ════════════════════════════════════════════════════════════════ */}
                <section className="mb-10">
                    <SectionHeader icon={StorefrontIcon} color="bg-secondary" title="Branch Status" sub="Instantly open or close the branch for all order types" />

                    <div className={`rounded-2xl border p-5 flex items-center justify-between gap-4 transition-colors ${branch.isOpen ? 'bg-secondary/8 border-secondary/25' : 'bg-error/8 border-error/25'}`}>
                        <div>
                            <p className={`text-base font-bold font-body ${branch.isOpen ? 'text-secondary' : 'text-error'}`}>
                                {branch.isOpen ? 'Branch is Open' : 'Branch is Closed'}
                            </p>
                            <p className="text-neutral-gray text-xs font-body mt-0.5">
                                {branch.isOpen ? 'Customers can place orders right now' : 'All new orders are blocked until you re-open'}
                            </p>
                        </div>
                        <Toggle checked={branch.isOpen} onChange={() => setBranchField('isOpen', !branch.isOpen)} />
                    </div>
                </section>

                {/* ═══════════════════════════════════════════════════════════════
                    SECTION 2 — BRANCH HOURS
                ════════════════════════════════════════════════════════════════ */}
                <section className="mb-10">
                    <SectionHeader icon={ClockIcon} color="bg-info" title="Branch Hours" sub="Set opening and closing times for each day" />

                    <div className="bg-neutral-card border border-brown-light/15 rounded-2xl overflow-hidden">
                        {DAY_KEYS.map((day, i) => {
                            const h = branch.hours[day];
                            return (
                                <div key={day} className={`flex items-center gap-3 px-4 py-3 ${i < DAY_KEYS.length - 1 ? 'border-b border-brown-light/10' : ''}`}>
                                    <span className="w-24 shrink-0 text-sm font-medium font-body text-text-dark">{DAY_LABELS[day]}</span>

                                    {/* Closed toggle */}
                                    <button type="button" onClick={() => setDayHours(day, 'closed', !h.closed)}
                                        className="flex items-center gap-2 cursor-pointer shrink-0">
                                        <Toggle checked={!h.closed} onChange={() => setDayHours(day, 'closed', !h.closed)} size="sm" />
                                        <span className={`text-xs font-body font-medium w-12 ${h.closed ? 'text-neutral-gray/50' : 'text-secondary'}`}>
                                            {h.closed ? 'Closed' : 'Open'}
                                        </span>
                                    </button>

                                    {/* Time inputs */}
                                    {!h.closed ? (
                                        <div className="flex items-center gap-2 flex-1">
                                            <input type="time" value={h.open}  onChange={e => setDayHours(day, 'open',  e.target.value)}
                                                className="flex-1 bg-neutral-light border border-brown-light/15 rounded-lg px-2.5 py-1.5 text-sm font-body text-text-dark focus:outline-none focus:border-primary transition-colors" />
                                            <span className="text-neutral-gray text-xs font-body shrink-0">to</span>
                                            <input type="time" value={h.close} onChange={e => setDayHours(day, 'close', e.target.value)}
                                                className="flex-1 bg-neutral-light border border-brown-light/15 rounded-lg px-2.5 py-1.5 text-sm font-body text-text-dark focus:outline-none focus:border-primary transition-colors" />
                                        </div>
                                    ) : (
                                        <span className="text-neutral-gray/40 text-xs font-body flex-1">—</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* ═══════════════════════════════════════════════════════════════
                    SECTION 3 — ORDER TYPES + PAYMENT METHODS
                ════════════════════════════════════════════════════════════════ */}
                <section className="mb-10">
                    <SectionHeader icon={TruckIcon} color="bg-primary" title="Order Types &amp; Payments" sub="Control what customers can order and how they pay" />

                    <div className="grid sm:grid-cols-2 gap-3">
                        {/* Order types */}
                        <div className="bg-neutral-card border border-brown-light/15 rounded-2xl overflow-hidden">
                            <p className="text-text-dark text-xs font-bold font-body uppercase tracking-wider px-4 py-3 border-b border-brown-light/10">Order Types</p>
                            {([
                                { key: 'delivery', label: 'Delivery' },
                                { key: 'pickup',   label: 'Pickup'   },
                                { key: 'dineIn',   label: 'Dine-in'  },
                            ] as { key: keyof BranchSettings['orderTypes']; label: string }[]).map(({ key, label }, i, arr) => (
                                <div key={key} className={`flex items-center justify-between px-4 py-3.5 ${i < arr.length - 1 ? 'border-b border-brown-light/10' : ''}`}>
                                    <span className="text-sm font-body text-text-dark">{label}</span>
                                    <Toggle checked={branch.orderTypes[key]} onChange={() => setOrderType(key, !branch.orderTypes[key])} size="sm" />
                                </div>
                            ))}
                        </div>

                        {/* Payment methods */}
                        <div className="bg-neutral-card border border-brown-light/15 rounded-2xl overflow-hidden">
                            <p className="text-text-dark text-xs font-bold font-body uppercase tracking-wider px-4 py-3 border-b border-brown-light/10">Payment Methods</p>
                            {([
                                { key: 'momo',         label: 'Mobile Money (MoMo)' },
                                { key: 'cashDelivery', label: 'Cash on Delivery'    },
                                { key: 'cashPickup',   label: 'Cash on Pickup'      },
                            ] as { key: keyof BranchSettings['paymentMethods']; label: string }[]).map(({ key, label }, i, arr) => (
                                <div key={key} className={`flex items-center justify-between px-4 py-3.5 ${i < arr.length - 1 ? 'border-b border-brown-light/10' : ''}`}>
                                    <span className="text-sm font-body text-text-dark">{label}</span>
                                    <Toggle checked={branch.paymentMethods[key]} onChange={() => setPaymentMethod(key, !branch.paymentMethods[key])} size="sm" />
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ═══════════════════════════════════════════════════════════════
                    SECTION 4 — ADD-ONS
                ════════════════════════════════════════════════════════════════ */}
                <section className="mb-10">
                    <div className="flex items-center justify-between mb-3">
                        <SectionHeader icon={PlusCircleIcon} color="bg-warning" title="Add-ons" sub="Extras customers can add to any item" />
                        <button type="button" onClick={() => setEditingAddOn('new')}
                            className="flex items-center gap-1.5 text-sm font-medium font-body text-primary hover:text-primary-hover transition-colors cursor-pointer shrink-0 mb-3">
                            <PlusIcon size={14} weight="bold" /> Add
                        </button>
                    </div>

                    <div className="bg-neutral-card border border-brown-light/15 rounded-2xl overflow-hidden">
                        {addOns.length === 0 ? (
                            <p className="text-neutral-gray text-sm font-body px-4 py-6 text-center">No add-ons yet.</p>
                        ) : (
                            addOns.map((addon, i) => (
                                <div key={addon.id} className={`flex items-center gap-3 px-4 py-3.5 ${i < addOns.length - 1 ? 'border-b border-brown-light/10' : ''}`}>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-text-dark text-sm font-semibold font-body">{addon.name}</p>
                                        <p className="text-neutral-gray text-xs font-body">
                                            ₵{addon.price}{addon.perPiece ? ' / piece' : ''}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button type="button" onClick={() => setEditingAddOn(addon)}
                                            className="p-1.5 rounded-lg text-neutral-gray hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer">
                                            <PencilSimpleIcon size={15} weight="bold" />
                                        </button>
                                        <button type="button" onClick={() => setDeletingAddOn(addon)}
                                            className="p-1.5 rounded-lg text-neutral-gray hover:text-error hover:bg-error/10 transition-colors cursor-pointer">
                                            <TrashIcon size={15} weight="bold" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* ═══════════════════════════════════════════════════════════════
                    SECTION 5 — CATEGORIES
                ════════════════════════════════════════════════════════════════ */}
                <section className="mb-10">
                    <SectionHeader icon={TagIcon} color="bg-primary" title="Menu Categories" sub="How items are grouped on the customer menu" />

                    <div className="bg-neutral-card border border-brown-light/15 rounded-2xl overflow-hidden mb-3">
                        {categories.map((cat, i) => (
                            <div key={cat + i} className={`flex items-center gap-3 px-4 py-3.5 ${i < categories.length - 1 ? 'border-b border-brown-light/10' : ''}`}>
                                <div className="flex flex-col gap-0.5 shrink-0">
                                    <button type="button" onClick={() => moveCat(i, -1)} disabled={i === 0}
                                        className="p-0.5 text-neutral-gray/40 hover:text-neutral-gray disabled:opacity-20 transition-colors cursor-pointer disabled:cursor-not-allowed">
                                        <ArrowUpIcon size={12} weight="bold" />
                                    </button>
                                    <button type="button" onClick={() => moveCat(i, 1)} disabled={i === categories.length - 1}
                                        className="p-0.5 text-neutral-gray/40 hover:text-neutral-gray disabled:opacity-20 transition-colors cursor-pointer disabled:cursor-not-allowed">
                                        <ArrowDownIcon size={12} weight="bold" />
                                    </button>
                                </div>
                                {editingCatIdx === i ? (
                                    <InlineEdit value={cat} placeholder="Category name" onSave={v => saveCategory(i, v)} onCancel={() => setEditingCatIdx(null)} />
                                ) : (
                                    <span className="flex-1 text-text-dark text-sm font-medium font-body">{cat}</span>
                                )}
                                {editingCatIdx !== i && (
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button type="button" onClick={() => setEditingCatIdx(i)}
                                            className="p-1.5 rounded-lg text-neutral-gray hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer">
                                            <PencilSimpleIcon size={15} weight="bold" />
                                        </button>
                                        <button type="button" onClick={() => setDeletingCat(cat)}
                                            className="p-1.5 rounded-lg text-neutral-gray hover:text-error hover:bg-error/10 transition-colors cursor-pointer">
                                            <TrashIcon size={15} weight="bold" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {addingCat && (
                            <div className="flex items-center gap-3 px-4 py-3.5 border-t border-brown-light/10">
                                <div className="w-[22px] shrink-0" />
                                <InlineEdit value="" placeholder="New category name…" onSave={addCategory} onCancel={() => setAddingCat(false)} />
                            </div>
                        )}
                    </div>
                    {!addingCat && (
                        <button type="button" onClick={() => setAddingCat(true)}
                            className="flex items-center gap-2 text-sm font-medium font-body text-primary hover:text-primary-hover transition-colors cursor-pointer w-fit">
                            <PlusIcon size={15} weight="bold" /> Add category
                        </button>
                    )}
                </section>

                {/* ═══════════════════════════════════════════════════════════════
                    SECTION 6 — PRICING TEMPLATES
                ════════════════════════════════════════════════════════════════ */}
                <section className="mb-10">
                    <SectionHeader icon={ListBulletsIcon} color="bg-secondary" title="Pricing Templates" sub="Reusable option sets — load one when adding a menu item" />

                    <div className="flex flex-col gap-3 mb-3">
                        {templates.map((tpl, i) => (
                            <div key={tpl.id} className="bg-neutral-card border border-brown-light/15 rounded-2xl px-4 py-4 flex items-start gap-3">
                                <div className="flex flex-col gap-0.5 shrink-0 mt-0.5">
                                    <button type="button" onClick={() => moveTemplate(i, -1)} disabled={i === 0}
                                        className="p-0.5 text-neutral-gray/40 hover:text-neutral-gray disabled:opacity-20 transition-colors cursor-pointer disabled:cursor-not-allowed">
                                        <ArrowUpIcon size={12} weight="bold" />
                                    </button>
                                    <button type="button" onClick={() => moveTemplate(i, 1)} disabled={i === templates.length - 1}
                                        className="p-0.5 text-neutral-gray/40 hover:text-neutral-gray disabled:opacity-20 transition-colors cursor-pointer disabled:cursor-not-allowed">
                                        <ArrowDownIcon size={12} weight="bold" />
                                    </button>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-text-dark text-sm font-bold font-body mb-2">{tpl.name}</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {tpl.options.map((opt, j) => (
                                            <span key={j} className="flex items-center gap-1 bg-brown-light/10 border border-brown-light/15 rounded-full px-2.5 py-1 text-xs font-body text-text-dark">
                                                {opt.label}
                                                {opt.price && <span className="text-neutral-gray">· ₵{opt.price}</span>}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button type="button" onClick={() => setEditingTemplate(tpl)}
                                        className="p-1.5 rounded-lg text-neutral-gray hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer">
                                        <PencilSimpleIcon size={15} weight="bold" />
                                    </button>
                                    <button type="button" onClick={() => setDeletingTpl(tpl)}
                                        className="p-1.5 rounded-lg text-neutral-gray hover:text-error hover:bg-error/10 transition-colors cursor-pointer">
                                        <TrashIcon size={15} weight="bold" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button type="button" onClick={() => setEditingTemplate('new')}
                        className="flex items-center gap-2 text-sm font-medium font-body text-primary hover:text-primary-hover transition-colors cursor-pointer w-fit">
                        <PlusIcon size={15} weight="bold" /> Add template
                    </button>
                </section>

                {/* ── Sticky save bar ─────────────────────────────────────────── */}
                {dirty && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 bg-neutral-card border border-brown-light/20 shadow-2xl rounded-2xl px-5 py-3.5">
                        <p className="text-text-dark text-sm font-body">Unsaved changes</p>
                        <button type="button" onClick={handleSave}
                            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-brand-darker font-bold font-body text-sm px-4 py-2 rounded-xl transition-colors cursor-pointer">
                            <FloppyDiskIcon size={15} weight="bold" /> Save
                        </button>
                    </div>
                )}

            </div>

            {/* ── Modals ──────────────────────────────────────────────────────── */}
            {editingTemplate !== null && (
                <TemplateEditor template={editingTemplate === 'new' ? null : editingTemplate} onSave={saveTemplate} onClose={() => setEditingTemplate(null)} />
            )}
            {editingAddOn !== null && (
                <AddOnEditor addon={editingAddOn === 'new' ? null : editingAddOn} onSave={saveAddOn} onClose={() => setEditingAddOn(null)} />
            )}
            {deletingCat && (
                <DeleteConfirm label={deletingCat} onConfirm={() => deleteCategory(deletingCat)} onClose={() => setDeletingCat(null)} />
            )}
            {deletingTpl && (
                <DeleteConfirm label={deletingTpl.name} onConfirm={() => deleteTemplate(deletingTpl.id)} onClose={() => setDeletingTpl(null)} />
            )}
            {deletingAddOn && (
                <DeleteConfirm label={deletingAddOn.name} onConfirm={() => deleteAddOn(deletingAddOn.id)} onClose={() => setDeletingAddOn(null)} />
            )}
        </>
    );
}
