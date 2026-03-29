import type { Order, OrderItem, Payment } from '@/types/api';

export type OrderSource = 'Online' | 'POS' | 'WhatsApp' | 'Instagram' | 'Facebook' | 'Phone';
export type PaymentMethod = 'Mobile Money' | 'Cash on Delivery' | 'Cash at Pickup' | 'Cash' | 'Card' | 'Wallet' | 'GhQR' | 'No Charge';

export interface AdminOrderItem {
  name: string;
  qty: number;
  price: number;
}

export interface TimelineEvent {
  status: string;
  at: string;
  by: string;
  byName?: string;
}

export interface AdminOrder {
  id: string;
  customer: string;
  phone: string;
  email?: string;
  address: string;
  branch: string;
  assignedEmployee?: string;
  source: OrderSource;
  items: AdminOrderItem[];
  amount: number;
  amountPaid: number;
  payment: PaymentMethod;
  paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded' | 'no_charge';
  hubtelRef?: string;
  status: string;
  placedAt: string;
  placedAtFull: string;
  createdAt: string;
  timeAgo?: string;
  timeline: TimelineEvent[];
}

const SOURCE_MAP: Record<string, OrderSource> = {
  online: 'Online',
  pos: 'POS',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  facebook: 'Facebook',
  phone: 'Phone',
};

const PAYMENT_METHOD_MAP: Record<string, PaymentMethod> = {
  momo: 'Mobile Money',
  mobile_money: 'Mobile Money',
  cash_delivery: 'Cash on Delivery',
  cash_on_delivery: 'Cash on Delivery',
  cash_pickup: 'Cash at Pickup',
  cash_at_pickup: 'Cash at Pickup',
  cash: 'Cash',
  card: 'Card',
  wallet: 'Wallet',
  ghqr: 'GhQR',
  no_charge: 'No Charge',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });
}

function formatPlacedAt(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today) {
    return `Today ${formatTime(iso)}`;
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${formatTime(iso)}`;
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatTimeAgo(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const mins = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function formatPlacedAtFull(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today) {
    return `Today ${formatTime(iso)}`;
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${formatTime(iso)}`;
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    received: 'Received',
    preparing: 'Preparing',
    ready: 'Ready',
    ready_for_pickup: 'Ready for Pickup',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return labels[status] ?? status;
}

function buildTimeline(
  createdAt: string,
  statusHistory?: Array<{ status: string; changed_at?: string; created_at?: string; changed_by_type?: string; changed_by?: { name?: string } }>
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  if (statusHistory?.length) {
    for (const h of statusHistory) {
      const at = (h as { changed_at?: string; created_at?: string }).changed_at ?? (h as { created_at?: string }).created_at ?? createdAt;
      const byType = h.changed_by_type === 'employee' ? 'Staff' : h.changed_by_type === 'customer' ? 'Customer' : 'System';
      const byName = h.changed_by?.name;
      events.push({
        status: formatStatusLabel(h.status),
        at: formatTime(at),
        by: byType,
        byName,
      });
    }
  } else {
    events.push({
      status: 'Received',
      at: formatTime(createdAt),
      by: 'System',
    });
  }
  return events;
}

function getItemName(item: OrderItem): string {
  const name = item.menu_item_snapshot?.name ?? item.menu_item?.name ?? 'Item';
  const size =
    item.menu_item_option_snapshot?.option_label
    ?? item.option_snapshot?.option_label
    ?? item.menu_item_option?.option_label;
  if (size) {
    return `${name} (${size})`;
  }

  return name;
}

export function mapApiOrderToAdminOrder(api: Order): AdminOrder {
  const primaryPayment = api.payments?.[0] ?? api.payment;
  const paymentStatus = primaryPayment?.payment_status === 'completed' || primaryPayment?.payment_status === 'paid'
    ? 'paid'
    : primaryPayment?.payment_status === 'no_charge'
      ? 'no_charge'
      : primaryPayment?.payment_status === 'failed'
        ? 'failed'
        : primaryPayment?.payment_status === 'refunded'
          ? 'refunded'
          : 'pending';

  const items: AdminOrderItem[] = (api.items ?? []).map((item) => ({
    name: getItemName(item),
    qty: item.quantity,
    price: Number(item.unit_price ?? 0),
  }));

  const amount = Number(api.total_amount ?? api.subtotal ?? 0);
  const amountPaid = Number(primaryPayment?.amount ?? 0);
  const orderSource = (api.order_source ?? 'online').toLowerCase().replace(/\s+/g, '_');
  const source = SOURCE_MAP[orderSource] ?? 'Online';
  const paymentMethod = (primaryPayment?.payment_method ?? 'momo').toLowerCase().replace(/\s+/g, '_');
  const payment = PAYMENT_METHOD_MAP[paymentMethod] ?? paymentMethod.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const statusHistory = (api as { status_history?: Array<{ status: string; created_at: string; changed_by?: { name?: string }; changed_by_type?: string }> }).status_history;
  const timeline = buildTimeline(api.created_at, statusHistory);

  return {
    id: api.order_number ?? String(api.id),
    createdAt: api.created_at ?? '',
    customer: api.contact_name ?? api.customer_name ?? api.customer?.name ?? '—',
    phone: api.contact_phone ?? api.customer_phone ?? api.customer?.phone ?? '—',
    email: api.customer?.email,
    address: api.delivery_address ?? '—',
    branch: api.branch?.name ?? '—',
    assignedEmployee: (api as { assigned_employee?: { name?: string } }).assigned_employee?.name,
    source,
    items,
    amount,
    amountPaid,
    payment,
    paymentStatus,
    hubtelRef: primaryPayment?.transaction_id,
    status: api.status ?? 'received',
    placedAt: formatPlacedAt(api.created_at),
    placedAtFull: formatPlacedAtFull(api.created_at),
    timeAgo: formatTimeAgo(api.created_at),
    timeline,
  };
}


/** ISO timestamp from raw API (`created_at`). */
function orderCreatedIso(api: { created_at?: string; createdAt?: string }): string | undefined {
  return api.created_at ?? api.createdAt;
}

/** Map OrderResource payload to unified POS `Order` (line items: menu snapshot/name and option fields kept separate). */
export function mapApiOrderToOrder(api: any): import('@/types/order').Order {
  const createdIso = orderCreatedIso(api);

  const primaryPayment = api.payments?.[0] ?? api.payment;

  return {
    id: String(api.id),
    orderNumber: api.order_number ?? String(api.id),
    status: api.status ?? 'received',
    source: (api.order_source ?? 'pos') as import('@/types/order').OrderSource,
    fulfillmentType: (api.order_type ?? 'pickup') as import('@/types/order').FulfillmentType,
    paymentMethod: (primaryPayment?.payment_method ?? api.payment_method ?? 'cash') as import('@/types/order').PaymentMethod,
    isPaid: primaryPayment?.payment_status === 'completed' || primaryPayment?.payment_status === 'no_charge',
    paymentStatus: (primaryPayment?.payment_status === 'completed' || primaryPayment?.payment_status === 'no_charge' ? 'completed' : primaryPayment?.payment_status ?? 'pending') as import('@/types/order').PaymentStatus,
    paymentId: primaryPayment?.id,
    amountPaid: primaryPayment?.amount != null ? Number(primaryPayment.amount) : undefined,
    staffName:
      typeof api.assignedEmployee === 'string'
        ? api.assignedEmployee
        : api.assigned_employee?.name,
    items: (api.items ?? []).map((item: any) => ({
      id: String(item.id),
      menuItemId: String(item.menu_item_id),
      name: item.menu_item_snapshot?.name ?? item.menu_item?.name ?? '',
      quantity: Number(item.quantity ?? 1),
      unitPrice: Number(item.unit_price ?? 0),
      sizeId: item.menu_item_option_id,
      sizeLabel:
        item.menu_item_option_snapshot?.option_label
        ?? item.option_snapshot?.option_label
        ?? item.option?.option_label,
      variantKey:
        item.menu_item_option_snapshot?.option_key
        ?? item.option_snapshot?.option_key
        ?? item.option?.option_key,
      notes: item.special_instructions,
      category: item.menu_item?.category,
    })),
    subtotal: Number(api.subtotal ?? 0),
    deliveryFee: Number(api.delivery_fee ?? 0),
    discount: 0,
    tax: Number(api.tax_amount ?? 0),
    total: Number(api.total_amount ?? 0),
    contact: {
      name: api.contact_name ?? api.customer?.name ?? 'Walk-in',
      phone: api.contact_phone ?? api.customer?.phone ?? '',
      email: api.customer?.email,
      address: api.delivery_address,
      notes: api.delivery_note,
    },
    branch: {
      id: String(api.branch_id ?? api.branch?.id ?? ''),
      name: api.branch?.name ?? '',
      address: api.branch?.address ?? '',
      phone: api.branch?.phone ?? '',
      coordinates: {
        latitude: Number(api.branch?.latitude ?? 0),
        longitude: Number(api.branch?.longitude ?? 0),
      },
    },
    placedAt: createdIso ? new Date(createdIso).getTime() : 0,
    acceptedAt: api.accepted_at ? new Date(api.accepted_at).getTime() : undefined,
    startedAt: api.started_at ? new Date(api.started_at).getTime() : undefined,
    readyAt: api.ready_at ? new Date(api.ready_at).getTime() : undefined,
    completedAt: api.completed_at ? new Date(api.completed_at).getTime() : undefined,
  };
}
