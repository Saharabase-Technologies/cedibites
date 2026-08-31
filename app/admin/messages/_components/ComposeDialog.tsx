'use client';

import { useMemo, useState } from 'react';
import { ImageIcon, PaperPlaneTiltIcon, UsersThreeIcon, WarningCircleIcon, XIcon } from '@phosphor-icons/react';
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
import { SlideEditor, emptySlide, type Slide } from './SlideEditor';

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
    { value: 'release', label: "What's new", hint: 'A walkthrough of changes. Keeps asking until each person has been through it.' },
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
    const [releaseKey, setReleaseKey] = useState('');
    const [slides, setSlides] = useState<Slide[]>([emptySlide([])]);
    const [imagePath, setImagePath] = useState<string | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
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
    // A release is the same case as a caution: it cannot leave somebody's
    // screen until they have been through it, so acknowledgement is the
    // mechanism, not a preference.
    const effectiveRequiresAck =
        kind === 'caution' || kind === 'release' ? true : kind === 'notice' ? false : requiresAck;

    const isRelease = kind === 'release';
    const filledSlides = slides.filter((slide) => slide.body.trim());

    function reset() {
        setSubject('');
        setBody('');
        setReleaseKey('');
        setSlides([emptySlide([])]);
        setUserIds([]);
        setPersonQuery('');
        setImagePath(null);
        setImageUrl(null);
        setError(null);
    }

    async function send() {
        setError(null);
        setSending(true);

        try {
            const response = await messagingAdminService.send({
                kind,
                subject: subject.trim() || null,
                // A release still carries a body: it is what the bell shows and
                // what an older client falls back to rendering.
                body: isRelease ? (body.trim() || filledSlides[0]?.body.trim() || '') : body.trim(),
                image_path: isRelease ? null : imagePath,
                ...(isRelease
                    ? {
                        release_key: releaseKey.trim() || null,
                        steps: filledSlides.map((slide) => ({
                            title: slide.title.trim() || null,
                            body: slide.body.trim(),
                            image_path: slide.imagePath,
                        })),
                    }
                    : {}),
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

                {isRelease ? (
                    <>
                        <FormField
                            label="Release name"
                            hint="A stable name for this release, so it can never be sent twice. e.g. orders-and-till-2026-08"
                        >
                            <TextInput
                                value={releaseKey}
                                onChange={(event) => setReleaseKey(event.target.value)}
                                placeholder="orders-and-till-2026-08"
                            />
                        </FormField>

                        <FormField
                            label="Slides"
                            required
                            hint="One change per slide. **bold**, *italic*, `code`, [link](https://…), and - or 1. for lists."
                        >
                            <SlideEditor
                                slides={slides}
                                onChange={setSlides}
                                uploading={uploading}
                                onUpload={async (file: File) => {
                                    setUploading(true);
                                    setError(null);
                                    try {
                                        const response = await messagingAdminService.uploadImage(file);
                                        return { path: response.data.path, url: response.data.url };
                                    } catch {
                                        setError('That image could not be uploaded.');
                                        return null;
                                    } finally {
                                        setUploading(false);
                                    }
                                }}
                            />
                        </FormField>
                    </>
                ) : (
                <FormField
                    label="Message"
                    required
                    hint="**bold**, *italic*, `code`, [link](https://…), and - or 1. for lists."
                >
                    <Textarea
                        value={body}
                        onChange={(event) => setBody(event.target.value)}
                        rows={5}
                        placeholder="What do you want them to know?"
                    />
                </FormField>
                )}

                {!isRelease && (
                <FormField label="Image" hint="Optional. JPG, PNG or WebP, up to 5MB.">
                    {imageUrl ? (
                        <div className="relative inline-block">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={imageUrl}
                                alt=""
                                className="max-h-40 rounded-xl border border-[#e3ddd0]"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    setImagePath(null);
                                    setImageUrl(null);
                                }}
                                className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center rounded-full bg-text-dark text-neutral-card cursor-pointer"
                                aria-label="Remove image"
                            >
                                <XIcon size={12} weight="bold" />
                            </button>
                        </div>
                    ) : (
                        <label className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-dashed border-[#e3ddd0] bg-neutral-light text-sm font-body text-neutral-gray cursor-pointer hover:border-neutral-gray/60 transition-colors">
                            <ImageIcon size={16} />
                            {uploading ? 'Uploading…' : 'Attach an image'}
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                disabled={uploading}
                                onChange={async (event) => {
                                    const file = event.target.files?.[0];
                                    if (!file) return;

                                    setUploading(true);
                                    setError(null);
                                    try {
                                        const response = await messagingAdminService.uploadImage(file);
                                        setImagePath(response.data.path);
                                        setImageUrl(response.data.url);
                                    } catch {
                                        setError('That image could not be uploaded.');
                                    } finally {
                                        setUploading(false);
                                        // Clear the input so re-picking the same
                                        // file fires change again.
                                        event.target.value = '';
                                    }
                                }}
                            />
                        </label>
                    )}
                </FormField>
                )}

                <FormField label="Who gets it" required>
                    <div className="rounded-xl border border-[#e3ddd0] bg-neutral-light/60 divide-y divide-[#f0e8d8] overflow-hidden">
                        <div className="px-3.5 py-3">
                            <Toggle
                                checked={everyone}
                                onChange={setEveryone}
                                label="Everyone on staff"
                            />
                        </div>

                        {!everyone && (
                            <>
                                <ChipGroup
                                    title="Roles"
                                    count={roles.length}
                                    onClear={() => setRoles([])}
                                >
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
                                </ChipGroup>

                                <ChipGroup
                                    title="Branches"
                                    count={branchIds.length}
                                    onClear={() => setBranchIds([])}
                                >
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
                                </ChipGroup>
                            </>
                        )}

                        {/* Outside the `everyone` guard on purpose: picking
                            somebody by name overrides the role and branch
                            filters rather than narrowing them, so it stays
                            available whatever else is set. */}
                        <ChipGroup
                            title="Specific people"
                            count={userIds.length}
                            onClear={() => setUserIds([])}
                            hint="Added on top of whatever is selected above."
                        >
                            <div className="w-full">
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
                            </div>
                        </ChipGroup>
                    </div>

                    {/* Roles and branches INTERSECT, which is not guessable from
                        two rows of identical chips — and guessing it wrong is how
                        a caution meant for four riders reaches forty people. */}
                    {!everyone && roles.length > 0 && branchIds.length > 0 && (
                        <p className="mt-2 font-body text-xs text-neutral-gray">
                            Only people who match <strong>both</strong> — so the chosen roles, at the chosen
                            branches. Head office, the call centre and the warehouse hold no branch and are
                            included regardless.
                        </p>
                    )}

                    <p className="mt-2.5 flex items-center gap-1.5 font-body text-sm">
                        <UsersThreeIcon
                            size={16}
                            weight="fill"
                            className={reach ? 'text-secondary' : 'text-neutral-gray'}
                        />
                        <span className={reach ? 'text-secondary' : 'text-neutral-gray'}>
                            {!hasSelection
                                ? 'Nobody selected yet'
                                : reach === undefined
                                  ? 'Counting…'
                                  : `Goes to ${reach} ${reach === 1 ? 'person' : 'people'}`}
                        </span>
                    </p>
                </FormField>

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

/**
 * One labelled band of the audience panel.
 *
 * The section previously ran roles and branches together as two indistinguishable
 * rows of chips, so which row was which could only be inferred from the words
 * inside them — and "Kitchen" reads equally well as a role or a branch. The
 * heading, the running count and the divider are what make the panel readable.
 */
function ChipGroup({
    title,
    count,
    onClear,
    hint,
    children,
}: {
    title: string;
    count: number;
    onClear: () => void;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="px-3.5 py-3">
            <div className="flex items-center justify-between gap-2 mb-2">
                <p className="font-body text-xs font-semibold text-text-dark">
                    {title}
                    {count > 0 && <span className="text-neutral-gray font-normal"> · {count} chosen</span>}
                </p>

                {/* Only when there is something to clear. A permanently-visible
                    Clear on an empty group is a button that does nothing. */}
                {count > 0 && (
                    <button
                        type="button"
                        onClick={onClear}
                        className="font-body text-[11px] text-neutral-gray hover:text-text-dark underline cursor-pointer"
                    >
                        Clear
                    </button>
                )}
            </div>

            <div className="flex flex-wrap gap-1.5">{children}</div>

            {hint && <p className="mt-2 font-body text-[11px] text-neutral-gray">{hint}</p>}
        </div>
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
                    // Card, not neutral-light: the panel behind these is already
                    // neutral-light, and an unselected chip on it disappeared.
                    : 'bg-neutral-card text-text-dark border-[#e3ddd0] hover:border-neutral-gray/50'
            }`}
        >
            {label}
        </button>
    );
}
