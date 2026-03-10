'use client';

import { useState, useMemo } from 'react';
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

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionType =
    | 'login' | 'logout'
    | 'order_status_change' | 'order_cancel' | 'refund_issued'
    | 'menu_item_edited' | 'staff_account_changed' | 'branch_settings_changed'
    | 'password_reset' | 'role_changed' | 'customer_suspended' | 'sms_sent'
    | 'order_created' | 'staff_created' | 'branch_created' | 'customer_deleted';

type Severity = 'info' | 'warning' | 'destructive';

type EntityType = 'order' | 'staff' | 'branch' | 'menu' | 'customer' | 'system' | 'auth';

interface AuditEntry {
    id: string;
    timestamp: string;
    actor: string;
    actorRole: string;
    action: ActionType;
    entity: EntityType;
    details: string;
    ip: string;
    severity: Severity;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const LOG: AuditEntry[] = [
    { id: 'a001', timestamp: 'Today 08:15:42', actor: 'Nana Kwame Adjei',  actorRole: 'Admin',          action: 'order_status_change',    entity: 'order',    details: 'Changed order #CB847291 status from Preparing → Out for Delivery', ip: '41.66.12.5',   severity: 'info'        },
    { id: 'a002', timestamp: 'Today 08:18:30', actor: 'Kofi Acheampong',   actorRole: 'Branch Staff',   action: 'order_status_change',    entity: 'order',    details: 'Changed order #CB204837 status from Received → Preparing',         ip: '41.66.12.8',   severity: 'info'        },
    { id: 'a003', timestamp: 'Today 08:45:11', actor: 'Nana Kwame Adjei',  actorRole: 'Admin',          action: 'order_cancel',           entity: 'order',    details: 'Cancelled order #CB332211. Reason: Customer requested cancellation', ip: '41.66.12.5',  severity: 'warning'     },
    { id: 'a004', timestamp: 'Today 09:00:04', actor: 'Ama Boateng',       actorRole: 'Branch Manager', action: 'menu_item_edited',       entity: 'menu',     details: 'Updated "Jollof Rice (Assorted)" price from GHS 80 → GHS 85',      ip: '102.89.4.21',  severity: 'info'        },
    { id: 'a005', timestamp: 'Today 09:15:33', actor: 'Nana Kwame Adjei',  actorRole: 'Admin',          action: 'refund_issued',          entity: 'order',    details: 'Issued full refund of GHS 59.00 for order #CB998812 via Mobile Money', ip: '41.66.12.5', severity: 'warning'    },
    { id: 'a006', timestamp: 'Today 09:30:00', actor: 'System',            actorRole: 'System',         action: 'sms_sent',               entity: 'system',   details: 'Order confirmation SMS sent to 0244123456 for order #CB847291',    ip: '—',            severity: 'info'        },
    { id: 'a007', timestamp: 'Today 09:45:22', actor: 'Nana Kwame Adjei',  actorRole: 'Admin',          action: 'staff_account_changed',  entity: 'staff',    details: 'Suspended staff account: Kweku Baiden (Branch Staff - East Legon)', ip: '41.66.12.5',  severity: 'warning'     },
    { id: 'a008', timestamp: 'Today 10:00:05', actor: 'Nana Kwame Adjei',  actorRole: 'Admin',          action: 'role_changed',           entity: 'staff',    details: 'Changed role: Adjoa Nyarko from Branch Staff → Branch Manager',     ip: '41.66.12.5',  severity: 'destructive' },
    { id: 'a009', timestamp: 'Today 10:15:44', actor: 'Kwame Asante',      actorRole: 'Branch Manager', action: 'branch_settings_changed',entity: 'branch',   details: 'Updated Osu branch delivery radius from 4km → 5km',                ip: '102.89.5.14',  severity: 'info'        },
    { id: 'a010', timestamp: 'Today 10:30:09', actor: 'Nana Kwame Adjei',  actorRole: 'Admin',          action: 'password_reset',         entity: 'staff',    details: 'Force password reset applied to Esi Darko account',                ip: '41.66.12.5',   severity: 'warning'     },
    { id: 'a011', timestamp: 'Today 11:00:18', actor: 'Yaa Asantewaa',     actorRole: 'Call Center',    action: 'order_created',          entity: 'order',    details: 'Created new order #CB449900 for customer 0277890123 at Osu branch', ip: '197.255.3.44', severity: 'info'        },
    { id: 'a012', timestamp: 'Today 11:30:55', actor: 'Nana Kwame Adjei',  actorRole: 'Admin',          action: 'customer_suspended',     entity: 'customer', details: 'Suspended customer account: Efua Mensah (0249654321)',              ip: '41.66.12.5',   severity: 'destructive' },
    { id: 'a013', timestamp: 'Today 12:00:01', actor: 'Ama Boateng',       actorRole: 'Branch Manager', action: 'staff_created',          entity: 'staff',    details: 'Created new staff account: Kwabena Opoku (Branch Staff - East Legon)', ip: '102.89.4.21', severity: 'info'     },
    { id: 'a014', timestamp: 'Today 12:45:37', actor: 'Nana Kwame Adjei',  actorRole: 'Admin',          action: 'branch_created',         entity: 'branch',   details: 'Created new branch: Accra Mall — Manager: Kofi Acheampong',         ip: '41.66.12.5',   severity: 'info'        },
    { id: 'a015', timestamp: 'Today 13:15:00', actor: 'System',            actorRole: 'System',         action: 'sms_sent',               entity: 'system',   details: 'Order cancelled SMS sent to 0244789123 for order #CB332211',        ip: '—',            severity: 'info'        },
    { id: 'a016', timestamp: 'Today 13:30:44', actor: 'Abena Mensah',      actorRole: 'Branch Manager', action: 'menu_item_edited',       entity: 'menu',     details: 'Toggled "Fried Yam (Large)" availability to false at Spintex',      ip: '102.89.6.7',   severity: 'warning'     },
    { id: 'a017', timestamp: 'Today 14:00:22', actor: 'Nana Kwame Adjei',  actorRole: 'Admin',          action: 'customer_deleted',       entity: 'customer', details: 'Permanently deleted customer account: [Anonymised]. Order history retained.', ip: '41.66.12.5', severity: 'destructive'},
    { id: 'a018', timestamp: 'Today 14:15:09', actor: 'Kofi Acheampong',   actorRole: 'Branch Staff',   action: 'login',                  entity: 'auth',     details: 'Staff login from Osu branch POS terminal',                          ip: '41.66.18.44',  severity: 'info'        },
    { id: 'a019', timestamp: 'Today 14:45:00', actor: 'Nana Kwame Adjei',  actorRole: 'Admin',          action: 'refund_issued',          entity: 'order',    details: 'Partial refund of GHS 35.00 issued for order #CB773300 (cash)',      ip: '41.66.12.5',   severity: 'warning'     },
    { id: 'a020', timestamp: 'Today 15:00:33', actor: 'Ama Boateng',       actorRole: 'Branch Manager', action: 'branch_settings_changed',entity: 'branch',   details: 'Updated East Legon branch status to Closed for maintenance',         ip: '102.89.4.21',  severity: 'warning'     },
];

// ─── Config ───────────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<ActionType, string> = {
    login:                    'Login',
    logout:                   'Logout',
    order_status_change:      'Order Status Change',
    order_cancel:             'Order Cancelled',
    refund_issued:            'Refund Issued',
    menu_item_edited:         'Menu Item Edited',
    staff_account_changed:    'Staff Account Changed',
    branch_settings_changed:  'Branch Settings Changed',
    password_reset:           'Password Reset',
    role_changed:             'Role Changed',
    customer_suspended:       'Customer Suspended',
    sms_sent:                 'SMS Sent',
    order_created:            'Order Created',
    staff_created:            'Staff Created',
    branch_created:           'Branch Created',
    customer_deleted:         'Customer Deleted',
};

const SEVERITY_STYLES: Record<Severity, { badge: string; dot: string; icon: React.ElementType }> = {
    info:        { badge: 'bg-info/10 text-info',           dot: 'bg-info',    icon: InfoIcon    },
    warning:     { badge: 'bg-warning/10 text-warning',     dot: 'bg-warning', icon: WarningIcon },
    destructive: { badge: 'bg-error/10 text-error',         dot: 'bg-error',   icon: FireIcon    },
};

const ENTITY_TYPES: EntityType[] = ['order', 'staff', 'branch', 'menu', 'customer', 'system', 'auth'];
const SEVERITY_TYPES: Severity[] = ['info', 'warning', 'destructive'];

const PAGE_SIZE = 15;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: Severity }) {
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
    const [search, setSearch] = useState('');
    const [selectedEntity, setSelectedEntity] = useState<EntityType | 'All'>('All');
    const [selectedSeverity, setSelectedSeverity] = useState<Severity | 'All'>('All');
    const [datePreset, setDatePreset] = useState('Today');
    const [page, setPage] = useState(0);
    const [showFilters, setShowFilters] = useState(false);

    const filtered = useMemo(() => {
        let list = LOG;
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(e =>
                e.actor.toLowerCase().includes(q) ||
                e.details.toLowerCase().includes(q) ||
                ACTION_LABELS[e.action].toLowerCase().includes(q)
            );
        }
        if (selectedEntity !== 'All')   list = list.filter(e => e.entity === selectedEntity);
        if (selectedSeverity !== 'All') list = list.filter(e => e.severity === selectedSeverity);
        return list;
    }, [search, selectedEntity, selectedSeverity]);

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    return (
        <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-text-dark text-2xl font-bold font-body">Audit Log</h1>
                    <p className="text-neutral-gray text-sm font-body mt-0.5">Read-only · {filtered.length} entries shown</p>
                </div>
                <button type="button"
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-card border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-medium font-body hover:border-primary/40 transition-colors cursor-pointer shrink-0">
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
                        <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
                            placeholder="Search actor, action, order number…"
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
                        <button key={p} type="button" onClick={() => setDatePreset(p)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium font-body transition-all cursor-pointer ${datePreset === p ? 'bg-primary text-white' : 'bg-neutral-light text-neutral-gray hover:text-text-dark'}`}>
                            {p}
                        </button>
                    ))}
                </div>

                {/* Expanded filters */}
                {showFilters && (
                    <div className="border-t border-[#f0e8d8] pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Entity Type</p>
                            <div className="flex flex-wrap gap-1.5">
                                {(['All', ...ENTITY_TYPES] as const).map(e => (
                                    <button key={e} type="button" onClick={() => { setSelectedEntity(e); setPage(0); }}
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
                                    <button key={s} type="button" onClick={() => { setSelectedSeverity(s); setPage(0); }}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-medium font-body transition-all cursor-pointer capitalize ${selectedSeverity === s ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-neutral-light text-neutral-gray hover:text-text-dark border border-transparent'}`}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
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

                {pageItems.length === 0 ? (
                    <div className="px-4 py-16 text-center">
                        <ClockCounterClockwiseIcon size={32} weight="thin" className="text-neutral-gray/40 mx-auto mb-3" />
                        <p className="text-neutral-gray text-sm font-body">No log entries match your filters.</p>
                    </div>
                ) : (
                    pageItems.map((entry, i) => {
                        const severityCfg = SEVERITY_STYLES[entry.severity];
                        return (
                            <div
                                key={entry.id}
                                className={`px-4 py-3.5 flex flex-col md:grid md:grid-cols-[140px_1fr_90px_80px_90px_90px] gap-2 md:gap-4 md:items-start ${i < pageItems.length - 1 ? 'border-b border-[#f0e8d8]' : ''} hover:bg-neutral-light/50 transition-colors`}
                            >
                                {/* Timestamp */}
                                <div className="flex items-center gap-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${severityCfg.dot}`} />
                                    <span className="text-neutral-gray text-[10px] font-body whitespace-nowrap">{entry.timestamp}</span>
                                </div>

                                {/* Details */}
                                <div>
                                    <p className="text-text-dark text-xs font-semibold font-body">{ACTION_LABELS[entry.action]}</p>
                                    <p className="text-neutral-gray text-[11px] font-body mt-0.5 leading-relaxed">{entry.details}</p>
                                </div>

                                {/* Actor */}
                                <div>
                                    <p className="text-text-dark text-xs font-semibold font-body">{entry.actor}</p>
                                    <p className="text-neutral-gray text-[10px] font-body">{entry.actorRole}</p>
                                </div>

                                {/* Entity */}
                                <span className="text-neutral-gray text-xs font-body capitalize">{entry.entity}</span>

                                {/* Severity */}
                                <SeverityBadge severity={entry.severity} />

                                {/* IP */}
                                <span className="text-neutral-gray text-[10px] font-body font-mono">{entry.ip}</span>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <button type="button" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                        className="flex items-center gap-2 text-sm font-body font-medium text-neutral-gray disabled:opacity-40 hover:text-text-dark transition-colors cursor-pointer disabled:cursor-not-allowed">
                        <CaretLeftIcon size={14} weight="bold" /> Previous
                    </button>
                    <span className="text-neutral-gray text-xs font-body">Page {page + 1} of {totalPages} · {filtered.length} entries</span>
                    <button type="button" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
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
