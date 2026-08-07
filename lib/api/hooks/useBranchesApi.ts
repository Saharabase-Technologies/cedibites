import { useQuery } from '@tanstack/react-query';
import { branchService } from '../services/branch.service';
import type { Branch } from '@/types/api';

export function useBranchesApi() {
  // Check if we have a staff token before making the API call
  const hasStaffToken = typeof window !== 'undefined' && 
    !!localStorage.getItem('cedibites_staff_token');

  const {
    data: branches = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchService.getBranches(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 401 (unauthorized) errors
      if (error?.response?.status === 401) {
        return false;
      }
      return failureCount < 3;
    },
    // Only enable the query if we have a staff token
    enabled: hasStaffToken,
  });

  return {
    branches,
    isLoading,
    error,
    refetch,
  };
}