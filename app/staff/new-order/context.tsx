'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { MenuItem } from '@/lib/data/SampleMenu';
import type {
    OrderSource,
    OrderType,
    PaymentMethod,
    StaffCartItem,
    CustomerDetails,
} from './types';
import { generateOrderCode } from './utils';

// ─── Context shape ────────────────────────────────────────────────────────────

interface NewOrderContextType {
    // State
    step: 1 | 2 | 3 | 4;
    source: OrderSource | null;
    branchId: string | null;
    cart: StaffCartItem[];
    orderType: OrderType;
    customer: CustomerDetails;
    payment: PaymentMethod | null;
    isSubmitting: boolean;
    orderCode: string | null;

    // Actions
    setStep: (n: 1 | 2 | 3 | 4) => void;
    setSource: (s: OrderSource) => void;
    setBranchId: (id: string) => void;
    addItem: (item: MenuItem, variantKey: string, price: number, variantLabel?: string) => void;
    removeItem: (cartKey: string) => void;
    clearItem: (cartKey: string) => void;
    setOrderType: (t: OrderType) => void;
    patchCustomer: (patch: Partial<CustomerDetails>) => void;
    setPayment: (p: PaymentMethod) => void;
    submit: () => Promise<void>;
    resetOrder: () => void;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_CUSTOMER: CustomerDetails = {
    name: '', phone: '', email: '', address: '', notes: '',
};

// ─── Context ──────────────────────────────────────────────────────────────────

const NewOrderContext = createContext<NewOrderContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function NewOrderProvider({ children }: { children: ReactNode }) {
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [source, setSource] = useState<OrderSource | null>(null);
    const [branchId, setBranchId] = useState<string | null>(null);
    const [cart, setCart] = useState<StaffCartItem[]>([]);
    const [orderType, setOrderType] = useState<OrderType>('delivery');
    const [customer, setCustomer] = useState<CustomerDetails>(DEFAULT_CUSTOMER);
    const [payment, setPayment] = useState<PaymentMethod | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderCode, setOrderCode] = useState<string | null>(null);

    const addItem = useCallback((item: MenuItem, variantKey: string, price: number, variantLabel?: string) => {
        const cartKey = `${item.id}|${variantKey}`;
        setCart(prev => {
            const existing = prev.find(c => c.cartKey === cartKey);
            if (existing) {
                return prev.map(c => c.cartKey === cartKey ? { ...c, quantity: c.quantity + 1 } : c);
            }
            return [...prev, {
                cartKey,
                id: item.id,
                name: item.name,
                variantLabel,
                price,
                quantity: 1,
                category: item.category,
            }];
        });
    }, []);

    const removeItem = useCallback((cartKey: string) => {
        setCart(prev => {
            const existing = prev.find(c => c.cartKey === cartKey);
            if (!existing) return prev;
            if (existing.quantity === 1) return prev.filter(c => c.cartKey !== cartKey);
            return prev.map(c => c.cartKey === cartKey ? { ...c, quantity: c.quantity - 1 } : c);
        });
    }, []);

    const clearItem = useCallback((cartKey: string) => {
        setCart(prev => prev.filter(c => c.cartKey !== cartKey));
    }, []);

    const patchCustomer = useCallback((patch: Partial<CustomerDetails>) => {
        setCustomer(prev => ({ ...prev, ...patch }));
    }, []);

    const submit = useCallback(async () => {
        setIsSubmitting(true);
        try {
            // TODO: replace with real API call ──────────────────────────────────
            // const res = await fetch('/api/v1/staff/orders', {
            //   method: 'POST',
            //   credentials: 'include',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify({
            //     source, branchId, orderType,
            //     items: cart.map(i => ({ id: i.id, quantity: i.quantity })),
            //     customer, payment,
            //   }),
            // });
            // const { data } = await res.json();
            // setOrderCode(data.orderCode);
            // ──────────────────────────────────────────────────────────────────
            await new Promise(r => setTimeout(r, 2000)); // remove when API is live
            setOrderCode(generateOrderCode());
        } catch {
            // Handle error — show toast or inline error
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    const resetOrder = useCallback(() => {
        setStep(1);
        setSource(null);
        setBranchId(null);
        setCart([]);
        setOrderType('delivery');
        setCustomer(DEFAULT_CUSTOMER);
        setPayment(null);
        setOrderCode(null);
    }, []);

    return (
        <NewOrderContext.Provider value={{
            step, source, branchId, cart, orderType, customer,
            payment, isSubmitting, orderCode,
            setStep, setSource, setBranchId,
            addItem, removeItem, clearItem,
            setOrderType, patchCustomer, setPayment,
            submit, resetOrder,
        }}>
            {children}
        </NewOrderContext.Provider>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNewOrder(): NewOrderContextType {
    const ctx = useContext(NewOrderContext);
    if (!ctx) throw new Error('useNewOrder must be used within NewOrderProvider');
    return ctx;
}
