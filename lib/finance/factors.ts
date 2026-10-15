import { lost, perDay, type Sums } from './figures';
import { amt, int, one, pct } from './format';

/**
 * The figures Branch against branch sets side by side, on screen and in the
 * PDF. Where one way is better, `best` says which, and that figure is bold in
 * deep gold (D13).
 */

export interface Factor {
  name: string;
  get: (a: Sums) => number | null;
  format: (v: number) => string;
  /** Which way is better, for a figure where one is. */
  best?: 'max' | 'min';
}

const shareOf = (part: number, a: Sums): number | null => (a.net ? part / a.net : null);

export const FACTORS: Factor[] = [
  { name: 'Net sales', get: a => a.net, format: amt, best: 'max' },
  { name: 'Paid orders', get: a => a.orders, format: int, best: 'max' },
  { name: 'Average order', get: a => (a.orders ? a.net / a.orders : null), format: amt, best: 'max' },
  { name: 'Sales a day', get: perDay, format: amt, best: 'max' },
  { name: 'Orders a day', get: a => (a.days ? a.orders / a.days : null), format: one, best: 'max' },
  { name: 'Cash share of sales', get: a => shareOf(a.cash, a), format: pct },
  { name: 'MoMo share of sales', get: a => shareOf(a.momo, a), format: pct },
  { name: 'Card share of sales', get: a => shareOf(a.card, a), format: pct },
  { name: 'Sold at the till', get: a => shareOf(a.bySource.pos || 0, a), format: pct },
  { name: 'Sold online or on WhatsApp', get: a => shareOf((a.bySource.online || 0) + (a.bySource.whatsapp || 0), a), format: pct },
  { name: 'Dine in share', get: a => shareOf(a.byType.dine_in || 0, a), format: pct },
  { name: 'Takeaway share', get: a => shareOf(a.byType.takeaway || 0, a), format: pct },
  { name: 'Pickup share', get: a => shareOf(a.byType.pickup || 0, a), format: pct },
  { name: 'Delivery share', get: a => shareOf(a.byType.delivery || 0, a), format: pct },
  { name: 'Cancelled after payment, share of orders', get: a => (a.orders + lost(a) ? lost(a) / (a.orders + lost(a)) : null), format: pct, best: 'min' },
  { name: 'Refunded', get: a => a.refundedAmount, format: amt },
  { name: 'Money kept on cancelled orders', get: a => a.keptAmount, format: amt },
  { name: 'Delivery fees to riders', get: a => a.deliveryFee, format: amt },
  { name: 'Days open', get: a => a.days, format: int },
];
