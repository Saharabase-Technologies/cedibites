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
} from '@phosphor-icons/react';
import { useSystemHealth, useActiveSessions } from '@/lib/api/hooks/usePlatform';
import { platformService } from '@/lib/api/services/platform.service';
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlatformHealthPage() {
    const { health, isLoading, refetch } = useSystemHealth();
    const { sessions } = useActiveSessions();
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
            toast.error('Action failed — check your passcode');
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

            {/* Active sessions */}
            {sessions.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#f0e8d8] p-5">
                    <h3 className="text-sm font-semibold font-body text-text-dark mb-3">
                        Active Sessions <span className="text-neutral-gray font-normal">({sessions.length})</span>
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs font-body">
                            <thead>
                                <tr className="text-left text-neutral-gray border-b border-[#f0e8d8]">
                                    <th className="pb-2 pr-4">Name</th>
                                    <th className="pb-2 pr-4">Phone</th>
                                    <th className="pb-2 pr-4">Type</th>
                                    <th className="pb-2 pr-4">Started</th>
                                    <th className="pb-2">Last Active</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#f0e8d8]">
                                {sessions.map(s => (
                                    <tr key={`${s.user_id}-${s.session_started}`} className="text-text-dark">
                                        <td className="py-2 pr-4 font-medium">{s.name}</td>
                                        <td className="py-2 pr-4">{s.phone}</td>
                                        <td className="py-2 pr-4">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                s.token_type === 'staff' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
                                            }`}>
                                                {s.token_type}
                                            </span>
                                        </td>
                                        <td className="py-2 pr-4">{new Date(s.session_started).toLocaleString()}</td>
                                        <td className="py-2">{new Date(s.last_active).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

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
                onConfirm={handlePasscodeConfirm}
                onCancel={() => setPasscodeAction(null)}
                loading={actionLoading}
            />
        </div>
    );
}
