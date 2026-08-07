'use client';

import { useState } from 'react';
import { WarningCircleIcon } from '@phosphor-icons/react';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  itemName: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  confirmText?: string;
  isLoading?: boolean;
}

export function DeleteConfirmDialog({
  isOpen,
  title,
  message,
  itemName,
  onConfirm,
  onCancel,
  confirmText = 'CONFIRM',
  isLoading = false,
}: DeleteConfirmDialogProps) {
  const [input, setInput] = useState('');

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (input === confirmText) {
      await onConfirm();
      setInput(''); // Reset input after confirm
    }
  };

  const handleCancel = () => {
    setInput(''); // Reset input on cancel
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-neutral-card rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
        <div className="h-1.5 bg-error" />
        <div className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <WarningCircleIcon size={18} weight="fill" className="text-error" />
            <h3 className="text-text-dark text-base font-bold font-body">{title}</h3>
          </div>
          <p className="text-neutral-gray text-sm font-body mb-4">
            {message.replace('{itemName}', itemName)}
          </p>
          <p className="text-xs font-body text-neutral-gray mb-2">
            Type <strong>{confirmText}</strong> to proceed:
          </p>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={confirmText}
            disabled={isLoading}
            className="w-full px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-error/50 mb-4 disabled:opacity-50"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-neutral-light text-text-dark rounded-xl text-sm font-medium font-body cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={input !== confirmText || isLoading}
              className="flex-1 px-4 py-2.5 bg-error text-white rounded-xl text-sm font-medium font-body disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? 'Deleting...' : 'Delete permanently'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}