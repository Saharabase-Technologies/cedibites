'use client';

import Link from 'next/link';
import { BellIcon } from '@phosphor-icons/react';
import { useEmployeeOrders } from '@/lib/api/hooks/useEmployeeOrders';

// ─── Component ────────────────────────────────────────────────────────────────

export function CancelRequestsBell({ className }: { className?: string }) {
  const { orders: rawOrders } = useEmployeeOrders({
    status: 'cancel_requested',
    per_page: 50,
  });

  const count = rawOrders?.length ?? 0;

  return (
    <Link
      href="/admin/orders/cancel-requests"
      className={`relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-neutral-light transition-colors cursor-pointer ${className ?? ''}`}
      aria-label={`Cancel requests: ${count} pending`}
    >
      <BellIcon size={20} weight={count > 0 ? 'fill' : 'regular'} className={count > 0 ? 'text-orange-500' : 'text-neutral-gray'} />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-4.5 h-4.5 px-1 rounded-full bg-error text-white text-[10px] font-bold font-body leading-none animate-pulse">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  );
}
