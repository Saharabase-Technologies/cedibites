/**
 * lib/api/services/upload-sessions.service.ts
 *
 * The DESKTOP half of phone-as-camera: mint a QR code, watch it, cancel it.
 *
 * The phone half deliberately does NOT live here. See
 * `lib/upload-session/phone-client.ts` — it talks plain fetch/XHR with no
 * interceptors, no auth headers and no shared bundle, because it runs
 * unauthenticated on a cheap handset over mobile data.
 */

import apiClient from '../client';
import type {
  CreateUploadSessionPayload,
  UploadSession,
  UploadSessionStatus,
} from '@/types/upload-session';

/** Unwrap the API envelope ({ data: ... }), tolerating a raw body. */
function extractData<T>(response: unknown): T {
  const r = response as { data?: T };
  return (r?.data ?? response) as T;
}

/**
 * Mint a code.
 *
 * The raw token comes back inside `url` and is never retrievable again — it is
 * stored hashed. Calling this a second time for the same document invalidates
 * the previous code, which is exactly how you deal with a screen a room just saw.
 */
export async function createUploadSession(
  payload: CreateUploadSessionPayload,
): Promise<UploadSession> {
  const response = await apiClient.post('/upload-sessions', payload);
  return extractData<UploadSession>(response);
}

/** How the code is doing, so the dialog can say "2 files received" and stop counting when it dies. */
export async function getUploadSessionStatus(id: number): Promise<UploadSessionStatus> {
  const response = await apiClient.get(`/upload-sessions/${id}/status`);
  return extractData<UploadSessionStatus>(response);
}

/** Kill it now rather than in nine minutes. */
export async function revokeUploadSession(id: number): Promise<void> {
  await apiClient.delete(`/upload-sessions/${id}`);
}
