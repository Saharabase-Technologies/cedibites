'use client';

import { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import { sampleMenuItems } from '@/lib/data/SampleMenu';
import { useBranch } from './BranchProvider';

export interface SearchableItem {
    id: string;
    name: string;
    description?: string;
    category?: string;
    price?: number;
    icon?: string;
    image?: string;
    url?: string;
    [key: string]: any;
}

interface MenuDiscoveryContextType {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    searchResults: SearchableItem[];
    isSearching: boolean;
    clearSearch: () => void;
    selectedCategory: string | null;
    setSelectedCategory: (categoryId: string | null) => void;
    filteredItems: SearchableItem[];
    recentSearches: string[];
    addRecentSearch: (query: string) => void;
    clearRecentSearches: () => void;
    allItems: SearchableItem[];         // all items regardless of branch
    branchItems: SearchableItem[];      // items available at selected branch only
}

const MenuDiscoveryContext = createContext<MenuDiscoveryContextType | undefined>(undefined);

export function MenuDiscoveryProvider({ children }: { children: ReactNode }) {
    const { selectedBranch } = useBranch();

    const [searchQuery, setSearchQueryState] = useState('');
    const [selectedCategory, setSelectedCategoryState] = useState<string | null>(null);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const allItems: SearchableItem[] = sampleMenuItems;

    // ── Branch-filtered items — the source of truth for the menu grid ──
    const branchItems = useMemo((): SearchableItem[] => {
        if (!selectedBranch) return allItems; // no branch selected yet → show all
        const ids = new Set(selectedBranch.menuItemIds);
        return allItems.filter(item => ids.has(item.id));
    }, [selectedBranch, allItems]);

    // ── Load recent searches from localStorage ──
    useEffect(() => {
        const saved = localStorage.getItem('cedibites-recent-searches');
        if (saved) {
            try { setRecentSearches(JSON.parse(saved)); } catch { /* ignore */ }
        }
    }, []);

    const setSearchQuery = useCallback((query: string) => {
        setSearchQueryState(query);
        setIsSearching(query.trim().length > 0);
    }, []);

    const setSelectedCategory = useCallback((categoryId: string | null) => {
        setSelectedCategoryState(categoryId);
    }, []);

    const clearSearch = useCallback(() => {
        setSearchQueryState('');
        setIsSearching(false);
    }, []);

    const addRecentSearch = useCallback((query: string) => {
        if (!query.trim()) return;
        setRecentSearches(prev => {
            const updated = [query, ...prev.filter(s => s !== query)].slice(0, 10);
            localStorage.setItem('cedibites-recent-searches', JSON.stringify(updated));
            return updated;
        });
    }, []);

    const clearRecentSearches = useCallback(() => {
        setRecentSearches([]);
        localStorage.removeItem('cedibites-recent-searches');
    }, []);

    // ── Search results — searches within branch items only ──
    const searchResults = useMemo((): SearchableItem[] => {
        if (!searchQuery.trim()) return [];
        const lower = searchQuery.toLowerCase();
        return branchItems.filter(item =>
            item.name.toLowerCase().includes(lower) ||
            item.description?.toLowerCase().includes(lower) ||
            item.category?.toLowerCase().includes(lower)
        );
    }, [searchQuery, branchItems]);

    // ── Filtered items — category + search applied to branch items ──
    const filteredItems = useMemo((): SearchableItem[] => {
        let results = branchItems;

        if (selectedCategory === 'Most Popular') {
            results = results.filter(item => item.popular === true);
        } else if (selectedCategory) {
            results = results.filter(
                item => item.category?.toLowerCase() === selectedCategory.toLowerCase()
            );
        }

        if (searchQuery.trim()) {
            const lower = searchQuery.toLowerCase();
            results = results.filter(item =>
                item.name.toLowerCase().includes(lower) ||
                item.description?.toLowerCase().includes(lower) ||
                item.category?.toLowerCase().includes(lower)
            );
        }

        return results;
    }, [selectedCategory, searchQuery, branchItems]);

    return (
        <MenuDiscoveryContext.Provider value={{
            searchQuery, setSearchQuery, searchResults, isSearching, clearSearch,
            selectedCategory, setSelectedCategory, filteredItems,
            recentSearches, addRecentSearch, clearRecentSearches,
            allItems, branchItems,
        }}>
            {children}
        </MenuDiscoveryContext.Provider>
    );
}

export function useMenuDiscovery() {
    const context = useContext(MenuDiscoveryContext);
    if (!context) throw new Error('useMenuDiscovery must be used within MenuDiscoveryProvider');
    return context;
}