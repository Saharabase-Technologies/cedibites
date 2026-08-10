'use client';

import { useMemo, useState } from 'react';
import {
    UploadSimpleIcon,
    AddressBookIcon,
    TrendUpIcon,
    ArrowCounterClockwiseIcon,
    TrashIcon,
} from '@phosphor-icons/react';
import {
    PageHeader,
    FilterBar,
    SearchBar,
    FilterSelect,
    SegmentedTabs,
    DataTable,
    RowActionsMenu,
    type DataTableColumn,
} from '@/app/inventory/_components';
import { DeleteConfirmDialog } from '@/app/components/ui/DeleteConfirmDialog';
import { CustomersTabNav } from '../_components/CustomersTabNav';
import { ImportContactsDialog } from '../_components/ImportContactsDialog';
import {
    useContacts,
    useContactStats,
    useContactImports,
    useContactConversions,
    useContactMutations,
} from '@/lib/api/hooks/useContacts';
import { toast } from '@/lib/utils/toast';
import type { Contact, ContactConversion, ContactImport, ContactStatus } from '@/types/contacts';

const STATUS_TONES: Record<ContactStatus, { label: string; className: string; hint: string }> = {
    supplementary: {
        label: 'Supplementary',
        className: 'bg-neutral-light text-neutral-gray',
        hint: 'Has never ordered. Not counted as a customer anywhere.',
    },
    acquired: {
        label: 'Acquired',
        className: 'bg-secondary/10 text-secondary',
        hint: 'Ordered after we imported them. This list won them.',
    },
    already_customer: {
        label: 'Already a customer',
        className: 'bg-info/10 text-info',
        hint: 'Was already ordering when the list was uploaded. Found, not won.',
    },
};

// FilterSelect prepends its own "all" option from the placeholder.
const STATUS_FILTERS = [
    { value: 'supplementary', label: 'Supplementary only' },
    { value: 'acquired', label: 'Acquired only' },
    { value: 'converted', label: 'Everyone who has ordered' },
];

function formatDate(value: string | null) {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(value: string | null) {
    if (!value) return '—';
    return new Date(value).toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function ImportedContactsPage() {
    const [view, setView] = useState<'contacts' | 'imports' | 'conversions'>('contacts');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [importFilter, setImportFilter] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [deleting, setDeleting] = useState<Contact | null>(null);
    const [undoing, setUndoing] = useState<ContactImport | null>(null);

    const { stats } = useContactStats();
    const { imports } = useContactImports();
    // Only polls while its own tab is open.
    const { conversions, isLoading: conversionsLoading } = useContactConversions(view === 'conversions');
    const { contacts, total, isLoading } = useContacts({
        search: search.trim() || undefined,
        status: (status || undefined) as ContactStatus | undefined,
        import_id: importFilter ? Number(importFilter) : undefined,
    });

    const { undoImport, deleteContact } = useContactMutations();

    const importOptions = useMemo(
        () => imports.map((i) => ({ value: String(i.id), label: i.label })),
        [imports],
    );

    const onDelete = async () => {
        if (!deleting) return;
        try {
            await deleteContact.mutateAsync(deleting.id);
            toast.success('Contact removed.');
        } catch {
            toast.error('That contact could not be removed.');
        } finally {
            setDeleting(null);
        }
    };

    const onUndo = async () => {
        if (!undoing) return;
        try {
            const result = await undoImport.mutateAsync(undoing.id);
            const kept = result.converted_count;
            toast.success(
                kept > 0
                    ? `List removed. Kept ${kept.toLocaleString()} who have since ordered, because they are customers now.`
                    : 'List removed.',
            );
        } catch {
            toast.error('That list could not be removed.');
        } finally {
            setUndoing(null);
        }
    };

    const contactColumns: DataTableColumn<Contact>[] = [
        {
            key: 'name',
            header: 'Contact',
            sortValue: (c) => (c.name ?? '').toLowerCase(),
            cell: (c) => (
                <div className="min-w-0">
                    <p className="text-text-dark font-semibold font-body truncate">{c.name ?? 'No name'}</p>
                    <p className="text-neutral-gray text-xs font-body mt-0.5">{c.phone}</p>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            sortValue: (c) => c.status,
            cell: (c) => {
                const tone = STATUS_TONES[c.status];
                return (
                    <span
                        title={tone.hint}
                        className={`inline-block text-[11px] font-body font-medium px-2 py-0.5 rounded-full ${tone.className}`}
                    >
                        {tone.label}
                    </span>
                );
            },
        },
        {
            key: 'list',
            header: 'From',
            hideBelow: 'md',
            sortValue: (c) => c.import?.label ?? '',
            cell: (c) => (
                <span className="text-neutral-gray text-sm font-body">{c.import?.label ?? '—'}</span>
            ),
        },
        {
            key: 'converted',
            header: 'First ordered',
            hideBelow: 'lg',
            sortValue: (c) => c.converted_at ?? '',
            cell: (c) => (
                <span className="text-neutral-gray text-sm font-body">{formatDate(c.converted_at)}</span>
            ),
        },
        {
            key: 'actions',
            header: '',
            cell: (c) => (
                <RowActionsMenu
                    actions={[
                        {
                            label: 'Remove',
                            icon: <TrashIcon size={14} />,
                            onClick: () => setDeleting(c),
                            destructive: true,
                        },
                    ]}
                />
            ),
        },
    ];

    const importColumns: DataTableColumn<ContactImport>[] = [
        {
            key: 'label',
            header: 'List',
            sortValue: (i) => i.label.toLowerCase(),
            cell: (i) => (
                <div className="min-w-0">
                    <p className="text-text-dark font-semibold font-body truncate">{i.label}</p>
                    <p className="text-neutral-gray text-xs font-body mt-0.5 truncate">
                        {i.filename ?? '—'} · {formatDate(i.created_at)}
                        {i.uploaded_by ? ` · ${i.uploaded_by}` : ''}
                    </p>
                </div>
            ),
        },
        {
            key: 'imported',
            header: 'Imported',
            sortValue: (i) => i.imported_count,
            cell: (i) => (
                <div>
                    <p className="text-text-dark text-sm font-body">{i.imported_count.toLocaleString()}</p>
                    <p className="text-neutral-gray text-xs font-body mt-0.5">
                        of {i.total_rows.toLocaleString()} rows
                    </p>
                </div>
            ),
        },
        {
            key: 'skipped',
            header: 'Skipped',
            hideBelow: 'md',
            sortValue: (i) => i.duplicate_count + i.invalid_count,
            cell: (i) => (
                <span className="text-neutral-gray text-sm font-body">
                    {i.duplicate_count.toLocaleString()} dup · {i.invalid_count.toLocaleString()} bad
                </span>
            ),
        },
        {
            key: 'acquired',
            header: 'Won',
            hideBelow: 'md',
            sortValue: (i) => i.acquired_count,
            cell: (i) => (
                <div>
                    <p className="text-text-dark text-sm font-body">{i.acquired_count.toLocaleString()}</p>
                    {i.already_customer_count > 0 && (
                        <p
                            className="text-neutral-gray text-xs font-body mt-0.5"
                            title="These were already customers when the list was uploaded, so the list cannot claim them."
                        >
                            {i.already_customer_count.toLocaleString()} were already ours
                        </p>
                    )}
                </div>
            ),
        },
        {
            key: 'actions',
            header: '',
            cell: (i) => (
                <RowActionsMenu
                    actions={[
                        {
                            label: 'Undo this import',
                            icon: <ArrowCounterClockwiseIcon size={14} />,
                            onClick: () => setUndoing(i),
                            destructive: true,
                        },
                    ]}
                />
            ),
        },
    ];

    const conversionColumns: DataTableColumn<ContactConversion>[] = [
        {
            key: 'who',
            header: 'Converted',
            sortValue: (c) => c.at ?? '',
            cell: (c) => (
                <div className="min-w-0">
                    <p className="text-text-dark font-semibold font-body truncate">{c.name ?? 'No name'}</p>
                    <p className="text-neutral-gray text-xs font-body mt-0.5">{c.phone}</p>
                </div>
            ),
        },
        {
            key: 'when',
            header: 'When',
            sortValue: (c) => c.at ?? '',
            cell: (c) => (
                <span className="text-neutral-gray text-sm font-body">{formatDateTime(c.at)}</span>
            ),
        },
        {
            key: 'took',
            header: 'Took',
            hideBelow: 'md',
            sortValue: (c) => c.days_to_convert ?? Number.MAX_SAFE_INTEGER,
            cell: (c) =>
                c.days_to_convert === null ? (
                    <span
                        className="text-neutral-gray text-xs font-body"
                        title="They were already a customer when the list was uploaded, so there is nothing to measure."
                    >
                        Already ours
                    </span>
                ) : (
                    <span className="text-text-dark text-sm font-body tabular-nums">
                        {c.days_to_convert === 0
                            ? 'Same day'
                            : `${c.days_to_convert} ${c.days_to_convert === 1 ? 'day' : 'days'}`}
                    </span>
                ),
        },
        {
            key: 'list',
            header: 'From',
            hideBelow: 'lg',
            sortValue: (c) => c.import_label ?? '',
            cell: (c) => (
                <span className="text-neutral-gray text-sm font-body">{c.import_label ?? '—'}</span>
            ),
        },
    ];

    return (
        <div className="p-4 sm:p-6 max-w-350 mx-auto">
            <div className="mb-5">
                <CustomersTabNav />
            </div>

            <PageHeader
                title="Imported Contacts"
                subtitle="Numbers we hold that have not bought anything. Not customers, and not counted as any."
                action={{
                    label: 'Import CSV',
                    onClick: () => setIsImporting(true),
                    icon: <UploadSimpleIcon size={16} weight="bold" />,
                }}
            />

            {/* The standing figures. */}
            {stats && stats.total > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                    <Stat
                        value={stats.supplementary}
                        label="Supplementary"
                        hint="Never ordered. Excluded from every customer figure."
                    />
                    <Stat
                        value={stats.acquired}
                        label="Acquired"
                        tone="good"
                        hint="Ordered after being imported. These are real customers now."
                    />
                    <Stat
                        value={stats.already_customer}
                        label="Already customers"
                        hint="Were ordering before the list was uploaded."
                    />
                    <Stat value={stats.imports} label="Lists imported" />
                </div>
            )}

            {/*
              * And the moving ones. Kept on their own row and worded as a
              * sentence: the totals above go up forever and look like progress
              * whatever happens, so the figures that say whether anything is
              * working this month should not be read as more of the same.
              */}
            {stats && stats.acquired > 0 && (
                <div className="rounded-xl border border-[#f0e8d8] bg-neutral-card px-4 py-3 mb-5">
                    <p className="text-text-dark text-sm font-body">
                        <strong className="tabular-nums">{stats.acquired_last_7_days.toLocaleString()}</strong>
                        {' converted in the last 7 days, '}
                        <strong className="tabular-nums">{stats.acquired_last_30_days.toLocaleString()}</strong>
                        {' in the last 30.'}
                        {stats.median_days_to_convert !== null && (
                            <>
                                {' Typically '}
                                <strong className="tabular-nums">{stats.median_days_to_convert}</strong>
                                {stats.median_days_to_convert === 1 ? ' day' : ' days'} from import to first order.
                            </>
                        )}
                    </p>
                </div>
            )}

            <div className="mb-4">
                <SegmentedTabs
                    value={view}
                    onChange={setView}
                    options={[
                        { value: 'contacts', label: 'Contacts' },
                        { value: 'imports', label: 'Lists' },
                        { value: 'conversions', label: 'Conversions' },
                    ]}
                />
            </div>

            {view === 'contacts' ? (
                <>
                    <FilterBar>
                        <SearchBar
                            value={search}
                            onChange={setSearch}
                            placeholder="Search by name or number…"
                        />
                        <FilterSelect
                            value={status}
                            onChange={setStatus}
                            options={STATUS_FILTERS}
                            placeholder="All contacts"
                        />
                        <FilterSelect
                            value={importFilter}
                            onChange={setImportFilter}
                            options={importOptions}
                            placeholder="All lists"
                        />
                    </FilterBar>

                    <DataTable
                        data={contacts}
                        columns={contactColumns}
                        rowKey={(c) => c.id}
                        isLoading={isLoading}
                        pageSize={25}
                        emptyState={
                            <EmptyState
                                icon={<AddressBookIcon size={32} />}
                                title={stats && stats.total > 0 ? 'Nothing matches those filters' : 'No contacts yet'}
                                description={
                                    stats && stats.total > 0
                                        ? 'Try a different status or list.'
                                        : 'Import a CSV to build a contact base you can send campaigns to.'
                                }
                            />
                        }
                    />

                    {total > contacts.length && (
                        <p className="text-neutral-gray text-xs font-body text-center mt-3">
                            Showing {contacts.length.toLocaleString()} of {total.toLocaleString()}
                        </p>
                    )}
                </>
            ) : view === 'imports' ? (
                <DataTable
                    data={imports}
                    columns={importColumns}
                    rowKey={(i) => i.id}
                    emptyState={
                        <EmptyState
                            icon={<UploadSimpleIcon size={32} />}
                            title="No lists imported yet"
                            description="Every CSV you import is recorded here, with what it produced."
                        />
                    }
                />
            ) : (
                <>
                    <DataTable
                        data={conversions}
                        columns={conversionColumns}
                        rowKey={(c) => c.id}
                        isLoading={conversionsLoading}
                        pageSize={25}
                        emptyState={
                            <EmptyState
                                icon={<TrendUpIcon size={32} />}
                                title="Nothing has converted yet"
                                description="Every time an imported number places its first order, it lands here."
                            />
                        }
                    />
                    <p className="text-neutral-gray text-xs font-body text-center mt-3">
                        Refreshes every minute. Kept even if the contact or the list is later removed.
                    </p>
                </>
            )}

            <ImportContactsDialog isOpen={isImporting} onClose={() => setIsImporting(false)} />

            <DeleteConfirmDialog
                isOpen={!!deleting}
                onCancel={() => setDeleting(null)}
                onConfirm={onDelete}
                isLoading={deleteContact.isPending}
                title="Remove this contact?"
                message="They are removed from the contact base. Nothing about their orders, if they have any, is affected."
                itemName={deleting?.name ?? deleting?.phone ?? 'this contact'}
            />

            <DeleteConfirmDialog
                isOpen={!!undoing}
                onCancel={() => setUndoing(null)}
                onConfirm={onUndo}
                isLoading={undoImport.isPending}
                title="Undo this import?"
                message={
                    'Removes the contacts this list brought in that have not ordered. Anyone from it who has ' +
                    'since ordered is kept. They are customers now, and this row records where they came from.'
                }
                itemName={undoing?.label ?? ''}
            />
        </div>
    );
}

function EmptyState({
    icon,
    title,
    description,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
            <div className="text-neutral-gray/40 mb-3">{icon}</div>
            <p className="text-text-dark text-sm font-semibold font-body">{title}</p>
            <p className="text-neutral-gray text-xs font-body mt-1 max-w-xs">{description}</p>
        </div>
    );
}

function Stat({
    value,
    label,
    hint,
    tone,
}: {
    value: number;
    label: string;
    hint?: string;
    tone?: 'good';
}) {
    return (
        <div className="bg-neutral-card border border-[#f0e8d8] rounded-xl px-4 py-3" title={hint}>
            <p className={`text-xl font-bold font-body ${tone === 'good' && value > 0 ? 'text-secondary' : 'text-text-dark'}`}>
                {value.toLocaleString()}
            </p>
            <p className="text-neutral-gray text-xs font-body mt-0.5">{label}</p>
        </div>
    );
}
