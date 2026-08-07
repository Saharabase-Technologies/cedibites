import { useQuery } from '@tanstack/react-query';
import { orderFeedbackService } from '../services/orderFeedback.service';

export function useCustomerFeedback(params: { branch_id?: number; unhappy_only?: boolean } = {}) {
    const hasStaffToken =
        typeof window !== 'undefined' && !!localStorage.getItem('cedibites_staff_token');

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['customer-feedback', params],
        queryFn: () => orderFeedbackService.getFeedback({ ...params, per_page: 100 }),
        enabled: hasStaffToken,
        staleTime: 60 * 1000,
    });

    return {
        feedback: data?.items ?? [],
        summary: data?.summary ?? null,
        isLoading,
        error,
        refetch,
    };
}
