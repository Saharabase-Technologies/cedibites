'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addressService, type SaveAddressRequest, type SavedAddress } from '../services/address.service';

const KEY = ['addresses'];

/** True when there is a customer token to ask with. A guest has no list. */
function signedIn(): boolean {
    return typeof window !== 'undefined' && !!localStorage.getItem('cedibites_auth_token');
}

/**
 * The customer's saved addresses.
 *
 * Guarded on the token rather than on `isLoggedIn`, so it does not have to wait
 * for AuthProvider to finish restoring the session before it can start. The
 * endpoint is scoped server-side either way.
 */
export function useAddresses() {
    const queryClient = useQueryClient();

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: KEY,
        queryFn: () => addressService.list(),
        enabled: signedIn(),
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: KEY });

    const save = useMutation({
        mutationFn: (payload: SaveAddressRequest) => addressService.save(payload),
        onSuccess: invalidate,
    });

    const update = useMutation({
        mutationFn: ({ id, ...payload }: Partial<SaveAddressRequest> & { id: number }) =>
            addressService.update(id, payload),
        onSuccess: invalidate,
    });

    const remove = useMutation({
        mutationFn: (id: number) => addressService.remove(id),
        onSuccess: invalidate,
    });

    const addresses: SavedAddress[] = data?.data ?? [];

    return {
        addresses,
        defaultAddress: addresses.find(a => a.is_default) ?? addresses[0] ?? null,
        isLoading,
        error,
        refetch,
        saveAddress: save.mutateAsync,
        updateAddress: update.mutateAsync,
        removeAddress: remove.mutateAsync,
        saving: save.isPending || update.isPending,
        removing: remove.isPending,
    };
}
