import apiClient from '@/lib/api/client';
import type { Order as ApiOrder } from '@/types/api';
import type { Order, OrderFilter, OrderStatus, CreateOrderInput } from '@/types/order';
import { apiOrderToUnifiedOrder } from '@/lib/utils/orderAdapter';
import type { OrderService } from './order.service';
import { getStaffToken } from '@/lib/api/services/staff.service';

const POLL_INTERVAL_MS = 8000;

/** Map unified status to API status (backend has no 'accepted', maps to 'preparing') */
function toApiStatus(status: OrderStatus): string {
  if (status === 'accepted') return 'preparing';
  if (status === 'cancel_requested') return 'cancelled';
  return status;
}

function extractData<T>(response: unknown): T {
  const r = response as { data?: T };
  return (r?.data ?? response) as T;
}

export class ApiOrderService implements OrderService {
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  async getAll(filter?: OrderFilter): Promise<Order[]> {
    try {
      // Determine which endpoint to use based on current route
      let endpoint = '/employee/orders';
      
      if (typeof window !== 'undefined') {
        const pathname = window.location.pathname;
        
        // Kitchen uses public endpoint
        if (pathname.startsWith('/kitchen')) {
          endpoint = '/kitchen/orders';
        }
        // Order Manager uses public endpoint
        else if (pathname.startsWith('/order-manager')) {
          endpoint = '/order-manager/orders';
        }
        // Customer routes (home, menu, checkout, etc.) don't load orders
        else if (!pathname.startsWith('/staff') &&
                 !pathname.startsWith('/admin') &&
                 !pathname.startsWith('/partner') &&
                 !pathname.startsWith('/pos')) {
          return [];
        }
      }
      
      const params: Record<string, string | number | string[] | undefined> = {
        per_page: 200,
      };
      if (filter?.branchId) params.branch_id = filter.branchId;
      if (filter?.branchName) params.branch_name = filter.branchName;
      if (filter?.staffId) params.staff_id = filter.staffId;
      if (filter?.status?.length) params.status = filter.status;
      if (filter?.fulfillmentType?.length) params.order_type = filter.fulfillmentType;
      if (filter?.source?.length) params.order_source = filter.source;
      if (filter?.contactPhone) params.contact_phone = filter.contactPhone;
      if (filter?.dateFrom) params.date_from = new Date(filter.dateFrom).toISOString().slice(0, 10);
      if (filter?.dateTo) params.date_to = new Date(filter.dateTo).toISOString().slice(0, 10);
      if (filter?.search) params.search = filter.search;

      const response = await apiClient.get(endpoint, { params });
      const payload = extractData<{ data?: ApiOrder[] }>(response);
      const list = payload?.data ?? (Array.isArray(payload) ? payload : []);
      return (list as ApiOrder[]).map(apiOrderToUnifiedOrder);
    } catch (error: any) {
      console.error('Failed to load orders:', error);
      return [];
    }
  }

  async getById(id: string): Promise<Order | null> {
    try {
      const isNumeric = /^\d+$/.test(id);
      const url = isNumeric ? `/orders/${id}` : `/orders/by-number/${encodeURIComponent(id)}`;
      const response = await apiClient.get(url);
      const apiOrder = extractData<ApiOrder>(response);
      if (!apiOrder?.id) return null;
      return apiOrderToUnifiedOrder(apiOrder);
    } catch {
      return null;
    }
  }

  async create(input: CreateOrderInput): Promise<Order> {
    const paymentMethodMap: Record<string, string> = {
      'momo': 'mobile_money',
      'cash': 'cash',
      'card': 'card',
      'no_charge': 'wallet',
    };

    const fulfillmentTypeMap: Record<string, string> = {
      'delivery': 'takeaway',
      'pickup': 'takeaway',
      'dine_in': 'dine_in',
      'takeaway': 'takeaway',
    };

    const requestBody = {
      branch_id: parseInt(input.branchId),
      fulfillment_type: fulfillmentTypeMap[input.fulfillmentType] || 'takeaway',
      payment_method: paymentMethodMap[input.paymentMethod] || input.paymentMethod,
      items: input.items.map(item => {
        const menuItemId = parseInt(item.menuItemId);
        if (isNaN(menuItemId)) {
          throw new Error(`Invalid menu item ID: ${item.menuItemId}`);
        }
        const itemData: Record<string, unknown> = {
          menu_item_id: menuItemId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
        };
        if (item.sizeId) itemData.menu_item_size_id = item.sizeId;
        if (item.variantKey) itemData.variant_key = item.variantKey;
        return itemData;
      }),
      contact_name: input.contact.name,
      contact_phone: input.contact.phone || 'N/A',
      customer_notes: input.contact.notes || undefined,
      amount_paid: input.amountPaid,
      momo_number: input.momoNumber,
      discount: input.discount,
    };

    const response = await apiClient.post('/pos/orders', requestBody);
    const apiOrder = extractData<ApiOrder>(response as unknown);
    return apiOrderToUnifiedOrder(apiOrder);
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    _timestamps?: Partial<Pick<Order, 'acceptedAt' | 'startedAt' | 'readyAt' | 'completedAt'>>
  ): Promise<Order> {
    const response = await apiClient.patch(`/employee/orders/${id}/status`, {
      status: toApiStatus(status),
    });
    const apiOrder = extractData<ApiOrder>(response);
    return apiOrderToUnifiedOrder(apiOrder);
  }

  async update(id: string, patch: Partial<Order>): Promise<Order> {
    const body: Record<string, unknown> = {};
    if (patch.status != null) body.status = toApiStatus(patch.status);
    if (patch.contact != null) {
      body.contact_name = patch.contact.name;
      body.contact_phone = patch.contact.phone;
      body.delivery_address = patch.contact.address;
      body.delivery_note = patch.contact.notes;
    }
    const response = await apiClient.patch(`/orders/${id}`, body);
    const apiOrder = extractData<ApiOrder>(response);
    return apiOrderToUnifiedOrder(apiOrder);
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/orders/${id}`);
  }

  subscribe(callback: (orders: Order[]) => void): () => void {
    this.pollTimer = setInterval(async () => {
      if (!getStaffToken()) return;
      try {
        const orders = await this.getAll();
        callback(orders);
      } catch {
        // ignore
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
    };
  }
}
