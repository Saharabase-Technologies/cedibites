'use client';

import { useMemo, useState } from 'react';
import { PaperPlaneTiltIcon, UsersThreeIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import {
    InventoryModal,
    FormField,
    TextInput,
    Textarea,
    Toggle,
    PrimaryButton,
} from '@/app/inventory/_components';
import { messagingAdminService } from '@/lib/api/services/messaging.service';
import { useBranches } from '@/lib/api/hooks/useBranches';
import type { StaffAudience, StaffMessageKind } from '@/types/messaging';
import { PersonPicker } from './PersonPicker';

// Riders and kitchen staff are here as well as the obvious desk roles — the
// people hardest to reach by any other means are exactly the ones this is for.
const ROLES = [
    { value: 'sales_staff', label: 'Sales staff' },
    { value: 'rider', label: 'Riders' },
    { value: 'kitchen', label: 'Kitchen' },
    { value: 'manager', label: 'Branch managers' },
    { value: 'call_center', label: 'Call centre' },
    { value: 'warehouse_manager', label: 'Warehouse' },
    { value: 'purchasing_clerk', label: 'Purchasing' },
];

const KINDS: { value: StaffMessageKind; label: string; hint: string }[] = [
    { value: 'notice', label: 'Notice', hint: 'Sits in the bell. Never interrupts.' },
    { value: 'caution', label: 'Caution', hint: 'Takes over the screen once the till is idle.' },
    { value: 'direct', label: 'Direct', hint: 'A conversation with named people.' },
];

export function ComposeDialog({
    isOpen,
    onClose,
    onSent,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSent: (count: number) => void;
}) {
    const { branches } = useBranches();

    const [kind, setKind] = useState<StaffMessageKind>('notice');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [roles, setRoles] = useState<string[]>([]);
    const [branchIds, setBranchIds] = useState<number[]>([]);
    const [userIds, setUserIds] = useState<number[]>([]);
    const [personQuery, setPersonQuery] = useState('');
    const [everyone, setEveryone] = useState(false);
    const [requiresAck, setRequiresAck] = useState(false);
    const [allowCustomReply, setAllowCustomReply] = useState(true);
    const [quickReplies, setQuickReplies] = useState('Got it, Understood');
    const [smsAfter, setSmsAfter] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const audience: StaffAudience = useMemo(
        () => ({
            everyone,
            roles: everyone ? [] : roles,
            branch_ids: everyone ? [] : branchIds,
            // Named people are added even when `everyone` is set. On the server
            // they bypass the role and branch filters rather than intersecting
            // with them, so "all riders, plus Ama from head office" is
            // expressible.
            user_ids: userIds,
        }),
        [everyone, roles, branchIds, userIds],
    );

    const hasSelection = everyone || roles.length > 0 || branchIds.length > 0 || userIds.length > 0;

    // The audience count, live. The last chance anybody has to notice that "all
    // staff" is 41 people and not the four they pictured. A query rather than an
    // effect, so the selection is the cache key and a stale response from a
    // previous selection can never overwrite the current count.
    const { data: reach } = useQuery({
        queryKey: ['staff-audience-preview', audience],
        queryFn: () => messagingAdminService.preview(audience).then((response) => response.data.count),
        enabled: isOpen && hasSelection,
    });

    // Acknowledgement follows the kind rather than being stored separately: a
    // caution must be acknowledged or it cannot be cleared from the recipient's
    // screen, and a notice sits in the bell where there is nothing to
    // acknowledge with. Only a direct message leaves it open.
    const effectiveRequiresAck =
        kind === 'caution' ? true : kind === 'notice' ? false : requiresAck;

    function reset() {
        setSubject('');
        setBody('');
        setUserIds([]);
        setPersonQuery('');
        setError(null);
    }

    async function send() {
        setError(null);
        setSending(true);

        try {
            const response = await messagingAdminService.send({
                kind,
                subject: subject.trim() || null,
                body: body.trim(),
                audience,
                requires_acknowledgement: effectiveRequiresAck,
                allow_custom_reply: allowCustomReply,
                quick_replies: quickReplies
                    .split(',')
                    .map((entry) => entry.trim())
                    .filter(Boolean)
                    .slice(0, 5),
                sms_fallback_after_minutes: smsAfter === '' ? null : Number(smsAfter),
            });

            reset();
            onSent(response.data.recipient_count);
            onClose();
        } catch (caught) {
            const message =
                (caught as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                'Could not send that.';
            setError(message);
        } finally {
            setSending(false);
        }
    }

    return (
        <InventoryModal isOpen={isOpen} onClose={onClose} title="Message staff" size="lg">
            <div className="space-y-4">
                <FormField label="Kind" hint={KINDS.find((entry) => entry.value === kind)?.hint}>
                    <div className="flex flex-wrap gap-2">
                        {KINDS.map((entry) => (
                            <Chip
                                key={entry.value}
                                label={entry.label}
                                active={kind === entry.value}
                                onClick={() => setKind(entry.value)}
                            />
                        ))}
                    </div>
                </FormField>

                <FormField label="Subject">
                    <TextInput
                        value={subject}
                        onChange={(event) => setSubject(event.target.value)}
                        placeholder="Optional"
                    />
                </FormField>

                <FormField label="Message" required>
                    <Textarea
                        value={body}
                        onChange={(event) => setBody(event.target.value)}
                        rows={4}
                        placeholder="What do you want them to know?"
                    />
                </FormField>

                <FormField label="Who gets it" required>
                    <div className="space-y-2.5">
                        <Toggle checked={everyone} onChange={setEveryone} label="Everyone" />

                        {!everyone && (
                            <>
                                <div className="flex flex-wrap gap-1.5">
                                    {ROLES.map((role) => (
                                        <Chip
                                            key={role.value}
                                            label={role.label}
                                            active={roles.includes(role.value)}
                                            onClick={() =>
                                                setRoles((current) =>
                                                    current.includes(role.value)
                                                        ? current.filter((entry) => entry !== role.value)
                                                        : [...current, role.value],
                                                )
                                            }
                                        />
                                    ))}
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                    {(branches ?? []).map((branch) => (
                                        <Chip
                                            key={branch.id}
                                            label={branch.name}
                                            active={branchIds.includes(Number(branch.id))}
                                            onClick={() =>
                                                setBranchIds((current) =>
                                                    current.includes(Number(branch.id))
                                                        ? current.filter((entry) => entry !== Number(branch.id))
                                                        : [...current, Number(branch.id)],
                                                )
                                            }
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </FormField>

                {/* Outside the `everyone` guard on purpose: picking somebody by
                    name overrides the role and branch filters rather than
                    narrowing them, so it stays available whatever else is set. */}
                <FormField label="Or pick people by name">
                    <PersonPicker
                        selected={userIds}
                        query={personQuery}
                        onQueryChange={setPersonQuery}
                        onToggle={(id) =>
                            setUserIds((current) =>
                                current.includes(id)
                                    ? current.filter((entry) => entry !== id)
                                    : [...current, id],
                            )
                        }
                    />
                </FormField>

                {reach !== undefined && (
                    <p className="flex items-center gap-1.5 font-body text-sm text-secondary">
                        <UsersThreeIcon size={16} weight="fill" />
                        Goes to {reach} {reach === 1 ? 'person' : 'people'}
                    </p>
                )}

                <FormField label="Quick replies" hint="Comma separated, up to five.">
                    <TextInput
                        value={quickReplies}
                        onChange={(event) => setQuickReplies(event.target.value)}
                    />
                </FormField>

                <div className="space-y-2.5">
                    <Toggle
                        checked={allowCustomReply}
                        onChange={setAllowCustomReply}
                        label="Let them write their own reply"
                    />
                    <Toggle
                        checked={effectiveRequiresAck}
                        onChange={setRequiresAck}
                        label={
                            kind === 'direct'
                                ? 'Must be acknowledged'
                                : `Must be acknowledged (fixed for a ${kind})`
                        }
                    />
                </div>

                <FormField label="Text them if unread after" hint="Minutes. Leave blank to never text.">
                    <TextInput
                        type="number"
                        min={0}
                        value={smsAfter}
                        onChange={(event) => setSmsAfter(event.target.value)}
                        placeholder="never"
                    />
                </FormField>

                {error && (
                    <p className="flex items-start gap-1.5 font-body text-sm text-error">
                        <WarningCircleIcon size={16} weight="fill" className="shrink-0 mt-0.5" />
                        {error}
                    </p>
                )}

                <PrimaryButton
                    onClick={send}
                    disabled={sending || !body.trim() || !hasSelection}
                    className="flex items-center justify-center gap-2"
                >
                    <PaperPlaneTiltIcon size={16} weight="fill" />
                    {sending ? 'Sending…' : 'Send'}
                </PrimaryButton>
            </div>
        </InventoryModal>
    );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`px-3 py-1.5 rounded-full text-xs font-body border transition-colors cursor-pointer ${
                active
                    ? 'bg-primary text-white border-primary'
                    : 'bg-neutral-light text-text-dark border-[#e3ddd0] hover:border-neutral-gray/50'
            }`}
        >
            {label}
        </button>
    );
}
