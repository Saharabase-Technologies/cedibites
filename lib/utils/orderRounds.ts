import type { Order, OrderStatus } from '@/types/order';

/*
 * Items added to an order after it was placed (Phase 4b, D29) live inside the
 * same order, but the kitchen cooks each round on its own. So the boards show
 * an order as tickets: its first items under the order's own status, and each
 * round as a ticket of its own, with its own items, status and clock.
 *
 * An order with no rounds is one ticket, the order itself, unchanged.
 */

/** A round's ticket id. The order's own ticket keeps the order's id. */
export function roundTicketId(orderId: string, round: number): string {
  return `${orderId}:r${round}`;
}

/** Which order, and which round if any, a ticket id stands for. */
export function parseTicketId(ticketId: string): { orderId: string; round?: number } {
  const match = /^(.+):r(\d+)$/.exec(ticketId);
  return match ? { orderId: match[1], round: Number(match[2]) } : { orderId: ticketId };
}

/** The order is on a board when it, or one of its rounds, has a status the board shows. */
export function isOnBoard(order: Order, shown: (status: OrderStatus) => boolean): boolean {
  return shown(order.status) || (order.rounds ?? []).some((round) => shown(round.status));
}

/**
 * The order as the kitchen's tickets. The caller filters them by status, as it
 * does orders today: a first ticket whose order is done drops off by itself.
 */
export function orderTickets(order: Order): Order[] {
  const rounds = order.rounds ?? [];
  if (rounds.length === 0) return [order];

  const first: Order = { ...order, items: order.items.filter((item) => (item.round ?? 1) === 1) };

  const added = rounds.map((round): Order => ({
    ...order,
    id: roundTicketId(order.id, round.number),
    roundNumber: round.number,
    status: round.status,
    items: order.items.filter((item) => item.round === round.number),
    placedAt: round.addedAt,
    stageChangedAt: round.stageChangedAt,
    subtotal: round.total,
    total: round.total,
    // The round is the sale of whoever added it (D9 extended).
    staffName: round.addedBy ?? order.staffName,
  }));

  return [first, ...added];
}

/** The label a round's ticket carries: "Added 1:15 PM". */
export function roundLabel(order: Pick<Order, 'roundNumber' | 'placedAt'>): string | null {
  if (!order.roundNumber) return null;
  const time = new Date(order.placedAt).toLocaleTimeString('en-GH', {
    timeZone: 'Africa/Accra',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `Added ${time}`;
}
