'use client';

import { useCallback, useState } from 'react';
import { useCart as useApiCart } from '@/lib/api/hooks/useCart';
import { useBranch } from '@/app/components/providers/BranchProvider';
import { useMenuDiscovery } from '@/app/components/providers/MenuDiscoveryProvider';
import type { SearchableItem } from '@/app/components/providers/MenuDiscoveryProvider';
import { toast } from '@/lib/utils/toast';
import type { Order as ApiOrder, OrderItem as ApiOrderItem } from '@/types/api';

type Size = NonNullable<SearchableItem['sizes']>[number];

interface ResolvedLine {
    item: SearchableItem;
    size?: Size;
    quantity: number;
    unitPrice: number;
}

export interface ReorderPlan {
    /** Lines this branch can make today. */
    lines: ResolvedLine[];
    /** Names of lines it cannot, so the customer is told rather than surprised. */
    dropped: string[];
}

function lineName(line: ApiOrderItem): string {
    return (
        line.menu_item_snapshot?.name ??
        line.menu_item?.name ??
        'An item'
    );
}

function optionKeyOf(line: ApiOrderItem): string | undefined {
    return (
        line.menu_item_option_snapshot?.option_key ??
        line.option_snapshot?.option_key ??
        line.menu_item_option?.option_key ??
        undefined
    );
}

/**
 * Putting a past order back in the cart.
 *
 * Three things are deliberately read from today rather than from the order:
 *
 * - The branch. The customer is looking at a header chip that says which
 *   kitchen they are ordering from. Reordering against the branch the old order
 *   was placed at would quietly send it somewhere else.
 * - The price. Prices move. Sending the old unit price either charges the wrong
 *   amount or gets refused by the server.
 * - Whether the dish still exists. `allItems` is already scoped to the selected
 *   branch, so an item that is off the menu there simply will not resolve.
 */
export function useReorder() {
    const { addItem } = useApiCart();
    const { selectedBranch } = useBranch();
    const { allItems, isOptionSoldOut } = useMenuDiscovery();
    const [reorderingId, setReorderingId] = useState<number | null>(null);

    const plan = useCallback((order: ApiOrder): ReorderPlan => {
        const lines: ResolvedLine[] = [];
        const dropped: string[] = [];

        for (const line of order.items ?? []) {
            const item = allItems.find(i => i.id === String(line.menu_item_id));
            if (!item) {
                dropped.push(lineName(line));
                continue;
            }

            let size: Size | undefined;
            if (item.sizes?.length) {
                const key = optionKeyOf(line);
                size =
                    item.sizes.find(s => Number(s.id) === Number(line.menu_item_option_id)) ??
                    (key ? item.sizes.find(s => s.key === key) : undefined) ??
                    (item.sizes.length === 1 ? item.sizes[0] : undefined);

                if (!size) {
                    dropped.push(lineName(line));
                    continue;
                }
                if (isOptionSoldOut(size.id)) {
                    dropped.push(lineName(line));
                    continue;
                }
            }

            lines.push({
                item,
                size,
                quantity: Math.max(1, Number(line.quantity) || 1),
                unitPrice: size?.price ?? item.price ?? 0,
            });
        }

        return { lines, dropped };
    }, [allItems, isOptionSoldOut]);

    const reorder = useCallback(async (order: ApiOrder): Promise<boolean> => {
        if (!selectedBranch) {
            toast.error('Pick a branch first.');
            return false;
        }

        const { lines, dropped } = plan(order);

        if (lines.length === 0) {
            toast.error(`Nothing from that order is on the menu at ${selectedBranch.name} right now.`);
            return false;
        }

        setReorderingId(order.id);
        try {
            // Sequential on purpose. The cart cache is rewritten from each
            // response, so firing these together would race and the last one
            // home would win.
            for (const line of lines) {
                await addItem({
                    branch_id: Number(selectedBranch.id),
                    menu_item_id: Number(line.item.id),
                    menu_item_option_id: line.size?.id ? Number(line.size.id) : undefined,
                    quantity: line.quantity,
                    unit_price: line.unitPrice,
                });
            }

            if (dropped.length > 0) {
                const names = dropped.slice(0, 2).join(' and ');
                const rest = dropped.length > 2 ? ` and ${dropped.length - 2} more` : '';
                toast.success(`Added to your cart. ${names}${rest} could not come along.`);
            } else {
                toast.success('Added to your cart.');
            }
            return true;
        } catch {
            toast.error('Could not add those items. Try again.');
            return false;
        } finally {
            setReorderingId(null);
        }
    }, [selectedBranch, plan, addItem]);

    return { plan, reorder, reorderingId };
}
