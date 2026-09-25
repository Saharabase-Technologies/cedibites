'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { InventoryModal } from '@/app/inventory/_components/InventoryModal';
import { openingService } from '@/lib/api/services/opening.service';
import { toast } from '@/lib/utils/toast';

/**
 * Head office opening a branch without its checklist.
 *
 * Unusual on purpose: it asks why, it says plainly what happens next, and the
 * reason goes on the record and to head office's phones.
 */
export function OverrideDialog({
    branchId,
    branchName,
    isOpen,
    onClose,
    onOpened,
}: {
    branchId: number;
    branchName: string;
    isOpen: boolean;
    onClose: () => void;
    onOpened?: () => void;
}) {
    const queryClient = useQueryClient();
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function open() {
        setBusy(true);
        setError(null);
        try {
            await openingService.openWithoutChecklist(branchId, reason.trim());
            queryClient.invalidateQueries({ queryKey: ['opening'] });
            queryClient.invalidateQueries({ queryKey: ['openings'] });
            queryClient.invalidateQueries({ queryKey: ['branches'] });
            toast.success(`${branchName} is open.`);
            setReason('');
            onOpened?.();
            onClose();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <InventoryModal isOpen={isOpen} onClose={onClose} title={`Open ${branchName} without the checklist`}>
            <p className="text-sm font-body text-text-dark">
                {branchName} will start selling at once. This goes on the record as unusual, with your name and your reason, and
                head office is texted.
            </p>
            <p className="mt-2 text-sm font-body text-neutral-gray">The manager still has to finish the checklist.</p>

            <label htmlFor="override-reason" className="mb-1.5 mt-5 block text-sm font-medium font-body text-text-dark">
                Why is it being opened this way?
            </label>
            <textarea
                id="override-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="For example: the manager is ill and nobody else is trained on the checklist."
                className="w-full min-h-11 resize-y rounded-xl border border-[#e3e1de] bg-[#f5f4f2] px-3.5 py-2.5 text-sm font-body text-text-dark focus:outline-none focus:border-primary"
            />
            {error && <p className="mt-2 text-sm font-body text-rose-700">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={onClose}
                    className="min-h-11 rounded-xl px-4 text-sm font-semibold font-body text-neutral-gray hover:text-text-dark cursor-pointer">
                    Cancel
                </button>
                <button type="button" onClick={open} disabled={busy || reason.trim().length < 10}
                    className="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold font-body text-white hover:bg-primary/90 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50">
                    {busy ? 'Opening...' : `Open ${branchName} now`}
                </button>
            </div>
        </InventoryModal>
    );
}
