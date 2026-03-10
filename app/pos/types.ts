// POS Terminal Types

export interface POSSession {
  staffId: string;
  branchId: string;
  staffName: string;
  loginTime: number;
}

export interface POSCartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  notes?: string;
  variantKey?: string;
}

export interface POSOrder {
  id: string;
  items: POSCartItem[];
  subtotal: number;
  total: number;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: 'pending' | 'completed' | 'failed';
  orderType: 'dine_in' | 'takeaway';
  status: 'received' | 'preparing' | 'ready' | 'completed';
  createdAt: Date;
  completedAt?: Date;
}

export type PaymentMethod = 'cash' | 'card' | 'momo';

export interface PaymentDetails {
  method: PaymentMethod;
  amountPaid?: number; // For cash - to calculate change
  momoNumber?: string; // For mobile money
  reference?: string;  // Transaction reference
}

export type POSView = 'terminal' | 'orders' | 'settings';
