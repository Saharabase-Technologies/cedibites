/**
 * The supplementary contact base — numbers we hold that have bought nothing.
 *
 * Mirrors backend App\Models\Contact and App\Http\Resources\ContactResource.
 *
 * These are deliberately NOT customers and are not counted as any. A contact
 * becomes a customer by ordering, and nothing else does it — see
 * App\Services\Contacts\ContactConverter.
 */

/**
 * supplementary     — never ordered. Not a customer, not in any customer figure.
 * acquired          — ordered after we imported them. The list earned this one.
 * already_customer  — was already ordering when the list was uploaded. Found, not won.
 */
export type ContactStatus = 'supplementary' | 'acquired' | 'already_customer';

export interface Contact {
    id: number;
    name: string | null;
    phone: string;
    source: string;

    status: ContactStatus;
    converted_at: string | null;
    was_customer_before_import: boolean;
    /** Null unless the list actually won them. */
    days_to_convert: number | null;

    import?: { id: number; label: string } | null;

    customer_id: number | null;
    converted_order_id: number | null;
    created_at: string | null;
}

export interface ContactImport {
    id: number;
    label: string;
    filename: string | null;
    source_note: string | null;
    uploaded_by?: string | null;

    total_rows: number;
    imported_count: number;
    duplicate_count: number;
    invalid_count: number;
    /** How many were already customers on the day the file landed. */
    already_customer_count: number;

    converted_count: number;
    /**
     * Conversions the list can actually claim — total conversions minus the
     * numbers that were already customers when it was uploaded.
     */
    acquired_count: number;

    created_at: string | null;
}

export interface ContactStats {
    total: number;
    /** The figure that must never be added to the customer count. */
    supplementary: number;
    converted: number;
    acquired: number;
    already_customer: number;
    imports: number;

    /*
     * The moving figures. Totals go up forever and look like progress whatever
     * happens; these say whether anything is working this month.
     */
    acquired_last_7_days: number;
    acquired_last_30_days: number;
    /** Median, not mean — one contact who converts after two years skews a mean. */
    median_days_to_convert: number | null;
}

/**
 * One conversion, read from the activity log rather than the contacts table.
 *
 * The log is append-only, so this keeps telling the truth about what a list
 * achieved even after the import is undone or the contact is deleted.
 */
export interface ContactConversion {
    id: number;
    contact_id: number | null;
    at: string | null;
    phone: string;
    name: string | null;
    import_label: string | null;
    contact_import_id: number | null;
    order_id: number | null;
    /** Null when they were already a customer — the list did not win them. */
    days_to_convert: number | null;
    was_customer_before_import: boolean;
    /** 'order' when caught live, 'reconcile' when caught up by the command. */
    via: 'order' | 'reconcile';
}

/** One parsed row, as it would be stored. */
export interface ContactPreviewRow {
    name: string | null;
    phone: string;
    /** What was in the cell before normalising — shown next to the result. */
    raw_phone: string;
    outcome: 'new' | 'already_customer' | 'existing_contact';
}

export interface ContactPreviewInvalidRow {
    line: number;
    value: string;
    reason: string;
}

export interface ContactImportPreview {
    headers: string[];
    has_header: boolean;
    name_column: number | null;
    phone_column: number | null;
    total_rows: number;
    /** True when the file was longer than the parser's ceiling. */
    truncated: boolean;

    counts: {
        new: number;
        already_customer: number;
        existing_contact: number;
        duplicate_in_file: number;
        invalid: number;
    };

    sample: ContactPreviewRow[];
    invalid_sample: ContactPreviewInvalidRow[];

    /** Set when the file cannot be imported at all. */
    error?: string;
}
