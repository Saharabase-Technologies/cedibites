'use client';

/**
 * Ask whether a source location can actually cover a set of lines, while the
 * form is still being filled in.
 *
 * The check already existed but only fired at submit, so a branch wrote out a
 * whole requisition before learning the warehouse was short. Enabled only once
 * there is something real to ask about, and it rides the same realtime
 * invalidation as everything else, so the answer moves when stock moves.
 */

import { useQuery } from '@tanstack/react-query';
import { checkStockAvailability } from '../../services/inventory/transfers.service';
import type { StockAvailability } from '@/types/inventory';

export function useStockAvailability(
  locationId: number | null,
  items: { item_id: number; qty: number }[],
) {
  const usable = items.filter((i) => i.item_id > 0 && i.qty > 0);

  return useQuery<StockAvailability>({
    // Keyed on the demand itself, so editing a quantity re-asks.
    queryKey: ['inventory', 'stock-availability', locationId, usable],
    queryFn: () => checkStockAvailability(locationId!, usable),
    enabled: locationId !== null && locationId > 0 && usable.length > 0,
    staleTime: 0,
  });
}
