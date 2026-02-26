'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authService } from '@/lib/api/services/auth.service';
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

    // Actions
    sendOTP: (phone: string) => Promise<{ success: boolean; error?: string }>;
    verifyOTP: (code: string) => Promise<{ success: boolean; error?: string }>;
    saveProfile: (name: string, phone: string) => Promise<void>;

    // Post-order quick save (from checkout)
    saveFromCheckout: (name: string, phone: string) => void;

    // Dev helpers
    devOTP: string; // visible in dev mode only
    
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
    const [user, setUser] = useState<AuthUser | null>(null);
    const [authStep, setAuthStep] = useState<AuthStep>('idle');
    const [pendingPhone, setPendingPhone] = useState('');
    const [devOTP, setDevOTP] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [requiresRegistration, setRequiresRegistration] = useState(false);
    const [hydrated, setHydrated] = useState(false);

    // ── Load persisted session ──
    useEffect(() => {
        const loadUser = async () => {
            try {
                // Check if we have a token
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
            localStorage.removeItem(STORAGE_KEY);
            setAuthStep('idle');
            setPendingPhone('');
        }
    }, []);

    // ── Send OTP ──────────────────────────────────────────────────────────────
    const sendOTP = useCallback(async (phone: string): Promise<{ success: boolean; error?: string }> => {
        setIsLoading(true);
        try {
            // Call API to send OTP
            await authService.sendOTP({ phone });
            setPendingPhone(phone);

            // In development, the backend logs the OTP to console
            // You can check the Laravel logs or backend console
            if (process.env.NODE_ENV === 'development') {
                console.log('%c[CediBites] OTP sent! Check backend logs for the code.', 'color: #e49925; font-size: 14px;');
                // For dev convenience, set a placeholder
                setDevOTP('Check backend logs');
            }

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
                setDevOTP('');
                return { success: true };
            }

            // Existing user - login successful
            const { token, user: apiUser } = response.data as { token: string; user: User };
            
            // Store token (handled by API client interceptor)
            localStorage.setItem('cedibites_auth_token', token);
            
            // Convert and store user
            const authUser = mapApiUserToAuthUser(apiUser);
            persistUser(authUser);
            
            setAuthStep('done');
            setDevOTP('');
            return { success: true };
        } catch (error) {
            const errorMessage = getErrorMessage(error);
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, [pendingPhone]);

    // ── Save profile (after name entry) ──────────────────────────────────────
    const saveProfile = useCallback(async (name: string, phone: string) => {
        if (!requiresRegistration) {
            // Fallback for old flow
            const newUser: AuthUser = { name, phone, savedAddresses: [], createdAt: Date.now() };
            persistUser(newUser);
            setAuthStep('done');
            return;
        }

        setIsLoading(true);
        try {
            // Register new user via API
            const response = await authService.register({ 
                name, 
                phone: pendingPhone,
                otp: '' // OTP already verified in previous step
            });

            const { token, user: apiUser } = response.data;
            
            // Store token
            localStorage.setItem('cedibites_auth_token', token);
            
            // Convert and store user
            const authUser = mapApiUserToAuthUser(apiUser);
            persistUser(authUser);
            
            setAuthStep('done');
            setRequiresRegistration(false);
        } catch (error) {
            console.error('Registration error:', error);
            // Fallback to local storage on error
            const newUser: AuthUser = { name, phone, savedAddresses: [], createdAt: Date.now() };
            persistUser(newUser);
            setAuthStep('done');
        } finally {
            setIsLoading(false);
        }
    }, [requiresRegistration, pendingPhone]);

    // ── Quick save from checkout (no OTP needed — they just ordered) ──────────
    // Called from StepDone "Save for next time" prompt
    const saveFromCheckout = useCallback((name: string, phone: string) => {
        if (!name.trim() || !phone.trim()) return;
        const newUser: AuthUser = { name, phone, savedAddresses: [], createdAt: Date.now() };
        persistUser(newUser);
    }, []);

    return (
        <AuthContext.Provider value={{
            user, 
            isLoggedIn: !!user, 
            logout,
            authStep, 
            setAuthStep,
            pendingPhone, 
            setPendingPhone,
            sendOTP, 
            verifyOTP, 
            saveProfile,
            saveFromCheckout,
            devOTP,
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
