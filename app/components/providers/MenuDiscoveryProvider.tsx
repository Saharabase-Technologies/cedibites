'use client';

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import type { MenuItem } from '@/lib/data/SampleMenu';
import type { MenuItem as ApiMenuItem } from '@/types/api';
import { useMenu } from '@/lib/api/hooks/useMenu';

// Export the type that matches our MenuItem exactly
export type SearchableItem = MenuItem;

/**
 * Transform API MenuItem to local SearchableItem format
 */
function transformApiMenuItemToSearchable(apiItem: ApiMenuItem): SearchableItem {
    const categoryMap: Record<number, SearchableItem['category']> = {
        1: 'Basic Meals',
        2: 'Budget Bowls',
        3: 'Combos',
        4: 'Top Ups',
        5: 'Drinks',
    };

    // Transform sizes if they exist
    const sizes = apiItem.sizes?.map(size => ({
        key: size.size_key as any,
        label: size.size_label,
        price: size.price,
    }));

    // Determine pricing structure
    const hasMultipleSizes = sizes && sizes.length > 0;
    const price = !hasMultipleSizes ? apiItem.base_price : undefined;

    return {
        id: apiItem.id.toString(),
        name: apiItem.name,
        description: apiItem.description,
        category: categoryMap[apiItem.category_id] || 'Basic Meals',
        price,
        sizes: hasMultipleSizes ? sizes : undefined,
        image: apiItem.image_url,
        url: `/menu?item=${apiItem.id}`,
        popular: apiItem.is_popular,
        isNew: apiItem.is_new,
        // Note: API doesn't have variants or add-ons yet, so we omit them
    };
}

const RECENT_SEARCHES_KEY = 'cedibites-recent-searches';
const MAX_RECENT = 8;

interface MenuDiscoveryContextType {
    allItems: SearchableItem[];
    filteredItems: SearchableItem[];
    searchResults: SearchableItem[];
    isSearching: boolean;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    selectedCategory: string | null;
    setSelectedCategory: (category: string | null) => void;
    recentSearches: string[];
    addRecentSearch: (term: string) => void;
    clearRecentSearches: () => void;
    error: Error | null;
    retryFetch: () => void;
}

const MenuDiscoveryContext = createContext<MenuDiscoveryContextType | null>(null);

interface MenuDiscoveryProviderProps {
    children: React.ReactNode;
    items: SearchableItem[];
}

export function MenuDiscoveryProvider({ children, items }: MenuDiscoveryProviderProps) {
    // Fetch menu data from API
    const { items: apiItems, isLoading: isLoadingMenu, error, refetch } = useMenu();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    
    // Transform API items to SearchableItem format
    const transformedApiItems = useMemo(() => {
        return apiItems.map(transformApiMenuItemToSearchable);
    }, [apiItems]);
    
    // Use only transformed API items (no fallback to sample data)
    const menuItems = transformedApiItems;

    // Load recent searches from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
            if (stored) setRecentSearches(JSON.parse(stored));
        } catch {
            // ignore
        }
    }, []);

    const filteredItems = useMemo(() => {
        let result = menuItems;

        // Filter by category
        if (selectedCategory) {
            if (selectedCategory === 'Most Popular') {
                result = result.filter(item => item.popular);
            } else {
                result = result.filter(item => item.category === selectedCategory);
            }
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(item => {
                // Search in name
                if (item.name.toLowerCase().includes(query)) return true;

                // Search in description
                if (item.description?.toLowerCase().includes(query)) return true;

                // Search in category
                if (item.category.toLowerCase().includes(query)) return true;

                return false;
            });
        }

        return result;
    }, [menuItems, searchQuery, selectedCategory]);

    // searchResults: only populated when there's an active query
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        return filteredItems;
    }, [searchQuery, filteredItems]);

    const handleSetSearchQuery = useCallback((query: string) => {
        setSearchQuery(query);
        // Clear category when searching
        if (query.trim()) {
            setSelectedCategory(null);
        }
    }, []);

    const addRecentSearch = useCallback((term: string) => {
        if (!term.trim()) return;
        setRecentSearches(prev => {
            const deduped = [term, ...prev.filter(s => s.toLowerCase() !== term.toLowerCase())].slice(0, MAX_RECENT);
            try { localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(deduped)); } catch { /* ignore */ }
            return deduped;
        });
    }, []);

    const clearRecentSearches = useCallback(() => {
        setRecentSearches([]);
        try { localStorage.removeItem(RECENT_SEARCHES_KEY); } catch { /* ignore */ }
    }, []);

    const value: MenuDiscoveryContextType = {
        allItems: menuItems,
        filteredItems,
        searchResults,
        isSearching: isLoadingMenu,
        searchQuery,
        setSearchQuery: handleSetSearchQuery,
        selectedCategory,
        setSelectedCategory,
        recentSearches,
        addRecentSearch,
        clearRecentSearches,
        error: error as Error | null,
        retryFetch: refetch,
    };

    return (
        <MenuDiscoveryContext.Provider value={value}>
            {children}
        </MenuDiscoveryContext.Provider>
    );
}

export function useMenuDiscovery() {
    const context = useContext(MenuDiscoveryContext);
    if (!context) {
        throw new Error('useMenuDiscovery must be used within MenuDiscoveryProvider');
    }
    return context;
}