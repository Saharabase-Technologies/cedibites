'use client';

import type { StaffMember, StaffRole } from '@/types/staff';
import { StaffModal } from './StaffModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { CredentialsModal } from './CredentialsModal';
import type { useStaffDirectory } from './useStaffDirectory';

type Directory = ReturnType<typeof useStaffDirectory>;

export interface StaffEditorsProps {
    directory: Directory;
    editing: StaffMember | 'new' | null;
    onEditingChange: (next: StaffMember | 'new' | null) => void;
    deleting?: StaffMember | null;
    onDeletingChange?: (next: StaffMember | null) => void;
    defaultBranchId?: string;
    defaultRole?: StaffRole;
}

/**
 * Every dialog that writes to a staff record, in one place.
 *
 * Both the group overview and each group's roster can open the editor — the
 * "Add staff" button sits in a page header, while "Edit" comes off the detail
 * drawer. Keeping the dialogs here means neither screen grows its own copy of
 * the save wiring.
 */
export function StaffEditors({
    directory,
    editing,
    onEditingChange,
    deleting = null,
    onDeletingChange,
    defaultBranchId,
    defaultRole,
}: StaffEditorsProps) {
    const { revealCreds, setRevealCreds, actions } = directory;

    return (
        <>
            {editing !== null && (
                <StaffModal
                    staff={editing === 'new' ? null : editing}
                    onClose={() => onEditingChange(null)}
                    onSave={actions.saveStaff}
                    defaultBranchId={defaultBranchId}
                    defaultRole={defaultRole}
                />
            )}

            {deleting && onDeletingChange && (
                <ConfirmDeleteModal
                    staff={deleting}
                    onConfirm={async () => {
                        await actions.deleteStaff(deleting);
                        onDeletingChange(null);
                    }}
                    onCancel={() => onDeletingChange(null)}
                />
            )}

            {revealCreds && (
                <CredentialsModal creds={revealCreds} onClose={() => setRevealCreds(null)} />
            )}
        </>
    );
}
