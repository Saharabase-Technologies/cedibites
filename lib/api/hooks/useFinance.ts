import { useQuery } from '@tanstack/react-query';
import { financeService } from '../services/finance.service';
import type { FinanceLedger, FinanceLedgerFilters } from '@/types/finance';

/** Stable query-key fragment for the current branch scope. */
function branchKey(filters: FinanceLedgerFilters): string | number | undefined {
  if (filters.branch_ids && filters.branch_ids.length > 0) return filters.branch_ids.join(',');
  return filters.branch_id;
}

/**
 * The Finance ledger for a date range and a branch scope. One read feeds all
 * three tabs: the figures are worked out from its rows on the screen.
 * `branch_ids` takes precedence over `branch_id` when non-empty.
 */
export const useFinanceLedger = (filters: FinanceLedgerFilters = {}) => {
  const { from, to, branch_id, branch_ids } = filters;
  const params: FinanceLedgerFilters = {};
  if (from) params.from = from;
  if (to) params.to = to;
  if (branch_ids && branch_ids.length > 0) params.branch_ids = branch_ids;
  else if (branch_id) params.branch_id = branch_id;

  return useQuery<FinanceLedger>({
    queryKey: ['finance', 'ledger', from, to, branchKey(params)],
    queryFn: () => financeService.getLedger(params),
    staleTime: 60 * 1000,
  });
};
