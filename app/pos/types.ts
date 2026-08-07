// POS-specific types (session, cart, view)
// Order types come from @/types/order

export interface POSSession {
  staffId: string;
  branchId: string;
  branchIds: string[];
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
  sizeId?: number;
  variantKey?: string;
}

export interface PaymentDetails {
  method: 'cash' | 'card' | 'momo';
  amountPaid?: number; // For cash - to calculate change
  momoNumber?: string; // For mobile money
  reference?: string;  // Transaction reference
}

export type POSView = 'terminal' | 'orders' | 'settings';
