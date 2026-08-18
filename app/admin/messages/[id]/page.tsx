'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, CheckIcon, EyeIcon, RobotIcon } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { messagingAdminService } from '@/lib/api/services/messaging.service';
import type { StaffMessageReceipt } from '@/types/messaging';

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

    if (isLoading || !message) {
        return <p className="p-6 font-body text-sm text-neutral-gray">Loading…</p>;
    }

    const stats = message.stats;
    const receipts = message.recipients ?? [];

    return (
        <div className="p-4 sm:p-6 max-w-4xl mx-auto">
            <Link
                href="/admin/messages"
                className="inline-flex items-center gap-1.5 font-body text-sm text-neutral-gray hover:text-brand-dark mb-4"
            >
                <ArrowLeftIcon size={16} />
                Messages
            </Link>

            <div className="rounded-2xl bg-neutral-card shadow-sm p-5 mb-5">
                <div className="flex items-start justify-between gap-3">
                    <h1 className="font-brand text-xl text-brand-dark">
                        {message.subject ?? 'Message'}
                    </h1>
                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-neutral-light text-[10px] font-body text-neutral-gray">
                        {message.kind_label}
                    </span>
                </div>

                <p className="font-body text-sm text-brand-dark whitespace-pre-line mt-3 leading-relaxed">
                    {message.body}
                </p>

                <p className="font-body text-[11px] text-neutral-gray mt-3 flex items-center gap-1">
                    {message.is_automatic && <RobotIcon size={12} />}
                    {message.is_automatic ? 'Sent automatically by a rule' : (message.sender?.name ?? 'Someone')}
                </p>
            </div>

            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    <Tile label="Sent to" value={stats.total} />
                    <Tile label="Read" value={stats.read} of={stats.total} />
                    {/* Only meaningful when it was asked for — otherwise this
                        reads 0 of 40 forever and looks like a fault. */}
                    {message.requires_acknowledgement && (
                        <Tile label="Acknowledged" value={stats.acknowledged} of={stats.total} />
                    )}
                    <Tile label="Replied" value={stats.replied} of={stats.total} />
                    {stats.sms_sent > 0 && <Tile label="Texted" value={stats.sms_sent} />}
                </div>
            )}

            <h2 className="font-body font-semibold text-brand-dark mb-3">Who has seen it</h2>

            <ul className="space-y-2">
                {receipts.map((receipt) => (
                    <ReceiptRow key={receipt.id} receipt={receipt} />
                ))}
            </ul>
        </div>
    );
}

function Tile({ label, value, of }: { label: string; value: number; of?: number }) {
    return (
        <div className="rounded-2xl bg-neutral-card shadow-sm p-4">
            <p className="font-body text-[11px] text-neutral-gray">{label}</p>
            <p className="font-body text-xl font-semibold text-brand-dark">
                {value}
                {of !== undefined && <span className="text-sm text-neutral-gray"> of {of}</span>}
            </p>
        </div>
    );
}

function ReceiptRow({ receipt }: { receipt: StaffMessageReceipt }) {
    return (
        <li className="rounded-2xl bg-neutral-card shadow-sm p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="font-body text-sm font-semibold text-brand-dark">
                        {receipt.user.name ?? 'Unknown'}
                    </p>
                    <p className="font-body text-[11px] text-neutral-gray">
                        {receipt.user.role?.replace(/_/g, ' ') ?? '—'}
                        {receipt.branch?.name ? ` · ${receipt.branch.name}` : ''}
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    {receipt.read_at ? (
                        <span className="flex items-center gap-1 text-[11px] font-body text-secondary">
                            <EyeIcon size={13} weight="fill" />
                            Read
                        </span>
                    ) : (
                        <span className="text-[11px] font-body text-neutral-gray">Not read</span>
                    )}

                    {receipt.acknowledged_at && (
                        <span className="flex items-center gap-1 text-[11px] font-body text-secondary">
                            <CheckIcon size={13} weight="bold" />
                            Acknowledged
                        </span>
                    )}
                </div>
            </div>

            {(receipt.quick_reply || receipt.reply_body) && (
                <p className="mt-2 rounded-xl bg-neutral-light/60 px-3 py-2 font-body text-xs text-brand-dark">
                    {receipt.quick_reply && <strong>{receipt.quick_reply}</strong>}
                    {receipt.quick_reply && receipt.reply_body && ' — '}
                    {receipt.reply_body}
                </p>
            )}

            {receipt.sms_status && receipt.sms_status !== 'sent' && (
                <p className="mt-2 font-body text-[11px] text-neutral-gray">
                    SMS: {receipt.sms_status.replace(/_/g, ' ')}
                </p>
            )}
        </li>
    );
}
