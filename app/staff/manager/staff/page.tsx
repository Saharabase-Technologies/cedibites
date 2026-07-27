'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
    UserCircleIcon,
    MagnifyingGlassIcon,
    XIcon,
    ClockIcon,
    PhoneIcon,
    EnvelopeSimpleIcon,
    BuildingsIcon,
    CalendarIcon,
    NoteIcon,
    PaperPlaneTiltIcon,
    IdentificationCardIcon,
    ShieldCheckIcon,
    GlobeIcon,
    FirstAidKitIcon,
    CaretLeftIcon,
    CaretRightIcon,
} from '@phosphor-icons/react';
import {
    type StaffMember,
    type StaffRole,
    roleDisplayName,
} from '@/types/staff';
import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { employeeService, type EmployeeNoteResponse } from '@/lib/api/services/employee.service';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/lib/utils/toast';

// --- Hidden roles (not visible to branch managers) -------------------------

const HIDDEN_ROLES: StaffRole[] = ['tech_admin', 'admin', 'branch_partner'];

// --- Display helpers -------------------------------------------------------

function initials(name?: string | null) {
    const safeName = (name ?? '').trim();
    if (!safeName) return 'NA';
    return safeName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function RoleBadge({ role }: { role: StaffRole }) {
    return (
        <span className="text-[10px] font-bold font-body text-neutral-gray px-2.5 py-1 rounded-full bg-neutral-light">
            {roleDisplayName(role)}
        </span>
    );
}

function AvatarCircle({ name }: { name: string }) {
    return (
        <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <span className="text-primary text-xs font-bold font-body">{initials(name)}</span>
        </div>
    );
}

// --- Detail Drawer ---------------------------------------------------------

type DetailTab = 'overview' | 'notes';

function StaffDetailDrawer({ staff, onClose }: { staff: StaffMember; onClose: () => void }) {
    const [activeTab, setActiveTab] = useState<DetailTab>('overview');
    const [notes, setNotes] = useState<EmployeeNoteResponse[]>([]);
    const [newNote, setNewNote] = useState('');
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [isLoadingNotes, setIsLoadingNotes] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
    const [editDraft, setEditDraft] = useState('');

    useEffect(() => {
        setIsLoadingNotes(true);
        employeeService.getNotes(staff.id)
            .then(setNotes)
            .catch(() => toast.error('Failed to load notes'))
            .finally(() => setIsLoadingNotes(false));
    }, [staff.id]);

    async function addNote() {
        if (!newNote.trim()) return;
        setIsSavingNote(true);
        try {
            const note = await employeeService.addNote(staff.id, newNote.trim());
            setNotes(prev => [note, ...prev]);
            setNewNote('');
            toast.success('Note added');
        } catch {
            toast.error('Failed to save note');
        } finally {
            setIsSavingNote(false);
        }
    }

    // Only the author edits or deletes their own note — a note is one person's
    // record of what they observed, and letting a second manager rewrite it
    // would make the record worthless as a record. The API enforces this; the
    // UI simply does not offer it (see `note.is_own`).
    async function saveEdit(noteId: number) {
        const trimmed = editDraft.trim();
        if (!trimmed) return;

        setIsSavingNote(true);
        try {
            const updated = await employeeService.updateNote(staff.id, noteId, trimmed);
            setNotes(prev => prev.map(n => n.id === noteId ? { ...n, content: updated.content ?? trimmed } : n));
            setEditingNoteId(null);
            setEditDraft('');
            toast.success('Note updated');
        } catch {
            toast.error('Failed to update note');
        } finally {
            setIsSavingNote(false);
        }
    }

    async function removeNote(noteId: number) {
        try {
            await employeeService.deleteNote(staff.id, noteId);
            setNotes(prev => prev.filter(n => n.id !== noteId));
            toast.success('Note deleted');
        } catch {
            toast.error('Failed to delete note');
        }
    }

    const statusConfig = {
        active:     { label: 'Active',     color: 'bg-secondary/10 text-secondary', dot: 'bg-secondary' },
        on_leave:   { label: 'On Leave',   color: 'bg-warning/10 text-warning',      dot: 'bg-warning' },
        suspended:  { label: 'Suspended',  color: 'bg-error/10 text-error',          dot: 'bg-error' },
        terminated: { label: 'Terminated', color: 'bg-neutral-200 text-neutral-gray', dot: 'bg-neutral-gray' },
    };

    const current = statusConfig[staff.status] ?? statusConfig.active;

    return (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
            <div className="relative w-full max-w-md bg-neutral-card shadow-2xl flex flex-col animate-in slide-in-from-right duration-200" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="px-6 py-5 border-b border-[#f0e8d8]">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                                <span className="text-primary text-base font-bold font-body">{initials(staff.name)}</span>
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-text-dark text-lg font-bold font-body truncate">{staff.name}</h2>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-neutral-gray text-xs font-medium font-body">{roleDisplayName(staff.role)}</span>
                                    <span className="text-neutral-gray/30">{'\u00b7'}</span>
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium font-body px-2 py-0.5 rounded-full ${current.color}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
                                        {current.label}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-light cursor-pointer shrink-0">
                            <XIcon size={16} className="text-neutral-gray" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-0 px-6 border-b border-[#f0e8d8]">
                    {([{ id: 'overview', label: 'Overview' }, { id: 'notes', label: 'Notes' }] as { id: DetailTab; label: string }[]).map(t => (
                        <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
                            className={`px-4 py-3 text-xs font-medium font-body border-b-2 transition-colors cursor-pointer ${activeTab === t.id ? 'border-primary text-primary' : 'border-transparent text-neutral-gray hover:text-text-dark'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">

                    {activeTab === 'overview' && (
                        <div className="p-6 flex flex-col gap-5">

                            {/* Contact info */}
                            <div>
                                <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-3">Contact</p>
                                <div className="flex flex-col gap-2.5">
                                    <div className="flex items-center gap-2.5">
                                        <PhoneIcon size={14} weight="bold" className="text-neutral-gray/60 shrink-0" />
                                        <span className="text-text-dark text-sm font-body">{staff.phone || '\u2014'}</span>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <EnvelopeSimpleIcon size={14} weight="bold" className="text-neutral-gray/60 shrink-0" />
                                        <span className="text-text-dark text-sm font-body">{staff.email || '\u2014'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-[#f0e8d8]" />

                            {/* Work info */}
                            <div>
                                <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-3">Work</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-neutral-light rounded-xl">
                                        <p className="text-[10px] font-body text-neutral-gray mb-1">Branch</p>
                                        <div className="flex items-center gap-1.5">
                                            <BuildingsIcon size={13} weight="fill" className="text-neutral-gray/60 shrink-0" />
                                            <p className="text-text-dark text-xs font-medium font-body truncate">{staff.branch ?? '\u2014'}</p>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-neutral-light rounded-xl">
                                        <p className="text-[10px] font-body text-neutral-gray mb-1">Joined</p>
                                        <div className="flex items-center gap-1.5">
                                            <CalendarIcon size={13} weight="fill" className="text-neutral-gray/60 shrink-0" />
                                            <p className="text-text-dark text-xs font-medium font-body">{staff.joinedAt || '\u2014'}</p>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-neutral-light rounded-xl">
                                        <p className="text-[10px] font-body text-neutral-gray mb-1">Last Login</p>
                                        <div className="flex items-center gap-1.5">
                                            <ClockIcon size={13} weight="fill" className="text-neutral-gray/60 shrink-0" />
                                            <p className="text-text-dark text-xs font-medium font-body">{staff.lastLogin || 'Never'}</p>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-neutral-light rounded-xl">
                                        <p className="text-[10px] font-body text-neutral-gray mb-1">Orders Today</p>
                                        <p className="text-text-dark text-xs font-medium font-body">{staff.ordersToday}</p>
                                    </div>
                                </div>
                            </div>

                            {/* HR info */}
                            {(staff.ssnit || staff.ghanaCard || staff.tinNumber || staff.dateOfBirth || staff.nationality || staff.emergencyContact) && (
                                <>
                                    <div className="h-px bg-[#f0e8d8]" />
                                    <div>
                                        <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-3">HR Information</p>
                                        <div className="flex flex-col gap-2">
                                            {staff.nationality && (
                                                <div className="flex items-center gap-2.5">
                                                    <GlobeIcon size={14} weight="bold" className="text-neutral-gray/60 shrink-0" />
                                                    <span className="text-text-dark text-sm font-body">{staff.nationality}</span>
                                                </div>
                                            )}
                                            {staff.dateOfBirth && (
                                                <div className="flex items-center gap-2.5">
                                                    <CalendarIcon size={14} weight="bold" className="text-neutral-gray/60 shrink-0" />
                                                    <span className="text-text-dark text-sm font-body">{staff.dateOfBirth}</span>
                                                </div>
                                            )}
                                            {staff.ssnit && (
                                                <div className="flex items-center gap-2.5">
                                                    <ShieldCheckIcon size={14} weight="bold" className="text-neutral-gray/60 shrink-0" />
                                                    <span className="text-neutral-gray text-xs font-body">SSNIT</span>
                                                    <span className="text-text-dark text-sm font-body">{staff.ssnit}</span>
                                                </div>
                                            )}
                                            {staff.ghanaCard && (
                                                <div className="flex items-center gap-2.5">
                                                    <IdentificationCardIcon size={14} weight="bold" className="text-neutral-gray/60 shrink-0" />
                                                    <span className="text-neutral-gray text-xs font-body">Ghana Card</span>
                                                    <span className="text-text-dark text-sm font-body">{staff.ghanaCard}</span>
                                                </div>
                                            )}
                                            {staff.tinNumber && (
                                                <div className="flex items-center gap-2.5">
                                                    <IdentificationCardIcon size={14} weight="bold" className="text-neutral-gray/60 shrink-0" />
                                                    <span className="text-neutral-gray text-xs font-body">TIN</span>
                                                    <span className="text-text-dark text-sm font-body">{staff.tinNumber}</span>
                                                </div>
                                            )}
                                        </div>
                                        {staff.emergencyContact && (
                                            <div className="mt-3 p-3 bg-neutral-light rounded-xl">
                                                <div className="flex items-center gap-1.5 mb-2">
                                                    <FirstAidKitIcon size={13} weight="fill" className="text-error/60" />
                                                    <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider">Emergency Contact</p>
                                                </div>
                                                <p className="text-text-dark text-sm font-medium font-body">{staff.emergencyContact.name}</p>
                                                <p className="text-neutral-gray text-xs font-body">{staff.emergencyContact.phone} {'\u00b7'} {staff.emergencyContact.relationship}</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            <div className="h-px bg-[#f0e8d8]" />

                            {/* Permissions summary */}
                            <div>
                                <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-3">Permissions</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {Object.entries(staff.permissions)
                                        .filter(([, v]) => v)
                                        .map(([key]) => (
                                            <span key={key} className="text-[10px] font-body text-neutral-gray bg-neutral-light px-2 py-1 rounded-lg">
                                                {key.replace(/^can/, '').replace(/([A-Z])/g, ' $1').trim()}
                                            </span>
                                        ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notes' && (
                        <div className="p-6 flex flex-col gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <NoteIcon size={16} weight="bold" className="text-neutral-gray" />
                                    <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider">Staff Notes</p>
                                </div>
                                <p className="text-neutral-gray text-xs font-body mb-4">Private notes about this staff member. Visible to admins and managers with employee access.</p>

                                {/* Add note */}
                                <div className="mb-5">
                                    <textarea
                                        value={newNote}
                                        onChange={e => setNewNote(e.target.value)}
                                        placeholder="Add a note\u2026"
                                        rows={3}
                                        className="w-full px-3.5 py-3 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body placeholder:text-neutral-gray/50 focus:outline-none focus:border-primary/40 resize-none"
                                    />
                                    <div className="flex justify-end mt-2">
                                        <button
                                            type="button"
                                            onClick={() => void addNote()}
                                            disabled={!newNote.trim() || isSavingNote}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium font-body rounded-xl cursor-pointer hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            <PaperPlaneTiltIcon size={12} weight="bold" />
                                            {isSavingNote ? 'Saving\u2026' : 'Add Note'}
                                        </button>
                                    </div>
                                </div>

                                {/* Notes list */}
                                {isLoadingNotes ? (
                                    <p className="text-neutral-gray text-sm font-body text-center py-4">Loading notes\u2026</p>
                                ) : notes.length === 0 ? (
                                    <div className="text-center py-6">
                                        <NoteIcon size={24} weight="thin" className="text-neutral-gray/30 mx-auto mb-2" />
                                        <p className="text-neutral-gray text-sm font-body">No notes yet.</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {notes.map(note => (
                                            <div key={note.id} className="p-3 bg-neutral-light rounded-xl border border-[#f0e8d8]">
                                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-text-dark text-xs font-semibold font-body">{note.author}</span>
                                                        <span className="text-neutral-gray/40">{'\u00b7'}</span>
                                                        <span className="text-neutral-gray text-[10px] font-body">
                                                            {new Date(note.created_at).toLocaleDateString('en-GH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                    {note.is_own && editingNoteId !== note.id && (
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <button type="button"
                                                                onClick={() => { setEditingNoteId(note.id); setEditDraft(note.content); }}
                                                                className="text-neutral-gray/40 hover:text-primary transition-colors cursor-pointer text-[10px] font-body">
                                                                Edit
                                                            </button>
                                                            <button type="button" onClick={() => void removeNote(note.id)}
                                                                className="text-neutral-gray/40 hover:text-error transition-colors cursor-pointer">
                                                                <XIcon size={12} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {editingNoteId === note.id ? (
                                                    <div className="flex flex-col gap-2">
                                                        <textarea value={editDraft} onChange={e => setEditDraft(e.target.value)} rows={3}
                                                            className="w-full px-3 py-2 bg-white border border-[#f0e8d8] rounded-lg text-text-dark text-sm font-body focus:outline-none focus:border-primary/40 resize-none" />
                                                        <div className="flex items-center gap-2">
                                                            <button type="button" onClick={() => void saveEdit(note.id)}
                                                                disabled={isSavingNote || !editDraft.trim()}
                                                                className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium font-body hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                                                                {isSavingNote ? 'Saving…' : 'Save'}
                                                            </button>
                                                            <button type="button"
                                                                onClick={() => { setEditingNoteId(null); setEditDraft(''); }}
                                                                className="px-3 py-1.5 text-neutral-gray text-xs font-body hover:text-text-dark transition-colors cursor-pointer">
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-text-dark text-sm font-body whitespace-pre-wrap">{note.content}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- Filter tabs -----------------------------------------------------------

type FilterTab = 'All' | 'Manager' | 'Sales Staff' | 'Call Center' | 'Kitchen' | 'Rider' | 'Suspended' | 'Terminated';

function matchesTab(s: StaffMember, tab: FilterTab): boolean {
    if (tab === 'Suspended')  return s.status === 'suspended';
    if (tab === 'Terminated') return s.status === 'terminated';
    if (tab === 'All')        return s.status !== 'terminated';
    if (tab === 'Manager')     return s.role === 'manager'     && s.status !== 'terminated';
    if (tab === 'Sales Staff') return s.role === 'sales_staff' && s.status !== 'terminated';
    if (tab === 'Call Center') return s.role === 'call_center' && s.status !== 'terminated';
    if (tab === 'Kitchen')     return s.role === 'kitchen'     && s.status !== 'terminated';
    if (tab === 'Rider')       return s.role === 'rider'       && s.status !== 'terminated';
    return false;
}

function tabCount(staff: StaffMember[], tab: FilterTab): number {
    return staff.filter(s => matchesTab(s, tab)).length;
}

// --- Page ------------------------------------------------------------------

export default function ManagerStaffPage() {
    const { staffUser } = useStaffAuth();
    const branchName = staffUser?.branches[0]?.name ?? '';
    const branchId = staffUser?.branches[0]?.id ?? '';

    const { data: apiStaff = [], isLoading } = useQuery({
        queryKey: ['branch-employees', branchId],
        queryFn: () => branchId ? employeeService.getBranchEmployees(branchId) : Promise.resolve([]),
        enabled: !!branchId,
        staleTime: 5 * 60 * 1000,
    });

    const [staff, setStaff] = useState<StaffMember[]>([]);
    const hasInitialized = useRef(false);

    useEffect(() => {
        if (!hasInitialized.current && apiStaff.length > 0) {
            hasInitialized.current = true;
            setStaff(apiStaff.filter(s => !HIDDEN_ROLES.includes(s.role)));
        }
    }, [apiStaff]);

    const [tab, setTab] = useState<FilterTab>('All');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

    const PER_PAGE = 10;
    const TABS: FilterTab[] = ['All', 'Manager', 'Sales Staff', 'Call Center', 'Kitchen', 'Rider', 'Suspended', 'Terminated'];

    const filtered = useMemo(() => {
        let list = staff.filter(s => matchesTab(s, tab));
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(
                s => s.name.toLowerCase().includes(q)
                    || (s.phone ?? '').includes(q)
                    || (s.email ?? '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [staff, tab, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    const paged = useMemo(() => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filtered, page]);

    useEffect(() => { setPage(1); }, [tab, search]);

    return (
        <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                    <h1 className="text-text-dark text-2xl font-bold font-body">Staff</h1>
                    <p className="text-neutral-gray text-sm font-body mt-0.5">{branchName} {'\u00b7'} {filtered.length} staff shown</p>
                </div>
            </div>

            {/* Tabs + search */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {TABS.map(t => (
                        <button key={t} type="button" onClick={() => setTab(t)}
                            className={`px-3 py-2 rounded-xl text-xs font-medium font-body whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${tab === t ? 'bg-primary text-white' : 'bg-neutral-card border border-[#f0e8d8] text-neutral-gray hover:text-text-dark'}`}>
                            {t}
                            <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${tab === t ? 'bg-neutral-card/20 text-white' : 'bg-neutral-light text-neutral-gray'}`}>{tabCount(staff, t)}</span>
                        </button>
                    ))}
                </div>
                <div className="relative flex-1 min-w-45">
                    <MagnifyingGlassIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-gray" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone, email\u2026"
                        className="w-full pl-9 pr-3 py-2.5 bg-neutral-card border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40" />
                </div>
            </div>

            {/* Staff table */}
            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
                {isLoading && staff.length === 0 ? (
                    <div className="px-4 py-16 text-center"><p className="text-neutral-gray text-sm font-body">Loading staff\u2026</p></div>
                ) : filtered.length === 0 ? (
                    <div className="px-4 py-16 text-center">
                        <UserCircleIcon size={32} weight="thin" className="text-neutral-gray/40 mx-auto mb-3" />
                        <p className="text-neutral-gray text-sm font-body">No staff found.</p>
                    </div>
                ) : (
                    <>
                        <div className="hidden sm:grid grid-cols-[minmax(0,1.5fr)_100px_minmax(0,1fr)_100px] gap-3 px-5 py-2.5 border-b border-[#f0e8d8] text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider">
                            <span>Name</span>
                            <span>Role</span>
                            <span>Contact</span>
                            <span>Last Login</span>
                        </div>
                        {paged.map((member, i) => (
                            <button key={member.id} type="button"
                                onClick={() => setSelectedStaff(member)}
                                className={`w-full text-left px-5 py-3.5 flex flex-col sm:grid sm:grid-cols-[minmax(0,1.5fr)_100px_minmax(0,1fr)_100px] gap-2 sm:gap-3 sm:items-center ${i < paged.length - 1 ? 'border-b border-[#f0e8d8]' : ''} hover:bg-neutral-light/40 transition-colors cursor-pointer`}>

                                {/* Name + avatar + status */}
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <AvatarCircle name={member.name} />
                                    <div className="min-w-0">
                                        <p className="text-text-dark text-sm font-semibold font-body truncate">{member.name}</p>
                                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                            {member.status === 'suspended' && (
                                                <span className="text-[10px] font-body bg-error/10 text-error px-2 py-0.5 rounded-full">Suspended</span>
                                            )}
                                            {member.status === 'on_leave' && (
                                                <span className="text-[10px] font-body bg-warning/10 text-warning px-2 py-0.5 rounded-full">On Leave</span>
                                            )}
                                            {member.status === 'terminated' && (
                                                <span className="text-[10px] font-body bg-neutral-light text-neutral-gray px-2 py-0.5 rounded-full">Terminated</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Role */}
                                <div><RoleBadge role={member.role} /></div>

                                {/* Contact */}
                                <div className="min-w-0">
                                    <p className="text-text-dark text-xs font-body truncate">{member.phone}</p>
                                    <p className="text-neutral-gray text-[10px] font-body truncate">{member.email}</p>
                                </div>

                                {/* Last Login */}
                                <div className="flex items-center gap-1">
                                    <ClockIcon size={11} weight="fill" className="text-neutral-gray shrink-0" />
                                    <p className="text-neutral-gray text-[10px] font-body">{member.lastLogin}</p>
                                </div>
                            </button>
                        ))}
                    </>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <p className="text-neutral-gray text-xs font-body">
                        Showing {(page - 1) * PER_PAGE + 1}{'\u2013'}{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
                    </p>
                    <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium font-body bg-neutral-card border border-[#f0e8d8] text-neutral-gray hover:text-text-dark transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                            <CaretLeftIcon size={12} weight="bold" /> Prev
                        </button>
                        <span className="text-neutral-gray text-xs font-body px-2">Page {page} of {totalPages}</span>
                        <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium font-body bg-neutral-card border border-[#f0e8d8] text-neutral-gray hover:text-text-dark transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                            Next <CaretRightIcon size={12} weight="bold" />
                        </button>
                    </div>
                </div>
            )}

            {/* Staff detail drawer */}
            {selectedStaff && (
                <StaffDetailDrawer staff={selectedStaff} onClose={() => setSelectedStaff(null)} />
            )}
        </div>
    );
}