'use client';

import { useMemo, useState } from 'react';
import {
    ArrowClockwiseIcon,
    ArrowsClockwiseIcon,
    BugIcon,
    CheckCircleIcon,
    CheckIcon,
    CircleNotchIcon,
    CreditCardIcon,
    FireIcon,
    InfoIcon,
    LockKeyIcon,
    PlugIcon,
    QueueIcon,
    ShieldCheckIcon,
    TrashIcon,
    UserIcon,
    WarningCircleIcon,
} from '@phosphor-icons/react';
import { PageHeader, SegmentedTabs, FilterBar } from '@/app/inventory/_components';
import { TONE, type StatusTone } from '@/app/inventory/_components/status-tokens';
import { useErrorFeed, useFailedJobs } from '@/lib/api/hooks/usePlatform';
import { platformService, type FailedJob, type SmartError } from '@/lib/api/services/platform.service';
import { toast } from '@/lib/utils/toast';
import { PasscodeDialog } from '../components/PasscodeDialog';

// ─── Vocabulary ───────────────────────────────────────────────────────────────

type Severity = SmartError['severity'];

const SEVERITY: Record<Severity, { label: string; icon: React.ElementType; rank: number } & StatusTone> = {
    critical: { label: 'Critical', icon: FireIcon, rank: 0, ...TONE.problem },
    error: { label: 'Error', icon: WarningCircleIcon, rank: 1, ...TONE.problem },
    warning: { label: 'Warning', icon: WarningCircleIcon, rank: 2, ...TONE.waiting },
    info: { label: 'Info', icon: InfoIcon, rank: 3, ...TONE.decided },
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
    auth: LockKeyIcon,
    authentication: LockKeyIcon,
    payment: CreditCardIcon,
    queue: QueueIcon,
    orders: QueueIcon,
    system: BugIcon,
    user: UserIcon,
    integration: PlugIcon,
};

/** Backend reason codes, in the words a manager would use. */
const REASON_LABELS: Record<string, string> = {
    wrong_password: 'wrong password',
    unknown_account: 'no account with that phone or email',
    no_employee_record: 'has no staff record',
    account_suspended: 'account suspended',
    account_inactive: 'account not active',
};

function relativeTime(iso: string): string {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);

    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
    return `${Math.round(mins / 1440)}d ago`;
}

function Chip({ label }: { label: string }) {
    return (
        <span className="inline-flex px-2.5 py-1 rounded-full bg-neutral-light text-[11px] font-body text-neutral-gray">
            {label}
        </span>
    );
}

function SeverityBadge({ severity }: { severity: Severity }) {
    const tone = SEVERITY[severity] ?? SEVERITY.info;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold font-body ${tone.bg} ${tone.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} aria-hidden />
            {tone.label}
        </span>
    );
}

// ─── Verdict ──────────────────────────────────────────────────────────────────

/**
 * One line that says whether anything is wrong.
 *
 * Five identical count boxes made every state look the same — a quiet day and
 * a broken payment pipe both rendered as a row of numbers. The reader needs to
 * know, before reading anything else, whether to keep reading.
 */
function Verdict({ critical, errors, warnings, info, acknowledged }: {
    critical: number;
    errors: number;
    warnings: number;
    info: number;
    acknowledged: number;
}) {
    const allClear = critical + errors === 0 && warnings === 0;

    const headline = critical > 0
        ? `${critical} critical ${critical === 1 ? 'fault' : 'faults'} to deal with`
        : errors > 0
            ? `${errors} ${errors === 1 ? 'error' : 'errors'} to deal with`
            : warnings > 0
                ? `${warnings} ${warnings === 1 ? 'warning' : 'warnings'}, nothing broken`
                : 'Nothing needs attention';

    const tone = allClear ? TONE.done : critical > 0 || errors > 0 ? TONE.problem : TONE.waiting;

    return (
        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5 mb-5">
            <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tone.bg}`}>
                    {allClear
                        ? <ShieldCheckIcon size={20} weight="fill" className={tone.text} />
                        : <WarningCircleIcon size={20} weight="fill" className={tone.text} />}
                </div>

                <div className="min-w-0 flex-1">
                    <p className="text-base font-bold font-body text-text-dark">{headline}</p>
                    <p className="text-sm font-body text-neutral-gray mt-0.5">
                        From sign-ins, payments, the queue and the application log, last 24 hours.
                    </p>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 text-[12px] font-body">
                        {([
                            ['critical', critical],
                            ['errors', errors],
                            ['warnings', warnings],
                            ['info', info],
                        ] as const).map(([label, value]) => (
                            <span key={label} className="text-neutral-gray">
                                <span className="font-bold text-text-dark tabular-nums">{value}</span> {label}
                            </span>
                        ))}
                        {acknowledged > 0 && (
                            <span className="text-neutral-gray/70">
                                <span className="font-bold tabular-nums">{acknowledged}</span> acknowledged
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Error card ───────────────────────────────────────────────────────────────

function ErrorCard({ error, onAcknowledge, onReopen, busy }: {
    error: SmartError;
    onAcknowledge: (e: SmartError) => void;
    onReopen: (e: SmartError) => void;
    busy: boolean;
}) {
    const sev = SEVERITY[error.severity] ?? SEVERITY.info;
    const SevIcon = sev.icon;
    const CatIcon = CATEGORY_ICONS[error.category] ?? BugIcon;

    return (
        <div className={`bg-neutral-card border border-[#f0e8d8] rounded-2xl p-4 transition-opacity ${
            error.acknowledged ? 'opacity-60' : ''
        }`}>
            <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${sev.bg}`}>
                    <SevIcon size={17} weight="fill" className={sev.text} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-semibold font-body text-text-dark">{error.title}</h3>
                                <SeverityBadge severity={error.severity} />
                                {error.count && error.count > 1 && (
                                    <span className="inline-flex px-2 py-0.5 rounded-full bg-neutral-light text-[11px] font-bold font-body text-neutral-gray tabular-nums">
                                        ×{error.count}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm font-body text-neutral-gray mt-1">
                                {error.cause ?? error.description}
                            </p>
                        </div>

                        {/* Acknowledging is the ordinary action here, so it sits
                            where the thumb lands and asks for nothing. */}
                        {error.acknowledged ? (
                            <button
                                type="button"
                                onClick={() => onReopen(error)}
                                disabled={busy}
                                className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold font-body text-neutral-gray hover:text-text-dark hover:bg-neutral-light transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                Reopen
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => onAcknowledge(error)}
                                disabled={busy}
                                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e3ddd0] text-[11px] font-semibold font-body text-neutral-gray hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50 cursor-pointer"
                                title="Hide this until it happens again"
                            >
                                <CheckIcon size={12} />
                                Acknowledge
                            </button>
                        )}
                    </div>

                    {/* The point of the whole card: what to actually do. */}
                    {error.fix && !error.acknowledged && (
                        <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5">
                            <p className="text-[10px] font-bold font-body text-emerald-700 uppercase tracking-wide mb-0.5">
                                What to do
                            </p>
                            <p className="text-sm font-body text-text-dark">{error.fix}</p>
                        </div>
                    )}

                    {/* Who this was, for sign-in failures. */}
                    {(error.name || error.employee_no || error.role || error.account_status) && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                            {error.name && <Chip label={error.name} />}
                            {error.employee_no && <Chip label={error.employee_no} />}
                            {error.role && <Chip label={error.role} />}
                            {error.account_status && <Chip label={`account ${error.account_status}`} />}
                            {error.ips && error.ips.length > 0 && <Chip label={`IP ${error.ips.join(', ')}`} />}
                        </div>
                    )}

                    {/* Per-account breakdown on the daily summary. */}
                    {error.accounts && error.accounts.length > 0 && (
                        <div className="mt-3 rounded-xl border border-[#f0e8d8] divide-y divide-[#f0e8d8] overflow-hidden">
                            {error.accounts.slice(0, 8).map(a => (
                                <div key={a.identifier} className="px-3 py-2.5 flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-[12px] font-medium font-body text-text-dark truncate">
                                            {a.name ?? a.identifier}
                                            {a.employee_no && (
                                                <span className="text-neutral-gray font-normal"> · {a.employee_no}</span>
                                            )}
                                        </p>
                                        <p className="text-[11px] font-body text-neutral-gray">
                                            {REASON_LABELS[a.reason ?? ''] ?? 'reason not recorded'}
                                            {a.ips.length > 0 && ` · ${a.ips.join(', ')}`}
                                        </p>
                                    </div>
                                    <span className="shrink-0 inline-flex px-2 py-0.5 rounded-full bg-neutral-light text-[11px] font-bold font-body text-neutral-gray tabular-nums">
                                        ×{a.attempts}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-3 text-[11px] font-body text-neutral-gray/70">
                        <span className="inline-flex items-center gap-1">
                            <CatIcon size={11} />
                            {error.category}
                        </span>
                        <span>{relativeTime(error.timestamp)}</span>
                        {error.phone && <span>Phone: {error.phone}</span>}
                        {error.order_number && <span>Order: {error.order_number}</span>}
                        {error.explanation_source === 'ai' && <span title="Explained by AI">AI-explained</span>}
                        {error.acknowledged && error.acknowledged_by && (
                            <span className="inline-flex items-center gap-1 text-emerald-700">
                                <CheckCircleIcon size={11} weight="fill" />
                                Acknowledged by {error.acknowledged_by}
                            </span>
                        )}
                    </div>

                    {/* Raw text last and de-emphasised — it is for the developer
                        you forward this to, not for the manager reading it. */}
                    {error.raw && (
                        <details className="mt-2">
                            <summary className="text-[11px] font-body text-neutral-gray/70 cursor-pointer">
                                Technical detail
                            </summary>
                            <pre className="mt-1.5 text-[11px] font-mono text-neutral-gray whitespace-pre-wrap break-all bg-neutral-light rounded-lg p-2.5 overflow-x-auto">
                                {error.raw}
                            </pre>
                        </details>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Failed job row ───────────────────────────────────────────────────────────

function FailedJobRow({ job, onRetry, onClear }: {
    job: FailedJob;
    onRetry: (uuid: string) => void;
    onClear: (job: FailedJob) => void;
}) {
    return (
        <div className="flex items-start justify-between gap-3 px-4 py-3.5">
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold font-body text-text-dark truncate">{job.job}</p>
                <p className="text-[12px] font-body text-neutral-gray line-clamp-2 mt-0.5">{job.error}</p>
                <p className="text-[11px] font-body text-neutral-gray/60 mt-0.5">
                    {job.queue} queue · {relativeTime(job.failed_at)}
                </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <button
                    type="button"
                    onClick={() => onRetry(job.uuid)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold font-body hover:bg-primary/20 transition-colors cursor-pointer"
                    title="Put this job back on the queue"
                >
                    <ArrowClockwiseIcon size={12} />
                    Retry
                </button>
                <button
                    type="button"
                    onClick={() => onClear(job)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold font-body text-neutral-gray hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Drop it from the queue for good"
                >
                    <TrashIcon size={12} />
                    Clear
                </button>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'open' | 'acknowledged' | 'jobs';

/** Every passcode-gated thing this page can do. */
type Gated =
    | { kind: 'retry'; uuid: string }
    | { kind: 'forget'; uuid: string; job: string }
    | { kind: 'flush'; count: number };

export default function PlatformErrorsPage() {
    const [tab, setTab] = useState<Tab>('open');
    const [severity, setSeverity] = useState<Severity | 'all'>('all');
    const [category, setCategory] = useState<string>('all');

    const { feed, isLoading, isFetching, refetch } = useErrorFeed(50, tab === 'acknowledged');
    const { jobs, total: jobTotal, refetch: refetchJobs } = useFailedJobs();

    const [gated, setGated] = useState<Gated | null>(null);
    const [gateBusy, setGateBusy] = useState(false);
    const [ackBusy, setAckBusy] = useState(false);

    const summary = feed?.summary;

    const visible = useMemo(() => {
        if (!feed) return [];

        return feed.errors
            .filter(e => (tab === 'acknowledged' ? e.acknowledged : !e.acknowledged))
            .filter(e => severity === 'all' || e.severity === severity)
            .filter(e => category === 'all' || e.category === category)
            .sort((a, b) =>
                (SEVERITY[a.severity]?.rank ?? 9) - (SEVERITY[b.severity]?.rank ?? 9) ||
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
    }, [feed, tab, severity, category]);

    const categories = useMemo(
        () => (feed ? Object.keys(feed.summary.by_category).sort() : []),
        [feed],
    );

    // ── Acknowledgement ──

    const acknowledge = async (error: SmartError) => {
        setAckBusy(true);
        try {
            await platformService.acknowledgeError(error);
            await refetch();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Could not acknowledge that.');
        } finally {
            setAckBusy(false);
        }
    };

    const reopen = async (error: SmartError) => {
        setAckBusy(true);
        try {
            await platformService.unacknowledgeError(error.fingerprint);
            await refetch();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Could not reopen that.');
        } finally {
            setAckBusy(false);
        }
    };

    const acknowledgeAll = async () => {
        if (visible.length === 0) return;

        setAckBusy(true);
        try {
            // Only what is on screen. Clearing the server's whole feed would
            // swallow anything that arrived while this page was being read.
            const result = await platformService.acknowledgeAllErrors(visible);
            toast.success(result.message);
            await refetch();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Could not clear those.');
        } finally {
            setAckBusy(false);
        }
    };

    // ── Passcode-gated queue actions ──

    const runGated = async (passcode: string) => {
        if (!gated) return;

        setGateBusy(true);
        try {
            const result =
                gated.kind === 'retry' ? await platformService.retryJob(gated.uuid, passcode)
                : gated.kind === 'forget' ? await platformService.forgetJob(gated.uuid, passcode)
                : await platformService.flushJobs(passcode);

            toast.success(result.message);
            setGated(null);
            await Promise.all([refetchJobs(), refetch()]);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'That did not work.');
        } finally {
            setGateBusy(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <CircleNotchIcon size={32} className="animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <PageHeader
                title="Error Feed"
                subtitle="What has gone wrong across the platform, and what to do about it"
                secondaryAction={{
                    label: isFetching ? 'Refreshing…' : 'Refresh',
                    onClick: () => { refetch(); refetchJobs(); },
                    icon: <ArrowsClockwiseIcon size={16} className={isFetching ? 'animate-spin' : ''} />,
                }}
            />

            {summary && (
                <Verdict
                    critical={summary.critical}
                    errors={summary.errors}
                    warnings={summary.warnings}
                    info={summary.info}
                    acknowledged={summary.acknowledged}
                />
            )}

            <div className="mb-5">
                <SegmentedTabs<Tab>
                    value={tab}
                    onChange={setTab}
                    options={[
                        { value: 'open', label: `Needs attention (${summary?.total ?? 0})` },
                        { value: 'acknowledged', label: `Acknowledged (${summary?.acknowledged ?? 0})` },
                        { value: 'jobs', label: `Failed jobs (${jobTotal})` },
                    ]}
                />
            </div>

            {tab === 'jobs' ? (
                /* ── Failed jobs ── */
                <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                        <p className="text-sm font-body text-neutral-gray">
                            Work the queue could not finish. <strong className="text-text-dark">Retry</strong> puts a
                            job back on the queue; <strong className="text-text-dark">Clear</strong> deletes it, and a
                            cleared job can never be retried.
                            {jobTotal > jobs.length && (
                                <> Showing the newest {jobs.length} of {jobTotal}.</>
                            )}
                        </p>
                        {jobs.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setGated({ kind: 'flush', count: jobTotal })}
                                className="shrink-0 flex items-center gap-2 bg-neutral-card border border-rose-300 text-rose-700 px-4 py-2.5 rounded-xl text-sm font-semibold font-body hover:bg-rose-50 transition-colors min-h-11 cursor-pointer"
                            >
                                <TrashIcon size={16} />
                                Clear all {jobTotal}
                            </button>
                        )}
                    </div>

                    {jobs.length === 0 ? (
                        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl py-14 text-center">
                            <CheckCircleIcon size={30} className="text-emerald-600 mx-auto mb-2" weight="fill" />
                            <p className="text-sm font-semibold font-body text-text-dark">The failed queue is empty</p>
                            <p className="text-sm font-body text-neutral-gray mt-0.5">
                                Every queued job has run through.
                            </p>
                        </div>
                    ) : (
                        <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl divide-y divide-[#f0e8d8] overflow-hidden">
                            {jobs.map(job => (
                                <FailedJobRow
                                    key={job.uuid}
                                    job={job}
                                    onRetry={uuid => setGated({ kind: 'retry', uuid })}
                                    onClear={j => setGated({ kind: 'forget', uuid: j.uuid, job: j.job })}
                                />
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                /* ── Error list ── */
                <>
                    {/* Severity and area are separate questions, and used to
                        share one strip of pills where picking either silently
                        cleared the other. */}
                    <FilterBar>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold font-body text-neutral-gray uppercase tracking-wider">
                                Severity
                            </span>
                            <SegmentedTabs<Severity | 'all'>
                                value={severity}
                                onChange={setSeverity}
                                options={[
                                    { value: 'all', label: 'All' },
                                    { value: 'critical', label: 'Critical' },
                                    { value: 'error', label: 'Error' },
                                    { value: 'warning', label: 'Warning' },
                                    { value: 'info', label: 'Info' },
                                ]}
                            />
                        </div>

                        {categories.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-bold font-body text-neutral-gray uppercase tracking-wider">
                                    Area
                                </span>
                                <SegmentedTabs<string>
                                    value={category}
                                    onChange={setCategory}
                                    options={[
                                        { value: 'all', label: 'All' },
                                        ...categories.map(c => ({ value: c, label: c })),
                                    ]}
                                />
                            </div>
                        )}

                        {tab === 'open' && visible.length > 0 && (
                            <button
                                type="button"
                                onClick={acknowledgeAll}
                                disabled={ackBusy}
                                className="ml-auto flex items-center gap-2 bg-neutral-card border border-[#e3ddd0] text-text-dark px-4 py-2.5 rounded-xl text-sm font-semibold font-body hover:border-emerald-300 hover:text-emerald-700 transition-colors min-h-11 disabled:opacity-50 cursor-pointer"
                            >
                                <CheckIcon size={16} />
                                Acknowledge these {visible.length}
                            </button>
                        )}
                    </FilterBar>

                    <div className="space-y-3">
                        {visible.length === 0 ? (
                            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl py-14 text-center">
                                {tab === 'acknowledged' ? (
                                    <>
                                        <p className="text-sm font-semibold font-body text-text-dark">
                                            Nothing acknowledged
                                        </p>
                                        <p className="text-sm font-body text-neutral-gray mt-0.5">
                                            Items you acknowledge appear here, and return to the feed if they happen again.
                                        </p>
                                    </>
                                ) : severity !== 'all' || category !== 'all' ? (
                                    <>
                                        <p className="text-sm font-semibold font-body text-text-dark">
                                            Nothing matches that filter
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => { setSeverity('all'); setCategory('all'); }}
                                            className="text-sm font-body text-primary mt-1 cursor-pointer hover:underline"
                                        >
                                            Show everything
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheckIcon size={30} className="text-emerald-600 mx-auto mb-2" weight="fill" />
                                        <p className="text-sm font-semibold font-body text-text-dark">All clear</p>
                                        <p className="text-sm font-body text-neutral-gray mt-0.5">
                                            Nothing has gone wrong in the last 24 hours.
                                        </p>
                                    </>
                                )}
                            </div>
                        ) : (
                            visible.map(err => (
                                <ErrorCard
                                    key={err.id}
                                    error={err}
                                    onAcknowledge={acknowledge}
                                    onReopen={reopen}
                                    busy={ackBusy}
                                />
                            ))
                        )}
                    </div>
                </>
            )}

            <PasscodeDialog
                open={gated !== null}
                danger={gated?.kind !== 'retry'}
                title={
                    gated?.kind === 'retry' ? 'Retry this job'
                    : gated?.kind === 'forget' ? 'Clear this job'
                    : 'Empty the failed queue'
                }
                description={
                    gated?.kind === 'retry'
                        ? 'Puts the job back on the queue to run again.'
                        : gated?.kind === 'forget'
                            ? `Deletes ${gated.job} from the queue. It cannot be retried afterwards.`
                            : gated
                                ? `Deletes all ${gated.count} failed jobs. None of them can be retried afterwards.`
                                : undefined
                }
                confirmLabel={gated?.kind === 'retry' ? 'Retry' : 'Clear'}
                onConfirm={runGated}
                onCancel={() => setGated(null)}
                loading={gateBusy}
            />
        </div>
    );
}
