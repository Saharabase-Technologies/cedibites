import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { linkService, type LinkListParams } from '../services/link.service';
import type { SaveShortLinkPayload } from '@/types/marketing';

const LINKS_KEY = 'short-links';

export function useLinks(params: LinkListParams = {}) {
    const hasStaffToken =
        typeof window !== 'undefined' && !!localStorage.getItem('cedibites_staff_token');

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: [LINKS_KEY, params],
        queryFn: () => linkService.getLinks(params),
        enabled: hasStaffToken,
        staleTime: 30 * 1000,
    });

    return {
        links: data?.items ?? [],
        total: data?.total ?? 0,
        isLoading,
        error,
        refetch,
    };
}

export function useLinkMutations() {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: [LINKS_KEY] });

    const create = useMutation({
        mutationFn: (payload: SaveShortLinkPayload) => linkService.createLink(payload),
        onSuccess: invalidate,
    });

    const update = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: SaveShortLinkPayload }) =>
            linkService.updateLink(id, payload),
        onSuccess: invalidate,
    });

    const remove = useMutation({
        mutationFn: (id: number) => linkService.deleteLink(id),
        onSuccess: invalidate,
    });

    return { create, update, remove };
}
