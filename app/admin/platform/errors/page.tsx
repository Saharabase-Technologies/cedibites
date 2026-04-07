'use client';

import { useState, useMemo } from 'react';
import {
    WarningCircleIcon,
    FireIcon,
    InfoIcon,
    FunnelIcon,
    ArrowsClockwiseIcon,
    CircleNotchIcon,
    ArrowClockwiseIcon,
    LockKeyIcon,
    CreditCardIcon,
    BugIcon,
    UserIcon,
    PlugIcon,
} from '@phosphor-icons/react';
import { useErrorFeed, useFailedJobs } from '@/lib/api/hooks/usePlatform';
import { platformService, type SmartError } from '@/lib/api/services/platform.service';
import { toast } from '@/lib/utils/toast';

// ─── Config ───────────────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<string, { badge: string; icon: React.ElementType }> = {
    critical: { badge: 'bg-error/10 text-error', icon: FireIcon },
    error:    { badge: 'bg-error/10 text-error', icon: WarningCircleIcon },
    warning:  { badge: 'bg-warning/10 text-warning', icon: WarningCircleIcon },
    info:     { badge: 'bg-info/10 text-info', icon: InfoIcon },
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
    auth: LockKeyIcon,
    payment: CreditCardIcon,
    queue: ArrowClockwiseIcon,
    system: BugIcon,
    user: UserIcon,
    integration: PlugIcon,
};

// ─── Passcode Dialog ──────────────────────────────────────────────────────────

function PasscodeDialog({ open, title, onConfirm, onCancel, loading }: {
    open: boolean;
    title: string;
    onConfirm: (passcode: string) => void;
    onCancel: () => void;
    loading: boolean;
}) {
    const [code, setCode] = useState('');

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
                <h3 className="text-base font-bold font-body text-text-dark mb-1">{title}</h3>
                <p className="text-xs font-body text-neutral-gray mb-4">Enter your 6-digit passcode to confirm.</p>
                <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full px-4 py-3 rounded-xl border border-[#f0e8d8] text-center text-lg font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary/30 mb-4"
                    autoFocus
                />
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-[#f0e8d8] text-sm font-medium font-body text-neutral-gray hover:bg-neutral-light transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => { onConfirm(code); setCode(''); }}
                        disabled={loading || code.length !== 6}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold font-body hover:bg-primary-dark transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        {loading ? <CircleNotchIcon size={16} className="animate-spin mx-auto" /> : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Error Card ───────────────────────────────────────────────────────────────

function ErrorCard({ error }: { error: SmartError }) {
    const sev = SEVERITY_STYLES[error.severity] ?? SEVERITY_STYLES.info;
    const SevIcon = sev.icon;
    const CatIcon = CATEGORY_ICONS[error.category] ?? BugIcon;

    return (
        <div className="bg-white rounded-2xl border border-[#f0e8d8] p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${sev.badge}`}>
                    <SevIcon size={16} weight="fill" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold font-body text-text-dark truncate">{error.title}</h4>
                        {error.count && error.count > 1 && (
                            <span className="inline-flex px-2 py-0.5 rounded-full bg-neutral-light text-[10px] font-bold font-body text-neutral-gray">
                                ×{error.count}
                            </span>
                        )}
                    </div>
                    <p className="text-xs font-body text-neutral-gray mb-2">{error.description}</p>
                    <div className="flex items-center gap-3 text-[10px] font-body text-neutral-gray/70">
                        <span className="inline-flex items-center gap-1">
                            <CatIcon size={10} />
                            {error.category}
                        </span>
                        <span>{new Date(error.timestamp).toLocaleString()}</span>
                        {error.phone && <span>Phone: {error.phone}</span>}
                        {error.order_number && <span>Order: {error.order_number}</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlatformErrorsPage() {
    const { feed, isLoading, refetch } = useErrorFeed();
    const { jobs, refetch: refetchJobs } = useFailedJobs();
    const [filter, setFilter] = useState<string>('all');
    const [retryTarget, setRetryTarget] = useState<string | null>(null);
    const [retryLoading, setRetryLoading] = useState(false);

    const filteredErrors = useMemo(() => {
        if (!feed) return [];
        if (filter === 'all') return feed.errors;
        return feed.errors.filter(e => e.severity === filter || e.category === filter);
    }, [feed, filter]);

    const categories = useMemo(() => {
        if (!feed) return [];
        return Object.keys(feed.summary.by_category);
    }, [feed]);

    const handleRetryJob = async (passcode: string) => {
        if (!retryTarget) return;
        setRetryLoading(true);
        try {
            await platformService.retryJob(retryTarget, passcode);
            toast.success('Job queued for retry');
            setRetryTarget(null);
            refetchJobs();
        } catch {
            toast.error('Retry failed — check your passcode');
        } finally {
            setRetryLoading(false);
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
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold font-body text-text-dark">Error Feed</h1>
                    <p className="text-xs font-body text-neutral-gray mt-0.5">
                        Business-friendly error summaries from across the platform
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => refetch()}
                    className="p-2 rounded-xl hover:bg-neutral-light transition-colors text-neutral-gray cursor-pointer"
                    title="Refresh"
                >
                    <ArrowsClockwiseIcon size={16} />
                </button>
            </div>

            {/* Summary cards */}
            {feed && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                        { label: 'Total', value: feed.summary.total, color: 'text-text-dark' },
                        { label: 'Critical', value: feed.summary.critical, color: 'text-error' },
                        { label: 'Errors', value: feed.summary.errors, color: 'text-error/70' },
                        { label: 'Warnings', value: feed.summary.warnings, color: 'text-warning' },
                        { label: 'Info', value: feed.summary.info, color: 'text-info' },
                    ].map(s => (
                        <div key={s.label} className="bg-white rounded-2xl border border-[#f0e8d8] p-4 text-center">
                            <p className="text-[10px] font-body text-neutral-gray uppercase tracking-wider">{s.label}</p>
                            <p className={`text-2xl font-bold font-body ${s.color} mt-0.5`}>{s.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
                <FunnelIcon size={14} className="text-neutral-gray" />
                {['all', 'critical', 'error', 'warning', 'info', ...categories].map(f => (
                    <button
                        key={f}
                        type="button"
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold font-body transition-colors cursor-pointer ${
                            filter === f
                                ? 'bg-primary text-white'
                                : 'bg-neutral-light text-neutral-gray hover:bg-primary/10'
                        }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Error list */}
            <div className="space-y-3">
                {filteredErrors.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-sm font-body text-neutral-gray">No errors to display</p>
                    </div>
                ) : (
                    filteredErrors.map(err => <ErrorCard key={err.id} error={err} />)
                )}
            </div>

            {/* Failed Jobs section */}
            {jobs.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#f0e8d8] p-5">
                    <h3 className="text-sm font-semibold font-body text-text-dark mb-3">
                        Failed Jobs <span className="text-neutral-gray font-normal">({jobs.length})</span>
                    </h3>
                    <div className="space-y-2">
                        {jobs.map(job => (
                            <div key={job.id} className="flex items-center justify-between py-2 border-b border-[#f0e8d8] last:border-0">
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium font-body text-text-dark truncate">{job.job}</p>
                                    <p className="text-[10px] font-body text-neutral-gray truncate">{job.error}</p>
                                    <p className="text-[10px] font-body text-neutral-gray/60">{new Date(job.failed_at).toLocaleString()}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setRetryTarget(job.uuid)}
                                    className="ml-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-[10px] font-bold font-body hover:bg-primary/20 transition-colors shrink-0 cursor-pointer"
                                >
                                    <ArrowClockwiseIcon size={12} />
                                    Retry
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Retry passcode dialog */}
            <PasscodeDialog
                open={retryTarget !== null}
                title="Retry Failed Job"
                onConfirm={handleRetryJob}
                onCancel={() => setRetryTarget(null)}
                loading={retryLoading}
            />
        </div>
    );
}
