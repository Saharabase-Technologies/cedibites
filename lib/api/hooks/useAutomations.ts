import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { automationService } from '../services/automation.service';
import type { SaveAutomationRulePayload } from '@/types/automation';

const AUTOMATIONS_KEY = 'automations';

function hasStaffToken(): boolean {
    return typeof window !== 'undefined' && !!localStorage.getItem('cedibites_staff_token');
}

export function useAutomationRules() {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: [AUTOMATIONS_KEY, 'list'],
        queryFn: automationService.getRules,
        enabled: hasStaffToken(),
        staleTime: 30 * 1000,
    });

    return {
        rules: data?.rules ?? [],
        // The global kill switch. Every rule can be on and still send nothing.
        automationEnabled: data?.automationEnabled ?? false,
        cooldownDays: data?.cooldownDays ?? 3,
        isLoading,
        error,
        refetch,
    };
}

export function useAutomationRule(id: number | null) {
    const { data, isLoading, refetch } = useQuery({
        queryKey: [AUTOMATIONS_KEY, 'one', id],
        queryFn: () => automationService.getRule(id as number),
        enabled: hasStaffToken() && id !== null,
    });

    return { rule: data ?? null, isLoading, refetch };
}

/** Events and merge fields. Served so the builder cannot drift from the enum. */
export function useAutomationOptions() {
    const { data, isLoading } = useQuery({
        queryKey: [AUTOMATIONS_KEY, 'options'],
        queryFn: automationService.getOptions,
        enabled: hasStaffToken(),
        staleTime: 10 * 60 * 1000,
    });

    return {
        events: data?.events ?? [],
        mergeFields: data?.merge_fields ?? [],
        automationEnabled: data?.automation_enabled ?? false,
        cooldownDays: data?.cooldown_days ?? 3,
        ratePerSegment: data?.rate_per_segment ?? 0.0243,
        isLoading,
    };
}

/**
 * The dry run.
 *
 * Only fetched when asked for — it replays thirty days of orders, which is not
 * something to do on every render of a list.
 */
export function useAutomationDryRun(id: number | null, enabled: boolean, days?: number) {
    const { data, isFetching, refetch } = useQuery({
        queryKey: [AUTOMATIONS_KEY, 'dry-run', id, days],
        queryFn: () => automationService.dryRun(id as number, days),
        enabled: hasStaffToken() && id !== null && enabled,
        staleTime: 5 * 60 * 1000,
    });

    return { dryRun: data ?? null, isRunning: isFetching, refetch };
}

export function useAutomationMutations() {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: [AUTOMATIONS_KEY] });

    const create = useMutation({
        mutationFn: (payload: SaveAutomationRulePayload) => automationService.createRule(payload),
        onSuccess: invalidate,
    });

    const update = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: Partial<SaveAutomationRulePayload> }) =>
            automationService.updateRule(id, payload),
        onSuccess: invalidate,
    });

    const toggle = useMutation({
        mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
            automationService.toggleRule(id, isActive),
        onSuccess: invalidate,
    });

    const remove = useMutation({
        mutationFn: (id: number) => automationService.deleteRule(id),
        onSuccess: invalidate,
    });

    return { create, update, toggle, remove };
}
