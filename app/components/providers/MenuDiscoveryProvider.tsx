'use client';

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import type { MenuItem as ApiMenuItem } from '@/types/api';
import { useMenu } from '@/lib/api/hooks/useMenu';
import { deriveCategories } from '@/lib/api/adapters/menu.adapter';
import { useBranch } from '@/app/components/providers/BranchProvider';

export interface SearchableItem {
    id: string;
    name: string;
    description?: string;
    category: string;
    price?: number;
    sizes?: { id: number; key: string; label: string; price: number; image?: string }[];
    hasVariants?: boolean;
    variants?: { plain?: number; assorted?: number };
    availableAddOns?: string[];
    image?: string;
    url: string;
    tags?: { slug: string; name: string }[];
}

/**
 * Transform API MenuItem to local SearchableItem format
 */
function transformApiMenuItemToSearchable(apiItem: ApiMenuItem): SearchableItem {
    // Use the actual category name from the API instead of hardcoded mapping
    const categoryName = apiItem.category?.name || 'Basic Meals';

    // Transform sizes if they exist
    const sizes = apiItem.options?.map(option => ({
        key: option.option_key as any,
        label: option.option_label,
        price: option.price,
        id: option.id,
        image: option.image_url ?? undefined,
    }));

    // Determine pricing structure
    const hasMultipleSizes = sizes && sizes.length > 0;
    const price = hasMultipleSizes ? sizes?.[0]?.price : undefined;

    return {
        id: apiItem.id.toString(),
        name: apiItem.name,
        description: apiItem.description,
        category: categoryName as any,
        price,
        sizes: hasMultipleSizes ? sizes : undefined,
        image: (hasMultipleSizes ? sizes?.[0]?.image : apiItem.image_url) ?? undefined,
        url: `/menu?item=${apiItem.id}`,
        tags: apiItem.tags?.map(t => ({ slug: t.slug, name: t.name })) ?? [],
        // Note: API doesn't have variants or add-ons yet, so we omit them
    };
}

const RECENT_SEARCHES_KEY = 'cedibites-recent-searches';
const MAX_RECENT = 8;

interface MenuDiscoveryContextType {
    allItems: SearchableItem[];
    filteredItems: SearchableItem[];
    searchResults: SearchableItem[];
    categories: { id: string; label: string }[];
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
    items?: SearchableItem[];
}

export function MenuDiscoveryProvider({ children }: MenuDiscoveryProviderProps) {
    const { selectedBranch } = useBranch();
    const pathname = usePathname();

    // Fetch menu data filtered by the selected branch
    const { items: apiItems, isLoading: isLoadingMenu, error, refetch } = useMenu(
        selectedBranch ? { branch_id: parseInt(selectedBranch.id) } : undefined
    );

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    // Clear search state when navigating away from the menu page
    useEffect(() => {
        if (!pathname.startsWith('/menu')) {
            setSearchQuery('');
            setSelectedCategory(null);
        }
    }, [pathname]);
    
    // Transform API items to SearchableItem format
    const transformedApiItems = useMemo(() => {
        return apiItems.map(transformApiMenuItemToSearchable);
    }, [apiItems]);
    
    // Use only transformed API items (no fallback to sample data)
    const menuItems = transformedApiItems;

    // Derive categories from API items, prepend "Most Popular" as a special filter
    const categories = useMemo(() => {
        const apiCategories = deriveCategories(menuItems as any).map(c => ({ id: c.name, label: c.name }));
        return [{ id: 'Most Popular', label: 'Most Popular' }, ...apiCategories];
    }, [menuItems]);

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
                result = result.filter(item => item.tags?.some(t => t.slug === 'popular'));
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
        categories,
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