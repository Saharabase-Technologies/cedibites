'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authService } from '@/lib/api/services/auth.service';
import { cartService } from '@/lib/api/services/cart.service';
import { GUEST_SESSION_KEY, ApiError } from '@/lib/api/client';
import { disconnectCustomerEcho, getCustomerEcho } from '@/lib/echo';
import { getErrorMessage } from '@/lib/utils/error-handler';
import { normalizeGhanaPhone } from '@/app/lib/phone';
import type { User } from '@/types/api';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AuthUser {
    id?: number;
    name: string;
    phone: string;
    email?: string;
    savedAddresses?: string[];
    createdAt: number;
}

type AuthStep = 'idle' | 'phone' | 'otp' | 'naming' | 'done';

interface AuthContextType {
    // Session
    user: AuthUser | null;
    isLoggedIn: boolean;
    /**
     * The stored session has not been read back yet.
     *
     * `isLoggedIn` opens false and stays false until `/auth/user` answers, so
     * for the first few hundred milliseconds of every page load a signed-in
     * customer is indistinguishable from a guest. Anything that redirects,
     * hides or offers to sign somebody in has to wait for this to go false, or
     * it acts on an answer that has not arrived. The account page did not wait,
     * and bounced its way to the home screen on every visit.
     */
    isRestoring: boolean;
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
    updateProfile: (data: { name?: string; email?: string | null }) => Promise<{ success: boolean; error?: string }>;

    // Post-order account claim (from checkout) — OTP-verified, two steps
    requestCheckoutSaveOTP: (phone: string) => Promise<{ success: boolean; error?: string }>;
    confirmCheckoutSaveOTP: (name: string, phone: string, code: string) => Promise<{ success: boolean; error?: string }>;

    // Loading states
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * The signed-in customer, kept on the device between page loads.
 *
 * `client.ts` has always cleared this key on a 401 that carried the customer
 * token, but nothing ever wrote it, so there was no cached identity to bridge
 * the gap while `/auth/user` was in flight. The token alone is not enough: a
 * name is needed to draw the header, and every screen that asks "is this person
 * signed in" was answering no until the network came back.
 *
 * It is a cache, never the authority. The token decides; this only decides what
 * is on screen for the moment before the server confirms it.
 */
const CACHED_USER_KEY = 'cedibites-auth-user';

function readCachedUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(CACHED_USER_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<AuthUser>;
        if (typeof parsed.name !== 'string' || typeof parsed.phone !== 'string') return null;
        return {
            id: parsed.id,
            name: parsed.name,
            phone: parsed.phone,
            email: parsed.email,
            savedAddresses: parsed.savedAddresses ?? [],
            createdAt: typeof parsed.createdAt === 'number' ? parsed.createdAt : Date.now(),
        };
    } catch {
        return null;
    }
}

function writeCachedUser(user: AuthUser | null): void {
    if (typeof window === 'undefined') return;
    try {
        if (user) window.localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
        else window.localStorage.removeItem(CACHED_USER_KEY);
    } catch { /* private window */ }
}

// Helper to convert API User to AuthUser
function mapApiUserToAuthUser(apiUser: User): AuthUser {
    return {
        id: apiUser.id,
        name: apiUser.name,
        phone: apiUser.phone,
        email: apiUser.email,
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

    /**
     * ── Load persisted session ──
     *
     * Two steps, and the first one is the fix. The cached user goes into state
     * synchronously so a returning customer is signed in from the first paint;
     * the request behind it then confirms or clears. Waiting for the network
     * before admitting anybody is signed in is what made the session look as
     * though it had not persisted, because every guard on the customer side
     * reads `isLoggedIn` and the account page acts on it inside an effect that
     * runs long before the answer lands.
     *
     * Only a 401 signs them out. A dropped connection or a 500 leaves the token
     * where it is: the server has said nothing about this credential, and
     * throwing somebody out of their account because the wifi went is worse
     * than showing them a stale name for a minute.
     */
    useEffect(() => {
        const token = localStorage.getItem('cedibites_auth_token');

        if (!token) {
            writeCachedUser(null);
            setHydrated(true);
            return;
        }

        const cached = readCachedUser();
        if (cached) setUser(cached);

        let cancelled = false;

        (async () => {
            try {
                const response = await authService.getUser();
                if (cancelled) return;
                const fresh = mapApiUserToAuthUser(response.data);
                setUser(fresh);
                writeCachedUser(fresh);
            } catch (error: unknown) {
                if (cancelled) return;
                const status = error instanceof ApiError ? error.status : 0;
                if (status === 401) {
                    setUser(null);
                    writeCachedUser(null);
                    localStorage.removeItem('cedibites_auth_token');
                    localStorage.removeItem(GUEST_SESSION_KEY);
                }
            } finally {
                if (!cancelled) setHydrated(true);
            }
        })();

        return () => { cancelled = true; };
    }, []);

    const persistUser = (u: AuthUser) => {
        setUser(u);
        writeCachedUser(u);
    };

    // ── Reverb session sync ──
    useEffect(() => {
        if (!user?.id) return;

        const echo = getCustomerEcho();
        if (!echo) return;

        const channel = echo.private(`App.Models.User.${user.id}`);

        channel.listen('.customer.session', (event: { type: string }) => {
            if (event.type === 'session.revoked') {
                setUser(null);
                writeCachedUser(null);
                localStorage.removeItem('cedibites_auth_token');
                localStorage.removeItem(GUEST_SESSION_KEY);
                localStorage.removeItem('cedibites-cart-cache');
                setAuthStep('idle');
                disconnectCustomerEcho();
            }
        });

        return () => {
            echo.leave(`App.Models.User.${user.id}`);
        };
    }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
            disconnectCustomerEcho();
            setUser(null);
            writeCachedUser(null);
            localStorage.removeItem('cedibites_auth_token');
            localStorage.removeItem(GUEST_SESSION_KEY);
            localStorage.removeItem('cedibites-cart-cache');
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

    // ── Save from checkout, step 1: send the code ─────────────────────────────
    // Placing an order does not prove you own the number you typed. Claiming an
    // account merges you into whatever record already holds that phone, along
    // with its order history and saved addresses, so it has to be earned with an
    // OTP like any other sign-in. Deliberately does NOT touch authStep — that
    // drives the global login sheet, and this flow runs inside the checkout page.
    const requestCheckoutSaveOTP = useCallback(async (phone: string): Promise<{ success: boolean; error?: string }> => {
        try {
            await authService.sendOTP({ phone: normalizeGhanaPhone(phone) });
            return { success: true };
        } catch (error) {
            return { success: false, error: getErrorMessage(error) };
        }
    }, []);

    // ── Save from checkout, step 2: verify and claim ──────────────────────────
    const confirmCheckoutSaveOTP = useCallback(async (name: string, phone: string, code: string): Promise<{ success: boolean; error?: string }> => {
        const normalized = normalizeGhanaPhone(phone);

        try {
            // Their order already created a passwordless account behind this
            // phone, so verify-otp normally returns a session outright and marks
            // the customer as claimed. quick-register is the fallback for when it
            // does not — an order placed against a different number, say.
            const verified = await authService.verifyOTP({ phone: normalized, otp: code });

            let token: string;
            let apiUser: User;

            if ('requires_registration' in verified.data && verified.data.requires_registration) {
                const registered = await authService.quickRegister({ name, phone: normalized, email: undefined });
                token = registered.data.token;
                apiUser = registered.data.user;
            } else {
                ({ token, user: apiUser } = verified.data as { token: string; user: User });
            }

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

            persistUser(mapApiUserToAuthUser(apiUser));
            return { success: true };
        } catch (error) {
            // Nothing is persisted locally on failure. Saving an unverified name
            // and phone to the device is what made the old flow feel like it had
            // worked when it had not.
            return { success: false, error: getErrorMessage(error) };
        }
    }, [queryClient]);

    // ── Update profile (name, email) ─────────────────────────────────────────
    const updateProfile = useCallback(async (data: { name?: string; email?: string | null }): Promise<{ success: boolean; error?: string }> => {
        try {
            const response = await authService.updateProfile(data);
            const apiUser = response.data;
            persistUser(mapApiUserToAuthUser(apiUser));
            return { success: true };
        } catch (error) {
            const errorMessage = getErrorMessage(error);
            return { success: false, error: errorMessage };
        }
    }, []);

    return (
        <AuthContext.Provider value={{
            user,
            isLoggedIn: !!user,
            isRestoring: !hydrated,
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
            updateProfile,
            requestCheckoutSaveOTP,
            confirmCheckoutSaveOTP,
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
