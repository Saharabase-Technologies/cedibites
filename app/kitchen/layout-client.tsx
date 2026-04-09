'use client';

import { ReactNode, useEffect } from 'react';
import { KitchenProvider } from './context';
import { KitchenBranchProvider, useSwitchKitchenBranch } from './branch-context';
import { StaffAuthProvider, useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { useBranch } from '@/app/components/providers/BranchProvider';
import BranchSelectPage from '@/app/components/ui/BranchSelectPage';
import { WarningCircleIcon, StorefrontIcon, SignOutIcon } from '@phosphor-icons/react';

// ── Gate ─────────────────────────────────────────────────────────────────────

function KitchenGate({ children }: { children: ReactNode }) {
  const { staffUser, isLoading, logout } = useStaffAuth();
  const { branchId, switchBranch } = useSwitchKitchenBranch();
  const { branches: allBranches } = useBranch();

  const assignedIds: string[] = staffUser?.branches.map(b => b.id) ?? [];
  const isAdmin = staffUser?.role === 'admin' || staffUser?.role === 'tech_admin';

  // Auto-select when auth resolves and exactly 1 branch is assigned
  useEffect(() => {
    if (isLoading || branchId) return;
    if (assignedIds.length === 1) {
      switchBranch(assignedIds[0]);
    }
  }, [isLoading, assignedIds.length]);  // eslint-disable-line react-hooks/exhaustive-deps

  const selectableBranches = staffUser?.branches ?? [];

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

  // Guard: branch is closed or inactive — admin/tech_admin bypass, extended access bypass
  const branchInfo = allBranches.find(b => b.id === branchId);
  if (!isAdmin && branchInfo && (!branchInfo.isActive || (!branchInfo.isOpen && !branchInfo.staffAccessAllowed))) {
    const isInactive = !branchInfo.isActive;
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gray-950 p-6">
        <div className="max-w-md w-full bg-gray-900 rounded-3xl shadow-lg p-8 flex flex-col items-center gap-5 text-center border border-white/10">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <WarningCircleIcon weight="fill" size={36} className="text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {isInactive ? 'Branch Inactive' : 'Branch Closed'}
            </h2>
            <p className="text-sm text-white/50 mt-2">
              {isInactive
                ? `${branchInfo.name} is currently inactive. Contact an administrator.`
                : `${branchInfo.name} is currently closed. Kitchen display is unavailable outside operating hours.`}
            </p>
          </div>
          {selectableBranches.length > 1 && (
            <button
              onClick={() => switchBranch('')}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-3 rounded-2xl transition-all active:scale-[0.98]"
            >
              <StorefrontIcon weight="fill" size={18} />
              Switch Branch
            </button>
          )}
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 text-sm font-semibold text-white/40 hover:text-red-400 transition-colors"
          >
            <SignOutIcon weight="bold" size={16} />
            Sign Out
          </button>
        </div>
      </div>
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
