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
  branch_id?: number;
  name: string;
  slug?: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  items_count?: number;
}

export interface MenuItemOptionBranchPrice {
  branch_id: number;
  price: number | null;
  is_available: boolean | null;
}

export interface MenuItemOption {
  id: number;
  menu_item_id: number;
  option_key: string;
  option_label: string;
  /** Full descriptive label for orders, receipts, and analytics. Falls back to option_label when null. */
  display_name?: string | null;
  /** Resolved price for the current branch context (branch override ?? base price) */
  price: number;
  /** Always the admin-set global base price, never overridden */
  base_price?: number;
  is_available: boolean;
  image_url?: string | null;
  thumbnail_url?: string | null;
  branch_prices?: MenuItemOptionBranchPrice[];
}

export interface MenuTag {
  id: number;
  slug: string;
  name: string;
  display_order: number;
  is_active: boolean;
  rule_description?: string | null;
}

export interface MenuAddOn {
  id: number;
  branch_id: number;
  slug: string;
  name: string;
  price: number;
  is_per_piece: boolean;
  is_active: boolean;
}

export interface MenuItem {
  id: number;
  branch_id?: number;
  slug?: string;
  name: string;
  description: string;
  category_id: number;
  category?: MenuCategory;
  is_available: boolean;
  rating?: number | null;
  rating_count?: number;
  image_url?: string;
  thumbnail_url?: string;
  options?: MenuItemOption[];
  tags?: MenuTag[];
  add_ons?: MenuAddOn[];
  created_at: string;
  updated_at: string;
}

// Smart category types (code-defined virtual categories with computed membership)
export interface SmartCategory {
  slug: string;
  name: string;
  icon: string;
  item_ids: number[];
}

export interface SmartCategorySetting {
  id: number;
  slug: string;
  name: string;
  icon: string;
  is_enabled: boolean;
  display_order: number;
  item_limit: number;
  is_time_based: boolean;
  requires_customer: boolean;
  visible_hour_start: number | null;
  visible_hour_end: number | null;
  default_visible_hour_start: number | null;
  default_visible_hour_end: number | null;
  default_item_limit: number;
}

export interface SmartCategoryPreview {
  slug: string;
  branch_id: number;
  item_count: number;
  items: Array<{
    id: number;
    name: string;
    category: string | null;
    rating: number | null;
    is_available: boolean;
  }>;
}

// Cart types
export interface CartItem {
  id: number;
  cart_id: number;
  menu_item_id: number;
  menu_item: MenuItem;
  quantity: number;
  menu_item_option_id?: number | null;
  menu_item_option?: MenuItemOption | null;
  menu_item_option_snapshot?: {
    id: number;
    option_key: string;
    option_label: string;
    price: number;
    image_url?: string | null;
  } | null;
  option_key?: string;
  option_label?: string;
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
  | 'cancel_requested'
  | 'cancelled';

export type OrderType = 'delivery' | 'pickup';

export type PaymentMethod = 'mobile_money' | 'cash' | 'card' | 'manual_momo' | 'no_charge' | 'wallet' | 'ghqr';

export type PaymentStatus = 'pending' | 'paid' | 'completed' | 'failed' | 'refunded' | 'no_charge';

export type CheckoutSessionStatus =
  | 'pending'
  | 'payment_initiated'
  | 'confirmed'
  | 'failed'
  | 'expired'
  | 'abandoned';

export interface CheckoutSession {
  id: number;
  session_token: string;
  branch_id: number;
  branch?: Branch;
  session_type: 'online' | 'pos';
  status: CheckoutSessionStatus;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  order_type?: OrderType;
  delivery_address?: string;
  special_instructions?: string;
  items: CheckoutSessionItem[];
  subtotal: number;
  delivery_fee: number;
  service_charge: number;
  total_amount: number;
  payment_method?: PaymentMethod;
  momo_number?: string;
  checkout_url?: string | null;
  order_id?: number | null;
  order?: Order | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
  failure_reason?: string | null;
  // Recovery flags from show() endpoint
  can_retry?: boolean;
  can_change_payment?: boolean;
  can_change_number?: boolean;
}

export interface CheckoutSessionItem {
  menu_item_id: number;
  menu_item_option_id?: number | null;
  name?: string;
  option_label?: string;
  quantity: number;
  unit_price: number;
  subtotal?: number;
  /** Raw snapshot from backend — name lives here for POS sessions. */
  menu_item_snapshot?: { id?: number; name?: string; description?: string | null } | null;
  menu_item_option_snapshot?: {
    id?: number;
    option_key?: string;
    option_label?: string;
    display_name?: string;
    price?: number;
  } | null;
}

export interface OrderItem {
  id: number;
  order_id: number;
  menu_item_id: number;
  /** Point-in-time menu fields from order_items.menu_item_snapshot */
  menu_item_snapshot?: { id?: number; name?: string; description?: string | null } | null;
  menu_item: MenuItem;
  menu_item_option_id?: number | null;
  menu_item_option?: MenuItemOption | null;
  menu_item_option_snapshot?: {
    id: number;
    option_key: string;
    option_label: string;
    display_name?: string | null;
    price: number;
    image_url?: string | null;
  } | null;
  /** Raw snapshot from OrderResource — includes image_url */
  option_snapshot?: {
    id: number;
    option_key: string;
    option_label: string;
    display_name?: string | null;
    price: number;
    image_url?: string | null;
  } | null;
  quantity: number;
  option_key?: string;
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
  assigned_employee?: { id: number; name?: string | null; phone?: string | null } | null;
  order_type: OrderType;
  order_source?: string;
  status: OrderStatus;
  items: OrderItem[];
  payment?: Payment;
  payments?: Payment[];
  subtotal: number;
  delivery_fee: number;
  service_charge?: number;
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
  promo_id?: number;
  promo_name?: string;
  staff_name?: string;
  cancel_requested_by?: number | null;
  cancel_request_reason?: string | null;
  cancel_requested_at?: string | null;
  cancel_requested_by_user?: { id: number; name?: string | null } | null;
  recorded_at?: string;
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
