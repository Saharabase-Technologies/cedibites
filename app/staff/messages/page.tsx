'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import {
    CaretDownIcon,
    ChatCircleTextIcon,
    PaperPlaneTiltIcon,
    QuestionIcon,
    WarningCircleIcon,
} from '@phosphor-icons/react';
import {
    PageHeader,
    SegmentedTabs,
    FilterBar,
    SearchBar,
    InventoryModal,
    FormField,
    TextInput,
    Textarea,
    PrimaryButton,
} from '@/app/inventory/_components';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { useStaffInbox } from '@/lib/api/hooks/useStaffInbox';
import { ReplyPanel } from '@/app/components/messaging/ReplyPanel';
import { renderMessageBody } from '@/lib/utils/messageMarkdown';
import type { InboxMessage } from '@/types/messaging';

/**
 * The staff member's own messages, and the way to raise something upward.
 *
 * The upward half is not decoration. A channel that only ever points downward
 * reads as surveillance; one that answers back is a way of working. It goes to
 * the whole IT team rather than a named person, so a query cannot sit unread
 * because somebody is on leave.
 */
export default function StaffMessagesPage() {
    const { staffUser } = useStaffAuth();
    const { messages, summary, isLoading, open, acknowledge, reply, raise, isRaising, isReplying } =
        useStaffInbox(staffUser?.user_id ?? null);

    // Which message is open. One at a time: this is a list somebody scans, and
    // several expanded at once puts the reply boxes of two different messages on
    // screen together, which is how a reply lands on the wrong one.
    const [expandedId, setExpandedId] = useState<number | null>(null);

    // Unread first, All last. The reason somebody opens this page is to find
    // what they have not seen; making them pick that out of everything is
    // backwards.
    const [tab, setTab] = useState('unread');
    const [search, setSearch] = useState('');
    const [askOpen, setAskOpen] = useState(false);
    const [askSubject, setAskSubject] = useState('');
    const [askBody, setAskBody] = useState('');
    const [note, setNote] = useState<string | null>(null);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();

        return messages.filter((message) => {
            if (tab === 'unread' && message.read_at !== null) return false;
            if (tab === 'cautions' && message.kind !== 'caution') return false;
            if (!term) return true;
            return (
                (message.subject ?? '').toLowerCase().includes(term) ||
                message.body.toLowerCase().includes(term)
            );
        });
    }, [messages, tab, search]);

    async function submitQuery() {
        await raise({ subject: askSubject.trim() || undefined, body: askBody.trim() });
        setNote('Sent to the IT team. They will reply here.');
        setAskSubject('');
        setAskBody('');
        setAskOpen(false);
    }

    return (
        <div className="h-full overflow-y-auto bg-neutral-light">
            <div className="max-w-3xl mx-auto px-4 md:px-8 py-6">
                <PageHeader
                    title="Messages"
                    subtitle="From the office, and from the system."
                    action={{
                        label: 'Ask IT',
                        onClick: () => setAskOpen(true),
                        icon: <QuestionIcon size={16} weight="bold" />,
                    }}
                />

                {note && (
                    <div className="mb-5 flex items-start gap-3 bg-secondary-light/50 border border-secondary/20 rounded-2xl px-4 py-3">
                        <ChatCircleTextIcon size={18} weight="fill" className="text-secondary shrink-0 mt-0.5" />
                        <p className="font-body text-sm text-text-dark">{note}</p>
                    </div>
                )}

                {summary.pending.length > 0 && (
                    <div className="mb-5 flex items-start gap-3 bg-neutral-card border border-[#e3ddd0] rounded-2xl px-4 py-3">
                        <WarningCircleIcon size={18} weight="fill" className="text-primary shrink-0 mt-0.5" />
                        <p className="font-body text-sm text-text-dark">
                            {summary.pending.length} {summary.pending.length === 1 ? 'message needs' : 'messages need'}{' '}
                            your confirmation.
                        </p>
                    </div>
                )}

                <div className="mb-4">
                    <SegmentedTabs
                        value={tab}
                        onChange={setTab}
                        options={[
                            { value: 'unread', label: `Unread${summary.unread ? ` (${summary.unread})` : ''}` },
                            { value: 'cautions', label: 'Cautions' },
                            { value: 'all', label: 'All' },
                        ]}
                    />
                </div>

                <FilterBar>
                    <SearchBar value={search} onChange={setSearch} placeholder="Search messages…" />
                </FilterBar>

                {isLoading ? (
                    <p className="font-body text-sm text-neutral-gray">Loading…</p>
                ) : filtered.length === 0 ? (
                    <div className="rounded-2xl bg-neutral-card shadow-sm flex flex-col items-center text-center py-16">
                        <ChatCircleTextIcon size={34} className="text-neutral-gray mb-3" />
                        <p className="font-body text-sm text-neutral-gray">
                            {search || tab !== 'all' ? 'Nothing matches that.' : 'No messages.'}
                        </p>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {filtered.map((message) => (
                            <MessageCard
                                key={message.id}
                                message={message}
                                busy={isReplying}
                                expanded={expandedId === message.id}
                                onToggle={() => {
                                    const opening = expandedId !== message.id;
                                    setExpandedId(opening ? message.id : null);

                                    // Only on the way open, and only once —
                                    // re-opening a message must not keep firing
                                    // a write that does nothing.
                                    if (opening && message.read_at === null) {
                                        void open(message.id);
                                    }
                                }}
                                onSubmit={async ({ quickReply, body, acknowledge: shouldAck }) => {
                                    if (quickReply || body.trim()) {
                                        await reply({
                                            recipientId: message.id,
                                            ...(quickReply ? { quick_reply: quickReply } : {}),
                                            ...(body.trim() ? { body: body.trim() } : {}),
                                        });
                                    }
                                    if (shouldAck) await acknowledge(message.id);
                                }}
                            />
                        ))}
                    </ul>
                )}
            </div>

            <InventoryModal
                isOpen={askOpen}
                onClose={() => setAskOpen(false)}
                title="Ask the IT team"
                size="md"
            >
                <div className="space-y-4">
                    <p className="font-body text-xs text-neutral-gray">
                        Goes to the whole team rather than one person, so it will not sit unread because
                        somebody is on leave.
                    </p>

                    <FormField label="What is it about">
                        <TextInput
                            value={askSubject}
                            onChange={(event) => setAskSubject(event.target.value)}
                            placeholder="Optional"
                        />
                    </FormField>

                    <FormField label="Tell them what is happening" required>
                        <Textarea
                            value={askBody}
                            onChange={(event) => setAskBody(event.target.value)}
                            rows={4}
                        />
                    </FormField>

                    <PrimaryButton
                        onClick={submitQuery}
                        disabled={isRaising || !askBody.trim()}
                        className="flex items-center justify-center gap-2"
                    >
                        <PaperPlaneTiltIcon size={15} weight="fill" />
                        {isRaising ? 'Sending…' : 'Send to IT'}
                    </PrimaryButton>
                </div>
            </InventoryModal>
        </div>
    );
}

/**
 * One message, collapsed until opened.
 *
 * The accordion is not decoration: expanding is what marks the message read.
 * Before this, `read_at` was only ever stamped by replying or acknowledging, so
 * a notice that asked for nothing back sat unread for ever and the bell count
 * never came down. Opening it is the honest signal that somebody looked.
 */
function MessageCard({
    message,
    busy,
    expanded,
    onToggle,
    onSubmit,
}: {
    message: InboxMessage;
    busy: boolean;
    expanded: boolean;
    onToggle: () => void;
    onSubmit: (payload: { quickReply: string | null; body: string; acknowledge: boolean }) => void;
}) {
    const isCaution = message.kind === 'caution';
    const isUnread = message.read_at === null;

    return (
        <li className="rounded-2xl bg-neutral-card shadow-sm overflow-hidden">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={expanded}
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-neutral-light/60 transition-colors cursor-pointer"
            >
                {/* Big, and vertically centred against the whole block rather
                    than pinned to the first line. A caution should be readable
                    as a caution from across the room. */}
                <WarningCircleIcon
                    size={30}
                    weight={isCaution ? 'fill' : 'regular'}
                    className={`shrink-0 ${isCaution ? 'text-primary' : 'text-neutral-gray/50'}`}
                />

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h2 className="font-brand text-lg font-bold text-text-dark leading-tight truncate">
                            {message.subject ?? 'Message'}
                        </h2>
                        {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-primary shrink-0" aria-label="Unread" />
                        )}
                    </div>
                    <p className="font-body text-xs text-neutral-gray mt-0.5 truncate">
                        {message.sender_name}
                        {message.sent_at && ` · ${new Date(message.sent_at).toLocaleString()}`}
                    </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <span className="hidden sm:inline font-body text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-gray">
                        {message.kind_label}
                    </span>
                    <CaretDownIcon
                        size={16}
                        weight="bold"
                        className={`text-neutral-gray transition-transform ${expanded ? 'rotate-180' : ''}`}
                    />
                </div>
            </button>

            {expanded && (
                <>
                    <div className="h-px bg-[#f0e8d8]" />

                    <div className="px-5 py-4 font-body text-sm text-text-dark leading-relaxed">
                        {renderMessageBody(message.body)}

                        {message.image_url && (
                            <Image
                                src={message.image_url}
                                alt=""
                                width={800}
                                height={600}
                                unoptimized
                                className="mt-3 w-full h-auto rounded-xl border border-[#e3ddd0]"
                            />
                        )}
                    </div>

                    <div className="h-px bg-[#f0e8d8]" />

                    <div className="px-5 py-4">
                        <ReplyPanel message={message} busy={busy} onSubmit={onSubmit} />
                    </div>
                </>
            )}
        </li>
    );
}
