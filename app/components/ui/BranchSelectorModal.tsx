'use client';

import { useEffect, useState } from 'react';
import { XIcon, MagnifyingGlassIcon, MapPinIcon, ClockIcon, PhoneIcon, GpsFixIcon } from '@phosphor-icons/react';
import { useModal } from '../providers/ModalProvider';
import { useBranch, type Branch } from '../providers/BranchProvider';
import { useLocation } from '../providers/LocationProvider';

export default function BranchSelectorModal() {
    const { isBranchSelectorOpen, closeBranchSelector } = useModal();
    const [searchQuery, setSearchQuery] = useState('');
    const [isRequestingLocation, setIsRequestingLocation] = useState(false);
    const { setSelectedBranch, selectNearestBranchNow, branches, isLoading } = useBranch();
    const { requestLocation, permissionStatus, coordinates, error } = useLocation();

    const handleUseMyLocation = () => {
        setIsRequestingLocation(true);
        requestLocation();
    };

    useEffect(() => {
        if (isRequestingLocation && coordinates && permissionStatus === 'granted') {
            selectNearestBranchNow();
            setTimeout(() => {
                setIsRequestingLocation(false);
                closeBranchSelector();
            }, 800);
        }
        if (isRequestingLocation && permissionStatus === 'denied') {
            setIsRequestingLocation(false);
        }
    }, [coordinates, permissionStatus, isRequestingLocation, selectNearestBranchNow, closeBranchSelector]);

    // Reset search when modal closes
    useEffect(() => {
        if (!isBranchSelectorOpen) setSearchQuery('');
    }, [isBranchSelectorOpen]);

    const filteredBranches = branches.filter(
        (b) =>
            b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (b.area?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            b.address.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelectBranch = (branch: Branch) => {
        setSelectedBranch(branch);
        closeBranchSelector();
    };

    if (!isBranchSelectorOpen) return null;

    return (
        // ✅ Single wrapper — backdrop + centering in one element, no duplicate z-50 divs
        <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={closeBranchSelector}
        >
            {/* Modal panel — stop propagation so inside clicks don't close */}
            <div
                className="bg-neutral-light dark:bg-brand-darker rounded-t-3xl sm:rounded-3xl max-w-2xl w-full max-h-[90vh] sm:max-h-[80vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-neutral-gray/20">
                    <div>
                        <h2 className="font-brand text-2xl text-text-dark dark:text-text-light">
                            Choose Your Branch
                        </h2>
                        <p className="text-sm text-text-gray dark:text-text-light mt-1">
                            Select the nearest CediBites location
                        </p>
                    </div>
                    <button
                        onClick={closeBranchSelector}
                        className="w-10 h-10 flex cursor-pointer items-center justify-center rounded-full hover:bg-neutral-gray/15 transition-colors"
                        aria-label="Close"
                    >
                        <XIcon size={24} className="text-text-gray dark:text-text-light" />
                    </button>
                </div>

                {/* Search */}
                <div className="px-6 pt-4">
                    <div className="relative">
                        <MagnifyingGlassIcon
                            size={20}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-gray"
                        />
                        <input
                            type="text"
                            placeholder="Search by name, area, or address..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-brand-dark border-2 border-neutral-gray/20 dark:border-neutral-gray/30 focus:border-primary rounded-full text-text-dark dark:text-text-light transition-all outline-none"
                        />
                    </div>
                </div>

                {/* Use My Location */}
                <button
                    onClick={handleUseMyLocation}
                    disabled={isRequestingLocation}
                    className="mx-6 mt-3 cursor-pointer mb-1 flex items-center justify-center gap-2 py-2.5 rounded-full border border-primary/30 hover:bg-primary/10 transition-colors disabled:opacity-60"
                >
                    <GpsFixIcon size={20} className="text-primary" weight="bold" />
                    <span className="text-text-dark dark:text-text-light font-semibold text-sm">
                        {isRequestingLocation ? 'Getting location...' : 'Use My Location'}
                    </span>
                </button>

                {error && !isRequestingLocation && (
                    <p className="text-xs text-error text-center px-6 mb-1">{error}</p>
                )}

                {/* Divider */}
                <div className="mx-6 mt-2 mb-0 border-b border-neutral-gray/20" />

                {/* Branch List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-text-gray dark:text-text-light">
                                Loading branches...
                            </p>
                        </div>
                    ) : filteredBranches.length === 0 ? (
                        <div className="text-center py-12">
                            <MapPinIcon size={48} className="mx-auto mb-4 text-neutral-gray/40" />
                            <p className="text-text-gray dark:text-text-light">
                                {searchQuery ? `No branches found matching "${searchQuery}"` : 'No branches available'}
                            </p>
                        </div>
                    ) : (
                        filteredBranches.map((branch) => (
                            <button
                                key={branch.id}
                                onClick={() => handleSelectBranch(branch)}
                                disabled={!branch.isOpen}
                                className="w-full text-left p-4 rounded-xl border-2 border-neutral-gray/20 dark:border-neutral-gray/30 hover:border-primary bg-white dark:bg-brand-dark hover:bg-neutral-light dark:hover:bg-brown transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 flex-shrink-0 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center">
                                        <MapPinIcon weight="fill" size={24} className="text-white" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <h3 className="font-semibold text-text-dark dark:text-text-light group-hover:text-primary transition-colors">
                                                {branch.name}
                                            </h3>
                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full flex-shrink-0 ${branch.isOpen
                                                ? 'bg-secondary/20 text-secondary dark:bg-secondary dark:text-white'
                                                : 'bg-error/20 text-error dark:bg-error dark:text-white'
                                                }`}>
                                                {branch.isOpen ? 'Open' : 'Closed'}
                                            </span>
                                        </div>

                                        <p className="text-sm text-text-gray dark:text-text-light mb-2">
                                            {branch.address}
                                        </p>

                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-gray dark:text-text-light/70">
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
    );
}