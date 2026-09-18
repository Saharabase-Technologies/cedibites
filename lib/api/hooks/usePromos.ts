'use client';

import { getPromoService } from '@/lib/services/promos/promo.service';
import { useQuery } from '@tanstack/react-query';

/**
 * The admin promo screens' reads, cached under one key so a save on one screen
 * can refresh the others with a single invalidate of `['promos']`.
 */

export function usePromos() {
    return useQuery({
        queryKey: ['promos'],
        queryFn: () => getPromoService().getAll(),
    });
}

/** One promo with its counts. Resolves to null when it is not there. */
export function usePromo(id: string | undefined) {
    return useQuery({
        queryKey: ['promos', id],
        queryFn: () => getPromoService().getById(id as string),
        enabled: Boolean(id),
    });
}

/** Every one-off code on a promo, and the order that used each. */
export function usePromoCodes(id: string) {
    return useQuery({
        queryKey: ['promos', id, 'codes'],
        queryFn: () => getPromoService().listCodes(id),
    });
}
