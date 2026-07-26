'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowSquareOutIcon,
  FloppyDiskIcon,
  InfoIcon,
  LockIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import { PageHeader } from '../../_components';
import {
  useInventorySettings,
  useUpdateInventorySettings,
} from '@/lib/api/hooks/inventory/useInventorySettings';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { getErrorMessage } from '@/lib/utils/error-handler';

// ─── Wastage threshold ────────────────────────────────────────────────────────

function WastageThresholdCard() {
  const { can } = useStaffAuth();
  // Deliberately NOT `manage_settings` - branch managers hold that, and this
  // number decides when their own losses stop being self-approvable.
  const canEdit = can('inventory.settings.manage');

  const { data: settings, isLoading } = useInventorySettings();
  const update = useUpdateInventorySettings();

  const [threshold, setThreshold] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settings) setThreshold(String(settings.wastage_threshold_amount));
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const value = parseFloat(threshold);
    if (Number.isNaN(value) || value < 0) {
      setError('Enter an amount of zero or more.');
      return;
    }
    try {
      await update.mutateAsync({ wastage_threshold_amount: value });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold font-body text-text-dark">Wastage threshold</p>
          <p className="text-sm font-body text-neutral-gray mt-0.5">
            Measured on the value of the goods in a single declaration.
          </p>
        </div>
        {!canEdit && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-neutral-gray bg-neutral-light border border-[#f0e8d8] rounded-full px-2.5 py-1 shrink-0">
            <LockIcon size={12} weight="bold" />
            Admin only
          </span>
        )}
      </div>

      {/* What the number actually does, in the order it happens. The old copy
          here described a rule that was never built. */}
      <ul className="mt-3 mb-4 space-y-1.5 text-sm font-body text-neutral-gray">
        <li className="flex gap-2">
          <span className="text-neutral-gray/50 select-none">·</span>
          <span>
            <span className="text-text-dark font-medium">Below it</span>, a branch writes the loss off
            on the spot and the stock goes immediately.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-neutral-gray/50 select-none">·</span>
          <span>
            <span className="text-text-dark font-medium">Above it</span>, the goods must physically go
            back to the warehouse that supplied them, with a photo, before the warehouse manager can
            approve the write-off.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-neutral-gray/50 select-none">·</span>
          <span>
            The warehouse&rsquo;s own wastage always self-approves - nobody sits above the warehouse
            manager - but the admin is alerted above this figure.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-neutral-gray/50 select-none">·</span>
          <span>The same figure red-flags stock-take variances during reconciliation.</span>
        </li>
      </ul>

      <form onSubmit={handleSave} className="flex items-center gap-2 max-w-xs">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-gray font-body pointer-events-none select-none">
            GH₵
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            disabled={isLoading || !canEdit}
            aria-label="Wastage threshold amount"
            className="
              w-full pl-11 pr-3 py-2 rounded-xl min-h-10
              border border-[#e3e1de] bg-[#f5f4f2]
              text-sm font-body text-text-dark
              focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10
              transition-shadow disabled:opacity-60 disabled:cursor-not-allowed
            "
          />
        </div>
        {canEdit && (
          <button
            type="submit"
            disabled={update.isPending || isLoading}
            className="
              flex items-center gap-1.5 bg-primary text-white
              px-3 py-2 rounded-xl min-h-10 shrink-0
              text-sm font-semibold font-body
              hover:bg-primary/90 transition-colors cursor-pointer
              disabled:opacity-60
            "
          >
            <FloppyDiskIcon size={14} weight="bold" />
            {update.isPending ? 'Saving…' : saved ? 'Saved!' : 'Save'}
          </button>
        )}
      </form>

      {error && (
        <div className="flex items-start gap-2 mt-3 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5 max-w-md">
          <WarningCircleIcon size={16} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
          <p className="text-rose-700 text-sm font-body">{error}</p>
        </div>
      )}

      <p className="text-neutral-gray text-xs font-body mt-3">
        Applies everywhere, for every location. Changing it does not reopen claims already settled.
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InventorySettingsPage() {
  return (
    <div className="p-6 pb-24 md:pb-6 max-w-4xl mx-auto w-full">
      <PageHeader title="Settings" subtitle="How the inventory portal behaves." />

      <WastageThresholdCard />

      {/*
        This page used to carry an "IMS staff roles" table and an "Assign role"
        button. Neither ever worked: the table read from an endpoint that does
        not exist (so it always rendered empty, which looks exactly like "nobody
        has access"), and the button was a TODO that did nothing on click.
        IMS access is granted through the ordinary staff-role system, so this
        points there rather than pretending to be a second place to do it.
      */}
      <div className="mt-6 bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5">
        <div className="flex items-start gap-2.5">
          <InfoIcon size={18} weight="fill" className="text-neutral-gray/70 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold font-body text-text-dark">IMS access</p>
            <p className="text-sm font-body text-neutral-gray mt-0.5">
              Warehouse Manager and Purchasing Clerk are ordinary staff roles - assign them where you
              assign every other role, and portal access follows automatically.
            </p>
            <Link
              href="/admin/staff"
              className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold font-body text-primary hover:text-primary/80"
            >
              Manage staff roles
              <ArrowSquareOutIcon size={14} weight="bold" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
