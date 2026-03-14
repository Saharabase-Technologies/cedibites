'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    TagIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    XIcon,
    CheckIcon,
    BuildingsIcon,
    PercentIcon,
    CurrencyCircleDollarIcon,
} from '@phosphor-icons/react';
import { getPromoService, type Promo } from '@/lib/services/promos/promo.service';
import { BRANCHES } from '@/app/components/providers/BranchProvider';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isPromoActive(promo: Promo): boolean {
    if (!promo.isActive) return false;
    const today = new Date().toISOString().slice(0, 10);
    return promo.startDate <= today && promo.endDate >= today;
}

function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
    const d = new Date(iso);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

const EMPTY_FORM: Omit<Promo, 'id'> = {
    name: '',
    type: 'percentage',
    value: 10,
    scope: 'global',
    branchIds: [],
    itemIds: [],
    startDate: todayIso(),
    endDate: addDays(todayIso(), 7),
    isActive: true,
    accountingCode: '',
};

// ─── Promo Form Modal ─────────────────────────────────────────────────────────

function PromoModal({
    initial,
    onSave,
    onClose,
}: {
    initial: Omit<Promo, 'id'> & { id?: string };
    onSave: (data: Omit<Promo, 'id'> & { id?: string }) => Promise<void>;
    onClose: () => void;
}) {
    const [form, setForm] = useState({ ...initial });
    const [saving, setSaving] = useState(false);
    const isEdit = !!initial.id;

    const patch = (p: Partial<typeof form>) => setForm(prev => ({ ...prev, ...p }));

    const handleSave = async () => {
        if (!form.name.trim() || form.value <= 0) return;
        setSaving(true);
        try {
            await onSave(form);
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-lg bg-neutral-card border border-[#f0e8d8] rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh]">
                <div className="px-6 py-5 border-b border-[#f0e8d8] flex items-center justify-between">
                    <h2 className="text-text-dark text-base font-bold font-body">{isEdit ? 'Edit Promo' : 'New Promo'}</h2>
                    <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg bg-neutral-light flex items-center justify-center text-neutral-gray hover:text-text-dark cursor-pointer">
                        <XIcon size={16} weight="bold" />
                    </button>
                </div>

                <div className="px-6 py-5 flex flex-col gap-4">

                    {/* Name */}
                    <div>
                        <label className="block text-neutral-gray text-xs font-body uppercase tracking-wider mb-1.5">Promo Name <span className="text-error">*</span></label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => patch({ name: e.target.value })}
                            placeholder="e.g. Jollof Friday 20% Off"
                            className="w-full border border-[#f0e8d8] rounded-xl px-3 py-2.5 text-text-dark text-sm font-body bg-neutral-light focus:outline-none focus:border-primary"
                        />
                    </div>

                    {/* Type + Value */}
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="block text-neutral-gray text-xs font-body uppercase tracking-wider mb-1.5">Type</label>
                            <div className="flex gap-2">
                                {(['percentage', 'fixed_amount'] as const).map(t => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => patch({ type: t })}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold font-body border transition-all cursor-pointer ${form.type === t ? 'bg-primary text-white border-primary' : 'bg-neutral-light text-neutral-gray border-[#f0e8d8]'}`}
                                    >
                                        {t === 'percentage' ? <PercentIcon size={12} weight="bold" /> : <CurrencyCircleDollarIcon size={12} weight="bold" />}
                                        {t === 'percentage' ? 'Percent' : 'Fixed GHS'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="w-28">
                            <label className="block text-neutral-gray text-xs font-body uppercase tracking-wider mb-1.5">Value</label>
                            <input
                                type="number"
                                min={1}
                                value={form.value}
                                onChange={e => patch({ value: Number(e.target.value) })}
                                className="w-full border border-[#f0e8d8] rounded-xl px-3 py-2.5 text-text-dark text-sm font-body bg-neutral-light focus:outline-none focus:border-primary"
                            />
                        </div>
                    </div>

                    {/* Scope */}
                    <div>
                        <label className="block text-neutral-gray text-xs font-body uppercase tracking-wider mb-1.5">Scope</label>
                        <div className="flex gap-2">
                            {(['global', 'branch'] as const).map(s => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => patch({ scope: s })}
                                    className={`flex-1 py-2 rounded-xl text-xs font-semibold font-body border transition-all cursor-pointer capitalize ${form.scope === s ? 'bg-primary text-white border-primary' : 'bg-neutral-light text-neutral-gray border-[#f0e8d8]'}`}
                                >
                                    {s === 'global' ? 'All Branches' : 'Specific Branches'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Branch selector */}
                    {form.scope === 'branch' && (
                        <div>
                            <label className="block text-neutral-gray text-xs font-body uppercase tracking-wider mb-1.5">Branches</label>
                            <div className="flex flex-wrap gap-2">
                                {BRANCHES.map(b => {
                                    const sel = form.branchIds?.includes(b.id);
                                    return (
                                        <button
                                            key={b.id}
                                            type="button"
                                            onClick={() => patch({ branchIds: sel ? form.branchIds?.filter(id => id !== b.id) : [...(form.branchIds ?? []), b.id] })}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold font-body border transition-all cursor-pointer ${sel ? 'bg-secondary/10 text-secondary border-secondary/30' : 'bg-neutral-light text-neutral-gray border-[#f0e8d8]'}`}
                                        >
                                            <BuildingsIcon size={10} weight={sel ? 'fill' : 'regular'} />
                                            {b.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Dates */}
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="block text-neutral-gray text-xs font-body uppercase tracking-wider mb-1.5">Start Date</label>
                            <input
                                type="date"
                                value={form.startDate}
                                onChange={e => patch({ startDate: e.target.value })}
                                className="w-full border border-[#f0e8d8] rounded-xl px-3 py-2.5 text-text-dark text-sm font-body bg-neutral-light focus:outline-none focus:border-primary"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-neutral-gray text-xs font-body uppercase tracking-wider mb-1.5">End Date</label>
                            <input
                                type="date"
                                value={form.endDate}
                                onChange={e => patch({ endDate: e.target.value })}
                                className="w-full border border-[#f0e8d8] rounded-xl px-3 py-2.5 text-text-dark text-sm font-body bg-neutral-light focus:outline-none focus:border-primary"
                            />
                        </div>
                    </div>

                    {/* Accounting code */}
                    <div>
                        <label className="block text-neutral-gray text-xs font-body uppercase tracking-wider mb-1.5">Accounting Code (optional)</label>
                        <input
                            type="text"
                            value={form.accountingCode ?? ''}
                            onChange={e => patch({ accountingCode: e.target.value })}
                            placeholder="e.g. PROMO-001"
                            className="w-full border border-[#f0e8d8] rounded-xl px-3 py-2.5 text-text-dark text-sm font-body bg-neutral-light focus:outline-none focus:border-primary"
                        />
                    </div>

                    {/* Active toggle */}
                    <div className="flex items-center justify-between py-2 border-t border-[#f0e8d8]">
                        <span className="text-text-dark text-sm font-medium font-body">Active</span>
                        <button
                            type="button"
                            onClick={() => patch({ isActive: !form.isActive })}
                            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${form.isActive ? 'bg-secondary' : 'bg-neutral-gray/30'}`}
                        >
                            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.isActive ? 'right-0.5' : 'left-0.5'}`} />
                        </button>
                    </div>

                </div>

                <div className="px-6 pb-6 flex gap-2">
                    <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-[#f0e8d8] text-neutral-gray text-sm font-body cursor-pointer hover:bg-neutral-light">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || !form.name.trim()}
                        className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-semibold font-body cursor-pointer hover:bg-primary-hover disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <CheckIcon size={14} weight="bold" />
                        {saving ? 'Saving...' : (isEdit ? 'Update Promo' : 'Create Promo')}
                    </button>
                </div>
            </div>
        </>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PromosPage() {
    const [promos, setPromos] = useState<Promo[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Promo | null>(null);

    const load = useCallback(async () => {
        const service = getPromoService();
        const all = await service.getAll();
        setPromos(all.sort((a, b) => a.name.localeCompare(b.name)));
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleSave = async (data: Omit<Promo, 'id'> & { id?: string }) => {
        const service = getPromoService();
        if (data.id) {
            await service.update(data.id, data);
        } else {
            await service.create(data);
        }
        await load();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this promo?')) return;
        await getPromoService().delete(id);
        await load();
    };

    const handleToggle = async (promo: Promo) => {
        await getPromoService().update(promo.id, { isActive: !promo.isActive });
        await load();
    };

    return (
        <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <TagIcon size={20} weight="fill" className="text-primary" />
                        <h1 className="text-text-dark text-2xl font-bold font-body">Promos & Discounts</h1>
                    </div>
                    <p className="text-neutral-gray text-sm font-body">{promos.length} promo{promos.length !== 1 ? 's' : ''} · {promos.filter(isPromoActive).length} active now</p>
                </div>
                <button
                    type="button"
                    onClick={() => { setEditing(null); setShowModal(true); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold font-body hover:bg-primary-hover transition-colors cursor-pointer"
                >
                    <PlusIcon size={16} weight="bold" />
                    New Promo
                </button>
            </div>

            {/* List */}
            {loading ? (
                <div className="py-16 text-center text-neutral-gray text-sm font-body">Loading promos...</div>
            ) : promos.length === 0 ? (
                <div className="py-16 text-center">
                    <TagIcon size={32} weight="thin" className="text-neutral-gray/30 mx-auto mb-3" />
                    <p className="text-text-dark text-sm font-medium font-body">No promos yet</p>
                    <p className="text-neutral-gray text-sm font-body mt-1">Create your first discount to get started.</p>
                </div>
            ) : (
                <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
                    {promos.map((promo, i) => {
                        const active = isPromoActive(promo);
                        return (
                            <div
                                key={promo.id}
                                className={`px-5 py-4 flex items-center gap-4 ${i < promos.length - 1 ? 'border-b border-[#f0e8d8]' : ''}`}
                            >
                                {/* Icon */}
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${active ? 'bg-primary/10' : 'bg-neutral-light'}`}>
                                    {promo.type === 'percentage'
                                        ? <PercentIcon size={18} weight="fill" className={active ? 'text-primary' : 'text-neutral-gray'} />
                                        : <CurrencyCircleDollarIcon size={18} weight="fill" className={active ? 'text-primary' : 'text-neutral-gray'} />
                                    }
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-text-dark text-sm font-semibold font-body">{promo.name}</p>
                                        <span className={`text-[10px] font-bold font-body px-2 py-0.5 rounded-full ${active ? 'bg-secondary/10 text-secondary' : 'bg-neutral-light text-neutral-gray'}`}>
                                            {active ? 'Active' : promo.isActive ? 'Scheduled' : 'Inactive'}
                                        </span>
                                    </div>
                                    <p className="text-neutral-gray text-xs font-body mt-0.5">
                                        {promo.type === 'percentage' ? `${promo.value}% off` : `GHS ${promo.value} off`}
                                        {' · '}
                                        {promo.scope === 'global' ? 'All branches' : `${promo.branchIds?.length ?? 0} branch(es)`}
                                        {' · '}
                                        {formatDate(promo.startDate)} – {formatDate(promo.endDate)}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => handleToggle(promo)}
                                        className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${promo.isActive ? 'bg-secondary' : 'bg-neutral-gray/30'}`}
                                    >
                                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${promo.isActive ? 'right-0.5' : 'left-0.5'}`} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setEditing(promo); setShowModal(true); }}
                                        className="w-8 h-8 rounded-lg bg-neutral-light flex items-center justify-center text-neutral-gray hover:text-primary cursor-pointer"
                                    >
                                        <PencilIcon size={14} weight="bold" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(promo.id)}
                                        className="w-8 h-8 rounded-lg bg-neutral-light flex items-center justify-center text-neutral-gray hover:text-error cursor-pointer"
                                    >
                                        <TrashIcon size={14} weight="bold" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <PromoModal
                    initial={editing ? { ...editing } : { ...EMPTY_FORM }}
                    onSave={handleSave}
                    onClose={() => { setShowModal(false); setEditing(null); }}
                />
            )}
        </div>
    );
}
