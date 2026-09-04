'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, CheckIcon, EyeIcon, RobotIcon, UsersThreeIcon } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { DataTable, type DataTableColumn } from '@/app/inventory/_components';
import { StaffCommsTabNav } from '@/app/admin/components/StaffCommsTabNav';
import { messagingAdminService } from '@/lib/api/services/messaging.service';
import type { StaffMessageReceipt } from '@/types/messaging';

/**
 * A timestamp short enough to sit in a table cell.
 *
 * Today's appearances show only the clock, because on the day of a send that is
 * the whole question and the date is noise on every row. Anything older carries
 * its date, since "14:20" alone is a lie once a week has passed.
 */
function whenShort(iso: string): string {
    const at = new Date(iso);
    const today = new Date().toDateString() === at.toDateString();

    return at.toLocaleString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        ...(today ? {} : { day: 'numeric', month: 'short' }),
    });
}

/**
 * One message and every receipt.
 *
 * This screen is the actual deterrent. A caution nobody can prove was read
 * changes nothing; "seen by 12 of 40", with names, changes behaviour.
 */
export default function MessageDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    const { data: message, isLoading } = useQuery({
        queryKey: ['admin-staff-message', id],
        queryFn: () => messagingAdminService.show(Number(id)).then((response) => response.data),
    });

    const stats = message?.stats;
    const receipts = message?.recipients ?? [];

    const columns: DataTableColumn<StaffMessageReceipt>[] = [
        {
            key: 'name',
            header: 'Who',
            sortValue: (r) => (r.user.name ?? '').toLowerCase(),
            cell: (r) => (
                <div className="min-w-0">
                    <p className="text-text-dark font-semibold font-body truncate">
                        {r.user.name ?? 'Unknown'}
                    </p>
                    <p className="text-neutral-gray text-xs font-body truncate mt-0.5">
                        {r.user.role?.replace(/_/g, ' ') ?? '—'}
                        {r.branch?.name ? ` · ${r.branch.name}` : ''}
                    </p>
                </div>
            ),
        },
        {
            key: 'shown',
            header: 'On screen',
            sortValue: (r) => (r.shown_at ? 1 : 0),
            // The honest reach figure for anything that takes the screen. A
            // walkthrough is never opened from the bell, so its Read column
            // stays empty until somebody finishes it; this one says whether it
            // ever reached them at all.
            cell: (r) =>
                r.shown_at ? (
                    <span className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-1 text-[11px] font-body text-secondary">
                            <EyeIcon size={13} weight="fill" />
                            {whenShort(r.shown_at)}
                        </span>
                        {r.shown_count > 1 && (
                            <span className="text-[11px] font-body text-neutral-gray tabular-nums">
                                {r.shown_count} times
                            </span>
                        )}
                    </span>
                ) : (
                    <span className="text-[11px] font-body text-neutral-gray">Never</span>
                ),
        },
        {
            key: 'read',
            header: 'Read',
            sortValue: (r) => (r.read_at ? 1 : 0),
            cell: (r) =>
                r.read_at ? (
                    <span className="flex items-center gap-1 text-[11px] font-body text-secondary">
                        <EyeIcon size={13} weight="fill" />
                        Read
                    </span>
                ) : (
                    <span className="text-[11px] font-body text-neutral-gray">Not read</span>
                ),
        },
        {
            key: 'acknowledged',
            header: 'Acknowledged',
            hideBelow: 'md',
            sortValue: (r) => (r.acknowledged_at ? 1 : 0),
            cell: (r) =>
                r.acknowledged_at ? (
                    <span className="flex items-center gap-1 text-[11px] font-body text-secondary">
                        <CheckIcon size={13} weight="bold" />
                        Yes
                    </span>
                ) : (
                    <span className="text-[11px] font-body text-neutral-gray">—</span>
                ),
        },
        {
            key: 'reply',
            header: 'Reply',
            hideBelow: 'lg',
            cell: (r) =>
                r.quick_reply || r.reply_body ? (
                    <span className="text-text-dark text-xs font-body">
                        {r.quick_reply && <strong>{r.quick_reply}</strong>}
                        {r.quick_reply && r.reply_body && ' — '}
                        {r.reply_body}
                    </span>
                ) : (
                    <span className="text-[11px] font-body text-neutral-gray">—</span>
                ),
        },
        {
            key: 'sms',
            header: 'SMS',
            hideBelow: 'lg',
            align: 'right',
            cell: (r) => (
                <span className="text-[11px] font-body text-neutral-gray">
                    {r.sms_status ? r.sms_status.replace(/_/g, ' ') : '—'}
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

                <Link
                    href="/admin/messages"
                    className="inline-flex items-center gap-1.5 font-body text-sm text-neutral-gray hover:text-text-dark mb-4"
                >
                    <ArrowLeftIcon size={16} />
                    All messages
                </Link>

                {isLoading || !message ? (
                    <p className="font-body text-sm text-neutral-gray">Loading…</p>
                ) : (
                    <>
                        <div className="rounded-2xl bg-neutral-card shadow-sm p-5 mb-5">
                            <h1 className="font-brand text-xl font-bold text-text-dark">
                                {message.subject ?? 'Message'}
                            </h1>

                            <p className="font-body text-sm text-text-dark whitespace-pre-line mt-3 leading-relaxed">
                                {message.body}
                            </p>

                            <p className="font-body text-[11px] text-neutral-gray mt-3 flex items-center gap-1">
                                {message.is_automatic && <RobotIcon size={12} />}
                                {message.is_automatic
                                    ? 'Sent automatically by a rule'
                                    : (message.sender?.name ?? 'Someone')}
                            </p>
                        </div>

                        {stats && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                                <Tile label="Sent to" value={stats.total} />
                                {/* Ahead of Read on purpose. For a caution or a
                                    walkthrough this is the number that answers
                                    "did it actually reach them". */}
                                <Tile label="On screen" value={stats.shown} of={stats.total} />
                                <Tile label="Read" value={stats.read} of={stats.total} />
                                {/* Only meaningful when it was asked for — otherwise
                                    this reads 0 of 40 forever and looks like a fault. */}
                                {message.requires_acknowledgement && (
                                    <Tile label="Acknowledged" value={stats.acknowledged} of={stats.total} />
                                )}
                                <Tile label="Replied" value={stats.replied} of={stats.total} />
                                {stats.sms_sent > 0 && <Tile label="Texted" value={stats.sms_sent} />}
                            </div>
                        )}

                        <DataTable
                            data={receipts}
                            columns={columns}
                            rowKey={(r) => r.id}
                            emptyState={
                                <div className="flex flex-col items-center text-center py-16">
                                    <UsersThreeIcon size={34} className="text-neutral-gray mb-3" />
                                    <p className="font-body text-sm text-neutral-gray">No recipients.</p>
                                </div>
                            }
                        />
                    </>
                )}
            </div>
        </div>
    );
}

function Tile({ label, value, of }: { label: string; value: number; of?: number }) {
    return (
        <div className="rounded-2xl bg-neutral-card shadow-sm p-4">
            <p className="font-body text-[11px] text-neutral-gray">{label}</p>
            <p className="font-body text-xl font-semibold text-text-dark">
                {value}
                {of !== undefined && <span className="text-sm text-neutral-gray"> of {of}</span>}
            </p>
        </div>
    );
}
