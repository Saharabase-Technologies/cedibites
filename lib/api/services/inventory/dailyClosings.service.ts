/**
 * lib/api/services/inventory/dailyClosings.service.ts
 *
 * Daily closing (end-of-day count) service. Live against the Laravel IMS backend
 * (`/inventory/daily-closings`).
 *
 * Opening a closing snapshots the expected quantity per item at the location; the
 * operator enters counted quantities and completes it, locking in the variance.
 * Dates with no closing are "missed" — see getClosingCalendar().
 */

import apiClient from '../../client';
import type {
  InventoryDailyClosing,
  InventoryDailyClosingFilters,
  OpenDailyClosingPayload,
  SaveDailyClosingPayload,
  DailyClosingCalendarDay,
  ClosingCalendar,
} from '@/types/inventory';

/** Unwrap the API envelope ({ data: ... }), tolerating a raw body. */
function extractData<T>(response: unknown): T {
  const r = response as { data?: T };
  return (r?.data ?? response) as T;
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function getDailyClosings(
  filters?: InventoryDailyClosingFilters,
): Promise<InventoryDailyClosing[]> {
  const response = await apiClient.get('/inventory/daily-closings', { params: filters });
  return extractData<InventoryDailyClosing[]>(response);
}

export async function getDailyClosing(id: number): Promise<InventoryDailyClosing> {
  const response = await apiClient.get(`/inventory/daily-closings/${id}`);
  return extractData<InventoryDailyClosing>(response);
}

/** Coverage calendar for a location — every date in range with its closing status (null = missed). */
/**
 * The coverage strip, plus which day the business is currently on.
 *
 * `business_date` comes from the server on purpose. Before 03:00 the business
 * day is still yesterday's, and `new Date()` in the browser reports the DEVICE's
 * clock and timezone - a laptop left on the wrong zone, or simply used at 02:50,
 * would disagree with the server about which day is being counted.
 */
export async function getClosingCalendar(
  locationId: number,
  from: string,
  to: string,
): Promise<ClosingCalendar> {
  const response = await apiClient.get('/inventory/daily-closings/calendar', {
    params: { location_id: locationId, from, to },
  });
  return extractData<ClosingCalendar>(response);
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Open (or return the existing) closing for a location + date, snapshotting expected qtys. */
export async function openDailyClosing(
  payload: OpenDailyClosingPayload,
): Promise<InventoryDailyClosing> {
  const response = await apiClient.post('/inventory/daily-closings', payload);
  return extractData<InventoryDailyClosing>(response);
}

/** Record counted quantities and optionally complete the closing. */
export async function saveDailyClosing(
  id: number,
  payload: SaveDailyClosingPayload,
): Promise<InventoryDailyClosing> {
  const response = await apiClient.patch(`/inventory/daily-closings/${id}`, payload);
  return extractData<InventoryDailyClosing>(response);
}
