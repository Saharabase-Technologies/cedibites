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
let echoInstance: Echo<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getEcho(): Echo<any> | null {
  const token = getStaffToken();
  if (!token) {
    return null;
  }

  if (!echoInstance) {
    window.Pusher = Pusher;
    echoInstance = new Echo({
      broadcaster: 'reverb',
      key: process.env.NEXT_PUBLIC_REVERB_APP_KEY!,
      wsHost: process.env.NEXT_PUBLIC_REVERB_HOST ?? 'localhost',
      wsPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8080),
      wssPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8080),
      forceTLS: process.env.NEXT_PUBLIC_REVERB_SCHEME === 'https',
      enabledTransports: ['ws', 'wss'],
      authEndpoint: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/v1'}/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
  }

  return echoInstance;
}

export function disconnectEcho(): void {
  echoInstance?.disconnect();
  echoInstance = null;
}
