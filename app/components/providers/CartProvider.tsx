'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { SearchableItem } from './MenuDiscoveryProvider';
import { useCart as useApiCart } from '@/lib/api/hooks/useCart';
import { useAuth } from './AuthProvider';
import { useBranch } from './BranchProvider';
import { ensureGuestSessionId, getGuestSessionId } from '@/lib/api/client';
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
    available: CartItem[];      // items that ARE available at the new branch
    unavailable: CartItem[];    // items that are NOT available at the new branch
}

interface CartContextType {
    items: CartItem[];
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
    isSyncing: boolean;
    mode: 'api' | 'local';
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const CART_KEY = 'cedibites-cart';

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [hydrated, setHydrated] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    
    // Get auth and branch context
    const { isLoggedIn } = useAuth();
    const { selectedBranch } = useBranch();
    const [guestSessionReady, setGuestSessionReady] = useState(false);

    // Ensure guest session on mount so guests use backend cart
    useEffect(() => {
        if (!isLoggedIn && typeof window !== 'undefined') {
            ensureGuestSessionId();
            setGuestSessionReady(true);
        }
    }, [isLoggedIn]);

    const hasGuestSession = guestSessionReady && !!getGuestSessionId();

    // Use backend cart when: logged in OR has guest session (all carts in backend)
    const mode: 'api' | 'local' = isLoggedIn || hasGuestSession ? 'api' : 'local';

    // API cart hook (enabled for auth OR guest session)
    const apiCart = useApiCart();
    
    // Use API cart data when authenticated, otherwise use local state
    const effectiveItems = mode === 'api' && apiCart.cart 
        ? transformApiCartToLocal(apiCart.cart)
        : items;
    
    const isLoading = mode === 'api' ? apiCart.isLoading : false;

    // Hydrate from localStorage (fallback for legacy local carts)
    useEffect(() => {
        try {
            const saved = localStorage.getItem(CART_KEY);
            if (saved) setItems(JSON.parse(saved));
        } catch { /* ignore */ }
        setHydrated(true);
    }, []);

    // Persist to localStorage
    useEffect(() => {
        if (hydrated && mode === 'local') {
            localStorage.setItem(CART_KEY, JSON.stringify(items));
        }
    }, [items, hydrated, mode]);

    // ── Cart Synchronization on Login ──────────────────────────────────────────
    useEffect(() => {
        const syncCartOnLogin = async () => {
            if (!isLoggedIn || !selectedBranch || isSyncing) return;
            
            // Check if we have local cart items to sync
            const localCartJson = localStorage.getItem(CART_KEY);
            if (!localCartJson) return;
            
            try {
                const localCart: CartItem[] = JSON.parse(localCartJson);
                if (localCart.length === 0) return;
                
                setIsSyncing(true);
                
                // Add each local cart item to the backend
                for (const localItem of localCart) {
                    try {
                        await apiCart.addItem({
                            branch_id: Number(selectedBranch.id),
                            menu_item_id: parseInt(localItem.item.id),
                            quantity: localItem.quantity,
                            unit_price: localItem.price,
                            menu_item_size_id: localItem.selectedSize !== 'default' 
                                ? (localItem.item.sizes?.find(s => s.key === localItem.selectedSize) as { id?: number })?.id 
                                : undefined,
                        });
                    } catch (error) {
                        console.error('Failed to sync cart item:', error);
                    }
                }
                
                // Clear local cart after successful sync
                localStorage.removeItem(CART_KEY);
                setItems([]);
            } catch (error) {
                console.error('Failed to sync cart on login:', error);
            } finally {
                setIsSyncing(false);
            }
        };
        
        syncCartOnLogin();
    }, [isLoggedIn, selectedBranch, isSyncing, apiCart]);

    // ── Helpers ────────────────────────────────────────────────────────────────

    const makeCartItemId = (itemId: string, sizeKey: string) => `${itemId}__${sizeKey}`;

    const addToCart = useCallback(async (item: SearchableItem, sizeKey: string) => {
        const cartItemId = makeCartItemId(item.id, sizeKey);
        const sizeData = item.sizes?.find((s: any) => s.key === sizeKey);
        const price = sizeData?.price ?? item.price ?? 0;
        const sizeLabel = sizeData?.label ?? sizeKey;

        if (mode === 'api' && selectedBranch) {
            // Ensure guest has session ID before API call
            if (!isLoggedIn) ensureGuestSessionId();
            // API mode: use backend
            try {
                const existing = effectiveItems.find(i => i.cartItemId === cartItemId);
                
                if (existing) {
                    // Update quantity (use cart_item id, not menu_item id)
                    if (!existing.apiCartItemId) {
                        console.error('No API cart item ID for update:', cartItemId);
                        addToLocalCart(item, sizeKey, cartItemId, price, sizeLabel);
                        return;
                    }
                    await apiCart.updateItem({
                        itemId: existing.apiCartItemId,
                        data: { quantity: existing.quantity + 1 }
                    });
                } else {
                    // Add new item - find the menu_item_size_id if size exists
                    const menuItemSizeId = (sizeData as { id?: number })?.id ? parseInt(String((sizeData as { id?: number }).id)) : undefined;
                    
                    await apiCart.addItem({
                        branch_id: Number(selectedBranch.id),
                        menu_item_id: parseInt(item.id),
                        menu_item_size_id: menuItemSizeId,
                        quantity: 1,
                        unit_price: price,
                    });
                }
            } catch (error) {
                console.error('Failed to add to cart via API, falling back to local:', error);
                // Fallback to local storage
                addToLocalCart(item, sizeKey, cartItemId, price, sizeLabel);
            }
        } else {
            // Local mode: use localStorage
            addToLocalCart(item, sizeKey, cartItemId, price, sizeLabel);
        }
    }, [mode, selectedBranch, effectiveItems, apiCart]);

    const addToLocalCart = (item: SearchableItem, sizeKey: string, cartItemId: string, price: number, sizeLabel: string) => {
        setItems(prev => {
            const existing = prev.find(i => i.cartItemId === cartItemId);
            if (existing) {
                return prev.map(i =>
                    i.cartItemId === cartItemId ? { ...i, quantity: i.quantity + 1 } : i
                );
            }
            return [...prev, { cartItemId, item, selectedSize: sizeKey, sizeLabel, price, quantity: 1 }];
        });
    };

    const removeFromCart = useCallback(async (cartItemId: string) => {
        if (mode === 'api') {
            // API mode: use backend
            try {
                // Find the cart item to get the actual API cart_item_id
                const cartItem = effectiveItems.find(i => i.cartItemId === cartItemId);
                if (!cartItem?.apiCartItemId) {
                    console.error('No API cart item ID found for:', cartItemId);
                    // Fallback to local storage
                    setItems(prev => prev.filter(i => i.cartItemId !== cartItemId));
                    return;
                }
                
                await apiCart.removeItem(cartItem.apiCartItemId);
            } catch (error) {
                console.error('Failed to remove from cart via API, falling back to local:', error);
                // Fallback to local storage
                setItems(prev => prev.filter(i => i.cartItemId !== cartItemId));
            }
        } else {
            // Local mode: use localStorage
            setItems(prev => prev.filter(i => i.cartItemId !== cartItemId));
        }
    }, [mode, apiCart, effectiveItems]);

    const updateQuantity = useCallback(async (cartItemId: string, quantity: number) => {
        if (quantity <= 0) {
            await removeFromCart(cartItemId);
            return;
        }

        if (mode === 'api') {
            // API mode: use backend
            try {
                // Find the cart item to get the actual API cart_item_id
                const cartItem = effectiveItems.find(i => i.cartItemId === cartItemId);
                if (!cartItem?.apiCartItemId) {
                    console.error('No API cart item ID found for:', cartItemId);
                    // Fallback to local storage
                    setItems(prev => prev.map(i =>
                        i.cartItemId === cartItemId ? { ...i, quantity } : i
                    ));
                    return;
                }
                
                await apiCart.updateItem({
                    itemId: cartItem.apiCartItemId,
                    data: { quantity }
                });
            } catch (error) {
                console.error('Failed to update quantity via API, falling back to local:', error);
                // Fallback to local storage
                setItems(prev => prev.map(i =>
                    i.cartItemId === cartItemId ? { ...i, quantity } : i
                ));
            }
        } else {
            // Local mode: use localStorage
            setItems(prev => prev.map(i =>
                i.cartItemId === cartItemId ? { ...i, quantity } : i
            ));
        }
    }, [mode, apiCart, removeFromCart, effectiveItems]);

    const clearCart = useCallback(async () => {
        if (mode === 'api') {
            // API mode: use backend
            try {
                await apiCart.clearCart();
            } catch (error) {
                console.error('Failed to clear cart via API, falling back to local:', error);
                // Fallback to local storage
                setItems([]);
                localStorage.removeItem(CART_KEY);
            }
        } else {
            // Local mode: use localStorage
            setItems([]);
            localStorage.removeItem(CART_KEY);
        }
    }, [mode, apiCart]);

    // Remove a specific set of items by their cartItemIds
    const removeUnavailableItems = useCallback((cartItemIds: string[]) => {
        const idSet = new Set(cartItemIds);
        setItems(prev => prev.filter(i => !idSet.has(i.cartItemId)));
    }, []);

    const isInCart = useCallback((itemId: string, sizeKey: string) =>
        effectiveItems.some(i => i.cartItemId === makeCartItemId(itemId, sizeKey)),
        [effectiveItems]);

    const getCartItem = useCallback((itemId: string, sizeKey: string) =>
        effectiveItems.find(i => i.cartItemId === makeCartItemId(itemId, sizeKey)),
        [effectiveItems]);

    // ── Branch validation ──────────────────────────────────────────────────────
    // Given a branch's menuItemIds, split cart into available vs unavailable
    const validateCartForBranch = useCallback((branchMenuItemIds: string[]): CartValidationResult => {
        const availableSet = new Set(branchMenuItemIds);
        const available: CartItem[] = [];
        const unavailable: CartItem[] = [];

        effectiveItems.forEach(cartItem => {
            if (availableSet.has(cartItem.item.id)) {
                available.push(cartItem);
            } else {
                unavailable.push(cartItem);
            }
        });

        return { available, unavailable };
    }, [effectiveItems]);

    // ── Computed ───────────────────────────────────────────────────────────────
    const totalItems = effectiveItems.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = effectiveItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

    return (
        <CartContext.Provider value={{
            items: effectiveItems,
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
            isLoading,
            isSyncing,
            mode,
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