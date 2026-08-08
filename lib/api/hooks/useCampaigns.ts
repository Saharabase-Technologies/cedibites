import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { campaignService } from '../services/campaign.service';
import type { AudienceRules, CampaignStatus, SaveCampaignPayload } from '@/types/marketing';

const CAMPAIGNS_KEY = 'campaigns';

function hasStaffToken(): boolean {
    return typeof window !== 'undefined' && !!localStorage.getItem('cedibites_staff_token');
}

export function useCampaigns(params: { status?: CampaignStatus } = {}) {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: [CAMPAIGNS_KEY, 'list', params],
        queryFn: () => campaignService.getCampaigns({ ...params, per_page: 100 }),
        enabled: hasStaffToken(),
        staleTime: 15 * 1000,
    });

    return {
        campaigns: data?.items ?? [],
        total: data?.total ?? 0,
        isLoading,
        error,
        refetch,
    };
}

export function useCampaign(id: number | null) {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: [CAMPAIGNS_KEY, 'one', id],
        queryFn: () => campaignService.getCampaign(id as number),
        enabled: hasStaffToken() && id !== null,
        /*
         * A sending campaign's counts move as chunks land, so the detail page
         * polls. It stops the moment nothing is in flight — a finished campaign
         * has nothing left to say and does not need a request every five seconds.
         */
        refetchInterval: (query) => (query.state.data?.status === 'sending' ? 5000 : false),
    });

    return { campaign: data ?? null, isLoading, error, refetch };
}

/** The six segments with a live headcount, plus seed mode and the cap. */
export function useCampaignSegments() {
    const { data, isLoading, error } = useQuery({
        queryKey: [CAMPAIGNS_KEY, 'segments'],
        queryFn: campaignService.getSegments,
        enabled: hasStaffToken(),
        // Counting a segment scans the order history; it does not need doing on
        // every keystroke in the composer.
        staleTime: 5 * 60 * 1000,
    });

    return {
        segments: data?.segments ?? [],
        seedMode: data?.seed_mode ?? true,
        recipientCap: data?.recipient_cap ?? 0,
        // The rate Hubtel last charged. Falls back to the same figure the
        // backend defaults to, so a slow load never quotes a different price.
        ratePerSegment: data?.rate_per_segment ?? 0.0243,
        isLoading,
        error,
    };
}

/** Dishes, branches and networks the builder can filter on. Rarely changes. */
export function useAudienceOptions() {
    const { data, isLoading } = useQuery({
        queryKey: [CAMPAIGNS_KEY, 'audience-options'],
        queryFn: campaignService.getAudienceOptions,
        enabled: hasStaffToken(),
        staleTime: 10 * 60 * 1000,
    });

    return {
        branches: data?.branches ?? [],
        // The receipt lines. Listed before menuItems because this is the one
        // the builder leads with — an item name is not what anybody bought.
        menuItemOptions: data?.menu_item_options ?? [],
        menuItems: data?.menu_items ?? [],
        networks: data?.networks ?? [],
        // Customers and imported contacts, each with a headcount. Empty until
        // loaded rather than defaulted, so the picker never renders a source
        // with a wrong number beside it.
        sources: data?.sources ?? [],
        isLoading,
    };
}

/**
 * How many people the rules in hand match.
 *
 * Debounced by the caller rather than here: every count is a scan of the order
 * history, and firing one per keystroke while somebody types "30" into a day
 * box would run it twice for a number they had not finished typing.
 */
export function useAudienceCount(rules: AudienceRules, enabled = true) {
    const { data, isFetching } = useQuery({
        queryKey: [CAMPAIGNS_KEY, 'audience-count', rules],
        queryFn: () => campaignService.countAudience(rules),
        enabled: hasStaffToken() && enabled,
        staleTime: 60 * 1000,
        // Keep the last count on screen while the next one resolves, so the
        // number does not blink to zero between edits and read as "nobody".
        placeholderData: (previous) => previous,
    });

    return {
        count: data?.count ?? null,
        description: data?.description ?? [],
        isCounting: isFetching,
    };
}

export function useCampaignMutations() {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: [CAMPAIGNS_KEY] });

    const create = useMutation({
        mutationFn: (payload: SaveCampaignPayload) => campaignService.createCampaign(payload),
        onSuccess: invalidate,
    });

    const update = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: SaveCampaignPayload }) =>
            campaignService.updateCampaign(id, payload),
        onSuccess: invalidate,
    });

    const remove = useMutation({
        mutationFn: (id: number) => campaignService.deleteCampaign(id),
        onSuccess: invalidate,
    });

    const send = useMutation({
        mutationFn: (id: number) => campaignService.sendCampaign(id),
        onSuccess: invalidate,
    });

    const cancel = useMutation({
        mutationFn: (id: number) => campaignService.cancelCampaign(id),
        onSuccess: invalidate,
    });

    return { create, update, remove, send, cancel };
}
