import apiClient from '../client';
import { AuthResponse, User } from '@/types/api';

export interface SendOTPRequest {
  phone: string;
  email?: string;
}

export interface VerifyOTPRequest {
  phone: string;
  otp: string;
}

export interface RegisterRequest {
  name: string;
  phone: string;
  email?: string;
  otp: string;
}

export interface QuickRegisterRequest {
  name: string;
  phone: string;
  email?: string;
}

export const authService = {
  /**
   * Send OTP to phone number
   */
  sendOTP: (data: SendOTPRequest): Promise<{ data: { message: string } }> => {
    return apiClient.post('/auth/send-otp', data);
  },

  /**
   * Verify OTP and get auth token
   */
  verifyOTP: (data: VerifyOTPRequest): Promise<{ data: AuthResponse }> => {
    return apiClient.post('/auth/verify-otp', data);
  },

  /**
   * Register new customer
   */
  register: (data: RegisterRequest): Promise<{ data: AuthResponse }> => {
    return apiClient.post('/auth/register', data);
  },

  /**
   * Quick register after order (no OTP required)
   */
  quickRegister: (data: QuickRegisterRequest): Promise<{ data: AuthResponse }> => {
    return apiClient.post('/auth/quick-register', data);
  },

  /**
   * Get authenticated user
   */
  getUser: (): Promise<{ data: User }> => {
    return apiClient.get('/auth/user');
  },

  /**
   * Logout current user
   */
  logout: (): Promise<void> => {
    return apiClient.post('/auth/logout');
  },
};
