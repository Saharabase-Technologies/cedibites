'use client';

import { useState, useMemo } from 'react';
import {
    UsersThreeIcon,
    MagnifyingGlassIcon,
    XIcon,
    ClockIcon,
    PhoneIcon,
} from '@phosphor-icons/react';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { MOCK_STAFF } from '@/lib/data/mockStaff';
import type { StaffRole } from '@/types/order';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABELS: Partial<Record<StaffRole | string, string>> = {
    manager:        'Manager',
    sales:          'Sales',
    kitchen:        'Kitchen',
    rider:          'Rider',
    call_center:    'Call Center',
    branch_partner: 'Partner',
};

const ROLE_COLORS: Partial<Record<string, string>> = {
    manager:     'bg-primary/10 text-primary',
    sales:       'bg-secondary/10 text-secondary',
    kitchen:     'bg-[#f97316]/10 text-[#f97316]',
    rider:       'bg-info/10 text-info',
    call_center: 'bg-neutral-light text-neutral-gray',
};

const ALL_ROLES = ['all', 'manager', 'sales', 'kitchen', 'rider', 'call_center'];
const ROLE_FILTER_LABELS: Record<string, string> = {
    all:         'All',
    manager:     'Manager',
    sales:       'Sales',
    kitchen:     'Kitchen',
    rider:       'Rider',
    call_center: 'Call Center',
};

function initials(name: string) {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PartnerStaffPage() {
    const { staffUser } = useStaffAuth();
    const branchName = staffUser?.branch ?? '';

    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    const branchStaff = useMemo(() =>
        MOCK_STAFF.filter(s => {
            const branches = Array.isArray(s.branch) ? s.branch : [s.branch];
            return branches.includes(branchName) && s.status !== 'archived';
        }),
    [branchName]);

    const filtered = useMemo(() => {
        let list = branchStaff;
        if (roleFilter !== 'all') list = list.filter(s => s.role === roleFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(s =>
                s.name.toLowerCase().includes(q) ||
                s.role.toLowerCase().includes(q) ||
                (s.phone ?? '').includes(q)
            );
        }
        return list;
    }, [branchStaff, roleFilter, search]);

    const activeCount = branchStaff.filter(s => s.systemAccess === 'enabled').length;

    // Roles actually present in this branch
    const presentRoles = useMemo(() => {
        const roles = new Set(branchStaff.map(s => s.role));
        return ALL_ROLES.filter(r => r === 'all' || roles.has(r));
    }, [branchStaff]);

    return (
        <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <UsersThreeIcon size={20} weight="fill" className="text-primary" />
                        <h1 className="text-text-dark text-2xl font-bold font-body">Staff</h1>
                    </div>
                    <p className="text-neutral-gray text-sm font-body">
                        {branchStaff.length} member{branchStaff.length !== 1 ? 's' : ''} · {activeCount} with system access
                    </p>
                </div>
            </div>

            {/* Search + role filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1">
                    <MagnifyingGlassIcon size={15} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-gray" />
                    <input
                        type="text"
                        placeholder="Search by name or phone..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-9 py-2.5 bg-neutral-card border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary"
                    />
                    {search && (
                        <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-gray hover:text-text-dark cursor-pointer">
                            <XIcon size={14} weight="bold" />
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap gap-1">
                    {presentRoles.map(r => (
                        <button
                            key={r}
                            type="button"
                            onClick={() => setRoleFilter(r)}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold font-body border transition-all cursor-pointer ${roleFilter === r ? 'bg-primary text-white border-primary' : 'bg-neutral-card text-neutral-gray border-[#f0e8d8] hover:text-text-dark'}`}
                        >
                            {ROLE_FILTER_LABELS[r]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Staff list */}
            {filtered.length === 0 ? (
                <div className="py-16 text-center bg-neutral-card border border-[#f0e8d8] rounded-2xl">
                    <UsersThreeIcon size={28} weight="thin" className="text-neutral-gray/30 mx-auto mb-2" />
                    <p className="text-neutral-gray text-sm font-body">No staff match your filters.</p>
                </div>
            ) : (
                <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
                    {filtered.map((member, i) => (
                        <div
                            key={member.id}
                            className={`px-5 py-4 flex items-center gap-4 ${i < filtered.length - 1 ? 'border-b border-[#f0e8d8]' : ''}`}
                        >
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-primary text-sm font-bold font-body">
                                    {initials(member.name)}
                                </span>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                    <p className="text-text-dark text-sm font-semibold font-body">{member.name}</p>
                                    <span className={`text-[10px] font-bold font-body px-2 py-0.5 rounded-full capitalize ${ROLE_COLORS[member.role] ?? 'bg-neutral-light text-neutral-gray'}`}>
                                        {ROLE_LABELS[member.role] ?? member.role}
                                    </span>
                                    <span className={`text-[10px] font-bold font-body px-2 py-0.5 rounded-full ${member.systemAccess === 'enabled' ? 'bg-secondary/10 text-secondary' : 'bg-neutral-light text-neutral-gray'}`}>
                                        {member.systemAccess === 'enabled' ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    {member.phone && (
                                        <span className="text-neutral-gray text-xs font-body flex items-center gap-1">
                                            <PhoneIcon size={10} weight="fill" />
                                            {member.phone}
                                        </span>
                                    )}
                                    <span className="text-neutral-gray text-xs font-body flex items-center gap-1">
                                        <ClockIcon size={10} weight="fill" />
                                        Last seen {member.lastLogin}
                                    </span>
                                </div>
                            </div>

                            {/* Status dot */}
                            <div className="shrink-0">
                                <span className={`w-2.5 h-2.5 rounded-full inline-block ${member.systemAccess === 'enabled' ? 'bg-secondary animate-pulse' : 'bg-neutral-gray/30'}`} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
