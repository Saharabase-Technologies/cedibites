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
 * Resolves a display name for a combo item by baking the chosen option label
 * into the shared menu item name.
 *
 * e.g. "Fried Rice / Noodles + 3 Drums" + "Fried Rice" → "Fried Rice + 3 Drums"
 *
 * If the name has no "/" (no variants), it is returned unchanged.
 */
export function resolveDisplayName(rawName: string, optionLabel?: string): string {
  if (!optionLabel || !rawName.includes('/')) return rawName;
  const afterSlash = rawName.substring(rawName.indexOf('/') + 1).trim();
  // Shared suffix starts at the first " +" / " -" / " ," after the trailing variant word
  const sharedStart = afterSlash.search(/\s+[+\-,]/);
  const suffix = sharedStart >= 0 ? afterSlash.substring(sharedStart) : '';
  return suffix ? optionLabel + suffix : optionLabel;
}

export function apiOrderToUnifiedOrder(apiOrder: ApiOrder): UnifiedOrder {
  const placedAt = new Date(apiOrder.created_at).getTime();
  const payment = apiOrder.payment ?? apiOrder.payments?.[0];

  const items: OrderItem[] = (apiOrder.items ?? []).map((item) => {
    const sizeKey = deriveSizeKey(item);
    const optionLabel = item.menu_item_option_snapshot?.option_label
      ?? item.menu_item_option?.option_label
      ?? (sizeKey === 'default' ? undefined : sizeKey.replace(/_/g, ' '));

    const rawName = item.menu_item_snapshot?.name ?? item.menu_item?.name ?? 'Item';
    const resolvedName = resolveDisplayName(rawName, optionLabel);
    const variantBakedIn = resolvedName !== rawName;

    return {
      id: String(item.id),
      menuItemId: String(item.menu_item_id),
      name: resolvedName,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price) || 0,
      image: item.menu_item_option_snapshot?.image_url ?? item.menu_item_option?.image_url ?? item.menu_item?.image_url,
      // If the option was baked into the name (combo item), don't repeat it as sizeLabel
      sizeLabel: variantBakedIn ? undefined : (optionLabel ?? 'Regular'),
      sizeId: item.menu_item_option_id ?? undefined,
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
    paymentId: payment?.id ? Number(payment.id) : undefined,
    items,
    subtotal: Number(apiOrder.subtotal) || 0,
    deliveryFee: Number(apiOrder.delivery_fee) ?? 0,
    discount: Number(apiOrder.discount) || 0,
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
    staffId: apiOrder.assigned_employee_id ? String(apiOrder.assigned_employee_id) : undefined,
    staffName: apiOrder.assigned_employee?.name ?? apiOrder.staff_name ?? undefined,
  };
}
