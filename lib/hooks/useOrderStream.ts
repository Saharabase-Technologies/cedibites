'use client';

import { useEffect, useRef, useState } from 'react';

import { getEcho } from '@/lib/echo';
import type { Order as ApiOrder } from '@/types/api';

/**
 * One branch's live order feed.
 *
 * Lifted out of `useOrderBoard` when the till needed the same thing. Every
 * screen that shows orders has to answer two questions — "has anything
 * changed?" and "can I still hear the server?" — and the second is the one
 * that gets written badly. The naive version is `getEcho()` once on mount: if
 * the staff token has not landed yet `getEcho` returns null, nothing
 * subscribes, and the screen sits silently on its polling fallback for the
 * rest of the shift with no way to tell.
 *
 * So: retry on `staff-login`, bind the connection state so the caller can both
 * say what it is out loud and pace its own fallback poll against it, and hand
 * every event to the caller to apply however that screen needs.
 */

export type ConnectionState = 'live' | 'connecting' | 'offline';

/**
 * How many live callers each channel currently has.
 *
 * More than one screen can want the same branch at once — on the POS route the
 * arrival banner and the till's own figures both do. `echo.leave()` tears the
 * channel down for *everybody*, so the first of them to unmount would silently
 * deafen the others. Each caller detaches only its own listener, and the
 * channel is left only when the last one goes.
 */
const subscriberCount = new Map<string, number>();

export interface OrderStreamEvent {
  /** `created`, `updated`, … — whatever OrderBroadcastEvent was constructed with. */
  type: string;
  order: ApiOrder;
}

/**
 * @param branchId  Branch to follow. `null` unsubscribes.
 * @param onEvent   Called for every `.order.updated` frame. Held in a ref, so
 *                  an inline arrow function is fine and will not resubscribe.
 */
export function useOrderStream(
  branchId: string | null,
  onEvent: (event: OrderStreamEvent) => void,
): ConnectionState {
  const [connection, setConnection] = useState<ConnectionState>('connecting');

  // The handler changes identity on every render at most call sites. Reading it
  // through a ref means the socket is subscribed once per branch rather than
  // torn down and rebuilt underneath a live screen.
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!branchId) {
      // No branch means no socket, and saying so is what puts a caller's poll
      // onto its faster cadence. Reporting the state of an external system is
      // the case this rule exists to allow.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConnection('offline');
      return;
    }

    const channelName = `orders.branch.${branchId}`;
    let bound = false;
    let unbindState: (() => void) | null = null;

    const handle = (payload: OrderStreamEvent) => onEventRef.current(payload);

    const subscribe = (): boolean => {
      const echo = getEcho();
      if (!echo) return false;

      echo.private(channelName).listen('.order.updated', handle);
      subscriberCount.set(channelName, (subscriberCount.get(channelName) ?? 0) + 1);
      bound = true;

      // Track the socket so a caller's fallback poll can slow down when it is
      // healthy and speed up when it is not — and so the screen can say which.
      try {
        const conn = (
          echo as unknown as {
            connector?: {
              pusher?: {
                connection?: {
                  state?: string;
                  bind: (e: string, cb: (p: { current: string }) => void) => void;
                  unbind: (e: string, cb: (p: { current: string }) => void) => void;
                };
              };
            };
          }
        ).connector?.pusher?.connection;

        if (!conn) {
          setConnection('offline');
          return true;
        }

        const map = (s: string): ConnectionState =>
          s === 'connected' ? 'live' : s === 'connecting' || s === 'initialized' ? 'connecting' : 'offline';

        setConnection(map(conn.state ?? 'connecting'));
        const onState = (payload: { current: string }) => setConnection(map(payload.current));
        conn.bind('state_change', onState);
        unbindState = () => conn.unbind('state_change', onState);
      } catch {
        setConnection('offline');
      }

      return true;
    };

    let onLogin: (() => void) | null = null;

    if (!subscribe()) {
      // No staff token yet, so there is no socket to subscribe to. Recording
      // that is what puts a caller's poll onto its faster cadence, which is the
      // only thing carrying the screen until login lands.
      setConnection('offline');
      onLogin = () => {
        if (subscribe() && onLogin) window.removeEventListener('staff-login', onLogin);
      };
      window.addEventListener('staff-login', onLogin);
    }

    return () => {
      if (onLogin) window.removeEventListener('staff-login', onLogin);
      unbindState?.();
      if (!bound) return;

      const remaining = (subscriberCount.get(channelName) ?? 1) - 1;
      const echo = getEcho();

      // Detach this caller's own listener either way; only tear the channel
      // down once nobody is left on it.
      echo?.private(channelName).stopListening('.order.updated', handle);

      if (remaining <= 0) {
        subscriberCount.delete(channelName);
        echo?.leave(channelName);
      } else {
        subscriberCount.set(channelName, remaining);
      }
    };
  }, [branchId]);

  return connection;
}
