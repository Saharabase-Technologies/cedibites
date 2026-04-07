import apiClient from '../client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SystemHealth {
  status: 'healthy' | 'degraded';
  php: { version: string; memory_limit: string; max_execution_time: string; upload_max_filesize: string; extensions: string };
  laravel: { version: string; environment: string; debug_mode: string; timezone: string; locale: string; cache_driver: string; queue_driver: string; session_driver: string; broadcast_driver: string };
  database: { status: string; driver: string; latency_ms: number; database: string; size: string | null };
  cache: { status: string; driver: string };
  queue: { driver: string; pending_jobs: number; failed_jobs: number; status: string };
  disk: { total: string; used: string; free: string; percent_used: string; status: string };
  uptime: string;
}

export interface SmartError {
  id: string;
  category: string;
  severity: 'critical' | 'error' | 'warning' | 'info';
  title: string;
  description: string;
  timestamp: string;
  count?: number;
  phone?: string;
  action?: string;
  order_number?: string;
  job_id?: number;
  raw?: string;
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
