'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    ArrowLeftIcon,
    FlaskIcon,
    PowerIcon,
    WarningCircleIcon,
} from '@phosphor-icons/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { messagingRuleService } from '@/lib/api/services/messaging.service';
import type { DryRunResult, StaffMessageRule } from '@/types/messaging';

/**
 * The automatic rules.
 *
 * Two things this screen must never let happen: a rule switched on without
 * anybody having seen what it would send, and a screen full of live rules
 * sending nothing with no explanation. Hence the dry-run gate on the toggle, and
 * the global kill-switch banner at the top.
 */
export default function MessageRulesPage() {
    const queryClient = useQueryClient();
    const [dryRun, setDryRun] = useState<{ rule: StaffMessageRule; result: DryRunResult } | null>(null);
    const [busy, setBusy] = useState<number | null>(null);

    const { data } = useQuery({
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

    return (
        <div className="p-4 sm:p-6 max-w-4xl mx-auto">
            <Link
                href="/admin/messages"
                className="inline-flex items-center gap-1.5 font-body text-sm text-neutral-gray hover:text-brand-dark mb-4"
            >
                <ArrowLeftIcon size={16} />
                Messages
            </Link>

            <h1 className="font-brand text-2xl text-brand-dark">Automatic rules</h1>
            <p className="font-body text-sm text-neutral-gray mt-1 mb-5">
                Rules that send a message on their own when something measurable goes wrong.
            </p>

            {/* Without this, a list of live rules sending nothing is inexplicable
                and somebody concludes the feature is broken. */}
            {!automationEnabled && (
                <div className="flex items-start gap-2.5 rounded-2xl bg-warning/10 border border-warning/20 p-4 mb-5">
                    <WarningCircleIcon size={18} weight="fill" className="text-warning shrink-0 mt-0.5" />
                    <div>
                        <p className="font-body text-sm font-semibold text-brand-dark">
                            Automation is switched off globally
                        </p>
                        <p className="font-body text-xs text-neutral-gray mt-0.5">
                            Rules still run and still record what they would have done — nothing is sent to
                            anybody. Set STAFF_MESSAGING_AUTOMATION_ENABLED=true to go live.
                        </p>
                    </div>
                </div>
            )}

            <ul className="space-y-3">
                {rules.map((rule) => (
                    <li key={rule.id} className="rounded-2xl bg-neutral-card shadow-sm p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-body font-semibold text-brand-dark">{rule.name}</p>
                                    <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-body ${
                                            rule.is_active
                                                ? 'bg-secondary-light text-secondary'
                                                : 'bg-neutral-light text-neutral-gray'
                                        }`}
                                    >
                                        {rule.is_active ? 'Live' : 'Off'}
                                    </span>
                                </div>

                                <p className="font-body text-xs text-neutral-gray mt-1">{rule.event_label}</p>

                                {/* Matched and held-back beside sent. "Matched 300,
                                    sent 4" reads as the guardrails working; "sent 4"
                                    alone reads as broken. */}
                                <p className="font-body text-[11px] text-neutral-gray/80 mt-2">
                                    Last 30 days — matched {rule.stats.matched} · sent {rule.stats.sent} ·{' '}
                                    {rule.stats.held_back} held back
                                </p>
                            </div>

                            <div className="flex shrink-0 gap-2">
                                <button
                                    type="button"
                                    onClick={() => openDryRun(rule)}
                                    disabled={busy === rule.id}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-light hover:bg-primary-light text-xs font-body text-brand-dark transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                    <FlaskIcon size={14} />
                                    Dry run
                                </button>

                                {/* Switching OFF is one click; switching ON goes
                                    through the dry-run dialog, so the decision is
                                    made with the numbers in front of you. */}
                                {rule.is_active && (
                                    <button
                                        type="button"
                                        onClick={() => toggle(rule)}
                                        disabled={busy === rule.id}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-error/10 hover:bg-error/20 text-xs font-body text-error transition-colors disabled:opacity-50 cursor-pointer"
                                    >
                                        <PowerIcon size={14} />
                                        Switch off
                                    </button>
                                )}
                            </div>
                        </div>
                    </li>
                ))}
            </ul>

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-darker/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-neutral-card shadow-xl">
                <div className="px-5 py-4 border-b border-black/5">
                    <p className="font-body font-semibold text-brand-dark">{rule.name}</p>
                    <p className="font-body text-xs text-neutral-gray mt-0.5">
                        Replayed against the last {result.days} days. Nothing was sent or saved.
                    </p>
                </div>

                <div className="px-5 py-4 grid grid-cols-2 gap-3">
                    <Stat label="Matched" value={result.matched} />
                    <Stat label="Would send" value={result.would_send} />
                    <Stat label="Held back by cooldown" value={result.held_back} />
                    <Stat label="People reached" value={result.people_reached} />
                    <Stat label="Busiest one person" value={result.busiest_recipient} emphasis={noisy} />
                </div>

                {noisy && (
                    <p className="mx-5 mb-4 rounded-xl bg-warning/10 border border-warning/20 p-3 font-body text-xs text-brand-dark">
                        One person would have received {result.busiest_recipient} messages in this window.
                        Consider a longer cooldown before switching this on.
                    </p>
                )}

                {result.samples.length > 0 && (
                    <div className="px-5 pb-4">
                        <p className="font-body text-xs font-semibold text-brand-dark mb-2">
                            What it would have said
                        </p>
                        <ul className="space-y-2">
                            {result.samples.map((sample, index) => (
                                <li
                                    key={index}
                                    className="rounded-xl bg-neutral-light/60 p-3 font-body text-xs text-brand-dark"
                                >
                                    <span className="text-neutral-gray">To {sample.to}: </span>
                                    {sample.body}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <p className="px-5 pb-3 font-body text-[11px] text-neutral-gray">
                    This is a ceiling — the hourly cap and other rules competing for the same order are not
                    modelled.
                </p>

                <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-black/5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-2 rounded-xl bg-neutral-light hover:bg-neutral-light/70 text-sm font-body text-brand-dark transition-colors cursor-pointer"
                    >
                        Close
                    </button>

                    {!rule.is_active && (
                        <button
                            type="button"
                            onClick={onSwitchOn}
                            disabled={busy}
                            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-brand-darker text-sm font-body font-semibold transition-colors disabled:opacity-60 cursor-pointer"
                        >
                            {busy
                                ? 'Switching on…'
                                : automationEnabled
                                  ? 'Switch this rule on'
                                  : 'Switch on (still held by the global switch)'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function Stat({ label, value, emphasis }: { label: string; value: number; emphasis?: boolean }) {
    return (
        <div className="rounded-xl bg-neutral-light/60 p-3">
            <p className="font-body text-[11px] text-neutral-gray">{label}</p>
            <p
                className={`font-body text-lg font-semibold ${emphasis ? 'text-warning' : 'text-brand-dark'}`}
            >
                {value}
            </p>
        </div>
    );
}
