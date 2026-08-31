import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { stockGateService } from '../services/stockGate.service';

/**
 * Which dishes this till can still make.
 *
 * Refetched on a short interval and after every sale, because the balance moves
 * whenever anyone sells — including the other till. It is still only ever
 * advisory: the server decides at the moment the order is written.
 *
 * A missing key means the option has no recipe, so there is nothing to judge
 * and it is sellable. `isBlocked` encodes that so callers do not have to
 * remember it.
 */
export function useStockGate(branchId?: number, options?: { audience?: 'staff' | 'customer' }) {
    const queryClient = useQueryClient();
    const audience = options?.audience ?? 'staff';

    const { data: sellable = {}, isLoading } = useQuery({
        queryKey: ['stock-gate', audience, branchId],
        queryFn: () => (audience === 'customer'
            ? stockGateService.publicSellableMap(branchId!)
            : stockGateService.sellableMap(branchId!)),
        enabled: !!branchId,
        // Stock moves under the till's feet — a stale map means greying out a
        // dish that is back on, or offering one that has just run out.
        //
        // The customer read is paced slower. A till is worked continuously by one
        // person for a whole shift; a browsing customer is one of many, each on
        // their own tab, all hitting a throttled public route, and being a minute
        // behind on the website costs a refused line at checkout rather than a
        // price said out loud to someone standing at the counter.
        refetchInterval: audience === 'customer' ? 120_000 : 60_000,
        staleTime: audience === 'customer' ? 60_000 : 30_000,
    });

    const isBlocked = useCallback(
        (optionId?: number | string | null): boolean => {
            if (optionId === undefined || optionId === null) return false;
            const key = Number(optionId);
            if (Number.isNaN(key)) return false;
            return sellable[key] === false;
        },
        [sellable],
    );

    const refresh = useCallback(() => {
        void queryClient.invalidateQueries({ queryKey: ['stock-gate', audience, branchId] });
    }, [queryClient, audience, branchId]);

    return { sellable, isBlocked, isLoading, refresh };
}
