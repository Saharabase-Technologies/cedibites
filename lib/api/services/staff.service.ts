import apiClient, { ApiError } from '../client';
import type { StaffRole } from '@/types/staff';

export interface StaffBranch {
  id: string;
  name: string;
  address: string;
}

export interface StaffUser {
  id: string;
  name: string;
  role: StaffRole;
  branches: StaffBranch[];
  permissions: string[];
  email?: string;
  phone?: string;
  joinedAt?: string;
  must_reset_password?: boolean;
}

export interface StaffLoginResponse {
  token: string;
  user: StaffUser;
}

export interface IdentifierCheck {
  exists: boolean;
  name?: string;
  channels: { email: boolean; phone: boolean };
  emailHint?: string | null;
  phoneHint?: string | null;
}

const STAFF_TOKEN_KEY = 'cedibites_staff_token';

export function getStaffToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STAFF_TOKEN_KEY);
}

export function setStaffToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STAFF_TOKEN_KEY, token);
    window.dispatchEvent(new CustomEvent('staff-login'));
  }
}

export function clearStaffToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STAFF_TOKEN_KEY);
  }
}

export const staffService = {
  /**
   * Staff login with identifier (email or phone) and password.
   */
  login: async (identifier: string, password: string): Promise<StaffLoginResponse> => {
    const response = await apiClient.post('/employee/login', {
      identifier: identifier.trim(),
      password,
    }) as unknown as { data?: StaffLoginResponse } | StaffLoginResponse;
    const data = ('data' in response && response.data) ? response.data : (response as StaffLoginResponse);
    if (!data?.token || !data?.user) {
      throw new ApiError(401, 'Invalid response from server');
    }
    setStaffToken(data.token);
    // Clear customer session so AuthProvider doesn't validate it on reload
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cedibites_auth_token');
      localStorage.removeItem('cedibites-auth-user');
    }
    return {
      ...data,
      user: { ...data.user, role: data.user.role as StaffRole },
    };
  },

  /**
   * Check whether an active staff account exists for an identifier, and which
   * channels (email / SMS) a password reset can be delivered through.
   * Powers the two-step login screen.
   */
  checkIdentifier: async (identifier: string): Promise<IdentifierCheck> => {
    const response = await apiClient.post('/employee/check-identifier', {
      identifier: identifier.trim(),
    }) as unknown as { data?: IdentifierCheck } | IdentifierCheck;
    const data = ('data' in response && response.data) ? response.data : (response as IdentifierCheck);
    return {
      exists: !!data?.exists,
      name: data?.name,
      channels: data?.channels ?? { email: false, phone: false },
      emailHint: data?.emailHint ?? null,
      phoneHint: data?.phoneHint ?? null,
    };
  },

  /**
   * Change password and clear the must_reset_password flag.
   */
  changePassword: async (currentPassword: string, password: string): Promise<void> => {
    await apiClient.post('/employee/change-password', {
      current_password: currentPassword,
      password,
      password_confirmation: password,
    });
  },

  /**
   * Fetch the currently authenticated staff user's fresh profile from the API.
   */
  me: async (): Promise<StaffUser> => {
    const response = await apiClient.get('/employee/me') as unknown as { data?: { user?: StaffUser } } | { user?: StaffUser };
    const data = ('data' in response && response.data) ? response.data : (response as { user?: StaffUser });
    if (!data?.user) throw new ApiError(401, 'Unauthorized');
    return { ...data.user, role: data.user.role as import('@/types/staff').StaffRole };
  },

  /**
   * Staff logout.
   */
  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/employee/logout');
    } finally {
      clearStaffToken();
    }
  },

  /**
   * Request a password reset link via SMS (and email if present).
   */
  forgotPassword: async (identifier: string): Promise<void> => {
    await apiClient.post('/employee/forgot-password', { identifier: identifier.trim() });
  },

  /**
   * Reset password using either a link token or a 6-digit OTP received via
   * email/SMS. Provide exactly one of `token` or `otp`.
   */
  resetPassword: async (params: {
    identifier: string;
    password: string;
    password_confirmation: string;
    token?: string;
    otp?: string;
  }): Promise<void> => {
    await apiClient.post('/employee/reset-password', {
      identifier: params.identifier.trim(),
      password: params.password,
      password_confirmation: params.password_confirmation,
      ...(params.token ? { token: params.token } : {}),
      ...(params.otp ? { otp: params.otp } : {}),
    });
  },
};
