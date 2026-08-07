import apiClient from '../client';
import { Cart } from '@/types/api';

export interface AddCartItemRequest {
  branch_id: number;
  menu_item_id: number;
  menu_item_option_id?: number;
  quantity: number;
  unit_price: number;
  special_instructions?: string;
}

export interface UpdateCartItemRequest {
  quantity: number;
  special_instructions?: string;
}

export const cartService = {
  /**
   * Get customer's cart
   */
  getCart: (): Promise<{ data: Cart | null }> => {
    return apiClient.get('/cart');
  },

  /**
   * Add item to cart
   */
  addItem: (data: AddCartItemRequest): Promise<{ data: Cart }> => {
    return apiClient.post('/cart/items', data);
  },

  /**
   * Update cart item quantity
   */
  updateItem: (
    itemId: number,
    data: UpdateCartItemRequest
  ): Promise<{ data: Cart }> => {
    return apiClient.patch(`/cart/items/${itemId}`, data);
  },

  /**
   * Remove item from cart
   */
  removeItem: (itemId: number): Promise<{ data: Cart | null }> => {
    return apiClient.delete(`/cart/items/${itemId}`);
  },

  /**
   * Clear entire cart
   */
  clearCart: (): Promise<{ data: null }> => {
    return apiClient.delete('/cart/clear');
  },

  /**
   * Claim guest cart for authenticated customer (call after login)
   */
  claimGuestCart: (guestSessionId: string): Promise<{ data: Cart | null }> => {
    return apiClient.post('/cart/claim-guest', { guest_session_id: guestSessionId });
  },
};
