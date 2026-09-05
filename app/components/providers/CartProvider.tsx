'use client';

import { createContext, useContext, useCallback, useMemo, useState, ReactNode } from 'react';
import type { SearchableItem } from './MenuDiscoveryProvider';
import { useCart as useApiCart } from '@/lib/api/hooks/useCart';
import { useBranch } from './BranchProvider';
import { ensureGuestSessionId } from '@/lib/api/client';
import { transformApiCartToLocal } from '@/lib/api/transformers/cart.transformer';
import { getErrorMessage } from '@/lib/utils/error-handler';
import { toast } from '@/lib/utils/toast';

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
    removeUnavailableItems: (unavailableIds: string[]) => Promise<void>;
    isInCart: (itemId: string, sizeKey: string) => boolean;
    getCartItem: (itemId: string, sizeKey: string) => CartItem | undefined;
    /** True while a write for this line is still in flight. */
    isLinePending: (cartItemId: string) => boolean;
    validateCartForBranch: (branchMenuItemIds: string[]) => CartValidationResult;
    totalItems: number;
    subtotal: number;
    isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/**
 * The size key used when an item carries no options.
 *
 * This has to match what the server derives, because the optimistic overlay is
 * keyed on it. `deriveOptionKey` in the cart transformer falls back to
 * 'default', so anything else here means the optimistic line is filed under one
 * key and the line that comes back from the server under another — the item
 * would appear to be added twice for a moment, then jump.
 */
export const DEFAULT_SIZE_KEY = 'default';

export const makeCartItemId = (itemId: string, sizeKey: string) => `${itemId}__${sizeKey}`;

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: ReactNode }) {
    const { selectedBranch, branches } = useBranch();
    const apiCart = useApiCart();

    /**
     * Lines with a write in flight, keyed by cartItemId. The value is the line as
     * it will look once the server agrees, or null for a pending removal.
     *
     * Every cart write is a round trip to the API, and until this existed the UI
     * showed nothing at all until it came back — on a slow connection a tap on +
     * looked like a dead button, so people tapped it again. Errors were worse:
     * the catch blocks logged to the console and the customer saw the quantity
     * simply not move, with no idea why.
     */
    const [pending, setPending] = useState<Record<string, CartItem | null>>({});

    const serverItems: CartItem[] = useMemo(
        () => (apiCart.cart ? transformApiCartToLocal(apiCart.cart) : []),
        [apiCart.cart],
    );

    const displayItems: CartItem[] = useMemo(() => {
        const overlay = Object.entries(pending);
        if (overlay.length === 0) return serverItems;

        const byId = new Map(serverItems.map(i => [i.cartItemId, i]));
        for (const [cartItemId, line] of overlay) {
            if (line === null) byId.delete(cartItemId);
            else byId.set(cartItemId, { ...byId.get(cartItemId), ...line });
        }
        return [...byId.values()];
    }, [serverItems, pending]);

    // ── Helpers ────────────────────────────────────────────────────────────────

    const effectiveBranch = selectedBranch ?? branches.find(b => b.isOpen) ?? branches[0] ?? null;

    /**
     * Show the intended result immediately, run the write, and put the line back
     * the way it was — with a message — if the server refuses.
     */
    const applyOptimistic = useCallback(async (
        cartItemId: string,
        optimistic: CartItem | null,
        write: () => Promise<unknown>,
        failureContext: string,
    ) => {
        setPending(p => ({ ...p, [cartItemId]: optimistic }));
        try {
            await write();
        } catch (error) {
            toast.error(`${failureContext} ${getErrorMessage(error)}`);
        } finally {
            // The mutation's onSuccess has already written the server's version of
            // the cart into the query cache by this point, so dropping the overlay
            // reveals the real line rather than flashing the old one.
            setPending(p => {
                const next = { ...p };
                delete next[cartItemId];
                return next;
            });
        }
    }, []);

    const addToCart = useCallback(async (item: SearchableItem, sizeKey: string) => {
        if (!effectiveBranch) {
            toast.error('Could not add to cart — no branch is available right now.');
            return;
        }

        ensureGuestSessionId();

        const cartItemId = makeCartItemId(item.id, sizeKey);
        const sizeData = item.sizes?.find(s => s.key === sizeKey);
        const price = sizeData?.price ?? item.price ?? 0;
        const menuItemOptionId = sizeData?.id ? Number(sizeData.id) : undefined;

        const existing = displayItems.find(i => i.cartItemId === cartItemId);
        const quantity = (existing?.quantity ?? 0) + 1;

        const optimistic: CartItem = {
            ...existing,
            cartItemId,
            item,
            selectedSize: sizeKey,
            sizeLabel: sizeData?.displayName ?? sizeData?.label ?? sizeKey,
            price,
            quantity,
        };

        await applyOptimistic(cartItemId, optimistic, () => (
            existing?.apiCartItemId
                ? apiCart.updateItem({ itemId: existing.apiCartItemId, data: { quantity } })
                : apiCart.addItem({
                    branch_id: Number(effectiveBranch.id),
                    menu_item_id: parseInt(item.id),
                    menu_item_option_id: menuItemOptionId,
                    quantity: 1,
                    unit_price: price,
                })
        ), `Could not add ${item.name} to your cart.`);
    }, [effectiveBranch, displayItems, apiCart, applyOptimistic]);

    const removeFromCart = useCallback(async (cartItemId: string) => {
        const cartItem = displayItems.find(i => i.cartItemId === cartItemId);
        if (!cartItem?.apiCartItemId) return;

        await applyOptimistic(cartItemId, null,
            () => apiCart.removeItem(cartItem.apiCartItemId!),
            `Could not remove ${cartItem.item.name} from your cart.`);
    }, [displayItems, apiCart, applyOptimistic]);

    const updateQuantity = useCallback(async (cartItemId: string, quantity: number) => {
        if (quantity <= 0) {
            await removeFromCart(cartItemId);
            return;
        }

        const cartItem = displayItems.find(i => i.cartItemId === cartItemId);
        if (!cartItem?.apiCartItemId) return;

        await applyOptimistic(cartItemId, { ...cartItem, quantity },
            () => apiCart.updateItem({ itemId: cartItem.apiCartItemId!, data: { quantity } }),
            `Could not update ${cartItem.item.name}.`);
    }, [displayItems, apiCart, removeFromCart, applyOptimistic]);

    const clearCart = useCallback(async () => {
        try {
            await apiCart.clearCart();
        } catch (error) {
            toast.error(`Could not empty your cart. ${getErrorMessage(error)}`);
        }
    }, [apiCart]);

    /**
     * Drop the lines a branch cannot make, for real.
     *
     * This used to be an empty function kept "for interface compatibility", which
     * made the branch-switch escape hatch a dead end: "Remove N items & switch"
     * left every item in place, the unavailable-items banner came straight back,
     * and the Checkout button stayed replaced by "Switch Branch to Continue" with
     * no way through except emptying the cart by hand.
     */
    const removeUnavailableItems = useCallback(async (cartItemIds: string[]) => {
        const lines = cartItemIds
            .map(id => displayItems.find(i => i.cartItemId === id))
            .filter((l): l is CartItem => !!l?.apiCartItemId);

        if (lines.length === 0) return;

        setPending(p => {
            const next = { ...p };
            for (const line of lines) next[line.cartItemId] = null;
            return next;
        });

        const results = await Promise.allSettled(
            lines.map(line => apiCart.removeItem(line.apiCartItemId!)),
        );

        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length > 0) {
            toast.error(
                `Could not remove ${failed.length} item${failed.length !== 1 ? 's' : ''} from your cart. Please try again.`,
            );
        }

        setPending(p => {
            const next = { ...p };
            for (const line of lines) delete next[line.cartItemId];
            return next;
        });
    }, [displayItems, apiCart]);

    const isInCart = useCallback((itemId: string, sizeKey: string) =>
        displayItems.some(i => i.cartItemId === makeCartItemId(itemId, sizeKey)),
        [displayItems]);

    const getCartItem = useCallback((itemId: string, sizeKey: string) =>
        displayItems.find(i => i.cartItemId === makeCartItemId(itemId, sizeKey)),
        [displayItems]);

    const isLinePending = useCallback((cartItemId: string) =>
        Object.prototype.hasOwnProperty.call(pending, cartItemId),
        [pending]);

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
            isLinePending,
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
