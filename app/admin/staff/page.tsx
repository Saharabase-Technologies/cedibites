'use client';

import { useMemo, useState } from 'react';
import { MagnifyingGlassIcon, PlusIcon } from '@phosphor-icons/react';
import type { StaffMember } from '@/types/staff';
import { useStaffDirectory } from './_components/useStaffDirectory';
import { GroupCard } from './_components/GroupCard';
import { StaffRoster } from './_components/StaffRoster';
import { StaffEditors } from './_components/StaffEditors';
import { matchesSearch } from './_components/shared';

/**
 * The staff directory, as the parts of the business rather than one long list.
 *
 * It used to be a flat roster behind ten role filter tabs — fine for "show me
 * every rider", useless for "who works at Lakeside", which is the question
 * actually being asked now that there is more than one branch. The cards are
 * the org: head office, the warehouse, the company-wide floor staff, then a
 * card per branch. Clicking one opens its roster.
 *
 * Search stays flat and crosses every group, because when you are looking for a
 * named person you do not know or care which card they are filed under.
 */
export default function AdminStaffPage() {
    const directory = useStaffDirectory();
    const { groups, staff, isLoading } = directory;

    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState<StaffMember | 'new' | null>(null);

    const searching = search.trim().length > 0;

    const headcount = useMemo(
        () => staff.filter(s => s.status !== 'terminated').length,
        [staff],
    );

    const matches = useMemo(
        () => (searching ? staff.filter(s => matchesSearch(s, search)) : []),
        [staff, search, searching],
    );

    return (
        <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div>
                    <h1 className="text-text-dark text-2xl font-bold font-body">Staff</h1>
                    <p className="text-neutral-gray text-sm font-body mt-0.5">
                        {isLoading && staff.length === 0
                            ? 'Loading…'
                            : `${headcount} ${headcount === 1 ? 'person' : 'people'} across ${groups.filter(g => g.kind === 'branch').length} branches`}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setEditing('new')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium font-body hover:bg-primary-hover transition-colors cursor-pointer shrink-0"
                >
                    <PlusIcon size={16} weight="bold" />
                    Add Staff Member
                </button>
            </div>

            <div className="relative mb-5">
                <MagnifyingGlassIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-gray" />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Find anyone by name, phone or email…"
                    className="w-full pl-10 pr-4 py-2.5 bg-neutral-card border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40"
                />
            </div>

            {searching ? (
                <>
                    <p className="text-neutral-gray text-xs font-body mb-3">
                        {matches.length} {matches.length === 1 ? 'match' : 'matches'} across every group
                        {' · '}
                        <button
                            type="button"
                            onClick={() => setSearch('')}
                            className="text-primary font-medium hover:underline cursor-pointer"
                        >
                            back to groups
                        </button>
                    </p>
                    <StaffRoster
                        members={matches}
                        directory={directory}
                        editing={editing}
                        onEditingChange={setEditing}
                        searchValue={search}
                        onSearchChange={setSearch}
                        showSearchInput={false}
                        emptyMessage="Nobody matches that search."
                    />
                </>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {groups.map(group => (
                            <GroupCard key={group.id} group={group} />
                        ))}
                    </div>

                    {isLoading && groups.length === 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-36 bg-neutral-light rounded-2xl animate-pulse" />
                            ))}
                        </div>
                    )}

                    {/* The Add button sits in this header, so the editor has to
                        be mounted here too — there is no roster on screen to
                        carry it while the cards are showing. */}
                    <StaffEditors
                        directory={directory}
                        editing={editing}
                        onEditingChange={setEditing}
                    />
                </>
            )}
        </div>
    );
}
