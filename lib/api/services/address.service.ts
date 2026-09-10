import apiClient from '../client';

/**
 * The addresses a customer has saved.
 *
 * Every one of these is scoped server-side to the caller's own customer row, so
 * there is no customer id to send and none comes back. See AddressController.
 */

export interface SavedAddress {
  id: number;
  /** What the customer calls it. "Home", "Mum's". Often absent. */
  label: string | null;
  full_address: string;
  note: string | null;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
  created_at: string | null;
}

export interface SaveAddressRequest {
  label?: string | null;
  full_address: string;
  note?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_default?: boolean;
}

export const addressService = {
  list: (): Promise<{ data: SavedAddress[] }> =>
    apiClient.get('/addresses'),

  /**
   * Saves, or updates the row already holding this address.
   *
   * The server matches on the trimmed lowercased text, so calling this after
   * every order does not collect a row per order.
   */
  save: (data: SaveAddressRequest): Promise<{ data: SavedAddress }> =>
    apiClient.post('/addresses', data),

  update: (id: number, data: Partial<SaveAddressRequest>): Promise<{ data: SavedAddress }> =>
    apiClient.patch(`/addresses/${id}`, data),

  remove: (id: number): Promise<{ data: { deleted: boolean } }> =>
    apiClient.delete(`/addresses/${id}`),
};
