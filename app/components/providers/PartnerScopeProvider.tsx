'use client';

import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { useStaffAuth } from './StaffAuthProvider';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Either every assigned branch ('all') or one specific branch id. */
export type PartnerScope = 'all' | number;

export interface PartnerBranch {
    id: number;
    name: string;
}

interface PartnerScopeValue {
    /** Branches this partner is assigned to (normalised ids). */
    branches: PartnerBranch[];
    /** Whether the partner is assigned to more than one branch. */
    hasMultiple: boolean;
    /** Current selection. */
    scope: PartnerScope;
    setScope: (scope: PartnerScope) => void;
    isAll: boolean;
    /** Resolved single branch id when a specific branch is selected, else undefined. */
    branchId: number | undefined;
    /** Branch ids to query — all assigned when scope is 'all', else the single id. */
    branchIds: number[];
    /** First assigned branch id — fallback for single-branch-only views. */
    primaryBranchId: number | undefined;
    /** Human label for the current scope (e.g. "All Branches" or a branch name). */
    scopeLabel: string;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const PartnerScopeContext = createContext<PartnerScopeValue | null>(null);

const STORAGE_KEY = 'cedibites_partner_scope';

// ─── Provider ─────────────────────────────────────────────────────────────────

export function PartnerScopeProvider({ children }: { children: ReactNode }) {
    const { staffUser } = useStaffAuth();

    const branches = useMemo<PartnerBranch[]>(
        () =>
            (staffUser?.branches ?? [])
                .map(b => ({ id: Number(b.id), name: b.name }))
                .filter(b => Number.isFinite(b.id)),
        [staffUser?.branches]
    );

    const branchIdSet = useMemo(() => new Set(branches.map(b => b.id)), [branches]);
    const hasMultiple = branches.length > 1;

    // Default: 'all' when multi-branch, otherwise the only branch.
    const defaultScope = useCallback((): PartnerScope => {
        if (branches.length === 1) return branches[0].id;
        return 'all';
    }, [branches]);

    const [scope, setScopeState] = useState<PartnerScope>('all');

    // Hydrate from storage once branches are known; discard stale/invalid values.
    useEffect(() => {
        if (branches.length === 0) return;

        let next = defaultScope();
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw === 'all') {
                next = hasMultiple ? 'all' : branches[0].id;
            } else if (raw !== null) {
                const id = Number(raw);
                if (branchIdSet.has(id)) next = id;
            }
        } catch {
            /* localStorage unavailable — fall back to default */
        }
        setScopeState(next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [branches.length, hasMultiple]);

    const setScope = useCallback((next: PartnerScope) => {
        setScopeState(next);
        try {
            localStorage.setItem(STORAGE_KEY, next === 'all' ? 'all' : String(next));
        } catch {
            /* ignore */
        }
    }, []);

    const value = useMemo<PartnerScopeValue>(() => {
        const isAll = scope === 'all';
        const primaryBranchId = branches[0]?.id;
        const branchId = isAll ? undefined : (scope as number);
        const branchIds = isAll ? branches.map(b => b.id) : [scope as number];
        const scopeLabel = isAll
            ? 'All Branches'
            : (branches.find(b => b.id === scope)?.name ?? '');

        return {
            branches,
            hasMultiple,
            scope,
            setScope,
            isAll,
            branchId,
            branchIds,
            primaryBranchId,
            scopeLabel,
        };
    }, [scope, branches, hasMultiple, setScope]);

    return <PartnerScopeContext.Provider value={value}>{children}</PartnerScopeContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePartnerScope(): PartnerScopeValue {
    const ctx = useContext(PartnerScopeContext);
    if (!ctx) {
        throw new Error('usePartnerScope must be used within a PartnerScopeProvider');
    }
    return ctx;
}
