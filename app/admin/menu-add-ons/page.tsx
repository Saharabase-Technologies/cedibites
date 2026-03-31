'use client';

import { useEffect, useMemo, useState } from 'react';
import { PlusIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useBranch } from '@/app/components/providers/BranchProvider';
import { menuAddOnService } from '@/lib/api/services/menuAddOn.service';
import type { MenuAddOn } from '@/types/api';
import { toast } from '@/lib/utils/toast';

interface AddOnFormState {
  id?: number;
  name: string;
  slug: string;
  price: string;
  isPerPiece: boolean;
  isActive: boolean;
}

function toForm(addOn?: MenuAddOn): AddOnFormState {
  if (!addOn) {
    return { name: '', slug: '', price: '', isPerPiece: false, isActive: true };
  }

  return {
    id: addOn.id,
    name: addOn.name,
    slug: addOn.slug,
    price: String(addOn.price),
    isPerPiece: addOn.is_per_piece,
    isActive: addOn.is_active,
  };
}

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

export default function AdminMenuAddOnsPage() {
  const { branches } = useBranch();
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [addOns, setAddOns] = useState<MenuAddOn[]>([]);
  const [editing, setEditing] = useState<AddOnFormState | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (!selectedBranchId && branches.length > 0) {
      setSelectedBranchId(Number(branches[0].id));
    }
  }, [branches, selectedBranchId]);

  useEffect(() => {
    if (!selectedBranchId) {
      return;
    }

    menuAddOnService
      .list(selectedBranchId)
      .then(setAddOns)
      .catch(() => {
        toast.error('Failed to load add-ons');
      });
  }, [selectedBranchId]);

  const selectedBranch = useMemo(
    () => branches.find(branch => Number(branch.id) === selectedBranchId),
    [branches, selectedBranchId],
  );

  async function handleSave(): Promise<void> {
    if (!editing || !selectedBranchId) {
      return;
    }

    if (!editing.name.trim() || !editing.slug.trim() || Number(editing.price) <= 0) {
      toast.error('Name, slug, and a valid price are required');
      return;
    }

    try {
      if (editing.id) {
        await menuAddOnService.update(editing.id, {
          name: editing.name.trim(),
          slug: editing.slug.trim(),
          price: Number(editing.price),
          is_per_piece: editing.isPerPiece,
          is_active: editing.isActive,
        });
      } else {
        await menuAddOnService.create({
          branch_id: selectedBranchId,
          name: editing.name.trim(),
          slug: editing.slug.trim(),
          price: Number(editing.price),
          is_per_piece: editing.isPerPiece,
          is_active: editing.isActive,
        });
      }

      const updated = await menuAddOnService.list(selectedBranchId);
      setAddOns(updated);
      setEditing(null);
      toast.success('Add-on saved');
    } catch {
      toast.error('Failed to save add-on');
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deletingId || !selectedBranchId) {
      return;
    }

    try {
      await menuAddOnService.remove(deletingId);
      setAddOns(prev => prev.filter(addOn => addOn.id !== deletingId));
      setDeletingId(null);
      toast.success('Add-on deleted');
    } catch {
      toast.error('Failed to delete add-on');
    }
  }

  return (
    <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-text-dark text-2xl font-bold font-body">Menu Management</h1>
          <p className="text-neutral-gray text-sm font-body mt-1">Branch-level add-on catalog management</p>
        </div>
      </div>

      <MenuSubTabs />

      <div className="flex items-center gap-3 mb-5">
        <select
          value={selectedBranchId ?? ''}
          onChange={(event) => setSelectedBranchId(Number(event.target.value))}
          className="px-3 py-2.5 bg-neutral-card border border-[#f0e8d8] rounded-xl text-sm font-body"
        >
          {branches.map(branch => (
            <option key={branch.id} value={branch.id}>{branch.name}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setEditing(toForm())}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium font-body"
        >
          <PlusIcon size={14} />
          Add Add-on
        </button>
      </div>

      <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
        {addOns.length === 0 ? (
          <p className="px-4 py-8 text-sm text-neutral-gray font-body text-center">
            No add-ons found for {selectedBranch?.name ?? 'this branch'}.
          </p>
        ) : addOns.map((addOn, index) => (
          <div key={addOn.id} className={`px-4 py-3.5 flex items-center justify-between ${index < addOns.length - 1 ? 'border-b border-[#f0e8d8]' : ''}`}>
            <div>
              <p className="text-text-dark text-sm font-semibold font-body">{addOn.name}</p>
              <p className="text-neutral-gray text-xs font-body">
                {addOn.slug} · GH{addOn.price} {addOn.is_per_piece ? '/ piece' : ''} · {addOn.is_active ? 'active' : 'inactive'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setEditing(toForm(addOn))} className="p-2 rounded-lg hover:bg-neutral-light">
                <PencilSimpleIcon size={14} />
              </button>
              <button type="button" onClick={() => setDeletingId(addOn.id)} className="p-2 rounded-lg hover:bg-error/10 text-error">
                <TrashIcon size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-neutral-card rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-text-dark text-lg font-bold font-body mb-4">{editing.id ? 'Edit add-on' : 'New add-on'}</h2>
            <div className="flex flex-col gap-3">
              <input value={editing.name} onChange={(e) => setEditing(prev => prev ? { ...prev, name: e.target.value } : prev)} placeholder="Name" className="px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-sm" />
              <input value={editing.slug} onChange={(e) => setEditing(prev => prev ? { ...prev, slug: e.target.value } : prev)} placeholder="Slug" className="px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-sm" />
              <input type="number" min="0" value={editing.price} onChange={(e) => setEditing(prev => prev ? { ...prev, price: e.target.value } : prev)} placeholder="Price" className="px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-sm" />
              <label className="text-sm font-body text-text-dark flex items-center gap-2">
                <input type="checkbox" checked={editing.isPerPiece} onChange={(e) => setEditing(prev => prev ? { ...prev, isPerPiece: e.target.checked } : prev)} />
                Price per piece
              </label>
              <label className="text-sm font-body text-text-dark flex items-center gap-2">
                <input type="checkbox" checked={editing.isActive} onChange={(e) => setEditing(prev => prev ? { ...prev, isActive: e.target.checked } : prev)} />
                Active
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setEditing(null)} className="flex-1 px-4 py-2.5 border border-[#f0e8d8] rounded-xl text-sm font-medium">Cancel</button>
              <button type="button" onClick={handleSave} className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium">Save</button>
            </div>
          </div>
        </div>
      )}

      {deletingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-neutral-card rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-text-dark text-base font-bold font-body mb-2">Delete add-on?</h2>
            <p className="text-neutral-gray text-sm font-body mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setDeletingId(null)} className="flex-1 px-4 py-2.5 border border-[#f0e8d8] rounded-xl text-sm font-medium">Cancel</button>
              <button type="button" onClick={handleDelete} className="flex-1 px-4 py-2.5 bg-error text-white rounded-xl text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
