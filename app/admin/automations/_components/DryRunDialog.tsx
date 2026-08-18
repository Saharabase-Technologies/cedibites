'use client';

import { InventoryModal, PrimaryButton } from '@/app/inventory/_components';
import { useAutomationDryRun, useAutomationMutations } from '@/lib/api/hooks/useAutomations';
import { GHS } from '@/lib/sms/cost';
import { toast } from '@/lib/utils/toast';
import type { AutomationRule } from '@/types/automation';

/**
 * What this rule would have done, against real orders, having sent nothing.
 *
 * The screen that stands between a rule and the customer base. It exists to
 * catch the rule that fires on every order, and it catches it for free — the
 * alternative is finding out from four thousand texts.
 *
 * Switching the rule on lives here rather than on the list, so the decision is
 * made with the numbers in front of you rather than from a row in a table.
 */

const REASON_LABELS: Record<string, string> = {
    cooldown: 'Too soon after another message',
    lower_priority: 'A higher-priority rule got there first',
    lifetime_cap: 'Already had it the maximum number of times',
    not_sampled: 'Outside the sample',
    feature_off: 'Automation switched off',
    order_cancelled: 'Order was cancelled',
};

export function DryRunDialog({
    rule,
    onClose,
}: {
    rule: AutomationRule | null;
    onClose: () => void;
}) {
    const { dryRun, isRunning } = useAutomationDryRun(rule?.id ?? null, rule !== null);
    const { toggle } = useAutomationMutations();

    const turnOn = async () => {
        if (!rule) return;

        try {
            const updated = await toggle.mutateAsync({ id: rule.id, isActive: true });
            toast.success(updated.is_active ? 'Rule is on.' : 'Rule saved.');
            onClose();
        } catch {
            toast.error('That rule could not be switched on.');
        }
    };

    return (
        <InventoryModal isOpen={rule !== null} onClose={onClose} title={`Dry run: ${rule?.name ?? ''}`} size="lg">
            {isRunning || !dryRun ? (
                <p className="text-neutral-gray text-sm font-body py-10 text-center">
                    Replaying the last 30 days…
                </p>
            ) : (
                <div className="space-y-5">
                    <p className="text-neutral-gray text-sm font-body">
                        Against the last <strong className="text-text-dark">{dryRun.days} days</strong>,{' '}
                        {dryRun.orders_examined.toLocaleString()} orders. Nothing was sent.
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <Figure value={dryRun.matched} label="Matched the rule" />
                        <Figure value={dryRun.would_send} label="Would have sent" strong />
                        <Figure value={dryRun.people_reached} label="Different people" />
                        {/*
                            The figure that judges the cooldown. A rule reaching
                            3 people 40 times and one reaching 300 people 40
                            times are identical in the totals and only one is a
                            problem.
                        */}
                        <Figure value={dryRun.busiest_recipient} label="Most to one person" />
                    </div>

                    <div className="rounded-xl bg-neutral-light/60 px-4 py-3">
                        <p className="text-text-dark text-sm font-body">
                            About <strong>{GHS(dryRun.estimated_cost)}</strong> over {dryRun.days} days
                            {dryRun.segments_per_message > 1 && (
                                <> · {dryRun.segments_per_message} texts per person</>
                            )}
                        </p>
                    </div>

                    {dryRun.busiest_recipient >= 4 && (
                        <p className="text-warning text-xs font-body">
                            One person would have had {dryRun.busiest_recipient} messages in {dryRun.days} days.
                            Consider a longer gap or a lower share.
                        </p>
                    )}

                    {Object.keys(dryRun.suppressed).length > 0 && (
                        <div>
                            {/* The gap between matched and would-send is the
                                guardrails working, not the rule underperforming. */}
                            <p className="text-neutral-gray text-xs font-body mb-2">Held back:</p>
                            <div className="rounded-xl border border-[#f0e8d8] overflow-hidden">
                                {Object.entries(dryRun.suppressed).map(([reason, count]) => (
                                    <div
                                        key={reason}
                                        className="flex items-center justify-between px-3 py-2 text-xs font-body border-b border-[#f0e8d8] last:border-0"
                                    >
                                        <span className="text-neutral-gray">{REASON_LABELS[reason] ?? reason}</span>
                                        <span className="text-text-dark font-semibold tabular-nums">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {dryRun.sample.length > 0 && (
                        <div>
                            <p className="text-neutral-gray text-xs font-body mb-2">
                                First few it would have reached:
                            </p>
                            <div className="rounded-xl border border-[#f0e8d8] overflow-hidden">
                                {dryRun.sample.map((row, i) => (
                                    <div
                                        key={`${row.order_id}-${i}`}
                                        className="flex items-center justify-between px-3 py-2 text-xs font-body border-b border-[#f0e8d8] last:border-0"
                                    >
                                        <span className="text-text-dark">{row.name || 'No name'}</span>
                                        <span className="text-neutral-gray">{row.phone}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <p className="text-neutral-gray text-xs font-body leading-relaxed">
                        This ignores your other rules, so the real number will be lower. Every rule
                        shares one cooldown between them.
                    </p>

                    <div className="flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 text-sm font-body text-neutral-gray hover:text-text-dark transition-colors cursor-pointer"
                        >
                            Close
                        </button>
                        {!rule?.is_active && (
                            <PrimaryButton
                                onClick={turnOn}
                                disabled={toggle.isPending}
                                className="w-auto px-5"
                            >
                                {toggle.isPending ? 'Switching on…' : 'Switch this rule on'}
                            </PrimaryButton>
                        )}
                    </div>
                </div>
            )}
        </InventoryModal>
    );
}

function Figure({ value, label, strong }: { value: number; label: string; strong?: boolean }) {
    return (
        <div className="rounded-xl bg-neutral-light/60 px-3 py-2.5">
            <p className={`text-lg font-bold font-body tabular-nums ${strong ? 'text-primary' : 'text-text-dark'}`}>
                {value.toLocaleString()}
            </p>
            <p className="text-neutral-gray text-[11px] font-body leading-tight mt-0.5">{label}</p>
        </div>
    );
}
