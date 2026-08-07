import { useQuery } from '@tanstack/react-query';
import { activityLogService } from '../services/activityLog.service';
import type { ActivityLogsParams } from '@/types/api';

export const useActivityLogs = (params?: ActivityLogsParams) => {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['activity-logs', params],
    queryFn: () => activityLogService.getActivityLogs(params),
    staleTime: 30 * 1000, // 30 seconds
  });

  return {
    entries: data?.data ?? [],
    meta: data?.meta,
    links: data?.links,
    isLoading,
    error,
    refetch,
  };
};

/**
 * Distinct causers for the audit-log "filter by user" dropdown.
 * Optionally narrows by date range so the list stays relevant.
 */
export const useActivityLogCausers = (params?: { date_from?: string; date_to?: string }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['activity-log-causers', params],
    queryFn: () => activityLogService.getActivityLogCausers(params),
    staleTime: 5 * 60 * 1000,
  });

  return { causers: data?.data ?? [], isLoading, error };
};
