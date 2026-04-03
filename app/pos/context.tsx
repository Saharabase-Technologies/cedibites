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
import { useBranch } from '@/app/components/providers/BranchProvider';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { getShiftService } from '@/lib/services/shifts/shift.service';
import { checkoutSessionService } from '@/lib/api/services/checkout-session.service';
import { normalizeGhanaPhone } from '@/app/lib/phone';

// Generate unique IDs for cart items
const generateId = () => `pos-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const POS_BRANCH_KEY = 'cedibites-pos-branchId';

interface POSContextValue {
  // Session
  session: POSSession | null;
  isSessionValid: boolean;
  isSessionLoaded: boolean;
  isNeedsBranchSelection: boolean;
  selectBranch: (branchId: string) => void;

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
  processPayment: (method: PaymentMethod, amountPaid?: number, momoNumber?: string, discount?: number, manualOpts?: { recordedAt: string; momoReference?: string }) => Promise<Order>;

  // Manual entry mode
  isManualEntry: boolean;
  setIsManualEntry: (v: boolean) => void;

  // Order history (today)
  todayOrders: Order[];
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  seedTestOrders: () => void;

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
  const { branches } = useBranch();
  const { staffUser, isLoading: isAuthLoading } = useStaffAuth();

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

  // Manual entry mode
  const [isManualEntry, setIsManualEntry] = useState(false);

  // OrderStore
  const {
    orders: allOrders,
    createOrder,
    updateOrderStatus: storeUpdateStatus,
  } = useOrderStore();

  // Build session from live auth context (always fresh from API)
  useEffect(() => {
    if (isAuthLoading) return;
    if (staffUser?.id) {
      const branchIds: string[] = staffUser.branches.map(b => b.id);
      const defaultBranchId = branchIds.length === 1 ? branchIds[0] : '';
      setSession(prev => {
        // Restore persisted branch selection for this staff member
        const storedBranchId = localStorage.getItem(POS_BRANCH_KEY);
        // branchIds.length === 0 means admin/super_admin with access to all branches
        const isStoredValid = storedBranchId && (branchIds.length === 0 || branchIds.includes(storedBranchId));
        const restoredBranchId = isStoredValid ? storedBranchId : defaultBranchId;
        // Prefer in-memory prev (same session), then persisted, then default
        const keepBranch = prev?.staffId === String(staffUser.id) && prev.branchId;
        return {
          staffId: String(staffUser.id),
          branchId: keepBranch ? prev!.branchId : restoredBranchId,
          branchIds,
          staffName: staffUser.name,
          loginTime: prev?.loginTime ?? Date.now(),
        };
      });
    } else {
      setSession(null);
    }
    setIsSessionLoaded(true);
  }, [staffUser, isAuthLoading]);

  const isSessionValid = useMemo(() => {
    if (!session || !session.branchId) return false;
    return Date.now() - session.loginTime < 12 * 60 * 60 * 1000;
  }, [session]);

  const isNeedsBranchSelection = useMemo(() => {
    return isSessionLoaded && !!session && !session.branchId;
  }, [isSessionLoaded, session]);

  const selectBranch = useCallback((branchId: string) => {
    localStorage.setItem(POS_BRANCH_KEY, branchId);
    setSession(prev => prev ? { ...prev, branchId } : null);
  }, []);

  // Today's POS orders from OrderStore, filtered to the current staff member
  const todayOrders = useMemo(() => {
    if (!session) return [];
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return allOrders.filter(o =>
      o.source === 'pos' &&
      o.branch.id === session.branchId &&
      o.placedAt >= startOfDay.getTime() &&
      o.staffId === session.staffId
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
    discount?: number,
    manualOpts?: { recordedAt: string; momoReference?: string }
  ): Promise<Order> => {
    const branch = branches.find(b => b.id === session?.branchId);

    // Build API request for checkout session
    const sessionData = {
      branch_id: Number(session?.branchId),
      items: cart.map(item => ({
        menu_item_id: Number(item.menuItemId),
        menu_item_option_id: item.sizeId ? Number(item.sizeId) : undefined,
        quantity: item.quantity,
        unit_price: item.price,
        special_instructions: undefined as string | undefined,
      })),
      fulfillment_type: orderType as string,
      contact_name: customerName || 'Walk-in',
      contact_phone: customerPhone ? normalizeGhanaPhone(customerPhone) : '0000000000',
      payment_method: method,
      momo_number: momoNumber ? normalizeGhanaPhone(momoNumber) : undefined,
      is_manual_entry: isManualEntry || undefined,
      recorded_at: manualOpts?.recordedAt,
      customer_notes: orderNotes || undefined,
      discount: discount && discount > 0 ? discount : undefined,
    };

    // 1. Create checkout session via API
    const response = await checkoutSessionService.posCreate(sessionData);
    let csSession = response.data;

    // 2. Handle by payment method
    if (csSession.status === 'confirmed' && csSession.order) {
      // Instant methods (manual_momo, no_charge, wallet, ghqr) — already confirmed
    } else if (method === 'cash') {
      // Cash: confirm immediately (staff already verified cash received)
      const confirmed = await checkoutSessionService.confirmCash(csSession.session_token);
      csSession = confirmed.data;
    } else if (method === 'card') {
      // Card: confirm immediately (staff already swiped card)
      const confirmed = await checkoutSessionService.confirmCard(csSession.session_token);
      csSession = confirmed.data;
    } else if (method === 'mobile_money') {
      // MoMo: Hubtel RMP already initiated by backend, return pending order for polling
      // The caller (handlePaymentComplete) handles the pending state
    }

    // 3. Map checkout session result to local Order type
    const apiOrder = csSession.order;
    const order: Order = {
      id: apiOrder ? String(apiOrder.id) : csSession.session_token,
      orderNumber: apiOrder?.order_number ?? csSession.session_token,
      status: apiOrder ? (apiOrder.status as Order['status']) : 'received',
      source: isManualEntry ? 'manual_entry' : 'pos',
      fulfillmentType: orderType,
      paymentMethod: method,
      paymentStatus: csSession.status === 'confirmed' ? 'completed' : 'pending',
      isPaid: csSession.status === 'confirmed',
      items: cart.map(item => ({
        id: item.id,
        menuItemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        image: item.image,
        sizeLabel: item.variantKey,
      })),
      subtotal: csSession.subtotal,
      deliveryFee: 0,
      discount: discount ?? 0,
      tax: 0,
      serviceCharge: csSession.service_charge ?? 0,
      total: csSession.total_amount,
      contact: {
        name: customerName || 'Walk-in',
        phone: customerPhone || '',
        notes: orderNotes || undefined,
      },
      branch: {
        id: session?.branchId ?? '',
        name: branch?.name ?? '',
        address: branch?.address ?? '',
        phone: branch?.phone ?? '',
        coordinates: branch?.coordinates ?? { latitude: 0, longitude: 0 },
      },
      staffId: session?.staffId,
      staffName: session?.staffName,
      placedAt: Date.now(),
      estimatedMinutes: 15,
      timeline: [],
      // Store session token for polling pending MoMo payments
      _sessionToken: csSession.session_token,
    };

    // Add to local order store for today's tracking
    if (csSession.status === 'confirmed') {
      const input: CreateOrderInput = {
        source: isManualEntry ? 'manual_entry' : 'pos',
        fulfillmentType: orderType,
        paymentMethod: method,
        items: cart.map(item => ({
          menuItemId: item.menuItemId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          image: item.image,
          sizeId: item.sizeId,
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
        amountPaid,
      };

      createOrder(input);

      // Track shift order
      if (staffUser && staffUser.role !== 'kitchen' && staffUser.role !== 'rider') {
        getShiftService()
          .getActive(String(staffUser.id))
          .then((shift) => {
            if (shift) {
              getShiftService().addOrder(shift.id, order.orderNumber, order.total).catch(() => {});
            }
          })
          .catch(() => {});
      }
    }

    // Clear cart and reset manual entry mode
    clearCart();
    setIsPaymentOpen(false);
    if (isManualEntry) setIsManualEntry(false);

    return order;
  }, [cart, customerName, customerPhone, orderNotes, orderType, session, branches, createOrder, clearCart, staffUser, isManualEntry]);

  const updateOrderStatus = useCallback((orderId: string, status: Order['status']) => {
    const timestamps: Partial<Pick<Order, 'acceptedAt' | 'startedAt' | 'readyAt' | 'completedAt'>> = {};
    if (status === 'completed') timestamps.completedAt = Date.now();
    storeUpdateStatus(orderId, status, timestamps);
  }, [storeUpdateStatus]);

  const seedTestOrders = useCallback(() => {
    if (!session) return;
    const branch = branches.find(b => b.id === session.branchId);

    const testOrders: CreateOrderInput[] = [
      {
        source: 'pos', fulfillmentType: 'dine_in', paymentMethod: 'cash',
        items: [
          { menuItemId: '1', name: 'Jollof Rice with Chicken', quantity: 2, unitPrice: 85 },
          { menuItemId: '2', name: 'Pineapple Ginger Juice', quantity: 1, unitPrice: 28 },
        ],
        contact: { name: 'Ama Darko', phone: '0244123456' },
        branchId: session.branchId, branchName: branch?.name ?? '',
        staffId: session.staffId, staffName: session.staffName,
      },
      {
        source: 'pos', fulfillmentType: 'takeaway', paymentMethod: 'mobile_money',
        items: [
          { menuItemId: '3', name: 'Waakye Special', quantity: 1, unitPrice: 65 },
        ],
        contact: { name: 'Kweku Asante', phone: '0244567890' },
        branchId: session.branchId, branchName: branch?.name ?? '',
        staffId: session.staffId, staffName: session.staffName,
      },
      {
        source: 'pos', fulfillmentType: 'dine_in', paymentMethod: 'card',
        items: [
          { menuItemId: '4', name: 'Grilled Tilapia', quantity: 1, unitPrice: 120 },
          { menuItemId: '5', name: 'Fried Plantain', quantity: 2, unitPrice: 25 },
        ],
        contact: { name: 'Walk-in', phone: '0241234567', notes: 'Extra pepper please' },
        branchId: session.branchId, branchName: branch?.name ?? '',
        staffId: session.staffId, staffName: session.staffName,
      },
      {
        source: 'pos', fulfillmentType: 'takeaway', paymentMethod: 'cash',
        items: [
          { menuItemId: '6', name: 'Banku & Tilapia', quantity: 1, unitPrice: 95 },
          { menuItemId: '7', name: 'Sobolo', quantity: 2, unitPrice: 15 },
        ],
        contact: { name: 'Efua Mensah', phone: '0501234567' },
        branchId: session.branchId, branchName: branch?.name ?? '',
        staffId: session.staffId, staffName: session.staffName,
      },
      {
        source: 'pos', fulfillmentType: 'dine_in', paymentMethod: 'card',
        items: [
          { menuItemId: '8', name: 'Kelewele & Groundnuts', quantity: 1, unitPrice: 35 },
        ],
        contact: { name: 'Walk-in', phone: '' },
        branchId: session.branchId, branchName: branch?.name ?? '',
        staffId: session.staffId, staffName: session.staffName,
      },
    ];

    // Create each order then immediately mark it completed
    testOrders.forEach(input => {
      createOrder(input).then(order => {
        storeUpdateStatus(order.id, 'completed', { completedAt: Date.now() });
      });
    });
  }, [session, branches, createOrder, storeUpdateStatus]);

  const logout = useCallback(() => {
    setSession(null);
    clearCart();
  }, [clearCart]);

  const value: POSContextValue = {
    session,
    isSessionValid,
    isSessionLoaded,
    isNeedsBranchSelection,
    selectBranch,
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
    isManualEntry,
    setIsManualEntry,
    todayOrders,
    updateOrderStatus,
    seedTestOrders,
    logout,
  };

  return (
    <POSContext.Provider value={value}>
      {children}
    </POSContext.Provider>
  );
}
