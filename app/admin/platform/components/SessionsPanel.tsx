'use client';

import { useMemo, useState } from 'react';
import {
    ArrowsClockwiseIcon,
    CircleNotchIcon,
    DesktopIcon,
    DeviceMobileIcon,
    SignOutIcon,
    UsersThreeIcon,
} from '@phosphor-icons/react';
import { useActiveSessions } from '@/lib/api/hooks/usePlatform';
import { platformService, type ActiveSession, type SessionStatus } from '@/lib/api/services/platform.service';
import { toast } from '@/lib/utils/toast';
import { PasscodeDialog } from './PasscodeDialog';

// ─── Presentation ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<SessionStatus, { dot: string; label: string; text: string }> = {
    online: { dot: 'bg-success', label: 'On screen now', text: 'text-success' },
    idle: { dot: 'bg-warning', label: 'Idle', text: 'text-warning' },
    away: { dot: 'bg-neutral-gray/40', label: 'Left signed in', text: 'text-neutral-gray' },
};

const FILTERS: { key: SessionStatus | 'all'; label: string }[] = [
    { key: 'online', label: 'On screen now' },
    { key: 'idle', label: 'Idle' },
    { key: 'away', label: 'Left signed in' },
    { key: 'all', label: 'All' },
];

function shortIdle(seconds: number): string {
    if (seconds < 60) return `${Math.max(seconds, 0)}s ago`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
    return `${Math.round(seconds / 86400)}d ago`;
}

function clockTime(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** One person, and every device they are signed in on. */
interface Person {
    userId: number;
    name: string;
    phone: string;
    employeeNo: string | null;
    sessions: ActiveSession[];
    liveliest: SessionStatus;
}

const RANK: Record<SessionStatus, number> = { online: 0, idle: 1, away: 2 };

// ─── Panel ────────────────────────────────────────────────────────────────────

type PendingAction =
    | { kind: 'one'; tokenId: number; who: string }
    | { kind: 'everywhere'; userId: number; who: string; devices: number };

export function SessionsPanel() {
    const { sessions, meta, isLoading, isFetching, refetch } = useActiveSessions();
    const [filter, setFilter] = useState<SessionStatus | 'all'>('online');
    const [pending, setPending] = useState<PendingAction | null>(null);
    const [working, setWorking] = useState(false);

    const people = useMemo<Person[]>(() => {
        const visible = filter === 'all' ? sessions : sessions.filter(s => s.status === filter);

        const byUser = new Map<number, Person>();

        for (const session of visible) {
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
                sessions: [session],
                liveliest: session.status,
            });
        }

        // Whoever is actually at a screen sorts to the top; within a person, the
        // most recently used device first.
        return [...byUser.values()]
            .map(p => ({ ...p, sessions: p.sessions.sort((a, b) => a.idle_seconds - b.idle_seconds) }))
            .sort((a, b) => RANK[a.liveliest] - RANK[b.liveliest] || a.name.localeCompare(b.name));
    }, [sessions, filter]);

    const confirm = async (passcode: string) => {
        if (!pending) return;

        setWorking(true);
        try {
            const result = pending.kind === 'one'
                ? await platformService.revokeSession(pending.tokenId, passcode)
                : await platformService.revokeUserSessions(pending.userId, passcode);

            toast.success(result.message);
            setPending(null);
            refetch();
        } catch (e) {
            const message = e instanceof Error ? e.message : 'That did not work.';
            toast.error(message);
        } finally {
            setWorking(false);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl border border-[#f0e8d8] p-5 flex items-center justify-center">
                <CircleNotchIcon size={20} className="animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-[#f0e8d8] overflow-hidden">
            {/* Header */}
            <div className="p-5 pb-4 border-b border-[#f0e8d8]">
                <div className="flex items-start justify-between gap-4 mb-1">
                    <div>
                        <h3 className="text-sm font-semibold font-body text-text-dark flex items-center gap-2">
                            <UsersThreeIcon size={16} className="text-primary" />
                            Who is signed in
                        </h3>
                        <p className="text-[11px] font-body text-neutral-gray mt-0.5">
                            {meta
                                ? `${meta.online} on screen now · ${meta.idle} idle · ${meta.away} left signed in`
                                : 'No sessions'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => refetch()}
                        className="p-2 rounded-xl hover:bg-neutral-light transition-colors text-neutral-gray cursor-pointer shrink-0"
                        title="Refresh"
                    >
                        <ArrowsClockwiseIcon size={14} className={isFetching ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Nobody signs out at the end of a shift, so an unfiltered list
                    is mostly terminals nobody is standing at. The default view
                    is the one that answers the question being asked. */}
                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    {FILTERS.map(f => {
                        const count = f.key === 'all'
                            ? sessions.length
                            : sessions.filter(s => s.status === f.key).length;

                        return (
                            <button
                                key={f.key}
                                type="button"
                                onClick={() => setFilter(f.key)}
                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold font-body transition-colors cursor-pointer ${
                                    filter === f.key
                                        ? 'bg-primary text-white'
                                        : 'bg-neutral-light text-neutral-gray hover:bg-primary/10'
                                }`}
                            >
                                {f.label} ({count})
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* People */}
            {people.length === 0 ? (
                <p className="px-5 py-8 text-center text-xs font-body text-neutral-gray">
                    {filter === 'online'
                        ? 'Nobody is at a screen right now.'
                        : 'Nothing here.'}
                </p>
            ) : (
                <div className="divide-y divide-[#f0e8d8]">
                    {people.map(person => (
                        <div key={person.userId} className="px-5 py-3.5">
                            <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold font-body text-text-dark truncate">
                                        {person.name}
                                        {person.employeeNo && (
                                            <span className="text-neutral-gray font-normal"> · {person.employeeNo}</span>
                                        )}
                                    </p>
                                    <p className="text-[10px] font-body text-neutral-gray">{person.phone}</p>
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
                                        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-error/30 text-error text-[10px] font-bold font-body hover:bg-error/5 transition-colors cursor-pointer"
                                    >
                                        <SignOutIcon size={11} />
                                        Sign out all {person.sessions.length}
                                    </button>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                {person.sessions.map(session => {
                                    const style = STATUS_STYLES[session.status];
                                    const DeviceIcon = session.token_type === 'staff' ? DesktopIcon : DeviceMobileIcon;

                                    return (
                                        <div
                                            key={session.token_id}
                                            className="flex items-center justify-between gap-3 rounded-xl bg-neutral-light/50 px-3 py-2"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
                                                <DeviceIcon size={13} className="text-neutral-gray shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-medium font-body text-text-dark">
                                                        {session.token_type === 'staff' ? 'Staff app' : 'Customer app'}
                                                        {session.is_current && (
                                                            <span className="text-primary font-normal"> · this page</span>
                                                        )}
                                                    </p>
                                                    <p className="text-[10px] font-body text-neutral-gray">
                                                        <span className={style.text}>{style.label}</span>
                                                        {' · last request '}{shortIdle(session.idle_seconds)}
                                                        {' · in since '}{clockTime(session.session_started)}
                                                    </p>
                                                </div>
                                            </div>

                                            {session.is_current ? (
                                                <span className="shrink-0 text-[10px] font-body text-neutral-gray/60 pr-1">
                                                    yours
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setPending({
                                                        kind: 'one',
                                                        tokenId: session.token_id,
                                                        who: person.name,
                                                    })}
                                                    className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold font-body text-neutral-gray hover:text-error hover:bg-error/5 transition-colors cursor-pointer"
                                                >
                                                    Sign out
                                                </button>
                                            )}
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
                title={pending?.kind === 'everywhere' ? 'Sign out every device' : 'Sign out this device'}
                description={
                    pending?.kind === 'everywhere'
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
