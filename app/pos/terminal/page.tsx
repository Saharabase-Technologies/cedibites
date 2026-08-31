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
  CaretDownIcon,
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
  WarningCircleIcon,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { usePOS } from '../context';
import { formatGHS } from '@/lib/utils/currency';
import apiClient from '@/lib/api/client';
import { toast } from '@/lib/utils/toast';
import type { PaymentMethod, Order, OrderSource } from '@/types/order';
import {
  PhoneIcon,
  WhatsappLogoIcon,
  ShareNetworkIcon,
} from '@phosphor-icons/react';

/**
 * The channels a remote order arrives on. `pos` is not here because it is not a
 * choice — it is what an order is when nobody took a call to place it.
 */
/**
 * The channels an order can arrive on, and — since the channel now decides the
 * shape of this screen — the way back to the counter.
 *
 * 'pos' is listed first and deliberately: without it the picker could only ever
 * move you away from the till layout. Someone at head office who took one phone
 * order had no way to say the next customer was standing in front of them.
 */
const ORDER_SOURCE_OPTIONS: { id: OrderSource; label: string; icon: React.ElementType }[] = [
  { id: 'pos', label: 'Counter', icon: StorefrontIcon },
  { id: 'phone', label: 'Phone', icon: PhoneIcon },
  { id: 'whatsapp', label: 'WhatsApp', icon: WhatsappLogoIcon },
  { id: 'social_media', label: 'Social', icon: ShareNetworkIcon },
];
import type { DisplayMenuItem } from '@/lib/api/adapters/menu.adapter';
import { useBranch } from '@/app/components/providers/BranchProvider';
import { useMenuItems } from '@/lib/api/hooks/useMenuItems';
import { useStockGate } from '@/lib/api/hooks/useStockGate';
import type { StockShortfall } from '@/lib/api/services/stockGate.service';
import { printReceipt } from '@/lib/utils/printReceipt';
import { getPromoService, type Promo } from '@/lib/services/promos/promo.service';
import { SignOutDialog } from '@/app/components/ui/SignOutDialog';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import BranchSelectPage from '@/app/components/ui/BranchSelectPage';
import BranchSwitcherDialog from '@/app/components/ui/BranchSwitcherDialog';
import { isValidGhanaPhone, normalizeGhanaPhone } from '@/app/lib/phone';
import PendingPaymentsDrawer from './PendingPaymentsDrawer';
import { useOnlineOrderArrivals } from '../hooks/useOnlineOrderArrivals';
import { useMarkReceiptPrinted } from '@/lib/api/hooks/useOrders';
import { isRemoteSource } from '@/lib/constants/order.constants';
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

/**
 * Search match logic:
 * - If the item has named options (sizes/variants), match against the option
 *   names/labels first. The item itself is included if any option matches.
 * - If the item has no options (or only a "Regular" option that mirrors the
 *   item name), fall back to matching against the item name.
 */
function itemMatchesSearch(item: DisplayMenuItem, query: string): boolean {
  const q = query.toLowerCase().trim();
  if (!q) {
    return true;
  }

  const hasNamedOptions =
    (item.sizes && item.sizes.length > 0) ||
    (item.hasVariants && item.variants);

  if (hasNamedOptions) {
    const options = getItemOptions(item);
    return options.some(
      opt =>
        opt.name.toLowerCase().includes(q) ||
        opt.label.toLowerCase().includes(q)
    );
  }

  return item.name.toLowerCase().includes(q);
}

/**
 * @param embedded Rendered inside the staff portal rather than as the standalone
 *   till. The portal already provides the frame — its own scroll container, its
 *   sidebar, and its sign-out — so the terminal drops the chrome that would be a
 *   second copy of it and sizes itself to the space it is given instead of to
 *   the viewport.
 */
export default function POSTerminalPage({ embedded = false }: { embedded?: boolean } = {}) {
  const router = useRouter();
  const {
    session,
    isSessionValid,
    isSessionLoaded,
    isNeedsBranchSelection,
    selectBranch,
    isCompanyWide,
    isRemoteOrder,
    resetBranchForNextOrder,
    orderSource,
    setOrderSource,
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
  } = usePOS();
  const { staffUser, logout } = useStaffAuth();
  const { branches } = useBranch();
  const isAdmin = staffUser?.role === 'admin' || staffUser?.role === 'tech_admin';
  // Scoped to the till's own branch. This used to fetch every branch's menu and
  // filter it down client-side, which shipped other branches' items and prices
  // to every POS on every load. The API scopes it now (MenuItem::servedAt), so
  // the branch filter below is a second pass over an already-correct list
  // rather than the thing doing the work.
  const { items: menuItems, categories: menuCategories, isLoading: menuLoading } = useMenuItems(
    session?.branchId ? { branch_id: Number(session.branchId), is_available: true } : undefined
  );

  // Which dishes the kitchen can still make. Advisory — the server decides at
  // the moment the order is written — but it is what stops a cashier promising
  // something the branch has run out of.
  const { isBlocked: isOptionBlocked, refresh: refreshStockGate } = useStockGate(
    session?.branchId ? Number(session.branchId) : undefined
  );

  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [pendingMomoOrder, setPendingMomoOrder] = useState<Order | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [activePromo, setActivePromo] = useState<Promo | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);
  const [isBranchSwitcherOpen, setIsBranchSwitcherOpen] = useState(false);
  const [isBranchMenuOpen, setIsBranchMenuOpen] = useState(false);
  const [optionPickerItem, setOptionPickerItem] = useState<DisplayMenuItem | null>(null);
  const [isPendingDrawerOpen, setIsPendingDrawerOpen] = useState(false);
  const [backgroundMomoToken, setBackgroundMomoToken] = useState<string | null>(null);
  const [backgroundConfirmedOrder, setBackgroundConfirmedOrder] = useState<Order | null>(null);
  const [branchClosedNotice, setBranchClosedNotice] = useState<string | null>(null);
  const [stockShortNotice, setStockShortNotice] = useState<{
    message: string;
    shortfalls: StockShortfall[];
    canOverride: boolean;
  } | null>(null);

  // Pending checkout sessions count for badge
  const { data: pendingSessionsData } = usePosCheckoutSessions(
    session?.branchId ? { branch_id: Number(session.branchId), status: 'pending,payment_initiated' } : undefined
  );
  const pendingCount = pendingSessionsData?.data?.length ?? 0;

  // Orders the till did not take and nobody has accepted. Silent and without a
  // socket of its own — the shell's arrival banner owns the announcement, and a
  // second copy of either would double every chime. Skipped when embedded in
  // the portal, which hides the Orders link this badge sits on.
  const { awaitingCount: remoteWaiting } = useOnlineOrderArrivals(
    embedded ? null : session?.branchId ?? null,
    { sound: false, subscribe: false },
  );

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
    getPromoService().resolvePromo(itemIds, session.branchId, cartTotal).then(p => {
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

  // Branches this operator can switch between. `session.branchIds` is the
  // shared operable set, so no "empty means everything" escape hatch is needed
  // — that hatch was the fourth different phrasing of the same rule, and the
  // one that let a deactivated branch back into the list.
  const switchableBranches = useMemo(
    () => branches.filter(b => session?.branchIds?.includes(b.id)),
    [session, branches],
  );

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
      const matchesSearch = !searchQuery || itemMatchesSearch(item, searchQuery);
      return matchesCategory && matchesSearch;
    });
  }, [branchMenuItems, activeCategory, searchQuery, menuCategories]);

  // When searching, ignore category filter and flatten items with multiple
  // options into one card per matching option (so "assor" surfaces "Assorted
  // Fried Rice", "Assorted Jollof Rice", etc. instead of the compound parent).
  const displayedItems = useMemo(() => {
    if (searchQuery) {
      return branchMenuItems.filter(item => itemMatchesSearch(item, searchQuery));
    }
    return filteredItems;
  }, [searchQuery, branchMenuItems, filteredItems]);

  const searchOptionResults = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase().trim();
    const results: Array<{ item: DisplayMenuItem; option: ItemOption }> = [];
    for (const item of branchMenuItems) {
      const options = getItemOptions(item);
      const hasNamedOptions =
        (item.sizes && item.sizes.length > 0) ||
        (item.hasVariants && item.variants);

      if (hasNamedOptions) {
        for (const option of options) {
          if (
            option.name.toLowerCase().includes(q) ||
            option.label.toLowerCase().includes(q)
          ) {
            results.push({ item, option });
          }
        }
      } else if (item.name.toLowerCase().includes(q)) {
        // Items with no real options — show one card matching item name
        if (options.length > 0) {
          results.push({ item, option: options[0] });
        }
      }
    }

    // Sort: simple option names (no "+" combos) first, then combo items.
    // Within each group, sort alphabetically by option name.
    return results.sort((a, b) => {
      const aIsCombo = a.option.name.includes('+');
      const bIsCombo = b.option.name.includes('+');
      if (aIsCombo !== bIsCombo) return aIsCombo ? 1 : -1;
      return a.option.name.localeCompare(b.option.name);
    });
  }, [searchQuery, branchMenuItems]);

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
  // Delivery fee only counts on delivery orders
  const currentDeliveryFee = orderType === 'delivery' ? deliveryFee : 0;
  // Grand total the customer pays (items − discount + delivery)
  const grandTotal = effectiveTotal + currentDeliveryFee;

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
      // That sale just moved the balances. Without this the grid keeps offering
      // the portion it has only now consumed.
      refreshStockGate();
    } catch (err: unknown) {
      const apiErr = err as {
        status?: number;
        message?: string;
        errors?: Record<string, string[]>;
        code?: string;
        payload?: unknown;
      };
      // ApiError flattens the response to status/message/errors/code, so the
      // stock gate's shortfalls only survive on `payload` — the raw body.
      const body = (apiErr.payload ?? {}) as {
        error?: string;
        shortfalls?: StockShortfall[];
        can_override?: boolean;
      };
      console.error('[POS] Order creation failed:', { status: apiErr.status, message: apiErr.message, errors: apiErr.errors, err });

      if (apiErr.code === 'branch_closed') {
        setBranchClosedNotice(apiErr.message || 'This branch is currently closed and cannot accept orders.');
      } else if (body.error === 'insufficient_stock' || apiErr.code === 'insufficient_stock') {
        // A refusal at the counter needs reading, not a toast that slides away
        // while the cashier is looking at the customer. The shortfalls name the
        // ingredient, because "out of stock" is nothing they can act on.
        setStockShortNotice({
          message: apiErr.message || 'Not enough stock to make this order.',
          shortfalls: body.shortfalls ?? [],
          canOverride: body.can_override ?? false,
        });
        refreshStockGate();
      } else {
        toast.error(apiErr.message || 'Failed to create order. Please try again.');
      }
    }
  };

  // Today's stats
  const todayStats = useMemo(() => {
    const completed = todayOrders.filter(o => o.paymentStatus === 'completed');
    // Unclaimed orders from another channel are counted by `remoteWaiting`
    // instead, and the badge adds the two. Excluded here so they are not
    // counted twice — which they would be for a company-wide operator, whose
    // `todayOrders` is not narrowed to one person.
    const activeCount = todayOrders.filter(o =>
      (o.status === 'received' || o.status === 'preparing')
      && !(isRemoteSource(o.source) && !o.staffId)
    ).length;
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
    // `session.branchIds` is now the shared operable set, already filtered to
    // active branches. It used to be the raw assignment, and this filter read
    // an empty one as "everything" — a separate rule from the one the Order
    // Manager used, which is how the same admin could be offered every branch
    // here and locked to one there. It also offered branches that had been
    // deactivated, since nothing checked.
    const selectableBranches = branches.filter(b => session?.branchIds?.includes(b.id));
    return (
      <BranchSelectPage
        branches={selectableBranches}
        onSelect={selectBranch}
        subtitle="Choose which branch POS to operate"
      />
    );
  }

  // Guard: branch is closed or inactive — admin/tech_admin bypass, extended access bypass
  if (!isAdmin && branchInfo && (!branchInfo.isActive || (!branchInfo.isOpen && !branchInfo.staffAccessAllowed))) {
    const isInactive = !branchInfo.isActive;
    return (
      <div className="min-h-dvh flex items-center justify-center bg-neutral-light p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-lg p-8 flex flex-col items-center gap-5 text-center">
          <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center">
            <WarningCircleIcon weight="fill" size={36} className="text-error" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-dark">
              {isInactive ? 'Branch Inactive' : 'Branch Closed'}
            </h2>
            <p className="text-sm text-neutral-gray mt-2">
              {isInactive
                ? `${branchInfo.name} Branch is currently inactive and not accepting orders. Contact an administrator to reactivate it.`
                : `${branchInfo.name} Branch is currently closed. POS is unavailable outside operating hours.`}
            </p>
          </div>
          {switchableBranches.length > 1 && (
            <button
              onClick={() => setIsBranchSwitcherOpen(true)}
              className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold px-6 py-3 rounded-2xl transition-all active:scale-[0.98]"
            >
              <StorefrontIcon weight="fill" size={18} />
              Switch Branch
            </button>
          )}
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 text-sm font-semibold text-neutral-gray hover:text-error transition-colors"
          >
            <SignOutIcon weight="bold" size={16} />
            Sign Out
          </button>
        </div>
        {switchableBranches.length > 1 && (
          <BranchSwitcherDialog
            isOpen={isBranchSwitcherOpen}
            branches={switchableBranches}
            currentBranchId={session?.branchId}
            onSelect={selectBranch}
            onClose={() => setIsBranchSwitcherOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`${embedded ? 'h-full min-h-[calc(100dvh-8rem)]' : 'h-dvh'} flex flex-col lg:flex-row bg-neutral-light overflow-hidden`}>
      {/* Main Content - Menu Grid */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
        {/* Header */}
        <header className="shrink-0 px-4 py-3 border-b border-neutral-gray/20 flex items-center justify-between gap-4 bg-white">
          {/* Left - Branch & Staff. Switching opens a list under the name rather
              than a modal over the whole screen: changing branch is a choice
              between two or three things, not an interruption. */}
          <div className="relative shrink-0">
            <button
              onClick={() => switchableBranches.length > 1 ? setIsBranchMenuOpen(o => !o) : undefined}
              className={`flex items-center gap-3 rounded-xl transition-colors ${switchableBranches.length > 1 ? 'hover:bg-neutral-light active:bg-neutral-gray/20 cursor-pointer px-2 py-1 -mx-2 -my-1' : 'cursor-default'}`}
              title={switchableBranches.length > 1 ? 'Switch Branch' : undefined}
            >
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <StorefrontIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-text-dark font-medium text-sm flex items-center gap-1">
                  {branchInfo?.name ?? 'Branch'}
                  {/* Nothing said this was changeable, so nobody changed it. */}
                  {switchableBranches.length > 1 && (
                    <CaretDownIcon
                      weight="bold"
                      className={`w-3 h-3 text-neutral-gray transition-transform ${isBranchMenuOpen ? 'rotate-180' : ''}`}
                    />
                  )}
                </p>
                <p className="text-neutral-gray text-xs">{session.staffName}</p>
              </div>
            </button>

            {isBranchMenuOpen && switchableBranches.length > 1 && (
              <>
                {/* Click anywhere else to dismiss. */}
                <div className="fixed inset-0 z-40" onClick={() => setIsBranchMenuOpen(false)} />
                <div className="absolute left-0 top-full mt-2 z-50 w-72 max-h-80 overflow-y-auto rounded-xl border border-neutral-gray/20 bg-white shadow-xl py-1.5">
                  {switchableBranches.map(b => {
                    const isCurrent = b.id === session?.branchId;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => { selectBranch(b.id); setIsBranchMenuOpen(false); }}
                        className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors ${
                          isCurrent ? 'bg-primary/10' : 'hover:bg-neutral-light'
                        }`}
                      >
                        <span className="min-w-0">
                          <span className={`block text-sm font-medium truncate ${isCurrent ? 'text-primary' : 'text-text-dark'}`}>
                            {b.name}
                          </span>
                          {b.address && (
                            <span className="block text-xs text-neutral-gray truncate">{b.address}</span>
                          )}
                        </span>
                        {isCurrent && <CheckCircleIcon weight="fill" className="w-4 h-4 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Center. A till has the row to spare for a search box. A call centre
              agent is typing a name and a phone number while someone talks, so
              the row belongs to them and search collapses to an icon. */}
          {isRemoteOrder ? (
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <div className="relative flex-1 min-w-0">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-gray" />
                <input
                  type="text"
                  placeholder="Customer name *"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-neutral-light text-text-dark placeholder:text-neutral-gray/60 border border-neutral-gray/20 focus:border-primary/50 outline-none text-sm transition-colors"
                />
              </div>
              <div className="relative flex-1 min-w-0">
                <DeviceMobileIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-gray" />
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Phone *"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className={`w-full h-10 pl-9 pr-3 rounded-lg bg-neutral-light text-text-dark placeholder:text-neutral-gray/60 border outline-none text-sm transition-colors ${
                    customerPhone && !isValidGhanaPhone(customerPhone)
                      ? 'border-error/60 focus:border-error'
                      : 'border-neutral-gray/20 focus:border-primary/50'
                  }`}
                />
              </div>
              {/* Is the caller coming for it, or is it going to them? The only
                  two answers a phone order has. */}
              <div className="flex gap-1 shrink-0">
                {([
                  { id: 'pickup' as const, label: 'Pickup' },
                  { id: 'delivery' as const, label: 'Delivery' },
                ]).map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setOrderType(opt.id)}
                    className={`h-10 px-4 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      orderType === opt.id
                        ? 'bg-primary text-white'
                        : 'bg-neutral-gray/10 text-text-dark hover:bg-neutral-gray/20'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
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
          )}

          {/* Right - Stats & Actions */}
          <div className="flex items-center gap-2">
            {/* The day's counts are reporting, and this screen is for placing an
                order. A till has room for both; the call centre's row does not,
                and the numbers live on the dashboard. */}
            {!isRemoteOrder && (
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
            )}

            {/* Search, collapsed. Expands over the row when asked for, so the
                agent gets the field without it living there permanently. */}
            {isRemoteOrder && (
              isSearchOpen ? (
                <div className="relative w-56">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-gray" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search menu..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onBlur={() => { if (!searchQuery) setIsSearchOpen(false); }}
                    className="w-full h-10 pl-9 pr-8 rounded-lg bg-neutral-light text-text-dark placeholder:text-neutral-gray/60 border border-neutral-gray/20 focus:border-primary/50 outline-none text-sm transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-gray hover:text-text-dark"
                    title="Close search"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(true)}
                  className="w-10 h-10 rounded-xl bg-neutral-gray/10 flex items-center justify-center text-neutral-gray hover:text-primary hover:bg-primary/10 transition-colors"
                  title="Search menu"
                >
                  <MagnifyingGlassIcon className="w-5 h-5" />
                </button>
              )
            )}

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

            {/* Orders link with active badge. Embedded, the portal's own Orders
                page is the one in the sidebar — sending someone into the till's
                order list would drop them out of the portal. */}
            {!embedded && (
            <Link
              href="/pos/orders"
              className="relative w-10 h-10 rounded-xl bg-neutral-gray/10 flex items-center justify-center text-neutral-gray hover:text-primary hover:bg-primary/10 transition-colors"
              title={remoteWaiting > 0 ? `Today's Orders — ${remoteWaiting} waiting from online` : "Today's Orders"}
            >
              <ClipboardTextIcon className="w-5 h-5" />
              {/* Own live orders plus anything that arrived from elsewhere and
                  is still unclaimed. The colour is the difference that matters:
                  an online order nobody has accepted is the only one of these
                  with no person already attached to it. */}
              {todayStats.activeCount + remoteWaiting > 0 && (
                <span className={`absolute -top-1 -right-1 min-w-4 h-4 px-0.5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                  remoteWaiting > 0 ? 'bg-error text-white' : 'bg-primary text-brown'
                }`}>
                  {todayStats.activeCount + remoteWaiting}
                </span>
              )}
            </Link>
            )}

            {/* The portal has its own sign-out; two would be one too many. */}
            {!embedded && (
              <button
                onClick={() => setIsSignOutOpen(true)}
                className="w-10 h-10 rounded-xl bg-neutral-gray/10 flex items-center justify-center text-neutral-gray hover:text-error hover:bg-error/10 transition-colors"
                title="Sign Out"
              >
                <SignOutIcon className="w-5 h-5" />
              </button>
            )}
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
            {searchQuery ? (
              searchOptionResults.map(({ item, option }) => {
                const cartQty = cart
                  .filter(c =>
                    c.menuItemId === option.menuItemId &&
                    (option.sizeId !== undefined ? c.sizeId === option.sizeId : true) &&
                    (option.variantKey !== undefined ? c.variantKey === option.variantKey : true)
                  )
                  .reduce((sum, c) => sum + c.quantity, 0);
                const isSelected = cartQty > 0;
                const outOfStock = isOptionBlocked(option.sizeId);
                return (
                  <button
                    key={`${item.id}-${option.key}`}
                    onClick={() => handleOptionAdd(option)}
                    disabled={outOfStock}
                    title={outOfStock ? 'Not enough stock to make this' : undefined}
                    className={`
                      rounded-2xl p-4 text-left shadow-sm min-h-22
                      active:scale-[0.97] transition-all duration-100
                      flex flex-col justify-between gap-2
                      ${outOfStock
                        ? 'bg-neutral-light border border-neutral-gray/15 opacity-55 grayscale cursor-not-allowed active:scale-100'
                        : isSelected
                          ? 'bg-primary/10 border-2 border-primary shadow-primary/10'
                          : 'bg-white border border-neutral-gray/15 hover:border-primary/30 hover:shadow-md'
                      }
                    `}
                  >
                    <p className={`font-semibold text-base leading-snug line-clamp-2 ${outOfStock ? 'text-neutral-gray' : isSelected ? 'text-primary' : 'text-text-dark'}`}>
                      {option.name}
                    </p>
                    <div className="flex items-center justify-between">
                      {outOfStock ? (
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-gray">Out of stock</p>
                      ) : (
                        <p className="text-primary font-bold text-base">{formatGHS(option.price)}</p>
                      )}
                      {isSelected && !outOfStock && (
                        <span className="min-w-6 h-6 px-1.5 rounded-full bg-primary text-brown text-xs font-bold flex items-center justify-center">
                          {cartQty}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              displayedItems.map(item => {
              const cartQty = getItemCartQty(item);
              const isSelected = cartQty > 0;
              const hasOptions = (item.sizes?.length ?? 0) > 1 || !!item.variants;
              const minPrice = item.sizes?.length
                ? Math.min(...item.sizes.map(size => size.price))
                : item.price ?? 0;
              // A dish is only out when every size of it is. One sold-out size
              // must not hide the ones the kitchen can still make.
              const sizes = item.sizes ?? [];
              const outOfStock = sizes.length > 0 && sizes.every(size => isOptionBlocked(size.id));
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemTap(item)}
                  disabled={outOfStock}
                  title={outOfStock ? 'Not enough stock to make this' : undefined}
                  className={`
                    rounded-2xl p-4 text-left shadow-sm min-h-22
                    active:scale-[0.97] transition-all duration-100
                    flex flex-col justify-between gap-2
                    ${outOfStock
                      ? 'bg-neutral-light border border-neutral-gray/15 opacity-55 grayscale cursor-not-allowed active:scale-100'
                      : isSelected
                        ? 'bg-primary/10 border-2 border-primary shadow-primary/10'
                        : 'bg-white border border-neutral-gray/15 hover:border-primary/30 hover:shadow-md'
                    }
                  `}
                >
                  <p className={`font-semibold text-base leading-snug line-clamp-2 ${outOfStock ? 'text-neutral-gray' : isSelected ? 'text-primary' : 'text-text-dark'}`}>
                    {item.name}
                  </p>
                  <div className="flex items-center justify-between">
                    <div>
                      {outOfStock ? (
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-gray">Out of stock</p>
                      ) : (
                        <>
                          <p className="text-primary font-bold text-base">{formatGHS(minPrice)}</p>
                          {hasOptions && (
                            <p className="text-[11px] text-neutral-gray">Tap to choose option</p>
                          )}
                        </>
                      )}
                    </div>
                    {isSelected && !outOfStock && (
                      <span className="min-w-6 h-6 px-1.5 rounded-full bg-primary text-brown text-xs font-bold flex items-center justify-center">
                        {cartQty}
                      </span>
                    )}
                  </div>
                </button>
              );
              })
            )}
          </div>

          {/*
            Two different empty states. A branch with no menu of its own reads
            identically to a failed search unless we say so — menu_items carries
            a branch_id, so a branch nobody gave a menu to returns nothing here
            and "No items found" sends the cashier hunting for a typo. Name the
            real cause instead.
          */}
          {menuLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-gray">
              <div className="w-10 h-10 mb-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              <p className="font-medium text-text-dark">Loading menu…</p>
              <p className="mt-1 text-sm">Fetching what this branch is serving.</p>
            </div>
          ) : branchMenuItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center text-neutral-gray">
              <StorefrontIcon className="w-12 h-12 mb-4 opacity-40" />
              <p className="font-medium text-text-dark">No menu configured for this branch</p>
              <p className="mt-1 text-sm max-w-xs">
                {branchInfo?.name ?? 'This branch'} has no menu items yet. An administrator needs to
                set them up before you can take an order here.
              </p>
            </div>
          ) : (
            ((searchQuery && searchOptionResults.length === 0) || (!searchQuery && displayedItems.length === 0)) && (
              <div className="flex flex-col items-center justify-center py-16 text-neutral-gray">
                <MagnifyingGlassIcon className="w-12 h-12 mb-4 opacity-40" />
                <p>No items found</p>
              </div>
            )
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

        {/* Order Type Toggle. For the call centre this lives in the top bar —
            pickup or delivery, the only two a phone order has — and all that is
            left here is the fee that follows from choosing delivery. */}
        <div className={`shrink-0 px-4 py-3 border-b border-neutral-gray/15 ${
          isRemoteOrder && orderType !== 'delivery' ? 'hidden' : ''
        }`}>
          <div className={`flex gap-2 ${isRemoteOrder ? 'hidden' : ''}`}>
            {/* Map POS order types to DB keys: dine_in→dine_in, takeaway→pickup */}
            {(branchInfo?.orderTypes?.['dine_in']?.is_enabled !== false) && (
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
            )}
            {(branchInfo?.orderTypes?.['pickup']?.is_enabled !== false) && (
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
            )}
            {(branchInfo?.orderTypes?.['delivery']?.is_enabled !== false) && (
            <button
              onClick={() => setOrderType('delivery')}
              className={`
                flex-1 py-2.5 rounded-xl font-medium text-sm
                transition-all duration-150
                ${orderType === 'delivery'
                  ? 'bg-primary text-brown'
                  : 'bg-neutral-gray/10 text-text-dark hover:bg-neutral-gray/20'
                }
              `}
            >
              Delivery
            </button>
            )}
          </div>

          {/* Delivery fee — editable, only for delivery orders */}
          {orderType === 'delivery' && (
            <div className={isRemoteOrder ? '' : 'mt-3'}>
              <label className="block text-xs font-medium text-neutral-gray mb-1">Delivery fee</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-gray text-sm font-medium">₵</span>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  inputMode="decimal"
                  value={deliveryFee === 0 ? '' : deliveryFee}
                  onChange={e => setDeliveryFee(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0.00"
                  className="w-full h-10 pl-7 pr-3 rounded-lg bg-neutral-light text-text-dark placeholder:text-neutral-gray/60 border border-neutral-gray/20 focus:border-primary/50 outline-none text-sm transition-colors"
                />
              </div>
            </div>
          )}
        </div>

        {/* Where the order came in on. Still only asked of someone working
            across the whole company — a cashier's answer is always the till,
            and it would be a question with one answer.

            This now also chooses the layout: pick Phone and the caller's name
            and number move to the top bar. That is why it stays on
            isCompanyWide while everything else here reads isRemoteOrder — this
            is the control, not the consequence. */}
        {isCompanyWide && (
          <div className="shrink-0 px-4 py-3 border-b border-neutral-gray/15">
            <p className="text-[10px] font-bold text-neutral-gray uppercase tracking-wider mb-2">
              How did this order come in?
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {ORDER_SOURCE_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setOrderSource(opt.id)}
                  className={`flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                    orderSource === opt.id
                      ? 'bg-primary text-white border-primary'
                      : 'bg-neutral-light text-neutral-gray border-neutral-gray/20 hover:border-primary/40'
                  }`}
                >
                  <opt.icon className="w-4 h-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Customer Info — in the panel for a till, in the top bar for the call
            centre, who are typing it while the caller is talking. */}
        <div className={`shrink-0 px-4 py-3 border-b border-neutral-gray/15 space-y-2 ${isRemoteOrder ? 'hidden' : ''}`}>
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
              inputMode="numeric"
              maxLength={10}
              placeholder="Phone number * (e.g. 0241234567)"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className={`w-full h-10 pl-9 pr-3 rounded-lg bg-neutral-light text-text-dark placeholder:text-neutral-gray/60 border outline-none text-sm transition-colors ${
                customerPhone && !isValidGhanaPhone(customerPhone)
                  ? 'border-error/60 focus:border-error'
                  : 'border-neutral-gray/20 focus:border-primary/50'
              }`}
            />
          </div>
          {customerPhone && !isValidGhanaPhone(customerPhone) && (
            <p className="text-xs text-error pl-1">Enter a valid 10-digit phone number (e.g. 0241234567).</p>
          )}
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
          {(promoDiscount > 0 || currentDeliveryFee > 0) ? (
            <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-neutral-gray text-sm">Subtotal</span>
                <span className="text-sm text-neutral-gray">{formatGHS(cartTotal)}</span>
              </div>
              {activePromo && promoDiscount > 0 && (
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1.5 text-secondary text-sm">
                    <TagIcon size={12} weight="fill" />
                    {activePromo.name}
                  </span>
                  <span className="text-secondary text-sm font-semibold">-{formatGHS(promoDiscount)}</span>
                </div>
              )}
              {currentDeliveryFee > 0 && (
                <div className="flex items-center justify-between mb-2">
                  <span className="text-neutral-gray text-sm">Delivery fee</span>
                  <span className="text-sm text-neutral-gray">{formatGHS(currentDeliveryFee)}</span>
                </div>
              )}
              <div className="flex items-center justify-between mb-4">
                <span className="text-neutral-gray font-medium">Total</span>
                <span className="text-2xl font-bold text-primary">
                  {formatGHS(grandTotal)}
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between mb-4">
              <span className="text-neutral-gray">Total</span>
              <span className="text-2xl font-bold text-primary">
                {formatGHS(grandTotal)}
              </span>
            </div>
          )}

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
            disabled={cart.length === 0 || !customerName.trim() || !isValidGhanaPhone(customerPhone)}
            className="
              w-full h-14 rounded-2xl font-semibold text-lg
              bg-primary text-brown
              hover:bg-primary-hover active:scale-[0.98]
              disabled:opacity-40 disabled:active:scale-100
              transition-all duration-150
              flex items-center justify-center gap-2
            "
          >
            Pay {formatGHS(grandTotal)}
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
          <span>{cartCount > 0 ? formatGHS(grandTotal) : 'Empty'}</span>
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
          total={grandTotal}
          onClose={closePayment}
          onPayment={handlePaymentComplete}
          isManualEntry={isManualEntry}
          branchPaymentMethods={branchInfo?.paymentMethods}
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
              toast.error('Payment timed out. It is now in Pending Payments, where you can retry it.');
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
          onClose={() => {
            setCompletedOrder(null);
            // Now, not at payment time. Clearing the branch mid-transaction
            // swapped the terminal for the branch picker and the confirmation
            // never got read.
            resetBranchForNextOrder();
          }}
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
              // cs.order comes from OrderResource (snake_case JSON), not the frontend Order type
              const o = cs.order as unknown as Record<string, unknown>;
              const orderItems = (o.items ?? cs.items ?? []) as Record<string, unknown>[];
              const branch = o.branch as Record<string, unknown> | undefined;
              setCompletedOrder({
                id: String(o.id ?? ''),
                orderCode: String(o.order_number ?? ''),
                orderNumber: String(o.order_number ?? ''),
                status: (o.status as string) ?? 'received',
                source: (o.order_source as string) ?? 'pos',
                fulfillmentType: (o.order_type as string) ?? 'dine_in',
                paymentMethod: (o.payment_method as string) ?? cs.payment_method ?? 'cash',
                paymentStatus: 'completed',
                isPaid: true,
                total: Number(o.total_amount ?? cs.total_amount ?? 0),
                subtotal: Number(o.subtotal ?? 0),
                deliveryFee: Number(o.delivery_fee ?? 0),
                discount: Number(o.discount ?? 0),
                tax: 0,
                items: orderItems.map((i) => ({
                  id: String(i.id ?? ''),
                  menuItemId: String(i.menu_item_id ?? ''),
                  name: String((i.menu_item as Record<string, unknown> | undefined)?.name ?? i.name ?? (i.menu_item_snapshot as Record<string, unknown> | undefined)?.name ?? ''),
                  quantity: Number(i.quantity ?? 0),
                  unitPrice: Number(i.unit_price ?? 0),
                })),
                contact: {
                  name: String(o.contact_name ?? cs.customer_name ?? ''),
                  phone: String(o.contact_phone ?? cs.customer_phone ?? ''),
                },
                branch: {
                  id: String(branch?.id ?? ''),
                  name: String(branch?.name ?? ''),
                  address: String(branch?.address ?? ''),
                  phone: String(branch?.phone ?? ''),
                  coordinates: { latitude: 0, longitude: 0 },
                },
                placedAt: Date.now(),
              } as Order);
            }
          }}
        />
      )}

      {optionPickerItem && (
        <POSItemOptionModal
          item={optionPickerItem}
          branchId={session?.branchId ? Number(session.branchId) : undefined}
          cart={cart}
          onClose={() => setOptionPickerItem(null)}
          onAdd={handleOptionAdd}
        />
      )}

      {/* Branch Closed Notice Modal */}
      {branchClosedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setBranchClosedNotice(null)}>
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 flex flex-col items-center gap-4 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
              <ProhibitIcon weight="fill" size={32} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-dark">Order Not Allowed</h3>
              <p className="text-sm text-neutral-gray mt-2 leading-relaxed">{branchClosedNotice}</p>
            </div>
            <button
              onClick={() => setBranchClosedNotice(null)}
              className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-2xl transition-all active:scale-[0.98]"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/*
        No stock, no sale.

        A modal rather than a toast: this appears while the cashier is facing a
        customer, and it has to survive being looked away from. Each shortfall
        is listed with what is needed against what is there, because the useful
        instruction is "go and check the plantain", not "out of stock".
      */}
      {stockShortNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setStockShortNotice(null)}>
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                <ProhibitIcon weight="fill" size={32} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-dark">Not enough stock</h3>
                <p className="text-sm text-neutral-gray mt-1 leading-relaxed">
                  This order cannot be made with what the branch has on hand.
                </p>
              </div>
            </div>

            {stockShortNotice.shortfalls.length > 0 && (
              <div className="flex flex-col gap-2 rounded-2xl bg-neutral-light p-3">
                {stockShortNotice.shortfalls.map(s => (
                  <div key={s.item_id} className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-text-dark truncate">{s.item_name}</span>
                    <span className="text-xs font-body text-neutral-gray whitespace-nowrap">
                      need {s.required}{s.unit ? ` ${s.unit}` : ''} · have{' '}
                      <span className={s.available < 0 ? 'text-red-600 font-semibold' : ''}>
                        {s.available}{s.unit ? ` ${s.unit}` : ''}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {stockShortNotice.canOverride && (
              <p className="text-xs text-neutral-gray font-body leading-relaxed">
                If the stock is on the shelf and simply has not been recorded, receive it in the
                inventory portal first. An override is logged against your name.
              </p>
            )}

            <button
              onClick={() => setStockShortNotice(null)}
              className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-2xl transition-all active:scale-[0.98]"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface POSItemOptionModalProps {
  item: DisplayMenuItem;
  cart: ReturnType<typeof usePOS>['cart'];
  branchId?: number;
  onClose: () => void;
  onAdd: (option: ItemOption) => void;
}

function POSItemOptionModal({ item, cart, branchId, onClose, onAdd }: POSItemOptionModalProps) {
  const options = getItemOptions(item);
  // Same verdict as the grid behind it, so a size cannot be picked here after
  // being greyed out there.
  const { isBlocked: isOptionBlocked } = useStockGate(branchId);

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
            const outOfStock = isOptionBlocked(option.sizeId);
            return (
              <button
                key={option.key}
                onClick={() => onAdd(option)}
                disabled={outOfStock}
                className={`w-full px-4 py-3 rounded-xl border transition-colors flex items-center justify-between text-left ${
                  outOfStock
                    ? 'border-neutral-gray/15 bg-neutral-light opacity-55 cursor-not-allowed'
                    : 'border-neutral-gray/20 hover:border-primary/50 hover:bg-primary/5'
                }`}
              >
                <div>
                  <p className={`font-medium ${outOfStock ? 'text-neutral-gray' : 'text-text-dark'}`}>{option.label}</p>
                  <p className="text-xs text-neutral-gray">{option.name}</p>
                </div>
                <div className="text-right">
                  {outOfStock ? (
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-gray">Out of stock</p>
                  ) : (
                    <p className="font-semibold text-primary">{formatGHS(option.price)}</p>
                  )}
                  {qty > 0 && !outOfStock && <p className="text-xs text-neutral-gray">In cart: {qty}</p>}
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
  branchPaymentMethods?: Record<string, { is_enabled: boolean }>;
}

function PaymentModal({ total, onClose, onPayment, isManualEntry, branchPaymentMethods }: PaymentModalProps) {
  const { staffUser } = useStaffAuth();
  const isAdmin = staffUser?.role === 'admin' || staffUser?.role === 'tech_admin';
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
                  <p className="text-xs text-neutral-gray/70">Only past dates &amp; times allowed. You cannot log a future order.</p>
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
                  <p className="text-xs text-neutral-gray/70">Only past times allowed. You cannot log a future order.</p>
                </>
              )}
            </div>
          )}

          <p className="text-sm text-neutral-gray">Select payment method</p>

          <div className="grid grid-cols-2 gap-3">
            {(() => {
              // Map POS payment method IDs to branch settings DB keys
              const posToDbKey: Record<string, string> = { cash: 'cash_on_delivery', mobile_money: 'momo', manual_momo: 'momo', card: 'card', no_charge: 'no_charge' };
              const isMethodEnabled = (id: string) => {
                const dbKey = posToDbKey[id];
                if (!dbKey || !branchPaymentMethods) return true; // No branch data = allow all
                return branchPaymentMethods[dbKey]?.is_enabled !== false;
              };

              return [
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
              ].filter(m => isMethodEnabled(m.id)).map(method => (
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
            ));
            })()}
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
              <p>Staff meal. No payment required.</p>
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
  const { markPrinted } = useMarkReceiptPrinted();

  /**
   * The slip handed over at the counter counts as the order's first print.
   *
   * Without recording it, the orders list would go on offering "Print receipt"
   * for a sale whose receipt is already in the customer's hand — and the till
   * would have no way to tell that from an online order nobody has printed at
   * all, which is the distinction the button exists to draw.
   */
  const printAndRecord = () => {
    printReceipt(order, branch);
    void markPrinted(Number(order.id)).catch(() => {});
  };

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
              onClick={printAndRecord}
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
          {/* The number the prompt actually went to — the momo number that was
              entered and verified at payment, which is not necessarily the
              customer's own. This showed contact.phone, so a caller paying from
              a second number was told the prompt went somewhere it had not. */}
          <p className="text-lg font-semibold text-text-dark mb-6">
            {order.momoNumber ?? order.contact.phone}
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
