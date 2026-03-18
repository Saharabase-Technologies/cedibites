'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authService } from '@/lib/api/services/auth.service';
import { cartService } from '@/lib/api/services/cart.service';
import { GUEST_SESSION_KEY } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/utils/error-handler';
import type { User } from '@/types/api';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AuthUser {
    name: string;
    phone: string;
    savedAddresses?: string[];
    createdAt: number;
}

type AuthStep = 'idle' | 'phone' | 'otp' | 'naming' | 'done';

interface AuthContextType {
    // Session
    user: AuthUser | null;
    isLoggedIn: boolean;
    logout: () => void;

    // OTP flow
    authStep: AuthStep;
    setAuthStep: (step: AuthStep) => void;
    pendingPhone: string;
    setPendingPhone: (phone: string) => void;
    pendingEmail: string;
    setPendingEmail: (email: string) => void;

    // Actions
    sendOTP: (phone: string, email?: string) => Promise<{ success: boolean; error?: string }>;
    verifyOTP: (code: string) => Promise<{ success: boolean; error?: string }>;
    saveProfile: (name: string, phone: string) => Promise<{ success: boolean; error?: string }>;

    // Post-order quick save (from checkout)
    saveFromCheckout: (name: string, phone: string) => void;

    // Loading states
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'cedibites-auth-user';

// Helper to convert API User to AuthUser
function mapApiUserToAuthUser(apiUser: User): AuthUser {
    return {
        name: apiUser.name,
        phone: apiUser.phone,
        savedAddresses: [],
        createdAt: new Date(apiUser.created_at).getTime(),
    };
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [authStep, setAuthStep] = useState<AuthStep>('idle');
    const [pendingPhone, setPendingPhone] = useState('');
    const [pendingEmail, setPendingEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [requiresRegistration, setRequiresRegistration] = useState(false);
    const [hydrated, setHydrated] = useState(false);

    // ── Load persisted session ──
    useEffect(() => {
        const loadUser = async () => {
            try {
                // When staff is logged in, skip customer session validation to avoid
                // triggering requests that could 401 and clear staff tokens on reload
                const staffToken = localStorage.getItem('cedibites_staff_token');
                if (staffToken) {
                    setHydrated(true);
                    return;
                }

                // Check if we have a customer token
                const token = localStorage.getItem('cedibites_auth_token');
                if (!token) {
                    // Fallback to old localStorage user (for backward compatibility)
                    const stored = localStorage.getItem(STORAGE_KEY);
                    if (stored) setUser(JSON.parse(stored));
                    setHydrated(true);
                    return;
                }

                // Fetch user from API
                const response = await authService.getUser();
                const authUser = mapApiUserToAuthUser(response.data);
                persistUser(authUser);
                setHydrated(true);
            } catch (error) {
                // Token invalid or expired, clear it
                localStorage.removeItem('cedibites_auth_token');
                localStorage.removeItem(GUEST_SESSION_KEY);
                localStorage.removeItem(STORAGE_KEY);
                setHydrated(true);
            }
        };

        loadUser();
    }, []);

    const persistUser = (u: AuthUser) => {
        setUser(u);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    };

    const logout = useCallback(async () => {
        try {
            // Call API logout if we have a token
            const token = localStorage.getItem('cedibites_auth_token');
            if (token) {
                await authService.logout();
            }
        } catch (error) {
            // Ignore logout errors, clear local state anyway
            console.error('Logout error:', error);
        } finally {
            setUser(null);
            localStorage.removeItem('cedibites_auth_token');
            localStorage.removeItem(GUEST_SESSION_KEY);
            localStorage.removeItem(STORAGE_KEY);
            setAuthStep('idle');
            setPendingPhone('');
            setPendingEmail('');
        }
    }, []);

    // ── Send OTP ──────────────────────────────────────────────────────────────
    const sendOTP = useCallback(async (phone: string, email?: string): Promise<{ success: boolean; error?: string }> => {
        setIsLoading(true);
        try {
            await authService.sendOTP({ phone, email: email?.trim() || undefined });
            setPendingPhone(phone);
            setPendingEmail(email?.trim() ?? '');
            setAuthStep('otp');
            return { success: true };
        } catch (error) {
            const errorMessage = getErrorMessage(error);
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ── Verify OTP ────────────────────────────────────────────────────────────
    const verifyOTP = useCallback(async (code: string): Promise<{ success: boolean; error?: string }> => {
        setIsLoading(true);
        try {
            // Call API to verify OTP
            const response = await authService.verifyOTP({ 
                phone: pendingPhone, 
                otp: code 
            });

            // Check if user exists or needs registration
            if ('requires_registration' in response.data && response.data.requires_registration) {
                // New user - needs to provide name
                setRequiresRegistration(true);
                setAuthStep('naming');
                return { success: true };
            }

            // Existing user - login successful
            const { token, user: apiUser } = response.data as { token: string; user: User };

            const guestSession = localStorage.getItem(GUEST_SESSION_KEY);
            localStorage.setItem('cedibites_auth_token', token);

            if (guestSession) {
                try {
                    await cartService.claimGuestCart(guestSession);
                    queryClient.invalidateQueries({ queryKey: ['cart'] });
                } catch {
                    // Ignore claim errors - cart may be empty or already claimed
                }
            }
            localStorage.removeItem(GUEST_SESSION_KEY);

            // Convert and store user
            const authUser = mapApiUserToAuthUser(apiUser);
            persistUser(authUser);

            setAuthStep('done');
            return { success: true };
        } catch (error) {
            const errorMessage = getErrorMessage(error);
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, [pendingPhone, queryClient]);

    // ── Save profile (after name entry) ──────────────────────────────────────
    const saveProfile = useCallback(async (name: string, phone: string): Promise<{ success: boolean; error?: string }> => {
        if (!requiresRegistration) {
            const newUser: AuthUser = { name, phone, savedAddresses: [], createdAt: Date.now() };
            persistUser(newUser);
            setAuthStep('done');
            return { success: true };
        }

        setIsLoading(true);
        try {
            const response = await authService.register({
                name,
                phone: pendingPhone,
                email: pendingEmail?.trim() || undefined,
                otp: '',
            });

            const { token, user: apiUser } = response.data;

            const guestSession = localStorage.getItem(GUEST_SESSION_KEY);
            localStorage.setItem('cedibites_auth_token', token);

            if (guestSession) {
                try {
                    await cartService.claimGuestCart(guestSession);
                    queryClient.invalidateQueries({ queryKey: ['cart'] });
                } catch {
                    // Ignore claim errors - cart may be empty or already claimed
                }
            }
            localStorage.removeItem(GUEST_SESSION_KEY);

            const authUser = mapApiUserToAuthUser(apiUser);
            persistUser(authUser);

            setAuthStep('done');
            setRequiresRegistration(false);
            return { success: true };
        } catch (error) {
            console.error('Registration error:', error);
            const errorMessage = getErrorMessage(error);
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, [requiresRegistration, pendingPhone, pendingEmail, queryClient]);

    // ── Quick save from checkout (no OTP needed — they just ordered) ──────────
    // Called from StepDone "Save for next time" prompt
    const saveFromCheckout = useCallback(async (name: string, phone: string) => {
        if (!name.trim() || !phone.trim()) return;
        
        try {
            // Register user in the backend using quick registration (no OTP)
            const response = await authService.quickRegister({
                name,
                phone,
                email: undefined,
            });

            const { token, user: apiUser } = response.data;

            // Claim any guest cart
            const guestSession = localStorage.getItem(GUEST_SESSION_KEY);
            localStorage.setItem('cedibites_auth_token', token);

            if (guestSession) {
                try {
                    await cartService.claimGuestCart(guestSession);
                    queryClient.invalidateQueries({ queryKey: ['cart'] });
                } catch {
                    // Ignore claim errors - cart may be empty or already claimed
                }
            }
            localStorage.removeItem(GUEST_SESSION_KEY);

            // Convert and store user
            const authUser = mapApiUserToAuthUser(apiUser);
            persistUser(authUser);
        } catch (error) {
            // If registration fails (e.g., user already exists), just save locally
            console.error('Failed to register user from checkout:', error);
            const newUser: AuthUser = { name, phone, savedAddresses: [], createdAt: Date.now() };
            persistUser(newUser);
        }
    }, [queryClient]);

    return (
        <AuthContext.Provider value={{
            user,
            isLoggedIn: !!user,
            logout,
            authStep,
            setAuthStep,
            pendingPhone,
            setPendingPhone,
            pendingEmail,
            setPendingEmail,
            sendOTP,
            verifyOTP,
            saveProfile,
            saveFromCheckout,
            isLoading,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
