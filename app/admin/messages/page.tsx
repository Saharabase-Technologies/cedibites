'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChatCircleTextIcon, PaperPlaneTiltIcon, RobotIcon } from '@phosphor-icons/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    PageHeader,
    FilterBar,
    SearchBar,
    FilterSelect,
    DataTable,
    type DataTableColumn,
} from '@/app/inventory/_components';
import { StaffCommsTabNav } from '@/app/admin/components/StaffCommsTabNav';
import { messagingAdminService } from '@/lib/api/services/messaging.service';
import type { StaffMessage, StaffMessageKind } from '@/types/messaging';
import { ComposeDialog } from './_components/ComposeDialog';

const KIND_OPTIONS: { value: StaffMessageKind; label: string }[] = [
    { value: 'notice', label: 'Notice' },
    { value: 'caution', label: 'Caution' },
    { value: 'direct', label: 'Direct' },
    { value: 'staff_query', label: 'Staff query' },
];

export default function AdminMessagesPage() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const [composeOpen, setComposeOpen] = useState(false);
    const [sentNote, setSentNote] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [kind, setKind] = useState('');

    const { data: messages, isLoading } = useQuery({
        queryKey: ['admin-staff-messages'],
        queryFn: () => messagingAdminService.list().then((response) => response.data),
    });

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();

        return (messages ?? []).filter((message) => {
            if (kind && message.kind !== kind) return false;
            if (!term) return true;
            return (
                (message.subject ?? '').toLowerCase().includes(term) ||
                message.body.toLowerCase().includes(term)
            );
        });
    }, [messages, search, kind]);

    const columns: DataTableColumn<StaffMessage>[] = [
        {
            key: 'subject',
            header: 'Message',
            sortValue: (m) => (m.subject ?? m.body).toLowerCase(),
            cell: (m) => (
                <div className="min-w-0">
                    <p className="text-text-dark font-semibold font-body truncate">
                        {m.subject ?? m.body.slice(0, 48)}
                    </p>
                    <p className="text-neutral-gray text-xs font-body truncate max-w-md mt-0.5">{m.body}</p>
                </div>
            ),
        },
        {
            key: 'kind',
            header: 'Kind',
            sortValue: (m) => m.kind,
            cell: (m) => <KindBadge kind={m.kind} label={m.kind_label} />,
        },
        {
            key: 'sender',
            header: 'From',
            hideBelow: 'md',
            sortValue: (m) => (m.is_automatic ? 'automatic' : (m.sender?.name ?? '')),
            cell: (m) => (
                <span className="flex items-center gap-1 text-sm font-body text-neutral-gray">
                    {/* A rule sent it, not a person. Saying so stops an automatic
                        caution reading as a personal rebuke. */}
                    {m.is_automatic && <RobotIcon size={13} />}
                    {m.is_automatic ? 'Automatic' : (m.sender?.name ?? 'Someone')}
                </span>
            ),
        },
        {
            key: 'reach',
            header: 'Sent to',
            align: 'right',
            sortValue: (m) => m.recipient_count,
            cell: (m) => (
                <span className="text-text-dark text-sm font-body">
                    {m.recipient_count} {m.recipient_count === 1 ? 'person' : 'people'}
                </span>
            ),
        },
        {
            key: 'sent_at',
            header: 'Sent',
            hideBelow: 'lg',
            align: 'right',
            sortValue: (m) => m.sent_at ?? '',
            cell: (m) => (
                <span className="text-neutral-gray text-xs font-body">
                    {m.sent_at ? new Date(m.sent_at).toLocaleString() : '—'}
                </span>
            ),
        },
    ];

    return (
        <div className="h-full overflow-y-auto bg-neutral-light">
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
                <div className="mb-5">
                    <StaffCommsTabNav />
                </div>

                <PageHeader
                    title="Staff messages"
                    subtitle="Reaches people inside the app they already work in."
                    action={{
                        label: 'New message',
                        onClick: () => setComposeOpen(true),
                        icon: <PaperPlaneTiltIcon size={16} weight="fill" />,
                    }}
                />

                {sentNote && (
                    <div className="mb-5 flex items-start gap-3 bg-secondary-light/50 border border-secondary/20 rounded-2xl px-4 py-3">
                        <ChatCircleTextIcon size={18} weight="fill" className="text-secondary shrink-0 mt-0.5" />
                        <p className="font-body text-sm text-text-dark">{sentNote}</p>
                    </div>
                )}

                <FilterBar>
                    <SearchBar value={search} onChange={setSearch} placeholder="Search messages…" />
                    <FilterSelect
                        value={kind}
                        onChange={setKind}
                        options={KIND_OPTIONS}
                        placeholder="All kinds"
                    />
                </FilterBar>

                <DataTable
                    data={filtered}
                    columns={columns}
                    rowKey={(m) => m.id}
                    isLoading={isLoading}
                    defaultSortKey="sent_at"
                    onRowClick={(m) => router.push(`/admin/messages/${m.id}`)}
                    emptyState={
                        <div className="flex flex-col items-center text-center py-16">
                            <ChatCircleTextIcon size={34} className="text-neutral-gray mb-3" />
                            <p className="font-body text-sm text-neutral-gray">
                                {search || kind ? 'No messages match that.' : 'Nothing sent yet.'}
                            </p>
                        </div>
                    }
                />
            </div>

            <ComposeDialog
                isOpen={composeOpen}
                onClose={() => setComposeOpen(false)}
                onSent={(count) => {
                    setSentNote(`Sent to ${count} ${count === 1 ? 'person' : 'people'}.`);
                    queryClient.invalidateQueries({ queryKey: ['admin-staff-messages'] });
                }}
            />
        </div>
    );
}

function KindBadge({ kind, label }: { kind: StaffMessageKind; label: string }) {
    // A caution is the only kind that takes over somebody's screen, so it is the
    // only one that gets a loud colour here.
    const tone =
        kind === 'caution'
            ? 'bg-primary-light text-brand-dark border-primary/40'
            : kind === 'staff_query'
              ? 'bg-secondary-light text-secondary border-secondary/30'
              : 'bg-neutral-light text-neutral-gray border-[#e3ddd0]';

    return (
        <span className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-body ${tone}`}>
            {label}
        </span>
    );
}
