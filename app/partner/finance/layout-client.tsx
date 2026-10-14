'use client';

import { FinanceShell } from '@/app/components/finance/FinanceShell';
import BranchScopeSelector from '@/app/components/partner/BranchScopeSelector';
import { usePartnerScope } from '@/app/components/providers/PartnerScopeProvider';

/**
 * The admin's Finance shell, with the portal's own branch chooser in the
 * filter row.
 *
 * The ledger is read whole. The server sends the partner's branches and no
 * others, so Share of sales and Branch against branch compare only those. The
 * branch chosen here, or in the side menu, is the branch filter. The
 * portal's `main` already leaves room at the foot for its phone bar.
 */
export default function PartnerFinanceShell({ children }: { children: React.ReactNode }) {
  const { scope } = usePartnerScope();
  return (
    <FinanceShell basePath="/partner/finance" branch={scope} branchControl={<BranchScopeSelector />} barRoom={false}>
      {children}
    </FinanceShell>
  );
}
