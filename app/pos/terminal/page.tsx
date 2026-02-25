'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  MagnifyingGlassIcon,
  TrashIcon,
  MinusIcon,
  PlusIcon,
  XIcon,
  ReceiptIcon,
  UserIcon,
  NoteIcon,
  CaretRightIcon,
  CheckCircleIcon,
  StorefrontIcon,
  SignOutIcon,
  CurrencyDollarIcon,
  DeviceMobileIcon,
  CreditCardIcon,
  SpinnerIcon,
  ShoppingBagIcon,
  ForkKnifeIcon
} from '@phosphor-icons/react';
import { usePOS } from '../context';
import { formatGHS } from '@/lib/utils/currency';
import { PaymentMethod, POSOrder } from '../types';

// Mock menu data - replace with real data from your menu provider
const MENU_CATEGORIES = [
  { id: 'all', name: 'All' },
  { id: 'meals', name: 'Meals' },
  { id: 'drinks', name: 'Drinks' },
  { id: 'combos', name: 'Combos' },
  { id: 'sides', name: 'Sides' },
];

const MOCK_MENU_ITEMS = [
  { id: '1', name: 'Jollof Rice', price: 25, category: 'meals', image: '/menu/jollof.jpg' },
  { id: '2', name: 'Waakye', price: 20, category: 'meals', image: '/menu/waakye.jpg' },
  { id: '3', name: 'Banku & Tilapia', price: 45, category: 'meals', image: '/menu/banku.jpg' },
  { id: '4', name: 'Fried Rice', price: 28, category: 'meals', image: '/menu/friedrice.jpg' },
  { id: '5', name: 'Fufu & Light Soup', price: 35, category: 'meals', image: '/menu/fufu.jpg' },
  { id: '6', name: 'Kenkey & Fish', price: 22, category: 'meals', image: '/menu/kenkey.jpg' },
  { id: '7', name: 'Coca Cola', price: 8, category: 'drinks', image: '/menu/coke.jpg' },
  { id: '8', name: 'Fanta Orange', price: 8, category: 'drinks', image: '/menu/fanta.jpg' },
  { id: '9', name: 'Malta Guinness', price: 10, category: 'drinks', image: '/menu/malta.jpg' },
  { id: '10', name: 'Water (500ml)', price: 3, category: 'drinks', image: '/menu/water.jpg' },
  { id: '11', name: 'Jollof Combo', price: 40, category: 'combos', image: '/menu/combo1.jpg' },
  { id: '12', name: 'Waakye Combo', price: 35, category: 'combos', image: '/menu/combo2.jpg' },
  { id: '13', name: 'Kelewele', price: 12, category: 'sides', image: '/menu/kelewele.jpg' },
  { id: '14', name: 'Fried Plantain', price: 10, category: 'sides', image: '/menu/plantain.jpg' },
  { id: '15', name: 'Coleslaw', price: 8, category: 'sides', image: '/menu/coleslaw.jpg' },
];

// Branch data
const BRANCHES: Record<string, { name: string; address: string }> = {
  'osu': { name: 'Osu Branch', address: 'Oxford Street' },
  'eastlegon': { name: 'East Legon', address: 'A&C Mall' },
  'labone': { name: 'Labone', address: 'Labone Junction' },
  'airport': { name: 'Airport City', address: 'Airport Residential' },
};

export default function POSTerminalPage() {
  const router = useRouter();
  const {
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
    logout
  } = usePOS();

  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<POSOrder | null>(null);

  // Redirect if no session (wait until session is loaded from storage first)
  useEffect(() => {
    if (isSessionLoaded && !isSessionValid) {
      router.replace('/pos');
    }
  }, [isSessionLoaded, isSessionValid, router]);

  // Filter menu items
  const filteredItems = useMemo(() => {
    return MOCK_MENU_ITEMS.filter(item => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchesSearch = !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  // Handle item tap
  const handleItemTap = useCallback((item: typeof MOCK_MENU_ITEMS[0]) => {
    addToCart({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
    });
  }, [addToCart]);

  // Handle payment complete
  const handlePaymentComplete = async (method: PaymentMethod, amountPaid?: number, momoNumber?: string) => {
    try {
      const order = await processPayment(method, amountPaid, momoNumber);
      setCompletedOrder(order);
    } catch (error) {
      console.error('Payment failed:', error);
    }
  };

  // Get branch info
  const branchInfo = session ? BRANCHES[session.branchId] : null;

  // Today's stats
  const todayStats = useMemo(() => {
    const completed = todayOrders.filter(o => o.paymentStatus === 'completed');
    return {
      orderCount: completed.length,
      revenue: completed.reduce((sum, o) => sum + o.total, 0),
    };
  }, [todayOrders]);

  if (!session) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-brand-darker">
        <SpinnerIcon className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col lg:flex-row bg-brand-darker">
      {/* Main Content - Menu Grid */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <header className="flex-shrink-0 px-4 py-3 border-b border-brown/30 flex items-center justify-between gap-4">
          {/* Left - Branch & Staff */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <StorefrontIcon className="w-5 h-5 text-primary" />
            </div>
            <div className="hidden sm:block">
              <p className="text-neutral-light font-medium text-sm">{branchInfo?.name}</p>
              <p className="text-neutral-gray text-xs">{session.staffName}</p>
            </div>
          </div>

          {/* Center - Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-gray" />
              <input
                type="text"
                placeholder="Quick search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="
                  w-full h-11 pl-10 pr-4 rounded-xl
                  bg-brown/40 text-neutral-light placeholder:text-neutral-gray/60
                  border border-transparent focus:border-primary/50
                  outline-none transition-colors
                "
              />
            </div>
          </div>

          {/* Right - Stats & Actions */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-4 px-4 py-2 rounded-xl bg-brown/30">
              <div className="text-center">
                <p className="text-xs text-neutral-gray">Orders</p>
                <p className="text-lg font-medium text-neutral-light">{todayStats.orderCount}</p>
              </div>
              <div className="w-px h-8 bg-brown-light/30" />
              <div className="text-center">
                <p className="text-xs text-neutral-gray">Revenue</p>
                <p className="text-lg font-medium text-primary">{formatGHS(todayStats.revenue)}</p>
              </div>
            </div>

            <button
              onClick={() => {
                if (confirm('Sign out of POS?')) {
                  logout();
                  router.replace('/pos');
                }
              }}
              className="w-10 h-10 rounded-xl bg-brown/40 flex items-center justify-center text-neutral-gray hover:text-error hover:bg-error/10 transition-colors"
              title="Sign Out"
            >
              <SignOutIcon className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Category Tabs */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-brown/20">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {MENU_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`
                  px-5 py-2.5 rounded-xl font-medium whitespace-nowrap
                  transition-all duration-150
                  ${activeCategory === cat.id
                    ? 'bg-primary text-brown'
                    : 'bg-brown/40 text-neutral-light hover:bg-brown/60'
                  }
                `}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleItemTap(item)}
                className="
                  bg-brown/40 rounded-2xl p-3 text-left
                  hover:bg-brown/60 active:scale-[0.97]
                  transition-all duration-100
                  group
                "
              >
                {/* Image placeholder */}
                <div className="aspect-square rounded-xl bg-brown-light/20 mb-3 overflow-hidden relative">
                  <div className="absolute inset-0 flex items-center justify-center text-neutral-gray/40">
                    <ForkKnifeIcon className="w-10 h-10" />
                  </div>
                  {/* Uncomment when you have real images */}
                  {/* <Image src={item.image} alt={item.name} fill className="object-cover" /> */}
                </div>
                <p className="text-neutral-light font-medium text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                  {item.name}
                </p>
                <p className="text-primary font-semibold">
                  {formatGHS(item.price)}
                </p>
              </button>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-gray">
              <MagnifyingGlassIcon className="w-12 h-12 mb-4 opacity-40" />
              <p>No items found</p>
            </div>
          )}
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-full lg:w-96 xl:w-[420px] border-t lg:border-t-0 lg:border-l border-brown/30 flex flex-col bg-brand-dark">
        {/* Cart Header */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-brown/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ReceiptIcon className="w-5 h-5 text-primary" />
            <span className="font-medium text-neutral-light">Current Order</span>
            {cartCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                {cartCount}
              </span>
            )}
          </div>

          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-sm text-error/80 hover:text-error transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Order Type Toggle */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-brown/20">
          <div className="flex gap-2">
            <button
              onClick={() => setOrderType('dine_in')}
              className={`
                flex-1 py-2.5 rounded-xl font-medium text-sm
                transition-all duration-150
                ${orderType === 'dine_in'
                  ? 'bg-primary text-brown'
                  : 'bg-brown/40 text-neutral-light hover:bg-brown/60'
                }
              `}
            >
              Dine In
            </button>
            <button
              onClick={() => setOrderType('takeaway')}
              className={`
                flex-1 py-2.5 rounded-xl font-medium text-sm
                transition-all duration-150
                ${orderType === 'takeaway'
                  ? 'bg-primary text-brown'
                  : 'bg-brown/40 text-neutral-light hover:bg-brown/60'
                }
              `}
            >
              Takeaway
            </button>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-gray">
              <ShoppingBagIcon className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg mb-1">Cart is empty</p>
              <p className="text-sm opacity-60">Tap items to add</p>
            </div>
          ) : (
            cart.map(item => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-brown/30"
              >
                {/* Item image placeholder */}
                <div className="w-14 h-14 rounded-lg bg-brown-light/20 flex-shrink-0 flex items-center justify-center">
                  <ForkKnifeIcon className="w-6 h-6 text-neutral-gray/40" />
                </div>

                {/* Item details */}
                <div className="flex-1 min-w-0">
                  <p className="text-neutral-light font-medium text-sm truncate">
                    {item.name}
                  </p>
                  <p className="text-primary font-semibold text-sm">
                    {formatGHS(item.price * item.quantity)}
                  </p>
                </div>

                {/* Quantity controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-8 h-8 rounded-lg bg-brown/60 flex items-center justify-center text-neutral-light hover:bg-brown active:scale-95 transition-all"
                  >
                    <MinusIcon className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center text-neutral-light font-medium">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-8 h-8 rounded-lg bg-brown/60 flex items-center justify-center text-neutral-light hover:bg-brown active:scale-95 transition-all"
                  >
                    <PlusIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* Remove button */}
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-gray hover:text-error hover:bg-error/10 transition-all"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Order Details Toggle */}
        {cart.length > 0 && (
          <div className="flex-shrink-0 px-4 py-2 border-t border-brown/20">
            <button
              onClick={() => setShowOrderDetails(!showOrderDetails)}
              className="w-full flex items-center justify-between py-2 text-neutral-gray hover:text-neutral-light transition-colors"
            >
              <span className="text-sm">Customer details</span>
              <CaretRightIcon className={`w-4 h-4 transition-transform ${showOrderDetails ? 'rotate-90' : ''}`} />
            </button>

            {showOrderDetails && (
              <div className="space-y-3 pb-3">
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-gray" />
                  <input
                    type="text"
                    placeholder="Customer name (optional)"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="
                      w-full h-10 pl-9 pr-3 rounded-lg
                      bg-brown/40 text-neutral-light placeholder:text-neutral-gray/60
                      border border-transparent focus:border-primary/50
                      outline-none text-sm transition-colors
                    "
                  />
                </div>
                <div className="relative">
                  <NoteIcon className="absolute left-3 top-3 w-4 h-4 text-neutral-gray" />
                  <textarea
                    placeholder="Order notes (optional)"
                    value={orderNotes}
                    onChange={e => setOrderNotes(e.target.value)}
                    rows={2}
                    className="
                      w-full pl-9 pr-3 py-2 rounded-lg
                      bg-brown/40 text-neutral-light placeholder:text-neutral-gray/60
                      border border-transparent focus:border-primary/50
                      outline-none text-sm resize-none transition-colors
                    "
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Total & Pay Button */}
        <div className="flex-shrink-0 p-4 border-t border-brown/30 bg-brand-darker">
          <div className="flex items-center justify-between mb-4">
            <span className="text-neutral-gray">Total</span>
            <span className="text-2xl font-bold text-primary">
              {formatGHS(cartTotal)}
            </span>
          </div>

          <button
            onClick={openPayment}
            disabled={cart.length === 0}
            className="
              w-full h-14 rounded-2xl font-semibold text-lg
              bg-primary text-brown
              hover:bg-primary-hover active:scale-[0.98]
              disabled:opacity-40 disabled:active:scale-100
              transition-all duration-150
              flex items-center justify-center gap-2
            "
          >
            Pay {formatGHS(cartTotal)}
            <CaretRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {isPaymentOpen && (
        <PaymentModal
          total={cartTotal}
          onClose={closePayment}
          onPayment={handlePaymentComplete}
        />
      )}

      {/* Success Modal */}
      {completedOrder && (
        <OrderSuccessModal
          order={completedOrder}
          onClose={() => setCompletedOrder(null)}
        />
      )}
    </div>
  );
}

// Payment Modal Component
interface PaymentModalProps {
  total: number;
  onClose: () => void;
  onPayment: (method: PaymentMethod, amountPaid?: number, momoNumber?: string) => void;
}

function PaymentModal({ total, onClose, onPayment }: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [cashAmount, setCashAmount] = useState('');
  const [momoNumber, setMomoNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const cashChange = useMemo(() => {
    const paid = parseFloat(cashAmount) || 0;
    return paid - total;
  }, [cashAmount, total]);

  const quickAmounts = useMemo(() => {
    const amounts: number[] = [];
    const roundUp5 = Math.ceil(total / 5) * 5;
    const roundUp10 = Math.ceil(total / 10) * 10;
    const roundUp20 = Math.ceil(total / 20) * 20;
    const roundUp50 = Math.ceil(total / 50) * 50;

    [roundUp5, roundUp10, roundUp20, roundUp50].forEach(amt => {
      if (!amounts.includes(amt) && amt >= total) {
        amounts.push(amt);
      }
    });

    return amounts.slice(0, 4);
  }, [total]);

  const handleConfirm = async () => {
    if (!selectedMethod) return;

    setIsProcessing(true);

    if (selectedMethod === 'cash') {
      const paid = parseFloat(cashAmount) || total;
      if (paid < total) {
        alert('Amount paid is less than total');
        setIsProcessing(false);
        return;
      }
      await onPayment('cash', paid);
    } else if (selectedMethod === 'momo') {
      if (momoNumber.length < 10) {
        alert('Please enter a valid phone number');
        setIsProcessing(false);
        return;
      }
      await onPayment('momo', undefined, momoNumber);
    } else {
      await onPayment('card');
    }

    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-md bg-brand-dark rounded-3xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-brown/30 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-neutral-light">Payment</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-neutral-gray hover:text-neutral-light hover:bg-brown/40 transition-all"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Total */}
        <div className="px-6 py-6 border-b border-brown/20 text-center">
          <p className="text-neutral-gray text-sm mb-1">Amount Due</p>
          <p className="text-4xl font-bold text-primary">{formatGHS(total)}</p>
        </div>

        {/* Payment Methods */}
        <div className="p-6 space-y-4">
          <p className="text-neutral-gray text-sm">Select payment method</p>

          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'cash' as const, label: 'Cash', icon: CurrencyDollarIcon },
              { id: 'momo' as const, label: 'MoMo', icon: DeviceMobileIcon },
              { id: 'card' as const, label: 'Card', icon: CreditCardIcon },
            ].map(method => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={`
                  py-4 rounded-2xl flex flex-col items-center gap-2
                  transition-all duration-150
                  ${selectedMethod === method.id
                    ? 'bg-primary text-brown ring-2 ring-primary ring-offset-2 ring-offset-brand-dark'
                    : 'bg-brown/40 text-neutral-light hover:bg-brown/60'
                  }
                `}
              >
                <method.icon className="w-7 h-7" />
                <span className="font-medium text-sm">{method.label}</span>
              </button>
            ))}
          </div>

          {/* Cash Input */}
          {selectedMethod === 'cash' && (
            <div className="space-y-3 pt-2">
              <input
                type="number"
                placeholder="Amount received"
                value={cashAmount}
                onChange={e => setCashAmount(e.target.value)}
                className="
                  w-full h-14 px-4 rounded-xl text-center text-2xl font-semibold
                  bg-brown/40 text-neutral-light placeholder:text-neutral-gray/60
                  border border-transparent focus:border-primary/50
                  outline-none transition-colors
                "
                autoFocus
              />

              {/* Quick amounts */}
              <div className="flex gap-2">
                {quickAmounts.map(amt => (
                  <button
                    key={amt}
                    onClick={() => setCashAmount(amt.toString())}
                    className="flex-1 py-2 rounded-lg bg-brown/60 text-neutral-light font-medium hover:bg-brown transition-colors"
                  >
                    {formatGHS(amt)}
                  </button>
                ))}
              </div>

              {/* Change display */}
              {cashChange >= 0 && parseFloat(cashAmount) > 0 && (
                <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-secondary/10 border border-secondary/30">
                  <span className="text-secondary">Change</span>
                  <span className="text-xl font-bold text-secondary">{formatGHS(cashChange)}</span>
                </div>
              )}
            </div>
          )}

          {/* MoMo Input */}
          {selectedMethod === 'momo' && (
            <div className="pt-2">
              <input
                type="tel"
                placeholder="Customer phone number"
                value={momoNumber}
                onChange={e => setMomoNumber(e.target.value)}
                className="
                  w-full h-14 px-4 rounded-xl text-center text-xl
                  bg-brown/40 text-neutral-light placeholder:text-neutral-gray/60
                  border border-transparent focus:border-primary/50
                  outline-none transition-colors
                "
                autoFocus
              />
              <p className="text-neutral-gray/60 text-xs text-center mt-2">
                Customer will receive a payment prompt
              </p>
            </div>
          )}

          {/* Card message */}
          {selectedMethod === 'card' && (
            <div className="pt-2 text-center text-neutral-gray">
              <p>Ready for card terminal</p>
              <p className="text-xs mt-1 opacity-60">Process payment on card machine</p>
            </div>
          )}
        </div>

        {/* Confirm Button */}
        <div className="p-6 pt-0">
          <button
            onClick={handleConfirm}
            disabled={!selectedMethod || isProcessing}
            className="
              w-full h-14 rounded-2xl font-semibold text-lg
              bg-primary text-brown
              hover:bg-primary-hover active:scale-[0.98]
              disabled:opacity-40 disabled:active:scale-100
              transition-all duration-150
              flex items-center justify-center gap-2
            "
          >
            {isProcessing ? (
              <>
                <SpinnerIcon className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Confirm Payment
                <CheckCircleIcon className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Order Success Modal
interface OrderSuccessModalProps {
  order: POSOrder;
  onClose: () => void;
}

function OrderSuccessModal({ order, onClose }: OrderSuccessModalProps) {
  // Auto close after 5 seconds
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-sm bg-brand-dark rounded-3xl overflow-hidden text-center">
        {/* Success Icon */}
        <div className="pt-8 pb-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-secondary/20 flex items-center justify-center">
            <CheckCircleIcon className="w-10 h-10 text-secondary" weight="fill" />
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          <h2 className="text-2xl font-bold text-neutral-light mb-2">
            Payment Complete
          </h2>
          <p className="text-neutral-gray mb-6">
            Order #{order.id} has been placed
          </p>

          {/* Order Summary */}
          <div className="bg-brown/30 rounded-2xl p-4 text-left mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-neutral-gray">Items</span>
              <span className="text-neutral-light">{order.items.length}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-neutral-gray">Type</span>
              <span className="text-neutral-light capitalize">{order.orderType.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-neutral-gray">Payment</span>
              <span className="text-neutral-light capitalize">{order.paymentMethod}</span>
            </div>
            <div className="border-t border-brown-light/30 my-2" />
            <div className="flex justify-between font-semibold">
              <span className="text-neutral-light">Total</span>
              <span className="text-primary">{formatGHS(order.total)}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="
              w-full h-12 rounded-xl font-medium
              bg-primary text-brown
              hover:bg-primary-hover active:scale-[0.98]
              transition-all duration-150
            "
          >
            New Order
          </button>
        </div>

        {/* Auto close indicator */}
        <div className="h-1 bg-brown/30">
          <div
            className="h-full bg-primary animate-shrink"
            style={{ animationDuration: '5s' }}
          />
        </div>
      </div>
    </div>
  );
}
