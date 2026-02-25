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
import { POSSession, POSCartItem, PaymentMethod, POSOrder } from './types';

// Generate unique IDs
const generateId = () => `pos-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const generateOrderNumber = () => `CB${Date.now().toString().slice(-6)}`;

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
  orderNotes: string;
  setOrderNotes: (notes: string) => void;
  orderType: 'dine_in' | 'takeaway';
  setOrderType: (type: 'dine_in' | 'takeaway') => void;

  // Payment
  isPaymentOpen: boolean;
  openPayment: () => void;
  closePayment: () => void;
  processPayment: (method: PaymentMethod, amountPaid?: number, momoNumber?: string) => Promise<POSOrder>;

  // Order history (today)
  todayOrders: POSOrder[];

  // Logout
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
  const [orderNotes, setOrderNotes] = useState('');
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>('dine_in');

  // Payment modal
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  // Today's orders
  const [todayOrders, setTodayOrders] = useState<POSOrder[]>([]);

  // Load session on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('pos-session');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as POSSession;
        // Check if session is still valid (within 12 hours)
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

    // Load today's orders from localStorage
    const storedOrders = localStorage.getItem(`pos-orders-${new Date().toDateString()}`);
    if (storedOrders) {
      try {
        setTodayOrders(JSON.parse(storedOrders));
      } catch {
        // Ignore parse errors
      }
    }

    setIsSessionLoaded(true);
  }, []);

  // Persist orders
  useEffect(() => {
    if (todayOrders.length > 0) {
      localStorage.setItem(
        `pos-orders-${new Date().toDateString()}`,
        JSON.stringify(todayOrders)
      );
    }
  }, [todayOrders]);

  const isSessionValid = useMemo(() => {
    if (!session) return false;
    return Date.now() - session.loginTime < 12 * 60 * 60 * 1000;
  }, [session]);

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
      // Check if item already exists (same menuItemId and variantKey)
      const key = `${item.menuItemId}|${item.variantKey || 'default'}`;
      const existingIndex = prev.findIndex(
        c => `${c.menuItemId}|${c.variantKey || 'default'}` === key
      );

      if (existingIndex >= 0) {
        // Update quantity
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity
        };
        return updated;
      }

      // Add new item
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
    momoNumber?: string
  ): Promise<POSOrder> => {
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 500));

    // For momo, we'd call Hubtel API here
    // For card, we'd integrate with POS terminal
    // For cash, instant success

    const order: POSOrder = {
      id: generateOrderNumber(),
      items: [...cart],
      subtotal: cartTotal,
      total: cartTotal, // Add tax/discounts here if needed
      customerName: customerName || undefined,
      notes: orderNotes || undefined,
      paymentMethod: method,
      paymentStatus: 'completed',
      orderType,
      status: 'received',
      createdAt: new Date(),
    };

    // Add to today's orders
    setTodayOrders(prev => [order, ...prev]);

    // Clear cart
    clearCart();
    setIsPaymentOpen(false);

    return order;
  }, [cart, cartTotal, customerName, orderNotes, orderType, clearCart]);

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
    orderNotes,
    setOrderNotes,
    orderType,
    setOrderType,
    isPaymentOpen,
    openPayment,
    closePayment,
    processPayment,
    todayOrders,
    logout,
  };

  return (
    <POSContext.Provider value={value}>
      {children}
    </POSContext.Provider>
  );
}
