'use client';

import { useEffect } from 'react';
import { loginUrlFor } from '@/lib/utils/loginRedirect';
import { useRouter } from 'next/navigation';

export default function POSPage() {
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('cedibites-staff-session');
    router.replace(stored ? '/pos/terminal' : loginUrlFor('/pos/terminal'));
  }, [router]);

  return null;
}
