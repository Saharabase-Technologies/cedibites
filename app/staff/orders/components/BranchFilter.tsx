'use client';

import { useState } from 'react';
import { MapPinIcon, XIcon } from '@phosphor-icons/react';

interface BranchFilterProps {
    value: string;
    onChange: (branch: string) => void;
    branches: string[];
}

export default function BranchFilter({ value, onChange, branches }: BranchFilterProps) {
    const [open, setOpen] = useState(false);

    const isActive = value !== 'All';

    const select = (branch: string) => {
        onChange(branch);
        setOpen(false);
    };

    const clear = () => {
        onChange('All');
        setOpen(false);
    };

    return (
        <div className="relative">

            {/* ── Trigger ─────────────────────────────────────────────── */}
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`
          flex items-center gap-2 px-3.5 py-3 rounded-full border-2 text-sm font-body
          transition-all duration-150 cursor-pointer whitespace-nowrap
          ${isActive
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-brown-light/20 text-text-dark hover:text-text-dark dark:text-text-light/75 dark:hover:text-text-light hover:border-brown-light/40'
                    }
        `}
            >
                <MapPinIcon size={15} weight={isActive ? 'fill' : 'regular'} />
                {isActive ? value : 'Branch'}
                {isActive && (
                    <span
                        role="button"
                        tabIndex={0}
                        onClick={e => { e.stopPropagation(); clear(); }}
                        onKeyDown={e => e.key === 'Enter' && clear()}
                        className="ml-0.5 hover:text-error cursor-pointer"
                        aria-label="Clear branch filter"
                    >
                        <XIcon size={12} weight="bold" />
                    </span>
                )}
            </button>

            {/* ── Dropdown ──────────────────────────────────────────────── */}
            {open && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />

                    <div className="absolute left-0 top-full mt-2 z-30 w-48 bg-brown border border-brown-light/20 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-2 flex flex-col gap-0.5">
                            {branches.map(branch => (
                                <button
                                    key={branch}
                                    type="button"
                                    onClick={() => select(branch)}
                                    className={`
                    flex items-center justify-between px-3 py-2.5 rounded-xl
                    text-sm font-body text-left transition-colors duration-150 cursor-pointer
                    ${value === branch
                                            ? 'bg-primary/15 text-primary'
                                            : 'text-text-light hover:bg-brown-light/10'
                                        }
                  `}
                                >
                                    {branch}
                                    {value === branch && (
                                        <span className="w-4 h-4 rounded-full bg-primary flex items-center justify-center shrink-0">
                                            <span className="w-1.5 h-1.5 rounded-full bg-brand-darker" />
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
