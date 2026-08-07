'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
    MagnifyingGlassIcon,
    CaretLeftIcon,
    CaretRightIcon,
    FunnelIcon,
    DownloadSimpleIcon,
    ClockCounterClockwiseIcon,
    InfoIcon,
    WarningCircleIcon as WarningIcon,
    FireIcon,
} from '@phosphor-icons/react';
import { useActivityLogs, useActivityLogCausers } from '@/lib/api/hooks/useActivityLogs';
import type { ActivityLog, ActivityLogEntity, ActivityLogSeverity } from '@/types/api';

// ─── Config ───────────────────────────────────────────────────────────────────

// Action labels — keep these exactly aligned with the events emitted by the
// backend (search for `->event('...')` in cedibites_api). Grouped here for the
// filter dropdown so investigators can pinpoint what they're after quickly.
const EVENT_LABELS: Record<string, string> = {
    // Orders
    status_changed: 'Order Status Change',
    cancel_requested: 'Cancellation Requested',
    cancel_approved: 'Cancellation Approved',
    cancel_rejected: 'Cancellation Rejected',
    cancelled: 'Order Cancelled',
    refunded: 'Refund Issued',
    note_added: 'Internal Note Added',

    // Staff auth & lifecycle
    staff_login: 'Staff Login',
    staff_login_failed: 'Staff Login Failed',
    staff_logout: 'Staff Logout',
    force_logout: 'Staff Force Logout',
    password_reset_required: 'Password Reset Required',
    role_changed: 'Role Changed',

    // Shifts
    shift_started: 'Shift Started',
    shift_ended: 'Shift Ended',

    // Customers
    customer_login: 'Customer Login',
    customer_logout: 'Customer Logout',
    profile_updated: 'Customer Profile Updated',
    customer_deleted: 'Customer Deleted',
    customer_suspended: 'Customer Suspended',
    customer_unsuspended: 'Customer Unsuspended',
    customer_force_logout: 'Customer Force Logout',

    // System / Platform
    job_retried: 'Failed Job Retried',
    cache_cleared: 'Cache Cleared',
    maintenance_toggled: 'Maintenance Toggled',
    admin_created: 'Admin Created',
    admin_revoked: 'Admin Revoked',
    password_reset: 'Admin Password Reset',
    passwords_viewed: 'Passwords Viewed',
    password_viewed: 'Password Viewed',
    passcode_changed: 'Passcode Changed',
    passcode_failed: 'Passcode Failed',

    // Generic Eloquent model events (User / Customer / Employee / Branch / Menu / Promo)
    // These fire automatically via Spatie ActivityLog whenever a tracked field changes.
    created: 'Record Created',
    updated: 'Record Updated',
    deleted: 'Record Deleted',
};

// Field labels for the property diff — keeps the audit trail human-readable
// when a tracked attribute on a model changes (e.g. user.name → "Old → New").
const FIELD_LABELS: Record<string, string> = {
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    status: 'Status',
    user_id: 'User',
    employee_no: 'Employee No.',
    hire_date: 'Hire Date',
    performance_rating: 'Performance Rating',
    ssnit_number: 'SSNIT Number',
    ghana_card_id: 'Ghana Card ID',
    tin_number: 'TIN Number',
    date_of_birth: 'Date of Birth',
    nationality: 'Nationality',
    emergency_contact_name: 'Emergency Contact Name',
    emergency_contact_phone: 'Emergency Contact Phone',
    emergency_contact_relationship: 'Emergency Contact Relationship',
    is_guest: 'Guest',
    is_active: 'Active',
    address: 'Address',
    must_reset_password: 'Must Reset Password',
    password_reset_required_at: 'Password Reset Required At',
    platform_passcode: 'Platform Passcode',
    extended_staff_access: 'Extended Staff Access',
    extended_order_access: 'Extended Order Access',
};

// Fields whose stored values are encrypted ciphertext (or otherwise unsafe to
// render). We confirm the field changed but mask the actual values.
const MASKED_FIELDS = new Set(['ssnit_number', 'ghana_card_id', 'tin_number', 'platform_passcode']);

function formatFieldName(key: string): string {
    return FIELD_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatFieldValue(key: string, value: unknown): string {
    if (MASKED_FIELDS.has(key)) return '••••••';
    if (value === null || value === undefined || value === '') return '∅';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

interface PropertiesShape {
    attributes?: Record<string, unknown>;
    old?: Record<string, unknown>;
}

function getPropertyDiff(properties: Record<string, unknown>): { key: string; from: string; to: string }[] {
    const props = properties as PropertiesShape;
    const next = props.attributes ?? {};
    const prev = props.old ?? {};
    const keys = new Set<string>([...Object.keys(prev), ...Object.keys(next)]);
    return Array.from(keys).map((key) => ({
        key,
        from: formatFieldValue(key, prev[key]),
        to: formatFieldValue(key, next[key]),
    }));
}

// Logical grouping for the dropdown <optgroup>s — order matters.
const EVENT_GROUPS: { label: string; events: string[] }[] = [
    {
        label: 'Orders',
        events: ['status_changed', 'cancel_requested', 'cancel_approved', 'cancel_rejected', 'cancelled', 'refunded', 'note_added'],
    },
    {
        label: 'Staff',
        events: ['staff_login', 'staff_login_failed', 'staff_logout', 'force_logout', 'password_reset_required', 'role_changed'],
    },
    {
        label: 'Shifts',
        events: ['shift_started', 'shift_ended'],
    },
    {
        label: 'Customers',
        events: ['customer_login', 'customer_logout', 'profile_updated', 'customer_deleted', 'customer_suspended', 'customer_unsuspended', 'customer_force_logout'],
    },
    {
        label: 'System',
        events: ['job_retried', 'cache_cleared', 'maintenance_toggled', 'admin_created', 'admin_revoked', 'password_reset', 'passwords_viewed', 'password_viewed', 'passcode_changed', 'passcode_failed'],
    },
    {
        // Generic record-level audit events emitted by Spatie when a tracked
        // model field changes. Use these to find any edit on a Staff/Customer/
        // Branch/Menu record when you don't know the precise event name.
        label: 'Record Changes',
        events: ['created', 'updated', 'deleted'],
    },
];

const SEVERITY_STYLES: Record<ActivityLogSeverity, { badge: string; dot: string; icon: React.ElementType }> = {
    info:        { badge: 'bg-info/10 text-info',           dot: 'bg-info',    icon: InfoIcon    },
    warning:     { badge: 'bg-warning/10 text-warning',     dot: 'bg-warning', icon: WarningIcon },
    destructive: { badge: 'bg-error/10 text-error',         dot: 'bg-error',   icon: FireIcon    },
};

const ENTITY_TYPES: (ActivityLogEntity | 'auth')[] = ['order', 'staff', 'branch', 'menu', 'customer', 'system', 'auth'];
const SEVERITY_TYPES: ActivityLogSeverity[] = ['info', 'warning', 'destructive'];

const PAGE_SIZE = 15;

function getDateRange(
    preset: string,
    custom?: { date_from: string; date_to: string },
): { date_from?: string; date_to?: string } {
    const now = new Date();
    const toDate = (d: Date) => d.toISOString().slice(0, 10);
    switch (preset) {
        case 'Today':
            return { date_from: toDate(now), date_to: toDate(now) };
        case 'Yesterday': {
            const y = new Date(now);
            y.setDate(y.getDate() - 1);
            return { date_from: toDate(y), date_to: toDate(y) };
        }
        case 'This Week': {
            const start = new Date(now);
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1);
            start.setDate(diff);
            return { date_from: toDate(start), date_to: toDate(now) };
        }
        case 'This Month':
            return { date_from: toDate(new Date(now.getFullYear(), now.getMonth(), 1)), date_to: toDate(now) };
        case 'Custom':
            return custom?.date_from && custom?.date_to
                ? { date_from: custom.date_from, date_to: custom.date_to }
                : {};
        default:
            return {};
    }
}

function formatTimestamp(iso: string): string {
    const d = new Date(iso);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    return isToday ? `Today ${time}` : d.toLocaleDateString() + ' ' + time;
}

function getActionLabel(event: string | null): string {
    return (event && EVENT_LABELS[event]) || event || 'Activity';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: ActivityLogSeverity }) {
    const cfg = SEVERITY_STYLES[severity];
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-body ${cfg.badge}`}>
            <Icon size={10} weight="fill" />
            {severity.charAt(0).toUpperCase() + severity.slice(1)}
        </span>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminAuditPage() {
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [selectedEntity, setSelectedEntity] = useState<ActivityLogEntity | 'auth' | 'All'>('All');
    const [selectedSeverity, setSelectedSeverity] = useState<ActivityLogSeverity | 'All'>('All');
    const [datePreset, setDatePreset] = useState('Today');
    const [customDateFrom, setCustomDateFrom] = useState<string>(() => new Date().toISOString().slice(0, 10));
    const [customDateTo, setCustomDateTo] = useState<string>(() => new Date().toISOString().slice(0, 10));
    const [selectedEvent, setSelectedEvent] = useState<string | 'All'>('All');
    const [selectedCauserId, setSelectedCauserId] = useState<number | 'All'>('All');
    const [page, setPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setSearch(searchInput), 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    const dateRange = useMemo(
        () => getDateRange(datePreset, datePreset === 'Custom' ? { date_from: customDateFrom, date_to: customDateTo } : undefined),
        [datePreset, customDateFrom, customDateTo],
    );

    const params = useMemo(() => ({
        page,
        per_page: PAGE_SIZE,
        search: search.trim() || undefined,
        entity: selectedEntity !== 'All' ? selectedEntity : undefined,
        severity: selectedSeverity !== 'All' ? selectedSeverity : undefined,
        event: selectedEvent !== 'All' ? selectedEvent : undefined,
        causer_id: selectedCauserId !== 'All' ? selectedCauserId : undefined,
        ...dateRange,
    }), [page, selectedEntity, selectedSeverity, selectedEvent, selectedCauserId, search, dateRange]);

    const { entries, meta, isLoading, error, refetch } = useActivityLogs(params);
    // Causers list narrowed by current date scope (keeps the dropdown short & relevant).
    const { causers } = useActivityLogCausers(dateRange);

    const handleExportCsv = useCallback(() => {
        const headers = ['Timestamp', 'Action', 'Details', 'Actor', 'Entity', 'Severity', 'IP'];
        const rows = entries.map(e => [
            formatTimestamp(e.created_at),
            getActionLabel(e.event),
            e.description,
            e.causer?.name ?? 'System',
            e.entity,
            e.severity,
            e.ip_address ?? '—',
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [entries]);

    const totalPages = meta?.last_page ?? 1;
    const totalCount = meta?.total ?? 0;

    return (
        <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-text-dark text-2xl font-bold font-body">Audit Log</h1>
                    <p className="text-neutral-gray text-sm font-body mt-0.5">
                        Read-only · {isLoading ? 'Loading…' : `${totalCount} entries`}
                    </p>
                </div>
                <button type="button" onClick={handleExportCsv}
                    disabled={entries.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-card border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-medium font-body hover:border-primary/40 transition-colors cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed">
                    <DownloadSimpleIcon size={15} weight="bold" className="text-primary" />
                    Export CSV
                </button>
            </div>

            {/* Legend */}
            <div className="flex gap-4 mb-5 flex-wrap">
                {SEVERITY_TYPES.map(s => {
                    const cfg = SEVERITY_STYLES[s];
                    const Icon = cfg.icon;
                    return (
                        <div key={s} className="flex items-center gap-1.5">
                            <Icon size={12} weight="fill" className={`${s === 'info' ? 'text-info' : s === 'warning' ? 'text-warning' : 'text-error'}`} />
                            <span className="text-neutral-gray text-xs font-body capitalize">{s}</span>
                        </div>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-4 mb-4">
                <div className="flex gap-3 mb-3">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-gray" />
                        <input type="text" value={searchInput} onChange={e => { setSearchInput(e.target.value); setPage(1); }}
                            placeholder="Search description…"
                            className="w-full pl-9 pr-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body placeholder:text-neutral-gray/60 focus:outline-none focus:border-primary/40" />
                    </div>
                    <button type="button" onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium font-body transition-colors cursor-pointer ${showFilters ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-neutral-light border-[#f0e8d8] text-neutral-gray hover:text-text-dark'}`}>
                        <FunnelIcon size={15} weight={showFilters ? 'fill' : 'regular'} />
                        Filters
                    </button>
                </div>

                {/* Date presets */}
                <div className="flex gap-2 flex-wrap mb-2">
                    {['Today', 'Yesterday', 'This Week', 'This Month', 'Custom'].map(p => (
                        <button key={p} type="button" onClick={() => { setDatePreset(p); setPage(1); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium font-body transition-all cursor-pointer ${datePreset === p ? 'bg-primary text-white' : 'bg-neutral-light text-neutral-gray hover:text-text-dark'}`}>
                            {p}
                        </button>
                    ))}
                </div>

                {datePreset === 'Custom' && (
                    <div className="flex flex-col sm:flex-row gap-3 mb-2">
                        <input
                            type="date"
                            value={customDateFrom}
                            onChange={(event) => { setCustomDateFrom(event.target.value); setPage(1); }}
                            className="px-3 py-2 rounded-xl border border-[#f0e8d8] bg-neutral-light text-sm font-body text-text-dark focus:outline-none focus:border-primary/40"
                        />
                        <input
                            type="date"
                            value={customDateTo}
                            onChange={(event) => { setCustomDateTo(event.target.value); setPage(1); }}
                            className="px-3 py-2 rounded-xl border border-[#f0e8d8] bg-neutral-light text-sm font-body text-text-dark focus:outline-none focus:border-primary/40"
                        />
                    </div>
                )}

                {/* Expanded filters */}
                {showFilters && (
                    <div className="border-t border-[#f0e8d8] pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Entity Type</p>
                            <div className="flex flex-wrap gap-1.5">
                                {(['All', ...ENTITY_TYPES] as const).map(e => (
                                    <button key={e} type="button" onClick={() => { setSelectedEntity(e); setPage(1); }}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-medium font-body transition-all cursor-pointer capitalize ${selectedEntity === e ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-neutral-light text-neutral-gray hover:text-text-dark border border-transparent'}`}>
                                        {e}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Severity</p>
                            <div className="flex flex-wrap gap-1.5">
                                {(['All', ...SEVERITY_TYPES] as const).map(s => (
                                    <button key={s} type="button" onClick={() => { setSelectedSeverity(s); setPage(1); }}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-medium font-body transition-all cursor-pointer capitalize ${selectedSeverity === s ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-neutral-light text-neutral-gray hover:text-text-dark border border-transparent'}`}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Action Type</p>
                            <select
                                value={selectedEvent}
                                onChange={(e) => { setSelectedEvent(e.target.value || 'All'); setPage(1); }}
                                className="w-full px-3 py-2 rounded-xl border border-[#f0e8d8] bg-neutral-light text-sm font-body text-text-dark focus:outline-none focus:border-primary/40"
                            >
                                <option value="All">All actions</option>
                                {EVENT_GROUPS.map((group) => (
                                    <optgroup key={group.label} label={group.label}>
                                        {group.events.map((evt) => (
                                            <option key={evt} value={evt}>{EVENT_LABELS[evt]}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">User (Causer)</p>
                            <select
                                value={selectedCauserId}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setSelectedCauserId(v === 'All' ? 'All' : Number(v));
                                    setPage(1);
                                }}
                                className="w-full px-3 py-2 rounded-xl border border-[#f0e8d8] bg-neutral-light text-sm font-body text-text-dark focus:outline-none focus:border-primary/40"
                            >
                                <option value="All">All users</option>
                                {causers.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}{c.email ? ` (${c.email})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {(selectedEntity !== 'All' || selectedSeverity !== 'All' || selectedEvent !== 'All' || selectedCauserId !== 'All') && (
                            <div className="sm:col-span-2 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedEntity('All');
                                        setSelectedSeverity('All');
                                        setSelectedEvent('All');
                                        setSelectedCauserId('All');
                                        setPage(1);
                                    }}
                                    className="text-xs font-medium font-body text-primary hover:underline cursor-pointer"
                                >
                                    Clear all filters
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Log table */}
            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden mb-4">

                {/* Table header */}
                <div className="hidden md:grid grid-cols-[140px_1fr_90px_80px_90px_90px] gap-4 px-4 py-3 border-b border-[#f0e8d8] bg-[#faf6f0]">
                    {['Timestamp', 'Details', 'Actor', 'Entity', 'Severity', 'IP'].map(h => (
                        <span key={h} className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-wider">{h}</span>
                    ))}
                </div>

                {error ? (
                    <div className="px-4 py-16 text-center">
                        <p className="text-error text-sm font-body">Failed to load audit log. Please try again.</p>
                        <button type="button" onClick={() => refetch()} className="mt-3 text-primary text-sm font-medium hover:underline">
                            Retry
                        </button>
                    </div>
                ) : isLoading ? (
                    <div className="px-4 py-16 text-center">
                        <ClockCounterClockwiseIcon size={32} weight="thin" className="text-neutral-gray/40 mx-auto mb-3 animate-spin" />
                        <p className="text-neutral-gray text-sm font-body">Loading audit log…</p>
                    </div>
                ) : entries.length === 0 ? (
                    <div className="px-4 py-16 text-center">
                        <ClockCounterClockwiseIcon size={32} weight="thin" className="text-neutral-gray/40 mx-auto mb-3" />
                        <p className="text-neutral-gray text-sm font-body">No log entries match your filters.</p>
                    </div>
                ) : (
                    entries.map((entry: ActivityLog, i: number) => {
                        const severityCfg = SEVERITY_STYLES[entry.severity];
                        return (
                            <div
                                key={entry.id}
                                className={`px-4 py-3.5 flex flex-col md:grid md:grid-cols-[140px_1fr_90px_80px_90px_90px] gap-2 md:gap-4 md:items-start ${i < entries.length - 1 ? 'border-b border-[#f0e8d8]' : ''} hover:bg-neutral-light/50 transition-colors`}
                            >
                                {/* Timestamp */}
                                <div className="flex items-center gap-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${severityCfg.dot}`} />
                                    <span className="text-neutral-gray text-[10px] font-body whitespace-nowrap">{formatTimestamp(entry.created_at)}</span>
                                </div>

                                {/* Details */}
                                <div>
                                    <p className="text-text-dark text-xs font-semibold font-body">{getActionLabel(entry.event)}</p>
                                    <p className="text-neutral-gray text-[11px] font-body mt-0.5 leading-relaxed">{entry.description}</p>
                                    {(() => {
                                        const diff = getPropertyDiff(entry.properties);
                                        if (diff.length === 0) return null;
                                        return (
                                            <ul className="mt-1.5 space-y-0.5">
                                                {diff.map((d) => (
                                                    <li key={d.key} className="text-[10px] font-body text-neutral-gray">
                                                        <span className="font-semibold text-text-dark">{formatFieldName(d.key)}:</span>{' '}
                                                        <span className="line-through text-error/70">{d.from}</span>{' '}
                                                        <span className="text-neutral-gray">→</span>{' '}
                                                        <span className="text-success font-medium">{d.to}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        );
                                    })()}
                                </div>

                                {/* Actor */}
                                <div>
                                    <p className="text-text-dark text-xs font-semibold font-body">{entry.causer?.name ?? 'System'}</p>
                                    <p className="text-neutral-gray text-[10px] font-body">{entry.causer ? 'Staff' : 'System'}</p>
                                </div>

                                {/* Entity */}
                                <span className="text-neutral-gray text-xs font-body capitalize">{entry.entity}</span>

                                {/* Severity */}
                                <SeverityBadge severity={entry.severity} />

                                {/* IP */}
                                <span className="text-neutral-gray text-[10px] font-body font-mono">{entry.ip_address || '—'}</span>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                        className="flex items-center gap-2 text-sm font-body font-medium text-neutral-gray disabled:opacity-40 hover:text-text-dark transition-colors cursor-pointer disabled:cursor-not-allowed">
                        <CaretLeftIcon size={14} weight="bold" /> Previous
                    </button>
                    <span className="text-neutral-gray text-xs font-body">Page {page} of {totalPages} · {totalCount} entries</span>
                    <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                        className="flex items-center gap-2 text-sm font-body font-medium text-neutral-gray disabled:opacity-40 hover:text-text-dark transition-colors cursor-pointer disabled:cursor-not-allowed">
                        Next <CaretRightIcon size={14} weight="bold" />
                    </button>
                </div>
            )}

            <p className="text-neutral-gray/40 text-xs font-body text-center mt-6">
                Audit log is read-only · Entries cannot be edited or deleted · Admin access only
            </p>
        </div>
    );
}
