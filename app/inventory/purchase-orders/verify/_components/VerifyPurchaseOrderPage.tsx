'use client';

import Link from 'next/link';
import {
  ArrowLeftIcon,
  SealCheckIcon,
  XCircleIcon,
  TruckIcon,
  MapPinIcon,
  UserIcon,
  ClipboardIcon,
} from '@phosphor-icons/react';
import { POStatusBadge } from '@/app/inventory/_components';
import { usePurchaseOrderVerification } from '@/lib/api/hooks/inventory/usePurchaseOrders';
import { formatGHS } from '@/lib/utils/currency';

function fmt(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function VerifyPurchaseOrderPage({ code }: { code: string }) {
  const { data: po, isLoading, isError } = usePurchaseOrderVerification(code);

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-3xl mx-auto w-full">
      <Link
        href="/inventory/purchase-orders"
        className="inline-flex items-center gap-1.5 text-neutral-gray hover:text-text-dark transition-colors text-sm font-body mb-4"
      >
        <ArrowLeftIcon size={14} weight="bold" />
        All purchase orders
      </Link>

      <header className="mb-5">
        <h1 className="text-2xl font-bold font-brand text-text-dark">Verify purchase order</h1>
        <p className="text-neutral-gray text-sm font-body mt-1">
          Authenticity check for code <span className="font-mono font-semibold text-text-dark">{code}</span>
        </p>
      </header>

      {isLoading ? (
        <div className="h-40 bg-neutral-light rounded-2xl animate-pulse" />
      ) : isError || !po ? (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 flex items-start gap-3">
          <XCircleIcon size={28} weight="fill" className="text-rose-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-rose-900 font-semibold font-body">Could not verify this code</p>
            <p className="text-rose-800/80 text-sm font-body mt-1">
              No purchase order matches <span className="font-mono">{code}</span>. A genuine PO document
              carries a code that resolves here - treat this as suspect.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-start gap-3">
            <SealCheckIcon size={28} weight="fill" className="text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-emerald-900 font-semibold font-body">Authentic purchase order</p>
              <p className="text-emerald-800/80 text-sm font-body mt-1">
                This code matches a genuine PO issued by CediBites.
              </p>
            </div>
          </div>

          <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <h2 className="text-lg font-bold font-mono text-text-dark">{po.reference}</h2>
              <POStatusBadge status={po.status} />
            </div>

            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm font-body">
              <Row icon={<TruckIcon size={15} />} label="Supplier" value={po.supplier.name} />
              <Row icon={<MapPinIcon size={15} />} label="Destination" value={po.destination_location.name} />
              <Row icon={<ClipboardIcon size={15} />} label="Estimated total" value={formatGHS(po.estimated_total)} />
              <Row icon={<ClipboardIcon size={15} />} label="Received to date" value={formatGHS(po.actual_total)} />
              <Row icon={<UserIcon size={15} />} label="Created by" value={`${po.created_by?.name ?? '-'} · ${fmt(po.created_at)}`} />
              <Row
                icon={<UserIcon size={15} />}
                label="Approved by"
                value={po.approved_by ? `${po.approved_by.name} · ${fmt(po.approved_at)}` : 'Not required / pending'}
              />
            </dl>

            <div className="mt-4 pt-4 border-t border-[#f0e8d8]">
              <Link
                href={`/inventory/purchase-orders/${po.id}`}
                className="text-primary hover:underline text-sm font-semibold font-body"
              >
                Open full purchase order →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-gray">
        <span className="text-neutral-gray/70">{icon}</span>
        {label}
      </dt>
      <dd className="text-text-dark font-medium">{value}</dd>
    </div>
  );
}
