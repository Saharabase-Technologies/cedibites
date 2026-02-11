'use client';

import { useEffect, useState, useCallback } from 'react';
import { MagnifyingGlass, MapPin, XIcon, Clock, Phone, MagnifyingGlassIcon, MapPinIcon, ClockIcon, PhoneIcon, GpsFixIcon } from '@phosphor-icons/react';
import { useModal } from '../providers/ModalProvider';
import { useBranch } from '../providers/BranchProvider';
import Button from '../base/Button';
import { useLocation } from '../providers/LocationProvider';


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

    // Get state from providers
    const { isBranchSelectorOpen, closeBranchSelector } = useModal();
    const [isOpen, setIsOpen] = useState(true);
    const [hasShown, setHasShown] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isRequestingLocation, setIsRequestingLocation] = useState(false);
    const { setSelectedBranch, getBranchesWithDistance, selectNearestBranchNow } = useBranch();
    const { requestLocation, permissionStatus, coordinates, error } = useLocation();
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

    // Handle "Use My Location" click
    const handleUseMyLocation = async () => {
        setIsRequestingLocation(true);
        requestLocation();
    };

    useEffect(() => {
        if (isRequestingLocation && coordinates && permissionStatus === 'granted') {
            console.log('Location obtained in modal, forcing branch selection...');

            // 👇 FORCE BRANCH SELECTION
            selectNearestBranchNow();

            // Close modal after short delay
            setTimeout(() => {
                setIsRequestingLocation(false);
                closeBranchSelector();
            }, 800);
        }

        if (isRequestingLocation && permissionStatus === 'denied') {
            setIsRequestingLocation(false);
        }
    }, [coordinates, permissionStatus, isRequestingLocation, selectNearestBranchNow, closeBranchSelector]);




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
                <div className="bg-neutral-light dark:bg-brand-darker rounded-t-3xl sm:rounded-3xl max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-neutral-gray">
                        <div>
                            <h2 className="font-brand dark:text-text-light text-2xl text-text-dark">
                                Choose Your Branch
                            </h2>
                            <p className="text-sm dark:text-text-light text-text-gray mt-1">
                                Select the nearest CediBites location
                            </p>
                        </div>
                        <button
                            onClick={closeBranchSelector}
                            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--color-bg-secondary)] transition-colors"
                            aria-label="Close"
                        >
                            <XIcon size={24} className="text-[var(--color-text-secondary)]" />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="pt-6 px-6 border- ">
                        <div className="relative">
                            <MagnifyingGlassIcon
                                size={20}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-text-gray dark:text-neutral-gray"
                            />
                            <input
                                type="text"
                                placeholder="Search by name, area, or address..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-[var(--color-bg-secondary)] dark:text-text-light border-2 border-text-text-gray dark:border-text-light focus:border-primary rounded-full text-[var(--color-text-primary)] transition-all outline-none"
                            />
                        </div>
                    </div>

                    <div onClick={handleUseMyLocation}
                        className=' py-2 px-6 text wifull flex items-center justify-center gap-2 border-b border-neutral-gray cursor-pointer hover:bg-[var(--color-bg-secondary)] transition-all'>
                        <div className='w-full hover:bg-primary-hover/15 dark:hover:bg-primary-hover/10 mx-auto flex items-center justify-center gap-2 rounded-full border-transparent py-2 '>
                            <GpsFixIcon className='dark:text-text-light text-text-dark font-bold' size={24} />
                            <p className='dark:text-text-light text-text-dark font-bold'>Use My Location</p>
                        </div>
                        {/* Error Message */}
                        {error && !isRequestingLocation && (
                            <p className="text-xs text-error mt-2 text-center">
                                {error}
                            </p>
                        )}
                    </div>

                    {/* Branch List */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-3">
                        {filteredBranches.length === 0 ? (
                            <div className="text-center py-12">
                                <MapPinIcon
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
                                    className="w-full text-left p-4 rounded-xl border-2 border-[var(--color-border)] dark:border-neutral-gray hover:border-primary bg-[var(--color-surface)] hover:bg-[var(--color-bg-secondary)] transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Icon */}
                                        <div className="w-12 h-12 flex-shrink-0 rounded-full bg-linear-to-br from-primary to-primary-hover flex items-center justify-center">
                                            <MapPinIcon weight="fill" size={24} className="text-white" />
                                        </div>

                                        {/* Branch Info */}
                                        <div className="flex-1 cursor-pointer min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h3 className="font-semibold dark:text-text-light text-text-dark group-hover:text-primary transition-colors">
                                                    {branch.name}
                                                </h3>
                                                {branch.isOpen ? (
                                                    <span className="px-2 py-0.5 bg-secondary/20 text-secondary  dark:bg-secondary dark:text-text-light text-xs font-semibold rounded-full flex-shrink-0">
                                                        Open
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-error/20 text-error  dark:bg-error dark:text-text-light text-xs font-semibold rounded-full flex-shrink-0">
                                                        Closed
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-sm dark:text-text-light text-text-dark mb-2">
                                                {branch.address}
                                            </p>

                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs dark:text-text-light text-text-dark">
                                                <span className="flex items-center gap-1">
                                                    <PhoneIcon size={12} weight="fill" />
                                                    {branch.phone}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <ClockIcon size={12} weight="fill" />
                                                    {branch.operatingHours}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <MapPinIcon size={12} weight="fill" />
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