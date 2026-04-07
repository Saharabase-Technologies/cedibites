import { useQuery } from '@tanstack/react-query';
import apiClient from '../client';

interface CheckoutConfig {
  global_operating_hours_open?: string;
  global_operating_hours_close?: string;
}

function parseHour(time: string | undefined | null, fallback: number): number {
  if (!time) return fallback;
  const h = parseInt(time.split(':')[0], 10);
  return isNaN(h) ? fallback : h;
}

export function useGlobalOperatingHours() {
  const { data } = useQuery({
    queryKey: ['checkout-config'],
    queryFn: async () => {
      const res = await apiClient.get('/checkout-config');
      return (res as { data?: CheckoutConfig })?.data;
    },
    staleTime: 30 * 60 * 1000,
  });

  return {
    globalOpenHour: parseHour(data?.global_operating_hours_open, 7),
    globalCloseHour: parseHour(data?.global_operating_hours_close, 22),
  };
}
