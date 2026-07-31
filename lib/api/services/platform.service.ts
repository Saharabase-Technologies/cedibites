import apiClient from '../client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SmsHealthStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

export interface SmsHealth {
  status: SmsHealthStatus;
  window_hours: number;
  sent: number;
  failed: number;
  failure_rate: number;
  consecutive_failures: number;
  last_success_at: string | null;
  last_failure_at: string | null;
  /** App\Enums\SmsFailureReason, e.g. 'no_credit'. Null when nothing is failing. */
  reason: string | null;
  reason_label: string | null;
  /** What the reader should actually do about it. */
  remedy: string | null;
  /** True when the cause will keep failing every message until someone acts. */
  systemic: boolean;
  affected: { notification: string; failures: number }[];
}

export interface SmsHealthDetail extends SmsHealth {
  recent_failures: {
    id: number;
    notification: string | null;
    recipient: string;
    reason: string | null;
    error: string | null;
    failed_at: string;
  }[];
}

export interface SystemHealth {
  status: 'healthy' | 'degraded';
  php: { version: string; memory_limit: string; max_execution_time: string; upload_max_filesize: string; extensions: string };
  laravel: { version: string; environment: string; debug_mode: string; timezone: string; locale: string; cache_driver: string; queue_driver: string; session_driver: string; broadcast_driver: string };
  database: { status: string; driver: string; latency_ms: number; database: string; size: string | null };
  cache: { status: string; driver: string };
  queue: { driver: string; pending_jobs: number; failed_jobs: number; status: string };
  sms: SmsHealth;
  disk: { total: string; used: string; free: string; percent_used: string; status: string };
  uptime: string;
}

/** One account's failed sign-ins, as reported in the daily summary. */
export interface FailedLoginAccount {
  identifier: string;
  name: string | null;
  employee_no: string | null;
  role: string | null;
  branches: string[];
  account_status: string | null;
  reason: string | null;
  attempts: number;
  ips: string[];
  last_attempt: string;
}

export interface SmartError {
  id: string;
  category: string;
  severity: 'critical' | 'error' | 'warning' | 'info';
  title: string;
  description: string;
  /** Plain-English explanation of what went wrong and what it means. */
  cause?: string;
  /** Concrete next steps for a non-technical reader. */
  fix?: string;
  /** 'known' = hand-written table, 'ai' = model, 'fallback' = neither. */
  explanation_source?: 'known' | 'ai' | 'fallback';
  timestamp: string;
  count?: number;
  phone?: string;
  action?: string;
  order_number?: string;
  job_id?: number;
  raw?: string;
  // Authentication detail
  reason?: string | null;
  name?: string | null;
  employee_no?: string | null;
  role?: string | null;
  account_status?: string | null;
  ips?: string[];
  accounts?: FailedLoginAccount[];
}

export interface ErrorFeed {
  errors: SmartError[];
  summary: {
    total: number;
    critical: number;
    errors: number;
    warnings: number;
    info: number;
    by_category: Record<string, number>;
  };
}

export interface FailedJob {
  id: number;
  uuid: string;
  job: string;
  queue: string;
  error: string;
  failed_at: string;
}

export interface PlatformAdmin {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  employee_no: string | null;
  has_passcode: boolean;
  created_at: string;
  last_login: string | null;
}

export interface ActiveSession {
  user_id: number;
  name: string;
  phone: string;
  employee_no: string | null;
  token_type: 'staff' | 'customer';
  last_active: string;
  session_started: string;
}

export interface CreateUserPayload {
  name: string;
  phone: string;
  email?: string;
  role: string;
  branch_ids: number[];
  password_mode: 'auto' | 'custom' | 'prompt';
  password?: string;
  /** Required when role is 'tech_admin' — the new admin's 6-digit passcode. */
  new_passcode?: string;
  /** The caller's vault passcode (gates the request). */
  passcode: string;
}

export interface StaffPassword {
  id: number;
  user_id: number;
  name: string;
  phone: string;
  employee_no: string;
  role: string | null;
  branches: string[];
  status: string;
  password: string | null;
  has_password: boolean;
  must_reset_password: boolean;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const platformService = {
  // System health
  getHealth: (): Promise<{ data: SystemHealth }> =>
    apiClient.get('/platform/health'),

  // SMS delivery health, with the recent failures behind the verdict
  getSmsHealth: (windowHours = 24): Promise<{ data: SmsHealthDetail }> =>
    apiClient.get('/platform/sms-health', { params: { window: windowHours } }),

  // Error feed
  getErrors: (limit = 50): Promise<{ data: ErrorFeed }> =>
    apiClient.get('/platform/errors', { params: { limit } }),

  // Failed jobs
  getFailedJobs: (): Promise<{ data: FailedJob[] }> =>
    apiClient.get('/platform/failed-jobs'),

  retryJob: (uuid: string, passcode: string): Promise<{ message: string }> =>
    apiClient.post('/platform/failed-jobs/retry', { uuid, passcode }),

  // Password reset
  resetPassword: (employeeId: number, passcode: string, newPassword?: string, forceReset = false): Promise<{ message: string; temporary_password: string; must_reset: boolean }> =>
    apiClient.post('/platform/reset-password', {
      employee_id: employeeId,
      passcode,
      force_reset: forceReset,
      ...(newPassword ? { new_password: newPassword } : {}),
    }),

  // Staff password management (passcode-gated)
  getStaffPasswords: (passcode: string): Promise<{ data: StaffPassword[] }> =>
    apiClient.post('/platform/staff-passwords', { passcode }),

  viewPassword: (employeeId: number, passcode: string): Promise<{ data: { employee_id: number; name: string; employee_no: string; password: string | null; has_password: boolean; must_reset_password: boolean } }> =>
    apiClient.post('/platform/view-password', { employee_id: employeeId, passcode }),

  // Active sessions
  getSessions: (): Promise<{ data: ActiveSession[] }> =>
    apiClient.get('/platform/sessions'),

  // Admin management
  getAdmins: (): Promise<{ data: PlatformAdmin[] }> =>
    apiClient.get('/platform/admins'),

  createAdmin: (employeeId: number, newPasscode: string, callerPasscode: string): Promise<{ message: string }> =>
    apiClient.post('/platform/admins', { employee_id: employeeId, new_passcode: newPasscode, passcode: callerPasscode }),

  // Create a brand-new user (any role) — passcode-gated
  createUser: (payload: CreateUserPayload): Promise<{ message: string; name?: string; employee_no?: string; role?: string; generated_password: string | null }> =>
    apiClient.post('/platform/create-user', payload),

  revokeAdmin: (userId: number, passcode: string): Promise<{ message: string }> =>
    apiClient.delete(`/platform/admins/${userId}`, { data: { passcode } }),

  // Passcode
  updatePasscode: (currentPasscode: string, newPasscode: string): Promise<{ message: string }> =>
    apiClient.put('/platform/passcode', { current_passcode: currentPasscode, new_passcode: newPasscode }),

  // Cache
  clearCache: (type: 'all' | 'config' | 'route' | 'view' | 'app', passcode: string): Promise<{ message: string }> =>
    apiClient.post('/platform/cache/clear', { type, passcode }),

  // Maintenance
  toggleMaintenance: (passcode: string): Promise<{ message: string; status: string }> =>
    apiClient.post('/platform/maintenance', { passcode }),
};
