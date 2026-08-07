import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { feedbackService } from '../services/feedback.service';
import type { FeedbackFilters, FeedbackStatus } from '@/types/feedback';

/** Triage inbox — gently polled so new reports surface without a manual refresh. */
export const useFeedbackReports = (filters?: FeedbackFilters) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['feedback-reports', filters],
    queryFn: () => feedbackService.getReports(filters),
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });

  return {
    reports: data?.data ?? [],
    meta: data?.meta,
    links: data?.links,
    isLoading,
    error,
    refetch,
  };
};

/** A reporter's own reports — for the my-feedback page (loop-close). */
export const useMyFeedbackReports = (filters?: FeedbackFilters) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-feedback-reports', filters],
    queryFn: () => feedbackService.getMyReports(filters),
    staleTime: 15 * 1000,
  });

  return { reports: data?.data ?? [], meta: data?.meta, isLoading, error };
};

export const useFeedbackReport = (id: number) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['feedback-report', id],
    queryFn: () => feedbackService.getReport(id),
    enabled: Number.isFinite(id) && id > 0,
  });

  return { report: data?.data, isLoading, error, refetch };
};

/** Correlated backend logs. `windowMinutes` switches to the ±window fallback. */
export const useFeedbackLogs = (id: number, windowMinutes?: number) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['feedback-logs', id, windowMinutes ?? 'by-request-id'],
    queryFn: () => feedbackService.getLogs(id, windowMinutes),
    enabled: Number.isFinite(id) && id > 0,
  });

  return { logs: data?.data ?? [], isLoading, error };
};

export const useUpdateFeedbackReport = (id: number) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: { status?: FeedbackStatus; assignee_id?: number | null }) =>
      feedbackService.updateReport(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feedback-report', id] });
      qc.invalidateQueries({ queryKey: ['feedback-reports'] });
    },
  });
};

export const useTranscribeFeedbackReport = (id: number) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => feedbackService.transcribe(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feedback-report', id] }),
  });
};
