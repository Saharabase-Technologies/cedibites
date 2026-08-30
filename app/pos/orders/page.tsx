'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  StorefrontIcon,
  ArrowLeftIcon,
  SignOutIcon,
  SpinnerIcon,
  ReceiptIcon,
  PrinterIcon,
  UserIcon,
  NoteIcon,
  PhoneIcon,
  FlaskIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@phosphor-icons/react';
import { usePOS } from '../context';
import { SignOutDialog } from '@/app/components/ui/SignOutDialog';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import type { Order } from '@/types/order';
import { formatGHS } from '@/lib/utils/currency';
import { useBranch } from '@/app/components/providers/BranchProvider';
import { printReceipt } from '@/lib/utils/printReceipt';
import {
  FULFILLMENT_LABELS,
  REMOTE_ORDER_SOURCES,
  SOURCE_ICON,
  SOURCE_LABEL,
  STATUS_CONFIG,
  isRemoteSource,
} from '@/lib/constants/order.constants';
import { useEmployeeOrders, useEmployeeOrdersPeriodSummary } from '@/lib/api/hooks/useEmployeeOrders';
import type { EmployeeOrdersParams } from '@/lib/api/services/order.service';
import { useOnlineOrderArrivals } from '../hooks/useOnlineOrderArrivals';
import OrderPeriodSummary from '@/app/components/ui/OrderPeriodSummary';
import { mapApiOrderToOrder } from '@/lib/api/adapters/order.adapter';
import { formatOrderLineItemSummary } from '@/lib/utils/orderItemDisplay';
import CancelOrderModal from '@/app/components/ui/CancelOrderModal';
import { useRequestCancel, useCancelOrder, useUpdateEmployeeOrderStatus } from '@/lib/api/hooks/useOrders';
import { toast } from '@/lib/utils/toast';
import { useQueryClient } from '@tanstack/react-query';
import { getEcho } from '@/lib/echo';

function formatOrderTime(placedAt: number): string {
  if (!placedAt) {
    return '—';
  }
  const d = new Date(placedAt);
  return d.toLocaleTimeString('en-GH', { timeZone: 'Africa/Accra', hour: '2-digit', minute: '2-digit', hour12: true });
}

/**
 * Which slice of the branch's day this screen is showing.
 *
 * `mine` is what this page has always been and remains the default: the
 * cashier's own till, which is the list they reconcile a drawer against.
 * `remote` and `all` are new — an order placed on the website is assigned to no
 * cashier at all, so it could never appear on a list scoped to one, which is
 * why online orders were invisible here and their receipts unprintable.
 */
type Channel = 'mine' | 'remote' | 'all';

const CHANNEL_SUBTITLE: Record<Channel, string> = {
  mine: 'Assigned to me',
  remote: 'Online, phone & WhatsApp',
  all: 'Every order at this branch',
};

export default function POSOrdersPage() {
  const router = useRouter();
  const {
    session,
    isSessionValid,
    isSessionLoaded,
    isManualEntry,
    setIsManualEntry,
  } = usePOS();
  const { logout, staffUser } = useStaffAuth();
  const { branches } = useBranch();
  const isAdmin = staffUser?.role === 'admin' || staffUser?.role === 'tech_admin';

  const [isSignOutOpen, setIsSignOutOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const { requestCancel } = useRequestCancel();
  const { cancelOrder } = useCancelOrder();
  const { updateStatus } = useUpdateEmployeeOrderStatus();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isSessionLoaded && !isSessionValid) {
      router.replace('/pos');
    }
  }, [isSessionLoaded, isSessionValid, router]);

  const branchInfo = useMemo(
    () => session ? branches.find(b => b.id === session.branchId) ?? null : null,
    [session, branches]
  );

  const today = new Date().toISOString().split('T')[0];
  const branchId = session?.branchId ? Number(session.branchId) : undefined;

  const [channel, setChannel] = useState<Channel>('mine');

  useEffect(() => {
    // Read after mount rather than through `useSearchParams`, which would force
    // this whole route out of prerendering for the sake of one optional query
    // string. The arrival banner deep-links here with `?channel=remote`.
    //
    // Reading the URL is the "subscribe to an external system" case the rule
    // exists to allow, and it happens once, on mount, before anything is drawn.
    const requested = new URLSearchParams(window.location.search).get('channel');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (requested === 'remote' || requested === 'all') setChannel(requested);
  }, []);

  const baseParams: EmployeeOrdersParams | undefined = useMemo(
    () => (session ? { branch_id: branchId, date_from: today, date_to: today, per_page: 100 } : undefined),
    [session, branchId, today],
  );

  /**
   * Everything assigned to this member of staff, whatever channel it came in on.
   *
   * Deliberately not filtered by source. An order is attributed to whoever owns
   * it — the cashier who rang it up, the call-centre agent who took the call, or
   * whoever accepted an online order and thereby claimed it (the API stamps
   * `assigned_employee_id` on accept). Filtering this by `pos` as well would
   * mean a call-centre agent's own orders never appeared on their own list, and
   * an online order a cashier claimed credited nobody.
   *
   * The header figures always read from this, never from the selected tab.
   */
  const staffId = session?.staffId;
  const myParams: EmployeeOrdersParams | undefined = useMemo(
    () => (baseParams && staffId ? { ...baseParams, staff_id: staffId } : undefined),
    [baseParams, staffId],
  );

  const listParams: EmployeeOrdersParams | undefined = useMemo(() => {
    if (!baseParams) return undefined;
    if (channel === 'mine') return myParams;
    if (channel === 'remote') return { ...baseParams, order_source: [...REMOTE_ORDER_SOURCES] };
    // `all` sends no source and no staff filter. It is not a widening of
    // permissions: the API scopes every result to the branches this employee is
    // assigned to before any filter here is applied.
    return baseParams;
  }, [baseParams, myParams, channel]);

  const { orders: rawOrders, isLoading } = useEmployeeOrders(listParams);
  const { summary: periodSummary, isLoading: summaryLoading } = useEmployeeOrdersPeriodSummary(listParams);

  // On the `mine` tab these params are identical, so React Query serves both
  // from one cache entry and the second request never leaves the device.
  const { orders: myRawOrders } = useEmployeeOrders(myParams);

  // Remote orders nobody has accepted yet — the count on the Online tab. Silent
  // and without its own socket: the shell's banner owns both, and a second of
  // either would double every chime and every refetch.
  const { awaitingCount } = useOnlineOrderArrivals(session?.branchId ?? null, {
    sound: false,
    subscribe: false,
  });

  // ─── Real-time order updates via Reverb ───────────────────────────────
  // Named `orderChannel`, not `channel`: that word now means the selected tab
  // on this screen, and a socket subscription shadowing it inside one effect is
  // the sort of thing that reads fine and gets edited wrong later.
  useEffect(() => {
    const branch = session?.branchId;
    if (!branch) return;

    const echo = getEcho();
    if (!echo) return;

    const orderChannel = echo.private(`orders.branch.${branch}`);

    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ['employee-orders'] });
    };

    orderChannel.listen('.order.updated', handler);

    return () => {
      orderChannel.stopListening('.order.updated', handler);
    };
  }, [session?.branchId, queryClient]);

  const todayOrders = useMemo(
    () => rawOrders.map(mapApiOrderToOrder).sort((a, b) => b.placedAt - a.placedAt),
    [rawOrders]
  );

  const myOrders = useMemo(() => myRawOrders.map(mapApiOrderToOrder), [myRawOrders]);

  /**
   * What this member of staff is credited with today, and what of it is cash.
   *
   * The total is every order attributed to them — till, call centre, and any
   * online order they accepted. The cash figure is carved out of it because the
   * two answer different questions: the total is what they sold, the cash is
   * what should be in the drawer. An online order paid through the gateway
   * counts towards the first and not the second, so showing only the total
   * would leave the drawer reading short by exactly the online takings at
   * cash-up — a discrepancy that looks like theft.
   */
  const takings = useMemo(() => {
    const counted = myOrders.filter(
      o => o.status !== 'cancelled' && o.paymentMethod !== 'no_charge',
    );
    return {
      total: counted.reduce((s, o) => s + o.total, 0),
      cash: counted
        .filter(o => o.paymentMethod === 'cash')
        .reduce((s, o) => s + o.total, 0),
    };
  }, [myOrders]);

  /**
   * Claim an order from the till.
   *
   * The status write is what does the attribution: the API stamps
   * `assigned_employee_id` from the caller whenever the order has none, and
   * puts it on that person's open shift. So accepting an online order here is
   * how a cashier takes credit — and responsibility — for it.
   */
  const acceptOrder = async (order: Order) => {
    setAcceptingId(order.id);
    try {
      await updateStatus({ id: Number(order.id), status: 'accepted' });
      toast.success(`Order #${order.orderNumber} is yours`);
    } catch {
      toast.error('Could not accept the order. Try again.');
    } finally {
      setAcceptingId(null);
    }
  };

  if (!session || isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-neutral-light">
        <SpinnerIcon className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-neutral-light">
      {/* Header */}
      <header className="shrink-0 px-4 py-3 border-b border-neutral-gray/20 flex items-center justify-between gap-4 bg-white">
        <div className="flex items-center gap-3">
          <Link
            href="/pos/terminal"
            className="w-9 h-9 rounded-xl bg-neutral-gray/10 flex items-center justify-center text-neutral-gray hover:text-text-dark hover:bg-neutral-gray/20 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <StorefrontIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-text-dark font-medium text-sm">{branchInfo?.name ?? 'Branch'}</p>
            <p className="text-neutral-gray text-xs">{session.staffName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Named, because the list below no longer always agrees with it.
              An unlabelled "Revenue" beside an All-orders list would read as
              the branch's total and get counted into the wrong drawer. */}
          <div className="hidden sm:flex items-center gap-4 px-4 py-2 rounded-xl bg-neutral-gray/10">
            <div className="text-center">
              <p className="text-xs text-neutral-gray">My orders</p>
              <p className="text-lg font-medium text-text-dark">{myOrders.length}</p>
            </div>
            <div className="w-px h-8 bg-neutral-gray/20" />
            <div className="text-center">
              <p className="text-xs text-neutral-gray">My takings</p>
              <p className="text-lg font-medium text-primary">{formatGHS(takings.total)}</p>
              {/* The drawer figure, carved out of the total. Without it a
                  cashier counting cash against "My takings" comes up short by
                  every order that was paid online. */}
              <p className="text-[10px] text-neutral-gray/80 -mt-0.5">
                {formatGHS(takings.cash)} cash
              </p>
            </div>
          </div>


          <button
            onClick={() => setIsSignOutOpen(true)}
            className="w-10 h-10 rounded-xl bg-neutral-gray/10 flex items-center justify-center text-neutral-gray hover:text-error hover:bg-error/10 transition-colors"
            title="Sign Out"
          >
            <SignOutIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Page title */}
      <div className="shrink-0 px-4 pt-4 pb-3 bg-white border-b border-neutral-gray/15">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-text-dark">Today&apos;s Orders</h1>
            <p className="text-xs text-neutral-gray mt-0.5">
              {CHANNEL_SUBTITLE[channel]}
              {channel === 'mine' && ` · ${session.staffName}`}
            </p>
            <div className="mt-2">
              <OrderPeriodSummary summary={periodSummary} isLoading={summaryLoading} countsOnly />
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setIsManualEntry(true); router.push('/pos/terminal'); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-gray hover:text-amber-700 hover:bg-amber-50 border border-neutral-gray/20 hover:border-amber-300 transition-colors"
          >
            <ClockIcon className="w-3.5 h-3.5" />
            Record Past Order
          </button>
        </div>

        {/* Channel tabs. `mine` stays first and stays the default so nothing a
            cashier does today changes shape; the other two are additions. */}
        <div className="mt-3 flex items-center gap-1.5 p-1 rounded-xl bg-neutral-gray/10 w-fit">
          {(['mine', 'remote', 'all'] as const).map(key => {
            const isActive = channel === key;
            const label = key === 'mine' ? 'Mine' : key === 'remote' ? 'Online' : 'All';
            return (
              <button
                key={key}
                type="button"
                onClick={() => setChannel(key)}
                aria-pressed={isActive}
                className={`relative flex items-center gap-1.5 px-3.5 h-9 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white text-text-dark shadow-sm'
                    : 'text-neutral-gray hover:text-text-dark'
                }`}
              >
                {label}
                {key === 'remote' && awaitingCount > 0 && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-primary text-brown text-[11px] font-bold flex items-center justify-center">
                    {awaitingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <SignOutDialog
        isOpen={isSignOutOpen}
        onCancel={() => setIsSignOutOpen(false)}
        onConfirm={() => logout('/pos')}
      />

      {cancelTarget && (
        <CancelOrderModal
          orderNumber={cancelTarget.orderNumber}
          theme="light"
          context={isAdmin ? 'self' : 'staff'}
          onCancel={() => setCancelTarget(null)}
          onConfirm={async (reason) => {
            if (isAdmin) {
              await cancelOrder({ id: Number(cancelTarget.id), reason: reason || 'Cancelled by POS admin' });
              toast.success('Order cancelled');
            } else {
              await requestCancel({ id: Number(cancelTarget.id), reason: reason || 'Requested by POS staff' });
              toast.success('Cancel request submitted. Awaiting manager approval.');
            }
          }}
        />
      )}

      {/* Orders list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {todayOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-gray">
            <ReceiptIcon className="w-14 h-14 mb-4 opacity-30" />
            <p className="text-lg font-medium mb-1">No orders yet today</p>
            <p className="text-sm opacity-60">
              {channel === 'mine'
                ? 'Orders you take at the till, or accept from another channel, appear here'
                : channel === 'remote'
                  ? 'Orders from the website, phone and WhatsApp will appear here'
                  : 'Every order taken at this branch today will appear here'}
            </p>
          </div>
        ) : (
          todayOrders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              branchName={branchInfo?.name ?? 'CediBites'}
              staffName={session.staffName}
              isAdmin={isAdmin}
              isAccepting={acceptingId === order.id}
              onAccept={acceptOrder}
              onCancelRequested={setCancelTarget}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Order Card ──────────────────────────────────────────────────────────────

interface OrderCardProps {
  order: Order;
  branchName: string;
  staffName: string;
  isAdmin: boolean;
  isAccepting: boolean;
  onAccept: (order: Order) => void;
  onCancelRequested: (order: Order) => void;
}

function OrderCard({
  order,
  branchName,
  staffName,
  isAdmin,
  isAccepting,
  onAccept,
  onCancelRequested,
}: OrderCardProps) {
  const itemSummary = order.items.map((i) => formatOrderLineItemSummary(i)).join(', ');
  const isRemote = isRemoteSource(order.source);
  const SourceIcon = SOURCE_ICON[order.source] ?? ReceiptIcon;

  return (
    <div className="bg-white rounded-2xl border border-neutral-gray/15 shadow-sm overflow-hidden">
      {/* Top row: order number, type, status, time */}
      <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-bold text-text-dark text-sm">#{order.orderNumber}</span>
          <span className={`
            text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide
            ${order.fulfillmentType === 'dine_in' ? 'bg-info/10 text-info' : 'bg-secondary/10 text-secondary'}
          `}>
            {FULFILLMENT_LABELS[order.fulfillmentType]}
          </span>
          {(() => {
            const cfg = STATUS_CONFIG[order.status];
            return (
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${cfg.bg}${cfg.pulse ? ' animate-pulse' : ''}`}
                style={{ color: cfg.textColor }}
              >
                {cfg.label}
              </span>
            );
          })()}
          {order.source === 'manual_entry' && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-neutral-gray/10 text-neutral-gray">
              Past Order
            </span>
          )}
          {/* Only for orders nobody keyed in here. A walk-in needs no badge —
              at a till, that is the assumption. */}
          {isRemote && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-info/10 text-info flex items-center gap-1">
              <SourceIcon className="w-3 h-3" />
              {SOURCE_LABEL[order.source]}
            </span>
          )}
        </div>
        <span className="text-xs text-neutral-gray whitespace-nowrap shrink-0 mt-0.5">
          {formatOrderTime(order.placedAt)}
        </span>
        {/* Cancel row — separated to avoid accidental taps */}
        {order.source !== 'manual_entry' && order.status !== 'cancelled' && order.status !== 'completed' && order.status !== 'cancel_requested' && (
          <div className="">
            <button
              onClick={() => onCancelRequested(order)}
              className="w-ful px-3 py-2 rounded-lg text-xs font-medium text-amber-600/70 hover:text-amber-700 hover:bg-amber-50 transition-colors border border-dashed border-amber-300/40 hover:border-amber-400"
              title={isAdmin ? 'Cancel Order' : 'Request Cancel'}
            >
              {isAdmin ? 'Cancel' : 'Request Cancel'}
            </button>
          </div>
        )}
        {order.status === 'cancel_requested' && (
          <span className="text-[11px] font-medium text-amber-600 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200">
            Cancel pending approval
          </span>
        )}
      </div>

      {/* Items summary */}
      <div className="px-4 pb-2">
        <p className="text-text-dark text-sm leading-snug">{itemSummary}</p>
      </div>

      {/* Customer info */}
      {(order.contact.name || order.contact.phone || order.contact.notes) && (
        <div className="px-4 pb-2 flex flex-col gap-0.5">
          {order.contact.name && order.contact.name !== 'Walk-in' && (
            <p className="text-xs text-neutral-gray flex items-center gap-1">
              <UserIcon className="w-3 h-3" /> {order.contact.name}
              {order.contact.phone && <span className="text-neutral-gray/60">· {order.contact.phone}</span>}
            </p>
          )}
          {(!order.contact.name || order.contact.name === 'Walk-in') && order.contact.phone && (
            <p className="text-xs text-neutral-gray flex items-center gap-1">
              <PhoneIcon className="w-3 h-3" /> {order.contact.phone}
            </p>
          )}
          {order.contact.notes && (
            <p className="text-xs text-neutral-gray flex items-center gap-1">
              <NoteIcon className="w-3 h-3" /> {order.contact.notes}
            </p>
          )}
        </div>
      )}

      {/* Who owns it. Blank until somebody accepts — which is the point: an
          unclaimed order is one nobody is accountable for yet. */}
      {order.staffName && (
        <p className="px-4 pb-2 text-xs text-neutral-gray flex items-center gap-1">
          <UserIcon className="w-3 h-3" />
          <span className="opacity-70">{isRemote ? 'Accepted by' : 'Served by'}</span>
          {order.staffName}
        </p>
      )}

      {/* Bottom row: total + accept + reprint */}
      <div className="px-4 pb-2 flex items-center justify-between gap-2 border-t border-neutral-gray/10 pt-2.5 mt-1">
        <span className="font-bold text-primary mr-auto">{formatGHS(order.total)}</span>
        {/* Accepting is what attributes the order — and its revenue — to the
            person who taps it. Offered only while nobody has claimed it. */}
        {order.status === 'received' && !order.staffName && (
          <button
            onClick={() => onAccept(order)}
            disabled={isAccepting}
            className="flex items-center gap-1.5 px-3.5 h-8 rounded-lg text-xs font-semibold bg-primary text-brown hover:brightness-95 active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100 transition"
          >
            {isAccepting ? <SpinnerIcon className="w-3.5 h-3.5 animate-spin" /> : <CheckCircleIcon className="w-3.5 h-3.5" />}
            {isAccepting ? 'Accepting…' : 'Accept'}
          </button>
        )}
        <button
          onClick={() => printReceipt(
            {
              ...order,
              // Falling back to whoever is signed in here is wrong for an order
              // this till did not take: the receipt would name a cashier for a
              // sale they never made. The channel is the honest answer.
              staffName: order.staffName ?? (isRemote ? SOURCE_LABEL[order.source] : staffName),
            },
            branchName,
            { kind: 'reprint' },
          )}
          className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium text-neutral-gray border border-neutral-gray/20 hover:text-text-dark hover:border-neutral-gray/40 transition-colors"
          title="Reprint Receipt"
        >
          <PrinterIcon className="w-3.5 h-3.5" />
          Reprint
        </button>
      </div>


    </div>
  );
}
