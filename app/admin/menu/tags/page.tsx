'use client';

import { useEffect, useState } from 'react';
import { PencilSimpleIcon, PlusIcon, TagIcon, TrashIcon } from '@phosphor-icons/react';
import {
    DataTable,
    FormField,
    InventoryModal,
    PrimaryButton,
    RowActionsMenu,
    TextInput,
    Toggle,
    type DataTableColumn,
} from '@/app/inventory/_components';
import { menuTagService } from '@/lib/api/services/menuTag.service';
import type { MenuTag } from '@/types/api';
import { toast } from '@/lib/utils/toast';

/**
 * Tags carry what cannot be computed.
 *
 * `popular` and `new` used to live here and duplicated the Smart Category
 * resolvers, which derive the same thing from real order data. Both ran
 * customer-side at once, so a dish hand-tagged Popular that had not sold in a
 * month headed the Popular sort while being absent from the computed row. They
 * have been retired to the resolvers; what belongs here is attributes of the
 * food — spicy, vegetarian, halal — which no amount of order history can infer.
 */

interface TagForm {
    id?: number;
    name: string;
    slug: string;
    displayOrder: string;
    isActive: boolean;
}

function toForm(tag?: MenuTag): TagForm {
    if (!tag) return { name: '', slug: '', displayOrder: '0', isActive: true };
    return {
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        displayOrder: String(tag.display_order),
        isActive: tag.is_active,
    };
}

function toSlug(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export default function AdminMenuTagsPage() {
    const [tags, setTags] = useState<MenuTag[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editing, setEditing] = useState<TagForm | null>(null);
    const [deleting, setDeleting] = useState<MenuTag | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    function load() {
        menuTagService
            .list(false)
            .then(setTags)
            .catch(() => toast.error('Could not load tags.'))
            .finally(() => setIsLoading(false));
    }

    useEffect(() => { load(); }, []);

    function setField<K extends keyof TagForm>(key: K, value: TagForm[K]) {
        setEditing(prev => {
            if (!prev) return prev;
            // Slug follows the name only while creating — changing it on an
            // existing tag would orphan anything referencing the old one.
            if (key === 'name' && typeof value === 'string' && !prev.id) {
                return { ...prev, name: value, slug: toSlug(value) };
            }
            return { ...prev, [key]: value };
        });
    }

    async function handleSave() {
        if (!editing) return;
        if (!editing.name.trim() || !editing.slug.trim()) {
            toast.error('Name and slug are both required.');
            return;
        }

        setIsSaving(true);
        try {
            const body = {
                name: editing.name.trim(),
                slug: editing.slug.trim(),
                display_order: Number(editing.displayOrder) || 0,
                is_active: editing.isActive,
            };

            if (editing.id) {
                const updated = await menuTagService.update(editing.id, body);
                setTags(prev => prev.map(t => (t.id === updated.id ? updated : t)));
            } else {
                const created = await menuTagService.create(body);
                setTags(prev => [...prev, created]);
            }

            setEditing(null);
            toast.success('Tag saved.');
        } catch {
            toast.error('Could not save the tag.');
        } finally {
            setIsSaving(false);
        }
    }

    async function toggleActive(tag: MenuTag) {
        try {
            const updated = await menuTagService.update(tag.id, { is_active: !tag.is_active });
            setTags(prev => prev.map(t => (t.id === updated.id ? updated : t)));
        } catch {
            toast.error('Could not update the tag.');
        }
    }

    async function confirmDelete() {
        if (!deleting) return;
        try {
            await menuTagService.remove(deleting.id);
            setTags(prev => prev.filter(t => t.id !== deleting.id));
            setDeleting(null);
            toast.success('Tag deleted.');
        } catch {
            toast.error('Could not delete the tag.');
        }
    }

    const columns: DataTableColumn<MenuTag>[] = [
        {
            key: 'name',
            header: 'Tag',
            sortValue: (row) => row.name.toLowerCase(),
            cell: (row) => (
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-semibold font-body ${row.is_active ? 'text-text-dark' : 'text-neutral-gray/60'}`}>
                        {row.name}
                    </span>
                    <span className="px-2 py-0.5 bg-neutral-light text-neutral-gray text-[10px] font-mono rounded-md">
                        {row.slug}
                    </span>
                </div>
            ),
        },
        {
            key: 'order',
            header: 'Order',
            hideBelow: 'sm',
            sortValue: (row) => row.display_order,
            cell: (row) => <span className="text-neutral-gray text-sm font-body">{row.display_order}</span>,
        },
        {
            key: 'active',
            header: 'Shown',
            align: 'right',
            sortValue: (row) => (row.is_active ? 1 : 0),
            cell: (row) => (
                <div className="flex justify-end">
                    <Toggle checked={row.is_active} onChange={() => toggleActive(row)} />
                </div>
            ),
        },
        {
            key: 'actions',
            header: '',
            align: 'right',
            width: 'w-12',
            cell: (row) => (
                <RowActionsMenu
                    actions={[
                        { label: 'Edit', icon: <PencilSimpleIcon size={14} weight="bold" />, onClick: () => setEditing(toForm(row)) },
                        { label: 'Delete', icon: <TrashIcon size={14} weight="bold" />, onClick: () => setDeleting(row), destructive: true },
                    ]}
                />
            ),
        },
    ];

    return (
        <>
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <p className="text-neutral-gray text-sm font-body max-w-xl">
                    Attributes of a dish that cannot be worked out from orders, such as spicy or vegetarian.
                    Popularity and newness are computed by Smart Categories, not tagged here.
                </p>
                <button
                    type="button"
                    onClick={() => setEditing(toForm())}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold font-body hover:bg-primary/90 transition-colors cursor-pointer min-h-11 shadow-sm shrink-0"
                >
                    <PlusIcon size={16} weight="bold" />
                    New tag
                </button>
            </div>

            <DataTable
                data={tags}
                columns={columns}
                rowKey={(row) => row.id}
                defaultSortKey="order"
                isLoading={isLoading}
                emptyState={
                    <div className="px-4 py-16 text-center">
                        <TagIcon size={32} weight="thin" className="text-neutral-gray/40 mx-auto mb-3" />
                        <p className="text-neutral-gray text-sm font-body">No tags yet.</p>
                    </div>
                }
            />

            {editing && (
                <InventoryModal
                    isOpen
                    onClose={() => setEditing(null)}
                    title={editing.id ? 'Edit tag' : 'New tag'}
                >
                    <div className="flex flex-col gap-4">
                        <FormField label="Name" required>
                            <TextInput
                                value={editing.name}
                                onChange={e => setField('name', e.target.value)}
                                placeholder="e.g. Vegetarian"
                            />
                        </FormField>

                        <FormField
                            label="Slug"
                            required
                            hint={editing.id ? 'Changing this orphans anything referencing the old slug.' : 'Follows the name.'}
                        >
                            <TextInput
                                value={editing.slug}
                                onChange={e => setField('slug', e.target.value)}
                                placeholder="e.g. vegetarian"
                                className="font-mono"
                            />
                        </FormField>

                        <FormField label="Display order" hint="Lower numbers appear first.">
                            <TextInput
                                type="number"
                                min="0"
                                value={editing.displayOrder}
                                onChange={e => setField('displayOrder', e.target.value)}
                            />
                        </FormField>

                        <Toggle
                            checked={editing.isActive}
                            onChange={v => setField('isActive', v)}
                            label="Shown on the menu"
                        />

                        <PrimaryButton onClick={handleSave} loading={isSaving}>
                            Save tag
                        </PrimaryButton>
                    </div>
                </InventoryModal>
            )}

            {deleting && (
                <InventoryModal isOpen onClose={() => setDeleting(null)} title="Delete tag?" size="sm">
                    <div className="flex flex-col gap-4">
                        <p className="text-text-dark text-sm font-body">
                            <span className="font-semibold">{deleting.name}</span> will be removed from every item
                            it is on.
                        </p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setDeleting(null)}
                                className="flex-1 px-4 py-2.5 bg-[#f5f4f2] text-text-dark rounded-xl text-sm font-medium font-body cursor-pointer hover:bg-[#eceae7] transition-colors min-h-11"
                            >
                                Cancel
                            </button>
                            <PrimaryButton onClick={confirmDelete} className="bg-red-500! hover:bg-red-600!">
                                Delete
                            </PrimaryButton>
                        </div>
                    </div>
                </InventoryModal>
            )}
        </>
    );
}
