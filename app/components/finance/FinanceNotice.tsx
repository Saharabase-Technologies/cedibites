'use client';

import type { ReactNode } from 'react';

/**
 * A plain panel for when there are no figures to draw: the ledger is still
 * being read, it is empty, or it could not be read.
 */
export function FinanceNotice({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl px-5 py-12 text-center">
      <p className="text-base font-semibold font-body text-text-dark">{title}</p>
      {children && <p className="text-sm font-body text-neutral-gray mt-1">{children}</p>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 inline-flex items-center min-h-11 px-4 rounded-xl border border-[#e3ddd0] bg-neutral-card text-sm font-semibold font-body text-text-dark hover:border-neutral-gray/50 transition-colors cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
