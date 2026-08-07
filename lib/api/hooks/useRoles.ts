import { useQuery } from '@tanstack/react-query';
import { roleService, type Role, type Permission } from '../services/role.service';

export function useRoles() {
  // Check if we have a staff token before making the API call
  const hasStaffToken = typeof window !== 'undefined' && 
    !!localStorage.getItem('cedibites_staff_token');

  const {
    data: roles = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['roles'],
    queryFn: roleService.getRoles,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    // Only enable the query if we have a staff token
    enabled: hasStaffToken,
  });

  return {
    roles,
    isLoading,
    error,
    refetch,
  };
}

export function usePermissions() {
  // Check if we have a staff token before making the API call
  const hasStaffToken = typeof window !== 'undefined' && 
    !!localStorage.getItem('cedibites_staff_token');

  const {
    data: permissions = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['permissions'],
    queryFn: roleService.getPermissions,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    // Only enable the query if we have a staff token
    enabled: hasStaffToken,
  });

  return {
    permissions,
    isLoading,
    error,
    refetch,
  };
}