'use client';

import React from 'react';
import GreetingBar from '../ui/GreetingBar';
import PromoCarousel from '../ui/PromoCarousel';
import UniversalSearch from '../ui/UniversalSearch';
import Chip from '../base/Chip';
import { useMenuDiscovery } from '../providers/MenuDiscoveryProvider';

export default function HeroSearch() {
    const { selectedCategory, setSelectedCategory, categories } = useMenuDiscovery();

    return (
        <div className="max-w-5xl mx-auto px-3 md:px-6 w-full flex flex-col gap-4 md:gap-5">
            {/* Slim welcome row */}
            <GreetingBar />

            {/* Search + category chips */}
            <div className="flex flex-col gap-3">
                <UniversalSearch />
                <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
                    {categories.map((item) => (
                        <Chip
                            key={item.id}
                            active={selectedCategory === item.id}
                            onClick={() => setSelectedCategory(item.id === selectedCategory ? null : item.id)}
                        >
                            {item.label}
                        </Chip>
                    ))}
                </div>
            </div>

            {/* Compact, swipeable deals */}
            <PromoCarousel />
        </div>
    );
}
