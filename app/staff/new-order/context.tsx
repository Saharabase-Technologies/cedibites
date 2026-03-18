'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { DisplayMenuItem } from '@/lib/api/adapters/menu.adapter';
import type { OrderSource, FulfillmentType, PaymentMethod } from '@/types/order';
import type { StaffCartItem, CustomerDetails } from './types';
import { useOrderStore } from '@/app/components/providers/OrderStoreProvider';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { useBranch } from '@/app/components/providers/BranchProvider';
import { getPromoService, type Promo } from '@/lib/services/promos/promo.service';
import { getShiftService } from '@/lib/services/shifts/shift.service';

// ─── Context shape ────────────────────────────────────────────────────────────

interface NewOrderContextType {
    // State
    step: 1 | 2 | 3 | 4;
    source: OrderSource | null;
    branchId: string | null;
    cart: StaffCartItem[];
    orderType: FulfillmentType;
    customer: CustomerDetails;
    payment: PaymentMethod | null;
    isSubmitting: boolean;
    orderCode: string | null;

    // Promo
    promo: Promo | null;
    discount: number;

    // Staff user (for role-based UI)
    staffUser: any; // TODO: Type this properly

    // Actions
    setStep: (n: 1 | 2 | 3 | 4) => void;
    setSource: (s: OrderSource) => void;
    setBranchId: (id: string) => void;
    addItem: (item: DisplayMenuItem, variantKey: string, price: number, variantLabel?: string, sizeId?: number) => void;
    removeItem: (cartKey: string) => void;
    clearItem: (cartKey: string) => void;
    setOrderType: (t: FulfillmentType) => void;
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
    const { createOrder } = useOrderStore();
    const { staffUser } = useStaffAuth();
    const { branches } = useBranch();

    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [source, setSource] = useState<OrderSource | null>('phone'); // Default to phone for staff orders
    const [branchId, setBranchId] = useState<string | null>(null);
    const [cart, setCart] = useState<StaffCartItem[]>([]);
    const [orderType, setOrderType] = useState<FulfillmentType>('delivery');
    const [customer, setCustomer] = useState<CustomerDetails>(DEFAULT_CUSTOMER);
    const [payment, setPayment] = useState<PaymentMethod | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderCode, setOrderCode] = useState<string | null>(null);
    const [promo, setPromo] = useState<Promo | null>(null);
    const [discount, setDiscount] = useState(0);

    // Auto-select branch for non-admin users
    useEffect(() => {
        if (!staffUser || branchId) return; // Skip if no user or branch already selected
        
        // Super admins and call center can select any branch (don't auto-select)
        if (staffUser.role === 'super_admin' || staffUser.role === 'call_center') return;
        
        // For managers and staff, auto-select their branch
        if (staffUser.branchId) {
            setBranchId(String(staffUser.branchId));
        }
    }, [staffUser, branchId]);

    // Resolve best promo whenever cart or branch changes
    useEffect(() => {
        if (!branchId || cart.length === 0) { setPromo(null); setDiscount(0); return; }
        const itemIds = cart.map(c => c.id);
        getPromoService().resolvePromo(itemIds, branchId).then(p => {
            if (!p) { setPromo(null); setDiscount(0); return; }
            const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
            setPromo(p);
            setDiscount(getPromoService().calculateDiscount(p, subtotal));
        }).catch(() => { setPromo(null); setDiscount(0); });
    }, [branchId, cart]);

    const addItem = useCallback((item: DisplayMenuItem, variantKey: string, price: number, variantLabel?: string, sizeId?: number) => {
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
                sizeId,
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
        if (!source || !branchId || !payment) return;
        console.log('Submit function called with:', { source, branchId, payment, cartLength: cart.length });
        
        setIsSubmitting(true);
        try {
            const branch = branches.find(b => b.id === branchId);
            console.log('Found branch:', branch);
            
            const orderData = {
                source,
                fulfillmentType: orderType,
                paymentMethod: payment,
                items: cart.map(i => ({
                    menuItemId: i.id,
                    name: i.name,
                    quantity: i.quantity,
                    unitPrice: i.price,
                    variantKey: i.cartKey.split('|')[1],
                    sizeLabel: i.variantLabel,
                    category: i.category,
                    sizeId: i.sizeId, // Include sizeId for backend validation
                })),
                contact: {
                    name: customer.name,
                    phone: customer.phone,
                    email: customer.email || undefined,
                    address: orderType === 'delivery' ? customer.address : undefined,
                    notes: customer.notes || undefined,
                },
                branchId,
                branchName: branch?.name ?? branchId,
                branchAddress: branch?.address,
                branchPhone: branch?.phone,
                branchCoordinates: branch?.coordinates,
                deliveryFee: orderType === 'delivery' ? (branch?.deliveryFee ?? 0) : 0,
                discount: discount > 0 ? discount : undefined,
                staffId: staffUser?.id,
                staffName: staffUser?.name,
                momoNumber: payment === 'mobile_money' ? customer.phone : undefined, // Add MoMo number for mobile money payments
            };
            
            console.log('Creating order with data:', orderData);
            
            const order = await createOrder(orderData);
            console.log('Order created successfully:', order);
            
            setOrderCode(order.orderNumber);
            // Track order in active shift
            if (staffUser && staffUser.role !== 'kitchen' && staffUser.role !== 'rider') {
                getShiftService().getActive(staffUser.id).then(shift => {
                    if (shift) getShiftService().addOrder(shift.id, order.orderNumber, order.total).catch(() => {});
                }).catch(() => {});
            }
        } catch (error) {
            console.error('Order creation failed:', error);
            // Handle error — show toast or inline error
        } finally {
            setIsSubmitting(false);
        }
    }, [source, branchId, payment, orderType, cart, customer, discount, staffUser, branches, createOrder]);

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
            promo, discount,
            staffUser,
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
