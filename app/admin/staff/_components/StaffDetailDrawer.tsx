'use client';

import { useEffect, useState } from 'react';
import {
    PencilSimpleIcon, TrashIcon, LockSimpleIcon, SignOutIcon,
    ArrowCounterClockwiseIcon, ArchiveIcon, XIcon, BuildingsIcon, ClockIcon,
    IdentificationCardIcon, EnvelopeSimpleIcon, PhoneIcon, CalendarIcon,
    NoteIcon, ShieldCheckIcon, GlobeIcon, FirstAidKitIcon, PaperPlaneTiltIcon,
} from '@phosphor-icons/react';
import type { StaffMember } from '@/types/staff';
import { roleDisplayName, permissionDisplayName } from '@/types/staff';
import { employeeService, type EmployeeNoteResponse } from '@/lib/api/services/employee.service';
import { toast } from '@/lib/utils/toast';
import { AvatarCircle, RoleBadge, STATUS_CONFIG, branchDisplay } from './shared';

type DetailTab = 'overview' | 'notes';

export interface StaffDetailDrawerProps {
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

export function StaffDetailDrawer({
    staff, onClose, onEdit, onSuspend, onReinstate, onTerminate,
    onForceLogout, onResetPassword, onDelete,
}: StaffDetailDrawerProps) {
    const [activeTab, setActiveTab] = useState<DetailTab>('overview');
    const [notes, setNotes] = useState<EmployeeNoteResponse[]>([]);
    const [newNote, setNewNote] = useState('');
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [isLoadingNotes, setIsLoadingNotes] = useState(false);

    // Guarded against the drawer being pointed at somebody else mid-flight —
    // two quick clicks used to race, and the slower response won, showing one
    // person's private notes under another person's name.
    useEffect(() => {
        let cancelled = false;

        void (async () => {
            setIsLoadingNotes(true);
            try {
                const loaded = await employeeService.getNotes(staff.id);
                if (!cancelled) setNotes(loaded);
            } catch {
                if (!cancelled) toast.error('Failed to load notes');
            } finally {
                if (!cancelled) setIsLoadingNotes(false);
            }
        })();

        return () => { cancelled = true; };
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

    const current = STATUS_CONFIG[staff.status] ?? STATUS_CONFIG.active;
    const hasHrInfo = staff.ssnit || staff.ghanaCard || staff.tinNumber
        || staff.dateOfBirth || staff.nationality || staff.emergencyContact;

    return (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
            <div className="relative w-full max-w-md bg-neutral-card shadow-2xl flex flex-col animate-in slide-in-from-right duration-200" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="px-6 py-5 border-b border-[#f0e8d8]">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <AvatarCircle name={staff.name} size="lg" />
                            <div className="min-w-0">
                                <h2 className="text-text-dark text-lg font-bold font-body truncate">{staff.name}</h2>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <RoleBadge role={staff.role} />
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

                            {hasHrInfo && (
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
                        ) : (
                            <button type="button" onClick={() => { onReinstate(staff); onClose(); }}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-secondary/10 text-secondary rounded-xl text-xs font-medium font-body cursor-pointer hover:bg-secondary/15 transition-colors">
                                <ArrowCounterClockwiseIcon size={13} weight="bold" />
                                {staff.status === 'suspended' ? 'Reinstate' : 'Restore'}
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
