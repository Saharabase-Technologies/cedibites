'use client';

import Link from 'next/link';
import {
    BuildingsIcon, CaretRightIcon, PackageIcon, ShieldCheckIcon,
    UsersThreeIcon, WarningCircleIcon, ArchiveIcon, QuestionIcon,
    type Icon,
} from '@phosphor-icons/react';
import { roleDisplayName } from '@/types/staff';
import { groupHref, roleBreakdown, type StaffGroup, type StaffGroupKind } from './groups';
import { ROLE_COLORS } from './shared';

const ICONS: Record<StaffGroupKind, Icon> = {
    'head-office': ShieldCheckIcon,
    'warehouse':   PackageIcon,
    'general':     UsersThreeIcon,
    'branch':      BuildingsIcon,
    'unassigned':  QuestionIcon,
    'former':      ArchiveIcon,
};

/** Exception cards are muted so they do not compete with the real ones. */
const MUTED: StaffGroupKind[] = ['former', 'unassigned'];

export function GroupCard({ group }: { group: StaffGroup }) {
    const Icon = ICONS[group.kind];
    const muted = MUTED.includes(group.kind);
    const breakdown = roleBreakdown(group.members);
    const isEmpty = group.members.length === 0;

    return (
        <Link
            href={groupHref(group.id)}
            className={`group flex flex-col gap-3 p-5 rounded-2xl border transition-all cursor-pointer ${
                muted
                    ? 'bg-neutral-light/40 border-[#f0e8d8] hover:border-neutral-gray/30'
                    : 'bg-neutral-card border-[#f0e8d8] hover:border-primary/40 hover:shadow-sm'
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        muted ? 'bg-neutral-gray/10' : 'bg-primary/10'
                    }`}>
                        <Icon size={19} weight="fill" className={muted ? 'text-neutral-gray' : 'text-primary'} />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-text-dark text-base font-bold font-body truncate group-hover:text-primary transition-colors">
                            {group.name}
                        </h2>
                        <p className="text-neutral-gray text-xs font-body">
                            {group.members.length} {group.members.length === 1 ? 'person' : 'people'}
                        </p>
                    </div>
                </div>
                <CaretRightIcon size={16} className="text-neutral-gray/30 group-hover:text-primary transition-colors shrink-0 mt-1" />
            </div>

            <p className="text-neutral-gray text-xs font-body leading-relaxed">{group.blurb}</p>

            {isEmpty ? (
                <p className="text-neutral-gray/60 text-xs font-body italic">
                    {group.kind === 'branch' ? 'Nobody assigned to this branch yet.' : 'Nobody here yet.'}
                </p>
            ) : (
                <div className="flex flex-wrap gap-1.5">
                    {breakdown.map(({ role, count }) => (
                        <span
                            key={role}
                            className="inline-flex items-center gap-1 text-[10px] font-body bg-neutral-light px-2 py-1 rounded-lg"
                        >
                            <span className={`font-bold ${ROLE_COLORS[role]}`}>{count}</span>
                            <span className="text-neutral-gray">{roleDisplayName(role)}</span>
                        </span>
                    ))}
                </div>
            )}

            {group.needsAttention > 0 && (
                <div className="flex items-center gap-1.5 pt-1">
                    <WarningCircleIcon size={13} weight="fill" className="text-warning shrink-0" />
                    <span className="text-warning text-[11px] font-medium font-body">
                        {group.needsAttention} suspended or on leave
                    </span>
                </div>
            )}
        </Link>
    );
}
