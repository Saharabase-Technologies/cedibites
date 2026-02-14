'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { SearchableItem } from './MenuDiscoveryProvider';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CartItem {
    cartItemId: string;     // `${itemId}__${sizeKey}`
    item: SearchableItem;
    selectedSize: string;
    sizeLabel: string;
    price: number;
    quantity: number;
}

export interface CartValidationResult {
    available: CartItem[];      // items that ARE available at the new branch
    unavailable: CartItem[];    // items that are NOT available at the new branch
}

interface CartContextType {
    items: CartItem[];
    addToCart: (item: SearchableItem, sizeKey: string) => void;
    removeFromCart: (cartItemId: string) => void;
    updateQuantity: (cartItemId: string, quantity: number) => void;
    clearCart: () => void;
    removeUnavailableItems: (unavailableIds: string[]) => void;
    isInCart: (itemId: string, sizeKey: string) => boolean;
    getCartItem: (itemId: string, sizeKey: string) => CartItem | undefined;
    validateCartForBranch: (branchMenuItemIds: string[]) => CartValidationResult;
    totalItems: number;
    subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const CART_KEY = 'cedibites-cart';

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [hydrated, setHydrated] = useState(false);

    // Hydrate from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem(CART_KEY);
            if (saved) setItems(JSON.parse(saved));
        } catch { /* ignore */ }
        setHydrated(true);
    }, []);

    // Persist to localStorage
    useEffect(() => {
        if (hydrated) localStorage.setItem(CART_KEY, JSON.stringify(items));
    }, [items, hydrated]);

    // ── Helpers ────────────────────────────────────────────────────────────────

    const makeCartItemId = (itemId: string, sizeKey: string) => `${itemId}__${sizeKey}`;

    const addToCart = useCallback((item: SearchableItem, sizeKey: string) => {
        const cartItemId = makeCartItemId(item.id, sizeKey);
        const sizeData = item.sizes?.find((s: any) => s.key === sizeKey);
        const price = sizeData?.price ?? item.price ?? 0;
        const sizeLabel = sizeData?.label ?? sizeKey;

        setItems(prev => {
            const existing = prev.find(i => i.cartItemId === cartItemId);
            if (existing) {
                return prev.map(i =>
                    i.cartItemId === cartItemId ? { ...i, quantity: i.quantity + 1 } : i
                );
            }
            return [...prev, { cartItemId, item, selectedSize: sizeKey, sizeLabel, price, quantity: 1 }];
        });
    }, []);

    const removeFromCart = useCallback((cartItemId: string) => {
        setItems(prev => prev.filter(i => i.cartItemId !== cartItemId));
    }, []);

    const updateQuantity = useCallback((cartItemId: string, quantity: number) => {
        if (quantity <= 0) {
            setItems(prev => prev.filter(i => i.cartItemId !== cartItemId));
        } else {
            setItems(prev => prev.map(i =>
                i.cartItemId === cartItemId ? { ...i, quantity } : i
            ));
        }
    }, []);

    const clearCart = useCallback(() => {
        setItems([]);
        localStorage.removeItem(CART_KEY);
    }, []);

    // Remove a specific set of items by their cartItemIds
    const removeUnavailableItems = useCallback((cartItemIds: string[]) => {
        const idSet = new Set(cartItemIds);
        setItems(prev => prev.filter(i => !idSet.has(i.cartItemId)));
    }, []);

    const isInCart = useCallback((itemId: string, sizeKey: string) =>
        items.some(i => i.cartItemId === makeCartItemId(itemId, sizeKey)),
        [items]);

    const getCartItem = useCallback((itemId: string, sizeKey: string) =>
        items.find(i => i.cartItemId === makeCartItemId(itemId, sizeKey)),
        [items]);

    // ── Branch validation ──────────────────────────────────────────────────────
    // Given a branch's menuItemIds, split cart into available vs unavailable
    const validateCartForBranch = useCallback((branchMenuItemIds: string[]): CartValidationResult => {
        const availableSet = new Set(branchMenuItemIds);
        const available: CartItem[] = [];
        const unavailable: CartItem[] = [];

        items.forEach(cartItem => {
            if (availableSet.has(cartItem.item.id)) {
                available.push(cartItem);
            } else {
                unavailable.push(cartItem);
            }
        });

        return { available, unavailable };
    }, [items]);

    // ── Computed ───────────────────────────────────────────────────────────────
    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    return (
        <CartContext.Provider value={{
            items, addToCart, removeFromCart, updateQuantity, clearCart,
            removeUnavailableItems, isInCart, getCartItem,
            validateCartForBranch, totalItems, subtotal,
        }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart must be used within CartProvider');
    return context;
}