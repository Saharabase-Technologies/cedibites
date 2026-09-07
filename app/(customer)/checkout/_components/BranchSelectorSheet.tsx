'use client';

import { BranchConflictPanel, BranchList, useBranchSwitch } from '@/app/components/ui/BranchSwitch';
import { lockScroll, unlockScroll } from '@/lib/utils/scrollLock';
import { ArrowLeftIcon, XIcon } from '@phosphor-icons/react';
import { useEffect } from 'react';

// --- Branch Selector Sheet -------------------------------------------------
// Chrome only. The list, the conflict panel and the decision about what happens
// to the cart all live in components/ui/BranchSwitch.tsx, shared with the cart
// drawer. This file used to carry its own copy of all three.
export default function BranchSelectorSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { conflict, removing, selectBranch, removeAndSwitch, keepCurrentBranch, reset } =
        useBranchSwitch({ onSettled: onClose });

    useEffect(() => { if (!isOpen) setTimeout(reset, 300); }, [isOpen, reset]);

    useEffect(() => {
        if (!isOpen) return;

        lockScroll();
        return unlockScroll;
    }, [isOpen]);

    return (
        <>
            <div className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
            <div className={`fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-brand-darker rounded-t-3xl shadow-2xl flex flex-col transition-transform duration-300 ease-out max-h-[88dvh]
                md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-125 md:rounded-2xl md:max-h-[82vh]
                ${isOpen ? 'translate-y-0' : 'translate-y-full md:opacity-0 md:scale-95 md:pointer-events-none'}`}>

                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-neutral-gray/10 shrink-0">
                    <div className="flex items-center gap-3">
                        {conflict && (
                            <button onClick={keepCurrentBranch} aria-label="Back to branch list"
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-gray/10 transition-colors cursor-pointer">
                                <ArrowLeftIcon weight="bold" size={16} className="text-text-dark dark:text-text-light" />
                            </button>
                        )}
                        <h3 className="font-bold text-text-dark dark:text-text-light">
                            {conflict ? 'Items Not Available' : 'Change Branch'}
                        </h3>
                    </div>
                    <button onClick={onClose} aria-label="Close"
                        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-neutral-gray/10 transition-colors cursor-pointer">
                        <XIcon size={20} weight="bold" className="text-text-dark dark:text-text-light" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
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
            </div>
        </>
    );
}
