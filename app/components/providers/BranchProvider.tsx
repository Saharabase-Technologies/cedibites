// components/providers/BranchProvider.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Branch {
    id: string;
    name: string;
    address: string;
    coordinates: { latitude: number; longitude: number };
}

interface BranchContextType {
    selectedBranch: Branch | null;
    setSelectedBranch: (branch: Branch) => void;
    clearBranch: () => void;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: ReactNode }) {
    const [selectedBranch, setSelectedBranchState] = useState<Branch | null>(null);

    // Load from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('selected-branch');
        if (stored) {
            setSelectedBranchState(JSON.parse(stored));
        }
    }, []);

    const setSelectedBranch = (branch: Branch) => {
        setSelectedBranchState(branch);
        localStorage.setItem('selected-branch', JSON.stringify(branch));
    };

    const clearBranch = () => {
        setSelectedBranchState(null);
        localStorage.removeItem('selected-branch');
    };

    return (
        <BranchContext.Provider value={{ selectedBranch, setSelectedBranch, clearBranch }}>
            {children}
        </BranchContext.Provider>
    );
}

export function useBranch() {
    const context = useContext(BranchContext);
    if (!context) throw new Error('useBranch must be used within BranchProvider');
    return context;
}