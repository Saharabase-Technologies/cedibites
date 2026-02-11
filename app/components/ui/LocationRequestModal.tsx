'use client';

import { useState, useEffect } from 'react';
import { MapPin, XIcon, MapTrifold, MapPinIcon, MapTrifoldIcon } from '@phosphor-icons/react';
import { useLocation } from '../providers/LocationProvider';

import Button from '../base/Button';
import { useModal } from '../providers/ModalProvider';
import BranchSelectorModal from './BranchSelectorModal';

export default function LocationRequestModal() {
    const { permissionStatus, error, requestLocation } = useLocation();
    const { openBranchSelector } = useModal(); // Get the function to open branch selector
    const [isOpen, setIsOpen] = useState(false);
    const [hasShown, setHasShown] = useState(false);

    // Show modal on mount if location not granted and hasn't been shown
    useEffect(() => {
        const hasSeenLocationPrompt = localStorage.getItem('location-prompt-shown');

        if (!hasSeenLocationPrompt && permissionStatus === 'prompt' && !hasShown) {
            setIsOpen(true);
            setHasShown(true);
        }
    }, [permissionStatus, hasShown]);

    const handleAllow = () => {
        requestLocation();
        localStorage.setItem('location-prompt-shown', 'true');
        setIsOpen(false);
    };

    const handleSkip = () => {
        localStorage.setItem('location-prompt-shown', 'true');
        setIsOpen(false);
    };
    const handleChooseManually = () => {
        localStorage.setItem('location-prompt-shown', 'true');
        setIsOpen(false);
        openBranchSelector();
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-brand-dark/50  backdrop-blur-sm"
                onClick={handleSkip}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="bg-neutral-light dark:bg-brand-darker rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {/* Close Button */}
                    <button
                        onClick={handleSkip}
                        className="absolute cursor-pointer top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full hover:bg-neutral-gray/15 transition-colors"
                    >
                        <XIcon weight='bold' size={24} className="text-text-dark" />
                    </button>

                    {/* Icon */}
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-linear-to-br from-primary to-primary-hover flex items-center justify-center">
                        <MapPinIcon weight="fill" size={40} className="text-white" />
                    </div>

                    {/* Content */}
                    <h2 className="font-brand font-bold text-2xl text-center mb-2 dark:text-text-light text-text-dark">
                        Find Nearest Branch
                    </h2>

                    <p className="text-center leading-5 text-text-gray dark:text-text-light mb-6">
                        We'll use your location to show you the nearest CediBites branch and accurate delivery times.
                    </p>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg">
                            <p className="text-sm text-error text-center">{error}</p>
                        </div>
                    )}


                    {/* Actions */}
                    <div className="space-y-3">
                        <Button
                            variant="primary"
                            size="lg"
                            fullWidth
                            onClick={handleAllow}
                            icon={<MapPinIcon weight="fill" />}
                            iconPosition="left"
                        >
                            Allow Location Access
                        </Button>

                        <Button
                            variant="neutral"
                            size="lg"
                            fullWidth
                            onClick={handleChooseManually}
                            icon={<MapTrifoldIcon weight="fill" />}
                            iconPosition="left"

                        >
                            Choose Manually
                        </Button>
                    </div>

                    {/* Privacy Note */}
                    <p className="text-xs text-center text-neutral-gray dark:text-text-light mt-4">
                        Your location is only used to find nearby branches. We don't store or share it.
                    </p>
                </div>
            </div>

        </>


    );
}