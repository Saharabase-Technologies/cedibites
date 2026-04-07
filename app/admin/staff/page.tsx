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
    ToggleLeftIcon,
    ToggleRightIcon,
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
    type StaffPermissions,
    roleDisplayName,
    employmentStatusLabel,
    defaultPermissions,
} from '@/types/staff';
import { useEmployees } from '@/lib/api/hooks/useEmployees';
import { useBranchesApi } from '@/lib/api/hooks/useBranchesApi';
import { useRoles, usePermissions } from '@/lib/api/hooks/useRoles';
import { employeeService, staffRoleToBackendRole, mapPermissionsToBackend, type EmployeeNoteResponse } from '@/lib/api/services/employee.service';
import { toast } from '@/lib/utils/toast';
import { isValidGhanaPhone, normalizeGhanaPhone } from '@/app/lib/phone';

// ─── Display helpers ──────────────────────────────────────────────────────────

const ROLE_COLORS: Record<StaffRole, string> = {
    tech_admin:     'text-primary',
    admin:          'text-primary',
    branch_partner: 'text-purple-600',
    manager:        'text-secondary',
    call_center:    'text-info',
    sales_staff:    'text-neutral-gray',
    kitchen:        'text-warning',
    rider:          'text-secondary',
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

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label, sub }: { checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
    return (
        <div className="flex items-center justify-between gap-3 py-1.5">
            <div className="flex-1 cursor-pointer" onClick={() => onChange(!checked)}>
                <p className="text-text-dark text-sm font-medium font-body">{label}</p>
                {sub && <p className="text-neutral-gray text-xs font-body">{sub}</p>}
            </div>
            <button type="button" onClick={() => onChange(!checked)} className="shrink-0 cursor-pointer">
                {checked
                    ? <ToggleRightIcon size={28} weight="fill" className="text-secondary" />
                    : <ToggleLeftIcon  size={28} weight="fill" className="text-neutral-gray/40" />
                }
            </button>
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

type ModalTab = 'profile' | 'access' | 'permissions' | 'hr';

interface StaffFormState {
    name:             string;
    phone:            string;
    email:            string;
    password:         string;
    passwordConfirm:  string;
    passwordMode:     'auto' | 'custom' | 'prompt';
    role:             StaffRole;
    branch:           string | string[];
    employmentStatus: EmploymentStatus;
    systemAccess:     SystemAccess;
    permissions:      StaffPermissions;
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
    // Handle branch data properly - convert string to array if needed
    let branchValue: string | string[];
    if (MULTI_BRANCH_ROLES.includes(s.role)) {
        // For multi-branch roles, ensure branch is an array
        if (typeof s.branch === 'string') {
            // Split comma-separated string into array
            branchValue = s.branch.split(',').map(b => b.trim()).filter(b => b.length > 0);
        } else {
            branchValue = Array.isArray(s.branch) ? s.branch : [s.branch];
        }
    } else {
        // For single-branch roles, ensure branch is a string
        if (Array.isArray(s.branch)) {
            branchValue = s.branch[0] || '';
        } else if (typeof s.branch === 'string') {
            // If it's a comma-separated string, take the first branch
            branchValue = s.branch.split(',')[0]?.trim() || '';
        } else {
            branchValue = s.branch || '';
        }
    }

    return {
        name: s.name,
        phone: s.phone ?? '',
        email: s.email ?? '',
        password: '',
        passwordConfirm: '',
        passwordMode: 'auto' as const,
        role: s.role,
        branch: branchValue,
        employmentStatus: s.employmentStatus,
        systemAccess: s.systemAccess,
        permissions: { ...s.permissions },
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

// Roles that can span multiple branches
const MULTI_BRANCH_ROLES: StaffRole[] = ['call_center', 'branch_partner', 'admin', 'tech_admin'];

function StaffModal({ staff, onClose, onSave }: { staff: StaffMember | null; onClose: () => void; onSave: (s: StaffMember) => void | Promise<void> }) {
    const { branches, isLoading: branchesLoading } = useBranchesApi();
    const { roles, isLoading: rolesLoading } = useRoles();
    const { permissions, isLoading: permissionsLoading } = usePermissions();
    const ALL_BRANCHES = branches.map((b) => b.name);
    const BRANCH_ID_MAP: Record<string, string> = Object.fromEntries(branches.map((b) => [b.name, String(b.id)]));
    const isNew = !staff;
    
    // Create a dynamic blank form that uses the first available branch
    const createBlankForm = (): StaffFormState => ({
        name: '', phone: '', email: '', password: '', passwordConfirm: '',
        passwordMode: 'auto' as const,
        role: 'sales_staff',
        branch: ALL_BRANCHES[0] || '',
        employmentStatus: 'active',
        systemAccess: 'enabled',
        permissions: defaultPermissions('sales_staff'),
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
    
    // Update form branch when branches load (for new staff only)
    React.useEffect(() => {
        if (isNew && ALL_BRANCHES.length > 0 && !form.branch) {
            setForm(f => ({ ...f, branch: ALL_BRANCHES[0] }));
        }
    }, [ALL_BRANCHES, isNew, form.branch]);

    // Convert database role name to StaffRole
    const dbRoleToStaffRole = (dbRoleName: string): StaffRole => {
        const mapping: Record<string, StaffRole> = {
            'tech_admin': 'tech_admin',
            'admin': 'admin',
            'branch_partner': 'branch_partner',
            'manager': 'manager',
            'call_center': 'call_center',
            'sales_staff': 'sales_staff',
            'kitchen': 'kitchen',
            'rider': 'rider',
            'employee': 'sales_staff', // Map legacy employee to sales_staff
        };
        return mapping[dbRoleName] ?? 'sales_staff';
    };

    // Convert StaffRole to database role name
    const staffRoleToDbRole = (staffRole: StaffRole): string => {
        const mapping: Record<StaffRole, string> = {
            'tech_admin': 'tech_admin',
            'admin': 'admin',
            'branch_partner': 'branch_partner',
            'manager': 'manager',
            'call_center': 'call_center',
            'sales_staff': 'sales_staff',
            'kitchen': 'kitchen',
            'rider': 'rider',
        };
        return mapping[staffRole] ?? 'sales_staff';
    };

    // Get available roles for the dropdown (filter to only show roles that map to valid StaffRole)
    const availableRoles = roles.filter(role => {
        const staffRole = dbRoleToStaffRole(role.name);
        return ['admin', 'branch_partner', 'manager', 'call_center', 'sales_staff', 'kitchen', 'rider'].includes(staffRole);
    });

    // Map *every* backend permission to its frontend key/label/description.
    // The UI already filters out permissions the selected role already grants,
    // so the admin sees only the extras they can toggle per-user.
    const BACKEND_TO_FRONTEND: Record<string, keyof StaffPermissions> = {
        view_orders:           'canViewOrders',
        create_orders:         'canPlaceOrders',
        update_orders:         'canAdvanceOrders',
        delete_orders:         'canDeleteOrders',
        view_menu:             'canViewMenu',
        manage_menu:           'canManageMenu',
        view_branches:         'canViewBranches',
        manage_branches:       'canManageBranches',
        view_customers:        'canViewCustomers',
        manage_customers:      'canManageCustomers',
        view_employees:        'canViewEmployees',
        manage_employees:      'canManageStaff',
        view_analytics:        'canViewReports',
        view_activity_log:     'canViewActivityLog',
        access_admin_panel:    'canAccessAdminPanel',
        access_manager_portal: 'canAccessManagerPortal',
        access_sales_portal:   'canAccessSalesPortal',
        access_partner_portal: 'canAccessPartnerPortal',
        access_pos:            'canAccessPOS',
        access_kitchen:        'canAccessKitchen',
        access_order_manager:  'canAccessOrderManager',
        manage_shifts:         'canManageShifts',
        manage_settings:       'canManageSettings',
        view_my_shifts:        'canViewMyShifts',
        view_my_sales:         'canViewMySales',
    };

    const getPermissionMapping = () => {
        const mapping: Record<string, { key: keyof StaffPermissions; label: string; description: string }> = {};

        permissions.forEach(perm => {
            const frontendKey = BACKEND_TO_FRONTEND[perm.name];
            if (frontendKey) {
                mapping[perm.name] = { key: frontendKey, label: perm.display_name, description: perm.description };
            }
        });

        return mapping;
    };

    const permissionMapping = getPermissionMapping();
    // Only show permissions not already granted by the selected role
    const rolePermissions = new Set(roles.find(r => r.name === staffRoleToBackendRole(form.role))?.permissions ?? []);
    const displayPermissions = Object.entries(permissionMapping).filter(([permName]) => !rolePermissions.has(permName));

    const isMultiBranch = MULTI_BRANCH_ROLES.includes(form.role);

    // When role changes, reset permissions to role defaults
    function handleRoleChange(newRole: StaffRole) {
        setForm(f => ({
            ...f,
            role: newRole,
            permissions: defaultPermissions(newRole),
            branch: MULTI_BRANCH_ROLES.includes(newRole)
                ? (Array.isArray(f.branch) ? f.branch : [f.branch as string])
                : (Array.isArray(f.branch) ? f.branch[0] : f.branch),
        }));
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
        setErrors(e);
        return Object.keys(e).length === 0;
    }

    async function handleSave() {
        setSubmitError(null);
        if (!validate()) return;
        
        // Ensure branches are loaded
        if (branches.length === 0) {
            setSubmitError('Branches are still loading. Please wait and try again.');
            return;
        }
        
        // Process branch data properly
        let branchNames: string[] = [];
        if (Array.isArray(form.branch)) {
            // If it's already an array, flatten any comma-separated strings
            branchNames = form.branch.flatMap(b => 
                typeof b === 'string' ? b.split(',').map(name => name.trim()).filter(name => name.length > 0) : []
            );
        } else if (typeof form.branch === 'string') {
            // If it's a string, split by comma
            branchNames = form.branch.split(',').map(name => name.trim()).filter(name => name.length > 0);
        }
        
        // Remove duplicates
        branchNames = [...new Set(branchNames)];
        
        // Validate that all selected branches exist in the branch map
        const branchIds = branchNames.map(branchName => {
            const branchId = BRANCH_ID_MAP[branchName];
            if (!branchId) {
                console.error(`Branch "${branchName}" not found in BRANCH_ID_MAP:`, BRANCH_ID_MAP);
                console.error('Available branches:', Object.keys(BRANCH_ID_MAP));
                console.error('Processed branch names:', branchNames);
                console.error('Original form.branch:', form.branch);
                throw new Error(`Invalid branch selected: ${branchName}`);
            }
            return branchId;
        });
        
        if (branchIds.length === 0) {
            setSubmitError('Please select at least one branch.');
            return;
        }
        
        const updated: StaffMember = {
            ...(staff ?? {
                id:          `u${Date.now()}`,
                status:      'active' as StaffStatus,
                joinedAt:    new Date().toLocaleDateString('en-GH', { month: 'short', year: 'numeric' }),
                lastLogin:   'Never',
                ordersToday: 0,
            }),
            name:             form.name.trim(),
            phone:            normalizeGhanaPhone(form.phone.trim()),
            email:            form.email.trim(),
            role:             form.role,
            branch:           isMultiBranch ? branchNames : branchNames[0],
            branchIds:        branchIds,
            employmentStatus: form.employmentStatus,
            systemAccess:     form.systemAccess,
            permissions:      form.permissions,
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
        { id: 'permissions', label: 'Permissions' },
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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1.5">Role</label>
                                    <select
                                        value={form.role}
                                        onChange={e => handleRoleChange(e.target.value as StaffRole)}
                                        className="w-full px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40"
                                        disabled={rolesLoading}
                                    >
                                        {rolesLoading ? (
                                            <option>Loading roles...</option>
                                        ) : (
                                            availableRoles.map(role => {
                                                const staffRole = dbRoleToStaffRole(role.name);
                                                return (
                                                    <option key={role.name} value={staffRole}>
                                                        {role.display_name}
                                                    </option>
                                                );
                                            })
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1.5">
                                        {isMultiBranch ? 'Branches' : 'Branch'}
                                    </label>
                                    {branchesLoading ? (
                                        <div className="w-full px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-neutral-gray text-sm font-body">
                                            Loading branches...
                                        </div>
                                    ) : isMultiBranch ? (
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {ALL_BRANCHES.map((b, i) => {
                                                const arr = Array.isArray(form.branch) ? form.branch : [form.branch as string];
                                                return (
                                                    <label key={`${b}-${i}`} className="flex items-center gap-1.5 cursor-pointer">
                                                        <input type="checkbox" checked={arr.includes(b)} onChange={e => {
                                                            const branches = Array.isArray(form.branch) ? form.branch : [form.branch as string];
                                                            setForm(f => ({ ...f, branch: e.target.checked ? [...branches, b] : branches.filter(x => x !== b) }));
                                                        }} className="accent-primary" />
                                                        <span className="text-text-dark text-xs font-body">{b}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <select
                                            value={Array.isArray(form.branch) ? form.branch[0] : form.branch}
                                            onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}
                                            className="w-full px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40"
                                        >
                                            {ALL_BRANCHES.map((b, i) => <option key={`${b}-${i}`} value={b}>{b}</option>)}
                                        </select>
                                    )}
                                </div>
                            </div>

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
                                    <p className="text-neutral-gray text-xs font-body">Controls whether this person can log in to the staff portal or POS terminal.</p>
                                </div>
                                <div className="flex gap-2">
                                    {(['enabled', 'disabled'] as SystemAccess[]).map(a => (
                                        <button key={a} type="button"
                                            onClick={() => setForm(f => ({ ...f, systemAccess: a }))}
                                            className={`flex-1 py-2 rounded-xl text-xs font-bold font-body cursor-pointer transition-colors ${form.systemAccess === a
                                                ? a === 'enabled' ? 'bg-secondary text-white' : 'bg-error/10 text-error border border-error/30'
                                                : 'bg-neutral-card text-neutral-gray border border-[#f0e8d8]'
                                            }`}>
                                            {a === 'enabled' ? 'Enabled' : 'Disabled'}
                                        </button>
                                    ))}
                                </div>
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

                    {/* ── Permissions tab ── */}
                    {modalTab === 'permissions' && (
                        <div className="flex flex-col gap-0.5">
                            <p className="text-neutral-gray text-xs font-body mb-2">
                                Permissions already included in the <strong className="text-text-dark">{roleDisplayName(form.role)}</strong> role are not shown. These are extras you can grant individually.
                            </p>
                            {permissionsLoading ? (
                                <div className="text-center py-4">
                                    <p className="text-neutral-gray text-sm font-body">Loading permissions...</p>
                                </div>
                            ) : displayPermissions.length === 0 ? (
                                <p className="text-center text-neutral-gray text-sm font-body py-6">
                                    All available permissions are already included in the {roleDisplayName(form.role)} role.
                                </p>
                            ) : (
                                <div className="divide-y divide-[#f0e8d8]">
                                    {displayPermissions.map(([permName, permConfig]) => (
                                        <Toggle
                                            key={permName}
                                            checked={form.permissions[permConfig.key]}
                                            onChange={v => setForm(f => ({ 
                                                ...f, 
                                                permissions: { 
                                                    ...f.permissions, 
                                                    [permConfig.key]: v
                                                },
                                                            }))}
                                            label={permConfig.label}
                                            sub={permConfig.description}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
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
                    <button type="button" onClick={() => void handleSave()} disabled={isSaving || branchesLoading || rolesLoading} className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium font-body cursor-pointer hover:bg-primary-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                        {isSaving ? (isNew ? 'Creating…' : 'Saving…') : branchesLoading || rolesLoading ? 'Loading...' : (isNew ? 'Create Account' : 'Save Changes')}
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

type FilterTab = 'All' | 'Admin' | 'Branch Partner' | 'Branch Manager' | 'Sales Staff' | 'Call Center' | 'Support Staff' | 'Suspended' | 'Terminated';

const SUPPORT_ROLES: StaffRole[] = ['kitchen', 'rider'];

function matchesTab(s: StaffMember, tab: FilterTab): boolean {
    if (tab === 'Suspended')  return s.status === 'suspended';
    if (tab === 'Terminated') return s.status === 'terminated';
    if (tab === 'All')        return s.status !== 'terminated';
    if (tab === 'Admin')         return s.role === 'admin'          && s.status !== 'terminated';
    if (tab === 'Branch Partner') return s.role === 'branch_partner' && s.status !== 'terminated';
    if (tab === 'Branch Manager') return s.role === 'manager'        && s.status !== 'terminated';
    if (tab === 'Sales Staff')    return s.role === 'sales_staff'    && s.status !== 'terminated';
    if (tab === 'Call Center')    return s.role === 'call_center'    && s.status !== 'terminated';
    if (tab === 'Support Staff')  return SUPPORT_ROLES.includes(s.role) && s.status !== 'terminated';
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

    const PER_PAGE = 10;
    const TABS: FilterTab[] = ['All', 'Admin', 'Branch Partner', 'Branch Manager', 'Sales Staff', 'Call Center', 'Support Staff', 'Suspended', 'Terminated'];

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
        try {
            if (isNew) {
                if (branchIds.length === 0) throw new Error('Select at least one branch.');
                await employeeService.createEmployee({
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
                    // Individual permissions
                    permissions: mapPermissionsToBackend(s.permissions),
                });
            } else {
                await employeeService.updateEmployee(s.id, {
                    name: s.name,
                    email: s.email || null,
                    phone: s.phone,
                    ...(branchIds.length > 0 && { branch_ids: branchIds.map((id) => Number(id)) }),
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
                    // Individual permissions
                    permissions: mapPermissionsToBackend(s.permissions),
                });
            }
            const result = await refetch();
            setStaff(Array.isArray(result.data) ? result.data : []);
            setEditStaff(null);
            toast.success(isNew ? `${s.name} has been added successfully` : `${s.name} has been updated successfully`);
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
        </div>
    );
}

