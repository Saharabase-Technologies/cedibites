'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getEcho } from '@/lib/echo';
import { openingService } from '@/lib/api/services/opening.service';
import type { BranchOpening } from '@/types/opening';

/**
 * Today's opening at one branch.
 *
 * `manager` reads every line, for the person doing the checklist. `staff`
 * reads the status alone, for the till, the kitchen display and the Order
 * Manager waiting on it.
 *
 * Opening a branch fires `branch.access.updated` on the branch channel, so a
 * till unlocks the moment the manager finishes, wherever they finished. The
 * poll is the fallback for a till whose socket has dropped.
 */
export function useBranchOpening(
    branchId: number | null | undefined,
    mode: 'manager' | 'staff',
    { poll = false, enabled = true }: { poll?: boolean; enabled?: boolean } = {},
) {
    const queryClient = useQueryClient();
    const id = branchId ? Number(branchId) : null;

    const query = useQuery<BranchOpening>({
        queryKey: ['opening', id, mode],
        queryFn: () => (mode === 'manager' ? openingService.get(id!) : openingService.status(id!)),
        enabled: enabled && id !== null,
        staleTime: 5_000,
        refetchInterval: poll ? 15_000 : false,
        refetchOnWindowFocus: true,
    });

    useEffect(() => {
        if (!enabled || id === null) return;
        const echo = getEcho();
        if (!echo) return;

        const channel = echo.private(`orders.branch.${id}`);
        const onUpdate = () => {
            queryClient.invalidateQueries({ queryKey: ['opening', id] });
            queryClient.invalidateQueries({ queryKey: ['branches'] });
        };

        channel.listen('.branch.access.updated', onUpdate);

        // Named, so only this listener goes. BranchProvider listens for the
        // same event on the same channel.
        return () => {
            channel.stopListening('.branch.access.updated', onUpdate);
        };
    }, [enabled, id, queryClient]);

    return query;
}
