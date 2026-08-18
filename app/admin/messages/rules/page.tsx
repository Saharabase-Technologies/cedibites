'use client';

import { useState } from 'react';
import { FlaskIcon, PowerIcon, RobotIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    PageHeader,
    DataTable,
    InventoryModal,
    PrimaryButton,
    type DataTableColumn,
} from '@/app/inventory/_components';
import { StaffCommsTabNav } from '@/app/admin/components/StaffCommsTabNav';
import { messagingRuleService } from '@/lib/api/services/messaging.service';
import type { DryRunResult, StaffMessageRule } from '@/types/messaging';

/**
 * The automatic rules.
 *
 * Two things this screen must never allow: a rule switched on without anybody
 * seeing what it would send, and a list of live rules sending nothing with no
 * explanation. Hence the dry-run gate on switching on, and the kill-switch
 * banner.
 */
export default function MessageRulesPage() {
    const queryClient = useQueryClient();
    const [dryRun, setDryRun] = useState<{ rule: StaffMessageRule; result: DryRunResult } | null>(null);
    const [busy, setBusy] = useState<number | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ['staff-message-rules'],
        queryFn: () => messagingRuleService.list().then((response) => response.data),
    });

    const rules = data?.rules ?? [];
    const automationEnabled = data?.automation_enabled ?? false;

    async function openDryRun(rule: StaffMessageRule) {
        setBusy(rule.id);
        try {
            const response = await messagingRuleService.dryRun(rule.id, 30);
            setDryRun({ rule, result: response.data });
        } finally {
            setBusy(null);
        }
    }

    async function toggle(rule: StaffMessageRule) {
        setBusy(rule.id);
        try {
            await messagingRuleService.toggle(rule.id);
            queryClient.invalidateQueries({ queryKey: ['staff-message-rules'] });
            setDryRun(null);
        } finally {
            setBusy(null);
        }
    }

    const columns: DataTableColumn<StaffMessageRule>[] = [
        {
            key: 'name',
            header: 'Rule',
            sortValue: (r) => r.name.toLowerCase(),
            cell: (r) => (
                <div className="min-w-0">
                    <p className="text-text-dark font-semibold font-body truncate">{r.name}</p>
                    <p className="text-neutral-gray text-xs font-body truncate max-w-md mt-0.5">
                        {r.event_label}
                    </p>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            sortValue: (r) => (r.is_active ? 'live' : 'off'),
            cell: (r) => (
                <span
                    className={`inline-block px-2 py-0.5 rounded-full border text-[11px] font-body ${
                        r.is_active
                            ? 'bg-secondary-light text-secondary border-secondary/25'
                            : 'bg-neutral-light text-neutral-gray border-[#e3ddd0]'
                    }`}
                >
                    {r.is_active ? 'Live' : 'Off'}
                </span>
            ),
        },
        {
            key: 'stats',
            header: 'Last 30 days',
            hideBelow: 'md',
            sortValue: (r) => r.stats.sent,
            // Matched and held-back beside sent. "Matched 300, sent 4" reads as
            // the guardrails working; "sent 4" alone reads as broken and
            // somebody switches it off.
            cell: (r) => (
                <span className="text-neutral-gray text-xs font-body">
                    matched {r.stats.matched} · sent {r.stats.sent} · {r.stats.held_back} held back
                </span>
            ),
        },
        {
            key: 'actions',
            header: '',
            align: 'right',
            cell: (r) => (
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            openDryRun(r);
                        }}
                        disabled={busy === r.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-light border border-[#e3ddd0] text-xs font-body text-text-dark hover:border-neutral-gray/50 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        <FlaskIcon size={14} />
                        Dry run
                    </button>

                    {/* Switching OFF is one click; switching ON goes through the
                        dry-run dialog, so the decision is made with the numbers
                        in front of you. */}
                    {r.is_active && (
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                toggle(r);
                            }}
                            disabled={busy === r.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-error/8 border border-error/25 text-xs font-body text-error hover:border-error/45 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            <PowerIcon size={14} />
                            Switch off
                        </button>
                    )}
                </div>
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
                    title="Automatic rules"
                    subtitle="Messages that send themselves when something measurable goes wrong."
                />

                {/* Without this, a list of live rules sending nothing is
                    inexplicable and somebody concludes the feature is broken. */}
                {!automationEnabled && (
                    <div className="mb-5 flex items-start gap-3 bg-neutral-card border border-[#e3ddd0] rounded-2xl px-4 py-3">
                        <WarningCircleIcon size={18} weight="fill" className="text-primary shrink-0 mt-0.5" />
                        <div>
                            <p className="font-body text-sm font-semibold text-text-dark">
                                Automation is switched off globally
                            </p>
                            <p className="font-body text-xs text-neutral-gray mt-0.5">
                                Rules still run and still record what they would have done — nothing reaches
                                anybody. Turn it on under Platform → Settings.
                            </p>
                        </div>
                    </div>
                )}

                <DataTable
                    data={rules}
                    columns={columns}
                    rowKey={(r) => r.id}
                    isLoading={isLoading}
                    emptyState={
                        <div className="flex flex-col items-center text-center py-16">
                            <RobotIcon size={34} className="text-neutral-gray mb-3" />
                            <p className="font-body text-sm text-neutral-gray">No rules yet.</p>
                        </div>
                    }
                />
            </div>

            {dryRun && (
                <DryRunDialog
                    rule={dryRun.rule}
                    result={dryRun.result}
                    automationEnabled={automationEnabled}
                    busy={busy === dryRun.rule.id}
                    onClose={() => setDryRun(null)}
                    onSwitchOn={() => toggle(dryRun.rule)}
                />
            )}
        </div>
    );
}

function DryRunDialog({
    rule,
    result,
    automationEnabled,
    busy,
    onClose,
    onSwitchOn,
}: {
    rule: StaffMessageRule;
    result: DryRunResult;
    automationEnabled: boolean;
    busy: boolean;
    onClose: () => void;
    onSwitchOn: () => void;
}) {
    // The figure that decides whether a rule is safe. Three people reached forty
    // times and three hundred reached forty times look identical in the totals.
    const noisy = result.busiest_recipient >= 4;

    return (
        <InventoryModal isOpen onClose={onClose} title={rule.name} size="lg">
            <p className="font-body text-xs text-neutral-gray mb-4">
                Replayed against the last {result.days} days. Nothing was sent or saved.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Stat label="Matched" value={result.matched} />
                <Stat label="Would send" value={result.would_send} />
                <Stat label="Held back by cooldown" value={result.held_back} />
                <Stat label="People reached" value={result.people_reached} />
                <Stat label="Busiest one person" value={result.busiest_recipient} emphasis={noisy} />
            </div>

            {noisy && (
                <p className="mt-4 rounded-xl bg-neutral-light border border-[#e3ddd0] p-3 font-body text-xs text-text-dark">
                    One person would have received {result.busiest_recipient} messages in this window.
                    Consider a longer cooldown before switching this on.
                </p>
            )}

            {result.samples.length > 0 && (
                <div className="mt-4">
                    <p className="font-body text-xs font-semibold text-text-dark mb-2">
                        What it would have said
                    </p>
                    <ul className="space-y-2">
                        {result.samples.map((sample, index) => (
                            <li
                                key={index}
                                className="rounded-xl bg-neutral-light p-3 font-body text-xs text-text-dark"
                            >
                                <span className="text-neutral-gray">To {sample.to}: </span>
                                {sample.body}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <p className="mt-4 font-body text-[11px] text-neutral-gray">
                This is a ceiling — the hourly cap and other rules competing for the same order are not
                modelled.
            </p>

            {!rule.is_active && (
                <PrimaryButton onClick={onSwitchOn} disabled={busy} className="mt-4">
                    {busy
                        ? 'Switching on…'
                        : automationEnabled
                          ? 'Switch this rule on'
                          : 'Switch on (still held by the global switch)'}
                </PrimaryButton>
            )}
        </InventoryModal>
    );
}

function Stat({ label, value, emphasis }: { label: string; value: number; emphasis?: boolean }) {
    return (
        <div className="rounded-xl bg-neutral-light border border-[#e3ddd0] p-3">
            <p className="font-body text-[11px] text-neutral-gray">{label}</p>
            <p
                className={`font-body text-lg font-semibold ${emphasis ? 'text-primary' : 'text-text-dark'}`}
            >
                {value}
            </p>
        </div>
    );
}
