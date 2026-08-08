'use client';

import { useState } from 'react';
import { PlusIcon, WarningCircleIcon, FlaskIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import {
    PageHeader,
    DataTable,
    RowActionsMenu,
    Toggle,
    type DataTableColumn,
} from '@/app/inventory/_components';
import { MarketingTabNav } from '@/app/admin/components/MarketingTabNav';
import { DeleteConfirmDialog } from '@/app/components/ui/DeleteConfirmDialog';
import { useAutomationRules, useAutomationMutations } from '@/lib/api/hooks/useAutomations';
import { toast } from '@/lib/utils/toast';
import { RuleBuilder } from './_components/RuleBuilder';
import { DryRunDialog } from './_components/DryRunDialog';
import type { AutomationRule } from '@/types/automation';

/**
 * Rules that message customers without anybody pressing send.
 *
 * Two things this screen has to be honest about, because both are invisible
 * otherwise: that a rule can be on while the whole feature is off, and that the
 * gap between how often a rule matches and how often it sends is the guardrails
 * working rather than the rule underperforming.
 */
export default function AutomationsPage() {
    const { rules, automationEnabled, cooldownDays, isLoading } = useAutomationRules();
    const { toggle, remove } = useAutomationMutations();

    const [editing, setEditing] = useState<AutomationRule | null>(null);
    const [creating, setCreating] = useState(false);
    const [dryRunning, setDryRunning] = useState<AutomationRule | null>(null);
    const [deleting, setDeleting] = useState<AutomationRule | null>(null);

    const onToggle = async (rule: AutomationRule, next: boolean) => {
        try {
            await toggle.mutateAsync({ id: rule.id, isActive: next });
            toast.success(next ? `${rule.name} is on.` : `${rule.name} switched off.`);
        } catch {
            toast.error('That did not work.');
        }
    };

    const onDelete = async () => {
        if (!deleting) return;
        try {
            await remove.mutateAsync(deleting.id);
            toast.success('Rule deleted.');
        } catch {
            toast.error('That rule could not be deleted.');
        } finally {
            setDeleting(null);
        }
    };

    const columns: DataTableColumn<AutomationRule>[] = [
        {
            key: 'name',
            header: 'Rule',
            cell: (r) => (
                <div className="min-w-0">
                    <p className="text-text-dark font-semibold font-body truncate">{r.name}</p>
                    <p className="text-neutral-gray text-xs font-body mt-0.5 truncate max-w-md">
                        {r.event_label} · {r.message}
                    </p>
                </div>
            ),
        },
        {
            key: 'live',
            header: 'Live',
            cell: (r) => (
                <Toggle checked={r.is_active} onChange={(next) => onToggle(r, next)} />
            ),
        },
        {
            key: 'activity',
            header: 'Matched / sent',
            hideBelow: 'md',
            sortValue: (r) => r.sent_count,
            cell: (r) => (
                <div>
                    <p className="text-text-dark text-sm font-body tabular-nums">
                        {r.matched_count.toLocaleString()} / {r.sent_count.toLocaleString()}
                    </p>
                    {/* The gap is the guardrails, not a fault. Said out loud so
                        nobody reads a low send count as a broken rule. */}
                    {r.matched_count > r.sent_count && (
                        <p className="text-neutral-gray text-xs font-body mt-0.5">
                            {(r.matched_count - r.sent_count).toLocaleString()} held back
                        </p>
                    )}
                </div>
            ),
        },
        {
            key: 'response',
            header: 'Answered',
            hideBelow: 'lg',
            sortValue: (r) => r.response_rate ?? -1,
            cell: (r) => (
                <span className="text-text-dark text-sm font-body tabular-nums">
                    {r.response_rate === null ? '—' : `${r.response_rate}%`}
                </span>
            ),
        },
        {
            key: 'actions',
            header: '',
            cell: (r) => (
                <RowActionsMenu
                    actions={[
                        { label: 'Dry run', icon: <FlaskIcon size={14} />, onClick: () => setDryRunning(r) },
                        { label: 'Edit', icon: <PencilSimpleIcon size={14} />, onClick: () => setEditing(r) },
                        {
                            label: 'Delete',
                            icon: <TrashIcon size={14} />,
                            onClick: () => setDeleting(r),
                            destructive: true,
                        },
                    ]}
                />
            ),
        },
    ];

    const liveRules = rules.filter((r) => r.is_active).length;

    return (
        <div className="h-full overflow-y-auto bg-neutral-light">
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
                <div className="mb-5">
                    <MarketingTabNav />
                </div>

                <PageHeader
                    title="Automations"
                    subtitle="Messages that send themselves when something happens to an order."
                    action={{
                        label: 'New rule',
                        onClick: () => setCreating(true),
                        icon: <PlusIcon size={16} weight="bold" />,
                    }}
                />

                {/*
                    Two switches. A screen full of live rules sending nothing is
                    impossible to explain without saying this here.
                */}
                {!automationEnabled && (
                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-5">
                        <WarningCircleIcon size={18} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-neutral-gray text-sm font-body">
                            Automation is switched off globally, so nothing sends —
                            {liveRules > 0
                                ? ` including the ${liveRules} rule${liveRules === 1 ? '' : 's'} switched on below.`
                                : ' whatever is switched on below.'}{' '}
                            Rules still match real orders and record what they would have done, which is
                            how you judge one before turning it on.
                        </p>
                    </div>
                )}

                <p className="text-neutral-gray text-xs font-body mb-4">
                    Nobody hears from any rule more than once every {cooldownDays} days, across all of them.
                </p>

                <DataTable
                    data={rules}
                    columns={columns}
                    rowKey={(r) => r.id}
                    isLoading={isLoading}
                    emptyState={
                        <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                            <p className="text-text-dark text-sm font-semibold font-body">No rules yet</p>
                            <p className="text-neutral-gray text-xs font-body mt-1 max-w-sm">
                                A rule waits for something — a first order, a first delivery, somebody
                                coming back after a while — and texts them a few hours later.
                            </p>
                        </div>
                    }
                />

                <RuleBuilder isOpen={creating} onClose={() => setCreating(false)} />
                <RuleBuilder isOpen={editing !== null} onClose={() => setEditing(null)} rule={editing} />
                <DryRunDialog rule={dryRunning} onClose={() => setDryRunning(null)} />

                <DeleteConfirmDialog
                    isOpen={deleting !== null}
                    onCancel={() => setDeleting(null)}
                    onConfirm={onDelete}
                    isLoading={remove.isPending}
                    title="Delete this rule?"
                    message="It stops firing immediately. What it has already sent stays in the record."
                    itemName={deleting?.name ?? ''}
                />
            </div>
        </div>
    );
}
