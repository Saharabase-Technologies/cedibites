'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  CloudSlashIcon,
  PrinterIcon,
  ProhibitIcon,
  ReceiptIcon,
  SpinnerIcon,
  StorefrontIcon,
} from '@phosphor-icons/react';

import { usePOS } from '../context';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { useBranch } from '@/app/components/providers/BranchProvider';
import { useOnlineOrderArrivals } from '../hooks/useOnlineOrderArrivals';
import { OrderStatusBadge } from '../components/OrderStatusBadge';

import {
  DataTable,
  RowActionsMenu,
  SearchBar,
  SegmentedTabs,
  type DataTableColumn,
} from '@/app/inventory/_components';

import { useEmployeeOrders } from '@/lib/api/hooks/useEmployeeOrders';
import {
  useRequestCancel,
  useCancelOrder,
  useUpdateEmployeeOrderStatus,
  useMarkReceiptPrinted,
} from '@/lib/api/hooks/useOrders';
import { useOrderStream, type ConnectionState } from '@/lib/hooks/useOrderStream';
import type { EmployeeOrdersParams } from '@/lib/api/services/order.service';
import { mapApiOrderToOrder } from '@/lib/api/adapters/order.adapter';
import CancelOrderModal from '@/app/components/ui/CancelOrderModal';
import {
  FULFILLMENT_LABELS,
  REMOTE_ORDER_SOURCES,
  SOURCE_LABEL,
  isRemoteSource,
} from '@/lib/constants/order.constants';
import { formatGHS } from '@/lib/utils/currency';
import { printReceipt } from '@/lib/utils/printReceipt';
import { formatOrderLineItemSummary } from '@/lib/utils/orderItemDisplay';
import { toast } from '@/lib/utils/toast';
import type { Order } from '@/types/order';

/**
 * Which slice of the branch's day this screen is showing.
 *
 * `mine` is what this page has always been and remains the default: the orders
 * this person is answerable for. `remote` and `all` are additions — an order
 * placed on the website is assigned to no cashier at all, so it could never
 * appear on a list scoped to one, which is why online orders were invisible
 * here and their receipts unprintable.
 */
type Channel = 'mine' | 'remote' | 'all';

const CHANNEL_LABEL: Record<Channel, string> = {
  mine: 'Mine',
  remote: 'Online',
  all: 'All',
};

const CHANNEL_BLURB: Record<Channel, string> = {
  mine: 'Orders you took at the till, or accepted from another channel',
  remote: 'Orders from the website, phone and WhatsApp',
  all: 'Every order taken at this branch today',
};

/**
 * Heartbeat while the socket is up.
 *
 * Deliberately long. Reverb tells this screen the moment anything changes, so a
 * timer running underneath it is redundant work on a device that sits open all
 * day — this exists only to heal a state where the socket believes it is
 * connected but frames have stopped arriving. If you find yourself shortening
 * it, the socket is what needs fixing.
 */
const POLL_HEALTHY_MS = 300_000;
/** Poll while the socket is down. This is then the only live path. */
const POLL_DEGRADED_MS = 4_000;

function formatOrderTime(placedAt: number): string {
  if (!placedAt) return '—';
  return new Date(placedAt).toLocaleTimeString('en-GH', {
    timeZone: 'Africa/Accra',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function POSOrdersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, isSessionValid, isSessionLoaded, setIsManualEntry } = usePOS();
  const { staffUser } = useStaffAuth();
  const { branches } = useBranch();
  const isAdmin = staffUser?.role === 'admin' || staffUser?.role === 'tech_admin';

  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const { requestCancel } = useRequestCancel();
  const { cancelOrder } = useCancelOrder();
  const { updateStatus } = useUpdateEmployeeOrderStatus();
  const { markPrinted } = useMarkReceiptPrinted();

  useEffect(() => {
    if (isSessionLoaded && !isSessionValid) router.replace('/pos');
  }, [isSessionLoaded, isSessionValid, router]);

  const branchInfo = useMemo(
    () => (session ? branches.find((b) => b.id === session.branchId) ?? null : null),
    [session, branches],
  );

  // ── Channel ───────────────────────────────────────────────────────────────

  const [channel, setChannel] = useState<Channel>('mine');

  useEffect(() => {
    // Read after mount rather than through `useSearchParams`, which would force
    // this whole route out of prerendering for the sake of one optional query
    // string. The arrival banner deep-links here with `?channel=remote`.
    const requested = new URLSearchParams(window.location.search).get('channel');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (requested === 'remote' || requested === 'all') setChannel(requested);
  }, []);

  // ── Live ──────────────────────────────────────────────────────────────────
  // Reverb is the path that matters. Every frame for this branch invalidates
  // the list, so an order that arrives, is accepted, or is cancelled anywhere
  // in the building lands here without anybody reaching for refresh. The poll
  // below is a safety net whose rate follows the socket's health.

  const connection = useOrderStream(
    session?.branchId ?? null,
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['employee-orders'] });
    }, [queryClient]),
  );

  const pollMs = connection === 'live' ? POLL_HEALTHY_MS : POLL_DEGRADED_MS;

  // ── Data ──────────────────────────────────────────────────────────────────

  const today = new Date().toISOString().split('T')[0];
  const branchId = session?.branchId ? Number(session.branchId) : undefined;

  const baseParams: EmployeeOrdersParams | undefined = useMemo(
    () => (session ? { branch_id: branchId, date_from: today, date_to: today, per_page: 100 } : undefined),
    [session, branchId, today],
  );

  /**
   * Everything assigned to this member of staff, whatever channel it came in on.
   *
   * Deliberately not filtered by source. An order belongs to whoever is named
   * on it — the person who rang it up, took the call, or accepted it — so
   * filtering this by `pos` as well would mean a call-centre agent's own orders
   * never appeared on their own list, and an online order a cashier claimed
   * credited nobody. The figures always read from this, never from the tab.
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

  const { orders: rawOrders, isLoading } = useEmployeeOrders(listParams, pollMs);
  // On the `mine` tab these params are identical, so React Query serves both
  // from one cache entry and the second request never leaves the device.
  const { orders: myRawOrders } = useEmployeeOrders(myParams, pollMs);

  // Remote orders nobody has accepted — the count on the Online tab. Silent and
  // without a socket of its own: the shell's arrival banner owns both, and a
  // second of either would double every chime and every refetch.
  const { awaitingCount } = useOnlineOrderArrivals(session?.branchId ?? null, {
    sound: false,
    subscribe: false,
  });

  const orders = useMemo(
    () => rawOrders.map(mapApiOrderToOrder).sort((a, b) => b.placedAt - a.placedAt),
    [rawOrders],
  );

  const visibleOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) =>
      o.orderNumber.toLowerCase().includes(q)
      || o.contact.name?.toLowerCase().includes(q)
      || o.contact.phone?.includes(q)
      || o.items.some((i) => i.name.toLowerCase().includes(q)),
    );
  }, [orders, query]);

  const myOrders = useMemo(() => myRawOrders.map(mapApiOrderToOrder), [myRawOrders]);

  /**
   * What this member of staff is credited with today, and what of it is cash.
   *
   * The two answer different questions: revenue is what they sold, cash is what
   * should be in the drawer. An order paid through the gateway counts towards
   * the first and not the second, so showing only revenue would leave the
   * drawer reading short by exactly the online takings at cash-up.
   */
  const figures = useMemo(() => {
    const counted = myOrders.filter((o) => o.status !== 'cancelled' && o.paymentMethod !== 'no_charge');
    const sumWhere = (match: (o: Order) => boolean) =>
      counted.filter(match).reduce((s, o) => s + o.total, 0);

    return {
      count: counted.length,
      revenue: counted.reduce((s, o) => s + o.total, 0),
      cash: sumWhere((o) => o.paymentMethod === 'cash'),
      // Everything that arrived through the gateway rather than the drawer.
      // Split out for the same reason cash is: at close of day the two are
      // counted against different things.
      momo: sumWhere((o) => o.paymentMethod === 'mobile_money' || o.paymentMethod === 'manual_momo'),
    };
  }, [myOrders]);

  // ── Actions ───────────────────────────────────────────────────────────────

  /**
   * Claim an order from the till.
   *
   * The status write is what does the attribution: the API stamps
   * `assigned_employee_id` from the caller when the order names nobody, and
   * puts it on that person's open shift. Accepting here is how a cashier takes
   * credit — and responsibility — for an order they did not ring up.
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

  /**
   * Put a receipt in the customer's hand, and remember that we did.
   *
   * The first one is an original; everything after it is a reprint, and the
   * slip says so. That distinction is a fact about the order rather than about
   * this device — an order placed online has never been printed anywhere, and
   * the till has to be able to tell that from one whose slip is already in
   * somebody's pocket.
   *
   * Printing happens first and the record follows. If the write fails the
   * customer still has their receipt, which is the part that matters; the worst
   * case is that the button keeps offering to print it again.
   */
  const printOrder = (order: Order) => {
    const alreadyPrinted = (order.receiptPrintCount ?? 0) > 0;

    printReceipt(
      {
        ...order,
        // Falling back to whoever is signed in here is wrong for an order this
        // till did not take: the receipt would name a cashier for a sale they
        // never made. The channel is the honest answer.
        staffName: order.staffName
          ?? (isRemoteSource(order.source) ? SOURCE_LABEL[order.source] : session?.staffName),
      },
      branchInfo?.name ?? 'CediBites',
      { kind: alreadyPrinted ? 'reprint' : 'original' },
    );

    void markPrinted(Number(order.id)).catch(() => {
      toast.error('Printed, but could not record it. It may still show as unprinted.');
    });
  };

  const canCancel = (o: Order) =>
    o.source !== 'manual_entry'
    && o.status !== 'cancelled'
    && o.status !== 'completed'
    && o.status !== 'cancel_requested';

  // ── Columns ───────────────────────────────────────────────────────────────

  const columns: DataTableColumn<Order>[] = useMemo(() => [
    {
      key: 'order',
      header: 'Order',
      sortValue: (o) => o.placedAt,
      cell: (o) => (
        <div className="min-w-0">
          <p className="font-bold text-text-dark text-[15px] leading-tight tabular-nums">#{o.orderNumber}</p>
          <p className="text-neutral-gray text-xs mt-0.5">{formatOrderTime(o.placedAt)}</p>
        </div>
      ),
    },
    {
      key: 'channel',
      header: 'Channel',
      sortValue: (o) => SOURCE_LABEL[o.source] ?? o.source,
      hideBelow: 'lg',
      cell: (o) => (
        <div className="min-w-0">
          <p className="text-text-dark text-sm font-medium">{SOURCE_LABEL[o.source] ?? o.source}</p>
          <p className="text-neutral-gray text-xs mt-0.5">{FULFILLMENT_LABELS[o.fulfillmentType]}</p>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      hideBelow: 'md',
      cell: (o) => {
        const summary = o.items.map(formatOrderLineItemSummary).join(', ');
        return (
          <p className="text-text-dark text-sm max-w-88 truncate" title={summary}>
            {summary || '—'}
          </p>
        );
      },
    },
    {
      key: 'customer',
      header: 'Customer',
      hideBelow: 'sm',
      sortValue: (o) => o.contact.name ?? '',
      cell: (o) => (
        <div className="min-w-0">
          <p className="text-text-dark text-sm truncate">{o.contact.name || 'Walk-in'}</p>
          {o.contact.phone && <p className="text-neutral-gray text-xs mt-0.5">{o.contact.phone}</p>}
        </div>
      ),
    },
    {
      key: 'owner',
      header: 'Handled by',
      hideBelow: 'lg',
      sortValue: (o) => o.staffName ?? '',
      cell: (o) =>
        o.staffName
          ? <span className="text-text-dark text-sm">{o.staffName}</span>
          : <span className="text-neutral-gray/70 text-sm">Unclaimed</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (o) => o.status,
      cell: (o) => <OrderStatusBadge status={o.status} />,
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      sortValue: (o) => o.total,
      cell: (o) => (
        <span className="font-bold text-text-dark text-[15px] whitespace-nowrap tabular-nums">{formatGHS(o.total)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 'w-64',
      cell: (o) => {
        // Accepting is what attributes the order — and its revenue — to the
        // person who taps it. Offered only while nobody has claimed it.
        const claimable = o.status === 'received' && !o.staffName;
        const printed = (o.receiptPrintCount ?? 0) > 0;

        // No receipt for an order nobody has taken on. Printing one implies the
        // kitchen has it and the customer can be told a time, and for an order
        // still sitting in Received neither is true — the slip would be a
        // promise the branch has not made. A till sale is exempt: it was rung
        // up here, so accepting it is not a separate act.
        const canPrint = !isRemoteSource(o.source) || o.status !== 'received';
        return (
          <div className="flex items-center justify-end gap-1.5">
            {claimable && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); void acceptOrder(o); }}
                disabled={acceptingId === o.id}
                className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
              >
                {acceptingId === o.id
                  ? <SpinnerIcon size={14} className="animate-spin" />
                  : <CheckCircleIcon size={14} weight="bold" />}
                Accept
              </button>
            )}

            {/* Out in the open rather than behind the kebab: handing over a
                receipt is the most common thing done from this screen. An order
                whose slip has never been printed wears the emphasis, because
                that is a customer still waiting for one. */}
            {canPrint && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); printOrder(o); }}
              className={`
                flex items-center gap-1.5 px-3 h-9 rounded-xl text-sm font-semibold
                transition-colors cursor-pointer whitespace-nowrap border
                ${printed
                  ? 'bg-neutral-card border-[#e3ddd0] text-neutral-gray hover:text-text-dark hover:border-neutral-gray/50'
                  : 'bg-primary/10 border-primary/40 text-primary hover:bg-primary/15'}
              `}
              title={
                printed
                  ? `Printed ${o.receiptPrintCount} time${o.receiptPrintCount === 1 ? '' : 's'}`
                  : 'No receipt has been printed for this order yet'
              }
            >
              <PrinterIcon size={14} weight={printed ? 'regular' : 'bold'} />
              {printed ? 'Reprint' : 'Print'}
            </button>
            )}

            {canCancel(o) && (
              <RowActionsMenu
                actions={[{
                  label: isAdmin ? 'Cancel order' : 'Request cancel',
                  icon: <ProhibitIcon size={14} />,
                  onClick: () => setCancelTarget(o),
                  destructive: true,
                }]}
              />
            )}
          </div>
        );
      },
    },
  // `acceptOrder` and `reprint` are rebuilt on every render by design — they
  // read the live session. The columns only need rebuilding when what they draw
  // changes, which is the accepting row and the viewer's powers.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [acceptingId, isAdmin, session?.staffName, branchInfo?.name]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (!session) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-neutral-light">
        <SpinnerIcon className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-neutral-light font-body">
      {/* ── App bar ─────────────────────────────────────────────────────── */}
      <header className="shrink-0 bg-neutral-card border-b border-[#f0e8d8]">
        <div className="px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/pos/terminal"
              aria-label="Back to till"
              className="w-10 h-10 rounded-xl bg-neutral-light border border-[#f0e8d8] flex items-center justify-center text-neutral-gray hover:text-text-dark transition-colors shrink-0"
            >
              <ArrowLeftIcon size={18} />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <StorefrontIcon size={20} className="text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-text-dark font-bold font-brand text-lg leading-tight truncate">
                Today&apos;s orders
              </h1>
              <p className="text-neutral-gray text-xs truncate">
                {branchInfo?.name ?? 'Branch'} · {session.staffName}
              </p>
            </div>
          </div>

          {/* The day's figures, collapsed into the bar. As three cards they ate
              the top of the screen and pushed the list — the thing anybody
              actually came here for — below the fold. */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="flex items-stretch rounded-xl border border-[#f0e8d8] bg-neutral-light overflow-hidden divide-x divide-[#f0e8d8]">
              <Figure label="Orders" value={String(figures.count)} />
              <Figure label="Revenue" value={formatGHS(figures.revenue)} accent />
              <Figure label="Cash" value={formatGHS(figures.cash)} />
              <Figure label="MoMo" value={formatGHS(figures.momo)} />
            </div>
            <ConnectionPill connection={connection} />
          </div>
        </div>

        {/* Tabs live in the header rather than over the list: they decide what
            this screen is, so they belong beside its identity. */}
        <div className="px-5 pb-3 flex flex-wrap items-center gap-3">
          <SegmentedTabs
            value={channel}
            onChange={setChannel}
            options={(['mine', 'remote', 'all'] as const).map((key) => ({
              value: key,
              label: CHANNEL_LABEL[key],
              icon: key === 'remote' && awaitingCount > 0
                ? (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center">
                    {awaitingCount}
                  </span>
                )
                : undefined,
            }))}
          />

          <div className="flex-1 min-w-45">
            <SearchBar value={query} onChange={setQuery} placeholder="Search order number, customer or dish…" />
          </div>

          <button
            type="button"
            onClick={() => { setIsManualEntry(true); router.push('/pos/terminal'); }}
            className="flex items-center gap-2 bg-neutral-card border border-[#e3ddd0] text-text-dark px-4 py-2.5 rounded-xl text-sm font-semibold hover:border-neutral-gray/50 transition-colors min-h-11 cursor-pointer shrink-0"
          >
            <ClockIcon size={16} />
            Record past order
          </button>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-5 mx-auto w-full max-w-368">
          <DataTable
            data={visibleOrders}
            columns={columns}
            rowKey={(o) => o.id}
            pageSize={15}
            isLoading={isLoading && orders.length === 0}
            // An order nobody has claimed is the one thing on this screen that
            // needs a person. Same gold edge the inventory tables use.
            needsAttention={(o) => o.status === 'received' && !o.staffName}
            expandedContent={(o) => <OrderDetail order={o} />}
            // A 24px caret is a poor target for a thumb on a till screen.
            expandOnRowClick
            emptyState={
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <ReceiptIcon size={40} className="text-neutral-gray/40 mb-3" />
                <p className="text-text-dark font-semibold text-base mb-1">
                  {query ? 'Nothing matches that search' : 'No orders yet today'}
                </p>
                <p className="text-neutral-gray text-sm max-w-sm">
                  {query
                    ? 'Try a different order number, name or dish.'
                    : `${CHANNEL_BLURB[channel]} will appear here.`}
                </p>
              </div>
            }
          />
        </div>
      </div>

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
    </div>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

/**
 * Whether the screen can still hear the server.
 *
 * Worth the space: the whole point of this page is that it updates itself, and
 * a list that has quietly fallen back to a timer looks identical to one that is
 * simply having a quiet spell.
 */
function ConnectionPill({ connection }: { connection: ConnectionState }) {
  const copy =
    connection === 'live' ? 'Live'
    : connection === 'connecting' ? 'Connecting'
    : 'Offline';

  return (
    <span
      title={
        connection === 'live'
          ? 'Live — new orders arrive on their own'
          : connection === 'connecting'
            ? 'Reconnecting to the live feed'
            : 'No live feed — the list is refreshing on a timer instead'
      }
      className={`
        inline-flex items-center gap-2 px-3 h-9 rounded-xl text-xs font-semibold shrink-0
        ${connection === 'live'
          ? 'bg-emerald-50 text-emerald-700'
          : connection === 'connecting'
            ? 'bg-amber-50 text-amber-700'
            : 'bg-rose-50 text-rose-700'}
      `}
    >
      {connection === 'offline'
        ? <CloudSlashIcon size={14} weight="fill" />
        : <span className={`w-1.5 h-1.5 rounded-full ${connection === 'live' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />}
      {copy}
    </span>
  );
}

/**
 * One of the day's figures, sized for the header bar.
 *
 * All three are this person's own whichever tab is showing — hence the title
 * attribute, which is where the explanation went when the cards became a strip.
 */
function Figure({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="px-4 py-1.5 text-center" title={`${label} — assigned to you today`}>
      <p className="text-neutral-gray text-[10px] font-bold uppercase tracking-wider">{label}</p>
      <p className={`text-base font-bold leading-tight ${accent ? 'text-primary' : 'text-text-dark'}`}>
        {value}
      </p>
    </div>
  );
}

function OrderDetail({ order }: { order: Order }) {
  return (
    <div className="px-4 py-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div>
        <p className="text-neutral-gray text-[11px] font-bold uppercase tracking-wider mb-2">Items</p>
        <ul className="space-y-1.5">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-baseline justify-between gap-4 text-sm">
              <span className="text-text-dark">{formatOrderLineItemSummary(item)}</span>
              <span className="text-neutral-gray whitespace-nowrap">
                {formatGHS(item.unitPrice * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <dl className="space-y-2.5 text-sm">
        <DetailRow label="Payment" value={order.paymentMethod.replace(/_/g, ' ')} />
        <DetailRow label="Fulfilment" value={FULFILLMENT_LABELS[order.fulfillmentType]} />
        <DetailRow label="Channel" value={SOURCE_LABEL[order.source] ?? order.source} />
        <DetailRow label="Handled by" value={order.staffName ?? 'Unclaimed'} />
        {order.contact.notes && <DetailRow label="Note" value={order.contact.notes} />}
        {order.contact.address && <DetailRow label="Address" value={order.contact.address} />}
      </dl>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-neutral-gray text-xs shrink-0">{label}</dt>
      <dd className="text-text-dark text-right capitalize">{value}</dd>
    </div>
  );
}
