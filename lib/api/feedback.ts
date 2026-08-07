/**
 * Feedback submit client. Assembles the multipart report (payload envelope +
 * screenshot files) and posts it through the shared axios instance, retrying
 * ONLY transient failures — never a 4xx (C9: a rejected payload won't improve by
 * resending, but the API being down is exactly what's being reported).
 */
import apiClient, { ApiError } from './client';
import type { Pin, Rect, Severity } from '@/lib/feedback/types';

export interface ReportPayload {
  description: string;
  severity: Severity;
  route: string | null;
  role_at_report: string | null;
  branch_id: number | null;
  replay_id: string | null;
  breadcrumbs: unknown[];
  console_entries: unknown[];
  network_entries: unknown[];
  request_ids: string[];
  client_meta: Record<string, unknown>;
  /** Aligns by index with the uploaded `screenshots[]` files. */
  screenshot_meta: Array<{ source: string; pins: Pin[]; rects: Rect[]; route?: string }>;
  /**
   * Per-page notes. `audio_index` points into the uploaded `note_audio[]` files
   * — an index rather than positional alignment, because notes and clips are not
   * one-to-one (a note may be text-only).
   */
  notes: Array<{
    route: string | null;
    page_title: string | null;
    body: string | null;
    audio_index: number | null;
  }>;
}

/** Browser/OS/connection facts — the real story behind "it's slow / it hangs". */
export function buildClientMeta(): Record<string, unknown> {
  if (typeof window === 'undefined') return {};
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean };
  };
  const conn = nav.connection;

  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    screen: `${window.screen.width}x${window.screen.height}`,
    devicePixelRatio: window.devicePixelRatio,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    online: navigator.onLine,
    buildSha: process.env.NEXT_PUBLIC_BUILD_SHA || 'dev',
    connection: conn
      ? {
          effectiveType: conn.effectiveType ?? null,
          downlink: conn.downlink ?? null,
          rtt: conn.rtt ?? null,
          saveData: conn.saveData ?? null,
        }
      : null,
  };
}

/** Build the multipart body: the whole payload as one JSON field, plus files. */
export function buildReportFormData(
  payload: ReportPayload,
  screenshots: File[],
  audio?: File | null,
  noteAudio: File[] = [],
): FormData {
  const fd = new FormData();
  fd.append('payload', JSON.stringify(payload));
  screenshots.forEach((file) => fd.append('screenshots[]', file));
  if (audio) fd.append('audio', audio);
  // Order matters: payload.notes[].audio_index indexes into this list.
  noteAudio.forEach((file) => fd.append('note_audio[]', file));
  return fd;
}

/** POST the report, retrying network/5xx only (never 4xx), with backoff. */
export async function submitFeedbackReport(formData: FormData): Promise<unknown> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await apiClient.post('/feedback/reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (e) {
      const status = e instanceof ApiError ? e.status : -1;
      const transient = status === 0 || status >= 500;
      if (!transient || attempt === maxAttempts) throw e;
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
}
