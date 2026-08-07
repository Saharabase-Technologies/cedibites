import { ApiError } from '../api/client';

/**
 * Extract user-friendly error message from API error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    // Handle validation errors
    if (error.errors) {
      const firstError = Object.values(error.errors)[0];
      return Array.isArray(firstError) ? firstError[0] : error.message;
    }
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Extract all validation errors from API error
 */
export function getValidationErrors(error: unknown): Record<string, string[]> | null {
  if (error instanceof ApiError && error.errors) {
    return error.errors;
  }
  return null;
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 0;
  }
  return false;
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 401;
  }
  return false;
}

/**
 * Check if error is a permission error
 */
export function isPermissionError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 403;
  }
  return false;
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 422 && !!error.errors;
  }
  return false;
}
