import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { navigateTo } from '@/lib/navigation';

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
  };
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
}

// Custom error class
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000'),
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

export const GUEST_SESSION_KEY = 'cedibites_guest_session';

export function getGuestSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(GUEST_SESSION_KEY);
}

export function setGuestSessionId(id: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(GUEST_SESSION_KEY, id);
  }
}

export function ensureGuestSessionId(): string {
  if (typeof window === 'undefined') {
    return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 15)}`;
  }
  let id = localStorage.getItem(GUEST_SESSION_KEY);
  if (!id) {
    id = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 15)}`;
    localStorage.setItem(GUEST_SESSION_KEY, id);
  }
  return id;
}

function isStaffRoute(): boolean {
  if (typeof window === 'undefined') return false;
  const p = window.location.pathname;
  return p.startsWith('/staff') || p.startsWith('/admin') || p.startsWith('/partner') || p.startsWith('/pos') || p.startsWith('/order-manager') || p.startsWith('/kitchen');
}

// Request interceptor - use the token that matches the current route, no fallbacks
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined' && config.headers) {
      if (isStaffRoute()) {
        const token = localStorage.getItem('cedibites_staff_token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
      } else {
        const token = localStorage.getItem('cedibites_auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        } else {
          const guestSession = localStorage.getItem(GUEST_SESSION_KEY);
          if (guestSession) config.headers['X-Guest-Session'] = guestSession;
        }
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors globally
apiClient.interceptors.response.use(
  (response) => {
    // Backend returns data wrapped in { data: ... } for success responses
    // Return the full response to preserve structure
    return response.data;
  },
  async (error: AxiosError<ApiResponse>) => {
    // Handle network errors
    if (!error.response) {
      throw new ApiError(0, 'Network error. Please check your connection.');
    }

    const { status, data } = error.response;

    // Handle 401 - Unauthorized (token expired or invalid)
    if (status === 401) {
      if (typeof window !== 'undefined') {
        const pathname = window.location.pathname;
        
        const isStaffRoute = pathname.startsWith('/staff') ||
          pathname.startsWith('/admin') ||
          pathname.startsWith('/partner') ||
          pathname.startsWith('/pos') ||
          pathname.startsWith('/kitchen') ||
          pathname.startsWith('/order-manager');

        if (isStaffRoute) {
          // Don't redirect if already on a login page or POS root (login page)
          const isOnLoginPage = pathname.includes('/login') || pathname === '/pos';

          if (!isOnLoginPage) {
            localStorage.removeItem('cedibites_staff_token');
            localStorage.removeItem('cedibites-staff-session');
            navigateTo('/staff/login');
          }
        } else {
          localStorage.removeItem('cedibites_auth_token');
          localStorage.removeItem('cedibites-auth-user');
          if (pathname !== '/') {
            navigateTo('/');
          }
        }
      }
      throw new ApiError(status, 'Unauthorized. Please login again.');
    }

    // Handle 403 - Forbidden
    if (status === 403) {
      throw new ApiError(
        status,
        data?.message || 'You do not have permission to perform this action.'
      );
    }

    // Handle 422 - Validation errors
    if (status === 422 && data?.errors) {
      throw new ApiError(
        status,
        data.message || 'Validation failed',
        data.errors
      );
    }

    // Handle other errors
    throw new ApiError(
      status,
      data?.message || 'An error occurred. Please try again.'
    );
  }
);

export default apiClient;
