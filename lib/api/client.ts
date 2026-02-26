import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

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

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage (client-side only)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('cedibites_auth_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
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
        localStorage.removeItem('cedibites_auth_token');
        localStorage.removeItem('cedibites-auth-user');
        
        // Redirect to home page if not already there
        if (window.location.pathname !== '/') {
          window.location.href = '/';
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
