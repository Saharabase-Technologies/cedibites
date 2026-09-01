import { useQuery } from '@tanstack/react-query';
import { platformService } from '../services/platform.service';

const staffTokenEnabled = () =>
  typeof window !== 'undefined' && !!localStorage.getItem('cedibites_staff_token');

export const useSystemHealth = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['platform-health'],
    queryFn: () => platformService.getHealth(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    enabled: staffTokenEnabled(),
  });

  return { health: data?.data ?? null, isLoading, error, refetch };
};

export const useSmsHealth = (windowHours = 24) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['platform-sms-health', windowHours],
    queryFn: () => platformService.getSmsHealth(windowHours),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    enabled: staffTokenEnabled(),
  });

  return { sms: data?.data ?? null, isLoading, error, refetch };
};

export const useErrorFeed = (limit = 50, includeAcknowledged = false) => {
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['platform-errors', limit, includeAcknowledged],
    queryFn: () => platformService.getErrors(limit, includeAcknowledged),
    staleTime: 30 * 1000,
    enabled: staffTokenEnabled(),
  });

  return { feed: data?.data ?? null, isLoading, isFetching, error, refetch };
};

export const useFailedJobs = () => {
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['platform-failed-jobs'],
    queryFn: () => platformService.getFailedJobs(),
    staleTime: 30 * 1000,
    enabled: staffTokenEnabled(),
  });

  return {
    jobs: data?.data ?? [],
    // The list is capped at 50; this is the whole backlog.
    total: data?.meta?.total ?? data?.data?.length ?? 0,
    isLoading,
    isFetching,
    error,
    refetch,
  };
};

export const usePlatformAdmins = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['platform-admins'],
    queryFn: () => platformService.getAdmins(),
    staleTime: 60 * 1000,
    enabled: staffTokenEnabled(),
  });

  return { admins: data?.data ?? [], isLoading, error, refetch };
};

export const useActiveSessions = () => {
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['platform-sessions'],
    queryFn: () => platformService.getSessions(),
    // "Who is signed in right now" is a live question, and the answer moves
    // every time somebody touches a till. A stale figure here is worse than no
    // figure, so this one polls rather than waiting to be asked.
    staleTime: 10 * 1000,
    refetchInterval: 20 * 1000,
    enabled: staffTokenEnabled(),
  });

  return {
    sessions: data?.data ?? [],
    meta: data?.meta ?? null,
    isLoading,
    isFetching,
    error,
    refetch,
  };
};
