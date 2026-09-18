'use client';

import React from 'react';

/**
 * The two small controls every customer screen shares.
 *
 * The cart and checkout used to have one link style, bold underlined text, for
 * every secondary action: Change, Change, Change, Use where I am now, Add a note,
 * Add something else, Order from another branch. Eight of them across five
 * screens, all at the same volume, so none of them read as more important than
 * any other and none of them looked like something you could press.
 *
 * So there are two kinds of button now. The big red one at the foot, and this.
 * Hard corners from the radius tokens, because the brand has no pills.
 */

/**
 * The look on its own, for a row that is itself the button and only needs the
 * word "Change" to look pressable. Pair it with `group` on the row.
 */
export const smallActionLook =
    'inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-surface-sunken px-3.5 ' +
    'text-[13px] font-bold text-fg transition-colors duration-150 ease-out';

export function SmallAction({ onClick, disabled, children, className = '' }: {
    onClick: () => void;
    disabled?: boolean;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`${smallActionLook} hover:bg-fg/10 disabled:opacity-50 ${className}`}
        >
            {children}
        </button>
    );
}

/**
 * A state, sitting beside the thing it describes.
 *
 * Yellow is attention, so this is for what somebody needs to notice before they
 * carry on: a closed branch, a dish this kitchen cannot make. It matches the
 * Default badge on the account page.
 */
export function AttentionBadge({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex shrink-0 items-center rounded-lg bg-accent px-1.5 py-0.5 text-[11px] font-bold uppercase leading-tight tracking-[0.06em] text-on-accent">
            {children}
        </span>
    );
}

/** Whether a branch can take an order, said beside its name. Nothing when it can. */
export function BranchStateBadge({ branch }: { branch: { isActive: boolean; isOpen: boolean } | null | undefined }) {
    if (!branch) return null;
    if (!branch.isActive) return <AttentionBadge>Not taking orders</AttentionBadge>;
    if (!branch.isOpen) return <AttentionBadge>Closed</AttentionBadge>;
    return null;
}
