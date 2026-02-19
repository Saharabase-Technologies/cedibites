'use client';

import { createContext, useContext, ReactNode } from 'react';

interface StaffAuthContextType {
    isAuthenticated: boolean;
}

const StaffAuthContext = createContext<StaffAuthContextType | undefined>(undefined);

export function StaffAuthProvider({ children }: { children: ReactNode }) {
    return (
        <StaffAuthContext.Provider value={{ isAuthenticated: false }}>
            {children}
        </StaffAuthContext.Provider>
    );
}

export function useStaffAuth() {
    const ctx = useContext(StaffAuthContext);
    if (!ctx) throw new Error('useStaffAuth must be used within StaffAuthProvider');
    return ctx;
}
