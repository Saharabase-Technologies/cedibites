import apiClient from '../client';

/**
 * The admin's branch availability matrix.
 *
 * Availability is the only thing that varies by branch — name, photo, options,
 * category, tags and price are one company-wide value. This replaces the
 * per-item branch dropdown and the `branch-overrides` pair, which resolved a
 * dish at another branch as a *sibling row* and so matched nothing after
 * `menu:unify` merged those siblings away. It reported success while writing
 * nothing.
 *
 * Reads and writes `menu_item_branches` — the same pivot a branch manager's
 * sold-out toggle writes. Two doors, one source of truth.
 */

export interface AvailabilityBranch {
    id: number;
    name: string;
}

export interface AvailabilityItem {
    id: number;
    name: string;
    category: string | null;
    /** False when the dish is withdrawn company-wide — no branch row overrides that. */
    available_everywhere: boolean;
    /** Keyed by branch id (as a string). Absent key = not served at that branch. */
    branches: Record<string, boolean>;
}

export interface AvailabilityMatrix {
    branches: AvailabilityBranch[];
    items: AvailabilityItem[];
}

export const menuBranchAvailabilityService = {
    /** The whole grid in one call, so it paints without firing a request per row. */
    matrix: async (): Promise<AvailabilityMatrix> => {
        // One unwrap. The response interceptor already returns the body, so
        // reading `data.data` here yields undefined — which falls back to an
        // empty grid and looks exactly like "no menu".
        const response = await apiClient.get('/admin/menu-items/branch-availability');
        const body = (response as { data?: AvailabilityMatrix }).data;
        return { branches: body?.branches ?? [], items: body?.items ?? [] };
    },

    /** Serve / stop serving one dish at one branch. */
    setServed: async (menuItemId: number, branchId: number, served: boolean): Promise<void> => {
        await apiClient.patch(`/admin/menu-items/${menuItemId}/branches/${branchId}`, { served });
    },

    /** Serve / stop serving one dish everywhere — the row-level action. */
    setServedEverywhere: async (menuItemId: number, served: boolean): Promise<void> => {
        await apiClient.patch(`/admin/menu-items/${menuItemId}/branches`, { served });
    },
};
