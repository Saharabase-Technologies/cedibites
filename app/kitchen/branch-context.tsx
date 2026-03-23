'use client';

import { createContext, useContext, useCallback, useState, type ReactNode } from 'react';

const KITCHEN_BRANCH_KEY = 'cedibites-kitchen-branchId';

export { KITCHEN_BRANCH_KEY };

interface KitchenBranchContextValue {
    branchId: string | null;
    switchBranch: (id: string) => void;
}

const KitchenBranchContext = createContext<KitchenBranchContextValue | null>(null);

export function useSwitchKitchenBranch(): KitchenBranchContextValue {
    const ctx = useContext(KitchenBranchContext);
    if (!ctx) throw new Error('useSwitchKitchenBranch must be used within KitchenBranchProvider');
    return ctx;
}

export function KitchenBranchProvider({ children }: { children: ReactNode }) {
    const [branchId, setBranchId] = useState<string | null>(() =>
        typeof window !== 'undefined' ? localStorage.getItem(KITCHEN_BRANCH_KEY) : null
    );

    const switchBranch = useCallback((id: string) => {
        localStorage.setItem(KITCHEN_BRANCH_KEY, id);
        setBranchId(id);
    }, []);

    return (
        <KitchenBranchContext.Provider value={{ branchId, switchBranch }}>
            {children}
        </KitchenBranchContext.Provider>
    );
}
