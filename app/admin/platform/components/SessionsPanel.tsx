'use client';

import { useMemo, useState } from 'react';
import {
    ArrowsClockwiseIcon,
    CircleNotchIcon,
    DesktopTowerIcon,
    DeviceMobileIcon,
    DeviceTabletIcon,
    QuestionIcon,
    SignOutIcon,
    UsersThreeIcon,
} from '@phosphor-icons/react';
import { SegmentedTabs } from '@/app/inventory/_components';
import { TONE } from '@/app/inventory/_components/status-tokens';
import { useActiveSessions } from '@/lib/api/hooks/usePlatform';
import {
    platformService,
    type ActiveSession,
    type SessionDevice,
    type SessionStatus,
} from '@/lib/api/services/platform.service';
import { toast } from '@/lib/utils/toast';
import { PasscodeDialog } from './PasscodeDialog';

// ─── Vocabulary ───────────────────────────────────────────────────────────────

const STATUS_TONE: Record<SessionStatus, { label: string; bg: string; text: string; dot: string }> = {
    online: { label: 'On screen now', ...TONE.done },
    idle: { label: 'Idle', ...TONE.waiting },
    away: { label: 'Left signed in', ...TONE.neutral },
};

const DEVICE_ICONS: Record<SessionDevice, React.ElementType> = {
    desktop: DesktopTowerIcon,
    tablet: DeviceTabletIcon,
    mobile: DeviceMobileIcon,
    unknown: QuestionIcon,
};

const DEVICE_LABELS: Record<SessionDevice, string> = {
    desktop: 'Desktop',
    tablet: 'Tablet',
    mobile: 'Mobile',
    unknown: 'Unknown device',
};

type Filter = SessionStatus | 'all';

function shortIdle(seconds: number): string {
    if (seconds < 60) return `${Math.max(seconds, 0)}s ago`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
    return `${Math.round(seconds / 86400)}d ago`;
}

function clockTime(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function StatusPill({ status }: { status: SessionStatus }) {
    const tone = STATUS_TONE[status];

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold font-body ${tone.bg} ${tone.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} aria-hidden />
            {tone.label}
        </span>
    );
}

/** One person, and every device they are signed in on. */
interface Person {
    userId: number;
    name: string;
    phone: string;
    employeeNo: string | null;
    role: string | null;
    branches: string[] | null;
    sessions: ActiveSession[];
    liveliest: SessionStatus;
}

const RANK: Record<SessionStatus, number> = { online: 0, idle: 1, away: 2 };

// ─── Panel ────────────────────────────────────────────────────────────────────

type PendingAction =
    | { kind: 'one'; tokenIds: number[]; who: string }
    | { kind: 'everywhere'; userId: number; who: string; devices: number }
    | { kind: 'bulk'; tokenIds: number[]; label: string };

export function SessionsPanel() {
    const { sessions, meta, isLoading, isFetching, refetch } = useActiveSessions();
    const [filter, setFilter] = useState<Filter>('online');
    const [pending, setPending] = useState<PendingAction | null>(null);
    const [working, setWorking] = useState(false);

    const inView = useMemo(
        () => (filter === 'all' ? sessions : sessions.filter(s => s.status === filter)),
        [sessions, filter],
    );

    const people = useMemo<Person[]>(() => {
        const byUser = new Map<number, Person>();

        for (const session of inView) {
            const existing = byUser.get(session.user_id);

            if (existing) {
                existing.sessions.push(session);
                if (RANK[session.status] < RANK[existing.liveliest]) {
                    existing.liveliest = session.status;
                }
                continue;
            }

            byUser.set(session.user_id, {
                userId: session.user_id,
                name: session.name,
                phone: session.phone,
                employeeNo: session.employee_no,
                role: session.role,
                branches: session.branches,
                sessions: [session],
                liveliest: session.status,
            });
        }

        // Whoever is actually at a screen sorts to the top; within a person, the
        // most recently used device first.
        return [...byUser.values()]
            .map(p => ({ ...p, sessions: p.sessions.sort((a, b) => a.idle_seconds - b.idle_seconds) }))
            .sort((a, b) => RANK[a.liveliest] - RANK[b.liveliest] || a.name.localeCompare(b.name));
    }, [inView]);

    /** What a bulk sign-out would actually touch — never the reader's own session. */
    const bulkTargets = useMemo(
        () => inView.filter(s => !s.is_current).map(s => s.token_id),
        [inView],
    );

    const confirm = async (passcode: string) => {
        if (!pending) return;

        setWorking(true);
        try {
            const result =
                pending.kind === 'everywhere'
                    ? await platformService.revokeUserSessions(pending.userId, passcode)
                    : await platformService.revokeSessions(pending.tokenIds, passcode);

            toast.success(result.message);
            setPending(null);
            refetch();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'That did not work.');
        } finally {
            setWorking(false);
        }
    };

    const counts: Record<Filter, number> = {
        online: meta?.online ?? 0,
        idle: meta?.idle ?? 0,
        away: meta?.away ?? 0,
        all: sessions.length,
    };

    const filterLabel = filter === 'all' ? 'session' : STATUS_TONE[filter].label.toLowerCase();

    if (isLoading) {
        return (
            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5 flex items-center justify-center">
                <CircleNotchIcon size={20} className="animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="p-5 pb-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold font-brand text-text-dark flex items-center gap-2">
                            <UsersThreeIcon size={18} className="text-primary" />
                            Who is signed in
                        </h2>
                        <p className="text-sm font-body text-neutral-gray mt-1">
                            {meta
                                ? `${meta.online} on screen now · ${meta.idle} idle · ${meta.away} left signed in`
                                : 'No sessions'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => refetch()}
                        className="p-2.5 rounded-xl border border-[#e3ddd0] bg-neutral-card hover:border-neutral-gray/50 transition-colors text-neutral-gray cursor-pointer shrink-0 min-h-11"
                        title="Refresh"
                    >
                        <ArrowsClockwiseIcon size={16} className={isFetching ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Nobody signs out at the end of a shift, so an unfiltered list
                    is mostly terminals nobody is standing at. The default view
                    is the one that answers the question being asked. */}
                <div className="flex flex-wrap items-center gap-3 mt-4">
                    <SegmentedTabs<Filter>
                        value={filter}
                        onChange={setFilter}
                        options={[
                            { value: 'online', label: `On screen now (${counts.online})` },
                            { value: 'idle', label: `Idle (${counts.idle})` },
                            { value: 'away', label: `Left signed in (${counts.away})` },
                            { value: 'all', label: `All (${counts.all})` },
                        ]}
                    />

                    {bulkTargets.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setPending({
                                kind: 'bulk',
                                tokenIds: bulkTargets,
                                label: filterLabel,
                            })}
                            className="ml-auto flex items-center gap-2 bg-neutral-card border border-rose-300 text-rose-700 px-4 py-2.5 rounded-xl text-sm font-semibold font-body hover:bg-rose-50 transition-colors min-h-11 cursor-pointer shrink-0"
                        >
                            <SignOutIcon size={16} />
                            Sign out all {bulkTargets.length}
                        </button>
                    )}
                </div>
            </div>

            {/* People */}
            {people.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm font-body text-neutral-gray">
                    {filter === 'online' ? 'Nobody is at a screen right now.' : 'Nothing here.'}
                </p>
            ) : (
                <div className="divide-y divide-[#f0e8d8] border-t border-[#f0e8d8]">
                    {people.map(person => (
                        <div key={person.userId} className="px-5 py-4">
                            <div className="flex items-start justify-between gap-3 mb-2.5">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold font-body text-text-dark truncate">
                                        {person.name}
                                        {person.employeeNo && (
                                            <span className="text-neutral-gray font-normal"> · {person.employeeNo}</span>
                                        )}
                                    </p>
                                    <p className="text-[11px] font-body text-neutral-gray">
                                        {person.phone}
                                        {person.role && ` · ${person.role.replace(/_/g, ' ')}`}
                                        {/* Only branch staff get a branch. For an
                                            admin the field is null, and printing
                                            "no branch" would read as missing data
                                            rather than the answer. */}
                                        {person.branches && person.branches.length > 0 && (
                                            <> · {person.branches.join(', ')}</>
                                        )}
                                        {person.branches && person.branches.length === 0 && (
                                            <span className="text-rose-700"> · no branch assigned</span>
                                        )}
                                    </p>
                                </div>

                                {person.sessions.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setPending({
                                            kind: 'everywhere',
                                            userId: person.userId,
                                            who: person.name,
                                            devices: person.sessions.length,
                                        })}
                                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e3ddd0] text-rose-700 text-[11px] font-semibold font-body hover:bg-rose-50 transition-colors cursor-pointer"
                                    >
                                        <SignOutIcon size={12} />
                                        Sign out all {person.sessions.length}
                                    </button>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                {person.sessions.map(session => {
                                    const DeviceIcon = DEVICE_ICONS[session.device];

                                    return (
                                        <div
                                            key={session.token_id}
                                            className="flex items-center justify-between gap-3 rounded-xl bg-neutral-light px-3 py-2.5"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <DeviceIcon size={16} className="text-neutral-gray shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-[12px] font-semibold font-body text-text-dark">
                                                        {DEVICE_LABELS[session.device]}
                                                        {session.browser && (
                                                            <span className="text-neutral-gray font-normal"> · {session.browser}</span>
                                                        )}
                                                        <span className="text-neutral-gray font-normal">
                                                            {' · '}{session.token_type === 'staff' ? 'staff app' : 'customer app'}
                                                        </span>
                                                        {session.is_current && (
                                                            <span className="text-primary font-normal"> · this page</span>
                                                        )}
                                                    </p>
                                                    <p className="text-[11px] font-body text-neutral-gray">
                                                        last request {shortIdle(session.idle_seconds)}
                                                        {' · in since '}{clockTime(session.session_started)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                <StatusPill status={session.status} />
                                                {session.is_current ? (
                                                    <span className="text-[11px] font-body text-neutral-gray/60 px-2">
                                                        yours
                                                    </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setPending({
                                                            kind: 'one',
                                                            tokenIds: [session.token_id],
                                                            who: person.name,
                                                        })}
                                                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold font-body text-neutral-gray hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                                                    >
                                                        Sign out
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <PasscodeDialog
                open={pending !== null}
                danger
                title={
                    pending?.kind === 'bulk' ? 'Sign out everyone in this list'
                    : pending?.kind === 'everywhere' ? 'Sign out every device'
                    : 'Sign out this device'
                }
                description={
                    pending?.kind === 'bulk'
                        ? `Ends ${pending.tokenIds.length} session${pending.tokenIds.length === 1 ? '' : 's'} — every ${pending.label} device on screen. Anyone mid-order loses what they have not saved, so check the floor first. Your own session is left alone.`
                        : pending?.kind === 'everywhere'
                            ? `${pending.who} will be signed out of all ${pending.devices} devices at once, wherever they are.`
                            : pending
                                ? `${pending.who} will be signed out on this one device. Anything they have open but unsaved is lost — check they are not mid-order.`
                                : undefined
                }
                confirmLabel="Sign out"
                onConfirm={confirm}
                onCancel={() => setPending(null)}
                loading={working}
            />
        </div>
    );
}

export default SessionsPanel;
