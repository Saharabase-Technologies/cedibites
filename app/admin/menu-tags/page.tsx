'use client';

import { useEffect, useState } from 'react';
import { PlusIcon, PencilSimpleIcon, TrashIcon, ToggleLeftIcon, ToggleRightIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { menuTagService } from '@/lib/api/services/menuTag.service';
import type { MenuTag } from '@/types/api';
import { toast } from '@/lib/utils/toast';

interface TagFormState {
  id?: number;
  name: string;
  slug: string;
  displayOrder: string;
  isActive: boolean;
  ruleDescription: string;
}

function toForm(tag?: MenuTag): TagFormState {
  if (!tag) {
    return { name: '', slug: '', displayOrder: '0', isActive: true, ruleDescription: '' };
  }

  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    displayOrder: String(tag.display_order),
    isActive: tag.is_active,
    ruleDescription: tag.rule_description ?? '',
  };
}

function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

const MENU_SUB_TABS = [
  { href: '/admin/menu',           label: 'Items'     },
  { href: '/admin/menu-add-ons',   label: 'Add-ons'   },
  { href: '/admin/menu-tags',      label: 'Tags'      },
  { href: '/admin/menu/configure', label: 'Configure'  },
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

export default function AdminMenuTagsPage() {
  const [tags, setTags] = useState<MenuTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TagFormState | null>(null);
  const [deletingTag, setDeletingTag] = useState<MenuTag | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    menuTagService
      .list(false)
      .then(setTags)
      .catch(() => toast.error('Failed to load tags'))
      .finally(() => setLoading(false));
  }, []);

  function openNew(): void {
    setEditing(toForm());
  }

  function openEdit(tag: MenuTag): void {
    setEditing(toForm(tag));
  }

  function setField<K extends keyof TagFormState>(key: K, value: TagFormState[K]): void {
    setEditing(prev => {
      if (!prev) {
        return prev;
      }

      if (key === 'name' && typeof value === 'string' && !prev.id) {
        return { ...prev, name: value, slug: toSlug(value) };
      }

      return { ...prev, [key]: value };
    });
  }

  async function handleToggleActive(tag: MenuTag): Promise<void> {
    try {
      const updated = await menuTagService.update(tag.id, { is_active: !tag.is_active });
      setTags(prev => prev.map(t => (t.id === updated.id ? updated : t)));
    } catch {
      toast.error('Failed to update tag');
    }
  }

  async function handleSave(): Promise<void> {
    if (!editing) {
      return;
    }

    if (!editing.name.trim() || !editing.slug.trim()) {
      toast.error('Name and slug are required');
      return;
    }

    setSaving(true);

    try {
      if (editing.id) {
        const updated = await menuTagService.update(editing.id, {
          name: editing.name.trim(),
          slug: editing.slug.trim(),
          display_order: Number(editing.displayOrder),
          is_active: editing.isActive,
          rule_description: editing.ruleDescription.trim() || null,
        });
        setTags(prev => prev.map(t => (t.id === updated.id ? updated : t)));
      } else {
        const created = await menuTagService.create({
          name: editing.name.trim(),
          slug: editing.slug.trim(),
          display_order: Number(editing.displayOrder),
          is_active: editing.isActive,
          rule_description: editing.ruleDescription.trim() || null,
        });
        setTags(prev => [...prev, created]);
      }

      setEditing(null);
      toast.success('Tag saved');
    } catch {
      toast.error('Failed to save tag');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deletingTag) {
      return;
    }

    try {
      await menuTagService.remove(deletingTag.id);
      setTags(prev => prev.filter(t => t.id !== deletingTag.id));
      setDeletingTag(null);
      toast.success('Tag deleted');
    } catch {
      toast.error('Failed to delete tag');
    }
  }

  return (
    <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-text-dark text-2xl font-bold font-body">Menu Management</h1>
          <p className="text-neutral-gray text-sm font-body mt-1">Manage tags and assignment rules for menu items</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium font-body"
          >
            <PlusIcon size={14} />
            New Tag
          </button>
        </div>
      </div>

      <MenuSubTabs />

      <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
        {loading ? (
          <p className="px-4 py-8 text-sm text-neutral-gray font-body text-center">Loading…</p>
        ) : tags.length === 0 ? (
          <p className="px-4 py-8 text-sm text-neutral-gray font-body text-center">No tags yet.</p>
        ) : tags.map((tag, index) => (
          <div
            key={tag.id}
            className={`px-4 py-3.5 flex items-center justify-between gap-4 ${index < tags.length - 1 ? 'border-b border-[#f0e8d8]' : ''}`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-text-dark text-sm font-semibold font-body">{tag.name}</p>
                <span className="px-2 py-0.5 bg-neutral-light text-neutral-gray text-[10px] font-body rounded-md">{tag.slug}</span>
                {!tag.is_active && (
                  <span className="px-2 py-0.5 bg-error/10 text-error text-[10px] font-body rounded-md">inactive</span>
                )}
              </div>
              {tag.rule_description && (
                <p className="text-neutral-gray text-xs font-body mt-0.5 truncate">{tag.rule_description}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" onClick={() => handleToggleActive(tag)} className="p-2 rounded-lg hover:bg-neutral-light">
                {tag.is_active
                  ? <ToggleRightIcon size={18} weight="fill" className="text-primary" />
                  : <ToggleLeftIcon size={18} weight="fill" className="text-neutral-gray/40" />
                }
              </button>
              <button type="button" onClick={() => openEdit(tag)} className="p-2 rounded-lg hover:bg-neutral-light">
                <PencilSimpleIcon size={14} />
              </button>
              <button type="button" onClick={() => setDeletingTag(tag)} className="p-2 rounded-lg hover:bg-error/10 text-error">
                <TrashIcon size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-neutral-card rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-text-dark text-lg font-bold font-body mb-4">{editing.id ? 'Edit tag' : 'New tag'}</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1 block">Name</label>
                <input
                  value={editing.name}
                  onChange={e => setField('name', e.target.value)}
                  placeholder="e.g. Popular"
                  className="w-full px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-sm font-body"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1 block">Slug</label>
                <input
                  value={editing.slug}
                  onChange={e => setField('slug', e.target.value)}
                  placeholder="e.g. popular"
                  className="w-full px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-sm font-body font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1 block">Display Order</label>
                <input
                  type="number"
                  min="0"
                  value={editing.displayOrder}
                  onChange={e => setField('displayOrder', e.target.value)}
                  className="w-full px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-sm font-body"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1 block">Assignment Rule (optional)</label>
                <textarea
                  value={editing.ruleDescription}
                  onChange={e => setField('ruleDescription', e.target.value)}
                  placeholder="e.g. Ordered 50+ times in the last 30 days"
                  rows={3}
                  className="w-full px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-sm font-body resize-none"
                />
              </div>
              <label className="text-sm font-body text-text-dark flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.isActive}
                  onChange={e => setField('isActive', e.target.checked)}
                />
                Active
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="flex-1 px-4 py-2.5 border border-[#f0e8d8] rounded-xl text-sm font-medium font-body"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium font-body disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-neutral-card rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-text-dark text-base font-bold font-body mb-2">Delete &quot;{deletingTag.name}&quot;?</h2>
            <p className="text-neutral-gray text-sm font-body mb-5">This will remove the tag from all menu items it is assigned to.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingTag(null)}
                className="flex-1 px-4 py-2.5 border border-[#f0e8d8] rounded-xl text-sm font-medium font-body"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 bg-error text-white rounded-xl text-sm font-medium font-body"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
