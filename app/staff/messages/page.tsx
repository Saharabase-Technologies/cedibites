'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import {
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
    const { messages, summary, isLoading, acknowledge, reply, raise, isRaising, isReplying } =
        useStaffInbox(staffUser?.user_id ?? null);

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
                    <div className="mb-5 flex items-start gap-3 bg-neutral-card border border-[#e3ddd0] border-l-[3px] border-l-primary rounded-2xl px-4 py-3">
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

/** One message: header, body, then the reply block. Same order as the modal. */
function MessageCard({
    message,
    busy,
    onSubmit,
}: {
    message: InboxMessage;
    busy: boolean;
    onSubmit: (payload: { quickReply: string | null; body: string; acknowledge: boolean }) => void;
}) {
    const isCaution = message.kind === 'caution';
    const isUnread = message.read_at === null;

    return (
        <li className="rounded-2xl bg-neutral-card shadow-sm overflow-hidden">
            {/* A caution gets a thin primary rule along the top, the same seal as
                the modal. The previous pale-yellow fill and yellow ring were a
                stock alert colour from outside this palette, and they made every
                caution look like a browser warning. */}
            {isCaution && <div className="h-[3px] bg-primary" />}

            <header className="px-5 pt-4 pb-3">
                <div className="flex items-center gap-2">
                    <p className="font-body text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-gray">
                        {message.kind_label}
                    </p>
                    {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-label="Unread" />}
                </div>

                {message.subject && (
                    <h2 className="font-brand text-lg font-bold text-text-dark leading-tight mt-1">
                        {message.subject}
                    </h2>
                )}

                <p className="font-body text-[11px] text-neutral-gray mt-1">
                    {message.sender_name}
                    {message.sent_at && ` · ${new Date(message.sent_at).toLocaleString()}`}
                </p>
            </header>

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
        </li>
    );
}
