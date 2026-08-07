import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/auth.service';
import type { SendOTPRequest, VerifyOTPRequest, RegisterRequest } from '../services/auth.service';

export const useAuth = () => {
  const queryClient = useQueryClient();

  // Get authenticated user
  const {
    data: userData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['user'],
    queryFn: authService.getUser,
    retry: false,
    enabled: typeof window !== 'undefined' && !!localStorage.getItem('cedibites_auth_token'),
  });

  // Send OTP mutation
  const sendOTPMutation = useMutation({
    mutationFn: (data: SendOTPRequest) => authService.sendOTP(data),
  });

  // Verify OTP mutation
  const verifyOTPMutation = useMutation({
    mutationFn: (data: VerifyOTPRequest) => authService.verifyOTP(data),
    onSuccess: (response) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('cedibites_auth_token', response.data.token);
        localStorage.setItem('cedibites-auth-user', JSON.stringify(response.data.user));
      }
      queryClient.setQueryData(['user'], response);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (data: RegisterRequest) => authService.register(data),
    onSuccess: (response) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('cedibites_auth_token', response.data.token);
        localStorage.setItem('cedibites-auth-user', JSON.stringify(response.data.user));
      }
      queryClient.setQueryData(['user'], response);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cedibites_auth_token');
        localStorage.removeItem('cedibites-auth-user');
      }
      queryClient.clear();
    },
  });

  return {
    user: userData?.data,
    isLoading,
    error,
    isAuthenticated: !!userData?.data,
    sendOTP: sendOTPMutation.mutateAsync,
    sendOTPLoading: sendOTPMutation.isPending,
    verifyOTP: verifyOTPMutation.mutateAsync,
    verifyOTPLoading: verifyOTPMutation.isPending,
    register: registerMutation.mutateAsync,
    registerLoading: registerMutation.isPending,
    logout: logoutMutation.mutateAsync,
    logoutLoading: logoutMutation.isPending,
  };
};
