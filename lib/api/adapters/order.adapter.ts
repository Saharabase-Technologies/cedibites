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
  const snapshot = (item as { menu_item_snapshot?: { name?: string } }).menu_item_snapshot;
  const name = snapshot?.name ?? item.menu_item?.name;
  const size = item.menu_item_option_snapshot?.option_label
    ?? item.menu_item_option?.option_label;
  if (size) return `${name ?? 'Item'} (${size})`;
  return name ?? 'Item';
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


/**
 * Map API order to POS/Kitchen Order type
 */
/**
 * ISO timestamp from raw API (`created_at`) or from AdminOrder (`createdAt`).
 */
function orderCreatedIso(api: { created_at?: string; createdAt?: string }): string | undefined {
  return api.created_at ?? api.createdAt;
}

/**
 * `useEmployeeOrders` maps API payloads with `mapApiOrderToAdminOrder` first, which uses
 * line items `{ name, qty, price }`. Detect that shape so reprints get real names/prices.
 */
function isAdminOrderLineItems(items: unknown): boolean {
  if (!Array.isArray(items) || items.length === 0) {
    return false;
  }
  const first = items[0] as Record<string, unknown>;
  return (
    typeof first === 'object' &&
    first !== null &&
    'qty' in first &&
    'price' in first &&
    !('unit_price' in first)
  );
}

function adminDisplayPaymentToMethod(p: string): import('@/types/order').PaymentMethod {
  const x = p.toLowerCase();
  if (x.includes('mobile') || x.includes('momo')) {
    return 'mobile_money';
  }
  if (x.includes('card')) {
    return 'card';
  }
  if (x.includes('no charge')) {
    return 'no_charge';
  }

  return 'cash';
}

function adminDisplaySourceToOrderSource(s: string): import('@/types/order').OrderSource {
  const map: Record<string, import('@/types/order').OrderSource> = {
    Online: 'online',
    POS: 'pos',
    WhatsApp: 'whatsapp',
    Instagram: 'social_media',
    Facebook: 'social_media',
    Phone: 'phone',
  };

  return map[s.trim()] ?? 'online';
}

export function mapApiOrderToOrder(api: any): import('@/types/order').Order {
  const createdIso = orderCreatedIso(api);

  if (isAdminOrderLineItems(api.items)) {
    const primaryPayment = typeof api.payment === 'object' && api.payment ? api.payment : null;
    const paymentMethod = adminDisplayPaymentToMethod(String(api.payment ?? 'Cash'));
    const paid =
      api.paymentStatus === 'paid' ||
      api.paymentStatus === 'no_charge' ||
      primaryPayment?.payment_status === 'completed' ||
      primaryPayment?.payment_status === 'no_charge';

    const amount = Number(api.amount ?? 0);
    const amountPaid = Number(api.amountPaid ?? 0);

    return {
      id: String(api.id),
      orderNumber: String(api.id),
      status: (api.status ?? 'received') as import('@/types/order').Order['status'],
      source: adminDisplaySourceToOrderSource(String(api.source ?? 'POS')),
      fulfillmentType: 'takeaway',
      paymentMethod,
      isPaid: paid,
      paymentStatus: paid ? 'completed' : 'pending',
      paymentId: primaryPayment?.id,
      amountPaid: amountPaid > 0 ? amountPaid : undefined,
      items: (api.items ?? []).map((item: { name?: string; qty?: number; price?: number }, index: number) => ({
        id: `line-${index}`,
        menuItemId: `line-${index}`,
        name: item.name ?? 'Item',
        quantity: Number(item.qty ?? 1),
        unitPrice: Number(item.price ?? 0),
      })),
      subtotal: amount,
      deliveryFee: 0,
      discount: 0,
      tax: 0,
      total: amount,
      contact: {
        name: api.customer ?? 'Walk-in',
        phone: typeof api.phone === 'string' ? api.phone : '',
        email: api.email,
        address: typeof api.address === 'string' ? api.address : undefined,
        notes: undefined,
      },
      branch: {
        id: '',
        name: typeof api.branch === 'string' ? api.branch : (api.branch?.name ?? ''),
        address: '',
        phone: '',
        coordinates: { latitude: 0, longitude: 0 },
      },
      staffName: typeof api.assignedEmployee === 'string' ? api.assignedEmployee : undefined,
      placedAt: createdIso ? new Date(createdIso).getTime() : 0,
    };
  }

  const primaryPayment = api.payments?.[0] ?? api.payment;

  // Helper to get item name with size (raw API / OrderResource)
  const getOrderItemName = (item: any): string => {
    const snapshot = item.menu_item_snapshot;
    const menuItem = item.menu_item;
    const name = snapshot?.name ?? menuItem?.name ?? 'Item';
    const sizeLabel =
      item.menu_item_option_snapshot?.option_label
      ?? item.option_snapshot?.option_label
      ?? item.option?.option_label;
    if (sizeLabel) {
      return `${name} (${sizeLabel})`;
    }

    return name;
  };

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
      name: getOrderItemName(item),
      quantity: Number(item.quantity ?? 1),
      unitPrice: Number(item.unit_price ?? 0),
      sizeId: item.menu_item_option_id,
      sizeLabel:
        item.menu_item_option_snapshot?.option_label
        ?? item.option_snapshot?.option_label
        ?? item.option?.option_label,
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
