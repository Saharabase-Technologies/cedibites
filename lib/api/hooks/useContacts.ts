import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { contactService, type ContactListParams } from '../services/contact.service';

const CONTACTS_KEY = 'contacts';

function hasStaffToken(): boolean {
    return typeof window !== 'undefined' && !!localStorage.getItem('cedibites_staff_token');
}

export function useContacts(params: ContactListParams = {}) {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: [CONTACTS_KEY, 'list', params],
        queryFn: () => contactService.getContacts({ per_page: 50, ...params }),
        enabled: hasStaffToken(),
        staleTime: 30 * 1000,
        placeholderData: (previous) => previous,
    });

    return {
        contacts: data?.items ?? [],
        total: data?.total ?? 0,
        isLoading,
        error,
        refetch,
    };
}

export function useContactStats() {
    const { data, isLoading } = useQuery({
        queryKey: [CONTACTS_KEY, 'stats'],
        queryFn: contactService.getStats,
        enabled: hasStaffToken(),
        staleTime: 30 * 1000,
    });

    return { stats: data ?? null, isLoading };
}

/**
 * The conversion feed, refreshed while the tab is open.
 *
 * Polled rather than pushed. Conversions are rare — a handful a day at most —
 * and the realtime layer here is one subscription in the admin layout with
 * cascade broadcasts; adding a per-page channel for something this infrequent
 * is the pattern that was deliberately removed from the inventory pages.
 *
 * `enabled` so the poll only runs on the tab that shows it.
 */
export function useContactConversions(enabled = true) {
    const { data, isLoading } = useQuery({
        queryKey: [CONTACTS_KEY, 'conversions'],
        queryFn: contactService.getConversions,
        enabled: hasStaffToken() && enabled,
        staleTime: 30 * 1000,
        refetchInterval: enabled ? 60 * 1000 : false,
    });

    return { conversions: data?.items ?? [], total: data?.total ?? 0, isLoading };
}

export function useContactImports() {
    const { data, isLoading, refetch } = useQuery({
        queryKey: [CONTACTS_KEY, 'imports'],
        queryFn: contactService.getImports,
        enabled: hasStaffToken(),
        staleTime: 30 * 1000,
    });

    return { imports: data?.items ?? [], isLoading, refetch };
}

export function useContactMutations() {
    const queryClient = useQueryClient();

    /*
     * Campaign counts are invalidated alongside the contacts.
     *
     * An import changes how many people an audience with imported contacts
     * switched on would reach, and the audience-options headcount right beside
     * the toggle. Leaving those cached would have the operator building a send
     * against the size of the list as it was before they uploaded it.
     */
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: [CONTACTS_KEY] });
        queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    };

    const importContacts = useMutation({
        mutationFn: ({
            file,
            ...payload
        }: {
            file: File;
            label: string;
            source_note?: string;
            name_column?: number | null;
            phone_column?: number | null;
        }) => contactService.importContacts(file, payload),
        onSuccess: invalidate,
    });

    const undoImport = useMutation({
        mutationFn: (id: number) => contactService.undoImport(id),
        onSuccess: invalidate,
    });

    const deleteContact = useMutation({
        mutationFn: (id: number) => contactService.deleteContact(id),
        onSuccess: invalidate,
    });

    return { importContacts, undoImport, deleteContact };
}
