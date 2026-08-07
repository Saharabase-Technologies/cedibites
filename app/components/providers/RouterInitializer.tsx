'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setNavigationRouter } from '@/lib/navigation';

export function RouterInitializer() {
  const router = useRouter();

  useEffect(() => {
    setNavigationRouter(router);
  }, [router]);

  return null;
}
