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
  price: string;
}

function toForm(addOn?: MenuAddOn): AddOnFormState {
  if (!addOn) {
    return { name: '', price: '' };
  }

  return {
    id: addOn.id,
    name: addOn.name,
    price: String(addOn.price),
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

    if (!editing.name.trim() || Number(editing.price) <= 0) {
      toast.error('Name and a valid price are required');
      return;
    }

    const slug = toSlug(editing.name);

    try {
      if (editing.id) {
        await menuAddOnService.update(editing.id, {
          name: editing.name.trim(),
          slug,
          price: Number(editing.price),
          is_active: true,
        });
      } else {
        await menuAddOnService.create({
          branch_id: selectedBranchId,
          name: editing.name.trim(),
          slug,
          price: Number(editing.price),
          is_per_piece: false,
          is_active: true,
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
          <p className="text-neutral-gray text-sm font-body mt-1">Manage add-ons for each branch</p>
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
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium font-body cursor-pointer hover:bg-primary-hover transition-colors"
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
            <div className="flex items-center gap-4">
              <p className="text-text-dark text-sm font-semibold font-body">{addOn.name}</p>
              <span className="text-primary text-sm font-bold font-body">GHS {addOn.price}</span>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setEditing(toForm(addOn))} className="p-2 rounded-lg hover:bg-neutral-light cursor-pointer">
                <PencilSimpleIcon size={14} className="text-primary" />
              </button>
              <button type="button" onClick={() => setDeletingId(addOn.id)} className="p-2 rounded-lg hover:bg-error/10 cursor-pointer">
                <TrashIcon size={14} className="text-error" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-neutral-card rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-text-dark text-lg font-bold font-body mb-4">{editing.id ? 'Edit Add-on' : 'New Add-on'}</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1.5">Name</label>
                <input
                  value={editing.name}
                  onChange={(e) => setEditing(prev => prev ? { ...prev, name: e.target.value } : prev)}
                  placeholder="e.g. Extra Chicken"
                  className="w-full px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-sm font-body text-text-dark focus:outline-none focus:border-primary/40"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1.5">Price (GHS)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editing.price}
                  onChange={(e) => setEditing(prev => prev ? { ...prev, price: e.target.value } : prev)}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-sm font-body text-text-dark focus:outline-none focus:border-primary/40"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setEditing(null)} className="flex-1 px-4 py-2.5 bg-neutral-light text-text-dark rounded-xl text-sm font-medium font-body cursor-pointer hover:bg-[#f0e8d8] transition-colors">Cancel</button>
              <button type="button" onClick={handleSave} className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium font-body cursor-pointer hover:bg-primary-hover transition-colors">Save</button>
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
              <button type="button" onClick={() => setDeletingId(null)} className="flex-1 px-4 py-2.5 bg-neutral-light text-text-dark rounded-xl text-sm font-medium font-body cursor-pointer">Cancel</button>
              <button type="button" onClick={handleDelete} className="flex-1 px-4 py-2.5 bg-error text-white rounded-xl text-sm font-medium font-body cursor-pointer">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
