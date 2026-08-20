'use client';

import { useEffect, useRef, useState } from 'react';
import { BuildingsIcon, CaretDownIcon, CheckIcon, StackIcon } from '@phosphor-icons/react';
import { usePartnerScope, type PartnerScope } from '@/app/components/providers/PartnerScopeProvider';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BranchScopeSelectorProps {
    className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * The on-page "what am I looking at" control for the partner portal.
 *
 * Every figure on the dashboard, ledger and analytics screens is scoped to the
 * partner's branch selection, so that selection has to be visible on the screen
 * it governs — not only in the desktop sidebar, which is hidden on mobile
 * entirely. Reads and writes the shared `PartnerScopeProvider`, so this and the
 * sidebar switcher are always the same control wearing two faces.
 */
export default function BranchScopeSelector({ className = '' }: BranchScopeSelectorProps) {
    const { branches, hasMultiple, scope, setScope, scopeLabel, isAll } = usePartnerScope();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Dismiss on Escape or a click outside the control.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        const onPointer = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('mousedown', onPointer);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('mousedown', onPointer);
        };
    }, [open]);

    if (branches.length === 0) return null;

    const selectedAll = hasMultiple && isAll;
    const label = selectedAll ? 'All Branches' : (scopeLabel || branches[0]?.name || '');
    // Nothing to switch between — a plain, unmistakable statement of scope.
    if (!hasMultiple) {
        return (
            <div className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-neutral-card border border-[#f0e8d8] ${className}`}>
                <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <BuildingsIcon size={16} weight="fill" className="text-primary" />
                </span>
                <span className="min-w-0 text-left">
                    <span className="block text-neutral-gray text-[10px] font-bold font-body uppercase tracking-widest leading-none">Viewing</span>
                    <span className="block text-text-dark text-sm font-bold font-body truncate mt-1 leading-none">{label}</span>
                </span>
            </div>
        );
    }

    const options: { value: PartnerScope; label: string; hint: string }[] = [
        { value: 'all', label: 'All Branches', hint: `${branches.length} branches combined` },
        ...branches.map(b => ({ value: b.id as PartnerScope, label: b.name, hint: 'Single branch' })),
    ];

    return (
        <div ref={ref} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={`Viewing ${label}. Change branch.`}
                className={`w-full sm:w-auto sm:min-w-[15rem] flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border bg-neutral-card transition-colors cursor-pointer ${
                    open ? 'border-primary shadow-sm' : 'border-[#f0e8d8] hover:border-primary/40'
                }`}
            >
                <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    {selectedAll
                        ? <StackIcon size={16} weight="fill" className="text-primary" />
                        : <BuildingsIcon size={16} weight="fill" className="text-primary" />}
                </span>
                <span className="min-w-0 flex-1 text-left">
                    <span className="block text-neutral-gray text-[10px] font-bold font-body uppercase tracking-widest leading-none">Viewing</span>
                    <span className="block text-text-dark text-sm font-bold font-body truncate mt-1 leading-none">{label}</span>
                </span>
                <CaretDownIcon size={13} weight="bold" className={`text-neutral-gray shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div
                    role="listbox"
                    aria-label="Branch scope"
                    className="absolute left-0 right-0 sm:right-auto sm:min-w-full top-full mt-2 z-40 bg-neutral-card border border-[#f0e8d8] rounded-2xl shadow-lg overflow-hidden py-1.5"
                >
                    {options.map(opt => {
                        const active = opt.value === scope;
                        return (
                            <button
                                key={String(opt.value)}
                                type="button"
                                role="option"
                                aria-selected={active}
                                onClick={() => { setScope(opt.value); setOpen(false); }}
                                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors cursor-pointer ${
                                    active ? 'bg-primary/5' : 'hover:bg-neutral-light'
                                }`}
                            >
                                <span className="min-w-0 flex-1">
                                    <span className={`block text-[13px] font-body truncate ${active ? 'text-primary font-bold' : 'text-text-dark font-semibold'}`}>{opt.label}</span>
                                    <span className="block text-neutral-gray text-[11px] font-body truncate mt-0.5">{opt.hint}</span>
                                </span>
                                {active && <CheckIcon size={14} weight="bold" className="text-primary shrink-0" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export { type BranchScopeSelectorProps };
