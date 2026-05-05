'use client';

import { useState, useEffect } from 'react';
import { FloppyDiskIcon } from '@phosphor-icons/react';
import {
  useInventorySettings,
  useUpdateInventorySettings,
} from '@/lib/api/hooks/inventory/useInventorySettings';

export function ConfigureSettingsPage() {
  const { data: settings, isLoading } = useInventorySettings();
  const update = useUpdateInventorySettings();

  const [threshold, setThreshold] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) setThreshold(String(settings.wastage_threshold_amount));
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(threshold);
    if (isNaN(value) || value < 0) return;
    await update.mutateAsync({ wastage_threshold_amount: value });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-4">
      {/* Wastage threshold ─────────────────────────────────────────────── */}
      <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-4">
        <p className="text-sm font-semibold font-body text-text-dark">Wastage threshold</p>
        <p className="text-sm font-body text-neutral-gray mt-0.5 mb-3">
          Wastage events above this amount require warehouse manager approval. Events below are
          auto-accepted (unless marked as spoiled from warehouse).
        </p>

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
              disabled={isLoading}
              className="
                w-full pl-11 pr-3 py-2 rounded-xl min-h-10
                border border-[#f0e8d8] bg-slate-50
                text-sm font-body text-text-dark
                focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10
                transition-shadow disabled:opacity-50
              "
            />
          </div>
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
        </form>
      </div>
    </div>
  );
}
