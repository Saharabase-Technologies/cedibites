import { useQuery } from '@tanstack/react-query';
import { branchService } from '../services/branch.service';

export const useBranches = () => {
  const {
    data: branchesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['branches'],
    queryFn: branchService.getBranches,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Backend returns { data: [...] } structure
  return {
    branches: branchesData?.data || [],
    isLoading,
    error,
    refetch,
  };
};

export const useBranch = (id: number) => {
  const {
    data: branchData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['branch', id],
    queryFn: () => branchService.getBranch(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    branch: branchData?.data,
    isLoading,
    error,
  };
};
