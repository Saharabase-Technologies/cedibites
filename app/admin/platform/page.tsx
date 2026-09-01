'use client';

import { useState } from 'react';
import {
    HeartbeatIcon,
    DatabaseIcon,
    HardDrivesIcon,
    ClockIcon,
    ArrowsClockwiseIcon,
    CheckCircleIcon,
    WarningIcon,
    BroomIcon,
    WrenchIcon,
    CircleNotchIcon,
    ChatCircleTextIcon,
} from '@phosphor-icons/react';
import { useSystemHealth } from '@/lib/api/hooks/usePlatform';
import { SessionsPanel } from './components/SessionsPanel';
import { PasscodeDialog } from './components/PasscodeDialog';
import { platformService, type SmsHealth } from '@/lib/api/services/platform.service';
import { toast } from '@/lib/utils/toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusDot({ ok }: { ok: boolean }) {
    return (
        <span className={`inline-block w-2 h-2 rounded-full ${ok ? 'bg-success' : 'bg-error'}`} />
    );
}

function HealthCard({ title, icon: Icon, status, children }: {
    title: string;
    icon: React.ElementType;
    status: 'healthy' | 'degraded' | 'down' | string;
    children: React.ReactNode;
}) {
    const ok = status === 'healthy' || status === 'connected' || status === 'ok';
    return (
        <div className="bg-white rounded-2xl border border-[#f0e8d8] p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${ok ? 'bg-success/10' : 'bg-error/10'}`}>
                        <Icon size={18} weight="duotone" className={ok ? 'text-success' : 'text-error'} />
                    </div>
                    <h3 className="text-sm font-semibold font-body text-text-dark">{title}</h3>
                </div>
                <StatusDot ok={ok} />
            </div>
            <div className="space-y-2 text-xs font-body text-neutral-gray">{children}</div>
        </div>
    );
}

function Row({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="flex justify-between">
            <span>{label}</span>
            <span className="text-text-dark font-medium">{value}</span>
        </div>
    );
}

function relativeTime(iso: string | null) {
    if (!iso) return 'never';

    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.round(diffMs / 60000);

    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
    return `${Math.round(mins / 1440)}d ago`;
}

/**
 * The banner for a broken SMS pipe.
 *
 * Deliberately loud and deliberately at the top: SMS failed silently in
 * production for three weeks because nothing in the product ever said so — the
 * forgot-password screen reports success whether or not the code was sent, and
 * has to, so as not to leak which accounts exist. This is the one place the
 * truth is allowed to show.
 */
function SmsAlertBanner({ sms }: { sms: SmsHealth }) {
    if (sms.status !== 'critical' && sms.status !== 'warning') return null;

    const critical = sms.status === 'critical';

    return (
        <div
            role="alert"
            className={`rounded-2xl border p-5 ${
                critical ? 'bg-error/5 border-error/30' : 'bg-warning/5 border-warning/30'
            }`}
        >
            <div className="flex items-start gap-3">
                <WarningIcon
                    size={20}
                    weight="fill"
                    className={`shrink-0 mt-0.5 ${critical ? 'text-error' : 'text-warning'}`}
                />
                <div className="min-w-0 flex-1">
                    <h3 className={`text-sm font-bold font-body ${critical ? 'text-error' : 'text-warning'}`}>
                        {sms.reason_label ?? 'SMS delivery is failing'}
                    </h3>

                    <p className="text-xs font-body text-text-dark mt-1">
                        {sms.failed} message{sms.failed === 1 ? '' : 's'} failed in the last {sms.window_hours}h
                        {sms.sent > 0 && ` (${sms.failure_rate}% of ${sms.sent + sms.failed} attempts)`}. Last
                        successful message {relativeTime(sms.last_success_at)}.
                    </p>

                    {sms.remedy && (
                        <p className="text-xs font-body text-neutral-gray mt-2">
                            <span className="font-semibold text-text-dark">What to do: </span>
                            {sms.remedy}
                        </p>
                    )}

                    {sms.affected.length > 0 && (
                        <div className="mt-3">
                            <p className="text-[11px] font-semibold font-body text-text-dark mb-1">
                                Messages being lost
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {sms.affected.slice(0, 6).map(a => (
                                    <span
                                        key={a.notification}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-[#f0e8d8] text-[10px] font-body text-neutral-gray"
                                    >
                                        {a.notification.replace(/Notification$/, '')}
                                        <span className="font-bold text-text-dark">{a.failures}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlatformHealthPage() {
    const { health, isLoading, refetch } = useSystemHealth();
    const [passcodeAction, setPasscodeAction] = useState<'cache' | 'maintenance' | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const handlePasscodeConfirm = async (passcode: string) => {
        setActionLoading(true);
        try {
            if (passcodeAction === 'cache') {
                await platformService.clearCache('all', passcode);
                toast.success('All caches cleared');
            } else if (passcodeAction === 'maintenance') {
                const res = await platformService.toggleMaintenance(passcode);
                toast.success(res.message);
            }
            setPasscodeAction(null);
            refetch();
        } catch {
            toast.error('Action failed. Check your passcode.');
        } finally {
            setActionLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <CircleNotchIcon size={32} className="animate-spin text-primary" />
            </div>
        );
    }

    if (!health) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-neutral-gray font-body text-sm">Unable to load system health.</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold font-body text-text-dark">System Health</h1>
                    <p className="text-xs font-body text-neutral-gray mt-0.5">
                        Real-time platform status &amp; diagnostics
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold font-body ${
                        health.status === 'healthy'
                            ? 'bg-success/10 text-success'
                            : 'bg-error/10 text-error'
                    }`}>
                        {health.status === 'healthy' ? <CheckCircleIcon size={14} weight="fill" /> : <WarningIcon size={14} weight="fill" />}
                        {health.status === 'healthy' ? 'All Systems Operational' : 'Degraded'}
                    </span>
                    <button
                        type="button"
                        onClick={() => refetch()}
                        className="p-2 rounded-xl hover:bg-neutral-light transition-colors text-neutral-gray cursor-pointer"
                        title="Refresh"
                    >
                        <ArrowsClockwiseIcon size={16} />
                    </button>
                </div>
            </div>

            {/* SMS outage banner — above the grid, because a dead SMS pipe is
                invisible everywhere else in the product. */}
            {health.sms && <SmsAlertBanner sms={health.sms} />}

            {/* Health grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {/* PHP */}
                <HealthCard title="PHP Runtime" icon={WrenchIcon} status="healthy">
                    <Row label="Version" value={health.php.version} />
                    <Row label="Memory Limit" value={health.php.memory_limit} />
                    <Row label="Max Upload" value={health.php.upload_max_filesize} />
                </HealthCard>

                {/* Laravel */}
                <HealthCard title="Laravel" icon={HeartbeatIcon} status="healthy">
                    <Row label="Version" value={health.laravel.version} />
                    <Row label="Environment" value={health.laravel.environment} />
                    <Row label="Debug Mode" value={health.laravel.debug_mode} />
                    <Row label="Cache Driver" value={health.laravel.cache_driver} />
                    <Row label="Queue Driver" value={health.laravel.queue_driver} />
                </HealthCard>

                {/* Database */}
                <HealthCard title="Database" icon={DatabaseIcon} status={health.database.status}>
                    <Row label="Driver" value={health.database.driver} />
                    <Row label="Latency" value={`${health.database.latency_ms}ms`} />
                    {health.database.size && <Row label="Size" value={health.database.size} />}
                </HealthCard>

                {/* Cache */}
                <HealthCard title="Cache" icon={HardDrivesIcon} status={health.cache.status}>
                    <Row label="Driver" value={health.cache.driver} />
                    <Row label="Status" value={health.cache.status} />
                </HealthCard>

                {/* Queue */}
                <HealthCard title="Queue" icon={ClockIcon} status={health.queue.status}>
                    <Row label="Driver" value={health.queue.driver} />
                    <Row label="Pending Jobs" value={health.queue.pending_jobs} />
                    <Row label="Failed Jobs" value={health.queue.failed_jobs} />
                </HealthCard>

                {/* SMS */}
                {health.sms && (
                    <HealthCard title="SMS Delivery" icon={ChatCircleTextIcon} status={health.sms.status}>
                        <Row label="Status" value={health.sms.status} />
                        <Row label={`Sent (${health.sms.window_hours}h)`} value={health.sms.sent} />
                        <Row label={`Failed (${health.sms.window_hours}h)`} value={health.sms.failed} />
                        <Row label="Failure Rate" value={`${health.sms.failure_rate}%`} />
                        <Row label="Last Success" value={relativeTime(health.sms.last_success_at)} />
                        {health.sms.status === 'unknown' && (
                            <p className="text-[10px] pt-1">No messages attempted in this window.</p>
                        )}
                    </HealthCard>
                )}

                {/* Disk */}
                <HealthCard title="Disk Usage" icon={HardDrivesIcon} status={health.disk.status}>
                    <Row label="Total" value={health.disk.total} />
                    <Row label="Used" value={health.disk.used} />
                    <Row label="Free" value={health.disk.free} />
                    <div className="mt-1">
                        <div className="w-full h-2 rounded-full bg-neutral-light overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${
                                    parseFloat(health.disk.percent_used) > 85 ? 'bg-error' : 'bg-success'
                                }`}
                                style={{ width: health.disk.percent_used }}
                            />
                        </div>
                        <p className="text-[10px] text-right mt-0.5">{health.disk.percent_used} used</p>
                    </div>
                </HealthCard>
            </div>

            {/* Server uptime */}
            <div className="bg-white rounded-2xl border border-[#f0e8d8] p-5">
                <Row label="Server Uptime" value={health.uptime} />
            </div>

            <SessionsPanel />

            {/* Quick actions */}
            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={() => setPasscodeAction('cache')}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#f0e8d8] text-sm font-medium font-body text-text-dark hover:bg-neutral-light transition-colors cursor-pointer"
                >
                    <BroomIcon size={16} />
                    Clear All Caches
                </button>
                <button
                    type="button"
                    onClick={() => setPasscodeAction('maintenance')}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#f0e8d8] text-sm font-medium font-body text-text-dark hover:bg-neutral-light transition-colors cursor-pointer"
                >
                    <WrenchIcon size={16} />
                    Toggle Maintenance
                </button>
            </div>

            {/* Passcode confirmation */}
            <PasscodeDialog
                open={passcodeAction !== null}
                title={passcodeAction === 'cache' ? 'Clear All Caches' : 'Toggle Maintenance Mode'}
                description={
                    passcodeAction === 'cache'
                        // Said plainly because the button reads like a fix for
                        // anything and is not one: it empties the API's own
                        // caches and reaches nothing on a customer's device.
                        ? 'Empties the API server caches — settings, menu discovery lists and saved error explanations. It does not clear anything on a customer\'s phone or browser, and will not fix a stale screen. Avoid running it while a deploy is in flight.'
                        : 'Takes the API in or out of maintenance mode for everybody.'
                }
                onConfirm={handlePasscodeConfirm}
                onCancel={() => setPasscodeAction(null)}
                loading={actionLoading}
            />
        </div>
    );
}
