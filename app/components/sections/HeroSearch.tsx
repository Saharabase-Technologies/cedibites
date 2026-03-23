'use client';

import React from 'react'
import DynamicGreeting from '../ui/DynamicGreeting'
import UniversalSearch from '../ui/UniversalSearch'

import { useMenuDiscovery } from '../providers/MenuDiscoveryProvider'
import PromoBanner from '../ui/PromoBanner'

export default function HeroSearch() {
    const { selectedCategory, setSelectedCategory, categories } = useMenuDiscovery();

    return (
        <>
            {/* Row 1: Greeting and Banner */}
            <div className='w-[90%] md:w-[80%] flex flex-col md:flex-row items-stretch gap-4 mx-auto mb-4'>
                {/* Greeting Card */}
                <div className='w-full md:w-[320px] lg:w-[300px] shrink-0 flex'>
                    <DynamicGreeting />
                </div>

                {/* Promo Banner */}
                <div className='flex-1 min-w-0'>
                    <PromoBanner />
                </div>
            </div>

            {/* Row 2: Search and Categories */}
            <div className='w-[95%] mb-4 md:w-[80%] lg:w-[70%] bg-transparent md:bg-primary/5 md:px-6 md:py-6 rounded-2xl mx-auto'>
                <UniversalSearch />

                <div className='flex gap-3 w-full overflow-x-auto no-scrollbar mt-3 pb-1'>
                    {categories.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setSelectedCategory(item.id === selectedCategory ? null : item.id)}
                            className={`cursor-pointer shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all border
                                ${selectedCategory === item.id
                                    ? 'bg-primary text-white border-primary'
                                    : 'border-neutral-gray/50 text-text-dark dark:text-text-light hover:bg-primary/20'
                                }`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
}