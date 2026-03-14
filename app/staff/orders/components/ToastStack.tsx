'use client';

import { XIcon, CheckCircleIcon, WarningCircleIcon, BellIcon, ForkKnifeIcon } from '@phosphor-icons/react';
import type { OrderNotification } from '@/types/order';

// ─── Per-type style config ────────────────────────────────────────────────────

const TYPE_CONFIG = {
    info:    { icon: BellIcon,          border: 'border-l-info',      text: 'text-info',      bg: 'bg-info/10'      },
    success: { icon: CheckCircleIcon,   border: 'border-l-secondary', text: 'text-secondary', bg: 'bg-secondary/10' },
    warning: { icon: WarningCircleIcon, border: 'border-l-warning',   text: 'text-warning',   bg: 'bg-warning/10'   },
    kitchen: { icon: ForkKnifeIcon,     border: 'border-l-primary',   text: 'text-primary',   bg: 'bg-primary/10'   },
} as const;

// ─── Single toast ─────────────────────────────────────────────────────────────

function Toast({ n, onDismiss }: { n: OrderNotification; onDismiss: (id: string) => void }) {
    const cfg = TYPE_CONFIG[n.type];
    const Icon = cfg.icon;

    return (
        <div
            className={`
                flex items-start gap-3
                bg-brand-dark border border-brown-light/20 border-l-4 ${cfg.border}
                rounded-2xl px-4 py-3 shadow-2xl
                w-72 pointer-events-auto
            `}
            style={{ animation: 'toastIn 0.22s cubic-bezier(0.22,1,0.36,1)' }}
        >
            <span className={`${cfg.bg} ${cfg.text} rounded-lg p-1.5 shrink-0 mt-0.5`}>
                <Icon size={13} weight="fill" />
            </span>

            <div className="flex-1 min-w-0">
                <p className="text-text-light text-xs font-bold font-body leading-snug">{n.title}</p>
                <p className="text-neutral-gray text-xs font-body mt-0.5 leading-snug">{n.message}</p>
            </div>

            <button
                type="button"
                onClick={() => onDismiss(n.id)}
                className="text-neutral-gray/50 hover:text-neutral-gray transition-colors shrink-0 mt-0.5 cursor-pointer"
            >
                <XIcon size={12} weight="bold" />
            </button>
        </div>
    );
}

// ─── Toast stack ──────────────────────────────────────────────────────────────

interface ToastStackProps {
    notifications: OrderNotification[];
    onDismiss: (id: string) => void;
}

export default function ToastStack({ notifications, onDismiss }: ToastStackProps) {
    if (notifications.length === 0) return null;

    return (
        <>
            {/* Keyframe animation — injected once */}
            <style>{`
                @keyframes toastIn {
                    from { transform: translateX(110%); opacity: 0; }
                    to   { transform: translateX(0);    opacity: 1; }
                }
            `}</style>

            <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
                {notifications.map(n => (
                    <Toast key={n.id} n={n} onDismiss={onDismiss} />
                ))}
            </div>
        </>
    );
}
