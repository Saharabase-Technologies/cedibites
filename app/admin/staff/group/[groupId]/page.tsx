'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, PlusIcon, WarningCircleIcon } from '@phosphor-icons/react';
import type { StaffMember } from '@/types/staff';
import { useStaffDirectory } from '../../_components/useStaffDirectory';
import { StaffRoster } from '../../_components/StaffRoster';
import { findGroup } from '../../_components/groups';

/**
 * One group's roster.
 *
 * Nested under /group/ rather than sitting directly at /admin/staff/[id],
 * because Shifts, Staff Sales and Onboarding are already siblings there — a
 * bare dynamic segment would shadow nothing today but would quietly swallow any
 * future sibling route that shared a name with a group.
 */
export default function StaffGroupPage({ params }: { params: Promise<{ groupId: string }> }) {
    const { groupId } = use(params);
    const directory = useStaffDirectory();
    const { groups, isLoading } = directory;

    const [editing, setEditing] = useState<StaffMember | 'new' | null>(null);

    const group = findGroup(groups, groupId);
    const isBranch = group?.kind === 'branch';
    const branchId = isBranch ? groupId.replace(/^branch-/, '') : undefined;

    if (!group && !isLoading) {
        return (
            <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">
                <BackLink />
                <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl py-16 text-center">
                    <WarningCircleIcon size={28} weight="thin" className="text-neutral-gray/40 mx-auto mb-3" />
                    <p className="text-text-dark text-sm font-body font-medium">That group does not exist.</p>
                    <p className="text-neutral-gray text-xs font-body mt-1">
                        It may have been a branch that has since been removed.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">
            <BackLink />

            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
                <div className="min-w-0">
                    <h1 className="text-text-dark text-2xl font-bold font-body">
                        {group?.name ?? 'Loading…'}
                    </h1>
                    <p className="text-neutral-gray text-sm font-body mt-0.5">
                        {group ? group.blurb : ''}
                    </p>
                </div>

                {/* Former staff is a record, not a roster you hire into. */}
                {group && group.kind !== 'former' && (
                    <button
                        type="button"
                        onClick={() => setEditing('new')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium font-body hover:bg-primary-hover transition-colors cursor-pointer shrink-0"
                    >
                        <PlusIcon size={16} weight="bold" />
                        {isBranch ? `Add to ${group.name}` : 'Add Staff Member'}
                    </button>
                )}
            </div>

            <StaffRoster
                members={group?.members ?? []}
                directory={directory}
                editing={editing}
                onEditingChange={setEditing}
                // Inside a branch every row would repeat the same branch name.
                showBranchColumn={!isBranch}
                defaultBranchId={branchId}
                emptyMessage={
                    isBranch
                        ? 'Nobody is assigned to this branch yet.'
                        : 'Nobody is in this group yet.'
                }
            >
                {group?.kind === 'unassigned' && (
                    <div className="flex gap-2.5 mb-4 p-3 bg-warning/5 border border-warning/20 rounded-xl">
                        <WarningCircleIcon size={17} weight="fill" className="text-warning shrink-0 mt-0.5" />
                        <div>
                            <p className="text-text-dark text-xs font-medium font-body">
                                These accounts hold a branch role with no branch attached.
                            </p>
                            <p className="text-neutral-gray text-xs font-body mt-0.5">
                                They can still sign in, but branch-scoped screens will be empty for them.
                                Open each one and set a branch.
                            </p>
                        </div>
                    </div>
                )}
            </StaffRoster>
        </div>
    );
}

function BackLink() {
    return (
        <Link
            href="/admin/staff"
            className="inline-flex items-center gap-1.5 text-neutral-gray hover:text-primary text-xs font-medium font-body mb-3 transition-colors"
        >
            <ArrowLeftIcon size={13} weight="bold" />
            All staff
        </Link>
    );
}
