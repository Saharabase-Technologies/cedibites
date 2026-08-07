'use client';

/**
 * Invisible bootstrap for the silent-capture layer. Mounted once in the root
 * layout. On mount it installs the console patch, the click trail, and the
 * devtools hook; on every route change it records a navigation breadcrumb.
 *
 * Network + request-id capture need no bootstrap — they live in the shared
 * axios interceptors (lib/api/client.ts). Renders nothing.
 */
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  installConsoleCapture,
  installClickCapture,
  installDevtoolsHook,
  recordNavigation,
} from '@/lib/feedback';

export function FeedbackCapture() {
  const pathname = usePathname();

  useEffect(() => {
    installConsoleCapture();
    installClickCapture();
    installDevtoolsHook();
  }, []);

  useEffect(() => {
    if (pathname) recordNavigation(pathname);
  }, [pathname]);

  return null;
}
