'use client';

import { StorefrontIcon, XIcon, CheckIcon } from '@phosphor-icons/react';

interface BranchSwitcherDialogProps {
    isOpen: boolean;
    branches: { id: string; name: string; address?: string }[];
    currentBranchId?: string | null;
    onSelect: (branchId: string) => void;
    onClose: () => void;
}

export default function BranchSwitcherDialog({
    isOpen,
    branches,
    currentBranchId,
    onSelect,
    onClose,
}: BranchSwitcherDialogProps) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-neutral-gray/15 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <StorefrontIcon className="w-5 h-5 text-primary" />
                        <h2 className="text-base font-bold text-text-dark">Switch Branch</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-gray hover:bg-neutral-light transition-colors"
                    >
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>

                {/* Branch list */}
                <div className="p-4 flex flex-col gap-2">
                    {branches.map(branch => {
                        const isActive = branch.id === currentBranchId;
                        return (
                            <button
                                key={branch.id}
                                onClick={() => { onSelect(branch.id); onClose(); }}
                                className={`w-full text-left px-4 py-3 rounded-2xl border-2 transition-colors flex items-center justify-between gap-3 ${
                                    isActive
                                        ? 'border-primary bg-primary/5'
                                        : 'border-neutral-gray/20 hover:border-primary hover:bg-primary/5'
                                }`}
                            >
                                <div>
                                    <div className="font-semibold text-text-dark text-sm">{branch.name}</div>
                                    {branch.address && (
                                        <div className="text-xs text-text-muted mt-0.5">{branch.address}</div>
                                    )}
                                </div>
                                {isActive && (
                                    <CheckIcon className="w-4 h-4 text-primary shrink-0" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
