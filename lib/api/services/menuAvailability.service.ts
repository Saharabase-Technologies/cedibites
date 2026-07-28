import apiClient from '../client';

/**
 * "We've run out of Jollof today."
 *
 * The branch manager's only menu power. Every branch is the same institution
 * behind a different till, so the menu, the dish names and every price —
 * including per-branch prices — belong to the Admin. What a manager can do is
 * take a dish off his own branch for the day and put it back.
 *
 * Backed by `menu.availability.manage` + `branch.access`, so the API refuses a
 * branch the caller is not assigned to regardless of what the UI sends.
 */

export interface BranchMenuAvailability {
    id: number;
    name: string;
    category: string | null;
    /** False when the dish is withdrawn company-wide — a branch cannot put that back. */
    available_everywhere: boolean;
    /** False when this branch has marked it sold out today. */
    available_here: boolean;
}

export const menuAvailabilityService = {
    list: async (branchId: number): Promise<BranchMenuAvailability[]> => {
        const response = await apiClient.get(`/manager/branches/${branchId}/menu-availability`);
        const outer = response as { data?: { data?: BranchMenuAvailability[] } };
        return outer?.data?.data ?? (Array.isArray(outer?.data) ? outer.data : []);
    },

    setAvailable: async (
        branchId: number,
        menuItemId: number,
        isAvailable: boolean,
    ): Promise<void> => {
        await apiClient.patch(
            `/manager/branches/${branchId}/menu-availability/${menuItemId}`,
            { is_available: isAvailable },
        );
    },
};
