import apiClient from '../client';

/**
 * New prices: menu changes typed in ahead of time, and the button that puts
 * them live, now or at a set time.
 *
 * Nothing that sells reads a draft. The till, the website and the app keep
 * charging today's prices until somebody presses Put new prices live.
 *
 * Every write answers with the whole board, so the page holds one copy and
 * never has to stitch a response into it. See docs/MENU_PRICES_BUILD.md.
 */

export type DraftField = 'price' | 'option_label' | 'display_name' | 'name' | 'off_sale';

export interface DraftValue<T = unknown> {
    id: number;
    value: T;
}

export interface BoardOption {
    id: number;
    option_key: string;
    option_label: string;
    display_name: string | null;
    price: number;
    drafts: {
        price?: DraftValue<number>;
        option_label?: DraftValue<string>;
        display_name?: DraftValue<string>;
    };
}

export interface BoardNewOption {
    draft_id: number;
    option_label: string;
    display_name: string;
    price: number;
}

export interface BoardDish {
    id: number;
    name: string;
    category: string | null;
    is_available: boolean;
    drafts: {
        name?: DraftValue<string>;
        off_sale?: DraftValue<boolean>;
    };
    options: BoardOption[];
    new_options: BoardNewOption[];
}

/**
 * One logged change. `field` is a draft field, except `created` for a new
 * option and `is_available` for a dish taken off sale.
 */
export interface PublicationChange {
    field: DraftField | 'created' | 'is_available';
    line_name: string;
    old_value: unknown;
    new_value: unknown;
}

export type PublicationStatus = 'published' | 'cancelled' | 'undone';

export interface Publication {
    id: number;
    status: PublicationStatus;
    publish_at: string | null;
    published_at: string | null;
    undone_at: string | null;
    scheduled_by: string | null;
    /** Null when the scheduler pressed it at the set time. */
    published_by: string | null;
    undone_by: string | null;
    change_count: number;
    note: string | null;
    can_undo: boolean;
    changes: PublicationChange[];
    updated_at: string | null;
}

export interface PriceBoard {
    dishes: BoardDish[];
    waiting_count: number;
    scheduled: { id: number; publish_at: string; scheduled_by: string | null } | null;
    history: Publication[];
    server_now: string;
}

function unwrap(response: unknown): PriceBoard {
    // The response interceptor already returns the body. One unwrap, not two.
    return (response as { data: PriceBoard }).data;
}

export const menuPricesService = {
    board: async (): Promise<PriceBoard> => unwrap(await apiClient.get('/admin/menu-prices')),

    /** Set one waiting change. Null or an empty string clears it. */
    setDraft: async (params: {
        menuItemId: number;
        optionId?: number | null;
        field: DraftField;
        value: string | number | boolean | null;
    }): Promise<PriceBoard> =>
        unwrap(await apiClient.put('/admin/menu-drafts', {
            menu_item_id: params.menuItemId,
            menu_item_option_id: params.optionId ?? null,
            field: params.field,
            value: params.value,
        })),

    addOption: async (params: {
        menuItemId: number;
        label: string;
        receiptName: string;
        price: number;
    }): Promise<PriceBoard> =>
        unwrap(await apiClient.post('/admin/menu-drafts/new-option', {
            menu_item_id: params.menuItemId,
            option_label: params.label,
            display_name: params.receiptName,
            price: params.price,
        })),

    removeDraft: async (draftId: number): Promise<PriceBoard> =>
        unwrap(await apiClient.delete(`/admin/menu-drafts/${draftId}`)),

    clearDrafts: async (): Promise<PriceBoard> => unwrap(await apiClient.delete('/admin/menu-drafts')),

    publishNow: async (): Promise<PriceBoard> =>
        unwrap(await apiClient.post('/admin/menu-publications', { when: 'now' })),

    /** `at` is Ghana time, "YYYY-MM-DD HH:mm". Ghana and the server are both UTC+0. */
    schedule: async (at: string): Promise<PriceBoard> =>
        unwrap(await apiClient.post('/admin/menu-publications', { when: 'at', publish_at: at })),

    cancel: async (publicationId: number): Promise<PriceBoard> =>
        unwrap(await apiClient.post(`/admin/menu-publications/${publicationId}/cancel`)),

    undo: async (publicationId: number): Promise<PriceBoard> =>
        unwrap(await apiClient.post(`/admin/menu-publications/${publicationId}/undo`)),
};
