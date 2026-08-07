'use client';

import { StorefrontIcon } from '@phosphor-icons/react';

interface BranchSelectPageProps {
    branches: { id: string; name: string; address?: string }[];
    onSelect: (branchId: string) => void;
    title?: string;
    subtitle?: string;
}

export default function BranchSelectPage({
    branches,
    onSelect,
    title = 'Select Branch',
    subtitle = 'Choose a branch to continue',
}: BranchSelectPageProps) {
    return (
        <div className="min-h-dvh flex items-center justify-center bg-neutral-light p-6">
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8 flex flex-col gap-6">
                <div className="text-center">
                    <StorefrontIcon className="w-12 h-12 text-primary mx-auto mb-3" />
                    <h1 className="text-xl font-bold text-text-dark">{title}</h1>
                    <p className="text-sm text-text-muted mt-1">{subtitle}</p>
                </div>
                <div className="flex flex-col gap-3">
                    {branches.map(branch => (
                        <button
                            key={branch.id}
                            onClick={() => onSelect(branch.id)}
                            className="w-full text-left px-5 py-4 rounded-2xl border-2 border-neutral-gray/20 hover:border-primary hover:bg-primary/5 transition-colors"
                        >
                            <div className="font-semibold text-text-dark">{branch.name}</div>
                            <div className="text-xs text-text-muted mt-0.5">{branch.address}</div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
