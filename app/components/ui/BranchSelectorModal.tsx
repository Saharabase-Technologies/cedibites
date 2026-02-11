'use client';

import { useState } from 'react';
import { MagnifyingGlass, MapPin, X, Clock, Phone, MagnifyingGlassIcon } from '@phosphor-icons/react';
import { useModal } from '../providers/ModalProvider';
import { useBranch } from '../providers/BranchProvider';

interface Branch {
    id: string;
    name: string;
    address: string;
    area: string;
    phone: string;
    coordinates: {
        latitude: number;
        longitude: number;
    };
    deliveryRadius: number;
    operatingHours: string;
    isOpen: boolean;
}

// 👇 No props needed - component manages its own state
export default function BranchSelectorModal() {
    const [searchQuery, setSearchQuery] = useState('');

    // Get state from providers
    const { isBranchSelectorOpen, closeBranchSelector } = useModal();
    const { setSelectedBranch } = useBranch();

    // Branches data
    const branches: Branch[] = [
        {
            id: '1',
            name: 'Osu Branch',
            address: '123 Oxford Street, Osu',
            area: 'Osu',
            phone: '+233 24 123 4567',
            coordinates: { latitude: 5.5557, longitude: -0.1769 },
            deliveryRadius: 5,
            operatingHours: '8:00 AM - 10:00 PM',
            isOpen: true,
        },
        {
            id: '2',
            name: 'East Legon Branch',
            address: '45 American House, East Legon',
            area: 'East Legon',
            phone: '+233 50 987 6543',
            coordinates: { latitude: 5.6465, longitude: -0.1549 },
            deliveryRadius: 5,
            operatingHours: '8:00 AM - 11:00 PM',
            isOpen: true,
        },
        {
            id: '3',
            name: 'Spintex Branch',
            address: '78 Spintex Road',
            area: 'Spintex',
            phone: '+233 20 555 1234',
            coordinates: { latitude: 5.6372, longitude: -0.0924 },
            deliveryRadius: 4,
            operatingHours: '9:00 AM - 9:00 PM',
            isOpen: false,
        },
        {
            id: '4',
            name: 'Tema Branch',
            address: 'Community 1, Tema',
            area: 'Tema',
            phone: '+233 24 777 8888',
            coordinates: { latitude: 5.6698, longitude: -0.0166 },
            deliveryRadius: 6,
            operatingHours: '8:00 AM - 10:00 PM',
            isOpen: true,
        },
        {
            id: '5',
            name: 'Madina Branch',
            address: 'Remy Junction, Madina',
            area: 'Madina',
            phone: '+233 55 444 3333',
            coordinates: { latitude: 5.6805, longitude: -0.1665 },
            deliveryRadius: 5,
            operatingHours: '8:00 AM - 10:00 PM',
            isOpen: true,
        },
    ];

    // Filter branches
    const filteredBranches = branches.filter(
        (branch) =>
            branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            branch.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
            branch.address.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Handle branch selection
    const handleSelectBranch = (branch: Branch) => {
        setSelectedBranch(branch);
        closeBranchSelector();
    };

    // Don't render if modal is not open
    if (!isBranchSelectorOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
                onClick={closeBranchSelector}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                <div className="bg-neutral-light rounded-t-3xl sm:rounded-3xl max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--color-border)]">
                        <div>
                            <h2 className="font-brand text-2xl text-text-dark">
                                Choose Your Branch
                            </h2>
                            <p className="text-sm text-text-gray mt-1">
                                Select the nearest CediBites location
                            </p>
                        </div>
                        <button
                            onClick={closeBranchSelector}
                            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--color-bg-secondary)] transition-colors"
                            aria-label="Close"
                        >
                            <X size={24} className="text-[var(--color-text-secondary)]" />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="pt-6 px-6 border- ">
                        <div className="relative">
                            <MagnifyingGlassIcon
                                size={20}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]"
                            />
                            <input
                                type="text"
                                placeholder="Search by name, area, or address..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-[var(--color-bg-secondary)] border-2 border-text-text-gray focus:border-primary rounded-full text-[var(--color-text-primary)] transition-all outline-none"
                            />
                        </div>
                    </div>

                    {/* Branch List */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-3">
                        {filteredBranches.length === 0 ? (
                            <div className="text-center py-12">
                                <MapPin
                                    size={48}
                                    className="mx-auto mb-4 text-[var(--color-text-tertiary)]"
                                />
                                <p className="text-[var(--color-text-secondary)]">
                                    No branches found matching "{searchQuery}"
                                </p>
                            </div>
                        ) : (
                            filteredBranches.map((branch) => (
                                <button
                                    key={branch.id}
                                    onClick={() => handleSelectBranch(branch)}
                                    disabled={!branch.isOpen}
                                    className="w-full text-left p-4 rounded-xl border-2 border-[var(--color-border)] hover:border-primary bg-[var(--color-surface)] hover:bg-[var(--color-bg-secondary)] transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Icon */}
                                        <div className="w-12 h-12 flex-shrink-0 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                                            <MapPin weight="fill" size={24} className="text-white" />
                                        </div>

                                        {/* Branch Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h3 className="font-semibold text-[var(--color-text-primary)] group-hover:text-primary transition-colors">
                                                    {branch.name}
                                                </h3>
                                                {branch.isOpen ? (
                                                    <span className="px-2 py-0.5 bg-secondary/20 text-secondary text-xs font-semibold rounded-full flex-shrink-0">
                                                        Open
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-error/20 text-error text-xs font-semibold rounded-full flex-shrink-0">
                                                        Closed
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                                                {branch.address}
                                            </p>

                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-tertiary)]">
                                                <span className="flex items-center gap-1">
                                                    <Phone size={12} weight="fill" />
                                                    {branch.phone}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} weight="fill" />
                                                    {branch.operatingHours}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <MapPin size={12} weight="fill" />
                                                    {branch.deliveryRadius}km radius
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}