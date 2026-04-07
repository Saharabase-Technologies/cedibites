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
  if (item.option_key) return item.option_key;
  const option = item.menu_item_option;
  if (option?.option_key) return option.option_key;
  if (item.menu_item_option_snapshot?.option_key) return item.menu_item_option_snapshot.option_key;
  return 'default';
}

/**
 * Resolves the best display label for an order item's option.
 *
 * Priority chain:
 *  1. snapshot display_name  (immutable receipt name captured at order time)
 *  2. snapshot option_label  (pill label at order time)
 *  3. live option display_name / option_label
 *  4. human-readable key fallback
 */
function resolveOptionLabel(item: ApiOrder['items'][0], sizeKey: string): string | undefined {
  const snap = item.menu_item_option_snapshot ?? item.option_snapshot;
  const live = item.menu_item_option;

  return snap?.display_name
    ?? snap?.option_label
    ?? live?.display_name
    ?? live?.option_label
    ?? (sizeKey === 'default' ? undefined : sizeKey.replace(/_/g, ' '));
}

export function apiOrderToUnifiedOrder(apiOrder: ApiOrder): UnifiedOrder {
  const placedAt = new Date(apiOrder.created_at).getTime();
  const payment = apiOrder.payment ?? apiOrder.payments?.[0];

  const items: OrderItem[] = (apiOrder.items ?? []).map((item) => {
    const sizeKey = deriveSizeKey(item);
    const displayLabel = resolveOptionLabel(item, sizeKey);
    const itemName = item.menu_item_snapshot?.name ?? item.menu_item?.name ?? 'Item';

    return {
      id: String(item.id),
      menuItemId: String(item.menu_item_id),
      name: itemName,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price) || 0,
      image: item.menu_item_option_snapshot?.image_url
        ?? item.option_snapshot?.image_url
        ?? item.menu_item_option?.image_url
        ?? item.menu_item?.image_url,
      sizeLabel: displayLabel,
      sizeId: item.menu_item_option_id ?? undefined,
      variantKey: item.variant_key,
      notes: item.special_instructions,
      category: item.menu_item?.category?.name ?? item.menu_item?.category as string | undefined,
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
    paymentId: payment?.id ? Number(payment.id) : undefined,
    items,
    subtotal: Number(apiOrder.subtotal) || 0,
    deliveryFee: Number(apiOrder.delivery_fee) ?? 0,
    discount: Number(apiOrder.discount) || 0,
    promoCode: apiOrder.promo_name || undefined,
    tax: Number(apiOrder.tax_amount ?? apiOrder.tax) || 0,
    total: Number(apiOrder.total_amount ?? apiOrder.total) || 0,
    amountPaid: apiOrder.amount_paid != null ? Number(apiOrder.amount_paid) : undefined,
    contact: {
      name: apiOrder.contact_name ?? apiOrder.customer_name ?? '',
      phone: apiOrder.contact_phone ?? apiOrder.customer_phone ?? '',
      address: apiOrder.delivery_address,
      notes: apiOrder.delivery_note ?? apiOrder.special_instructions,
    },
    branch: {
      id: String(apiOrder.branch?.id ?? apiOrder.branch_id),
      name: apiOrder.branch?.name ?? 'Branch',
      address: apiOrder.branch?.address ?? '',
      phone: apiOrder.branch?.phone ?? '',
      coordinates: {
        latitude: Number(apiOrder.branch?.latitude) || 0,
        longitude: Number(apiOrder.branch?.longitude) || 0,
      },
    },
    placedAt,
    cancelRequestedBy: apiOrder.cancel_requested_by_user?.name
      ?? (apiOrder.cancel_requested_by ? `Staff #${apiOrder.cancel_requested_by}` : undefined),
    cancelRequestReason: apiOrder.cancel_request_reason ?? undefined,
    cancelRequestedAt: apiOrder.cancel_requested_at ? new Date(apiOrder.cancel_requested_at).getTime() : undefined,
    staffId: apiOrder.assigned_employee_id ? String(apiOrder.assigned_employee_id) : undefined,
    staffName: apiOrder.assigned_employee?.name ?? apiOrder.staff_name ?? undefined,
  };
}
