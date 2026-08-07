import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { campaignService } from '../services/campaign.service';
import type { CampaignStatus, SaveCampaignPayload } from '@/types/marketing';

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
        isLoading,
        error,
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
