'use client';

import { useState, useEffect } from 'react';
import { XIcon, ProhibitIcon, SpinnerIcon, CheckCircleIcon } from '@phosphor-icons/react';

const REASON_PRESETS = [
    'Changed my mind',
    'Ordered by mistake',
    'Taking too long',
    'Found a better option',
    'Wrong items ordered',
    'Payment issue',
];

const STAFF_REASON_PRESETS = [
    'Customer changed their mind',
    'Customer ordered by mistake',
    'Taking too long',
    'Wrong items ordered',
    'Payment issue',
    'Duplicate order',
];

interface CancelOrderModalProps {
    orderNumber: string;
    onConfirm: (reason: string) => Promise<void>;
    onCancel: () => void;
    /** Dark theme for staff panels, light for customer/admin */
    theme?: 'dark' | 'light';
    /** 'self' = customer cancelling their own, 'staff' = staff cancelling on behalf */
    context?: 'self' | 'staff';
}

export default function CancelOrderModal({
    orderNumber,
    onConfirm,
    onCancel,
    theme = 'light',
    context = 'self',
}: CancelOrderModalProps) {
    const [selected, setSelected] = useState<string | null>(null);
    const [custom, setCustom] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [succeeded, setSucceeded] = useState(false);

    const reason = selected === '__custom__' ? custom.trim() : (selected ?? '');

    const isDark = theme === 'dark';
    const presets = context === 'staff' ? STAFF_REASON_PRESETS : REASON_PRESETS;

    const bg = isDark ? 'bg-brown border-brown-light/20' : 'bg-white border-[#f0e8d8]';
    const titleColor = isDark ? 'text-text-light' : 'text-text-dark';
    const subColor = isDark ? 'text-neutral-gray' : 'text-neutral-gray';
    const chipBase = isDark
        ? 'border border-brown-light/20 text-neutral-gray hover:text-text-light hover:border-brown-light/40'
        : 'border border-[#f0e8d8] text-neutral-gray hover:text-text-dark hover:border-primary/30';
    const chipActive = isDark
        ? 'border-error/50 bg-error/10 text-error'
        : 'border-error/40 bg-error/8 text-error';
    const inputClass = isDark
        ? 'bg-brand-dark border border-brown-light/20 text-text-light placeholder:text-neutral-gray/50 focus:border-error/40'
        : 'bg-neutral-light border border-[#f0e8d8] text-text-dark placeholder:text-neutral-gray focus:border-error/40';

    // Auto-close after showing success state
    useEffect(() => {
        if (!succeeded) return;
        const t = setTimeout(onCancel, 1800);
        return () => clearTimeout(t);
    }, [succeeded, onCancel]);

    async function handleConfirm() {
        setIsLoading(true);
        try {
            await onConfirm(reason);
            setSucceeded(true);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <>
            <div className="fixed inset-0 z-60 bg-black/40 backdrop-blur-sm" onClick={succeeded ? undefined : onCancel} />
            <div className={`fixed z-70 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-sm ${bg} border rounded-3xl p-6 shadow-2xl`}>

                {succeeded ? (
                    /* ── Success state ── */
                    <div className="flex flex-col items-center justify-center py-4 gap-3 text-center">
                        <div className="w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center">
                            <CheckCircleIcon size={32} weight="fill" className="text-secondary" />
                        </div>
                        <p className={`text-base font-bold font-body ${titleColor}`}>
                            {context === 'staff' ? 'Cancellation Requested' : 'Order Cancelled'}
                        </p>
                        <p className={`text-sm font-body ${subColor}`}>
                            {context === 'staff'
                                ? `#${orderNumber} — a manager will review your request.`
                                : `#${orderNumber} has been successfully cancelled.`}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="flex items-start justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-error/12 flex items-center justify-center shrink-0">
                                    <ProhibitIcon size={20} weight="fill" className="text-error" />
                                </div>
                                <div>
                                    <p className={`text-sm font-bold font-body ${titleColor}`}>Cancel Order</p>
                                    <p className={`text-xs font-body ${subColor}`}>#{orderNumber}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onCancel}
                                className={`w-7 h-7 flex items-center justify-center rounded-full ${isDark ? 'hover:bg-brown-light/10' : 'hover:bg-neutral-light'} transition-colors cursor-pointer`}
                            >
                                <XIcon size={14} className={subColor} />
                            </button>
                        </div>

                        {/* Reason presets */}
                        <p className={`text-[11px] font-bold font-body uppercase tracking-wider ${subColor} mb-2.5`}>
                            Select a reason
                        </p>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {presets.map(r => (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => setSelected(r)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium font-body transition-all cursor-pointer ${selected === r ? chipActive : chipBase}`}
                                >
                                    {r}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => setSelected('__custom__')}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium font-body transition-all cursor-pointer ${selected === '__custom__' ? chipActive : chipBase}`}
                            >
                                Other…
                            </button>
                        </div>

                        {/* Custom reason input */}
                        {selected === '__custom__' && (
                            <textarea
                                value={custom}
                                onChange={e => setCustom(e.target.value)}
                                placeholder="Tell us more…"
                                rows={2}
                                className={`w-full rounded-xl px-3 py-2.5 text-sm font-body resize-none outline-none transition-colors ${inputClass} mb-3`}
                                autoFocus
                            />
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 mt-4">
                            <button
                                type="button"
                                onClick={onCancel}
                                disabled={isLoading}
                                className={`flex-1 py-2.5 rounded-full text-sm font-semibold font-body transition-colors cursor-pointer disabled:opacity-40 ${isDark ? 'border border-brown-light/25 text-neutral-gray hover:text-text-light' : 'border border-[#f0e8d8] text-neutral-gray hover:text-text-dark'}`}
                            >
                                Keep Order
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                disabled={isLoading || (!reason)}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full bg-error hover:bg-error/80 text-white text-sm font-semibold font-body transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading
                                    ? <><SpinnerIcon size={14} className="animate-spin" /> Cancelling…</>
                                    : 'Cancel Order'
                                }
                            </button>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
