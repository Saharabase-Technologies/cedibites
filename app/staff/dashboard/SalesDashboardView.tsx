'use client';

import Link from 'next/link';
import {
  PlusCircleIcon,
  ListIcon,
} from '@phosphor-icons/react';
import { STATUS_CONFIG } from '@/app/staff/orders/constants';

// ─── Mock stats — replace with real API data ──────────────────────────────────

const STATS = [
  { label: 'Received', value: '3', sub: 'awaiting preparation' },
  { label: 'Delivering', value: '2', sub: 'out for delivery now' },
  { label: 'Orders Today', value: '12', sub: 'across all branches' },
];

// ─── Mock recent orders — replace with real API data ──────────────────────────

const RECENT_ORDERS = [
  {
    id: 'CB100001', name: 'Ama Serwaa', branch: 'East Legon',
    source: 'WhatsApp', status: 'received', time: '2 mins ago'
  },
  { id: 'CB100002', name: 'Kweku Asante', branch: 'Osu', source: 'Phone', status: 'preparing', time: '9 mins ago' },
  { id: 'CB100003', name: 'Abena Boateng', branch: 'Tema', source: 'Instagram', status: 'ready', time: '15 mins ago' },
  { id: 'CB100004', name: 'Kojo Mensah', branch: 'Madina', source: 'Facebook', status: 'out_for_delivery', time: '22 mins ago' },
  { id: 'CB100005', name: 'Adwoa Frimpong', branch: 'La Paz', source: 'POS', status: 'ready_for_pickup', time: '30 mins ago' },
  { id: 'CB100006', name: 'Yaw Darko', branch: 'Dzorwulu', source: 'WhatsApp', status: 'cancelled', time: '45 mins ago' },
];

// ─── Source badge ─────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: string }) {
  return (
    <span className="text-[10px] font-medium font-body text-text-dark dark:text-text-light border border-brown-light/20 dark:border-neutral-gray px-2 py-0.5 rounded-full">
      {source}
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.received;
  return (
    <span className="inline-flex items-center font-bold gap-1.5 py-2 text-xs text-text-dark dark:text-text-light font-body px-2.5">
      <span className={`h-2 w-2 rounded-full shrink-0 ${config.dot} ${config.pulse ? 'animate-pulse' : ''}`} />
      {config.label}
    </span>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function SalesDashboardView() {

  // Replace with real auth context
  const staffName = 'Kofi';

  return (
    <div className="md:px-8 py-6 max-w-4xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-text-dark font-bold dark:text-text-light text-xl font-body">
          Good afternoon, {staffName}.
        </h1>
        <p className="text-neutral-gray text-sm font-body mt-0.5">
          Here&apos;s what&apos;s happening across the branches today.
        </p>
      </div>

      {/* ── Primary CTA ────────────────────────────────────────────────── */}
      <Link
        href="/staff/sales/new-order"
        className="
          flex items-center justify-between
          bg-primary hover:bg-primary-hover
          text-brand-darker
          px-6 py-4 rounded-2xl mb-6
          transition-all duration-150 active:scale-[0.99]
          group
        "
      >
        <div className="flex items-center gap-3">
          <PlusCircleIcon size={24} weight="fill" className="shrink-0" />
          <div>
            <p className="font-semibold font-body text-base leading-none">Create New Order</p>
            <p className="text-brand-darker/60 text-xs font-body mt-0.5">
              Phone, WhatsApp, Instagram, Facebook, POS & Online
            </p>
          </div>
        </div>
        <span className="text-brand-darker/60 group-hover:translate-x-0.5 transition-transform text-sm font-body font-medium">
          Start →
        </span>
      </Link>

      {/* ── Stats row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {STATS.map(stat => (
          <div
            key={stat.label}
            className="bg-brown dark:bg-brown border-brown-light/15 rounded-2xl px-4 py-4"
          >
            <p className="text-text-light text-2xl font-semibold font-body leading-none">
              {stat.value}
            </p>
            <p className="text-neutral-gray text-sm font-body mt-1 leading-snug">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Recent orders ───────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-text-dark font-bold dark:text-text-light text-base font-body">Active Orders</h2>
          <Link
            href="/staff/sales/orders"
            className="text-text-brown dark:text-primary text-xs font-body hover:text-brown-light dark:hover:text-primary-hover transition-colors flex items-center gap-1"
          >
            <ListIcon size={14} weight="bold" />
            View all
          </Link>
        </div>

        <div className="flex flex-col gap-4">
          {RECENT_ORDERS.filter(o => o.status !== 'completed').map(order => (
            <Link
              key={order.id}
              href={`/staff/sales/orders?select=${order.id}`}
              className="
                bg-neutral-card dark:bg-brand-dark
                border-brown-light/30 border rounded-2xl
                px-4 py-3.5
                flex items-center hover:bg-brown-light/5 justify-between gap-4
                hover:border-brown-light/75 transition-colors
                group
              "
            >
              {/* Left */}
              <div className="min-w-0 flex-1">
                <div className="flex text-text-dark dark:text-text-light items-center gap-2 mb-1">
                  <span className="text-text-dark dark:text-text-light text-base font-bold font-body">
                    {order.name}
                  </span> ·
                  <SourceBadge source={order.source} />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="dark:text-text-light/75 text-xs font-body">#{order.id}</span>
                  <span className="text-brown-light/40 text-xs">·</span>
                  <span className="dark:text-text-light/75 text-xs font-body">{order.branch}</span>
                  <span className="text-brown-light/40 text-xs">·</span>
                  <span className="dark:text-text-light/75 text-xs font-body">{order.time}</span>
                </div>
              </div>

              {/* Right */}
              <div className="flex items-center gap-3 shrink-0">
                <StatusBadge status={order.status} />
                <span className="text-neutral-gray/80 group-hover:text-neutral-gray transition-colors text-base">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
