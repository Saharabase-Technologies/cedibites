import apiClient from '../client';
import type { ActivityLog, ActivityLogCauser, ActivityLogsParams } from '@/types/api';

interface ActivityLogsResponse {
  data: ActivityLog[];
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
  };
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
}

export const activityLogService = {
  getActivityLogs: async (params?: ActivityLogsParams): Promise<ActivityLogsResponse> => {
    const response = await apiClient.get('/admin/activity-logs', {
      params: {
        page: params?.page ?? 1,
        per_page: params?.per_page ?? 20,
        entity: params?.entity,
        severity: params?.severity,
        log_name: params?.log_name,
        subject_type: params?.subject_type,
        event: params?.event,
        causer_id: params?.causer_id,
        date_from: params?.date_from,
        date_to: params?.date_to,
        search: params?.search,
      },
    });
    return response as unknown as ActivityLogsResponse;
  },

  /**
   * List of distinct causers (users) appearing in the activity log,
   * for the "filter by user" dropdown on the audit page.
   */
  getActivityLogCausers: async (params?: { date_from?: string; date_to?: string }): Promise<{ data: ActivityLogCauser[] }> => {
    const response = await apiClient.get('/admin/activity-logs/causers', {
      params: {
        date_from: params?.date_from,
        date_to: params?.date_to,
      },
    });
    return response as unknown as { data: ActivityLogCauser[] };
  },
};
