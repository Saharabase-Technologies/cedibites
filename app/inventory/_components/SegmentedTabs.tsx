'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

// ─── Link-based variant (for url-driven tabs like /catalog/items, etc.) ───────

export type SegmentedTabItem = {
  href: string;
  label: string;
  icon?: ReactNode;
  /** When true, only matches when pathname === href exactly. Default: prefix match. */
  exact?: boolean;
};

export function SegmentedTabsLink({ items }: { items: SegmentedTabItem[] }) {
  const pathname = usePathname();

  return (
    <div className="inline-flex flex-wrap gap-1 bg-neutral-card border border-[#f0e8d8] rounded-xl p-1">
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg
              text-sm font-medium font-body transition-all cursor-pointer whitespace-nowrap
              ${active
                ? 'bg-neutral-light text-text-dark shadow-sm'
                : 'text-neutral-gray hover:text-text-dark'}
            `}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

// ─── State-based variant (for in-page filters, view toggles, etc.) ────────────

export type SegmentedTabsProps<T extends string> = {
  options: { value: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
}: SegmentedTabsProps<T>) {
  return (
    <div className="inline-flex flex-wrap gap-1 bg-neutral-card border border-[#f0e8d8] rounded-xl p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg
              text-sm font-medium font-body transition-all cursor-pointer whitespace-nowrap
              ${active
                ? 'bg-neutral-light text-text-dark shadow-sm'
                : 'text-neutral-gray hover:text-text-dark'}
            `}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
