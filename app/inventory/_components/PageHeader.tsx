'use client';

import { PlusIcon } from '@phosphor-icons/react';

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void; icon?: React.ReactNode };
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h1 className="text-2xl font-bold font-brand text-text-dark">{title}</h1>
        {subtitle && (
          <p className="text-neutral-gray text-sm font-body mt-1">{subtitle}</p>
        )}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-semibold font-body hover:bg-primary/90 transition-colors min-h-11 cursor-pointer shadow-sm shrink-0"
        >
          {action.icon ?? <PlusIcon size={16} weight="bold" />}
          {action.label}
        </button>
      )}
    </div>
  );
}
