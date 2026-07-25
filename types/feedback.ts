/** Types for the feedback triage dashboard — mirror the backend resources. */

export type FeedbackSeverity = 'blocking' | 'annoying' | 'cosmetic' | 'suggestion';
export type FeedbackStatus = 'new' | 'triaged' | 'in_progress' | 'fixed' | 'wont_fix';

interface Named {
  id: number;
  name: string;
}

export interface FeedbackReportListItem {
  id: number;
  number: number | null;
  severity: FeedbackSeverity;
  status: FeedbackStatus;
  route: string | null;
  role_at_report: string | null;
  description: string | null;
  has_audio: boolean;
  screenshot_count: number;
  reporter: Named | null;
  branch: Named | null;
  assignee: Named | null;
  created_at: string;
  updated_at: string;
}

export interface FeedbackPin {
  selector: string;
  label: string;
  x: number;
  y: number;
}

export interface FeedbackRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FeedbackScreenshot {
  url: string;
  source: string;
  route?: string | null;
  pins: FeedbackPin[];
  rects: FeedbackRect[];
}

export interface FeedbackBreadcrumb {
  kind: 'nav' | 'click';
  label: string;
  at: number;
}

export interface FeedbackConsoleEntry {
  level: string;
  message: string;
  at: number;
}

export interface FeedbackNetworkEntry {
  method: string;
  url: string;
  status: number | null;
  durationMs: number | null;
  requestId: string | null;
  at: number;
}

/** A note the reporter made about one specific page. */
export interface FeedbackReportNote {
  id: number;
  route: string | null;
  page_title: string | null;
  body: string | null;
  audio_url: string | null;
  transcript: string | null;
  position: number;
}

export interface FeedbackReportDetail extends FeedbackReportListItem {
  transcript: string | null;
  audio_url: string | null;
  replay_url: string | null;
  replay_id: string | null;
  screenshots: FeedbackScreenshot[];
  notes: FeedbackReportNote[];
  breadcrumbs: FeedbackBreadcrumb[];
  console_entries: FeedbackConsoleEntry[];
  network_entries: FeedbackNetworkEntry[];
  request_ids: string[];
  client_meta: Record<string, unknown> | null;
  related_count?: number;
  reporter: (Named & { email?: string }) | null;
}

export interface RequestLogLine {
  id: number;
  request_id: string;
  method: string;
  path: string;
  status_code: number | null;
  duration_ms: number | null;
  level: string;
  message: string | null;
  user_id: number | null;
  created_at: string;
}

export interface FeedbackFilters {
  status?: string;
  severity?: string;
  branch_id?: number;
  per_page?: number;
  page?: number;
}
