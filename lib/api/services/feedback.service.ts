import apiClient from '../client';
import type {
  FeedbackFilters,
  FeedbackReportDetail,
  FeedbackReportListItem,
  FeedbackStatus,
  RequestLogLine,
} from '@/types/feedback';
import type { ApiResponse, PaginatedResponse } from '@/types/api';

/**
 * Triage-side API. The axios interceptor already unwraps to `response.data`, so
 * these return the JSON envelope the backend sends.
 */
export const feedbackService = {
  getReports: (params?: FeedbackFilters) =>
    apiClient.get('/feedback/reports', { params }) as unknown as Promise<
      PaginatedResponse<FeedbackReportListItem>
    >,

  getMyReports: (params?: FeedbackFilters) =>
    apiClient.get('/feedback/my-reports', { params }) as unknown as Promise<
      PaginatedResponse<FeedbackReportListItem>
    >,

  getReport: (id: number) =>
    apiClient.get(`/feedback/reports/${id}`) as unknown as Promise<
      ApiResponse<FeedbackReportDetail>
    >,

  updateReport: (id: number, body: { status?: FeedbackStatus; assignee_id?: number | null }) =>
    apiClient.patch(`/feedback/reports/${id}`, body) as unknown as Promise<
      ApiResponse<FeedbackReportDetail>
    >,

  getLogs: (id: number, windowMinutes?: number) =>
    apiClient.get(`/feedback/reports/${id}/logs`, {
      params: windowMinutes ? { windowMinutes } : {},
    }) as unknown as Promise<ApiResponse<RequestLogLine[]>>,

  transcribe: (id: number) =>
    apiClient.post(`/feedback/reports/${id}/transcribe`) as unknown as Promise<
      ApiResponse<FeedbackReportDetail>
    >,

  exportReport: (id: number, fmt: 'md' | 'zip') =>
    apiClient.get(`/feedback/reports/${id}/export`, {
      params: { fmt },
      responseType: 'blob',
    }) as unknown as Promise<Blob>,
};

