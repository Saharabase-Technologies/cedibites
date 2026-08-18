import apiClient from '../client';
import type {
    AutomationDryRun,
    AutomationOptions,
    AutomationRule,
    AutomationRuleDetail,
    SaveAutomationRulePayload,
} from '@/types/automation';

/**
 * Automation rules.
 *
 * Saving and switching on are separate calls, deliberately — the same split
 * campaigns make between composing and sending. Nothing here starts messaging
 * customers except `toggle`.
 */

function unwrap<T>(response: unknown): T {
    const r = response as { data?: T };
    return (r?.data ?? response) as T;
}

export const automationService = {
    getRules: async (): Promise<{ rules: AutomationRule[]; automationEnabled: boolean; cooldownDays: number }> => {
        const response = await apiClient.get('/admin/automations');
        const data = unwrap<{ data: AutomationRule[]; automation_enabled: boolean; cooldown_days: number }>(response);

        return {
            rules: data?.data ?? [],
            automationEnabled: data?.automation_enabled ?? false,
            cooldownDays: data?.cooldown_days ?? 3,
        };
    },

    getRule: async (id: number): Promise<AutomationRuleDetail> => {
        const response = await apiClient.get(`/admin/automations/${id}`);
        return unwrap<AutomationRuleDetail>(response);
    },

    getOptions: async (): Promise<AutomationOptions> => {
        const response = await apiClient.get('/admin/automations/options');
        return unwrap<AutomationOptions>(response);
    },

    createRule: async (payload: SaveAutomationRulePayload): Promise<AutomationRule> => {
        const response = await apiClient.post('/admin/automations', payload);
        return unwrap<AutomationRule>(response);
    },

    updateRule: async (id: number, payload: Partial<SaveAutomationRulePayload>): Promise<AutomationRule> => {
        const response = await apiClient.patch(`/admin/automations/${id}`, payload);
        return unwrap<AutomationRule>(response);
    },

    /** The only call here that can start real messages going to real people. */
    toggleRule: async (id: number, isActive: boolean): Promise<AutomationRule> => {
        const response = await apiClient.post(`/admin/automations/${id}/toggle`, { is_active: isActive });
        return unwrap<AutomationRule>(response);
    },

    deleteRule: async (id: number): Promise<void> => {
        await apiClient.delete(`/admin/automations/${id}`);
    },

    /** Replays real history. Sends nothing, writes nothing. */
    dryRun: async (id: number, days?: number): Promise<AutomationDryRun> => {
        const response = await apiClient.get(`/admin/automations/${id}/dry-run`, { params: { days } });
        return unwrap<AutomationDryRun>(response);
    },
};
