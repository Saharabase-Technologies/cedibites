/**
 * lib/api/services/inventory/settings.service.ts
 *
 * IMS settings and staff-role assignment service.
 */

import apiClient from '../../client';
import { MOCK_IMS_SETTINGS, MOCK_IMS_STAFF } from '../../mocks/inventory.mock';
import type {
  InventorySettings,
  ImsStaffAssignment,
  UpdateInventorySettingsPayload,
  AssignImsRolePayload,
} from '@/types/inventory';

const IS_MOCK = process.env.NEXT_PUBLIC_IMS_MOCK === 'true';

function delay<T>(data: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

// Mutable in-memory state for mock mode
let _mockSettings: InventorySettings = { ...MOCK_IMS_SETTINGS };
let _mockStaff: ImsStaffAssignment[] = [...MOCK_IMS_STAFF];
let _nextStaffId = _mockStaff.length + 1;

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getInventorySettings(): Promise<InventorySettings> {
  if (IS_MOCK) return delay({ ..._mockSettings });

  const { data } = await apiClient.get<InventorySettings>('/v1/inventory/settings');
  return data;
}

export async function updateInventorySettings(
  payload: UpdateInventorySettingsPayload,
): Promise<InventorySettings> {
  if (IS_MOCK) {
    _mockSettings = { ..._mockSettings, ...payload, updated_at: new Date().toISOString() };
    return delay({ ..._mockSettings });
  }

  const { data } = await apiClient.put<InventorySettings>('/v1/inventory/settings', payload);
  return data;
}

// ─── IMS Staff ────────────────────────────────────────────────────────────────

export async function getImsStaff(): Promise<ImsStaffAssignment[]> {
  if (IS_MOCK) return delay([..._mockStaff]);

  const { data } = await apiClient.get<ImsStaffAssignment[]>('/v1/inventory/staff');
  return data;
}

export async function assignImsRole(payload: AssignImsRolePayload): Promise<ImsStaffAssignment> {
  if (IS_MOCK) {
    const newAssignment: ImsStaffAssignment = {
      id: _nextStaffId++,
      user_id: payload.user_id,
      name: `User ${payload.user_id}`,
      email: '',
      phone: null,
      ims_role: payload.role,
      assigned_at: new Date().toISOString(),
    };
    _mockStaff = [..._mockStaff, newAssignment];
    return delay({ ...newAssignment });
  }

  const { data } = await apiClient.post<ImsStaffAssignment>('/v1/inventory/staff', payload);
  return data;
}

export async function removeImsRole(id: number): Promise<void> {
  if (IS_MOCK) {
    _mockStaff = _mockStaff.filter((s) => s.id !== id);
    return delay(undefined as unknown as void);
  }

  await apiClient.delete(`/v1/inventory/staff/${id}`);
}
