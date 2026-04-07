import type { Branch as ApiBranch } from '@/types/api';

export type BranchStatus = 'active' | 'inactive';
export type BranchOpenStatus = 'open' | 'closed' | 'busy';

export interface DisplayBranch {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  status: BranchStatus;
  openStatus: BranchOpenStatus;
  managerId: string | null;
  manager: string;
  ordersToday: number;
  revenueToday: number;
  deliveryRadius: number;
  baseDeliveryFee: number;
  perKmFee: number;
  minOrderValue: number;
  orderTypes: { delivery: boolean; pickup: boolean; dineIn: boolean };
  payments: { momo: boolean; cashOnDelivery: boolean; card: boolean; noCharge: boolean };
  hours: Record<string, { open: boolean; from: string; to: string }>;
}

interface OperatingHourData {
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
  manual_override_open?: boolean | null;
  manual_override_at?: string | null;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function defaultHours(): DisplayBranch['hours'] {
  return Object.fromEntries(DAYS.map((d) => [d, { open: true, from: '08:00', to: '20:00' }]));
}

export function mapApiBranchToDisplay(api: ApiBranch, stats?: { today_orders?: number; today_revenue?: number }): DisplayBranch {
  // Map operating hours from API format to frontend format
  const hours: DisplayBranch['hours'] = {};
  const dayMap: Record<string, string> = {
    monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
    friday: 'Fri', saturday: 'Sat', sunday: 'Sun'
  };
  
  if (api.operating_hours) {
    Object.entries(api.operating_hours).forEach(([day, data]: [string, any]) => {
      const shortDay = dayMap[day] || day;
      const hourData = data as OperatingHourData;
      hours[shortDay] = {
        open: hourData.is_open ?? true,
        from: hourData.open_time || '08:00',
        to: hourData.close_time || '20:00',
      };
    });
  } else {
    // Default hours if not provided
    Object.values(dayMap).forEach(day => {
      hours[day] = { open: true, from: '08:00', to: '20:00' };
    });
  }

  // Calculate open status based on current day's operating hours and manual overrides
  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const todayHours = api.operating_hours?.[currentDay] as OperatingHourData | undefined;
  
  let openStatus: BranchOpenStatus = 'closed';
  if (todayHours) {
    // Manual override takes full precedence - admin decision overrides everything
    if (todayHours.manual_override_open !== null && todayHours.manual_override_open !== undefined) {
      openStatus = todayHours.manual_override_open ? 'open' : 'closed';
    } else if (todayHours.is_open) {
      // Check if within scheduled hours
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
      const openTime = todayHours.open_time?.slice(0, 5) || '08:00';
      const closeTime = todayHours.close_time?.slice(0, 5) || '20:00';
      
      if (currentTime >= openTime && currentTime <= closeTime) {
        openStatus = 'open';
      }
    }
  }

  const deliverySettings = api.delivery_settings || {
    delivery_radius_km: 0,
    base_delivery_fee: 0,
    per_km_fee: 0,
    min_order_value: 0,
  };
  const orderTypes = api.order_types || {};
  const paymentMethods = api.payment_methods || {};

  return {
    id: String(api.id),
    name: api.name,
    address: api.address || '',
    phone: api.phone || '',
    email: api.email || api.manager?.email || '',
    status: api.is_active ? 'active' : 'inactive',
    openStatus,
    managerId: api.manager?.id != null ? String(api.manager.id) : null,
    manager: api.manager?.name || '—',
    ordersToday: api.today_orders ?? stats?.today_orders ?? 0,
    revenueToday: api.today_revenue ?? stats?.today_revenue ?? 0,
    deliveryRadius: deliverySettings.delivery_radius_km ?? 0,
    baseDeliveryFee: deliverySettings.base_delivery_fee ?? 0,
    perKmFee: deliverySettings.per_km_fee ?? 0,
    minOrderValue: deliverySettings.min_order_value ?? 0,
    orderTypes: {
      delivery: orderTypes.delivery?.is_enabled ?? true,
      pickup: orderTypes.pickup?.is_enabled ?? true,
      dineIn: orderTypes.dine_in?.is_enabled ?? false,
    },
    payments: {
      momo: paymentMethods.momo?.is_enabled ?? true,
      cashOnDelivery: paymentMethods.cash_on_delivery?.is_enabled ?? true,
      card: paymentMethods.card?.is_enabled ?? false,
      noCharge: paymentMethods.no_charge?.is_enabled ?? false,
    },
    hours,
  };
}
