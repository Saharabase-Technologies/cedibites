// Base API response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
  };
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
}

// User & Auth types
export interface User {
  id: number;
  name: string;
  phone: string;
  email?: string;
  is_guest: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Branch types
export interface Branch {
  id: number;
  name: string;
  area: string;
  address: string;
  phone: string;
  email?: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
  is_open?: boolean;
  operating_hours?: Record<string, {
    is_open: boolean;
    open_time: string | null;
    close_time: string | null;
  }>;
  delivery_settings?: {
    base_delivery_fee: number;
    per_km_fee: number;
    delivery_radius_km: number;
    min_order_value: number;
    estimated_delivery_time?: string;
  } | null;
  order_types?: Record<string, {
    is_enabled: boolean;
    metadata?: any;
  }>;
  payment_methods?: Record<string, {
    is_enabled: boolean;
    metadata?: any;
  }>;
  manager?: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
  } | null;
  today_orders?: number;
  today_revenue?: number;
  menu_items?: MenuItem[];
  created_at: string;
  updated_at: string;
}

// Menu types
export interface MenuCategory {
  id: number;
  name: string;
  description?: string;
  display_order: number;
  is_active: boolean;
}

export interface MenuItemSize {
  id: number;
  menu_item_id: number;
  size_key: string;
  size_label: string;
  price: number;
  is_available: boolean;
}

export interface MenuItem {
  id: number;
  branch_id?: number;
  slug?: string;
  name: string;
  description: string;
  category_id: number;
  category?: MenuCategory;
  base_price: number;
  has_variants: boolean;
  variant_type?: string;
  is_popular: boolean;
  is_new: boolean;
  is_available: boolean;
  image_url?: string;
  sizes?: MenuItemSize[];
  created_at: string;
  updated_at: string;
}

// Cart types
export interface CartItem {
  id: number;
  cart_id: number;
  menu_item_id: number;
  menu_item: MenuItem;
  quantity: number;
  size_key?: string;
  variant_key?: string;
  unit_price: number;
  subtotal: number;
  special_instructions?: string;
}

export interface Cart {
  id: number;
  customer_id: number;
  branch_id: number;
  branch?: Branch;
  items: CartItem[];
  subtotal: number;
  created_at: string;
  updated_at: string;
}

// Order types
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'received'
  | 'preparing'
  | 'ready'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export type OrderType = 'delivery' | 'pickup';

export type PaymentMethod = 'mobile_money' | 'cash';

export type PaymentStatus = 'pending' | 'paid' | 'completed' | 'failed' | 'refunded';

export interface OrderItem {
  id: number;
  order_id: number;
  menu_item_id: number;
  menu_item: MenuItem;
  menu_item_size?: { size_key?: string; name?: string };
  quantity: number;
  size_key?: string;
  variant_key?: string;
  unit_price: number;
  subtotal: number;
  special_instructions?: string;
}

export interface Payment {
  id: number;
  order_id: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  amount: number;
  transaction_id?: string;
  momo_number?: string;
  momo_network?: string;
  paid_at?: string;
}

export interface Order {
  id: number;
  order_number: string;
  customer_id: number;
  customer?: User;
  branch_id: number;
  branch?: Branch;
  assigned_employee_id?: number | null;
  order_type: OrderType;
  order_source?: string;
  status: OrderStatus;
  items: OrderItem[];
  payment?: Payment;
  payments?: Payment[];
  subtotal: number;
  delivery_fee: number;
  tax?: number;
  tax_amount?: number;
  total?: number;
  total_amount?: number;
  customer_name?: string;
  contact_name?: string;
  customer_phone?: string;
  contact_phone?: string;
  delivery_address?: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  special_instructions?: string;
  delivery_note?: string;
  estimated_ready_time?: string;
  estimated_delivery_time?: string;
  amount_paid?: number;
  discount?: number;
  staff_name?: string;
  created_at: string;
  updated_at: string;
}

// Activity Log types (admin audit)
export type ActivityLogSeverity = 'info' | 'warning' | 'destructive';
export type ActivityLogEntity = 'order' | 'staff' | 'branch' | 'menu' | 'customer' | 'system';

export interface ActivityLogCauser {
  id: number;
  name: string;
  email: string | null;
}

export interface ActivityLog {
  id: number;
  log_name: string;
  description: string;
  event: string | null;
  subject_type: string | null;
  subject_id: number | null;
  causer: ActivityLogCauser | null;
  properties: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
  entity: ActivityLogEntity;
  severity: ActivityLogSeverity;
}

export interface ActivityLogsParams {
  page?: number;
  per_page?: number;
  entity?: ActivityLogEntity | 'auth';
  severity?: ActivityLogSeverity;
  log_name?: string;
  subject_type?: string;
  event?: string;
  causer_id?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
}

// Notification types
export interface Notification {
  id: string;
  type: string;
  data: {
    title: string;
    message: string;
    order_id?: number;
    order_number?: string;
    action_url?: string;
  };
  read_at?: string;
  created_at: string;
}
