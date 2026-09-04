'use client';

import { useEffect, useState } from 'react';
import type { InboxMessage, StaffMessageTrigger } from '@/types/messaging';

/**
 * The moment this tab was loaded.
 *
 * Module scope, not state, and read once. It has to be the load time of the
 * app rather than the mount time of a component: an interstitial mounts and
 * unmounts as the interruption gate opens and closes, so a per-component
 * timestamp would drift forward all shift and make every message look older
 * than the session that is meant to exclude it.
 */
const TAB_LOADED_AT = Date.now();

/**
 * Whether the window has been left and come back to since this tab loaded.
 *
 * Shared across every consumer, because it is a fact about the window, not
 * about any one message. Two interstitials asking the question must not get
 * different answers.
 */
let hasReturnedToWindow = false;
const listeners = new Set<() => void>();

function markReturned() {
    if (hasReturnedToWindow) return;
    hasReturnedToWindow = true;
    listeners.forEach((notify) => notify());
}

if (typeof window !== 'undefined') {
    // Both events, because they answer the same question in different browsers
    // and on different hardware. A till in kiosk mode may never fire `focus`
    // while its tab is switched away and back, and a phone locking and waking
    // fires `visibilitychange` and nothing else.
    window.addEventListener('focus', markReturned);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') markReturned();
    });
}

/**
 * Whether a message's display trigger has been satisfied.
 *
 * The server has already applied the `visible_from` floor by keeping anything
 * early out of the pending set, so everything reaching here is on time. What is
 * left is the event, and each of these is a fact only the browser holds.
 *
 * An unknown or absent trigger reads as `immediate`. That matters during a
 * deploy: a client running this code against a backend that predates the column
 * would otherwise hide every message rather than show it, which is the wrong
 * way to fail for a caution.
 */
export function useTriggerReady(message: InboxMessage | null): boolean {
    const trigger: StaffMessageTrigger = message?.display_trigger ?? 'immediate';

    const [returned, setReturned] = useState(hasReturnedToWindow);

    useEffect(() => {
        if (trigger !== 'window_active' || returned) return;

        const notify = () => setReturned(true);
        listeners.add(notify);
        return () => {
            listeners.delete(notify);
        };
    }, [trigger, returned]);

    if (!message) return false;

    if (trigger === 'window_active') return returned;

    if (trigger === 'next_sign_in') {
        // A message sent before this tab was loaded has already survived a fresh
        // load, so it is fair game. One sent while the tab sat open is held back
        // until the next one, which is the whole point: nobody is interrupted
        // mid-shift by something that landed while they were serving.
        //
        // Chosen by the user over a strict sign-out and back in, so a refresh or
        // arriving at the portal counts.
        const sentAt = message.sent_at ? Date.parse(message.sent_at) : 0;
        if (!Number.isFinite(sentAt) || sentAt === 0) return true;
        return sentAt < TAB_LOADED_AT;
    }

    return true;
}
