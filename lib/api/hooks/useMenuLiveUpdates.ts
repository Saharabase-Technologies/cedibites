'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getPublicEcho } from '@/lib/echo';

/** Every query that shows a price or a dish name. */
const MENU_KEYS = [
    'menu-items',
    'menu-item',
    'admin-menu-items',
    'admin-menu-prices',
    'menu-categories',
    'smart-categories',
    'cart',
];

/**
 * Reload the menu the moment new prices go live, or are put back.
 *
 * Without this a till keeps the menu it loaded in the morning. The server
 * charges the new price the instant it changes, so the cashier would quote 90
 * and the receipt would say 100.
 *
 * The signal is public and carries no menu, only the fact that it changed.
 * Everything is refetched through the API.
 *
 * A screen that was offline when the signal went out catches up when its
 * socket connects again, because a reconnect reloads the menu too.
 */
export function useMenuLiveUpdates(): void {
    const queryClient = useQueryClient();

    useEffect(() => {
        const echo = getPublicEcho();
        if (!echo) return;

        const reload = () => {
            MENU_KEYS.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
        };

        const channel = echo.channel('menu');
        channel.listen('.menu.updated', reload);

        // The first connect is not a reconnect: the menu was just loaded.
        let connectedBefore = false;
        const onConnected = () => {
            if (connectedBefore) reload();
            connectedBefore = true;
        };
        const connection = (echo.connector as { pusher?: { connection?: { bind: (e: string, cb: () => void) => void; unbind: (e: string, cb: () => void) => void; state?: string } } })
            .pusher?.connection;
        if (connection?.state === 'connected') connectedBefore = true;
        connection?.bind('connected', onConnected);

        return () => {
            channel.stopListening('.menu.updated', reload);
            connection?.unbind('connected', onConnected);
        };
    }, [queryClient]);
}
