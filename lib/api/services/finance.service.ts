import apiClient from '../client';
import type { FinanceLedger, FinanceLedgerFilters } from '@/types/finance';

function extractData<T>(response: unknown): T {
  const r = response as { data?: T };
  return (r?.data ?? response) as T;
}

export const financeService = {
  getLedger: (filters?: FinanceLedgerFilters): Promise<FinanceLedger> => {
    return apiClient.get('/admin/finance/ledger', { params: filters }).then(extractData) as Promise<FinanceLedger>;
  },
};
