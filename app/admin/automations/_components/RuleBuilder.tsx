'use client';

import { useEffect, useMemo, useState } from 'react';
import { WarningCircleIcon } from '@phosphor-icons/react';
import {
    InventoryModal,
    FormField,
    TextInput,
    Textarea,
    Select,
    PrimaryButton,
} from '@/app/inventory/_components';
import { useAutomationOptions, useAutomationMutations } from '@/lib/api/hooks/useAutomations';
import { measureMessage } from '@/lib/sms/meter';
import { GHSRate } from '@/lib/sms/cost';
import { toast } from '@/lib/utils/toast';
import type { AutomationEventValue, AutomationRule } from '@/types/automation';

/**
 * Writing a rule, as a sentence.
 *
 * The test in the plan: every rule should read back as something an operator
 * would say out loud — "when somebody orders for the first time, wait three
 * hours, then ask them how it went, and never more than once every three days."
 * The sentence at the top is not decoration; it is the thing being edited, and
 * if it stops reading like English the form is wrong.
 *
 * Saving never switches a rule on. That is a separate act with its own button
 * on the list, because it is the moment real messages start going to real
 * people.
 */

/** How each event's own setting reads inside the sentence. */
const CONFIG_LABELS: Record<string, { before: string; after: string; placeholder: string }> = {
    order_number: { before: 'on their', after: 'order', placeholder: '10' },
    gap_days: { before: 'after going quiet for', after: 'days or more', placeholder: '60' },
    minimum_amount: { before: 'and the order is worth over GHS', after: '', placeholder: '200' },
};

export function RuleBuilder({
    isOpen,
    onClose,
    rule,
}: {
    isOpen: boolean;
    onClose: () => void;
    /** Editing an existing rule, or null to write a new one. */
    rule?: AutomationRule | null;
}) {
    const { events, mergeFields, cooldownDays, ratePerSegment } = useAutomationOptions();
    const { create, update } = useAutomationMutations();

    const [name, setName] = useState('');
    const [event, setEvent] = useState<AutomationEventValue>('first_order');
    const [config, setConfig] = useState<Record<string, string>>({});
    const [message, setMessage] = useState('');
    const [delayMinutes, setDelayMinutes] = useState(180);
    const [sampleRate, setSampleRate] = useState(100);
    const [maxPerCustomer, setMaxPerCustomer] = useState<string>('');

    useEffect(() => {
        if (!isOpen) return;

        setName(rule?.name ?? '');
        setEvent(rule?.event ?? 'first_order');
        setConfig(
            Object.fromEntries(
                Object.entries(rule?.event_config ?? {}).map(([k, v]) => [k, v === null ? '' : String(v)]),
            ),
        );
        setMessage(rule?.message ?? '');
        setDelayMinutes(rule?.delay_minutes ?? 180);
        setSampleRate(rule?.sample_rate ?? 100);
        setMaxPerCustomer(rule?.max_per_customer ? String(rule.max_per_customer) : '');
    }, [isOpen, rule]);

    const chosen = events.find((e) => e.value === event);
    const requiredKeys = chosen?.config_keys ?? [];

    const metered = useMemo(() => measureMessage(message), [message]);

    const missingConfig = requiredKeys.filter((k) => !config[k]?.trim());
    const canSave = name.trim() !== '' && message.trim() !== '' && missingConfig.length === 0;

    const save = async () => {
        if (!canSave) return;

        const payload = {
            name: name.trim(),
            event,
            event_config: Object.fromEntries(
                requiredKeys.map((k) => [k, config[k] ? Number(config[k]) : null]),
            ),
            message: message.trim(),
            delay_minutes: delayMinutes,
            sample_rate: sampleRate,
            max_per_customer: maxPerCustomer ? Number(maxPerCustomer) : null,
        };

        try {
            if (rule) {
                await update.mutateAsync({ id: rule.id, payload });
                toast.success('Rule saved.');
            } else {
                await create.mutateAsync(payload);
                // Said on creation because the button says "Save", not "Start".
                toast.success('Rule saved, switched off. Dry-run it before you turn it on.');
            }
            onClose();
        } catch (e) {
            const detail =
                (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                'That rule could not be saved.';
            toast.error(detail);
        }
    };

    const saving = create.isPending || update.isPending;

    return (
        <InventoryModal isOpen={isOpen} onClose={onClose} title={rule ? 'Edit rule' : 'New rule'} size="lg">
            <div className="space-y-5">

                {/* The sentence. If this stops reading like English, the form is wrong. */}
                <div className="rounded-xl bg-neutral-light/60 px-4 py-3">
                    <p className="text-text-dark text-sm font-body leading-relaxed">
                        When somebody{' '}
                        <strong>{(chosen?.label ?? '').toLowerCase()}</strong>
                        {requiredKeys.map((key) => (
                            <span key={key}>
                                {' '}
                                {CONFIG_LABELS[key]?.before}{' '}
                                <strong>{config[key] || '…'}</strong>{' '}
                                {CONFIG_LABELS[key]?.after}
                            </span>
                        ))}
                        , wait <strong>{formatDelay(delayMinutes)}</strong>, then text them
                        {sampleRate < 100 && <> — but only <strong>{sampleRate}%</strong> of them</>}
                        . Never more than once every <strong>{cooldownDays} days</strong>.
                    </p>
                </div>

                <FormField label="Name it" required>
                    <TextInput
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ask after a first order"
                    />
                </FormField>

                <FormField label="What it waits for" required hint={chosen?.description}>
                    <Select value={event} onChange={(e) => setEvent(e.target.value as AutomationEventValue)}>
                        {events.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </Select>
                </FormField>

                {/* Only the settings this event cannot work without. An event with
                    a missing setting matches nothing, so these are required
                    rather than defaulted — there is no sensible guess at which
                    order number somebody meant. */}
                {requiredKeys.map((key) => (
                    <FormField key={key} label={configLabel(key)} required>
                        <TextInput
                            type="number"
                            value={config[key] ?? ''}
                            onChange={(e) => setConfig((c) => ({ ...c, [key]: e.target.value }))}
                            placeholder={CONFIG_LABELS[key]?.placeholder}
                        />
                    </FormField>
                ))}

                <FormField
                    label="The message"
                    required
                    hint={`${metered.characters} characters · ${metered.segments} text${metered.segments === 1 ? '' : 's'} each · ${GHSRate(metered.segments * ratePerSegment)} per person`}
                >
                    <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={3}
                        placeholder="Hi {name}, how was your first order?"
                    />
                </FormField>

                <div className="rounded-xl bg-neutral-light/60 px-3 py-2.5">
                    <p className="text-neutral-gray text-xs font-body mb-1.5">
                        Drop these in and they fill themselves:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {mergeFields.map((f) => (
                            <button
                                key={f.field}
                                type="button"
                                title={f.description}
                                onClick={() => setMessage((m) => `${m}${f.field}`)}
                                className="px-2 py-1 rounded-lg bg-neutral-card text-text-dark text-[11px] font-mono hover:bg-primary/10 transition-colors cursor-pointer"
                            >
                                {f.field}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField label="Wait before sending">
                        <Select value={String(delayMinutes)} onChange={(e) => setDelayMinutes(Number(e.target.value))}>
                            <option value="30">30 minutes</option>
                            <option value="60">1 hour</option>
                            <option value="180">3 hours</option>
                            <option value="360">6 hours</option>
                            <option value="1440">The next day</option>
                        </Select>
                    </FormField>

                    {/* Off by default, per the decision. Built so a busy branch
                        can be turned down without a deploy. */}
                    <FormField label="Ask this share" hint={sampleRate === 100 ? 'Everybody' : `${sampleRate} in 100`}>
                        <Select value={String(sampleRate)} onChange={(e) => setSampleRate(Number(e.target.value))}>
                            <option value="100">Everybody</option>
                            <option value="50">Half</option>
                            <option value="20">One in five</option>
                            <option value="10">One in ten</option>
                        </Select>
                    </FormField>

                    <FormField label="Most times per person" hint="Blank for no limit">
                        <TextInput
                            type="number"
                            value={maxPerCustomer}
                            onChange={(e) => setMaxPerCustomer(e.target.value)}
                            placeholder="—"
                        />
                    </FormField>
                </div>

                <div className="flex gap-3 p-3 rounded-xl bg-info/5 border border-info/20">
                    <WarningCircleIcon size={16} weight="fill" className="text-info shrink-0 mt-0.5" />
                    <p className="text-text-dark text-xs font-body leading-relaxed">
                        Saving does not switch it on. Dry-run it against the last 30 days first —
                        that is what catches a rule that would fire on every order.
                    </p>
                </div>

                <div className="flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 text-sm font-body text-neutral-gray hover:text-text-dark transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <PrimaryButton onClick={save} disabled={!canSave || saving} className="w-auto px-5">
                        {saving ? 'Saving…' : 'Save rule'}
                    </PrimaryButton>
                </div>
            </div>
        </InventoryModal>
    );
}

function configLabel(key: string): string {
    return {
        order_number: 'Which order number',
        gap_days: 'How many days counts as gone quiet',
        minimum_amount: 'Order worth at least (GHS)',
    }[key] ?? key;
}

function formatDelay(minutes: number): string {
    if (minutes < 60) return `${minutes} minutes`;
    if (minutes === 1440) return 'until the next day';
    return `${minutes / 60} hour${minutes === 60 ? '' : 's'}`;
}
