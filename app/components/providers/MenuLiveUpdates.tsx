'use client';

import { useMenuLiveUpdates } from '@/lib/api/hooks/useMenuLiveUpdates';

/** Mounts the menu signal listener in a server-rendered layout. Renders nothing. */
export function MenuLiveUpdates() {
    useMenuLiveUpdates();
    return null;
}
