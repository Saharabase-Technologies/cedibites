'use client';

/**
 * Choosing a branch, and what happens to the cart when the new one cannot make
 * everything in it.
 *
 * This flow existed twice — once as two views inside CartDrawer, once as a
 * bottom sheet inside the checkout page — in near-identical copies that had
 * already drifted apart in their copy and their button order. Both called the
 * same no-op remover, so the "remove them and switch" path did nothing in either
 * place; fixing it in one would have left the other broken.
 */

import React, { useCallback, useState } from 'react';
import Image from 'next/image';
import {
    XIcon, ArrowRightIcon, WarningCircleIcon,
    CheckCircleIcon, StorefrontIcon, CaretRightIcon,
} from '@phosphor-icons/react';
import { useCart, type CartItem } from '@/app/components/providers/CartProvider';
import { useBranch, type Branch, type BranchWithDistance } from '@/app/components/providers/BranchProvider';
import { useLocation } from '@/app/components/providers/LocationProvider';
import { getOrderItemLineLabel } from '@/lib/utils/orderItemDisplay';

export interface BranchConflict {
    branch: Branch;
    available: CartItem[];
    unavailable: CartItem[];
}

/**
 * The decision half of the flow, with no opinion about the chrome around it.
 *
 * Selecting a branch that can make everything switches immediately; one that
 * cannot raises a conflict for the caller to render.
 */
export function useBranchSwitch({ onSettled }: { onSettled?: () => void } = {}) {
    const { selectedBranch, setSelectedBranch } = useBranch();
    const { displayItems, validateCartForBranch, removeUnavailableItems } = useCart();

    const [conflict, setConflict] = useState<BranchConflict | null>(null);
    const [removing, setRemoving] = useState(false);

    const selectBranch = useCallback((branch: Branch) => {
        if (branch.id === selectedBranch?.id) {
            onSettled?.();
            return;
        }

        if (displayItems.length === 0) {
            setSelectedBranch(branch);
            onSettled?.();
            return;
        }

        const result = validateCartForBranch(branch.menuItemIds);
        if (result.unavailable.length === 0) {
            setSelectedBranch(branch);
            onSettled?.();
            return;
        }

        setConflict({ branch, ...result });
    }, [selectedBranch, displayItems, validateCartForBranch, setSelectedBranch, onSettled]);

    /**
     * Only switches once the lines are really gone. If the removal fails the
     * customer keeps the branch they had and the toast explains why, rather than
     * landing somewhere that cannot cook what is still in the cart.
     */
    const removeAndSwitch = useCallback(async () => {
        if (!conflict) return;
        setRemoving(true);
        try {
            await removeUnavailableItems(conflict.unavailable.map(i => i.cartItemId));
        } finally {
            setRemoving(false);
        }
        setSelectedBranch(conflict.branch);
        setConflict(null);
        onSettled?.();
    }, [conflict, removeUnavailableItems, setSelectedBranch, onSettled]);

    const keepCurrentBranch = useCallback(() => setConflict(null), []);
    const reset = useCallback(() => { setConflict(null); setRemoving(false); }, []);

    return { conflict, removing, selectBranch, removeAndSwitch, keepCurrentBranch, reset };
}

// ─── Branch list ──────────────────────────────────────────────────────────────

export function BranchList({ onSelect }: { onSelect: (branch: Branch) => void }) {
    const { selectedBranch, branches, getBranchesWithDistance } = useBranch();
    const { coordinates } = useLocation();

    const sorted: BranchWithDistance[] = coordinates
        ? getBranchesWithDistance(coordinates.latitude, coordinates.longitude)
        : branches.map(b => ({ ...b, distance: 0, deliveryTime: '–', isWithinRadius: true }));

    return (
        <div className="flex flex-col gap-3">
            <p className="text-xs text-neutral-gray">
                {coordinates ? 'Sorted by distance. ' : ''}Switching checks your cart for availability.
            </p>
            {sorted.map(branch => {
                const isCurrent = branch.id === selectedBranch?.id;
                const isUnavailable = !branch.isOpen || !branch.isActive;
                return (
                    <button key={branch.id} onClick={() => onSelect(branch)} disabled={isUnavailable}
                        className={`w-full flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all
                            ${isCurrent ? 'border-primary bg-primary/8' : 'border-neutral-gray/15 hover:border-primary/30'}
                            ${isUnavailable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5
                            ${isCurrent ? 'bg-primary text-white' : 'bg-neutral-gray/15 text-neutral-gray'}`}>
                            <StorefrontIcon weight="fill" size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className={`text-sm font-bold ${isCurrent ? 'text-primary' : 'text-text-dark dark:text-text-light'}`}>
                                    {branch.name} Branch
                                </p>
                                {isCurrent && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary text-white">Current</span>}
                                {!branch.isActive && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-error/15 text-error">Inactive</span>}
                                {branch.isActive && !branch.isOpen && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-neutral-gray/20 text-neutral-gray">Closed</span>}
                            </div>
                            <p className="text-xs text-neutral-gray mt-0.5 truncate">{branch.address}</p>
                            <div className="flex items-center gap-2 mt-1.5 text-xs text-neutral-gray flex-wrap">
                                {coordinates && <><span>{branch.distance.toFixed(1)} km</span><span>·</span></>}
                                <span>{branch.deliveryTime}</span>
                            </div>
                        </div>
                        {!isCurrent && !isUnavailable && <CaretRightIcon size={16} className="text-neutral-gray shrink-0 mt-1" />}
                    </button>
                );
            })}
        </div>
    );
}

// ─── Conflict panel ───────────────────────────────────────────────────────────

function ConflictLine({ cartItem, kind }: { cartItem: CartItem; kind: 'gone' | 'kept' }) {
    const gone = kind === 'gone';
    return (
        <div className={`flex items-center gap-3 rounded-xl p-3 border ${gone ? 'bg-error/5 border-error/15' : 'bg-secondary/5 border-secondary/15'}`}>
            <div className={`relative w-10 h-10 rounded-xl overflow-hidden shrink-0 ${gone ? 'bg-error/10' : 'bg-secondary/10'}`}>
                {cartItem.item.image
                    ? <Image src={cartItem.item.image} alt={cartItem.item.name} fill sizes="40px" className="object-cover" />
                    : <div className="w-full h-full" />}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-dark dark:text-text-light truncate">
                    {getOrderItemLineLabel({ name: cartItem.item.name, sizeLabel: cartItem.sizeLabel })}
                </p>
                <p className="text-xs text-neutral-gray">Qty {cartItem.quantity}</p>
            </div>
            {gone
                ? <XIcon size={14} weight="bold" className="text-error shrink-0" />
                : <CheckCircleIcon size={14} weight="fill" className="text-secondary shrink-0" />}
        </div>
    );
}

export function BranchConflictPanel({ conflict, removing, onRemoveAndSwitch, onKeepCurrent, onPickAnother }: {
    conflict: BranchConflict;
    removing: boolean;
    onRemoveAndSwitch: () => void;
    onKeepCurrent: () => void;
    onPickAnother: () => void;
}) {
    const { selectedBranch } = useBranch();
    const count = conflict.unavailable.length;
    const plural = count !== 1;

    return (
        <div className="flex flex-col gap-5">
            <div className="flex items-start gap-3 bg-warning/10 border border-warning/25 rounded-2xl p-4">
                <WarningCircleIcon weight="fill" size={20} className="text-warning shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-bold text-text-dark dark:text-text-light">
                        {count} item{plural ? 's' : ''} not available at {conflict.branch.name} Branch
                    </p>
                    <p className="text-xs text-neutral-gray mt-1">
                        Remove {plural ? 'them' : 'it'} to switch, or stay at your current branch.
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-neutral-gray uppercase tracking-wide">Won&apos;t be available</p>
                {conflict.unavailable.map(ci => <ConflictLine key={ci.cartItemId} cartItem={ci} kind="gone" />)}
            </div>

            {conflict.available.length > 0 && (
                <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-neutral-gray uppercase tracking-wide">Still available</p>
                    {conflict.available.map(ci => <ConflictLine key={ci.cartItemId} cartItem={ci} kind="kept" />)}
                </div>
            )}

            <div className="flex flex-col gap-3 pt-1 pb-2">
                <button onClick={onRemoveAndSwitch} disabled={removing}
                    className="w-full flex items-center justify-between bg-primary hover:bg-primary-hover disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold px-5 py-4 rounded-2xl transition-all active:scale-[0.98] cursor-pointer">
                    <span>{removing ? 'Removing…' : `Remove ${count} item${plural ? 's' : ''} & switch`}</span>
                    <ArrowRightIcon weight="bold" size={16} />
                </button>
                <button onClick={onKeepCurrent} disabled={removing}
                    className="w-full border-2 border-neutral-gray/20 text-text-dark dark:text-text-light font-bold px-5 py-3.5 rounded-2xl hover:border-primary/40 hover:text-primary transition-all cursor-pointer disabled:opacity-70">
                    Keep {selectedBranch?.name} Branch
                </button>
                <button onClick={onPickAnother} disabled={removing}
                    className="w-full text-sm font-semibold text-neutral-gray hover:text-primary transition-colors py-2 cursor-pointer disabled:opacity-70">
                    Pick a different branch
                </button>
            </div>
        </div>
    );
}
