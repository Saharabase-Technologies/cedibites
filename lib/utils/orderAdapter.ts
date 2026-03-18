import type { Order as ApiOrder } from '@/types/api';
import type { Order as UnifiedOrder, OrderItem, OrderStatus } from '@/types/order';
import type { PaymentMethod } from '@/types/order';

function mapApiPaymentMethod(api?: string): PaymentMethod {
  if (api === 'mobile_money') return 'mobile_money';
  if (api === 'cash_delivery' || api === 'cash_pickup') return 'cash';
  if (api === 'card') return 'card';
  if (api === 'no_charge') return 'no_charge';
  return 'cash';
}

function mapApiSource(api?: string): UnifiedOrder['source'] {
  if (api === 'online' || api === 'phone' || api === 'whatsapp' || api === 'pos') return api;
  if (api === 'instagram' || api === 'facebook') return 'social_media';
  return 'online';
}

function deriveSizeKey(item: ApiOrder['items'][0]): string {
  if (item.size_key) return item.size_key;
  const size = item.menu_item_size;
  if (size?.size_key) return size.size_key;
  if (size?.name) return size.name.toLowerCase().replace(/\s+/g, '_');
  return 'default';
}

export function apiOrderToUnifiedOrder(apiOrder: ApiOrder): UnifiedOrder {
  const placedAt = new Date(apiOrder.created_at).getTime();
  const payment = apiOrder.payment ?? apiOrder.payments?.[0];

  const items: OrderItem[] = (apiOrder.items ?? []).map((item) => {
    const sizeKey = deriveSizeKey(item);
    const sizeLabel = sizeKey === 'default' ? 'Regular' : sizeKey.replace(/_/g, ' ');
    return {
      id: String(item.id),
      menuItemId: String(item.menu_item_id),
      name: item.menu_item?.name ?? 'Item',
      quantity: item.quantity,
      unitPrice: Number(item.unit_price) || 0,
      image: item.menu_item?.image_url,
      sizeLabel,
      variantKey: item.variant_key,
      notes: item.special_instructions,
    };
  });

  return {
    id: String(apiOrder.id),
    orderNumber: apiOrder.order_number,
    status: (apiOrder.status ?? 'received') as OrderStatus,
    source: mapApiSource(apiOrder.order_source) ?? 'online',
    fulfillmentType: (apiOrder.order_type ?? 'delivery') as UnifiedOrder['fulfillmentType'],
    paymentMethod: mapApiPaymentMethod(payment?.payment_method),
    isPaid: payment?.payment_status === 'paid' || payment?.payment_status === 'completed',
    paymentStatus: (payment?.payment_status as UnifiedOrder['paymentStatus']) ?? 'pending',
    items,
    subtotal: Number(apiOrder.subtotal) || 0,
    deliveryFee: Number(apiOrder.delivery_fee) ?? 0,
    discount: 0,
    tax: Number(apiOrder.tax_amount ?? apiOrder.tax) || 0,
    total: Number(apiOrder.total_amount ?? apiOrder.total) || 0,
    contact: {
      name: apiOrder.contact_name ?? apiOrder.customer_name ?? '',
      phone: apiOrder.contact_phone ?? apiOrder.customer_phone ?? '',
      address: apiOrder.delivery_address,
      notes: apiOrder.delivery_note ?? apiOrder.special_instructions,
    },
    branch: {
      id: String(apiOrder.branch_id),
      name: apiOrder.branch?.name ?? 'Branch',
      address: apiOrder.branch?.address ?? '',
      phone: apiOrder.branch?.phone ?? '',
      coordinates: {
        latitude: Number(apiOrder.branch?.latitude) || 0,
        longitude: Number(apiOrder.branch?.longitude) || 0,
      },
    },
    placedAt,
    staffId: apiOrder.assigned_employee_id ? String(apiOrder.assigned_employee_id) : undefined,
  };
}
