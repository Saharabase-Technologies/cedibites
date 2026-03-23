import apiClient, { ApiError } from '../client';
import type { StaffRole } from '@/types/staff';

export interface StaffUser {
  id: string;
  name: string;
  role: StaffRole;
  branch: string;
  branchId: string;
  branchIds?: string[];
  email?: string;
  phone?: string;
  pin?: string;
  joinedAt?: string;
  must_reset_password?: boolean;
}

export interface StaffLoginResponse {
  token: string;
  user: StaffUser;
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
   * POS login with 4-digit PIN.
   */
  posLogin: async (pin: string): Promise<StaffLoginResponse> => {
    const response = await apiClient.post('/employee/pos-login', { pin }) as unknown as
      { data?: StaffLoginResponse } | StaffLoginResponse;
    const data = ('data' in response && response.data) ? response.data : (response as StaffLoginResponse);
    if (!data?.token || !data?.user) {
      throw new ApiError(403, 'Invalid PIN or inactive account');
    }
    setStaffToken(data.token);
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
};
