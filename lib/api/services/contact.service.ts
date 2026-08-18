import apiClient from '../client';
import type {
    Contact,
    ContactConversion,
    ContactImport,
    ContactImportPreview,
    ContactStats,
    ContactStatus,
} from '@/types/contacts';

/**
 * The supplementary contact base.
 *
 * Nothing here touches customers. Importing a list creates contacts and only
 * contacts — a number becomes a customer by ordering, which happens on the
 * server when the order lands.
 */

function unwrap<T>(response: unknown): T {
    const r = response as { data?: T };
    return (r?.data ?? response) as T;
}

function unwrapList<T>(response: unknown): { items: T[]; total: number } {
    const outer = response as { data?: { data?: T[]; total?: number; meta?: { total?: number } } };
    const inner = outer?.data;
    return {
        items: inner?.data ?? (Array.isArray(inner) ? (inner as T[]) : []),
        total: inner?.total ?? inner?.meta?.total ?? 0,
    };
}

export interface ContactListParams {
    status?: ContactStatus | 'converted' | '';
    import_id?: number;
    search?: string;
    per_page?: number;
    page?: number;
}

export const contactService = {
    getContacts: async (params: ContactListParams = {}): Promise<{ items: Contact[]; total: number }> => {
        const response = await apiClient.get('/admin/contacts', { params });
        return unwrapList<Contact>(response);
    },

    getStats: async (): Promise<ContactStats> => {
        const response = await apiClient.get('/admin/contacts/stats');
        return unwrap<ContactStats>(response);
    },

    getImports: async (): Promise<{ items: ContactImport[]; total: number }> => {
        const response = await apiClient.get('/admin/contacts/imports');
        return unwrapList<ContactImport>(response);
    },

    /** Conversions as they happen. Read from the activity log, so it outlives the rows. */
    getConversions: async (): Promise<{ items: ContactConversion[]; total: number }> => {
        const response = await apiClient.get('/admin/contacts/conversions', { params: { per_page: 50 } });
        return unwrapList<ContactConversion>(response);
    },

    /**
     * What a file would do, without doing it.
     *
     * The file is uploaded here and again to commit. That is deliberate — see
     * ContactController::preview() — and it is why the picker keeps hold of the
     * File object rather than discarding it after the preview.
     */
    previewImport: async (
        file: File,
        columns: { name_column?: number | null; phone_column?: number | null } = {},
    ): Promise<ContactImportPreview> => {
        const form = new FormData();
        form.append('file', file);

        if (columns.name_column !== undefined && columns.name_column !== null) {
            form.append('name_column', String(columns.name_column));
        }
        if (columns.phone_column !== undefined && columns.phone_column !== null) {
            form.append('phone_column', String(columns.phone_column));
        }

        const response = await apiClient.post('/admin/contacts/import/preview', form);
        return unwrap<ContactImportPreview>(response);
    },

    importContacts: async (
        file: File,
        payload: {
            label: string;
            source_note?: string;
            name_column?: number | null;
            phone_column?: number | null;
        },
    ): Promise<ContactImport> => {
        const form = new FormData();
        form.append('file', file);
        form.append('label', payload.label);

        if (payload.source_note) form.append('source_note', payload.source_note);
        if (payload.name_column !== undefined && payload.name_column !== null) {
            form.append('name_column', String(payload.name_column));
        }
        if (payload.phone_column !== undefined && payload.phone_column !== null) {
            form.append('phone_column', String(payload.phone_column));
        }

        const response = await apiClient.post('/admin/contacts/import', form);
        return unwrap<ContactImport>(response);
    },

    /** Removes the batch's contacts that have NOT since ordered. */
    undoImport: async (id: number): Promise<ContactImport> => {
        const response = await apiClient.delete(`/admin/contacts/imports/${id}`);
        return unwrap<ContactImport>(response);
    },

    deleteContact: async (id: number): Promise<void> => {
        await apiClient.delete(`/admin/contacts/${id}`);
    },
};
