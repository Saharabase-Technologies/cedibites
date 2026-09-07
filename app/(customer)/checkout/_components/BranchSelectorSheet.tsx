'use client';

import BottomSheet from '@/app/components/ui/BottomSheet';
import { BranchConflictPanel, BranchList, useBranchSwitch } from '@/app/components/ui/BranchSwitch';
import { ArrowLeftIcon, XIcon } from '@phosphor-icons/react';
import { useEffect } from 'react';

/**
 * Changing branch, from checkout.
 *
 * Chrome only. The list, the conflict panel and the decision about what happens
 * to the cart all live in components/ui/BranchSwitch, shared with the cart
 * drawer.
 *
 * It used to hand-roll the sheet as well: its own backdrop, its own translate,
 * its own scroll lock and a blurred panel. That meant the two places a customer
 * changes branch behaved differently on the same phone, and only one of them
 * could be dragged shut. It sits on the shared BottomSheet now, so it drags,
 * traps focus and answers Escape exactly like the cart does.
 */
export default function BranchSelectorSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { conflict, removing, selectBranch, removeAndSwitch, keepCurrentBranch, reset } =
        useBranchSwitch({ onSettled: onClose });

    // Backing out and coming back should not reopen a conflict about a branch
    // that has already been walked away from.
    useEffect(() => {
        if (isOpen) return;
        const t = setTimeout(reset, 300);
        return () => clearTimeout(t);
    }, [isOpen, reset]);

    const header = (
        <div className="flex items-center gap-2 px-5 pb-4 pt-1 md:pt-5">
            {conflict && (
                <button
                    onClick={keepCurrentBranch}
                    aria-label="Back to the branch list"
                    className="-ml-2 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-fg transition-colors duration-150 ease-out hover:bg-surface-sunken"
                >
                    <ArrowLeftIcon size={17} weight="bold" />
                </button>
            )}
            <h2 className="flex-1 text-lg font-bold text-fg">
                {conflict ? 'Not on that menu' : 'Change branch'}
            </h2>
            <button
                onClick={onClose}
                aria-label="Close"
                className="-mr-2 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-fg-muted transition-colors duration-150 ease-out hover:bg-surface-sunken hover:text-fg"
            >
                <XIcon size={18} weight="bold" />
            </button>
        </div>
    );

    return (
        <BottomSheet open={isOpen} onClose={onClose} label="Change branch" header={header}>
            <div className="px-5 pb-5">
                {conflict
                    ? <BranchConflictPanel
                        conflict={conflict}
                        removing={removing}
                        onRemoveAndSwitch={removeAndSwitch}
                        onKeepCurrent={onClose}
                        onPickAnother={keepCurrentBranch}
                    />
                    : <BranchList onSelect={selectBranch} />}
            </div>
        </BottomSheet>
    );
}
