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
import type { Order, PaymentMethod, CreateOrderInput, OrderSource } from '@/types/order';
import type { POSSession, POSCartItem } from './types';
import { useOrderStore } from '@/app/components/providers/OrderStoreProvider';
import { useBranch } from '@/app/components/providers/BranchProvider';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { roleNeedsBranch } from '@/types/staff';
import { useOperableBranches } from '@/lib/hooks/useOperableBranches';
import { useOrderStream } from '@/lib/hooks/useOrderStream';
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
  /**
   * Whether this operator works across the whole company rather than one
   * branch — the call centre, and head office. Mirrors the backend's
   * User::isCompanyWide, which is what actually decides whether an order may
   * be written against a branch. The screen reads it to know whether the
   * branch is a property of the shift or of each individual order.
   */
  isCompanyWide: boolean;

  /**
   * Whether the customer is on the other end of something rather than standing
   * at the counter — driven by the channel, not the operator's role.
   *
   * This is what the screen is shaped around: the caller's name and number in
   * the top bar, Pickup/Delivery instead of Dine-in/Takeaway, no till takings.
   * It used to be `isCompanyWide`, which meant every admin, warehouse manager
   * and purchasing clerk opening the POS was handed the call centre's screen,
   * while the one thing that actually decides it — how the order came in — was
   * sitting right there unused.
   */
  isRemoteOrder: boolean;

  /** Forget the branch so the next order names its own. See the implementation. */
  resetBranchForNextOrder: () => void;

  /**
   * Which channel this order came in on. A till order is 'pos'; the call
   * centre picks the channel they took the call on. Collected here because
   * this is where the order is assembled — the old wizard asked for it, then
   * dropped it on the floor, and every call-centre order in the database is
   * recorded as a walk-in as a result.
   */
  orderSource: OrderSource;
  setOrderSource: (source: OrderSource) => void;

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
  /**
   * `pickup` is the call centre's: the caller collects it from the branch
   * themselves. Distinct from `takeaway`, which is someone already standing at
   * the counter — the branch needs to know whether to expect anyone.
   */
  orderType: 'dine_in' | 'takeaway' | 'pickup' | 'delivery';
  setOrderType: (type: 'dine_in' | 'takeaway' | 'pickup' | 'delivery') => void;
  deliveryFee: number;
  setDeliveryFee: (fee: number) => void;

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
  const { branches: operableBranches, isLoading: isOperableLoading } = useOperableBranches();

  // Session state
  const [session, setSession] = useState<POSSession | null>(null);
  const [isSessionLoaded, setIsSessionLoaded] = useState(false);

  // Cart state
  const [cart, setCart] = useState<POSCartItem[]>([]);

  // Order details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [chosenType, setOrderType] = useState<'dine_in' | 'takeaway' | 'pickup' | 'delivery' | null>(null);
  // Null means "not chosen" rather than a value, so the default can follow the
  // operator without an effect syncing one piece of state to another — there is
  // no render where the source disagrees with who is looking at the screen.
  const [chosenSource, setOrderSource] = useState<OrderSource | null>(null);
  const [deliveryFee, setDeliveryFee] = useState(0);

  // Payment modal
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  // Manual entry mode
  const [isManualEntry, setIsManualEntry] = useState(false);

  // OrderStore
  const {
    orders: allOrders,
    addLocalOrder,
    createOrder,
    updateOrderStatus: storeUpdateStatus,
    refresh: refreshOrders,
  } = useOrderStore();

  // Build session from live auth context (always fresh from API)
  useEffect(() => {
    // Wait for the branch list too. For a company-wide operator it arrives from
    // the branches API rather than with the login, so building the session
    // before it lands would compute an empty branch set and then have to
    // correct itself — visibly, as a flash of the branch picker.
    if (isAuthLoading || isOperableLoading) return;
    if (staffUser?.id) {
      // The shared answer, not `staffUser.branches`. Keying off the raw
      // assignment meant an admin carrying one stale branch row was treated as
      // a one-branch cashier and locked to it, while a genuinely unassigned
      // admin fell through a separate "empty means everything" escape hatch —
      // two different rules for the same question, in the same function.
      const branchIds: string[] = operableBranches.map(b => b.id);
      const defaultBranchId = branchIds.length === 1 ? branchIds[0] : '';
      setSession(prev => {
        // Restore persisted branch selection for this staff member
        const storedBranchId = localStorage.getItem(POS_BRANCH_KEY);
        const isStoredValid = storedBranchId && branchIds.includes(storedBranchId);
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
  }, [staffUser, isAuthLoading, isOperableLoading, operableBranches]);

  // The role decides, not the branch list: an agent with no branches assigned
  // and an agent whose assignment has not loaded yet look identical otherwise.
  //
  // This answers exactly one question: must this operator name a branch for
  // each order, because they have no home branch of their own? It used to
  // answer a second one as well — whether to show the call centre's layout —
  // and those are not the same question. See isRemoteOrder.
  const isCompanyWide = useMemo(
    () => (staffUser ? !roleNeedsBranch(staffUser.role) : false),
    [staffUser],
  );

  // Only the call centre starts on the phone. Everyone else starts at a till,
  // including admins and head office: having no home branch does not make you
  // an agent, and defaulting on `isCompanyWide` handed the agent's screen to
  // admins, warehouse managers and purchasing clerks who never wanted it.
  const takesCallsByDefault = staffUser?.role === 'call_center';

  const orderSource: OrderSource = chosenSource ?? (takesCallsByDefault ? 'phone' : 'pos');

  /**
   * Whether the customer is on the other end of something rather than standing
   * at the counter. This — not the operator's role — is what the screen should
   * be shaped around: an admin taking a call needs the caller's name and number
   * just as much as an agent does, and a warehouse manager ringing up a staff
   * lunch at the till does not.
   */
  const isRemoteOrder = orderSource !== 'pos';

  // A caller either collects it themselves or has it delivered. Dine-in and
  // takeaway are things you pick while standing in the shop, so they are not
  // where a phone order starts. Derived rather than synced, so there is no
  // render where the default disagrees with the channel on screen.
  const orderType = chosenType ?? (isRemoteOrder ? 'pickup' : 'dine_in');

  /**
   * Switching channel re-asks the fulfilment question.
   *
   * Moving between the counter and the phone changes which answers exist —
   * dine-in is not on offer to a caller, and pickup/delivery is not what the
   * till leads with. Without this, an operator who picked dine-in and then
   * switched to phone kept dine-in while looking at a toggle offering only
   * Pickup and Delivery, with neither lit.
   */
  const changeOrderSource = useCallback((next: OrderSource) => {
    const wasRemote = (chosenSource ?? (takesCallsByDefault ? 'phone' : 'pos')) !== 'pos';
    const willBeRemote = next !== 'pos';

    if (wasRemote !== willBeRemote) {
      setOrderType(null);
    }

    setOrderSource(next);
  }, [chosenSource, takesCallsByDefault]);

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

  /**
   * Keep the till's own figures live.
   *
   * The order store polls, and until now that poll was the only thing that
   * moved these numbers — so an order taken on the other till, or accepted on
   * the board, sat invisible here for up to eight seconds and the Orders badge
   * lagged behind the kitchen. Reverb is the branch's own feed; a frame on it
   * means something this screen is showing has changed.
   */
  useOrderStream(
    session?.branchId ?? null,
    useCallback(() => {
      void refreshOrders();
    }, [refreshOrders]),
  );

  /**
   * Today's orders at this branch that belong to this person.
   *
   * Scoped to the person for a cashier, because that is their own take and what
   * they reconcile at the end of a shift. Not scoped for anyone company-wide:
   * an admin opening the till was being shown only orders they had rung up
   * themselves, which is nearly always none — three paid orders would be on the
   * counter and the screen would read zero, because Rosina rang them up and the
   * admin did not.
   *
   * Ownership, not channel. This used to also require `source === 'pos'`, which
   * meant a call-centre agent's own orders never counted towards their figures
   * and an online order a cashier accepted credited nobody. An order belongs to
   * whoever is named on it: the person who rang it up, took the call, or
   * accepted it. See OrderManagementService::updateOrderStatus, which stamps
   * that name on accept.
   */
  const todayOrders = useMemo(() => {
    if (!session) return [];
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return allOrders.filter(o =>
      o.branch.id === session.branchId &&
      o.placedAt >= startOfDay.getTime() &&
      (isCompanyWide || o.staffId === session.staffId)
    );
  }, [allOrders, session, isCompanyWide]);

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
    setDeliveryFee(0);
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

    // Delivery fee only applies to delivery orders
    const effectiveDeliveryFee = orderType === 'delivery' && deliveryFee > 0 ? deliveryFee : 0;

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
      delivery_fee: effectiveDeliveryFee > 0 ? effectiveDeliveryFee : undefined,
      // The channel, so the order is not filed as a walk-in at the counter.
      order_source: orderSource,
    };

    // 1. Create checkout session via API
    let csSession = await checkoutSessionService.posCreate(sessionData);

    // 2. Handle by payment method
    if (csSession.status === 'confirmed' && csSession.order) {
      // Instant methods (manual_momo, no_charge, wallet, ghqr) — already confirmed
    } else if (method === 'cash') {
      // Cash: confirm immediately (staff already verified cash received)
      csSession = await checkoutSessionService.confirmCash(csSession.session_token, amountPaid ?? csSession.total_amount);
    } else if (method === 'card') {
      // Card: confirm immediately (staff already swiped card)
      csSession = await checkoutSessionService.confirmCard(csSession.session_token, amountPaid ?? csSession.total_amount);
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
      // Carried through so the confirmation modal can print a QR. This object
      // is built by hand rather than run through an adapter, so every field the
      // receipt needs has to be listed here explicitly or it is simply absent.
      receiptVerificationCode:
        (apiOrder as { receipt_verification_code?: string } | undefined)
          ?.receipt_verification_code ?? undefined,
      source: isManualEntry ? 'manual_entry' : orderSource,
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
        sizeLabel: item.name,
      })),
      subtotal: Number(csSession.subtotal ?? apiOrder?.subtotal ?? cart.reduce((sum, item) => sum + item.price * item.quantity, 0)),
      deliveryFee: Number(csSession.delivery_fee ?? apiOrder?.delivery_fee ?? effectiveDeliveryFee),
      discount: Number(discount ?? 0),
      tax: 0,
      serviceCharge: Number(csSession.service_charge ?? apiOrder?.service_charge ?? 0),
      total: Number(csSession.total_amount ?? apiOrder?.total ?? cart.reduce((sum, item) => sum + item.price * item.quantity, 0) - (discount ?? 0) + effectiveDeliveryFee),
      amountPaid: amountPaid,
      momoNumber: momoNumber,
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
      placedAt: manualOpts?.recordedAt ? new Date(manualOpts.recordedAt).getTime() : new Date(apiOrder?.created_at ?? csSession.created_at).getTime(),
      estimatedMinutes: 15,
      timeline: [],
      // Store session token for polling pending MoMo payments
      _sessionToken: csSession.session_token,
    };

    // Add to local order store for today's tracking (no API call - order already created via checkout session)
    if (csSession.status === 'confirmed') {
      addLocalOrder(order);

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
  }, [cart, customerName, customerPhone, orderNotes, orderType, orderSource, deliveryFee, session, branches, addLocalOrder, clearCart, staffUser, isManualEntry]);

  /**
   * Forget the branch so the next order has to name its own.
   *
   * Called when the operator starts the next order, not when they finish the
   * last one. Clearing it at payment time tore the screen down mid-transaction:
   * `isNeedsBranchSelection` flips the terminal to the branch picker, which
   * replaced the "order placed" confirmation before anyone could read it.
   *
   * Only for someone working across the company. A branch till stays on its
   * branch — that is the whole shift.
   */
  const resetBranchForNextOrder = useCallback(() => {
    if (!isCompanyWide) return;
    // Asking again only makes sense when there is another answer available.
    // An admin is company-wide, so on a single-branch estate this threw the
    // branch picker up after every single sale — a full-screen question with
    // one possible response, between the operator and the next customer.
    if (operableBranches.length < 2) return;
    localStorage.removeItem(POS_BRANCH_KEY);
    setSession(prev => (prev ? { ...prev, branchId: '' } : prev));
  }, [isCompanyWide, operableBranches.length]);

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
    isCompanyWide,
    isRemoteOrder,
    resetBranchForNextOrder,
    orderSource,
    setOrderSource: changeOrderSource,
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
    deliveryFee,
    setDeliveryFee,
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
