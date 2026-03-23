'use client';

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { getStaffToken } from '@/lib/api/services/staff.service';

declare global {
  interface Window {
    Pusher: typeof Pusher;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EchoInstance = Echo<any>;

function reverbConfig(auth?: { headers: Record<string, string> }) {
  return {
    broadcaster: 'reverb' as const,
    key: process.env.NEXT_PUBLIC_REVERB_APP_KEY!,
    wsHost: process.env.NEXT_PUBLIC_REVERB_HOST ?? 'localhost',
    wsPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8080),
    wssPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8080),
    forceTLS: process.env.NEXT_PUBLIC_REVERB_SCHEME === 'https',
    enabledTransports: ['ws', 'wss'] as ['ws', 'wss'],
    ...(auth && {
      authEndpoint: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/v1'}/broadcasting/auth`,
      auth,
    }),
  };
}

function ensurePusher(): void {
  if (typeof window !== 'undefined') {
    window.Pusher = Pusher;
  }
}

// ─── Staff Echo (private channels, uses staff token) ─────────────────────────

let echoInstance: EchoInstance | null = null;

export function getEcho(): EchoInstance | null {
  const token = getStaffToken();
  if (!token) {
    return null;
  }

  if (!echoInstance) {
    ensurePusher();
    echoInstance = new Echo(reverbConfig({ headers: { Authorization: `Bearer ${token}` } }));
  }

  return echoInstance;
}

export function disconnectEcho(): void {
  echoInstance?.disconnect();
  echoInstance = null;
}

// ─── Customer Echo (private channels, uses customer auth token) ───────────────

let customerEchoInstance: EchoInstance | null = null;

export function getCustomerEcho(): EchoInstance | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('cedibites_auth_token');
  if (!token) return null;

  if (!customerEchoInstance) {
    ensurePusher();
    customerEchoInstance = new Echo(reverbConfig({ headers: { Authorization: `Bearer ${token}` } }));
  }

  return customerEchoInstance;
}

export function disconnectCustomerEcho(): void {
  customerEchoInstance?.disconnect();
  customerEchoInstance = null;
}

// ─── Public Echo (public channels, no auth required) ─────────────────────────

let publicEchoInstance: EchoInstance | null = null;

export function getPublicEcho(): EchoInstance | null {
  if (typeof window === 'undefined') return null;

  if (!publicEchoInstance) {
    ensurePusher();
    publicEchoInstance = new Echo(reverbConfig());
  }

  return publicEchoInstance;
}

export function disconnectPublicEcho(): void {
  publicEchoInstance?.disconnect();
  publicEchoInstance = null;
}
