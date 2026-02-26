import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cartService } from '../services/cart.service';
import type { AddCartItemRequest, UpdateCartItemRequest } from '../services/cart.service';

export const useCart = () => {
  const queryClient = useQueryClient();

  // Get cart
  const {
    data: cartData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['cart'],
    queryFn: cartService.getCart,
    retry: 1,
    enabled: typeof window !== 'undefined' && !!localStorage.getItem('cedibites_auth_token'),
  });

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: (data: AddCartItemRequest) => cartService.addItem(data),
    onSuccess: (response) => {
      // Update cache with the response data
      queryClient.setQueryData(['cart'], { data: response.data });
    },
  });

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: number; data: UpdateCartItemRequest }) =>
      cartService.updateItem(itemId, data),
    onSuccess: (response) => {
      // Update cache with the response data
      queryClient.setQueryData(['cart'], { data: response.data });
    },
  });

  // Remove item mutation
  const removeItemMutation = useMutation({
    mutationFn: (itemId: number) => cartService.removeItem(itemId),
    onSuccess: (response) => {
      // Update cache with the response data
      queryClient.setQueryData(['cart'], { data: response.data });
    },
  });

  // Clear cart mutation
  const clearCartMutation = useMutation({
    mutationFn: cartService.clearCart,
    onSuccess: () => {
      // Clear the cart cache
      queryClient.setQueryData(['cart'], { data: null });
    },
  });

  return {
    cart: cartData?.data,
    isLoading,
    error,
    addItem: addItemMutation.mutateAsync,
    addItemLoading: addItemMutation.isPending,
    updateItem: updateItemMutation.mutateAsync,
    updateItemLoading: updateItemMutation.isPending,
    removeItem: removeItemMutation.mutateAsync,
    removeItemLoading: removeItemMutation.isPending,
    clearCart: clearCartMutation.mutateAsync,
    clearCartLoading: clearCartMutation.isPending,
  };
};
