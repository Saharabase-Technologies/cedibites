'use client';

import type { StaffMember, StaffRole, StaffStatus } from '@/types/staff';
import { roleDisplayName } from '@/types/staff';

export const ROLE_COLORS: Record<StaffRole, string> = {
    tech_admin:        'text-primary',
    admin:             'text-primary',
    branch_partner:    'text-purple-600',
    manager:           'text-secondary',
    call_center:       'text-info',
    sales_staff:       'text-neutral-gray',
    kitchen:           'text-warning',
    rider:             'text-secondary',
    warehouse_manager: 'text-info',
    purchasing_clerk:  'text-purple-600',
};

export function initials(name?: string | null) {
    const safeName = (name ?? '').trim();
    if (!safeName) {
        return 'NA';
    }
    return safeName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

export function branchDisplay(branch: string | string[]) {
    const value = Array.isArray(branch) ? branch.join(', ') : branch;
    return value || '—';
}

export function RoleBadge({ role }: { role: StaffRole }) {
    return (
        <span className={`text-xs font-medium font-body ${ROLE_COLORS[role]}`}>
            {roleDisplayName(role)}
        </span>
    );
}

export function AvatarCircle({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
    const box = size === 'lg' ? 'w-12 h-12' : 'w-9 h-9';
    const text = size === 'lg' ? 'text-base' : 'text-xs';

    return (
        <div className={`${box} rounded-full bg-primary/15 flex items-center justify-center shrink-0`}>
            <span className={`text-primary ${text} font-bold font-body`}>{initials(name)}</span>
        </div>
    );
}

export const STATUS_CONFIG: Record<StaffStatus, { label: string; color: string; dot: string }> = {
    active:     { label: 'Active',     color: 'bg-secondary/10 text-secondary',   dot: 'bg-secondary' },
    on_leave:   { label: 'On Leave',   color: 'bg-warning/10 text-warning',       dot: 'bg-warning' },
    suspended:  { label: 'Suspended',  color: 'bg-error/10 text-error',           dot: 'bg-error' },
    terminated: { label: 'Terminated', color: 'bg-neutral-200 text-neutral-gray', dot: 'bg-neutral-gray' },
};

export function StatusDot({ status }: { status: StaffStatus }) {
    const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.active;
    const text: Record<StaffStatus, string> = {
        active: 'text-secondary',
        on_leave: 'text-warning',
        suspended: 'text-error',
        terminated: 'text-neutral-gray',
    };

    return (
        <span className="inline-flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
            <span className={`${text[status]} text-[10px] font-medium font-body`}>{config.label}</span>
        </span>
    );
}

export function matchesSearch(member: StaffMember, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;

    return member.name.toLowerCase().includes(q)
        || (member.phone ?? '').includes(q)
        || (member.email ?? '').toLowerCase().includes(q);
}
