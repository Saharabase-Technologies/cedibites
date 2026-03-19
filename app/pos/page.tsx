'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function POSPage() {
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('cedibites-staff-session');
    router.replace(stored ? '/pos/terminal' : '/staff/login');
  }, [router]);

  return null;
}
