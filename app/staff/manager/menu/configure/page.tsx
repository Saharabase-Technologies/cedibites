'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    PlusIcon,
    PencilSimpleIcon,
    TrashIcon,
    CheckIcon,
    XIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    SpinnerGapIcon,
    WarningCircleIcon,
    ToggleLeftIcon,
    ToggleRightIcon,
} from '@phosphor-icons/react';
import {
    useMenuCategories,
    useCreateMenuCategory,
    useUpdateMenuCategory,
    useDeleteMenuCategory,
} from '@/lib/api/hooks/useMenuCategories';
import type { MenuCategory, CreateMenuCategoryData } from '@/lib/api/services/menuCategory.service';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';

// ─── Menu sub-tabs ───────────────────────────────────────────────────────────

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
                <Link
                    key={tab.href}
                    href={tab.href}
                    className={`pb-2.5 text-sm font-medium font-body transition-colors border-b-2 -mb-px ${
                        isActive(tab.href)
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ManagerMenuConfigurePage() {
    const { staffUser } = useStaffAuth();
    const branchId = staffUser?.branches?.[0]?.id ? Number(staffUser.branches[0].id) : null;

    const { data: categories = [], isLoading } = useMenuCategories(
        branchId ? { branch_id: branchId } : undefined
    );
    const createMutation = useCreateMenuCategory();
    const updateMutation = useUpdateMenuCategory();
    const deleteMutation = useDeleteMenuCategory();

    const sorted = [...categories].sort((a, b) => a.display_order - b.display_order);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [adding, setAdding] = useState(false);
    const [newName, setNewName] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<MenuCategory | null>(null);
    const [error, setError] = useState<string | null>(null);

    function startEdit(cat: MenuCategory) {
        setEditingId(cat.id);
        setEditName(cat.name);
        setError(null);
    }

    async function saveEdit() {
        if (!editingId || !editName.trim()) return;
        setError(null);
        try {
            await updateMutation.mutateAsync({
                id: editingId,
                data: { name: editName.trim(), slug: toSlug(editName.trim()) },
            });
            setEditingId(null);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to update category');
        }
    }

    async function handleCreate() {
        if (!newName.trim() || !branchId) return;
        setError(null);
        try {
            const data: CreateMenuCategoryData = {
                branch_id: branchId,
                name: newName.trim(),
                slug: toSlug(newName.trim()),
                display_order: sorted.length,
                is_active: true,
            };
            await createMutation.mutateAsync(data);
            setNewName('');
            setAdding(false);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to create category');
        }
    }

    async function handleDelete() {
        if (!deleteTarget) return;
        setError(null);
        try {
            await deleteMutation.mutateAsync(deleteTarget.id);
            setDeleteTarget(null);
        } catch {
            setError(`Cannot delete "${deleteTarget.name}" — it has menu items. Move or archive them first.`);
            setDeleteTarget(null);
        }
    }

    async function toggleActive(cat: MenuCategory) {
        await updateMutation.mutateAsync({
            id: cat.id,
            data: { is_active: !cat.is_active },
        });
    }

    async function moveCategory(cat: MenuCategory, dir: -1 | 1) {
        const idx = sorted.findIndex(c => c.id === cat.id);
        const swapIdx = idx + dir;
        if (swapIdx < 0 || swapIdx >= sorted.length) return;
        const other = sorted[swapIdx];
        await Promise.all([
            updateMutation.mutateAsync({ id: cat.id, data: { display_order: other.display_order } }),
            updateMutation.mutateAsync({ id: other.id, data: { display_order: cat.display_order } }),
        ]);
    }

    return (
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
            <div className="mb-4">
                <h1 className="text-text-dark text-xl font-bold font-body">Menu Management</h1>
                <p className="text-neutral-gray text-sm font-body mt-0.5">Manage menu categories for your branch</p>
            </div>

            <MenuSubTabs />

            {/* Header row */}
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-text-dark text-base font-bold font-body">Categories</h2>
                {!adding && (
                    <button
                        type="button"
                        onClick={() => { setAdding(true); setNewName(''); setError(null); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-brand-darker text-sm font-bold font-body hover:bg-primary-hover transition-colors cursor-pointer"
                    >
                        <PlusIcon size={14} weight="bold" /> Add Category
                    </button>
                )}
            </div>

            {/* Error banner */}
            {error && (
                <div className="flex items-center gap-2 bg-error/10 border border-error/20 rounded-xl px-4 py-3 mb-4">
                    <WarningCircleIcon size={16} weight="fill" className="text-error shrink-0" />
                    <p className="text-error text-sm font-body flex-1">{error}</p>
                    <button type="button" onClick={() => setError(null)} className="text-error/50 hover:text-error cursor-pointer">
                        <XIcon size={14} weight="bold" />
                    </button>
                </div>
            )}

            {isLoading ? (
                <div className="py-16 flex items-center justify-center gap-2 text-neutral-gray text-sm font-body">
                    <SpinnerGapIcon size={18} className="animate-spin" />
                    Loading categories...
                </div>
            ) : (
                <>
                    <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
                        {/* Table header */}
                        <div className="grid grid-cols-[40px_1fr_80px_80px_100px] gap-3 px-5 py-3 border-b border-[#f0e8d8] text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider">
                            <span>Order</span>
                            <span>Name</span>
                            <span className="text-center">Items</span>
                            <span className="text-center">Active</span>
                            <span className="text-right">Actions</span>
                        </div>

                        {sorted.length === 0 && (
                            <div className="px-5 py-10 text-center">
                                <p className="text-neutral-gray text-sm font-body">No categories yet</p>
                            </div>
                        )}

                        {sorted.map((cat, i) => (
                            <div
                                key={cat.id}
                                className={`grid grid-cols-[40px_1fr_80px_80px_100px] gap-3 px-5 py-3.5 items-center ${
                                    i < sorted.length - 1 ? 'border-b border-[#f0e8d8]' : ''
                                }`}
                            >
                                {/* Reorder */}
                                <div className="flex flex-col gap-0.5">
                                    <button type="button" onClick={() => moveCategory(cat, -1)} disabled={i === 0}
                                        className="p-0.5 text-neutral-gray/40 hover:text-neutral-gray disabled:opacity-20 transition-colors cursor-pointer disabled:cursor-not-allowed">
                                        <ArrowUpIcon size={12} weight="bold" />
                                    </button>
                                    <button type="button" onClick={() => moveCategory(cat, 1)} disabled={i === sorted.length - 1}
                                        className="p-0.5 text-neutral-gray/40 hover:text-neutral-gray disabled:opacity-20 transition-colors cursor-pointer disabled:cursor-not-allowed">
                                        <ArrowDownIcon size={12} weight="bold" />
                                    </button>
                                </div>

                                {/* Name */}
                                <div>
                                    {editingId === cat.id ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && saveEdit()}
                                                className="flex-1 bg-neutral-light border border-[#f0e8d8] rounded-lg px-2.5 py-1.5 text-sm font-body text-text-dark focus:outline-none focus:border-primary"
                                                autoFocus
                                            />
                                            <button type="button" onClick={saveEdit}
                                                className="p-1 text-secondary hover:bg-secondary/10 rounded-lg cursor-pointer">
                                                <CheckIcon size={14} weight="bold" />
                                            </button>
                                            <button type="button" onClick={() => setEditingId(null)}
                                                className="p-1 text-neutral-gray hover:bg-neutral-light rounded-lg cursor-pointer">
                                                <XIcon size={14} weight="bold" />
                                            </button>
                                        </div>
                                    ) : (
                                        <p className={`text-sm font-semibold font-body ${cat.is_active ? 'text-text-dark' : 'text-neutral-gray/50'}`}>
                                            {cat.name}
                                        </p>
                                    )}
                                </div>

                                {/* Items count */}
                                <p className="text-center text-sm font-body text-neutral-gray">
                                    {cat.items_count ?? 0}
                                </p>

                                {/* Active toggle */}
                                <div className="flex justify-center">
                                    <button type="button" onClick={() => toggleActive(cat)} className="cursor-pointer">
                                        {cat.is_active ? (
                                            <ToggleRightIcon size={24} weight="fill" className="text-secondary" />
                                        ) : (
                                            <ToggleLeftIcon size={24} weight="fill" className="text-neutral-gray/30" />
                                        )}
                                    </button>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-end gap-1">
                                    <button type="button" onClick={() => startEdit(cat)}
                                        className="p-1.5 rounded-lg text-neutral-gray hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer">
                                        <PencilSimpleIcon size={14} weight="bold" />
                                    </button>
                                    <button type="button" onClick={() => setDeleteTarget(cat)}
                                        disabled={(cat.items_count ?? 0) > 0}
                                        className="p-1.5 rounded-lg text-neutral-gray hover:text-error hover:bg-error/10 transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                                        title={(cat.items_count ?? 0) > 0 ? `Has ${cat.items_count} items — move them first` : 'Delete category'}>
                                        <TrashIcon size={14} weight="bold" />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Add row */}
                        {adding && (
                            <div className="grid grid-cols-[40px_1fr_80px_80px_100px] gap-3 px-5 py-3.5 items-center border-t border-[#f0e8d8] bg-primary/5">
                                <span />
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                        placeholder="Category name"
                                        className="flex-1 bg-neutral-card border border-[#f0e8d8] rounded-lg px-2.5 py-1.5 text-sm font-body text-text-dark placeholder:text-neutral-gray/50 focus:outline-none focus:border-primary"
                                        autoFocus
                                    />
                                    <button type="button" onClick={handleCreate} disabled={!newName.trim()}
                                        className="p-1 text-secondary hover:bg-secondary/10 rounded-lg cursor-pointer disabled:opacity-30">
                                        <CheckIcon size={14} weight="bold" />
                                    </button>
                                    <button type="button" onClick={() => setAdding(false)}
                                        className="p-1 text-neutral-gray hover:bg-neutral-light rounded-lg cursor-pointer">
                                        <XIcon size={14} weight="bold" />
                                    </button>
                                </div>
                                <span />
                                <span />
                                <span />
                            </div>
                        )}
                    </div>

                    <p className="text-neutral-gray/60 text-xs font-body mt-4 leading-relaxed">
                        Renaming categories is cosmetic — items link by ID, not name. Deleting is only allowed when a category has no items.
                    </p>
                </>
            )}

            {/* Delete confirm modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
                    <div className="bg-neutral-card rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
                        <div className="h-1.5 bg-error" />
                        <div className="p-6">
                            <div className="flex items-center gap-2 mb-2">
                                <WarningCircleIcon size={18} weight="fill" className="text-error" />
                                <h3 className="text-text-dark text-base font-bold font-body">Delete &ldquo;{deleteTarget.name}&rdquo;?</h3>
                            </div>
                            <p className="text-neutral-gray text-sm font-body mb-5">
                                This category will be soft-deleted. It cannot be undone from here.
                            </p>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setDeleteTarget(null)}
                                    className="flex-1 px-4 py-2.5 bg-neutral-light text-text-dark rounded-xl text-sm font-medium font-body cursor-pointer hover:bg-[#f0e8d8] transition-colors">
                                    Cancel
                                </button>
                                <button type="button" onClick={handleDelete}
                                    className="flex-1 px-4 py-2.5 bg-error text-white rounded-xl text-sm font-medium font-body cursor-pointer hover:bg-error/90 transition-colors">
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
