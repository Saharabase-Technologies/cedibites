'use client';

import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { CustomSelect } from './CustomSelect';

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search…',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative flex-1 min-w-45">
      <MagnifyingGlassIcon
        size={16}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-gray pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full pl-10 pr-4 py-2.5 rounded-xl min-h-11
          border border-[#f0e8d8] bg-neutral-card
          text-sm font-body text-text-dark placeholder:text-neutral-gray/60
          focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-shadow
        "
      />
    </div>
  );
}

export function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-3 mb-5 flex flex-wrap items-center gap-3">
      {children}
    </div>
  );
}

/**
 * Wrapper around CustomSelect that includes the placeholder as the empty/all option.
 */
export function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <CustomSelect
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      options={[{ value: '', label: placeholder }, ...options]}
    />
  );
}
