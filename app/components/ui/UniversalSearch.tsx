'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    MagnifyingGlassIcon,
    XIcon,
    ClockIcon,
    TrendUpIcon,
    ArrowRightIcon,
    SpinnerGapIcon,
} from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';

// ============================================
// TYPES
// ============================================

export interface SearchableItem {
    id: string;
    name: string;
    description?: string;
    category?: string;
    price?: number;
    icon?: string;
    image?: string;
    url?: string; // Where to navigate when clicked
    [key: string]: any; // Allow extra properties
}

interface UniversalSearchProps {
    items?: SearchableItem[];
    placeholder?: string;
    popularSearches?: string[];
    maxRecentSearches?: number;
    onSearch?: (query: string) => void;
    onItemClick?: (item: SearchableItem) => void;
    isLoading?: boolean;
    showPrices?: boolean;
    searchKeys?: string[]; // Which fields to search in
    resultLimit?: number;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function UniversalSearch({
    items = [],
    placeholder = 'Search for Jollof, Banku, Waakye...',
    popularSearches = [
        'Jollof Rice',
        'Banku with Tilapia',
        'Waakye',
        'Fufu with Light Soup',
        'Kelewele',
        'Red Red',
    ],
    maxRecentSearches = 10,
    onSearch,
    onItemClick,
    isLoading = false,
    showPrices = true,
    searchKeys = ['name', 'description', 'category'],
    resultLimit = 8,
}: UniversalSearchProps) {
    const [isOpen, setIsOpen] = useState(true);
    const [query, setQuery] = useState('');
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    // ============================================
    // LOAD RECENT SEARCHES
    // ============================================
    useEffect(() => {
        const saved = localStorage.getItem('cedibites-recent-searches');
        if (saved) {
            try {
                setRecentSearches(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to load recent searches');
            }
        }
    }, []);

    // ============================================
    // FOCUS INPUT WHEN MODAL OPENS
    // ============================================
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            setQuery('');
        }
    }, [isOpen]);

    // ============================================
    // KEYBOARD SHORTCUTS
    // ============================================
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // ⌘K or Ctrl+K to open
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }

            // Escape to close
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [isOpen]);

    // ============================================
    // PREVENT BODY SCROLL WHEN OPEN
    // ============================================
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // ============================================
    // SEARCH LOGIC
    // ============================================
    const filteredItems = useCallback(() => {
        if (!query.trim()) return [];

        const lowerQuery = query.toLowerCase();
        return items
            .filter((item) => {
                return searchKeys.some((key) => {
                    const value = item[key];
                    return value && String(value).toLowerCase().includes(lowerQuery);
                });
            })
            .slice(0, resultLimit);
    }, [query, items, searchKeys, resultLimit]);

    const results = filteredItems();

    // ============================================
    // SAVE TO RECENT SEARCHES
    // ============================================
    const saveToRecent = (searchQuery: string) => {
        if (!searchQuery.trim()) return;

        const updated = [
            searchQuery,
            ...recentSearches.filter((s) => s !== searchQuery),
        ].slice(0, maxRecentSearches);

        setRecentSearches(updated);
        localStorage.setItem('cedibites-recent-searches', JSON.stringify(updated));
    };

    // ============================================
    // HANDLE SEARCH
    // ============================================
    const handleSearch = (searchQuery: string) => {
        if (!searchQuery.trim()) return;

        saveToRecent(searchQuery);

        if (onSearch) {
            onSearch(searchQuery);
        } else {
            // Default behavior: navigate to menu with search param
            router.push(`/menu?search=${encodeURIComponent(searchQuery)}`);
        }

        setIsOpen(false);
    };

    // ============================================
    // HANDLE ITEM CLICK
    // ============================================
    const handleItemClick = (item: SearchableItem) => {
        saveToRecent(item.name);

        if (onItemClick) {
            onItemClick(item);
        } else if (item.url) {
            router.push(item.url);
        } else {
            // Default: go to menu with item name as search
            router.push(`/menu?search=${encodeURIComponent(item.name)}`);
        }

        setIsOpen(false);
    };

    // ============================================
    // HANDLE SUGGESTION CLICK
    // ============================================
    const handleSuggestionClick = (suggestion: string) => {
        setQuery(suggestion);
        handleSearch(suggestion);
    };

    // ============================================
    // CLEAR RECENT SEARCHES
    // ============================================
    const clearRecentSearches = () => {
        setRecentSearches([]);
        localStorage.removeItem('cedibites-recent-searches');
    };

    return (
        <>

            <div className="py-6 px-12 border- border-neutral-gray/20 w-full">
                <div className="relative">
                    <MagnifyingGlassIcon
                        size={24}
                        weight="bold"
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-gray"
                    />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder={placeholder}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
                        className="w-full pl-14 pr-12 py-4 bg-neutral-light dark:bg-brand-dark border-2 border-neutral-gray/50 focus:border-2 focus:border-primary rounded-full text-text-dark dark:text-text-light placeholder:text-neutral-gray transition-all outline-none text-lg"
                    />
                    {query && (
                        <button
                            onClick={() => setQuery('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-light dark:hover:bg-brand-dark transition-colors"
                        >
                            <XIcon size={20} weight="bold" />
                        </button>
                    )}
                </div>

                {/* Content */}


            </div>




        </>
    );
}