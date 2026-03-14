// ─── Branch Service Interface ────────────────────────────────────────────────
// Swap MockBranchService → ApiBranchService when backend is ready.

import type { Branch } from '@/types/branch';
import { MockBranchService } from './branch.service.mock';

export interface BranchService {
    getAll(): Promise<Branch[]>;
    getById(id: string): Promise<Branch | null>;
    getByName(name: string): Promise<Branch | null>;
    getMenuItemIds(branchId: string): Promise<string[]>;
    isItemAvailable(itemId: string, branchId: string): Promise<boolean>;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

let _instance: BranchService | null = null;

export function getBranchService(): BranchService {
    if (!_instance) {
        _instance = new MockBranchService();
    }
    return _instance;
}
