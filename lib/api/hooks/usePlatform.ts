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

export const useErrorFeed = (limit = 50) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['platform-errors', limit],
    queryFn: () => platformService.getErrors(limit),
    staleTime: 30 * 1000,
    enabled: staffTokenEnabled(),
  });

  return { feed: data?.data ?? null, isLoading, error, refetch };
};

export const useFailedJobs = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['platform-failed-jobs'],
    queryFn: () => platformService.getFailedJobs(),
    staleTime: 30 * 1000,
    enabled: staffTokenEnabled(),
  });

  return { jobs: data?.data ?? [], isLoading, error, refetch };
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
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['platform-sessions'],
    queryFn: () => platformService.getSessions(),
    staleTime: 30 * 1000,
    enabled: staffTokenEnabled(),
  });

  return { sessions: data?.data ?? [], isLoading, error, refetch };
};
