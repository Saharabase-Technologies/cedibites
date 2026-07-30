'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import * as React from 'react';
import {
    PlusIcon,
    PencilSimpleIcon,
    TrashIcon,
    LockSimpleIcon,
    SignOutIcon,
    ArrowCounterClockwiseIcon,
    ArchiveIcon,
    UserCircleIcon,
    MagnifyingGlassIcon,
    XIcon,
    WarningCircleIcon,
    BuildingsIcon,
    ClockIcon,
    IdentificationCardIcon,
    EnvelopeSimpleIcon,
    PhoneIcon,
    CalendarIcon,
    NoteIcon,
    CaretLeftIcon,
    CaretRightIcon,
    ShieldCheckIcon,
    GlobeIcon,
    FirstAidKitIcon,
    PaperPlaneTiltIcon,
} from '@phosphor-icons/react';
import {
    type StaffMember,
    type StaffRole,
    type StaffStatus,
    type EmploymentStatus,
    type SystemAccess,
    ROLE_RULES,
    ASSIGNABLE_ROLES,
    roleDisplayName,
    roleNeedsBranch,
    roleAllowsManyBranches,
    branchRuleLabel,
    validateBranchSelection,
    permissionDisplayName,
    employmentStatusLabel,
} from '@/types/staff';
import { useEmployees } from '@/lib/api/hooks/useEmployees';
import { useBranchesApi } from '@/lib/api/hooks/useBranchesApi';
import { employeeService, staffRoleToBackendRole, type EmployeeNoteResponse } from '@/lib/api/services/employee.service';
import { toast } from '@/lib/utils/toast';
import { isValidGhanaPhone, normalizeGhanaPhone } from '@/app/lib/phone';

// ─── Display helpers ──────────────────────────────────────────────────────────

const ROLE_COLORS: Record<StaffRole, string> = {
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

function initials(name?: string | null) {
    const safeName = (name ?? '').trim();
    if (!safeName) {
        return 'NA';
    }
    return safeName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function branchDisplay(branch: string | string[]) {
    return Array.isArray(branch) ? branch.join(', ') : branch;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: StaffRole }) {
    return (
        <span className={`text-xs font-medium font-body ${ROLE_COLORS[role]}`}>
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

// ─── Confirm delete modal ─────────────────────────────────────────────────────

function ConfirmDeleteModal({ staff, onConfirm, onCancel }: { staff: StaffMember; onConfirm: () => void; onCancel: () => void }) {
    const [input, setInput] = useState('');
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <div className="bg-neutral-card rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
                <div className="h-1.5 bg-error" />
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <WarningCircleIcon size={18} weight="fill" className="text-error" />
                        <h3 className="text-text-dark text-base font-bold font-body">Delete account permanently?</h3>
                    </div>
                    <p className="text-neutral-gray text-sm font-body mb-4">
                        This will permanently delete <strong className="text-text-dark">{staff.name}</strong>&apos;s account.
                        Orders they processed will retain a &quot;[Deleted Staff]&quot; label.
                    </p>
                    <p className="text-xs font-body text-neutral-gray mb-2">Type <strong>CONFIRM</strong> to proceed:</p>
                    <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="CONFIRM"
                        className="w-full px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-error/50 mb-4" />
                    <div className="flex gap-3">
                        <button type="button" onClick={onCancel} className="flex-1 px-4 py-2.5 bg-neutral-light text-text-dark rounded-xl text-sm font-medium font-body cursor-pointer">Cancel</button>
                        <button type="button" onClick={onConfirm} disabled={input !== 'CONFIRM'}
                            className="flex-1 px-4 py-2.5 bg-error text-white rounded-xl text-sm font-medium font-body disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">
                            Delete permanently
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Staff detail drawer ──────────────────────────────────────────────────────

type DetailTab = 'overview' | 'notes';

interface StaffDetailDrawerProps {
    staff: StaffMember;
    onClose: () => void;
    onEdit: (s: StaffMember) => void;
    onSuspend: (s: StaffMember) => void;
    onReinstate: (s: StaffMember) => void;
    onTerminate: (s: StaffMember) => void;
    onForceLogout: (s: StaffMember) => void;
    onResetPassword: (s: StaffMember) => void;
    onDelete: (s: StaffMember) => void;
}

function StaffDetailDrawer({ staff, onClose, onEdit, onSuspend, onReinstate, onTerminate, onForceLogout, onResetPassword, onDelete }: StaffDetailDrawerProps) {
    const [activeTab, setActiveTab] = useState<DetailTab>('overview');
    const [notes, setNotes] = useState<EmployeeNoteResponse[]>([]);
    const [newNote, setNewNote] = useState('');
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [isLoadingNotes, setIsLoadingNotes] = useState(false);

    // Load notes from API on mount
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
        active: { label: 'Active', color: 'bg-secondary/10 text-secondary', dot: 'bg-secondary' },
        on_leave: { label: 'On Leave', color: 'bg-warning/10 text-warning', dot: 'bg-warning' },
        suspended: { label: 'Suspended', color: 'bg-error/10 text-error', dot: 'bg-error' },
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
                                    <span className={`text-xs font-medium font-body ${ROLE_COLORS[staff.role]}`}>{roleDisplayName(staff.role)}</span>
                                    <span className="text-neutral-gray/30">·</span>
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
                                        <span className="text-text-dark text-sm font-body">{staff.phone || '—'}</span>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <EnvelopeSimpleIcon size={14} weight="bold" className="text-neutral-gray/60 shrink-0" />
                                        <span className="text-text-dark text-sm font-body">{staff.email || '—'}</span>
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
                                            <p className="text-text-dark text-xs font-medium font-body truncate">{branchDisplay(staff.branch)}</p>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-neutral-light rounded-xl">
                                        <p className="text-[10px] font-body text-neutral-gray mb-1">Joined</p>
                                        <div className="flex items-center gap-1.5">
                                            <CalendarIcon size={13} weight="fill" className="text-neutral-gray/60 shrink-0" />
                                            <p className="text-text-dark text-xs font-medium font-body">{staff.joinedAt || '—'}</p>
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

                            {/* HR info - only if any exists */}
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
                                                <p className="text-neutral-gray text-xs font-body">{staff.emergencyContact.phone} · {staff.emergencyContact.relationship}</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            <div className="h-px bg-[#f0e8d8]" />

                            {/* What this person can do — read-only. Set by the role,
                                never edited here. */}
                            <div>
                                <p className="text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1">Permissions</p>
                                <p className="text-neutral-gray text-[10px] font-body mb-3">
                                    Set by the <strong className="text-text-dark">{roleDisplayName(staff.role)}</strong> role. To change these, change the role.
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {staff.permissions.map(name => (
                                        <span key={name} className="text-[10px] font-body text-neutral-gray bg-neutral-light px-2 py-1 rounded-lg">
                                            {permissionDisplayName(name)}
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
                                        placeholder="Add a note…"
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
                                            {isSavingNote ? 'Saving…' : 'Add Note'}
                                        </button>
                                    </div>
                                </div>

                                {/* Notes list */}
                                {isLoadingNotes ? (
                                    <p className="text-neutral-gray text-sm font-body text-center py-4">Loading notes…</p>
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
                                                        <span className="text-neutral-gray/40">·</span>
                                                        <span className="text-neutral-gray text-[10px] font-body">
                                                            {new Date(note.created_at).toLocaleDateString('en-GH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                    {note.is_own && (
                                                        <button type="button" onClick={() => void removeNote(note.id)}
                                                            className="text-neutral-gray/40 hover:text-error transition-colors cursor-pointer shrink-0">
                                                            <XIcon size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-text-dark text-sm font-body whitespace-pre-wrap">{note.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom actions */}
                <div className="px-6 py-4 border-t border-[#f0e8d8] flex flex-col gap-2">
                    <button type="button" onClick={() => { onClose(); onEdit(staff); }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium font-body cursor-pointer hover:bg-primary-hover transition-colors">
                        <PencilSimpleIcon size={14} weight="bold" />
                        Edit Staff Member
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => { onForceLogout(staff); }}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-light text-text-dark rounded-xl text-xs font-medium font-body cursor-pointer hover:bg-neutral-light/70 transition-colors">
                            <SignOutIcon size={13} weight="bold" />
                            Force Logout
                        </button>
                        <button type="button" onClick={() => { onResetPassword(staff); }}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-light text-text-dark rounded-xl text-xs font-medium font-body cursor-pointer hover:bg-neutral-light/70 transition-colors">
                            <LockSimpleIcon size={13} weight="bold" />
                            Reset Password
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {staff.status !== 'suspended' && staff.status !== 'terminated' ? (
                            <button type="button" onClick={() => { onSuspend(staff); onClose(); }}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-warning/10 text-warning rounded-xl text-xs font-medium font-body cursor-pointer hover:bg-warning/15 transition-colors">
                                <ArchiveIcon size={13} weight="bold" />
                                Suspend
                            </button>
                        ) : staff.status === 'suspended' ? (
                            <button type="button" onClick={() => { onReinstate(staff); onClose(); }}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-secondary/10 text-secondary rounded-xl text-xs font-medium font-body cursor-pointer hover:bg-secondary/15 transition-colors">
                                <ArrowCounterClockwiseIcon size={13} weight="bold" />
                                Reinstate
                            </button>
                        ) : (
                            <button type="button" onClick={() => { onReinstate(staff); onClose(); }}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-secondary/10 text-secondary rounded-xl text-xs font-medium font-body cursor-pointer hover:bg-secondary/15 transition-colors">
                                <ArrowCounterClockwiseIcon size={13} weight="bold" />
                                Restore
                            </button>
                        )}
                        {staff.status !== 'terminated' ? (
                            <button type="button" onClick={() => { onTerminate(staff); onClose(); }}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-light text-neutral-gray rounded-xl text-xs font-medium font-body cursor-pointer hover:bg-neutral-200 transition-colors">
                                <ArchiveIcon size={13} weight="bold" />
                                Terminate
                            </button>
                        ) : (
                            <button type="button" onClick={() => { onDelete(staff); onClose(); }}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-error/10 text-error rounded-xl text-xs font-medium font-body cursor-pointer hover:bg-error/15 transition-colors">
                                <TrashIcon size={13} weight="bold" />
                                Delete
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Staff modal ──────────────────────────────────────────────────────────────

// The Permissions tab is gone. It read a person's effective permissions, showed
// them as checkboxes, and wrote the lot back as grants attached to the user —
// which is how a branch manager kept getting `manage_employees` back after it
// had been taken off the manager role. What someone can do is decided by their
// role on the server; this form picks the role and nothing else.
type ModalTab = 'profile' | 'access' | 'hr';

interface StaffFormState {
    name:             string;
    phone:            string;
    email:            string;
    password:         string;
    passwordConfirm:  string;
    passwordMode:     'auto' | 'custom' | 'prompt';
    role:             StaffRole;
    /** Branch IDs, always. The form used to carry branch *names* and look their
     *  IDs back up on save, which threw "Invalid branch selected" whenever a
     *  branch was renamed or a name contained a comma. */
    branchIds:        string[];
    employmentStatus: EmploymentStatus;
    forcePasswordReset: boolean;
    // HR
    ssnit:            string;
    ghanaCard:        string;
    tinNumber:        string;
    dateOfBirth:      string;
    nationality:      string;
    emergencyName:    string;
    emergencyPhone:   string;
    emergencyRel:     string;
}

function memberToForm(s: StaffMember): StaffFormState {
    return {
        name: s.name,
        phone: s.phone ?? '',
        email: s.email ?? '',
        password: '',
        passwordConfirm: '',
        passwordMode: 'auto' as const,
        role: s.role,
        // Trim to what the role allows, so opening a record that predates the
        // rules does not silently resubmit an illegal set.
        branchIds: roleNeedsBranch(s.role)
            ? (roleAllowsManyBranches(s.role) ? s.branchIds : s.branchIds.slice(0, 1))
            : [],
        employmentStatus: s.employmentStatus,
        forcePasswordReset: false, // Always default to false for existing staff
        ssnit: s.ssnit ?? '',
        ghanaCard: s.ghanaCard ?? '',
        tinNumber: s.tinNumber ?? '',
        dateOfBirth: s.dateOfBirth ?? '',
        nationality: s.nationality ?? 'Ghanaian',
        emergencyName: s.emergencyContact?.name ?? '',
        emergencyPhone: s.emergencyContact?.phone ?? '',
        emergencyRel: s.emergencyContact?.relationship ?? '',
    };
}

function StaffModal({ staff, onClose, onSave }: { staff: StaffMember | null; onClose: () => void; onSave: (s: StaffMember) => void | Promise<void> }) {
    const { branches, isLoading: branchesLoading } = useBranchesApi();
    const isNew = !staff;

    const createBlankForm = (): StaffFormState => ({
        name: '', phone: '', email: '', password: '', passwordConfirm: '',
        passwordMode: 'auto' as const,
        role: 'sales_staff',
        branchIds: [],
        employmentStatus: 'active',
        forcePasswordReset: false,
        ssnit: '', ghanaCard: '', tinNumber: '',
        dateOfBirth: '', nationality: 'Ghanaian',
        emergencyName: '', emergencyPhone: '', emergencyRel: '',
    });

    const [form, setForm] = useState<StaffFormState>(staff ? memberToForm(staff) : createBlankForm());
    const [modalTab, setModalTab] = useState<ModalTab>('profile');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const rule = ROLE_RULES[form.role];
    const needsBranch = roleNeedsBranch(form.role);
    const allowsMany = roleAllowsManyBranches(form.role);

    /**
     * Changing the role changes what the account is, so the branch selection has
     * to be re-fitted to the new rule rather than carried over: a manager
     * becoming an admin loses the branch entirely, a rider becoming a manager
     * keeps only the first of theirs and has to confirm it.
     */
    function handleRoleChange(newRole: StaffRole) {
        setForm(f => ({
            ...f,
            role: newRole,
            branchIds: !roleNeedsBranch(newRole)
                ? []
                : roleAllowsManyBranches(newRole) ? f.branchIds : f.branchIds.slice(0, 1),
        }));
        setErrors(e => ({ ...e, branchIds: '' }));
    }

    function toggleBranch(id: string) {
        setForm(f => ({
            ...f,
            branchIds: allowsMany
                ? (f.branchIds.includes(id) ? f.branchIds.filter(b => b !== id) : [...f.branchIds, id])
                : [id],
        }));
        setErrors(e => ({ ...e, branchIds: '' }));
    }

    function validate() {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = 'Name is required';
        if (!isValidGhanaPhone(form.phone)) e.phone = 'Enter a valid Ghanaian phone number (e.g. 0241234567 or +233241234567)';
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email address';
        if (isNew && form.passwordMode === 'custom') {
            if (!form.password || form.password.length < 8) e.password = 'Min 8 characters';
            else if (form.password !== form.passwordConfirm) e.passwordConfirm = 'Passwords do not match';
        }
        // The role decides how many branches, so the form asks the role rather
        // than applying one rule to everyone. Mirrors the server, which enforces
        // the same thing whatever the client sends.
        const branchError = validateBranchSelection(form.role, form.branchIds);
        if (branchError) e.branchIds = branchError;

        setErrors(e);
        return Object.keys(e).length === 0;
    }

    async function handleSave() {
        setSubmitError(null);
        if (!validate()) return;

        if (needsBranch && branches.length === 0) {
            setSubmitError('Branches are still loading. Please wait and try again.');
            return;
        }

        const branchIds = [...new Set(form.branchIds)];
        const branchNames = branchIds
            .map(id => branches.find(b => String(b.id) === id)?.name)
            .filter((n): n is string => Boolean(n));

        const updated: StaffMember = {
            ...(staff ?? {
                id:          `u${Date.now()}`,
                status:      'active' as StaffStatus,
                joinedAt:    new Date().toLocaleDateString('en-GH', { month: 'short', year: 'numeric' }),
                lastLogin:   'Never',
                ordersToday: 0,
                permissions: [],
            }),
            name:             form.name.trim(),
            phone:            normalizeGhanaPhone(form.phone.trim()),
            email:            form.email.trim(),
            role:             form.role,
            branch:           allowsMany ? branchNames : branchNames[0] ?? '',
            branchIds:        branchIds,
            employmentStatus: form.employmentStatus,
            // Access follows employment, rather than being a second switch that
            // could disagree with it. The server treats anything but active as
            // no access, so the UI says the same.
            systemAccess:     (form.employmentStatus === 'active' ? 'enabled' : 'disabled') as SystemAccess,
            ...(isNew ? { password: form.password, passwordMode: form.passwordMode } : {}),
            ssnit:            form.ssnit || undefined,
            ghanaCard:        form.ghanaCard || undefined,
            tinNumber:        form.tinNumber || undefined,
            dateOfBirth:      form.dateOfBirth || undefined,
            nationality:      form.nationality || undefined,
            emergencyContact: form.emergencyName ? {
                name:         form.emergencyName,
                phone:        form.emergencyPhone,
                relationship: form.emergencyRel,
            } : undefined,
        };
        setIsSaving(true);
        try {
            await onSave(updated);
            
            // Handle force password reset separately for existing staff
            if (!isNew && form.forcePasswordReset) {
                await employeeService.requirePasswordReset(updated.id);
            }
            
            onClose();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to save. Please try again.';
            setSubmitError(message);
        } finally {
            setIsSaving(false);
        }
    }

    const MODAL_TABS: { id: ModalTab; label: string }[] = [
        { id: 'profile',     label: 'Profile' },
        { id: 'access',      label: 'Access' },
        { id: 'hr',          label: 'HR Info' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/30 backdrop-blur-sm overflow-y-auto">
            <div className="bg-neutral-card rounded-2xl shadow-2xl w-full max-w-lg my-8">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0e8d8]">
                    <h2 className="text-text-dark text-lg font-bold font-body">
                        {isNew ? 'Add Staff Member' : `Edit — ${staff?.name}`}
                    </h2>
                    <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-neutral-light cursor-pointer">
                        <XIcon size={16} className="text-neutral-gray" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-6 pt-4 border-b border-[#f0e8d8]">
                    {MODAL_TABS.map(t => (
                        <button key={t.id} type="button" onClick={() => setModalTab(t.id)}
                            className={`px-3 py-2 text-xs font-medium font-body rounded-t-lg border-b-2 transition-colors cursor-pointer ${modalTab === t.id ? 'border-primary text-primary' : 'border-transparent text-neutral-gray hover:text-text-dark'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="p-6 flex flex-col gap-5">

                    {/* ── Profile tab ── */}
                    {modalTab === 'profile' && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FieldInput label="Full Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} error={errors.name} span={2} />
                                <FieldInput label="Phone (+233)" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="024..." error={errors.phone} />
                                <FieldInput label="Email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="name@example.com" error={errors.email} />
                            </div>

                            {/* Role, and what it means. The role is the only thing
                                that decides a person's powers, so the form says
                                out loud what is being handed over. */}
                            <div>
                                <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1.5">Role</label>
                                <select
                                    value={form.role}
                                    onChange={e => handleRoleChange(e.target.value as StaffRole)}
                                    className="w-full px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40"
                                >
                                    {ASSIGNABLE_ROLES.map(role => (
                                        <option key={role} value={role}>{roleDisplayName(role)}</option>
                                    ))}
                                </select>
                                <div className="mt-2 p-3 bg-neutral-light border border-[#f0e8d8] rounded-xl">
                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                        <p className="text-text-dark text-[11px] font-bold font-body">{rule.portal}</p>
                                        <span className="text-[10px] font-body text-neutral-gray">{branchRuleLabel(form.role)}</span>
                                    </div>
                                    <ul className="flex flex-col gap-1">
                                        {rule.can.map(line => (
                                            <li key={line} className="text-neutral-gray text-[11px] font-body leading-snug">· {line}</li>
                                        ))}
                                    </ul>
                                    <p className="text-neutral-gray text-[10px] font-body mt-2 pt-2 border-t border-[#f0e8d8]">
                                        Permissions come from the role. There is nothing to tick — to change what this person can do, change their role.
                                    </p>
                                </div>
                            </div>

                            {/* Branch — asked for only when the role has one. Head
                                office, the warehouse and the call centre serve the
                                whole company, so pinning them to a branch would be
                                asking a question with no answer. */}
                            {needsBranch ? (
                                <div>
                                    <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1.5">
                                        {allowsMany ? 'Branches' : 'Branch'}
                                    </label>
                                    {branchesLoading ? (
                                        <div className="w-full px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-neutral-gray text-sm font-body">
                                            Loading branches...
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {branches.map(b => {
                                                const id = String(b.id);
                                                return (
                                                    <label key={id} className="flex items-center gap-1.5 cursor-pointer">
                                                        <input
                                                            type={allowsMany ? 'checkbox' : 'radio'}
                                                            name="staff-branch"
                                                            checked={form.branchIds.includes(id)}
                                                            onChange={() => toggleBranch(id)}
                                                            className="accent-primary"
                                                        />
                                                        <span className="text-text-dark text-xs font-body">{b.name}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {errors.branchIds && <p className="text-error text-[10px] font-body mt-1">{errors.branchIds}</p>}
                                </div>
                            ) : (
                                <div className="px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl">
                                    <p className="text-neutral-gray text-[11px] font-body">
                                        <strong className="text-text-dark">{roleDisplayName(form.role)}</strong> works across the whole company, so there is no branch to assign.
                                    </p>
                                </div>
                            )}

                            {/* Password mode — new employees only */}
                            {isNew && (
                                <div className="mt-1">
                                    <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Password Setup</label>
                                    <div className="flex gap-2 flex-wrap mb-3">
                                        {([
                                            { value: 'auto' as const, label: 'Auto-Generate' },
                                            { value: 'custom' as const, label: 'Set Password' },
                                            { value: 'prompt' as const, label: 'Send Prompt' },
                                        ]).map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setForm(f => ({ ...f, passwordMode: opt.value, password: '', passwordConfirm: '' }))}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold font-body cursor-pointer transition-colors ${
                                                    form.passwordMode === opt.value
                                                        ? 'bg-primary text-white'
                                                        : 'bg-neutral-light text-neutral-gray border border-[#f0e8d8]'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-neutral-gray text-[10px] font-body mb-2">
                                        {form.passwordMode === 'auto' && 'A secure password will be generated and shared with the staff member.'}
                                        {form.passwordMode === 'custom' && 'You set the password — the staff member will receive it directly.'}
                                        {form.passwordMode === 'prompt' && 'Staff member will receive a prompt to create their own password on first login.'}
                                    </p>
                                    {form.passwordMode === 'custom' && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <FieldInput label="Password" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} placeholder="Min 8 characters" error={errors.password} />
                                            <FieldInput label="Confirm" value={form.passwordConfirm} onChange={v => setForm(f => ({ ...f, passwordConfirm: v }))} placeholder="Re-type password" error={errors.passwordConfirm} />
                                        </div>
                                    )}
                                </div>
                            )}

                        </>
                    )}

                    {/* ── Access tab ── */}
                    {modalTab === 'access' && (
                        <>
                            <div>
                                <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Employment Status</label>
                                <div className="flex gap-2 flex-wrap">
                                    {(['active', 'on_leave', 'suspended', 'terminated'] as EmploymentStatus[]).map(s => (
                                        <button key={s} type="button"
                                            onClick={() => setForm(f => ({ ...f, employmentStatus: s }))}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold font-body cursor-pointer transition-colors ${form.employmentStatus === s
                                                ? s === 'active' ? 'bg-secondary text-white' : s === 'on_leave' ? 'bg-warning text-white' : 'bg-error text-white'
                                                : 'bg-neutral-light text-neutral-gray border border-[#f0e8d8]'
                                            }`}>
                                            {employmentStatusLabel(s)}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-neutral-gray text-[10px] font-body mt-2">
                                    {form.employmentStatus === 'active' ? 'Currently employed and working.' : form.employmentStatus === 'on_leave' ? 'Employee is on approved leave.' : 'Employee has left the company.'}
                                </p>
                            </div>

                            <div className="p-4 bg-neutral-light rounded-xl flex flex-col gap-3 border border-[#f0e8d8]">
                                <div>
                                    <p className="text-text-dark text-sm font-bold font-body">System Access</p>
                                    <p className="text-neutral-gray text-xs font-body">
                                        Follows employment status — it is not a second switch that can disagree with it.
                                    </p>
                                </div>
                                {form.employmentStatus === 'active' ? (
                                    <p className="text-secondary text-xs font-bold font-body">
                                        Enabled — can sign in to the staff portal and POS.
                                    </p>
                                ) : (
                                    <p className="text-error text-xs font-bold font-body">
                                        Disabled — saving this signs them out everywhere and blocks sign-in.
                                    </p>
                                )}
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer p-3 bg-warning/5 border border-warning/20 rounded-xl">
                                <input 
                                    type="checkbox" 
                                    className="accent-warning"
                                    checked={form.forcePasswordReset}
                                    onChange={e => setForm(f => ({ ...f, forcePasswordReset: e.target.checked }))}
                                />
                                <div>
                                    <p className="text-text-dark text-sm font-semibold font-body">Force password reset on next login</p>
                                    <p className="text-neutral-gray text-xs font-body">Staff must set a new password before accessing the portal</p>
                                </div>
                            </label>
                        </>
                    )}

                    {/* ── HR Info tab ── */}
                    {modalTab === 'hr' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <FieldInput label="Date of Birth" value={form.dateOfBirth} onChange={v => setForm(f => ({ ...f, dateOfBirth: v }))} placeholder="e.g. 1992-04-15" />
                                <FieldInput label="Nationality" value={form.nationality} onChange={v => setForm(f => ({ ...f, nationality: v }))} placeholder="Ghanaian" />
                                <FieldInput label="SSNIT Number" value={form.ssnit} onChange={v => setForm(f => ({ ...f, ssnit: v }))} placeholder="C000000000" />
                                <FieldInput label="Ghana Card ID" value={form.ghanaCard} onChange={v => setForm(f => ({ ...f, ghanaCard: v }))} placeholder="GHA-000000000-0" />
                                <FieldInput label="TIN Number" value={form.tinNumber} onChange={v => setForm(f => ({ ...f, tinNumber: v }))} placeholder="P0000000000" span={2} />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-2">Emergency Contact</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <FieldInput label="Name" value={form.emergencyName} onChange={v => setForm(f => ({ ...f, emergencyName: v }))} placeholder="Full name" span={2} />
                                    <FieldInput label="Phone" value={form.emergencyPhone} onChange={v => setForm(f => ({ ...f, emergencyPhone: v }))} placeholder="024..." />
                                    <FieldInput label="Relationship" value={form.emergencyRel} onChange={v => setForm(f => ({ ...f, emergencyRel: v }))} placeholder="Spouse, Parent…" />
                                </div>
                            </div>

                            <div className="p-3 bg-neutral-light rounded-xl border border-[#f0e8d8] flex items-center gap-3">
                                <IdentificationCardIcon size={32} weight="thin" className="text-neutral-gray/40 shrink-0" />
                                <div>
                                    <p className="text-text-dark text-sm font-medium font-body">Staff Photo</p>
                                    <p className="text-neutral-gray text-xs font-body">Photo upload coming soon</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {submitError && (
                    <div className="mx-6 px-4 py-2.5 rounded-xl bg-error/10 border border-error/20 flex items-center gap-2">
                        <WarningCircleIcon size={18} className="text-error shrink-0" />
                        <p className="text-error text-sm font-body">{submitError}</p>
                    </div>
                )}

                <div className="flex gap-3 px-6 py-4 border-t border-[#f0e8d8]">
                    <button type="button" onClick={onClose} disabled={isSaving} className="flex-1 px-4 py-2.5 bg-neutral-light text-text-dark rounded-xl text-sm font-medium font-body cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">Cancel</button>
                    <button type="button" onClick={() => void handleSave()} disabled={isSaving || (needsBranch && branchesLoading)} className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium font-body cursor-pointer hover:bg-primary-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                        {isSaving ? (isNew ? 'Creating…' : 'Saving…') : needsBranch && branchesLoading ? 'Loading...' : (isNew ? 'Create Account' : 'Save Changes')}
                    </button>
                </div>
            </div>
        </div>
    );
}

function FieldInput({ label, value, onChange, placeholder, error, span }: {
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; error?: string; span?: number;
}) {
    return (
        <div className={span === 2 ? 'col-span-2' : ''}>
            <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1.5">{label}</label>
            <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                className={`w-full px-3 py-2.5 bg-neutral-light border rounded-xl text-text-dark text-sm font-body focus:outline-none ${error ? 'border-error/50 focus:border-error/70' : 'border-[#f0e8d8] focus:border-primary/40'}`} />
            {error && <p className="text-error text-[10px] font-body mt-1">{error}</p>}
        </div>
    );
}

// ─── Tab types ────────────────────────────────────────────────────────────────

type FilterTab = 'All' | 'Admin' | 'Branch Partner' | 'Branch Manager' | 'Sales Staff' | 'Call Center' | 'Inventory' | 'Support Staff' | 'Suspended' | 'Terminated';

const SUPPORT_ROLES: StaffRole[] = ['kitchen', 'rider'];
// The warehouse and purchasing roles used to appear under "All" and nowhere
// else — no tab matched them, so they were invisible unless you scrolled the
// whole roster.
const INVENTORY_ROLES: StaffRole[] = ['warehouse_manager', 'purchasing_clerk'];
// Platform admins sit in the Admin tab alongside admins: they are the same job
// with the platform tools attached, and they are rare enough that a tab of
// their own would usually be empty.
const ADMIN_ROLES: StaffRole[] = ['admin', 'tech_admin'];

function matchesTab(s: StaffMember, tab: FilterTab): boolean {
    if (tab === 'Suspended')  return s.status === 'suspended';
    if (tab === 'Terminated') return s.status === 'terminated';
    if (tab === 'All')        return s.status !== 'terminated';
    if (s.status === 'terminated') return false;

    if (tab === 'Admin')          return ADMIN_ROLES.includes(s.role);
    if (tab === 'Branch Partner') return s.role === 'branch_partner';
    if (tab === 'Branch Manager') return s.role === 'manager';
    if (tab === 'Sales Staff')    return s.role === 'sales_staff';
    if (tab === 'Call Center')    return s.role === 'call_center';
    if (tab === 'Inventory')      return INVENTORY_ROLES.includes(s.role);
    if (tab === 'Support Staff')  return SUPPORT_ROLES.includes(s.role);
    return false;
}

function tabCount(staff: StaffMember[], tab: FilterTab): number {
    return staff.filter(s => matchesTab(s, tab)).length;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function isNewStaffId(id: string): boolean {
    return id.startsWith('u');
}

export default function AdminStaffPage() {
    const { employees: apiStaff, isLoading, refetch } = useEmployees();
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const hasInitialized = useRef(false);

    useEffect(() => {
        if (!hasInitialized.current && apiStaff.length > 0) {
            hasInitialized.current = true;
            setStaff(apiStaff);
        }
    }, [apiStaff]);
    const [tab, setTab] = useState<FilterTab>('All');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [editStaff, setEditStaff] = useState<StaffMember | null | 'new'>(null);
    const [deleteStaff, setDeleteStaff] = useState<StaffMember | null>(null);
    const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
    const [revealCreds, setRevealCreds] = useState<{ name: string; identifier: string; password: string } | null>(null);

    const PER_PAGE = 10;
    const TABS: FilterTab[] = ['All', 'Admin', 'Branch Partner', 'Branch Manager', 'Sales Staff', 'Call Center', 'Inventory', 'Support Staff', 'Suspended', 'Terminated'];

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

    // Reset page when filters change
    useEffect(() => { setPage(1); }, [tab, search]);

    async function saveStaff(s: StaffMember) {
        const branchIds = s.branchIds ?? [];
        const isNew = isNewStaffId(s.id);
        let generatedPassword: string | null = null;
        try {
            if (isNew) {
                const created = await employeeService.createEmployee({
                    name: s.name,
                    email: s.email || null,
                    phone: s.phone,
                    ...(s.passwordMode === 'custom' && s.password ? { password: s.password } : {}),
                    password_mode: s.passwordMode || 'auto',
                    branch_ids: branchIds.map((id) => Number(id)),
                    role: staffRoleToBackendRole(s.role),
                    hire_date: s.joinedAt || undefined,
                    // HR fields
                    ssnit_number: s.ssnit || undefined,
                    ghana_card_id: s.ghanaCard || undefined,
                    tin_number: s.tinNumber || undefined,
                    date_of_birth: s.dateOfBirth || undefined,
                    nationality: s.nationality || undefined,
                    emergency_contact_name: s.emergencyContact?.name || undefined,
                    emergency_contact_phone: s.emergencyContact?.phone || undefined,
                    emergency_contact_relationship: s.emergencyContact?.relationship || undefined,
                });
                generatedPassword = created.generatedPassword;
            } else {
                await employeeService.updateEmployee(s.id, {
                    name: s.name,
                    email: s.email || null,
                    phone: s.phone,
                    // Always sent, including empty: switching a branch manager
                    // to a company-wide role has to clear the branch, and
                    // omitting the key would silently leave it attached.
                    branch_ids: branchIds.map((id) => Number(id)),
                    role: staffRoleToBackendRole(s.role),
                    // Employment status is saved from the form. It used to be
                    // collected in the Access tab and then never sent, so
                    // suspending someone from the editor did nothing at all.
                    status: s.employmentStatus,
                    hire_date: s.joinedAt || undefined,
                    // HR fields
                    ssnit_number: s.ssnit || undefined,
                    ghana_card_id: s.ghanaCard || undefined,
                    tin_number: s.tinNumber || undefined,
                    date_of_birth: s.dateOfBirth || undefined,
                    nationality: s.nationality || undefined,
                    emergency_contact_name: s.emergencyContact?.name || undefined,
                    emergency_contact_phone: s.emergencyContact?.phone || undefined,
                    emergency_contact_relationship: s.emergencyContact?.relationship || undefined,
                });
            }
            const result = await refetch();
            setStaff(Array.isArray(result.data) ? result.data : []);
            setEditStaff(null);
            toast.success(isNew ? `${s.name} has been added successfully` : `${s.name} has been updated successfully`);
            if (isNew && generatedPassword) {
                setRevealCreds({ name: s.name, identifier: s.email || s.phone, password: generatedPassword });
            }
        } catch (err: unknown) {
            let msg = 'Failed to save. Please try again.';
            if (err && typeof err === 'object' && 'response' in err) {
                const res = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data;
                if (res?.message) msg = res.message;
                else if (res?.errors && typeof res.errors === 'object') {
                    const first = Object.values(res.errors).flat()[0];
                    if (first) msg = first;
                }
            } else if (err instanceof Error) msg = err.message;
            throw new Error(msg);
        }
    }

    async function deleteStaffFn(s: StaffMember) {
        try {
            await employeeService.deleteEmployee(s.id);
            setStaff(prev => prev.filter(x => x.id !== s.id));
            setDeleteStaff(null);
            toast.success(`${s.name} has been deleted successfully`);
        } catch (error) {
            console.error('Failed to delete employee:', error);
            toast.error('Failed to delete employee. Please try again.');
            setDeleteStaff(null);
        }
    }

    async function suspend(s: StaffMember) {
        try {
            await employeeService.updateEmployee(s.id, { status: 'suspended' });
            setStaff(prev => prev.map(x => x.id === s.id ? { 
                ...x, 
                status: 'suspended' as StaffStatus, 
                systemAccess: 'disabled' as SystemAccess 
            } : x));
            toast.success(`${s.name} has been suspended`);
        } catch (error) {
            console.error('Failed to suspend employee:', error);
            toast.error('Failed to suspend employee. Please try again.');
        }
    }

    async function reinstate(s: StaffMember) {
        try {
            await employeeService.updateEmployee(s.id, { status: 'active' });
            setStaff(prev => prev.map(x => x.id === s.id ? { 
                ...x, 
                status: 'active' as StaffStatus, 
                systemAccess: 'enabled' as SystemAccess 
            } : x));
            toast.success(`${s.name} has been reinstated`);
        } catch (error) {
            console.error('Failed to reinstate employee:', error);
            toast.error('Failed to reinstate employee. Please try again.');
        }
    }

    async function archive(s: StaffMember) {
        try {
            await employeeService.updateEmployee(s.id, { status: 'terminated' });
            setStaff(prev => prev.map(x => x.id === s.id ? { 
                ...x, 
                status: 'terminated' as StaffStatus, 
                systemAccess: 'disabled' as SystemAccess, 
                employmentStatus: 'terminated' as EmploymentStatus 
            } : x));
            toast.success(`${s.name} has been terminated`);
        } catch (error) {
            console.error('Failed to terminate employee:', error);
            toast.error('Failed to terminate employee. Please try again.');
        }
    }

    async function forceLogout(s: StaffMember) {
        try {
            await employeeService.forceLogout(s.id);
            toast.success(`${s.name} has been logged out from all devices`);
        } catch (error) {
            console.error('Failed to force logout employee:', error);
            toast.error('Failed to force logout. Please try again.');
        }
    }

    async function requirePasswordReset(s: StaffMember) {
        try {
            await employeeService.requirePasswordReset(s.id);
            toast.success(`Password reset required for ${s.name}. Notification sent.`);
        } catch (error) {
            console.error('Failed to require password reset:', error);
            toast.error('Failed to require password reset. Please try again.');
        }
    }

    return (
        <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div>
                    <h1 className="text-text-dark text-2xl font-bold font-body">Staff</h1>
                    <p className="text-neutral-gray text-sm font-body mt-0.5">{filtered.length} accounts shown</p>
                </div>
                <button type="button" onClick={() => setEditStaff('new')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium font-body hover:bg-primary-hover transition-colors cursor-pointer shrink-0">
                    <PlusIcon size={16} weight="bold" />
                    Add Staff Member
                </button>
            </div>

            {/* Search (above tabs) */}
            <div className="relative mb-4">
                <MagnifyingGlassIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-gray" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone, email…"
                    className="w-full pl-10 pr-4 py-2.5 bg-neutral-card border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40" />
            </div>

            {/* Tabs */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 mb-4">
                {TABS.map(t => (
                    <button key={t} type="button" onClick={() => setTab(t)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium font-body whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${tab === t ? 'bg-primary text-white' : 'bg-neutral-card border border-[#f0e8d8] text-neutral-gray hover:text-text-dark'}`}>
                        {t}
                        <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${tab === t ? 'bg-neutral-card/20 text-white' : 'bg-neutral-light text-neutral-gray'}`}>{tabCount(staff, t)}</span>
                    </button>
                ))}
            </div>

            {/* Staff list */}
            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl overflow-hidden">
                {isLoading && staff.length === 0 ? (
                    <div className="px-4 py-16 text-center">
                        <p className="text-neutral-gray text-sm font-body">Loading staff…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="px-4 py-16 text-center">
                        <UserCircleIcon size={32} weight="thin" className="text-neutral-gray/40 mx-auto mb-3" />
                        <p className="text-neutral-gray text-sm font-body">No staff found.</p>
                    </div>
                ) : (
                    <>
                        {/* Table header */}
                        <div className="hidden md:grid grid-cols-[1fr_110px_minmax(0,1fr)_minmax(0,1fr)_80px] gap-4 px-4 py-3 border-b border-[#f0e8d8] bg-[#faf6f0]">
                            {['Name', 'Role', 'Contact', 'Branch', 'Status'].map(h => (
                                <span key={h} className="text-neutral-gray text-[10px] font-bold font-body uppercase tracking-wider">{h}</span>
                            ))}
                        </div>
                        {paged.map((member, i) => (
                            <div key={member.id}
                                onClick={() => setSelectedStaff(member)}
                                className={`group px-4 py-3.5 flex flex-col md:grid md:grid-cols-[1fr_110px_minmax(0,1fr)_minmax(0,1fr)_80px] gap-2 md:gap-4 md:items-center cursor-pointer ${i < paged.length - 1 ? 'border-b border-[#f0e8d8]' : ''} hover:bg-neutral-light/50 transition-colors`}>

                                {/* Name + avatar */}
                                <div className="flex items-center gap-3 min-w-0">
                                    <AvatarCircle name={member.name} />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-text-dark text-sm font-semibold font-body truncate group-hover:text-primary transition-colors">{member.name}</p>
                                        <p className="text-neutral-gray text-[10px] font-body truncate md:hidden">{member.phone}</p>
                                    </div>
                                    <CaretRightIcon size={14} className="text-neutral-gray/0 group-hover:text-neutral-gray/50 transition-colors shrink-0 md:hidden" />
                                </div>

                                {/* Role */}
                                <RoleBadge role={member.role} />

                                {/* Contact */}
                                <div className="min-w-0 hidden md:block">
                                    <p className="text-text-dark text-xs font-body truncate">{member.phone}</p>
                                    {member.email && <p className="text-neutral-gray text-[10px] font-body truncate">{member.email}</p>}
                                </div>

                                {/* Branch */}
                                <div className="min-w-0 hidden md:flex items-center gap-1.5">
                                    <BuildingsIcon size={12} weight="fill" className="text-neutral-gray/50 shrink-0" />
                                    <p className="text-neutral-gray text-xs font-body truncate">{branchDisplay(member.branch)}</p>
                                </div>

                                {/* Status */}
                                <div className="hidden md:block">
                                    {member.status === 'active' && (
                                        <span className="inline-flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                                            <span className="text-secondary text-[10px] font-medium font-body">Active</span>
                                        </span>
                                    )}
                                    {member.status === 'suspended' && (
                                        <span className="inline-flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-error" />
                                            <span className="text-error text-[10px] font-medium font-body">Suspended</span>
                                        </span>
                                    )}
                                    {member.status === 'on_leave' && (
                                        <span className="inline-flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                                            <span className="text-warning text-[10px] font-medium font-body">On Leave</span>
                                        </span>
                                    )}
                                    {member.status === 'terminated' && (
                                        <span className="inline-flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-gray" />
                                            <span className="text-neutral-gray text-[10px] font-medium font-body">Terminated</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                    <p className="text-neutral-gray text-xs font-body">
                        Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
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

            {/* Detail drawer */}
            {selectedStaff && (
                <StaffDetailDrawer
                    staff={selectedStaff}
                    onClose={() => setSelectedStaff(null)}
                    onEdit={s => setEditStaff(s)}
                    onSuspend={suspend}
                    onReinstate={reinstate}
                    onTerminate={archive}
                    onForceLogout={forceLogout}
                    onResetPassword={requirePasswordReset}
                    onDelete={s => setDeleteStaff(s)}
                />
            )}

            {/* Modals */}
            {editStaff !== null && (
                <StaffModal staff={editStaff === 'new' ? null : editStaff as StaffMember} onClose={() => setEditStaff(null)} onSave={saveStaff} />
            )}
            {deleteStaff && (
                <ConfirmDeleteModal staff={deleteStaff} onConfirm={() => deleteStaffFn(deleteStaff)} onCancel={() => setDeleteStaff(null)} />
            )}

            {/* One-time credential reveal (auto-generated passwords) */}
            {revealCreds && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setRevealCreds(null)}>
                    <div className="bg-neutral-card rounded-2xl w-full max-w-md p-6 shadow-xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2 mb-1">
                            <ShieldCheckIcon size={20} weight="fill" className="text-primary" />
                            <h3 className="text-text-dark text-lg font-bold font-body">Account created</h3>
                        </div>
                        <p className="text-neutral-gray text-sm font-body mb-4">
                            A welcome email was sent to <span className="font-semibold text-text-dark">{revealCreds.name}</span>. Share these credentials confidentially — this password won&apos;t be shown again.
                        </p>
                        <div className="flex flex-col gap-2 mb-5">
                            <div className="flex items-center justify-between gap-3 bg-neutral-light border border-[#f0e8d8] rounded-xl px-3 py-2.5">
                                <div className="min-w-0">
                                    <p className="text-neutral-gray text-[10px] font-bold uppercase tracking-wider font-body">Login</p>
                                    <p className="text-text-dark text-sm font-body font-medium truncate">{revealCreds.identifier}</p>
                                </div>
                                <button type="button" onClick={() => { navigator.clipboard?.writeText(revealCreds.identifier); toast.success('Login copied'); }}
                                    className="text-primary text-xs font-semibold font-body hover:underline shrink-0 cursor-pointer">Copy</button>
                            </div>
                            <div className="flex items-center justify-between gap-3 bg-neutral-light border border-[#f0e8d8] rounded-xl px-3 py-2.5">
                                <div className="min-w-0">
                                    <p className="text-neutral-gray text-[10px] font-bold uppercase tracking-wider font-body">Temporary password</p>
                                    <p className="text-text-dark text-sm font-body font-bold tracking-wide truncate">{revealCreds.password}</p>
                                </div>
                                <button type="button" onClick={() => { navigator.clipboard?.writeText(revealCreds.password); toast.success('Password copied'); }}
                                    className="text-primary text-xs font-semibold font-body hover:underline shrink-0 cursor-pointer">Copy</button>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button"
                                onClick={() => { navigator.clipboard?.writeText(`Login: ${revealCreds.identifier}\nPassword: ${revealCreds.password}`); toast.success('Credentials copied'); }}
                                className="px-4 py-2 rounded-xl border border-[#f0e8d8] text-text-dark/80 text-sm font-semibold font-body hover:border-primary/40 transition-colors cursor-pointer">Copy both</button>
                            <button type="button" onClick={() => setRevealCreds(null)}
                                className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold font-body hover:bg-primary-hover transition-colors cursor-pointer">Done</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

