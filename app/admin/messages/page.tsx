'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
    ChatCircleTextIcon,
    PaperPlaneTiltIcon,
    RobotIcon,
    SlidersIcon,
    UsersThreeIcon,
    WarningCircleIcon,
    XIcon,
} from '@phosphor-icons/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { messagingAdminService } from '@/lib/api/services/messaging.service';
import { useBranches } from '@/lib/api/hooks/useBranches';
import { useEmployees } from '@/lib/api/hooks/useEmployees';
import type { StaffAudience, StaffMessage, StaffMessageKind } from '@/types/messaging';
import { roleDisplayName } from '@/types/staff';

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

export default function AdminMessagesPage() {
    const queryClient = useQueryClient();
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
    const [smsAfter, setSmsAfter] = useState<string>('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sentNote, setSentNote] = useState<string | null>(null);

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
        enabled: hasSelection,
    });

    const { data: sent } = useQuery({
        queryKey: ['admin-staff-messages'],
        queryFn: () => messagingAdminService.list().then((response) => response.data),
    });

    // Acknowledgement follows the kind rather than being stored separately: a
    // caution has to be acknowledged or it cannot be cleared from the
    // recipient's screen, and a notice sits in the bell where there is nothing
    // to acknowledge with. Only a direct message leaves it open, so only that
    // case reads the checkbox.
    const effectiveRequiresAck =
        kind === 'caution' ? true : kind === 'notice' ? false : requiresAck;

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

            setSentNote(`Sent to ${response.data.recipient_count} people.`);
            setSubject('');
            setBody('');
            setUserIds([]);
            setPersonQuery('');
            queryClient.invalidateQueries({ queryKey: ['admin-staff-messages'] });
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
        <div className="p-4 sm:p-6 max-w-6xl mx-auto">
            <header className="flex items-start justify-between gap-4 mb-6">
                <div>
                    <h1 className="font-brand text-2xl text-brand-dark">Messages to staff</h1>
                    <p className="font-body text-sm text-neutral-gray mt-1">
                        Reaches people inside the app they already work in.
                    </p>
                </div>

                <Link
                    href="/admin/messages/rules"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-light hover:bg-primary-light text-sm font-body text-brand-dark transition-colors"
                >
                    <SlidersIcon size={16} />
                    Automatic rules
                </Link>
            </header>

            <div className="grid lg:grid-cols-5 gap-6">
                {/* ─── Compose ─────────────────────────────────────────────── */}
                <section className="lg:col-span-3 rounded-2xl bg-neutral-card shadow-sm p-5">
                    <h2 className="font-body font-semibold text-brand-dark mb-4">Write a message</h2>

                    <div className="flex flex-wrap gap-2 mb-4">
                        {KINDS.map((entry) => (
                            <button
                                key={entry.value}
                                type="button"
                                onClick={() => setKind(entry.value)}
                                title={entry.hint}
                                className={`px-3 py-1.5 rounded-full text-xs font-body border transition-colors cursor-pointer ${
                                    kind === entry.value
                                        ? 'bg-primary text-brand-darker border-primary'
                                        : 'bg-neutral-light/60 text-brand-dark border-black/10 hover:bg-primary-light'
                                }`}
                            >
                                {entry.label}
                            </button>
                        ))}
                    </div>

                    <p className="font-body text-xs text-neutral-gray mb-4">
                        {KINDS.find((entry) => entry.value === kind)?.hint}
                    </p>

                    <input
                        value={subject}
                        onChange={(event) => setSubject(event.target.value)}
                        placeholder="Subject (optional)"
                        className="w-full px-3 py-2 mb-3 rounded-xl border border-black/10 bg-neutral-light/40 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />

                    <textarea
                        value={body}
                        onChange={(event) => setBody(event.target.value)}
                        rows={5}
                        placeholder="What do you want them to know?"
                        className="w-full px-3 py-2 rounded-xl border border-black/10 bg-neutral-light/40 text-sm font-body resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />

                    <div className="mt-5">
                        <p className="font-body text-xs font-semibold text-brand-dark mb-2">Who gets it</p>

                        <label className="flex items-center gap-2 mb-3">
                            <input
                                type="checkbox"
                                checked={everyone}
                                onChange={(event) => setEveryone(event.target.checked)}
                                className="accent-primary"
                            />
                            <span className="font-body text-sm text-brand-dark">Everyone</span>
                        </label>

                        {!everyone && (
                            <>
                                <div className="flex flex-wrap gap-1.5 mb-3">
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

                        {/* Named people. Outside the `everyone` guard on purpose:
                            picking somebody by name is an override of the role
                            and branch filters, not a further condition on them,
                            so it stays available whatever else is selected. */}
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

                        {reach !== undefined && (
                            <p className="flex items-center gap-1.5 mt-3 font-body text-sm text-secondary">
                                <UsersThreeIcon size={16} weight="fill" />
                                Goes to {reach} {reach === 1 ? 'person' : 'people'}
                            </p>
                        )}
                    </div>

                    <div className="mt-5 space-y-3 border-t border-black/5 pt-4">
                        <input
                            value={quickReplies}
                            onChange={(event) => setQuickReplies(event.target.value)}
                            placeholder="Quick replies, comma separated"
                            className="w-full px-3 py-2 rounded-xl border border-black/10 bg-neutral-light/40 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />

                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={allowCustomReply}
                                onChange={(event) => setAllowCustomReply(event.target.checked)}
                                className="accent-primary"
                            />
                            <span className="font-body text-sm text-brand-dark">
                                Let them write their own reply
                            </span>
                        </label>

                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={effectiveRequiresAck}
                                disabled={kind !== 'direct'}
                                onChange={(event) => setRequiresAck(event.target.checked)}
                                className="accent-primary"
                            />
                            <span
                                className={`font-body text-sm ${kind === 'direct' ? 'text-brand-dark' : 'text-neutral-gray'}`}
                            >
                                Must be acknowledged
                            </span>
                        </label>

                        <label className="flex items-center gap-2">
                            <span className="font-body text-sm text-brand-dark">Text them if unread after</span>
                            <input
                                type="number"
                                min={0}
                                value={smsAfter}
                                onChange={(event) => setSmsAfter(event.target.value)}
                                placeholder="never"
                                className="w-20 px-2 py-1 rounded-lg border border-black/10 bg-neutral-light/40 text-sm font-body"
                            />
                            <span className="font-body text-xs text-neutral-gray">minutes</span>
                        </label>
                    </div>

                    {error && (
                        <p className="flex items-center gap-1.5 mt-4 font-body text-sm text-error">
                            <WarningCircleIcon size={16} weight="fill" />
                            {error}
                        </p>
                    )}

                    {sentNote && !error && (
                        <p className="mt-4 font-body text-sm text-secondary">{sentNote}</p>
                    )}

                    <button
                        type="button"
                        onClick={send}
                        disabled={sending || !body.trim() || !hasSelection}
                        className="flex items-center gap-2 mt-5 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-brand-darker font-body font-semibold text-sm transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        <PaperPlaneTiltIcon size={16} weight="fill" />
                        {sending ? 'Sending…' : 'Send'}
                    </button>
                </section>

                {/* ─── Sent ────────────────────────────────────────────────── */}
                <section className="lg:col-span-2">
                    <h2 className="font-body font-semibold text-brand-dark mb-3">Sent</h2>

                    {(sent ?? []).length === 0 ? (
                        <div className="rounded-2xl bg-neutral-card shadow-sm p-6 text-center">
                            <ChatCircleTextIcon size={28} className="text-neutral-gray mx-auto mb-2" />
                            <p className="font-body text-sm text-neutral-gray">Nothing sent yet.</p>
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {(sent ?? []).map((message) => (
                                <SentRow key={message.id} message={message} />
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
}

/**
 * Pick individual staff by name.
 *
 * Addresses people by their USERS-table id, never the employee id. Both are
 * small integers and either will usually resolve to somebody, so getting it
 * wrong does not error - it quietly messages the wrong person. See
 * StaffMember.userId.
 *
 * Suspended staff are filtered server-side by the audience resolver, so a name
 * picked here that has since been suspended simply drops out of the send rather
 * than failing it.
 */
function PersonPicker({
    selected,
    query,
    onQueryChange,
    onToggle,
}: {
    selected: number[];
    query: string;
    onQueryChange: (value: string) => void;
    onToggle: (userId: number) => void;
}) {
    const { employees, isLoading } = useEmployees({ per_page: 200 });

    // `userId` is optional on StaffMember because the staff editor builds a
    // draft before the account exists. Anything from the API has one; narrowing
    // here keeps the rest of this component free of null checks.
    const addressable = (employees ?? []).filter(
        (person): person is typeof person & { userId: number } => typeof person.userId === 'number',
    );

    const chosen = addressable.filter((person) => selected.includes(person.userId));

    const matches = query.trim()
        ? addressable
              .filter((person) => {
                  const q = query.toLowerCase();
                  return (
                      (person.name ?? '').toLowerCase().includes(q) ||
                      (person.phone ?? '').toLowerCase().includes(q) ||
                      roleDisplayName(person.role).toLowerCase().includes(q)
                  );
              })
              .slice(0, 8)
        : [];

    return (
        <div className="mt-4">
            <p className="font-body text-xs font-semibold text-brand-dark mb-2">Or pick people by name</p>

            {chosen.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {chosen.map((person) => (
                        <button
                            key={person.userId}
                            type="button"
                            onClick={() => onToggle(person.userId)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-white text-xs font-body cursor-pointer"
                        >
                            {person.name}
                            <XIcon size={11} weight="bold" />
                        </button>
                    ))}
                </div>
            )}

            <input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder={isLoading ? 'Loading staff…' : 'Type a name…'}
                disabled={isLoading}
                className="w-full px-3 py-2 rounded-xl border border-black/10 bg-neutral-light/40 text-sm font-body focus:outline-none focus:ring-2 focus:ring-primary/40"
            />

            {matches.length > 0 && (
                <ul className="mt-1.5 rounded-xl border border-black/10 bg-neutral-card overflow-hidden divide-y divide-black/5">
                    {matches.map((person) => (
                        <li key={person.userId}>
                            <button
                                type="button"
                                onClick={() => {
                                    onToggle(person.userId);
                                    onQueryChange('');
                                }}
                                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-neutral-light/60 transition-colors cursor-pointer"
                            >
                                <span className="font-body text-sm text-brand-dark truncate">{person.name}</span>
                                <span className="font-body text-[11px] text-neutral-gray shrink-0">
                                    {roleDisplayName(person.role)}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {query.trim() && matches.length === 0 && !isLoading && (
                <p className="mt-1.5 font-body text-xs text-neutral-gray">Nobody by that name.</p>
            )}
        </div>
    );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`px-2.5 py-1 rounded-full text-xs font-body border transition-colors cursor-pointer ${
                active
                    ? 'bg-secondary text-white border-secondary'
                    : 'bg-neutral-light/60 text-brand-dark border-black/10 hover:bg-secondary-light'
            }`}
        >
            {label}
        </button>
    );
}

function SentRow({ message }: { message: StaffMessage }) {
    return (
        <li>
            <Link
                href={`/admin/messages/${message.id}`}
                className="block rounded-2xl bg-neutral-card shadow-sm p-4 hover:bg-neutral-light/60 transition-colors"
            >
                <div className="flex items-start justify-between gap-2">
                    <p className="font-body text-sm font-semibold text-brand-dark truncate">
                        {message.subject ?? message.body.slice(0, 40)}
                    </p>
                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-neutral-light text-[10px] font-body text-neutral-gray">
                        {message.kind_label}
                    </span>
                </div>

                <p className="font-body text-xs text-neutral-gray line-clamp-2 mt-1">{message.body}</p>

                <p className="font-body text-[11px] text-neutral-gray/80 mt-2 flex items-center gap-1">
                    {message.is_automatic && <RobotIcon size={12} />}
                    {message.is_automatic ? 'Automatic' : (message.sender?.name ?? 'Someone')}
                    {' · '}
                    {message.recipient_count} {message.recipient_count === 1 ? 'person' : 'people'}
                </p>
            </Link>
        </li>
    );
}
