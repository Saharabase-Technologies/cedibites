'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CaretDownIcon, CheckIcon } from '@phosphor-icons/react';
import BottomSheet from '@/app/components/ui/BottomSheet';
import { usePhone } from '@/lib/hooks/usePhone';

export type CustomSelectOption = {
  value: string;
  label: string;
  description?: string;
};

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  size = 'md',
  fullWidth,
  id,
  disabled,
  sheetTitle,
}: {
  value: string;
  onChange: (v: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  id?: string;
  disabled?: boolean;
  /**
   * On a phone, the options open in a bottom sheet under this title. Left
   * out, they drop down under the field at every width.
   */
  sheetTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const phone = usePhone();
  const sheet = !!sheetTitle && phone;
  // The sheet re-runs its focus effect when this changes, so it stays the same function.
  const close = useCallback(() => setOpen(false), []);

  // Close on outside click. The sheet has its own backdrop and Escape.
  useEffect(() => {
    if (!open || sheet) return;
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open, sheet]);

  const current = options.find((o) => o.value === value);
  const triggerHeight = size === 'sm' ? 'min-h-9 py-2' : 'min-h-11 py-2.5';
  const widthClass = fullWidth ? 'w-full' : 'min-w-40';

  return (
    <div ref={wrapperRef} className={`relative ${widthClass}`}>
      <button
        id={id}
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={`
          ${widthClass} ${triggerHeight}
          flex items-center justify-between gap-2 px-3.5
          border border-[#f0e8d8] rounded-xl
          text-sm font-body text-text-dark bg-neutral-card
          hover:border-primary/40 transition-colors cursor-pointer
          focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        <span className={current ? '' : 'text-neutral-gray/60'}>
          {current?.label ?? placeholder}
        </span>
        <CaretDownIcon
          size={14}
          weight="bold"
          className={`text-neutral-gray transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && !sheet && (
        <div
          className="
            absolute z-50 mt-1.5 w-full min-w-full
            bg-neutral-card border border-[#f0e8d8] rounded-xl shadow-lg
            py-1 max-h-64 overflow-y-auto
          "
          role="listbox"
        >
          <Options options={options} value={value} onPick={(v) => { onChange(v); close(); }} row="px-3.5 py-2" />
        </div>
      )}

      {/* On the body, so no panel or popover around the field can hold it under the phone bar. */}
      {sheet && createPortal(
        <BottomSheet
          open={open}
          onClose={close}
          label={sheetTitle}
          header={<h2 className="px-5 pb-2 pt-1 text-lg font-semibold font-brand text-text-dark">{sheetTitle}</h2>}
        >
          <div role="listbox" aria-label={sheetTitle} className="pb-5">
            <Options options={options} value={value} onPick={(v) => { onChange(v); close(); }} row="min-h-11 px-5 py-3" />
          </div>
        </BottomSheet>,
        document.body,
      )}
    </div>
  );
}

function Options({
  options,
  value,
  onPick,
  row,
}: {
  options: CustomSelectOption[];
  value: string;
  onPick: (v: string) => void;
  /** The padding of a row: tighter in the drop down list, a full thumb's height in the sheet. */
  row: string;
}) {
  if (options.length === 0) {
    return <div className="px-3.5 py-2 text-xs text-neutral-gray font-body">No options</div>;
  }
  return (
    <>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => onPick(opt.value)}
            className={`
              w-full flex items-center justify-between gap-2 ${row}
              text-left text-sm font-body cursor-pointer transition-colors
              ${selected
                ? 'bg-primary/5 text-text-dark font-medium'
                : 'text-text-dark hover:bg-neutral-light'}
            `}
          >
            <div className="flex-1 min-w-0">
              <p className="truncate">{opt.label}</p>
              {opt.description && (
                <p className="text-xs text-neutral-gray font-body truncate mt-0.5">
                  {opt.description}
                </p>
              )}
            </div>
            {selected && (
              <CheckIcon size={14} weight="bold" className="text-primary shrink-0" />
            )}
          </button>
        );
      })}
    </>
  );
}
