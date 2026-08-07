'use client';

import { useMemo, useState } from 'react';
import {
    PlusIcon,
    LinkSimpleIcon,
    WarningCircleIcon,
    CopyIcon,
    CheckIcon,
    PencilSimpleIcon,
    ArrowSquareOutIcon,
} from '@phosphor-icons/react';
import {
    PageHeader,
    FilterBar,
    SearchBar,
    DataTable,
    type DataTableColumn,
} from '@/app/inventory/_components';
import { MarketingTabNav } from '@/app/admin/components/MarketingTabNav';
import { useLinks } from '@/lib/api/hooks/useLinks';
import type { ShortLink } from '@/types/marketing';
import { LinkDialog } from './_components/LinkDialog';

export default function AdminLinksPage() {
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<ShortLink | null>(null);
    const [search, setSearch] = useState('');
    const [copied, setCopied] = useState<number | null>(null);

    const { links, isLoading, error, refetch } = useLinks({ per_page: 100 });

    const rows = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return links;

        return links.filter(
            (l) =>
                l.label.toLowerCase().includes(term) ||
                l.token.toLowerCase().includes(term) ||
                l.target_url.toLowerCase().includes(term),
        );
    }, [links, search]);

    async function copy(link: ShortLink) {
        try {
            // The SMS form, without the scheme — that is what goes in a message,
            // and the eight characters `https://` costs are the whole margin on
            // a message sitting at 161.
            await navigator.clipboard.writeText(link.sms_url);
            setCopied(link.id);
            setTimeout(() => setCopied(null), 2000);
        } catch {
            /* clipboard blocked — the link is on screen anyway */
        }
    }

    const columns: DataTableColumn<ShortLink>[] = [
        {
            key: 'label',
            header: 'Link',
            sortValue: (l) => l.label.toLowerCase(),
            cell: (l) => (
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-text-dark font-semibold font-body truncate">{l.label}</p>
                        {l.is_expired && (
                            <span className="rounded-full bg-neutral-light text-neutral-gray text-[11px] font-semibold px-2 py-0.5 font-body">
                                Expired
                            </span>
                        )}
                        {/* Our brand pointing at somebody else's page. Worth
                            seeing at a glance — a branded short domain is
                            trusted by carriers in a way bit.ly is not. */}
                        {l.is_external && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-semibold px-2 py-0.5 font-body">
                                <WarningCircleIcon size={11} weight="fill" />
                                Off-site
                            </span>
                        )}
                    </div>
                    <p className="text-neutral-gray text-xs font-mono truncate mt-0.5">{l.sms_url}</p>
                </div>
            ),
        },
        {
            key: 'target',
            header: 'Goes to',
            hideBelow: 'md',
            sortValue: (l) => l.target_url,
            cell: (l) => (
                <a
                    href={l.target_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 text-neutral-gray hover:text-primary text-sm font-body transition-colors max-w-xs"
                >
                    <span className="truncate">{l.target_url}</span>
                    <ArrowSquareOutIcon size={13} className="shrink-0" />
                </a>
            ),
        },
        {
            key: 'clicks',
            header: 'Taps',
            align: 'right',
            sortValue: (l) => l.click_count,
            cell: (l) => (
                <span className="text-text-dark font-semibold font-body tabular-nums">
                    {l.click_count.toLocaleString()}
                </span>
            ),
        },
        {
            key: 'length',
            header: 'Length',
            align: 'right',
            hideBelow: 'lg',
            sortValue: (l) => l.sms_url.length,
            cell: (l) => (
                <span className="text-neutral-gray text-sm font-body tabular-nums">
                    {l.sms_url.length} chars
                </span>
            ),
        },
        {
            key: 'actions',
            header: '',
            align: 'right',
            width: 'w-40',
            cell: (l) => (
                <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => copy(l)}
                        className="flex items-center gap-1.5 rounded-lg border border-[#f0e8d8] px-2.5 py-1.5 text-xs font-medium font-body text-text-dark hover:bg-neutral-light transition-colors cursor-pointer"
                    >
                        {copied === l.id ? (
                            <CheckIcon size={13} weight="bold" className="text-emerald-600" />
                        ) : (
                            <CopyIcon size={13} />
                        )}
                        {copied === l.id ? 'Copied' : 'Copy'}
                    </button>
                    <button
                        onClick={() => setEditing(l)}
                        aria-label={`Edit ${l.label}`}
                        className="flex items-center gap-1.5 rounded-lg border border-[#f0e8d8] px-2.5 py-1.5 text-xs font-medium font-body text-neutral-gray hover:text-text-dark transition-colors cursor-pointer"
                    >
                        <PencilSimpleIcon size={13} />
                        Edit
                    </button>
                </div>
            ),
        },
    ];

    const totalClicks = links.reduce((sum, l) => sum + l.click_count, 0);

    return (
        <div className="h-full overflow-y-auto bg-neutral-light">
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
                <div className="mb-5">
                    <MarketingTabNav />
                </div>

                <PageHeader
                    title="Short links"
                    subtitle="Turn a long web address into cedibites.com/r/A7X9Kp so a promo fits in one text instead of two."
                    action={{
                        label: 'New link',
                        onClick: () => setCreating(true),
                        icon: <PlusIcon size={16} weight="bold" />,
                    }}
                />

                {links.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 mb-5">
                        <Stat label="Links" value={links.length} />
                        <Stat label="Still live" value={links.filter((l) => !l.is_expired).length} />
                        <Stat label="Taps" value={totalClicks} />
                    </div>
                )}

                {error && (
                    <div className="mb-5 flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3">
                        <WarningCircleIcon size={20} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
                        <p className="text-rose-700 text-sm font-body">
                            {error instanceof Error ? error.message : 'Could not load your links.'}
                        </p>
                    </div>
                )}

                <FilterBar>
                    <SearchBar value={search} onChange={setSearch} placeholder="Search links…" />
                </FilterBar>

                <DataTable
                    data={rows}
                    columns={columns}
                    rowKey={(l) => l.id}
                    defaultSortKey="clicks"
                    defaultSortDir="desc"
                    isLoading={isLoading}
                    onRowClick={(l) => setEditing(l)}
                    emptyState={
                        <div className="flex flex-col items-center text-center py-16">
                            <LinkSimpleIcon size={40} className="text-neutral-gray/50" />
                            <h3 className="text-text-dark font-semibold font-body mt-4">
                                {links.length === 0 ? 'No links yet' : 'Nothing matches that'}
                            </h3>
                            <p className="text-neutral-gray text-sm mt-1.5 font-body max-w-sm">
                                {links.length === 0
                                    ? 'Make one, drop it into a campaign, and every tap is counted here.'
                                    : 'Try a different search.'}
                            </p>
                        </div>
                    }
                />
            </div>

            {creating && (
                <LinkDialog onClose={() => setCreating(false)} onSaved={() => { setCreating(false); void refetch(); }} />
            )}

            {editing && (
                <LinkDialog
                    link={editing}
                    onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); void refetch(); }}
                />
            )}
        </div>
    );
}

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-2xl border border-[#f0e8d8] bg-neutral-card px-4 py-3">
            <p className="text-neutral-gray text-xs font-body">{label}</p>
            <p className="text-text-dark text-xl font-semibold font-body tabular-nums mt-0.5">
                {value.toLocaleString()}
            </p>
        </div>
    );
}
