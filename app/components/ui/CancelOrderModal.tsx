'use client';

import { useState } from 'react';
import { XIcon, ProhibitIcon, SpinnerIcon } from '@phosphor-icons/react';

const REASON_PRESETS = [
    'Changed my mind',
    'Ordered by mistake',
    'Taking too long',
    'Found a better option',
    'Wrong items ordered',
    'Payment issue',
];

interface CancelOrderModalProps {
    orderNumber: string;
    onConfirm: (reason: string) => Promise<void>;
    onCancel: () => void;
    /** Dark theme for staff panels, light for customer/admin */
    theme?: 'dark' | 'light';
}

export default function CancelOrderModal({
    orderNumber,
    onConfirm,
    onCancel,
    theme = 'light',
}: CancelOrderModalProps) {
    const [selected, setSelected] = useState<string | null>(null);
    const [custom, setCustom] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const reason = selected === '__custom__' ? custom.trim() : (selected ?? '');

    const isDark = theme === 'dark';

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

    async function handleConfirm() {
        setIsLoading(true);
        try {
            await onConfirm(reason);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <>
            <div className="fixed inset-0 z-60 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
            <div className={`fixed z-70 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-sm ${bg} border rounded-3xl p-6 shadow-2xl`}>

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
                    {REASON_PRESETS.map(r => (
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
            </div>
        </>
    );
}
