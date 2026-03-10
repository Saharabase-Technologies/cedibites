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
  processPayment: (method: PaymentMethod, amountPaid?: number, momoNumber?: string) => Promise<POSOrder>;

  // Order history (today)
  todayOrders: POSOrder[];
  updateOrderStatus: (orderId: string, status: POSOrder['status']) => void;
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
      customerPhone: customerPhone || undefined,
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
  }, [cart, cartTotal, customerName, customerPhone, orderNotes, orderType, clearCart]);

  const updateOrderStatus = useCallback((orderId: string, status: POSOrder['status']) => {
    setTodayOrders(prev =>
      prev.map(o => o.id === orderId ? { ...o, status } : o)
    );
  }, []);

  const seedTestOrders = useCallback(() => {
    const now = Date.now();
    const mockOrders: POSOrder[] = [
      {
        id: `CB${(now - 2400000).toString().slice(-6)}`,
        items: [
          { id: generateId(), menuItemId: 'm1', name: 'Jollof Rice with Chicken', price: 85, quantity: 2 },
          { id: generateId(), menuItemId: 'm2', name: 'Pineapple Ginger Juice', price: 28, quantity: 1 },
        ],
        subtotal: 198, total: 198,
        customerName: 'Ama Darko', customerPhone: '0244123456',
        paymentMethod: 'cash', paymentStatus: 'completed',
        orderType: 'dine_in', status: 'ready',
        createdAt: new Date(now - 2400000),
      },
      {
        id: `CB${(now - 1800000).toString().slice(-6)}`,
        items: [
          { id: generateId(), menuItemId: 'm3', name: 'Waakye Special', price: 65, quantity: 1 },
        ],
        subtotal: 65, total: 65,
        customerName: 'Kweku Asante',
        paymentMethod: 'momo', paymentStatus: 'completed',
        orderType: 'takeaway', status: 'preparing',
        createdAt: new Date(now - 1800000),
      },
      {
        id: `CB${(now - 900000).toString().slice(-6)}`,
        items: [
          { id: generateId(), menuItemId: 'm4', name: 'Grilled Tilapia', price: 120, quantity: 1 },
          { id: generateId(), menuItemId: 'm5', name: 'Fried Plantain', price: 25, quantity: 2 },
        ],
        subtotal: 170, total: 170,
        notes: 'Extra pepper please',
        paymentMethod: 'card', paymentStatus: 'completed',
        orderType: 'dine_in', status: 'ready',
        createdAt: new Date(now - 900000),
      },
      {
        id: `CB${(now - 300000).toString().slice(-6)}`,
        items: [
          { id: generateId(), menuItemId: 'm6', name: 'Banku with Tilapia', price: 95, quantity: 1 },
        ],
        subtotal: 95, total: 95,
        paymentMethod: 'cash', paymentStatus: 'completed',
        orderType: 'takeaway', status: 'received',
        createdAt: new Date(now - 300000),
      },
    ];
    setTodayOrders(prev => [...mockOrders, ...prev]);
  }, []);

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
