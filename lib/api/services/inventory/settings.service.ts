/**
 * lib/api/services/inventory/settings.service.ts
 *
 * IMS settings — currently the wastage threshold, and only that.
 *
 * Everyone reads it (the record form has to warn you before you cross it); only
 * an admin holding `inventory.settings.manage` can move it. That permission is
 * deliberately NOT `manage_settings`, which branch managers hold — the threshold
 * decides when a branch manager's own losses stop being self-approvable, so
 * letting them raise it would hand them the key to their own approval gate.
 *
 * Backed by the `system_settings` key/value store, the same one behind the
 * service charge. There is no `inventory_settings` table and the threshold is
 * not per-location; `location_id` comes back null and says so.
 *
 * This file used to call `/v1/inventory/settings` — an endpoint that did not
 * exist, at a path that was double-prefixed anyway (the client's base URL
 * already carries `/v1`). Every save failed silently and the figure on screen
 * was fiction.
 */

import apiClient from '../../client';
import type { InventorySettings, UpdateInventorySettingsPayload } from '@/types/inventory';

/** Unwrap the API envelope ({ data: ... }), tolerating a raw body. */
function extractData<T>(response: unknown): T {
  const r = response as { data?: T };
  return (r?.data ?? response) as T;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getInventorySettings(): Promise<InventorySettings> {
  const response = await apiClient.get('/inventory/settings');
  return extractData<InventorySettings>(response);
}

export async function updateInventorySettings(
  payload: UpdateInventorySettingsPayload,
): Promise<InventorySettings> {
  const response = await apiClient.put('/inventory/settings', payload);
  return extractData<InventorySettings>(response);
}

// The IMS staff-role functions that used to live here (getImsStaff /
// assignImsRole / removeImsRole) are gone. They called `/inventory/staff`, an
// endpoint that has never existed, so the settings page's staff table always
// rendered empty — which reads as "nobody has access" rather than "this was
// never built". IMS access is granted through the ordinary staff-role system in
// the admin portal, which is where warehouse_manager and purchasing_clerk are
// actually assigned.
