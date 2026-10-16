'use client';

import { useState } from 'react';
import { SegmentedTabs } from '@/app/inventory/_components';
import type { BoltCommissionBase, BoltSettings } from '@/lib/api/services/bolt.service';
import { toast } from '@/lib/utils/toast';
import { BUTTON_PRIMARY } from '../prices/StatusCard';

/**
 * What Bolt keeps of an order, and what it takes it from.
 *
 * Bolt's own reports do not say whether the 30% comes off the price the
 * customer paid or the listed price before a promo. Its payout statement
 * does, and this is where that answer goes. An order keeps the figure it was
 * placed with, so a change here never rewrites the books.
 */
export function BoltSettingsCard({
    settings,
    onSave,
}: {
    settings: BoltSettings;
    onSave: (next: BoltSettings) => Promise<boolean>;
}) {
    const [percent, setPercent] = useState(String(settings.commission_percent));
    const [base, setBase] = useState<BoltCommissionBase>(settings.commission_base);
    const [saving, setSaving] = useState(false);

    const typed = Number(percent);
    const valid = percent.trim() !== '' && Number.isFinite(typed) && typed >= 0 && typed <= 100;
    const changed = valid && (typed !== settings.commission_percent || base !== settings.commission_base);

    async function save() {
        if (!valid) {
            toast.error('Type a percentage from 0 to 100, like 30.');
            return;
        }
        setSaving(true);
        await onSave({ commission_percent: Math.round(typed * 100) / 100, commission_base: base });
        setSaving(false);
    }

    return (
        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5 mb-5">
            <h2 className="text-lg font-semibold font-brand text-text-dark mb-1">What Bolt keeps</h2>
            <p className="text-sm font-body text-neutral-gray mb-4">
                Net sales count what is left. An order keeps the figure it was placed with.
            </p>

            <div className="flex flex-col md:flex-row md:items-end gap-4">
                <label className="block">
                    <span className="block text-xs font-medium font-body text-neutral-gray mb-1">Bolt&apos;s cut</span>
                    <span className="relative block w-28">
                        <input
                            type="text"
                            inputMode="decimal"
                            value={percent}
                            onChange={e => setPercent(e.target.value.replace(/[^\d.]/g, '').slice(0, 6))}
                            className="w-full min-h-11 pl-3 pr-8 rounded-xl border bg-[#f5f4f2] border-[#e3e1de] text-right text-sm font-body font-semibold tabular-nums text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-body text-neutral-gray pointer-events-none">%</span>
                    </span>
                </label>

                <div>
                    <span className="block text-xs font-medium font-body text-neutral-gray mb-1">Taken from</span>
                    <SegmentedTabs<BoltCommissionBase>
                        options={[
                            { value: 'paid', label: 'Price paid, after the promo' },
                            { value: 'listed', label: 'Listed price, before the promo' },
                        ]}
                        value={base}
                        onChange={setBase}
                    />
                </div>

                <button type="button" className={`${BUTTON_PRIMARY} md:ml-auto`} disabled={!changed || saving} onClick={save}>
                    {saving ? 'Saving…' : 'Save'}
                </button>
            </div>
        </div>
    );
}
