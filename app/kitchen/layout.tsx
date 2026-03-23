'use client';

import { ReactNode, useEffect } from 'react';
import { KitchenProvider } from './context';
import { KitchenBranchProvider, useSwitchKitchenBranch } from './branch-context';
import { StaffAuthProvider, useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { useBranch } from '@/app/components/providers/BranchProvider';
import BranchSelectPage from '@/app/components/ui/BranchSelectPage';

// ── Gate ─────────────────────────────────────────────────────────────────────

function KitchenGate({ children }: { children: ReactNode }) {
  const { staffUser, isLoading } = useStaffAuth();
  const { branches } = useBranch();
  const { branchId, switchBranch } = useSwitchKitchenBranch();

  const assignedIds: string[] = staffUser
    ? (staffUser.branchIds?.map(String) ?? (staffUser.branchId ? [String(staffUser.branchId)] : []))
    : [];

  // Auto-select when auth resolves and exactly 1 branch is assigned
  useEffect(() => {
    if (isLoading || branchId) return;
    if (assignedIds.length === 1) {
      switchBranch(assignedIds[0]);
    }
  }, [isLoading, assignedIds.length]);  // eslint-disable-line react-hooks/exhaustive-deps

  const selectableBranches = assignedIds.length > 0
    ? branches.filter(b => assignedIds.includes(b.id))
    : branches;

  // Show spinner while auth is loading OR while auto-selecting (1 branch, not yet committed)
  if (isLoading || (assignedIds.length === 1 && !branchId)) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-neutral-light">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!branchId) {
    return (
      <BranchSelectPage
        branches={selectableBranches}
        onSelect={switchBranch}
        subtitle="Choose which branch to display"
      />
    );
  }

  return <>{children}</>;
}

export default function KitchenLayout({ children }: { children: ReactNode }) {
  return (
    <StaffAuthProvider>
      <KitchenBranchProvider>
        <KitchenGate>
          <KitchenProvider>
            <div className="min-h-dvh bg-neutral-light text-text-dark overflow-hidden select-none">
              {children}
            </div>
          </KitchenProvider>
        </KitchenGate>
      </KitchenBranchProvider>
    </StaffAuthProvider>
  );
}
