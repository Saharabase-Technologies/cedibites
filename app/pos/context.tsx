'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  ReactNode
} from 'react';
import type { Order, PaymentMethod, CreateOrderInput } from '@/types/order';
import type { POSSession, POSCartItem } from './types';
import { useOrderStore } from '@/app/components/providers/OrderStoreProvider';
import { BRANCHES } from '@/app/components/providers/BranchProvider';

// Generate unique IDs for cart items
const generateId = () => `pos-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

interface POSContextValue {
  // Session
  session: POSSession | null;
  isSessionValid: boolean;
  isSessionLoaded: boolean;

  // Cart
  cart: POSCartItem[];
  cartTotal: number;
  cartCount: number;
  addToCart: (item: Omit<POSCartItem, 'id' | 'quantity'>, quantity?: number) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;

  // Order details
  customerName: string;
  setCustomerName: (name: string) => void;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  orderNotes: string;
  setOrderNotes: (notes: string) => void;
  orderType: 'dine_in' | 'takeaway';
  setOrderType: (type: 'dine_in' | 'takeaway') => void;

  // Payment
  isPaymentOpen: boolean;
  openPayment: () => void;
  closePayment: () => void;
  processPayment: (method: PaymentMethod, amountPaid?: number, momoNumber?: string, discount?: number) => Promise<Order>;

  // Order history (today)
  todayOrders: Order[];
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  seedTestOrders: () => void;

  // Login / Logout
  login: (session: POSSession) => void;
  logout: () => void;
}

const POSContext = createContext<POSContextValue | null>(null);

export function usePOS() {
  const ctx = useContext(POSContext);
  if (!ctx) throw new Error('usePOS must be used within POSProvider');
  return ctx;
}

interface POSProviderProps {
  children: ReactNode;
}

export function POSProvider({ children }: POSProviderProps) {
  // Session state
  const [session, setSession] = useState<POSSession | null>(null);
  const [isSessionLoaded, setIsSessionLoaded] = useState(false);

  // Cart state
  const [cart, setCart] = useState<POSCartItem[]>([]);

  // Order details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>('dine_in');

  // Payment modal
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  // OrderStore
  const {
    orders: allOrders,
    createOrder,
    updateOrderStatus: storeUpdateStatus,
  } = useOrderStore();

  // Load session on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('pos-session');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as POSSession;
        const isValid = Date.now() - parsed.loginTime < 12 * 60 * 60 * 1000;
        if (isValid) {
          setSession(parsed);
        } else {
          sessionStorage.removeItem('pos-session');
        }
      } catch {
        sessionStorage.removeItem('pos-session');
      }
    }
    setIsSessionLoaded(true);
  }, []);

  const isSessionValid = useMemo(() => {
    if (!session) return false;
    return Date.now() - session.loginTime < 12 * 60 * 60 * 1000;
  }, [session]);

  // Today's POS orders from OrderStore
  const todayOrders = useMemo(() => {
    if (!session) return [];
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return allOrders.filter(o =>
      o.source === 'pos' &&
      o.branch.id === session.branchId &&
      o.placedAt >= startOfDay.getTime()
    );
  }, [allOrders, session]);

  // Cart calculations
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const cartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Cart actions
  const addToCart = useCallback((
    item: Omit<POSCartItem, 'id' | 'quantity'>,
    quantity = 1
  ) => {
    setCart(prev => {
      const key = `${item.menuItemId}|${item.variantKey || 'default'}`;
      const existingIndex = prev.findIndex(
        c => `${c.menuItemId}|${c.variantKey || 'default'}` === key
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity
        };
        return updated;
      }

      return [...prev, { ...item, id: generateId(), quantity }];
    });
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }

    setCart(prev => prev.map(item =>
      item.id === id ? { ...item, quantity } : item
    ));
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setOrderNotes('');
    setOrderType('dine_in');
  }, []);

  // Payment actions
  const openPayment = useCallback(() => {
    if (cart.length === 0) return;
    setIsPaymentOpen(true);
  }, [cart.length]);

  const closePayment = useCallback(() => {
    setIsPaymentOpen(false);
  }, []);

  const processPayment = useCallback(async (
    method: PaymentMethod,
    amountPaid?: number,
    momoNumber?: string,
    discount?: number
  ): Promise<Order> => {
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const branch = BRANCHES.find(b => b.id === session?.branchId);

    const input: CreateOrderInput = {
      source: 'pos',
      fulfillmentType: orderType,
      paymentMethod: method,
      items: cart.map(item => ({
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        image: item.image,
        variantKey: item.variantKey,
      })),
      contact: {
        name: customerName || 'Walk-in',
        phone: customerPhone || '',
        notes: orderNotes || undefined,
      },
      branchId: session?.branchId ?? '',
      branchName: branch?.name ?? '',
      branchAddress: branch?.address,
      branchPhone: branch?.phone,
      branchCoordinates: branch?.coordinates,
      staffId: session?.staffId,
      staffName: session?.staffName,
      discount: discount && discount > 0 ? discount : undefined,
    };

    const order = await createOrder(input);

    // Clear cart
    clearCart();
    setIsPaymentOpen(false);

    return order;
  }, [cart, customerName, customerPhone, orderNotes, orderType, session, createOrder, clearCart]);

  const updateOrderStatus = useCallback((orderId: string, status: Order['status']) => {
    const timestamps: Partial<Pick<Order, 'acceptedAt' | 'startedAt' | 'readyAt' | 'completedAt'>> = {};
    if (status === 'completed') timestamps.completedAt = Date.now();
    storeUpdateStatus(orderId, status, timestamps);
  }, [storeUpdateStatus]);

  const seedTestOrders = useCallback(() => {
    if (!session) return;
    const branch = BRANCHES.find(b => b.id === session.branchId);

    const testOrders: CreateOrderInput[] = [
      {
        source: 'pos', fulfillmentType: 'dine_in', paymentMethod: 'cash',
        items: [
          { menuItemId: 'm1', name: 'Jollof Rice with Chicken', quantity: 2, unitPrice: 85 },
          { menuItemId: 'm2', name: 'Pineapple Ginger Juice', quantity: 1, unitPrice: 28 },
        ],
        contact: { name: 'Ama Darko', phone: '0244123456' },
        branchId: session.branchId, branchName: branch?.name ?? '',
        staffId: session.staffId, staffName: session.staffName,
      },
      {
        source: 'pos', fulfillmentType: 'takeaway', paymentMethod: 'momo',
        items: [
          { menuItemId: 'm3', name: 'Waakye Special', quantity: 1, unitPrice: 65 },
        ],
        contact: { name: 'Kweku Asante', phone: '' },
        branchId: session.branchId, branchName: branch?.name ?? '',
        staffId: session.staffId, staffName: session.staffName,
      },
      {
        source: 'pos', fulfillmentType: 'dine_in', paymentMethod: 'card',
        items: [
          { menuItemId: 'm4', name: 'Grilled Tilapia', quantity: 1, unitPrice: 120 },
          { menuItemId: 'm5', name: 'Fried Plantain', quantity: 2, unitPrice: 25 },
        ],
        contact: { name: 'Walk-in', phone: '', notes: 'Extra pepper please' },
        branchId: session.branchId, branchName: branch?.name ?? '',
        staffId: session.staffId, staffName: session.staffName,
      },
    ];

    testOrders.forEach(input => createOrder(input));
  }, [session, createOrder]);

  const login = useCallback((newSession: POSSession) => {
    sessionStorage.setItem('pos-session', JSON.stringify(newSession));
    setSession(newSession);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('pos-session');
    setSession(null);
    clearCart();
  }, [clearCart]);

  const value: POSContextValue = {
    session,
    isSessionValid,
    isSessionLoaded,
    cart,
    cartTotal,
    cartCount,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    orderNotes,
    setOrderNotes,
    orderType,
    setOrderType,
    isPaymentOpen,
    openPayment,
    closePayment,
    processPayment,
    todayOrders,
    updateOrderStatus,
    seedTestOrders,
    login,
    logout,
  };

  return (
    <POSContext.Provider value={value}>
      {children}
    </POSContext.Provider>
  );
}
