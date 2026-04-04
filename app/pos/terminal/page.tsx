'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  ProhibitIcon,
  SpinnerIcon,
  ShoppingBagIcon,
  ClipboardTextIcon,
  PrinterIcon,
  TagIcon,
  HourglassIcon,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { usePOS } from '../context';
import { formatGHS } from '@/lib/utils/currency';
import apiClient from '@/lib/api/client';
import { toast } from '@/lib/utils/toast';
import type { PaymentMethod, Order } from '@/types/order';
import type { DisplayMenuItem } from '@/lib/api/adapters/menu.adapter';
import { useBranch } from '@/app/components/providers/BranchProvider';
import { useMenuItems } from '@/lib/api/hooks/useMenuItems';
import { printReceipt } from '@/lib/utils/printReceipt';
import { getPromoService, type Promo } from '@/lib/services/promos/promo.service';
import { SignOutDialog } from '@/app/components/ui/SignOutDialog';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import BranchSelectPage from '@/app/components/ui/BranchSelectPage';
import BranchSwitcherDialog from '@/app/components/ui/BranchSwitcherDialog';
import { isValidGhanaPhone, normalizeGhanaPhone } from '@/app/lib/phone';
import PendingPaymentsDrawer from './PendingPaymentsDrawer';
import { usePosCheckoutSessions } from '@/lib/api/hooks/useCheckoutSession';

interface ItemOption {
  key: string;
  label: string;
  name: string;
  price: number;
  menuItemId: string;
  sizeId?: number;
  variantKey?: string;
}

function getItemOptions(item: DisplayMenuItem): ItemOption[] {
  if (item.sizes && item.sizes.length > 0) {
    return item.sizes.map(size => ({
      key: `${item.id}|${size.key}`,
      label: size.label,
      name: size.displayName || `${size.label} ${item.name}`,
      price: size.price,
      menuItemId: item.id,
      sizeId: size.id,
      variantKey: size.key,
    }));
  }

  if (item.hasVariants && item.variants) {
    const options: ItemOption[] = [];
    if (item.variants.plain !== undefined) {
      options.push({
        key: `${item.id}|plain`,
        label: 'Plain',
        name: `${item.name} (Plain)`,
        price: item.variants.plain,
        menuItemId: item.id,
        variantKey: 'plain',
      });
    }
    if (item.variants.assorted !== undefined) {
      options.push({
        key: `${item.id}|assorted`,
        label: 'Assorted',
        name: `${item.name} (Assorted)`,
        price: item.variants.assorted,
        menuItemId: item.id,
        variantKey: 'assorted',
      });
    }
    return options;
  }

  if (item.price !== undefined) {
    return [{
      key: item.id,
      label: 'Regular',
      name: item.name,
      price: item.price,
      menuItemId: item.id,
      variantKey: 'regular',
    }];
  }

  return [];
}

export default function POSTerminalPage() {
  const router = useRouter();
  const {
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
  } = usePOS();
  const { logout } = useStaffAuth();
  const { branches } = useBranch();
  const { items: menuItems, categories: menuCategories, isLoading: menuLoading } = useMenuItems();

  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [pendingMomoOrder, setPendingMomoOrder] = useState<Order | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [activePromo, setActivePromo] = useState<Promo | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);
  const [isBranchSwitcherOpen, setIsBranchSwitcherOpen] = useState(false);
  const [optionPickerItem, setOptionPickerItem] = useState<DisplayMenuItem | null>(null);
  const [isPendingDrawerOpen, setIsPendingDrawerOpen] = useState(false);
  const [backgroundMomoToken, setBackgroundMomoToken] = useState<string | null>(null);
  const [backgroundConfirmedOrder, setBackgroundConfirmedOrder] = useState<Order | null>(null);

  // Pending checkout sessions count for badge
  const { data: pendingSessionsData } = usePosCheckoutSessions(
    session?.branchId ? { branch_id: Number(session.branchId), status: 'pending,payment_initiated' } : undefined
  );
  const pendingCount = pendingSessionsData?.data?.length ?? 0;

  // Redirect if no session (but not if we just need branch selection)
  useEffect(() => {
    if (isSessionLoaded && !isSessionValid && !isNeedsBranchSelection) {
      router.replace('/staff/login');
    }
  }, [isSessionLoaded, isSessionValid, isNeedsBranchSelection, router]);

  // Resolve promo whenever cart changes
  useEffect(() => {
    if (!session?.branchId || cart.length === 0) { setActivePromo(null); setPromoDiscount(0); return; }
    const itemIds = cart.map(c => c.menuItemId);
    getPromoService().resolvePromo(itemIds, session.branchId).then(p => {
      if (!p) { setActivePromo(null); setPromoDiscount(0); return; }
      setActivePromo(p);
      setPromoDiscount(getPromoService().calculateDiscount(p, cartTotal));
    }).catch(() => { setActivePromo(null); setPromoDiscount(0); });
  }, [cart, session?.branchId, cartTotal]);

  // Background poll for dismissed MoMo sessions — detect when payment completes
  useEffect(() => {
    if (!backgroundMomoToken) return;
    const interval = setInterval(async () => {
      try {
        const { checkoutSessionService } = await import('@/lib/api/services/checkout-session.service');
        const cs = await checkoutSessionService.posGetStatus(backgroundMomoToken);
        if (cs.status === 'confirmed' && cs.order) {
          clearInterval(interval);
          setBackgroundMomoToken(null);
          const o = cs.order;
          setBackgroundConfirmedOrder({
            orderNumber: o.order_number ?? '',
            status: 'received',
            paymentStatus: 'completed',
            isPaid: true,
            total: o.total_amount ?? cs.total_amount,
            items: (o.items ?? []).map((i) => ({
              name: i.menu_item?.name ?? i.menu_item_snapshot?.name ?? 'Item',
              quantity: i.quantity,
              price: i.unit_price,
            })),
            contact: { name: o.contact_name, phone: o.contact_phone },
          } as unknown as Order);
        } else if (cs.status === 'failed' || cs.status === 'expired') {
          clearInterval(interval);
          setBackgroundMomoToken(null);
        }
      } catch { /* ignore poll errors */ }
    }, 7000);
    return () => clearInterval(interval);
  }, [backgroundMomoToken]);

  // Branches this staff member can switch between (empty branchIds = admin = all branches)
  const switchableBranches = useMemo(() => {
    if (!session?.branchIds?.length) return branches;
    return branches.filter(b => (session.branchIds ?? []).includes(b.id));
  }, [session, branches]);

  // Get branch info and its allowed menu item IDs
  const branchInfo = useMemo(
    () => session ? branches.find(b => b.id === session.branchId) ?? null : null,
    [session, branches]
  );

  // Fallback to all items if branchInfo is null (e.g. stale session with old branch IDs)
  const branchMenuIds = useMemo(
    () => branchInfo?.menuItemIds ?? menuItems.map(i => i.id),
    [branchInfo, menuItems]
  );

  // All menu items available at this branch
  const branchMenuItems = useMemo(
    () => menuItems.filter(item => branchMenuIds.includes(item.id)),
    [branchMenuIds, menuItems]
  );

  const allCategories = useMemo(
    () => [{ id: 'all', name: 'All' }, ...menuCategories.filter(c => c.id !== 'all')],
    [menuCategories]
  );

  // Filter by active category and search
  const filteredItems = useMemo(() => {
    return branchMenuItems.filter(item => {
      const matchesCategory = activeCategory === 'all'
        ? true
        : item.category === (menuCategories.find(c => c.id === activeCategory)?.name ?? activeCategory);
      const matchesSearch = !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [branchMenuItems, activeCategory, searchQuery, menuCategories]);

  // When searching, ignore category filter
  const displayedItems = useMemo(() => {
    if (searchQuery) {
      return branchMenuItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filteredItems;
  }, [searchQuery, branchMenuItems, filteredItems]);

  const handleOptionAdd = useCallback((option: ItemOption) => {
    addToCart({
      menuItemId: option.menuItemId,
      name: option.name,
      price: option.price,
      sizeId: option.sizeId,
      variantKey: option.variantKey,
    });
  }, [addToCart]);

  const handleItemTap = useCallback((item: DisplayMenuItem) => {
    const options = getItemOptions(item);
    if (options.length > 1) {
      setOptionPickerItem(item);
      return;
    }
    if (options.length === 1) {
      handleOptionAdd(options[0]);
    }
  }, [handleOptionAdd]);

  const getItemCartQty = useCallback((item: DisplayMenuItem): number => {
    return cart
      .filter(c => c.menuItemId === item.id)
      .reduce((sum, c) => sum + c.quantity, 0);
  }, [cart]);

  // Effective total after any promo discount
  const effectiveTotal = Math.max(0, cartTotal - promoDiscount);

  // Handle payment complete
  const handlePaymentComplete = async (method: PaymentMethod, amountPaid?: number, momoNumber?: string, manualOpts?: { recordedAt: string; momoReference?: string }) => {
    try {
      const order = await processPayment(method, amountPaid, momoNumber, promoDiscount > 0 ? promoDiscount : undefined, manualOpts);
      if (method === 'mobile_money' && order.paymentStatus === 'pending') {
        // RMP: show waiting UI — payment is pending customer USSD approval
        setPendingMomoOrder(order);
      } else {
        setCompletedOrder(order);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> }; status?: number } };
      const apiMsg = axiosErr?.response?.data?.message;
      const apiErrors = axiosErr?.response?.data?.errors;
      const status = axiosErr?.response?.status;
      console.error('[POS] Order creation failed:', { status, apiMsg, apiErrors, err });
      toast.error(apiMsg || 'Failed to create order. Please try again.');
    }
  };

  // Today's stats
  const todayStats = useMemo(() => {
    const completed = todayOrders.filter(o => o.paymentStatus === 'completed');
    const activeCount = todayOrders.filter(o => o.status === 'received' || o.status === 'preparing').length;
    return {
      orderCount: completed.length,
      revenue: completed.reduce((sum, o) => sum + o.total, 0),
      activeCount,
    };
  }, [todayOrders]);

  if (!session) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-neutral-light">
        <SpinnerIcon className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (isNeedsBranchSelection) {
    const selectableBranches = branches.filter(
      b => !session?.branchIds?.length || session.branchIds.includes(b.id)
    );
    return (
      <BranchSelectPage
        branches={selectableBranches}
        onSelect={selectBranch}
        subtitle="Choose which branch POS to operate"
      />
    );
  }

  return (
    <div className="h-dvh flex flex-col lg:flex-row bg-neutral-light overflow-hidden">
      {/* Main Content - Menu Grid */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
        {/* Header */}
        <header className="shrink-0 px-4 py-3 border-b border-neutral-gray/20 flex items-center justify-between gap-4 bg-white">
          {/* Left - Branch & Staff */}
          <button
            onClick={() => switchableBranches.length > 1 ? setIsBranchSwitcherOpen(true) : undefined}
            className={`flex items-center gap-3 shrink-0 rounded-xl transition-colors ${switchableBranches.length > 1 ? 'hover:bg-neutral-light active:bg-neutral-gray/20 cursor-pointer px-2 py-1 -mx-2 -my-1' : 'cursor-default'}`}
            title={switchableBranches.length > 1 ? 'Switch Branch' : undefined}
          >
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <StorefrontIcon className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-text-dark font-medium text-sm">{branchInfo?.name ?? 'Branch'}</p>
              <p className="text-neutral-gray text-xs">{session.staffName}</p>
            </div>
          </button>

          {/* Center - Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-gray" />
              <input
                type="text"
                placeholder="Quick search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="
                  w-full h-11 pl-10 pr-4 rounded-xl
                  bg-neutral-light text-text-dark placeholder:text-neutral-gray/60
                  border border-neutral-gray/20 focus:border-primary/50
                  outline-none transition-colors
                "
              />
            </div>
          </div>

          {/* Right - Stats & Actions */}
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-4 px-4 py-2 rounded-xl bg-neutral-gray/10">
              <div className="text-center">
                <p className="text-xs text-neutral-gray">Orders</p>
                <p className="text-lg font-medium text-text-dark">{todayStats.orderCount}</p>
              </div>
              <div className="w-px h-8 bg-neutral-gray/20" />
              <div className="text-center">
                <p className="text-xs text-neutral-gray">Revenue</p>
                <p className="text-lg font-medium text-primary">{formatGHS(todayStats.revenue)}</p>
              </div>
            </div>

            {/* Pending payments button */}
            <button
              onClick={() => setIsPendingDrawerOpen(true)}
              className="relative w-10 h-10 rounded-xl bg-neutral-gray/10 flex items-center justify-center text-neutral-gray hover:text-primary hover:bg-primary/10 transition-colors"
              title="Pending Payments"
            >
              <HourglassIcon className="w-5 h-5" />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-0.5 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>

            {/* Orders link with active badge */}
            <Link
              href="/pos/orders"
              className="relative w-10 h-10 rounded-xl bg-neutral-gray/10 flex items-center justify-center text-neutral-gray hover:text-primary hover:bg-primary/10 transition-colors"
              title="Today's Orders"
            >
              <ClipboardTextIcon className="w-5 h-5" />
              {todayStats.activeCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-0.5 rounded-full bg-primary text-brown text-[10px] font-bold flex items-center justify-center">
                  {todayStats.activeCount}
                </span>
              )}
            </Link>

            <button
              onClick={() => setIsSignOutOpen(true)}
              className="w-10 h-10 rounded-xl bg-neutral-gray/10 flex items-center justify-center text-neutral-gray hover:text-error hover:bg-error/10 transition-colors"
              title="Sign Out"
            >
              <SignOutIcon className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Category Tabs */}
        <div className="shrink-0 px-4 py-3 border-b border-neutral-gray/15 bg-white">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {allCategories.map((cat: { id: string; name: string }) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`
                  px-5 py-2.5 rounded-xl font-medium whitespace-nowrap
                  transition-all duration-150
                  ${activeCategory === cat.id
                    ? 'bg-primary text-brown'
                    : 'bg-neutral-gray/10 text-text-dark hover:bg-neutral-gray/20'
                  }
                `}
              >
                {cat.id === 'all' ? 'All' : cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto p-4 pb-24 lg:pb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {displayedItems.map(item => {
              const cartQty = getItemCartQty(item);
              const isSelected = cartQty > 0;
              const hasOptions = (item.sizes?.length ?? 0) > 1 || !!item.variants;
              const minPrice = item.sizes?.length
                ? Math.min(...item.sizes.map(size => size.price))
                : item.price ?? 0;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemTap(item)}
                  className={`
                    rounded-2xl p-4 text-left shadow-sm min-h-22
                    active:scale-[0.97] transition-all duration-100
                    flex flex-col justify-between gap-2
                    ${isSelected
                      ? 'bg-primary/10 border-2 border-primary shadow-primary/10'
                      : 'bg-white border border-neutral-gray/15 hover:border-primary/30 hover:shadow-md'
                    }
                  `}
                >
                  <p className={`font-semibold text-base leading-snug line-clamp-2 ${isSelected ? 'text-primary' : 'text-text-dark'}`}>
                    {item.name}
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-primary font-bold text-base">{formatGHS(minPrice)}</p>
                      {hasOptions && (
                        <p className="text-[11px] text-neutral-gray">Tap to choose option</p>
                      )}
                    </div>
                    {isSelected && (
                      <span className="min-w-6 h-6 px-1.5 rounded-full bg-primary text-brown text-xs font-bold flex items-center justify-center">
                        {cartQty}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {displayedItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-gray">
              <MagnifyingGlassIcon className="w-12 h-12 mb-4 opacity-40" />
              <p>No items found</p>
            </div>
          )}
        </div>
      </div>

      {/* Cart backdrop - tablet only */}
      {showCart && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setShowCart(false)}
        />
      )}

      {/* Cart — overlay on tablet (<lg), inline sidebar on desktop (lg+) */}
      <div className={`
        flex flex-col bg-white
        fixed inset-y-0 right-0 w-80 z-40 shadow-2xl
        transition-transform duration-300 ease-in-out
        lg:relative lg:inset-auto lg:w-80 lg:shrink-0 lg:shadow-none lg:z-auto lg:border-l lg:border-neutral-gray/20 lg:h-full
        ${showCart ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        {/* Cart Header */}
        <div className="shrink-0 px-4 py-3 border-b border-neutral-gray/15 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ReceiptIcon className="w-5 h-5 text-primary" />
            <span className="font-medium text-text-dark">Current Order</span>
            {cartCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                {cartCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-sm text-error/80 hover:text-error transition-colors"
              >
                Clear
              </button>
            )}
            {/* Close button — tablet only */}
            <button
              onClick={() => setShowCart(false)}
              className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-neutral-gray hover:bg-neutral-gray/10 transition-colors"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Order Type Toggle */}
        <div className="shrink-0 px-4 py-3 border-b border-neutral-gray/15">
          <div className="flex gap-2">
            <button
              onClick={() => setOrderType('dine_in')}
              className={`
                flex-1 py-2.5 rounded-xl font-medium text-sm
                transition-all duration-150
                ${orderType === 'dine_in'
                  ? 'bg-primary text-brown'
                  : 'bg-neutral-gray/10 text-text-dark hover:bg-neutral-gray/20'
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
                  : 'bg-neutral-gray/10 text-text-dark hover:bg-neutral-gray/20'
                }
              `}
            >
              Takeaway
            </button>
          </div>
        </div>

        {/* Customer Info — always visible at top */}
        <div className="shrink-0 px-4 py-3 border-b border-neutral-gray/15 space-y-2">
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-gray" />
            <input
              type="text"
              placeholder="Customer name *"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-neutral-light text-text-dark placeholder:text-neutral-gray/60 border border-neutral-gray/20 focus:border-primary/50 outline-none text-sm transition-colors"
            />
          </div>
          <div className="relative">
            <DeviceMobileIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-gray" />
            <input
              type="tel"
              placeholder="Phone number *"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-neutral-light text-text-dark placeholder:text-neutral-gray/60 border border-neutral-gray/20 focus:border-primary/50 outline-none text-sm transition-colors"
            />
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
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
                className="flex flex-col px-3 py-2.5 rounded-xl bg-neutral-light gap-2"
              >
                {/* Name & price */}
                <p className="text-text-dark font-medium text-sm leading-snug">
                  {item.name}
                </p>

                {/* Controls row */}
                <div className="flex items-center justify-between">
                  <p className="text-primary font-semibold text-xs">
                    {formatGHS(item.price * item.quantity)}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-lg bg-neutral-gray/10 flex items-center justify-center text-text-dark hover:bg-neutral-gray/20 active:scale-95 transition-all"
                    >
                      <MinusIcon className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center text-text-dark font-semibold text-sm">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-lg bg-neutral-gray/10 flex items-center justify-center text-text-dark hover:bg-neutral-gray/20 active:scale-95 transition-all"
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="w-7 h-7 ml-1 rounded-lg flex items-center justify-center text-neutral-gray hover:text-error hover:bg-error/10 transition-all"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Notes (collapsible, kept minimal) */}
        {cart.length > 0 && (
          <div className="shrink-0 px-4 py-2 border-t border-neutral-gray/15">
            <button
              onClick={() => setShowOrderDetails(!showOrderDetails)}
              className="w-full flex items-center justify-between py-1.5 text-neutral-gray hover:text-text-dark transition-colors text-sm"
            >
              <span>Order notes</span>
              <CaretRightIcon className={`w-4 h-4 transition-transform ${showOrderDetails ? 'rotate-90' : ''}`} />
            </button>
            {showOrderDetails && (
              <div className="pb-2">
                <div className="relative">
                  <NoteIcon className="absolute left-3 top-3 w-4 h-4 text-neutral-gray" />
                  <textarea
                    placeholder="Kitchen or delivery notes"
                    value={orderNotes}
                    onChange={e => setOrderNotes(e.target.value)}
                    rows={2}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-neutral-light text-text-dark placeholder:text-neutral-gray/60 border border-neutral-gray/20 focus:border-primary/50 outline-none text-sm resize-none transition-colors"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Total & Pay Button */}
        <div className="shrink-0 p-4 border-t border-neutral-gray/20 bg-neutral-light">
          {activePromo && promoDiscount > 0 && (
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-secondary text-sm">
                <TagIcon size={12} weight="fill" />
                {activePromo.name}
              </span>
              <span className="text-secondary text-sm font-semibold">-{formatGHS(promoDiscount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between mb-4">
            <span className="text-neutral-gray">Total</span>
            <span className="text-2xl font-bold text-primary">
              {formatGHS(effectiveTotal)}
            </span>
          </div>

          {isManualEntry && (
            <div className="flex items-center justify-between py-2 px-3 mb-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Recording Past Order
              </span>
              <button
                onClick={() => { clearCart(); setIsManualEntry(false); }}
                className="px-2 py-0.5 rounded-md bg-amber-200 hover:bg-amber-300 text-amber-800 text-xs font-semibold transition-colors"
              >
                Exit
              </button>
            </div>
          )}

          <button
            onClick={openPayment}
            disabled={cart.length === 0 || !customerName.trim() || !customerPhone.trim()}
            className="
              w-full h-14 rounded-2xl font-semibold text-lg
              bg-primary text-brown
              hover:bg-primary-hover active:scale-[0.98]
              disabled:opacity-40 disabled:active:scale-100
              transition-all duration-150
              flex items-center justify-center gap-2
            "
          >
            Pay {formatGHS(effectiveTotal)}
            <CaretRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bottom bar — tablet only (< lg) */}
      <div className="fixed bottom-0 inset-x-0 z-20 lg:hidden px-4 py-3 bg-white border-t border-neutral-gray/20 shadow-lg">
        <button
          onClick={() => setShowCart(true)}
          className="
            w-full h-14 rounded-2xl font-semibold
            bg-primary text-brown
            hover:bg-primary-hover active:scale-[0.98]
            transition-all duration-150
            flex items-center justify-between px-5
          "
        >
          <div className="flex items-center gap-2">
            <ShoppingBagIcon className="w-5 h-5" />
            <span>
              {cartCount > 0 ? `${cartCount} item${cartCount !== 1 ? 's' : ''}` : 'Cart'}
            </span>
          </div>
          <span>{cartCount > 0 ? formatGHS(effectiveTotal) : 'Empty'}</span>
        </button>
      </div>

      <SignOutDialog
        isOpen={isSignOutOpen}
        onCancel={() => setIsSignOutOpen(false)}
        onConfirm={() => logout('/pos')}
      />

      <BranchSwitcherDialog
        isOpen={isBranchSwitcherOpen}
        branches={switchableBranches}
        currentBranchId={session?.branchId}
        onSelect={selectBranch}
        onClose={() => setIsBranchSwitcherOpen(false)}
      />

      {/* Payment Modal */}
      {isPaymentOpen && (
        <PaymentModal
          total={effectiveTotal}
          onClose={closePayment}
          onPayment={handlePaymentComplete}
          isManualEntry={isManualEntry}
        />
      )}

      {/* MoMo Waiting Modal */}
      {pendingMomoOrder && (
        <MomoWaitingModal
          order={pendingMomoOrder}
          onConfirmed={(confirmedOrder) => {
            setPendingMomoOrder(null);
            setCompletedOrder(confirmedOrder);
          }}
          onTimeout={() => {
            const token = pendingMomoOrder._sessionToken;
            setPendingMomoOrder(null);
            if (token) {
              setBackgroundMomoToken(token);
              setIsPendingDrawerOpen(true);
              toast.error('Payment timed out. Moved to Pending Payments — you can retry from there.');
            } else {
              toast.error('Payment timed out. Please ask the customer to try again.');
            }
          }}
          onCancel={() => {
            const token = pendingMomoOrder._sessionToken;
            setPendingMomoOrder(null);
            if (token) {
              setBackgroundMomoToken(token);
              setIsPendingDrawerOpen(true);
              toast.info('Payment moved to Pending Payments. You can continue taking orders.');
            }
          }}
        />
      )}

      {/* Success Modal */}
      {completedOrder && (
        <OrderSuccessModal
          order={completedOrder}
          branch={{ name: branchInfo?.name ?? 'CediBites', address: branchInfo?.address, phone: branchInfo?.phone }}
          onClose={() => setCompletedOrder(null)}
        />
      )}

      {/* Background MoMo Payment Confirmed Overlay */}
      {backgroundConfirmedOrder && (
        <PaymentConfirmedOverlay
          order={backgroundConfirmedOrder}
          onDismiss={() => setBackgroundConfirmedOrder(null)}
        />
      )}

      {/* Pending Payments Drawer */}
      {session?.branchId && (
        <PendingPaymentsDrawer
          branchId={Number(session.branchId)}
          isOpen={isPendingDrawerOpen}
          onClose={() => setIsPendingDrawerOpen(false)}
          onSessionConfirmed={(cs) => {
            if (cs.order) {
              setCompletedOrder({
                id: cs.order.id,
                orderCode: cs.order.order_number ?? '',
                orderNumber: cs.order.order_number ?? '',
                status: 'received',
                paymentStatus: 'completed',
                isPaid: true,
                total: cs.total_amount,
                items: cs.items.map(i => ({ name: i.name, quantity: i.quantity, price: i.unit_price })),
                contact: { name: cs.customer_name, phone: cs.customer_phone },
              } as unknown as Order);
            }
          }}
        />
      )}

      {optionPickerItem && (
        <POSItemOptionModal
          item={optionPickerItem}
          cart={cart}
          onClose={() => setOptionPickerItem(null)}
          onAdd={handleOptionAdd}
        />
      )}
    </div>
  );
}

interface POSItemOptionModalProps {
  item: DisplayMenuItem;
  cart: ReturnType<typeof usePOS>['cart'];
  onClose: () => void;
  onAdd: (option: ItemOption) => void;
}

function POSItemOptionModal({ item, cart, onClose, onAdd }: POSItemOptionModalProps) {
  const options = getItemOptions(item);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-neutral-gray/20 flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral-gray">Choose option</p>
            <h3 className="text-lg font-semibold text-text-dark">{item.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-gray hover:bg-neutral-gray/10"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {options.map(option => {
            const qty = cart
              .filter(c => c.menuItemId === option.menuItemId && (c.variantKey ?? '') === (option.variantKey ?? ''))
              .reduce((sum, c) => sum + c.quantity, 0);
            return (
              <button
                key={option.key}
                onClick={() => onAdd(option)}
                className="w-full px-4 py-3 rounded-xl border border-neutral-gray/20 hover:border-primary/50 hover:bg-primary/5 transition-colors flex items-center justify-between text-left"
              >
                <div>
                  <p className="font-medium text-text-dark">{option.label}</p>
                  <p className="text-xs text-neutral-gray">{option.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-primary">{formatGHS(option.price)}</p>
                  {qty > 0 && <p className="text-xs text-neutral-gray">In cart: {qty}</p>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Payment Modal ────────────────────────────────────────────────────────────

interface PaymentModalProps {
  total: number;
  onClose: () => void;
  onPayment: (method: PaymentMethod, amountPaid?: number, momoNumber?: string, manualOpts?: { recordedAt: string; momoReference?: string }) => void;
  isManualEntry?: boolean;
}

function PaymentModal({ total, onClose, onPayment, isManualEntry }: PaymentModalProps) {
  const { staffUser } = useStaffAuth();
  const isAdmin = staffUser?.role === 'admin' || staffUser?.role === 'super_admin';
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [cashAmount, setCashAmount] = useState('');
  const [momoNumber, setMomoNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [momoVerified, setMomoVerified] = useState<{ name: string; status: string; profile: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [momoVerifyError, setMomoVerifyError] = useState<string | null>(null);
  // Manual entry fields
  const [recordedAt, setRecordedAt] = useState('');
  const [recordedTime, setRecordedTime] = useState('');
  const [momoReference, setMomoReference] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [dateEnabled, setDateEnabled] = useState<boolean | null>(null);

  // Fetch manual_entry_date_enabled setting
  useEffect(() => {
    if (!isManualEntry) return;
    apiClient.get('/settings/manual_entry_date_enabled')
      .then((res: unknown) => {
        const val = (res as { data?: { value?: unknown } })?.data?.value;
        setDateEnabled(val === true || val === 'true' || val === '1');
      })
      .catch(() => setDateEnabled(false));
  }, [isManualEntry]);

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

  const handleVerifyMomo = async () => {
    setMomoVerifyError(null);
    setIsVerifying(true);
    try {
      const res = await apiClient.post('/pos/verify-momo', { momo_number: momoNumber }) as unknown as { isRegistered: boolean; name: string; status: string; profile: string };
      if (res.isRegistered) {
        setMomoVerified({ name: res.name, status: res.status, profile: res.profile });
      } else {
        setMomoVerifyError('Number not registered on Mobile Money');
      }
    } catch {
      setMomoVerifyError('Could not verify number. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedMethod) return;
    setValidationError(null);

    // Manual entry requires a date/time
    if (isManualEntry) {
      if (dateEnabled && !recordedAt) {
        setValidationError('Please enter the date & time the order was taken.');
        return;
      }
      if (!dateEnabled && !recordedTime) {
        setValidationError('Please enter the time the order was taken.');
        return;
      }
    }

    setIsProcessing(true);

    // Compose recordedAt: if time-only mode, combine today's date + entered time
    const effectiveRecordedAt = isManualEntry
      ? (dateEnabled ? recordedAt : `${new Date().toISOString().slice(0, 10)}T${recordedTime}`)
      : undefined;
    const manualOpts = isManualEntry ? { recordedAt: effectiveRecordedAt!, momoReference: momoReference || undefined } : undefined;

    if (selectedMethod === 'cash') {
      const paid = parseFloat(cashAmount) || total;
      if (paid < total) {
        setValidationError('Amount paid is less than total.');
        setIsProcessing(false);
        return;
      }
      await onPayment('cash', paid, undefined, manualOpts);
    } else if (selectedMethod === 'mobile_money') {
      await onPayment('mobile_money', undefined, normalizeGhanaPhone(momoNumber), manualOpts);
    } else if (selectedMethod === 'manual_momo') {
      const manualMomoNum = momoNumber ? normalizeGhanaPhone(momoNumber) : undefined;
      await onPayment('manual_momo', undefined, manualMomoNum, manualOpts);
    } else if (selectedMethod === 'no_charge') {
      await onPayment('no_charge', undefined, undefined, manualOpts);
    } else {
      await onPayment('card', undefined, undefined, manualOpts);
    }

    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl bg-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-gray/20 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-text-dark">
            {isManualEntry ? '⏱ Record Past Order' : 'Payment'}
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all text-neutral-gray hover:text-text-dark hover:bg-neutral-gray/10"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Total */}
        <div className="px-6 py-6 border-b border-neutral-gray/15 text-center">
          <p className="text-sm mb-1 text-neutral-gray">Amount Due</p>
          <p className="text-4xl font-bold text-primary">{formatGHS(total)}</p>
        </div>

        {/* Scrollable content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">

          {/* Manual entry: date/time picker */}
          {isManualEntry && dateEnabled !== null && (
            <div className="space-y-2">
              <p className="text-sm text-neutral-gray">
                {dateEnabled ? 'When was this order?' : 'What time was this order?'}
              </p>
              {dateEnabled ? (
                <>
                  <input
                    type="datetime-local"
                    value={recordedAt}
                    max={new Date().toISOString().slice(0, 16)}
                    onChange={e => setRecordedAt(e.target.value)}
                    className={`
                      w-full h-12 px-4 rounded-xl text-sm
                      border focus:border-primary/50
                      outline-none transition-colors
                      bg-neutral-light text-text-dark border-neutral-gray/20
                    `}
                  />
                  <p className="text-xs text-neutral-gray/70">Only past dates &amp; times allowed — you cannot log a future order.</p>
                </>
              ) : (
                <>
                  <input
                    type="time"
                    value={recordedTime}
                    onChange={e => setRecordedTime(e.target.value)}
                    className={`
                      w-full h-12 px-4 rounded-xl text-sm
                      border focus:border-primary/50
                      outline-none transition-colors
                      bg-neutral-light text-text-dark border-neutral-gray/20
                    `}
                  />
                  <p className="text-xs text-neutral-gray/70">Only past times allowed — you cannot log a future order.</p>
                </>
              )}
            </div>
          )}

          <p className="text-sm text-neutral-gray">Select payment method</p>

          <div className="grid grid-cols-2 gap-3">
            {([
              { id: 'cash' as PaymentMethod, label: 'Cash', icon: CurrencyDollarIcon },
              ...(isManualEntry
                ? [{ id: 'manual_momo' as PaymentMethod, label: 'Direct MoMo', icon: DeviceMobileIcon }]
                : [{ id: 'mobile_money' as PaymentMethod, label: 'MoMo', icon: DeviceMobileIcon }]
              ),
              { id: 'card' as PaymentMethod, label: 'Card', icon: CreditCardIcon },
              ...(isAdmin
                ? [{ id: 'no_charge' as PaymentMethod, label: 'No Charge', icon: ProhibitIcon }]
                : []
              ),
            ]).map(method => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={`
                  py-4 rounded-2xl flex flex-col items-center gap-2
                  transition-all duration-150
                  ${selectedMethod === method.id
? 'bg-primary text-brown ring-2 ring-primary ring-offset-2 ring-offset-white'
                    : 'bg-neutral-gray/10 text-text-dark hover:bg-neutral-gray/20'}
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
                  bg-neutral-light text-text-dark placeholder:text-neutral-gray/60
                  border border-neutral-gray/20 focus:border-primary/50
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
                    className="flex-1 py-2 rounded-lg bg-neutral-gray/10 text-text-dark font-medium hover:bg-neutral-gray/20 transition-colors"
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
          {selectedMethod === 'mobile_money' && (
            <div className="pt-2 space-y-2">
              <input
                type="tel"
                placeholder="MoMo phone number"
                value={momoNumber}
                onChange={e => {
                  setMomoNumber(e.target.value);
                  setMomoVerified(null);
                  setMomoVerifyError(null);
                }}
                className="
                  w-full h-14 px-4 rounded-xl text-center text-xl
                  bg-neutral-light text-text-dark placeholder:text-neutral-gray/60
                  border border-neutral-gray/20 focus:border-primary/50
                  outline-none transition-colors
                "
                autoFocus
              />
              {momoVerified ? (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-secondary/10 border border-secondary/30">
                  <div className="flex items-center gap-2 text-secondary text-sm font-medium">
                    <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
                    <span>{momoVerified.name} · {momoVerified.status}</span>
                  </div>
                  <button
                    onClick={() => { setMomoVerified(null); setMomoNumber(''); }}
                    className="text-xs text-neutral-gray underline"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleVerifyMomo}
                    disabled={!isValidGhanaPhone(momoNumber) || isVerifying}
                    className="
                      w-full h-10 rounded-xl font-medium text-sm
                      bg-neutral-gray/10 text-text-dark
                      hover:bg-neutral-gray/20
                      disabled:opacity-40
                      transition-colors flex items-center justify-center gap-2
                    "
                  >
                    {isVerifying ? (
                      <><SpinnerIcon className="w-4 h-4 animate-spin" /> Verifying...</>
                    ) : (
                      'Verify Number'
                    )}
                  </button>
                  {momoVerifyError && (
                    <p className="text-red-500 text-xs text-center">{momoVerifyError}</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Card message */}
          {selectedMethod === 'card' && (
            <div className="pt-2 text-center text-neutral-gray">
              <p>Ready for card terminal</p>
              <p className="text-xs mt-1 opacity-60">Process payment on card machine</p>
            </div>
          )}

          {selectedMethod === 'manual_momo' && (
            <div className="pt-2 space-y-2">
              <p className="text-neutral-gray text-xs">Customer paid via direct MoMo transfer to branch number</p>
              <input
                type="tel"
                placeholder="Customer's MoMo number"
                value={momoNumber}
                onChange={e => setMomoNumber(e.target.value)}
                className={`
                  w-full h-12 px-4 rounded-xl text-sm
                  placeholder:text-neutral-gray/60
                  border focus:border-primary/50
                  outline-none transition-colors
                  bg-neutral-light text-text-dark border-neutral-gray/20
                `}
              />
              <input
                type="text"
                placeholder="MoMo transaction ID (optional)"
                value={momoReference}
                onChange={e => setMomoReference(e.target.value)}
                className={`
                  w-full h-12 px-4 rounded-xl text-sm
                  placeholder:text-neutral-gray/60
                  border focus:border-primary/50
                  outline-none transition-colors
                  bg-neutral-light text-text-dark border-neutral-gray/20
                `}
              />
            </div>
          )}

          {selectedMethod === 'no_charge' && (
            <div className="pt-2 text-center text-neutral-gray">
              <p>Staff meal — no payment required</p>
              <p className="text-xs mt-1 opacity-60">Order will be logged for cost tracking</p>
            </div>
          )}
        </div>

        {validationError && (
          <p className="text-sm text-error text-center mb-2">{validationError}</p>
        )}

        {/* Confirm Button */}
        <div className="p-6 pt-0">
          <button
            onClick={handleConfirm}
            disabled={
              !selectedMethod || isProcessing
              || (selectedMethod === 'mobile_money' && !momoVerified)
              || (isManualEntry && !recordedAt && !recordedTime)
            }
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

// ─── Order Success Modal ──────────────────────────────────────────────────────

interface OrderSuccessModalProps {
  order: Order;
  branch: { name: string; address?: string; phone?: string };
  onClose: () => void;
}

function OrderSuccessModal({ order, branch, onClose }: OrderSuccessModalProps) {
  // Auto close after 5 seconds
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden text-center shadow-2xl">
        {/* Success Icon */}
        <div className="pt-8 pb-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-secondary/20 flex items-center justify-center">
            <CheckCircleIcon className="w-10 h-10 text-secondary" weight="fill" />
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          <h2 className="text-2xl font-bold text-text-dark mb-2">
            Payment Complete
          </h2>
          <p className="text-neutral-gray mb-6">
            Order #{order.orderNumber} has been placed
          </p>

          {/* Order Summary */}
          <div className="bg-neutral-light rounded-2xl p-4 text-left mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-neutral-gray">Items</span>
              <span className="text-text-dark">{order.items.length}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-neutral-gray">Type</span>
              <span className="text-text-dark capitalize">{order.fulfillmentType.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-neutral-gray">Payment</span>
              <span className="text-text-dark capitalize">{order.paymentMethod}</span>
            </div>
            <div className="border-t border-neutral-gray/20 my-2" />
            <div className="flex justify-between font-semibold">
              <span className="text-text-dark">Total</span>
              <span className="text-primary">{formatGHS(order.total)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => printReceipt(order, branch)}
              className="
                flex-1 h-12 rounded-xl font-medium
                bg-neutral-gray/10 text-text-dark
                hover:bg-neutral-gray/20 active:scale-[0.98]
                transition-all duration-150
                flex items-center justify-center gap-2
              "
            >
              <PrinterIcon className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={onClose}
              className="
                flex-1 h-12 rounded-xl font-medium
                bg-primary text-brown
                hover:bg-primary-hover active:scale-[0.98]
                transition-all duration-150
              "
            >
              New Order
            </button>
          </div>
        </div>

        {/* Auto close indicator */}
        <div className="h-1 bg-neutral-gray/20">
          <div
            className="h-full bg-primary animate-shrink"
            style={{ animationDuration: '5s' }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── MoMo Waiting Modal ───────────────────────────────────────────────────────

const MOMO_POLL_INTERVAL_MS = 7000;
const MOMO_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

interface MomoWaitingModalProps {
  order: Order;
  onConfirmed: (order: Order) => void;
  onTimeout: () => void;
  onCancel: () => void;
}

function MomoWaitingModal({ order, onConfirmed, onTimeout, onCancel }: MomoWaitingModalProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(Math.floor(MOMO_TIMEOUT_MS / 1000));

  useEffect(() => {
    const startTime = Date.now();
    let timedOut = false;
    const sessionToken = order._sessionToken;

    // Countdown timer
    const countdown = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, Math.floor((MOMO_TIMEOUT_MS - elapsed) / 1000));
      setSecondsRemaining(remaining);
    }, 1000);

    // Payment status polling via checkout session or legacy payment verify
    const poll = setInterval(async () => {
      if (timedOut) return;

      const elapsed = Date.now() - startTime;
      if (elapsed >= MOMO_TIMEOUT_MS) {
        timedOut = true;
        clearInterval(poll);
        clearInterval(countdown);
        onTimeout();
        return;
      }

      try {
        if (sessionToken) {
          // New flow: poll checkout session status
          const { checkoutSessionService } = await import('@/lib/api/services/checkout-session.service');
          const session = await checkoutSessionService.posGetStatus(sessionToken);

          if (session.status === 'confirmed') {
            clearInterval(poll);
            clearInterval(countdown);
            onConfirmed({ ...order, paymentStatus: 'completed', isPaid: true, orderNumber: session.order?.order_number ?? order.orderNumber });
          } else if (session.status === 'failed' || session.status === 'expired') {
            clearInterval(poll);
            clearInterval(countdown);
            toast.error('Payment was declined. Please ask the customer to try again.');
            onCancel();
          }
        } else if (order.paymentId) {
          // Legacy flow: poll payment verify endpoint
          const response = await apiClient.get(`/payments/${order.paymentId}/verify`);
          const data = response as unknown as { data?: { payment_status?: string } };
          const status = data?.data?.payment_status;

          if (status === 'completed') {
            clearInterval(poll);
            clearInterval(countdown);
            onConfirmed({ ...order, paymentStatus: 'completed', isPaid: true });
          } else if (status === 'failed') {
            clearInterval(poll);
            clearInterval(countdown);
            toast.error('Payment was declined. Please ask the customer to try again.');
            onCancel();
          }
        }
      } catch {
        // ignore poll errors — keep trying
      }
    }, MOMO_POLL_INTERVAL_MS);

    return () => {
      clearInterval(poll);
      clearInterval(countdown);
    };
  }, [order, onConfirmed, onTimeout, onCancel]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden text-center shadow-2xl">
        <div className="pt-8 pb-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <DeviceMobileIcon className="w-10 h-10 text-primary" weight="fill" />
          </div>
        </div>

        <div className="px-6 pb-8">
          <h2 className="text-2xl font-bold text-text-dark mb-2">
            Waiting for Payment
          </h2>
          <p className="text-neutral-gray mb-2">
            A payment prompt has been sent to
          </p>
          <p className="text-lg font-semibold text-text-dark mb-6">
            {order.contact.phone}
          </p>

          <div className="bg-neutral-light rounded-2xl p-4 mb-6">
            <p className="text-sm text-neutral-gray mb-1">Amount to pay</p>
            <p className="text-3xl font-bold text-primary">{formatGHS(order.total)}</p>
          </div>

          <div className="flex items-center justify-center gap-2 mb-6 text-neutral-gray text-sm">
            <SpinnerIcon className="w-4 h-4 animate-spin" />
            <span>
              Waiting... {minutes}:{seconds.toString().padStart(2, '0')} remaining
            </span>
          </div>

          <button
            onClick={onCancel}
            className="
              w-full h-12 rounded-2xl font-medium
              bg-neutral-gray/10 text-neutral-gray
              hover:bg-neutral-gray/20 active:scale-[0.98]
              transition-all duration-150
            "
          >
            Dismiss &mdash; Track in Pending
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Payment Confirmed Overlay (background MoMo) ─────────────────────────────

function PaymentConfirmedOverlay({ order, onDismiss }: { order: Order; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-60 flex items-start justify-center bg-black/50 animate-in fade-in duration-300">
      <div className="w-full max-w-lg mt-0 bg-green-600 text-white rounded-b-3xl shadow-2xl overflow-hidden animate-in slide-in-from-top duration-500">
        <div className="px-6 py-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-white/20 flex items-center justify-center mb-4">
            <CheckCircleIcon className="w-10 h-10 text-white" weight="fill" />
          </div>
          <h2 className="text-2xl font-bold mb-1">Payment Confirmed!</h2>
          <p className="text-white/80 text-sm mb-4">
            A pending MoMo payment just completed
          </p>

          <div className="bg-white/15 rounded-2xl p-4 mb-5 text-left space-y-2">
            {order.orderNumber && (
              <div className="flex justify-between text-sm">
                <span className="text-white/70">Order</span>
                <span className="font-bold">{order.orderNumber}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-white/70">Customer</span>
              <span className="font-medium">{order.contact?.name || 'Walk-in'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/70">Amount</span>
              <span className="font-bold">{formatGHS(order.total)}</span>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="w-full h-12 rounded-2xl font-medium bg-white text-green-700 hover:bg-white/90 active:scale-[0.98] transition-all"
          >
            Got it
          </button>
        </div>

        <div className="h-1 bg-white/20">
          <div className="h-full bg-white animate-shrink" style={{ animationDuration: '8s' }} />
        </div>
      </div>
    </div>
  );
}
