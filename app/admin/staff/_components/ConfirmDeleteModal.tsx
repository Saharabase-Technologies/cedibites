'use client';

import { useState } from 'react';
import { WarningCircleIcon } from '@phosphor-icons/react';
import type { StaffMember } from '@/types/staff';

export function ConfirmDeleteModal({ staff, onConfirm, onCancel }: {
    staff: StaffMember;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    const [input, setInput] = useState('');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <div className="bg-neutral-card rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
                <div className="h-1.5 bg-error" />
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <WarningCircleIcon size={18} weight="fill" className="text-error" />
                        <h3 className="text-text-dark text-base font-bold font-body">Delete account permanently?</h3>
                    </div>
                    <p className="text-neutral-gray text-sm font-body mb-4">
                        This will permanently delete <strong className="text-text-dark">{staff.name}</strong>&apos;s account.
                        Orders they processed will retain a &quot;[Deleted Staff]&quot; label.
                    </p>
                    <p className="text-xs font-body text-neutral-gray mb-2">Type <strong>CONFIRM</strong> to proceed:</p>
                    <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="CONFIRM"
                        className="w-full px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-error/50 mb-4" />
                    <div className="flex gap-3">
                        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2.5 bg-neutral-light text-text-dark rounded-xl text-sm font-medium font-body cursor-pointer">Cancel</button>
                        <button type="button" onClick={onConfirm} disabled={input !== 'CONFIRM'}
                            className="flex-1 px-4 py-2.5 bg-error text-white rounded-xl text-sm font-medium font-body disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">
                            Delete permanently
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
