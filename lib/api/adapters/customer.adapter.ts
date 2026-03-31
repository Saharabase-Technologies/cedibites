import type { ApiCustomer } from '../services/customer.service';

export type CustomerStatus = 'active' | 'inactive' | 'suspended';
export type AccountType = 'Registered' | 'Guest';

export interface DisplayCustomerOrder {
  id: string;
  branch: string;
  status: string;
  amount: number;
  date: string;
}

export interface DisplayCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  accountType: AccountType;
  status: CustomerStatus;
  totalOrders: number;
  totalSpend: number;
  lastOrderDate: string;
  joinDate: string;
  addresses: string[];
  orders: DisplayCustomerOrder[];
  mostOrderedItem: string;
  avgOrderValue: number;
}

function formatRelativeDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const tz = { timeZone: 'Africa/Accra' };
  if (d.toDateString() === today) return `Today ${d.toLocaleTimeString('en-GB', { ...tz, hour: '2-digit', minute: '2-digit' })}`;
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${d.toLocaleTimeString('en-GB', { ...tz, hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleDateString('en-GB', { ...tz, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function mapApiCustomerToDisplay(api: ApiCustomer, orders?: Array<{ id: number; order_number?: string; branch?: { name: string }; status: string; total_amount: number; created_at: string }>): DisplayCustomer {
  const displayOrders: DisplayCustomerOrder[] = (orders || []).map((o) => ({
    id: String(o.order_number ?? o.id),
    branch: o.branch?.name ?? '—',
    status: o.status,
    amount: Number(o.total_amount),
    date: formatRelativeDate(o.created_at),
  }));

  const avgOrderValue = api.total_orders > 0 ? api.total_spend / api.total_orders : 0;

  return {
    id: api.id,
    name: api.name,
    phone: api.phone,
    email: api.email,
    accountType: api.account_type as AccountType,
    status: (api.status as CustomerStatus) || 'active',
    totalOrders: api.total_orders,
    totalSpend: api.total_spend,
    lastOrderDate: formatRelativeDate(api.last_order_at),
    joinDate: api.join_date,
    addresses: api.addresses || [],
    orders: displayOrders,
    mostOrderedItem: api.most_ordered_item || '—',
    avgOrderValue,
  };
}
