'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  BellRingingIcon,
  BellSlashIcon,
  CloudSlashIcon,
  SignOutIcon,
  SpeakerHighIcon,
  SpeakerSlashIcon,
  StorefrontIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';

import { useStaffAuth } from '@/app/components/providers/StaffAuthProvider';
import { useBranch } from '@/app/components/providers/BranchProvider';
import { useOperableBranches } from '@/lib/hooks/useOperableBranches';
import BranchSelectPage from '@/app/components/ui/BranchSelectPage';
import BranchSwitcherDialog from '@/app/components/ui/BranchSwitcherDialog';
import { SignOutDialog } from '@/app/components/ui/SignOutDialog';
import { useOrderBoard } from '@/lib/hooks/useOrderBoard';
import { useOrderAlerts } from '@/lib/hooks/useOrderAlerts';
import { toast } from '@/lib/utils/toast';
import { printReceipt } from '@/lib/utils/printReceipt';
import { useMarkReceiptPrinted } from '@/lib/api/hooks/useOrders';
import apiClient from '@/lib/api/client';
import type { Order } from '@/types/order';

import { OrderTicket } from './_components/OrderTicket';
import { CancelRequestRow } from './_components/CancelRequestRow';
import { StageColumn } from './_components/StageColumn';
import { OrderDetailSheet } from './_components/OrderDetailSheet';
import { useFlipLayout, FLIP_DURATION_MS } from './_components/useFlipLayout';
import {
  STAGE,
  STAGE_ORDER,
  STAGE_SLA_S,
  formatElapsed,
  type BoardStage,
} from './_components/board.constants';

const BRANCH_KEY = 'cedibites-om-branchId';
const SOUND_KEY = 'cedibites-om-sound';

/**
 * How long every action button on the board stays inert after any action.
 *
 * This is the direct fix for the mis-tap. Staff tapped Accept, saw nothing
 * happen (the board wrote to a store it did not render from), and tapped again
 * — by which time the poll had landed, the ticket had moved to another column,
 * and the second tap hit whichever order had closed the gap. Optimistic
 * rendering removes the reason to tap twice; this window catches the reflex tap
 * that comes anyway, and it is deliberately just longer than the move
 * animation, so nothing is ever tappable while it is still travelling.
 */
const ACTION_LOCK_MS = FLIP_DURATION_MS + 90;

export default function OrderManagerPage() {
  const { staffUser, isLoading: isAuthLoading, logout } = useStaffAuth();

  // ── Branch gate ───────────────────────────────────────────────────────────
  // Sourced from useOperableBranches, not `staffUser.branches` — a company-wide
  // role is assigned no branches by design, so reading the assignment directly
  // gave admins, the call centre and the warehouse an empty picker.
  const { branches: operableBranches, isLoading: isBranchListLoading } = useOperableBranches();
  const assignedIds = useMemo(() => operableBranches.map((b) => b.id), [operableBranches]);

  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem(BRANCH_KEY) : null,
  );
  const [isBranchSwitcherOpen, setIsBranchSwitcherOpen] = useState(false);
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);

  const autoSelectedBranchId = assignedIds.length === 1 ? assignedIds[0] : null;
  const effectiveBranchId = selectedBranchId ?? autoSelectedBranchId;

  const { branches } = useBranch();
  const branchInfo = useMemo(
    () => (effectiveBranchId ? branches.find((b) => b.id === effectiveBranchId) ?? null : null),
    [effectiveBranchId, branches],
  );
  const isAdmin = staffUser?.role === 'admin' || staffUser?.role === 'tech_admin';

  // ── Board ─────────────────────────────────────────────────────────────────

  const { orders, isLoading, connection, pendingIds, stageSinceFor, moveOrder, removeOrder, refresh } =
    useOrderBoard(effectiveBranchId);

  // The old board held the whole selected order in state and re-synced it from
  // the list on every poll — an extra render a second, and a panel that could
  // show a stale copy of the ticket beside a fresh one on the board. Holding
  // only the id and looking it up keeps the panel exactly as fresh as the board
  // for free, and an id whose order has left simply resolves to null, so there
  // is nothing to clean up when a ticket is completed out from under the panel.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedOrder = useMemo(
    () => (selectedId ? orders.find((o) => o.id === selectedId) ?? null : null),
    [selectedId, orders],
  );

  const columns = useMemo(() => {
    const grouped: Record<BoardStage, Order[]> = {
      cancel_requested: [],
      received: [],
      accepted: [],
      preparing: [],
      ready: [],
    };
    // `orders` arrives oldest-first from the hook, so each column is already in
    // the order the tickets were placed. Nothing here re-sorts.
    for (const order of orders) {
      const stage = order.status as BoardStage;
      if (grouped[stage]) grouped[stage].push(order);
    }
    return grouped;
  }, [orders]);


  // ── Alerts ────────────────────────────────────────────────────────────────

  /**
   * Only a manager or an admin may silence this screen.
   *
   * The alerts exist because orders were being missed, so the ability to turn
   * them off is a supervisory decision, not a personal preference — otherwise
   * the first person irritated by the alarm quietly removes the safeguard for
   * everybody on shift, and nobody knows it happened.
   */
  const canSilence =
    staffUser?.role === 'admin' ||
    staffUser?.role === 'tech_admin' ||
    staffUser?.role === 'manager';

  // Read once, at mount, the same way the branch choice is. Sound defaults on:
  // a kitchen screen that comes up silent after a reload is the failure mode
  // this whole layer exists to prevent.
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(SOUND_KEY) !== '0';
  });
  const toggleSound = useCallback(() => {
    if (!canSilence) return;
    setSoundEnabled((v) => {
      localStorage.setItem(SOUND_KEY, v ? '0' : '1');
      return !v;
    });
  }, [canSilence]);

  // A mute left in localStorage by a manager must not follow the screen into a
  // shift worked by someone who cannot undo it.
  const effectiveSoundEnabled = canSilence ? soundEnabled : true;

  /**
   * Every live order, with the clock its stage is judged against.
   *
   * `stageSinceFor` resolves that from the server's status history, so the
   * alarm is judged on time in the current stage rather than the order's total
   * age — a ticket does not arrive in Cooking already fifteen minutes late.
   */
  const alertOrders = useMemo(
    () =>
      orders.map((order) => ({
        id: order.id,
        label: order.orderNumber,
        stage: order.status,
        since: stageSinceFor(order),
        awaitingAccept: order.status === 'received',
      })),
    [orders, stageSinceFor],
  );

  const alerts = useOrderAlerts({
    orders: alertOrders,
    sla: STAGE_SLA_S,
    enabled: effectiveSoundEnabled,
    resetKey: effectiveBranchId,
  });

  // ── Actions ───────────────────────────────────────────────────────────────

  const [isLocked, setIsLocked] = useState(false);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lockBoard = useCallback(() => {
    setIsLocked(true);
    if (lockTimer.current) clearTimeout(lockTimer.current);
    lockTimer.current = setTimeout(() => setIsLocked(false), ACTION_LOCK_MS);
  }, []);

  useEffect(
    () => () => {
      if (lockTimer.current) clearTimeout(lockTimer.current);
    },
    [],
  );

  const advance = useCallback(
    async (order: Order) => {
      const next = STAGE[order.status as BoardStage]?.next;
      if (!next) return;
      lockBoard();
      const ok = await moveOrder(order.id, next);
      if (!ok) toast.error(`Could not move ${order.orderNumber}. It has been put back.`);
      else if (next === 'completed') setSelectedId((id) => (id === order.id ? null : id));
    },
    [moveOrder, lockBoard],
  );

  const approveCancel = useCallback(
    async (order: Order) => {
      lockBoard();
      // Held off the board straight away, then confirmed. If the call fails the
      // hook's sweeper puts it back within a few seconds.
      removeOrder(order.id);
      setSelectedId((id) => (id === order.id ? null : id));
      try {
        await apiClient.post(`/admin/orders/${order.id}/approve-cancel`);
        toast.success(`${order.orderNumber} cancelled`);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Could not cancel that order');
        refresh();
      }
    },
    [removeOrder, refresh, lockBoard],
  );

  const rejectCancel = useCallback(
    async (order: Order) => {
      lockBoard();
      try {
        await apiClient.post(`/admin/orders/${order.id}/reject-cancel`);
        toast.success(`${order.orderNumber} kept`);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Could not keep that order');
      } finally {
        refresh();
      }
    },
    [refresh, lockBoard],
  );

  const select = useCallback((order: Order) => setSelectedId(order.id), []);

  // ── Receipts ──────────────────────────────────────────────────────────────

  /**
   * Orders whose receipt this session has printed.
   *
   * The board is polled, so `receiptPrintCount` lags the tap by up to a poll —
   * long enough for someone to read the still-tinted button as "that did not
   * work" and print a second original. This closes the gap; the server's count
   * takes over once it catches up.
   */
  const [printedIds, setPrintedIds] = useState<Set<string>>(new Set());
  const { markPrinted } = useMarkReceiptPrinted();

  /**
   * The receipt is printed here, and this is the original.
   *
   * The POS confirmation modal used to carry a Print button and that press was
   * the original. It no longer does: a sale rung up at the till appears on this
   * board like any other order, and the slip is printed from the ticket. That
   * leaves exactly one place an original can come from, which is what lets
   * /pos/orders offer nothing but reprints — a slip it did not print is a slip
   * the customer has not been given, and the board can be trusted to say so.
   *
   * Printing happens first and the record follows. If the write fails the
   * customer still has their receipt; the worst case is that the count is short.
   */
  const printOrder = useCallback(
    (order: Order) => {
      const branch = operableBranches.find((b) => b.id === effectiveBranchId);
      printReceipt(
        order,
        { name: branch?.name ?? 'CediBites', address: branch?.address },
        // Every press after the first is a copy, and the slip has to say so —
        // an unmarked second original is what a duplicate looks like at cash-up.
        { kind: (order.receiptPrintCount ?? 0) > 0 || printedIds.has(order.id) ? 'reprint' : 'original' },
      );
      setPrintedIds((prev) => new Set(prev).add(order.id));
      void markPrinted(Number(order.id)).catch(() => {
        toast.error('Printed, but could not record it. It may still show as unprinted.');
      });
    },
    [operableBranches, effectiveBranchId, printedIds, markPrinted],
  );

  // ── Move animation ────────────────────────────────────────────────────────
  // Keyed on the whole board's shape, so a ticket changing column replays and a
  // poll that changes nothing does not.
  const layoutKey = orders.map((o) => `${o.id}:${o.status}`).join('|');
  const registerTicket = useFlipLayout(layoutKey);

  // ── Gates ─────────────────────────────────────────────────────────────────

  if (isAuthLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-neutral-light">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Hold the picker back until the list is real, or a company-wide operator sees
  // an empty one for the moment before the branches API answers.
  const needsBranchSelection =
    !isBranchListLoading && !effectiveBranchId && assignedIds.length !== 1;

  if (needsBranchSelection) {
    return (
      <BranchSelectPage
        branches={operableBranches}
        onSelect={(id) => {
          localStorage.setItem(BRANCH_KEY, id);
          setSelectedBranchId(id);
        }}
        subtitle="Choose which branch to manage orders for"
      />
    );
  }

  const isBranchShut =
    !isAdmin &&
    branchInfo &&
    (!branchInfo.isActive || (!branchInfo.isOpen && !branchInfo.staffAccessAllowed));

  if (isBranchShut) {
    const isInactive = !branchInfo.isActive;
    return (
      <div className="flex min-h-dvh items-center justify-center bg-neutral-light p-6">
        <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-2xl border border-[#f0e8d8] bg-neutral-card p-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f9ecec]">
            <WarningCircleIcon weight="fill" size={36} className="text-[#c05252]" />
          </span>
          <div>
            <h2 className="font-brand text-xl font-bold text-text-dark">
              {isInactive ? 'Branch inactive' : 'Branch closed'}
            </h2>
            <p className="mt-2 font-body text-sm text-neutral-gray">
              {isInactive
                ? `${branchInfo.name} is inactive. An administrator has to reactivate it.`
                : `${branchInfo.name} is closed. Order management is unavailable outside operating hours.`}
            </p>
          </div>
          {operableBranches.length > 1 && (
            <button
              type="button"
              onClick={() => setIsBranchSwitcherOpen(true)}
              className="flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 font-body text-sm font-semibold text-white transition-transform active:scale-[0.98]"
            >
              <StorefrontIcon weight="fill" size={16} />
              Switch branch
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsSignOutOpen(true)}
            className="flex items-center gap-2 font-body text-sm font-semibold text-neutral-gray transition-colors hover:text-[#c05252]"
          >
            <SignOutIcon weight="bold" size={16} />
            Sign out
          </button>
        </div>
        <BranchSwitcherDialog
          isOpen={isBranchSwitcherOpen}
          branches={operableBranches}
          currentBranchId={effectiveBranchId ?? undefined}
          onSelect={(id) => {
            localStorage.setItem(BRANCH_KEY, id);
            setSelectedBranchId(id);
            setIsBranchSwitcherOpen(false);
          }}
          onClose={() => setIsBranchSwitcherOpen(false)}
        />
        <SignOutDialog
          isOpen={isSignOutOpen}
          onCancel={() => setIsSignOutOpen(false)}
          onConfirm={logout}
        />
      </div>
    );
  }

  // ── Board ─────────────────────────────────────────────────────────────────

  const newCount = columns.received.length;
  const cancelCount = columns.cancel_requested.length;
  const activeCount = orders.length;
  const branchName = operableBranches.find((b) => b.id === effectiveBranchId)?.name;

  /**
   * The wrapper carries the ref the move animation measures, so it has to be
   * the element that is actually laid out — never nested inside another
   * positioned box, or the FLIP delta is measured against the wrong parent.
   */
  const renderTicket = (order: Order, className?: string) => (
    <div key={order.id} ref={registerTicket(order.id)} className={className}>
      <OrderTicket
        order={order}
        stage={order.status as BoardStage}
        stageSince={stageSinceFor(order)}
        isSelected={selectedId === order.id}
        isBusy={pendingIds.has(order.id)}
        isLocked={isLocked}
        isPrinted={(order.receiptPrintCount ?? 0) > 0 || printedIds.has(order.id)}
        onSelect={select}
        onAdvance={advance}
        onPrint={printOrder}
      />
    </div>
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-neutral-light">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center gap-3 border-b border-[#f0e8d8] bg-neutral-card px-3 py-2.5">
        <Image src="/cblogo.webp" alt="" width={28} height={28} className="shrink-0" />

        <div className="min-w-0">
          <h1 className="font-brand text-base font-bold leading-tight text-text-dark">
            Order Manager
          </h1>
          <p className="truncate font-body text-xs text-neutral-gray">
            {branchName ? `${branchName} · ` : ''}
            {activeCount} live{newCount > 0 ? ` · ${newCount} waiting` : ''}
          </p>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {/* Connection. Silence here is the dangerous state, so it is always shown. */}
          <span
            title={
              connection === 'live'
                ? 'Live — orders arrive instantly'
                : connection === 'connecting'
                  ? 'Connecting…'
                  : 'Offline — falling back to a 4-second refresh'
            }
            className={`
              hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-body text-[11px] font-semibold sm:flex
              ${connection === 'live'
                ? 'bg-[#eaf3ec] text-[#2f6b45]'
                : connection === 'connecting'
                  ? 'bg-neutral-light text-neutral-gray'
                  : 'bg-[#f9ecec] text-[#8a3333]'}
            `}
          >
            {connection === 'offline' ? (
              <CloudSlashIcon weight="fill" className="h-3.5 w-3.5" />
            ) : (
              <span
                className={`h-2 w-2 rounded-full ${connection === 'live' ? 'bg-[#4a9469]' : 'animate-pulse bg-neutral-gray'}`}
              />
            )}
            {connection === 'live' ? 'Live' : connection === 'connecting' ? 'Connecting' : 'Offline'}
          </span>

          {assignedIds.length !== 1 && (
            <button
              type="button"
              onClick={() => setIsBranchSwitcherOpen(true)}
              title="Switch branch"
              className="flex h-11 items-center gap-1.5 rounded-xl border border-[#e3ddd0] bg-neutral-light px-3 font-body text-xs font-semibold text-text-dark transition-colors touch-manipulation hover:border-neutral-gray/50"
            >
              <StorefrontIcon className="h-4 w-4" />
              <span className="hidden md:inline">{branchName ?? 'Branch'}</span>
            </button>
          )}

          {/* Switching sound on plays the chime back, so the act of turning it
              on is also the proof that this screen can be heard. That check
              needs no separate control, and it is the one staff will actually
              perform — it happens on the way to the thing they wanted anyway.

              Staff get the same button, inert and labelled, rather than no
              button at all: a control that silently vanishes reads as a broken
              screen, and the first thing somebody does about a sound they
              cannot stop is start hunting for the setting. */}
          <button
            type="button"
            onClick={() => {
              if (!canSilence) return;
              const wasOn = soundEnabled;
              toggleSound();
              if (!wasOn) alerts.test();
            }}
            aria-disabled={!canSilence}
            title={
              !canSilence
                ? 'Only a manager or an admin can turn the sound off'
                : soundEnabled
                  ? 'Sound on — tap to mute'
                  : 'Sound off — tap to turn on'
            }
            className={`
              flex h-11 w-11 items-center justify-center rounded-xl transition-colors touch-manipulation
              ${!canSilence
                ? 'cursor-not-allowed bg-neutral-light text-neutral-gray/50'
                : effectiveSoundEnabled
                  ? 'bg-[#fdf3e2] text-[#8a5a12]'
                  : 'bg-neutral-light text-neutral-gray'}
            `}
          >
            {effectiveSoundEnabled ? (
              <SpeakerHighIcon weight="fill" className="h-5 w-5" />
            ) : (
              <SpeakerSlashIcon className="h-5 w-5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsSignOutOpen(true)}
            title="Sign out"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-neutral-gray transition-colors touch-manipulation hover:bg-[#f9ecec] hover:text-[#c05252]"
          >
            <SignOutIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ── Alert bar ───────────────────────────────────────────────────── */}
      {/* Audio being silently blocked is the failure the kitchen cannot see, so
          it outranks the escalation banner and is not dismissible. */}
      {effectiveSoundEnabled && alerts.isBlocked ? (
        <button
          type="button"
          onClick={alerts.test}
          className="flex shrink-0 items-center justify-center gap-2 bg-[#8a3333] px-4 py-2.5 font-body text-sm font-bold text-white touch-manipulation"
        >
          <BellSlashIcon weight="fill" className="h-4 w-4" />
          This screen cannot make a sound — tap here to switch it on
        </button>
      ) : alerts.tier !== 'calm' && alerts.worst ? (
        <button
          type="button"
          onClick={canSilence ? alerts.snooze : undefined}
          aria-disabled={!canSilence}
          className={`
            flex shrink-0 items-center justify-center gap-2 px-4 py-2.5 font-body text-sm font-bold touch-manipulation
            ${alerts.tier === 'urgent'
              ? 'bg-[#c05252] text-white'
              : alerts.tier === 'caution'
                ? 'bg-[#f7ece5] text-[#8a4b2c]'
                : 'bg-[#fdf3e2] text-[#8a5a12]'}
            ${canSilence ? '' : 'cursor-default'}
          `}
        >
          <BellRingingIcon weight="fill" className="h-4 w-4" />
          {/* Name the order. "3 orders are late" tells the kitchen there is a
              problem; "#1042 has been cooking 16m" tells them which pan. */}
          <span>
            {alerts.worst.label}{' '}
            {alerts.worst.awaitingAccept
              ? 'has not been accepted'
              : `has been ${STAGE[alerts.worst.stage as BoardStage].label.toLowerCase()}`}{' '}
            for {formatElapsed(alerts.worst.elapsedS)}
            {alerts.lateCount > 1 ? ` · ${alerts.lateCount} orders late` : ''}
            {alerts.isSnoozed ? ' · snoozed' : canSilence ? ' · tap to snooze' : ''}
          </span>
        </button>
      ) : null}

      {/* ── Cancel requests ─────────────────────────────────────────────── */}
      {/* A band rather than a fifth column: rare, urgent, and it should not cost
          a quarter of the board's width on the nights there are none. */}
      {cancelCount > 0 && (
        <section className="max-h-[30vh] shrink-0 overflow-y-auto border-b border-[#f0e8d8] bg-[#f9ecec]/50 px-3 py-2.5">
          <h2 className="mb-2 flex items-center gap-2 font-brand text-xs font-bold uppercase tracking-wide text-[#8a3333]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#c05252]" />
            Cancel requests ({cancelCount})
          </h2>
          {/* Stacked bars, not a row of cards. A pile-up of requests is capped
              at a third of the screen and scrolls inside itself, so the board
              below it can never be pushed off the bottom. */}
          <div className="flex flex-col gap-2">
            {columns.cancel_requested.map((order) => (
              <CancelRequestRow
                key={order.id}
                order={order}
                since={stageSinceFor(order)}
                isSelected={selectedId === order.id}
                isBusy={pendingIds.has(order.id)}
                isLocked={isLocked}
                isAdmin={isAdmin}
                onSelect={select}
                onApproveCancel={approveCancel}
                onRejectCancel={rejectCancel}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Columns ─────────────────────────────────────────────────────── */}
      <main className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 flex-1 gap-2.5 overflow-x-auto p-2.5">
          {isLoading && orders.length === 0 ? (
            STAGE_ORDER.map((stage) => (
              <StageColumn key={stage} stage={stage} count={0} isEmpty emptyLabel="Loading…">
                {null}
              </StageColumn>
            ))
          ) : (
            STAGE_ORDER.map((stage) => (
              <StageColumn
                key={stage}
                stage={stage}
                count={columns[stage].length}
                isEmpty={columns[stage].length === 0}
                emptyLabel={
                  stage === 'received' ? 'Nothing waiting' : `Nothing ${STAGE[stage].label.toLowerCase()}`
                }
              >
                {/* Not `.map(renderTicket)` — map would pass the index straight
                    into the second argument. */}
                {columns[stage].map((order) => renderTicket(order))}
              </StageColumn>
            ))
          )}
        </div>

        {/* Detail rail */}
        {selectedOrder && (
          <aside className="hidden w-96 shrink-0 border-l border-[#f0e8d8] lg:block">
            <OrderDetailSheet
              order={selectedOrder}
              stage={selectedOrder.status as BoardStage}
              stageSince={stageSinceFor(selectedOrder)}
              isAdmin={isAdmin}
              isBusy={pendingIds.has(selectedOrder.id)}
              onAdvance={advance}
              onApproveCancel={approveCancel}
              onRejectCancel={rejectCancel}
              onClose={() => setSelectedId(null)}
            />
          </aside>
        )}
      </main>

      {/* Detail sheet, small screens */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-brown/40"
            onClick={() => setSelectedId(null)}
            aria-hidden
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-hidden rounded-t-2xl shadow-[0_-8px_32px_rgba(29,26,22,0.18)]">
            <OrderDetailSheet
              order={selectedOrder}
              stage={selectedOrder.status as BoardStage}
              stageSince={stageSinceFor(selectedOrder)}
              isAdmin={isAdmin}
              isBusy={pendingIds.has(selectedOrder.id)}
              onAdvance={advance}
              onApproveCancel={approveCancel}
              onRejectCancel={rejectCancel}
              onClose={() => setSelectedId(null)}
            />
          </div>
        </div>
      )}

      <BranchSwitcherDialog
        isOpen={isBranchSwitcherOpen}
        branches={operableBranches}
        currentBranchId={effectiveBranchId ?? undefined}
        onSelect={(id) => {
          localStorage.setItem(BRANCH_KEY, id);
          setSelectedBranchId(id);
          setSelectedId(null);
          setIsBranchSwitcherOpen(false);
        }}
        onClose={() => setIsBranchSwitcherOpen(false)}
      />

      <SignOutDialog
        isOpen={isSignOutOpen}
        onCancel={() => setIsSignOutOpen(false)}
        onConfirm={() => logout()}
      />
    </div>
  );
}
