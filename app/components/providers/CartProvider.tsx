'use client';

import { createContext, useContext, useCallback, ReactNode } from 'react';
import type { SearchableItem } from './MenuDiscoveryProvider';
import { useCart as useApiCart } from '@/lib/api/hooks/useCart';
import { useBranch } from './BranchProvider';
import { ensureGuestSessionId } from '@/lib/api/client';
import { transformApiCartToLocal } from '@/lib/api/transformers/cart.transformer';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CartItem {
    cartItemId: string;     // `${itemId}__${sizeKey}` for local identification
    apiCartItemId?: number; // Actual database cart_item.id from API (for deletion)
    item: SearchableItem;
    selectedSize: string;
    sizeLabel: string;
    price: number;
    quantity: number;
}

export interface CartValidationResult {
    available: CartItem[];
    unavailable: CartItem[];
}

interface CartContextType {
    displayItems: CartItem[];
    addToCart: (item: SearchableItem, sizeKey: string) => Promise<void>;
    removeFromCart: (cartItemId: string) => Promise<void>;
    updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
    clearCart: () => Promise<void>;
    removeUnavailableItems: (unavailableIds: string[]) => void;
    isInCart: (itemId: string, sizeKey: string) => boolean;
    getCartItem: (itemId: string, sizeKey: string) => CartItem | undefined;
    validateCartForBranch: (branchMenuItemIds: string[]) => CartValidationResult;
    totalItems: number;
    subtotal: number;
    isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: ReactNode }) {
    const { selectedBranch, branches } = useBranch();
    const apiCart = useApiCart();

    const displayItems: CartItem[] = apiCart.cart ? transformApiCartToLocal(apiCart.cart) : [];

    // ── Helpers ────────────────────────────────────────────────────────────────

    const makeCartItemId = (itemId: string, sizeKey: string) => `${itemId}__${sizeKey}`;

    const effectiveBranch = selectedBranch ?? branches.find(b => b.isOpen) ?? branches[0] ?? null;

    const addToCart = useCallback(async (item: SearchableItem, sizeKey: string) => {
        if (!effectiveBranch) {
            console.error('Cannot add to cart: no branch available');
            return;
        }

        ensureGuestSessionId();

        const cartItemId = makeCartItemId(item.id, sizeKey);
        const sizeData = item.sizes?.find((s: any) => s.key === sizeKey);
        const price = sizeData?.price ?? item.price ?? 0;
        const menuItemOptionId = (sizeData as { id?: number })?.id
            ? parseInt(String((sizeData as { id?: number }).id))
            : undefined;

        const existing = displayItems.find(i => i.cartItemId === cartItemId);

        try {
            if (existing?.apiCartItemId) {
                await apiCart.updateItem({
                    itemId: existing.apiCartItemId,
                    data: { quantity: existing.quantity + 1 },
                });
            } else {
                await apiCart.addItem({
                    branch_id: Number(effectiveBranch.id),
                    menu_item_id: parseInt(item.id),
                    menu_item_option_id: menuItemOptionId,
                    quantity: 1,
                    unit_price: price,
                });
            }
        } catch (error) {
            console.error('Failed to add to cart:', error);
        }
    }, [effectiveBranch, displayItems, apiCart]);

    const removeFromCart = useCallback(async (cartItemId: string) => {
        const cartItem = displayItems.find(i => i.cartItemId === cartItemId);
        if (!cartItem?.apiCartItemId) return;

        try {
            await apiCart.removeItem(cartItem.apiCartItemId);
        } catch (error) {
            console.error('Failed to remove from cart:', error);
        }
    }, [displayItems, apiCart]);

    const updateQuantity = useCallback(async (cartItemId: string, quantity: number) => {
        if (quantity <= 0) {
            await removeFromCart(cartItemId);
            return;
        }

        const cartItem = displayItems.find(i => i.cartItemId === cartItemId);
        if (!cartItem?.apiCartItemId) return;

        try {
            await apiCart.updateItem({
                itemId: cartItem.apiCartItemId,
                data: { quantity },
            });
        } catch (error) {
            console.error('Failed to update quantity:', error);
        }
    }, [displayItems, apiCart, removeFromCart]);

    const clearCart = useCallback(async () => {
        try {
            await apiCart.clearCart();
        } catch (error) {
            console.error('Failed to clear cart:', error);
        }
    }, [apiCart]);

    // No-op kept for interface compatibility — displayItems are derived from the API
    const removeUnavailableItems = useCallback((_cartItemIds: string[]) => {}, []);

    const isInCart = useCallback((itemId: string, sizeKey: string) =>
        displayItems.some(i => i.cartItemId === makeCartItemId(itemId, sizeKey)),
        [displayItems]);

    const getCartItem = useCallback((itemId: string, sizeKey: string) =>
        displayItems.find(i => i.cartItemId === makeCartItemId(itemId, sizeKey)),
        [displayItems]);

    const validateCartForBranch = useCallback((branchMenuItemIds: string[]): CartValidationResult => {
        const availableSet = new Set(branchMenuItemIds);
        const available: CartItem[] = [];
        const unavailable: CartItem[] = [];

        displayItems.forEach(cartItem => {
            if (availableSet.has(cartItem.item.id)) {
                available.push(cartItem);
            } else {
                unavailable.push(cartItem);
            }
        });

        return { available, unavailable };
    }, [displayItems]);

    const totalItems = displayItems.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = displayItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

    return (
        <CartContext.Provider value={{
            displayItems,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            removeUnavailableItems,
            isInCart,
            getCartItem,
            validateCartForBranch,
            totalItems,
            subtotal,
            isLoading: apiCart.isLoading,
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
