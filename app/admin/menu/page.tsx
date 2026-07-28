'use client';

import { useEffect, useMemo, useState } from 'react';
import { PlusIcon, UploadSimpleIcon, WarningCircleIcon } from '@phosphor-icons/react';
import {
    FilterBar,
    FilterSelect,
    InventoryModal,
    PrimaryButton,
    SearchBar,
} from '@/app/inventory/_components';
import { useAdminMenuItems } from '@/lib/api/hooks/useAdminMenuItems';
import { useMenuCategories } from '@/lib/api/hooks/useMenuCategories';
import { useBranch } from '@/app/components/providers/BranchProvider';
import { menuService, type CreateMenuItemData } from '@/lib/api/services/menu.service';
import { menuTagService } from '@/lib/api/services/menuTag.service';
import apiClient from '@/lib/api/client';
import type { MenuTag } from '@/types/api';
import { toast } from '@/lib/utils/toast';
import { ItemsTable } from './_components/ItemsTable';
import { ItemModal } from './_components/ItemModal';
import { BulkImportModal } from './_components/BulkImportModal';
import type { AdminMenuItem, ItemFormState } from './_components/types';
import { toOptionKey, toSlug } from './_components/types';

export default function AdminMenuItemsPage() {
    const { branches } = useBranch();
    const { items, isLoading, refetch } = useAdminMenuItems();
    const { data: menuCategories = [], isLoading: categoriesLoading } = useMenuCategories({ is_active: true });

    const [menuTags, setMenuTags] = useState<MenuTag[]>([]);
    const [category, setCategory] = useState('');
    const [search, setSearch] = useState('');
    const [editItem, setEditItem] = useState<AdminMenuItem | 'new' | null>(null);
    const [deleteItem, setDeleteItem] = useState<AdminMenuItem | null>(null);
    const [showImport, setShowImport] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        menuTagService.list().then(setMenuTags).catch(() => {});
    }, []);

    // Categories are still branch-scoped rows, so the same name appears once
    // per branch. Deduplicated by name until menu_categories is unified.
    const categoryNames = useMemo(
        () => Array.from(new Set(menuCategories.map(c => c.name))),
        [menuCategories],
    );

    const categoryMap = useMemo(() => {
        const map = new Map<string, number>();
        menuCategories.forEach(c => { if (!map.has(c.name)) map.set(c.name, c.id); });
        return map;
    }, [menuCategories]);

    const rows = useMemo<AdminMenuItem[]>(() => {
        let list: AdminMenuItem[] = items.map(item => ({
            ...item,
            tags: item.tags?.map(t => t.slug) ?? [],
        }));
        if (category) list = list.filter(i => i.category === category);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(i =>
                i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
        }
        return list;
    }, [items, category, search]);

    /**
     * Save an item, then reconcile its options.
     *
     * `slug` goes on create only. It used to be regenerated with Date.now() on
     * every save, so each edit rewrote the item's slug — breaking its customer
     * URL and the slug-matched lookups behind it.
     */
    async function saveItem(form: ItemFormState, existing: AdminMenuItem | null) {
        const isNew = !existing;
        setIsSaving(true);

        try {
            const isSimple = form.pricingType === 'simple';
            const tagIds = form.tags
                .map(slug => menuTags.find(t => t.slug === slug)?.id)
                .filter((id): id is number => typeof id === 'number');

            const payload: CreateMenuItemData = {
                // Still required by the create request until menu_items.branch_id
                // is dropped. It records which branch first entered the dish; it
                // no longer decides where it is served.
                branch_id: Number(branches[0]?.id ?? 0),
                category_id: categoryMap.get(form.category),
                name: form.name.trim(),
                description: form.description.trim() || undefined,
                is_available: form.isAvailable,
                tag_ids: tagIds,
                ...(isNew ? { slug: toSlug(form.name) } : {}),
                ...(isSimple ? { pricing_type: 'simple' as const, price: Number(form.simplePrice) } : {}),
            };

            const response = isNew
                ? await menuService.createItem(payload)
                : await menuService.updateItem(existing.numericId, payload);

            const savedId = response.data.id;

            if (isSimple) {
                if (form.imageFile) await uploadStandardImage(savedId, form.imageFile);
            } else {
                await syncOptions(savedId, form);
            }

            await refetch();
            toast.success(`${form.name.trim()} ${isNew ? 'added' : 'saved'}.`);
            setEditItem(null);
        } catch (error) {
            const err = error as { errors?: Record<string, string[]>; message?: string };
            if (err.errors) {
                const detail = Object.entries(err.errors)
                    .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
                    .join(' · ');
                toast.error(detail);
            } else {
                toast.error(err.message || 'Could not save the item.');
            }
        } finally {
            setIsSaving(false);
        }
    }

    async function uploadStandardImage(itemId: number, file: File) {
        const response = await apiClient.get(`/admin/menu-items/${itemId}/options`);
        // One unwrap — the interceptor already returns the body.
        const existing = (response as { data?: Array<{ id: number; option_key: string }> }).data ?? [];
        const standard = existing.find(o => o.option_key === 'standard');
        if (standard) await menuService.uploadOptionImage(itemId, standard.id, file);
    }

    async function syncOptions(itemId: number, form: ItemFormState) {
        const desired = form.options
            .filter(o => o.label.trim() && Number(o.price) > 0)
            .map((o, i) => ({
                key: toOptionKey(o.label),
                label: o.label.trim(),
                displayName: o.displayName.trim() || null,
                price: Number(o.price),
                order: i,
                imageFile: o.imageFile,
            }));

        const response = await apiClient.get(`/admin/menu-items/${itemId}/options`);
        const existing = (response as { data?: Array<{ id: number; option_key: string }> }).data ?? [];
        const byKey = Object.fromEntries(existing.map(o => [o.option_key, o]));
        const desiredKeys = new Set(desired.map(o => o.key));

        for (const opt of desired) {
            const body = {
                option_label: opt.label,
                display_name: opt.displayName,
                price: opt.price,
                display_order: opt.order,
                is_available: true,
            };

            let optionId: number | undefined = byKey[opt.key]?.id;
            if (optionId) {
                await apiClient.patch(`/admin/menu-items/${itemId}/options/${optionId}`, body);
            } else {
                const created = await apiClient.post(`/admin/menu-items/${itemId}/options`, {
                    option_key: opt.key,
                    ...body,
                }) as { data?: { id: number } };
                optionId = created.data?.id;
            }

            if (optionId && opt.imageFile) {
                await menuService.uploadOptionImage(itemId, optionId, opt.imageFile);
            }
        }

        for (const stale of existing.filter(o => !desiredKeys.has(o.option_key))) {
            await apiClient.delete(`/admin/menu-items/${itemId}/options/${stale.id}`);
        }
    }

    /**
     * Withdraw company-wide, or put back. Optimistic, because the list is the
     * only place this state is visible and a lag reads as a failed click.
     */
    async function toggleAvailable(item: AdminMenuItem) {
        const next = !item.isAvailable;
        try {
            await menuService.updateItem(item.numericId, { is_available: next });
            toast.success(`${item.name} ${next ? 'is on sale' : 'withdrawn from every branch'}.`);
            refetch();
        } catch {
            toast.error('Could not change availability.');
        }
    }

    async function confirmDelete() {
        if (!deleteItem) return;
        try {
            await menuService.deleteItem(deleteItem.numericId);
            toast.success(`${deleteItem.name} removed from the menu.`);
            setDeleteItem(null);
            refetch();
        } catch {
            toast.error('Could not delete the item.');
        }
    }

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <p className="text-neutral-gray text-sm font-body">
                    {rows.length} item{rows.length !== 1 ? 's' : ''}
                    {rows.length !== items.length ? ` of ${items.length}` : ''}
                </p>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setShowImport(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-neutral-card border border-[#f0e8d8] text-text-dark rounded-xl text-sm font-medium font-body hover:border-primary/40 transition-colors cursor-pointer min-h-11"
                    >
                        <UploadSimpleIcon size={15} weight="bold" className="text-primary" />
                        Bulk import
                    </button>
                    <button
                        type="button"
                        onClick={() => setEditItem('new')}
                        disabled={categoriesLoading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold font-body hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-11 shadow-sm"
                    >
                        <PlusIcon size={16} weight="bold" />
                        Add item
                    </button>
                </div>
            </div>

            <FilterBar>
                <SearchBar value={search} onChange={setSearch} placeholder="Search items…" />
                <FilterSelect
                    value={category}
                    onChange={setCategory}
                    placeholder="All categories"
                    options={categoryNames.map(name => ({ value: name, label: name }))}
                />
            </FilterBar>

            <ItemsTable
                items={rows}
                isLoading={isLoading}
                onEdit={setEditItem}
                onDelete={setDeleteItem}
                onToggleAvailable={toggleAvailable}
            />

            {editItem !== null && !categoriesLoading && (
                <ItemModal
                    item={editItem === 'new' ? null : editItem}
                    menuTags={menuTags}
                    categoryOptions={categoryNames}
                    onClose={() => setEditItem(null)}
                    onSave={saveItem}
                    isSaving={isSaving}
                />
            )}

            {deleteItem && (
                <InventoryModal isOpen onClose={() => setDeleteItem(null)} title="Remove item?" size="sm">
                    <div className="flex flex-col gap-4">
                        <div className="flex gap-2.5">
                            <WarningCircleIcon size={20} weight="fill" className="text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-text-dark text-sm font-body">
                                    <span className="font-semibold">{deleteItem.name}</span> will be taken off the menu
                                    at every branch.
                                </p>
                                {/* It is a soft delete. The old copy said
                                    "permanently, cannot be recovered", which is
                                    both untrue and the kind of thing that stops
                                    people doing a safe action. */}
                                <p className="text-neutral-gray text-xs font-body mt-1.5">
                                    Past orders and reports keep it — nothing historical changes.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setDeleteItem(null)}
                                className="flex-1 px-4 py-2.5 bg-[#f5f4f2] text-text-dark rounded-xl text-sm font-medium font-body cursor-pointer hover:bg-[#eceae7] transition-colors min-h-11"
                            >
                                Cancel
                            </button>
                            <PrimaryButton onClick={confirmDelete} className="bg-red-500! hover:bg-red-600!">
                                Remove
                            </PrimaryButton>
                        </div>
                    </div>
                </InventoryModal>
            )}

            {showImport && (
                <BulkImportModal
                    onClose={() => setShowImport(false)}
                    onImported={refetch}
                    branchId={Number(branches[0]?.id ?? 0)}
                />
            )}
        </>
    );
}
