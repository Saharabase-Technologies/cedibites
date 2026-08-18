'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getEcho } from '@/lib/echo';
import { inboxService } from '../services/messaging.service';
import { getStaffToken } from '@/lib/api/services/staff.service';
import type { InboxMessage, InboxSummary } from '@/types/messaging';

const SUMMARY_KEY = ['staff-inbox-summary'];
const LIST_KEY = ['staff-inbox'];

/**
 * The bell, the pending cautions, and the actions a staff member can take.
 *
 * Realtime is the primary path; the poll is a fallback for when Reverb is
 * unavailable, which it has been in the past. Sixty seconds rather than the
 * one-second poll the order board uses — a message is not a live order, and one
 * subscription per staff member polling every second would be a self-inflicted
 * load problem for no benefit.
 */
export function useStaffInbox(userId?: number | null) {
    const queryClient = useQueryClient();
    const enabled = typeof window !== 'undefined' && !!getStaffToken();

    const { data: summary } = useQuery({
        queryKey: SUMMARY_KEY,
        queryFn: () => inboxService.summary().then((response) => response.data),
        enabled,
        refetchInterval: 60_000,
    });

    const { data: messages, isLoading } = useQuery({
        queryKey: LIST_KEY,
        queryFn: () => inboxService.list().then((response) => response.data),
        enabled,
    });

    // Live arrivals on the staff member's own private channel.
    useEffect(() => {
        if (!enabled || !userId) return;

        const echo = getEcho();
        if (!echo) return;

        const channel = echo.private(`staff-messages.${userId}`);

        channel.listen('.staff-message.received', () => {
            // Refetch rather than merging the payload in. The payload is enough
            // to render, but the queries own ordering, pagination and the
            // pending set, and reconstructing those client-side is how two
            // sources of truth start disagreeing.
            queryClient.invalidateQueries({ queryKey: SUMMARY_KEY });
            queryClient.invalidateQueries({ queryKey: LIST_KEY });
        });

        return () => {
            echo.leave(`staff-messages.${userId}`);
        };
    }, [enabled, userId, queryClient]);

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: SUMMARY_KEY });
        queryClient.invalidateQueries({ queryKey: LIST_KEY });
    };

    const acknowledge = useMutation({
        mutationFn: (recipientId: number) => inboxService.acknowledge(recipientId),
        onSuccess: invalidate,
    });

    const reply = useMutation({
        mutationFn: ({
            recipientId,
            ...payload
        }: {
            recipientId: number;
            quick_reply?: string;
            body?: string;
        }) => inboxService.reply(recipientId, payload),
        onSuccess: invalidate,
    });

    const raise = useMutation({
        mutationFn: (payload: { subject?: string; body: string }) => inboxService.raise(payload),
    });

    return {
        summary: (summary ?? { unread: 0, pending: [] }) as InboxSummary,
        messages: (messages ?? []) as InboxMessage[],
        isLoading,
        acknowledge: acknowledge.mutateAsync,
        isAcknowledging: acknowledge.isPending,
        reply: reply.mutateAsync,
        isReplying: reply.isPending,
        raise: raise.mutateAsync,
        isRaising: raise.isPending,
        refresh: invalidate,
    };
}
