'use client';

import { useEffect, useState } from 'react';
import { CaretDownIcon, MapPinIcon, CoffeeIcon, SunIcon, MoonStarsIcon, type Icon } from '@phosphor-icons/react';
import { useBranch } from '../providers/BranchProvider';
import { useLocation } from '../providers/LocationProvider';
import { useModal } from '../providers/ModalProvider';
import { formatDistance } from '@/lib/utils/distance';

/**
 * Slim welcome row — replaces the tall gold greeting card. Gold accent on the
 * time-of-day label keeps the brand warmth without the vertical bulk. Fully
 * token-driven (flips light/dark), wraps gracefully on mobile.
 */
export default function GreetingBar() {
    const [greeting, setGreeting] = useState('Good evening');
    const [GreetIcon, setGreetIcon] = useState<Icon>(() => MoonStarsIcon);
    const { selectedBranch, getBranchesWithDistance } = useBranch();
    const { coordinates } = useLocation();
    const { openBranchSelector } = useModal();

    useEffect(() => {
        const h = new Date().getHours();
        if (h < 12) { setGreeting('Good morning'); setGreetIcon(() => CoffeeIcon); }
        else if (h < 17) { setGreeting('Good afternoon'); setGreetIcon(() => SunIcon); }
        else { setGreeting('Good evening'); setGreetIcon(() => MoonStarsIcon); }
    }, []);

    const distance = coordinates && selectedBranch
        ? getBranchesWithDistance(coordinates.latitude, coordinates.longitude).find(b => b.id === selectedBranch.id)?.distance
        : null;

    const isOpen = (() => {
        if (!selectedBranch?.operatingHours) return null;
        const h = new Date().getHours();
        return h >= 9 && h < 22;
    })();

    return (
        <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Greeting */}
            <div className="flex items-center gap-3 min-w-0">
                <span className="flex w-10 h-10 md:w-11 md:h-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
                    style={{ background: 'linear-gradient(135deg, var(--cb-gold-400), var(--cb-gold-600))' }}>
                    <GreetIcon weight="fill" size={22} />
                </span>
                <div className="min-w-0">
                    <p className="text-xs md:text-sm font-extrabold tracking-wide text-tertiary leading-none mb-1.5">
                        {greeting}
                    </p>
                    <h1 className="text-lg md:text-2xl font-extrabold text-fg-muted leading-tight">
                        What would you like?
                    </h1>
                </div>
            </div>

            {/* Branch selector + status */}
            <div className="flex items-center gap-2 shrink-0">
                <button
                    onClick={openBranchSelector}
                    className="group cb-press inline-flex items-center gap-1.5 text-fg hover:text-primary transition-colors"
                    aria-label={selectedBranch ? 'Change branch' : 'Select branch'}
                >
                    <MapPinIcon weight="fill" size={16} className="text-primary shrink-0" />
                    <span className="text-sm font-bold truncate max-w-40">
                        {selectedBranch ? selectedBranch.name.replace(' Branch', '') : 'Select Branch'}
                    </span>
                    {distance != null && (
                        <span className="text-xs font-semibold text-fg-subtle whitespace-nowrap">· {formatDistance(distance)}</span>
                    )}
                    <CaretDownIcon weight="bold" size={12} className="text-fg-subtle shrink-0 group-hover:text-primary transition-colors" />
                </button>

                {selectedBranch && isOpen !== null && (
                    <span className={`hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-bold
                        ${isOpen ? 'bg-success/15 text-success' : 'bg-error/12 text-error'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-success animate-pulse' : 'bg-error'}`} />
                        {isOpen ? 'Open' : 'Closed'}
                    </span>
                )}
            </div>
        </div>
    );
}
