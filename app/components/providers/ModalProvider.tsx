'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface ModalContextType {
    // Branch Selector Modal
    isBranchSelectorOpen: boolean;
    openBranchSelector: () => void;
    closeBranchSelector: () => void;

    // Location Request Modal
    isLocationModalOpen: boolean;
    openLocationModal: () => void;
    closeLocationModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
    const [isBranchSelectorOpen, setIsBranchSelectorOpen] = useState(false);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

    // Branch Selector Modal Functions
    const openBranchSelector = () => {
        setIsBranchSelectorOpen(true);
        setIsLocationModalOpen(false);
        console.log('modal should open now');// Close location modal when opening branch selector
    };

    const closeBranchSelector = () => {
        setIsBranchSelectorOpen(false);
    };

    // Location Modal Functions
    const openLocationModal = () => {
        setIsLocationModalOpen(true);
        setIsBranchSelectorOpen(false); // Close branch selector when opening location modal
    };

    const closeLocationModal = () => {
        setIsLocationModalOpen(false);
    };

    return (
        <ModalContext.Provider
            value={{
                isBranchSelectorOpen,
                openBranchSelector,
                closeBranchSelector,
                isLocationModalOpen,
                openLocationModal,
                closeLocationModal,
            }}
        >
            {children}
        </ModalContext.Provider>
    );
}

// Hook to use the modal functions
export function useModal() {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error('useModal must be used within ModalProvider');
    }
    return context;
}
