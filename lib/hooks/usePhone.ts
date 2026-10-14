'use client';

import { useSyncExternalStore } from 'react';

/** Below 640px. The width where `BottomSheet` is a sheet you can drag. */
const PHONE = '(max-width: 639px)';

const onWidth = (notify: () => void) => {
  const query = window.matchMedia(PHONE);
  query.addEventListener('change', notify);
  return () => query.removeEventListener('change', notify);
};

/** Whether the screen is phone width. False on the server. */
export const usePhone = (): boolean => useSyncExternalStore(onWidth, () => window.matchMedia(PHONE).matches, () => false);
