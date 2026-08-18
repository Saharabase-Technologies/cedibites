'use client';

import { useMemo, useState } from 'react';
import {
    MagnifyingGlassIcon, UserCircleIcon, BuildingsIcon,
    CaretLeftIcon, CaretRightIcon,
} from '@phosphor-icons/react';
import type { StaffMember, StaffRole } from '@/types/staff';
import { AvatarCircle, RoleBadge, StatusDot, branchDisplay, matchesSearch } from './shared';
import { StaffDetailDrawer } from './StaffDetailDrawer';
import { StaffEditors } from './StaffEditors';
import type { useStaffDirectory } from './useStaffDirectory';

const PER_PAGE = 10;

type Directory = ReturnType<typeof useStaffDirectory>;

export interface StaffRosterProps {
    members: StaffMember[];
    directory: Directory;
    /**
     * The open editor, owned by the page — its header carries the "Add staff"
     * button, so the page has to be able to open the form the roster renders.
     */
    editing: StaffMember | 'new' | null;
    onEditingChange: (next: StaffMember | 'new' | null) => void;
    /** Pre-selected branch when adding from inside a branch group. */
    defaultBranchId?: string;
    defaultRole?: StaffRole;
    /** Hidden on branch cards, where every row says the same branch. */
    showBranchColumn?: boolean;
    emptyMessage?: string;
    /**
     * Search is controlled when `onSearchChange` is given — the overview keeps
     * its box above the cards and swaps to results as you type, so the roster
     * must read that box rather than owning a second one.
     */
    searchValue?: string;
    onSearchChange?: (next: string) => void;
    showSearchInput?: boolean;
    /** Rendered between the search box and the table. */
    children?: React.ReactNode;
}

/**
 * The list of people, with the detail drawer and every editor hanging off it.
 *
 * Takes the members to show rather than fetching them, so the same component
 * serves a branch, a department and the search-everyone view without knowing
 * which it is.
 */
export function StaffRoster({
    members,
    directory,
    editing,
    onEditingChange,
    defaultBranchId,
    defaultRole,
    showBranchColumn = true,
    emptyMessage = 'No staff here yet.',
    searchValue,
    onSearchChange,
    showSearchInput = true,
    children,
}: StaffRosterProps) {
    const { isLoading, actions } = directory;

    const [ownSearch, setOwnSearch] = useState('');
    const search = onSearchChange ? (searchValue ?? '') : ownSearch;

    const [page, setPage] = useState(1);
    const [deleteStaff, setDeleteStaff] = useState<StaffMember | null>(null);
    const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

    /** Typing changes what is on page 1, so any page you were on is meaningless. */
    function handleSearchChange(next: string) {
        (onSearchChange ?? setOwnSearch)(next);
        setPage(1);
    }

    const filtered = useMemo(
        () => members.filter(m => matchesSearch(m, search)),
        [members, search],
    );

    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));

    // Clamped rather than reset in an effect: the list can also shrink under
    // you when somebody is terminated off the last page, and an effect would
    // render the empty page once before correcting it.
    const safePage = Math.min(page, totalPages);

    const paged = useMemo(
        () => filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE),
        [filtered, safePage],
    );

    // The drawer holds its own copy of the member, so an action taken inside it
    // would otherwise show stale status until it was closed and reopened.
    const selected = selectedStaff
        ? directory.staff.find(s => s.id === selectedStaff.id) ?? selectedStaff
        : null;

    const columns = showBranchColumn
        ? 'md:grid-cols-[1fr_110px_minmax(0,1fr)_minmax(0,1fr)_80px]'
        : 'md:grid-cols-[1fr_110px_minmax(0,1fr)_80px]';

    return (
        <>
            {showSearchInput && (
                <div className="relative mb-4">
                    <MagnifyingGlassIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-gray" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => handleSearchChange(e.target.value)}
                        placeholder="Search by name, phone, email…"
                        className="w-full pl-10 pr-4 py-2.5 bg-neutral-card border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40"
                    />
                </div>
            )}

            {children}

            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
                {isLoading && members.length === 0 ? (
                    <div className="px-4 py-16 text-center">
                        <p className="text-neutral-gray text-sm font-body">Loading staff…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="px-4 py-16 text-center">
                        <UserCircleIcon size={32} weight="thin" className="text-neutral-gray/40 mx-auto mb-3" />
                        <p className="text-neutral-gray text-sm font-body">
                            {search.trim() ? 'Nobody here matches that search.' : emptyMessage}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className={`hidden md:grid ${columns} gap-4 px-4 py-3 border-b border-[#f0e8d8] bg-[#faf6f0]`}>
                            {['Name', 'Role', 'Contact', ...(showBranchColumn ? ['Branch'] : []), 'Status'].map(h => (
                                <span key={h} className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-wider">{h}</span>
                            ))}
                        </div>
                        {paged.map((member, i) => (
                            <div
                                key={member.id}
                                onClick={() => setSelectedStaff(member)}
                                className={`group px-4 py-3.5 flex flex-col md:grid ${columns} gap-2 md:gap-4 md:items-center cursor-pointer ${i < paged.length - 1 ? 'border-b border-[#f0e8d8]' : ''} hover:bg-neutral-light/50 transition-colors`}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <AvatarCircle name={member.name} />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-text-dark text-sm font-semibold font-body truncate group-hover:text-primary transition-colors">{member.name}</p>
                                        <p className="text-neutral-gray text-[10px] font-body truncate md:hidden">{member.phone}</p>
                                    </div>
                                    <CaretRightIcon size={14} className="text-neutral-gray/0 group-hover:text-neutral-gray/50 transition-colors shrink-0 md:hidden" />
                                </div>

                                <RoleBadge role={member.role} />

                                <div className="min-w-0 hidden md:block">
                                    <p className="text-text-dark text-xs font-body truncate">{member.phone}</p>
                                    {member.email && <p className="text-neutral-gray text-[10px] font-body truncate">{member.email}</p>}
                                </div>

                                {showBranchColumn && (
                                    <div className="min-w-0 hidden md:flex items-center gap-1.5">
                                        <BuildingsIcon size={12} weight="fill" className="text-neutral-gray/50 shrink-0" />
                                        <p className="text-neutral-gray text-xs font-body truncate">{branchDisplay(member.branch)}</p>
                                    </div>
                                )}

                                <div className="hidden md:block">
                                    <StatusDot status={member.status} />
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <p className="text-neutral-gray text-xs font-body">
                        Showing {(safePage - 1) * PER_PAGE + 1}-{Math.min(safePage * PER_PAGE, filtered.length)} of {filtered.length}
                    </p>
                    <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage <= 1}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium font-body bg-neutral-card border border-[#f0e8d8] text-neutral-gray hover:text-text-dark transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                            <CaretLeftIcon size={12} weight="bold" /> Prev
                        </button>
                        <span className="text-neutral-gray text-xs font-body px-2">Page {safePage} of {totalPages}</span>
                        <button type="button" onClick={() => setPage(Math.min(totalPages, safePage + 1))} disabled={safePage >= totalPages}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium font-body bg-neutral-card border border-[#f0e8d8] text-neutral-gray hover:text-text-dark transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                            Next <CaretRightIcon size={12} weight="bold" />
                        </button>
                    </div>
                </div>
            )}

            {selected && (
                <StaffDetailDrawer
                    staff={selected}
                    onClose={() => setSelectedStaff(null)}
                    onEdit={s => onEditingChange(s)}
                    onSuspend={actions.suspend}
                    onReinstate={actions.reinstate}
                    onTerminate={actions.terminate}
                    onForceLogout={actions.forceLogout}
                    onResetPassword={actions.requirePasswordReset}
                    onDelete={s => setDeleteStaff(s)}
                />
            )}

            <StaffEditors
                directory={directory}
                editing={editing}
                onEditingChange={onEditingChange}
                deleting={deleteStaff}
                onDeletingChange={setDeleteStaff}
                defaultBranchId={defaultBranchId}
                defaultRole={defaultRole}
            />
        </>
    );
}
