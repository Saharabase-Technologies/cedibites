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
  latitude: number;
  longitude: number;
  is_active: boolean;
  operating_hours: string;
  delivery_fee: number;
  delivery_radius_km: number;
  estimated_delivery_time: string;
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
  | 'preparing'
  | 'ready'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export type OrderType = 'delivery' | 'pickup';

export type PaymentMethod = 'momo' | 'cash_delivery' | 'cash_pickup';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface OrderItem {
  id: number;
  order_id: number;
  menu_item_id: number;
  menu_item: MenuItem;
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
  transaction_reference?: string;
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
  order_type: OrderType;
  status: OrderStatus;
  items: OrderItem[];
  payment?: Payment;
  subtotal: number;
  delivery_fee: number;
  tax: number;
  total: number;
  customer_name: string;
  customer_phone: string;
  delivery_address?: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  special_instructions?: string;
  estimated_ready_time?: string;
  estimated_delivery_time?: string;
  created_at: string;
  updated_at: string;
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
