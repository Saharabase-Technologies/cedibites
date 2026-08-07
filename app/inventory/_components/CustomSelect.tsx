'use client';

import { useEffect, useRef, useState } from 'react';
import { CaretDownIcon, CheckIcon } from '@phosphor-icons/react';

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
}: {
  value: string;
  onChange: (v: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  id?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
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
  }, [open]);

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

      {open && (
        <div
          className="
            absolute z-50 mt-1.5 w-full min-w-full
            bg-neutral-card border border-[#f0e8d8] rounded-xl shadow-lg
            py-1 max-h-64 overflow-y-auto
          "
          role="listbox"
        >
          {options.length === 0 ? (
            <div className="px-3.5 py-2 text-xs text-neutral-gray font-body">No options</div>
          ) : (
            options.map((opt) => {
              const selected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`
                    w-full flex items-center justify-between gap-2 px-3.5 py-2
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
            })
          )}
        </div>
      )}
    </div>
  );
}
