'use client';

import { SignOutIcon } from '@phosphor-icons/react';

interface SignOutDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SignOutDialog({ isOpen, onConfirm, onCancel }: SignOutDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-6">
          <div className="w-12 h-12 rounded-2xl bg-error/10 flex items-center justify-center mb-4">
            <SignOutIcon className="w-6 h-6 text-error" />
          </div>
          <h3 className="text-text-dark font-bold text-lg mb-1">Sign out of POS?</h3>
          <p className="text-neutral-gray text-sm">Your cart will be cleared. Make sure all orders are submitted before signing out.</p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl bg-neutral-gray/10 text-text-dark font-medium text-sm hover:bg-neutral-gray/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-11 rounded-xl bg-error text-white font-medium text-sm hover:bg-error/90 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
