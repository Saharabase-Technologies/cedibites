'use client';

import React from 'react';


// ─── Input Field ──────────────────────────────────────────────────────────────
export default function InputField({ icon, label, required, children }: { icon: React.ReactNode; label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-gray flex items-center gap-1.5">
                {label}{required && <span className="text-error">*</span>}
            </label>
            <div className="relative flex items-center bg-neutral-light dark:bg-brand-dark border-2 border-neutral-gray/50 focus-within:border-primary rounded-xl transition-all overflow-hidden">
                <span className="pl-3.5 text-neutral-gray shrink-0">{icon}</span>
                <div className="flex-1 px-3 py-2.5 text-sm">{children}</div>
            </div>
        </div>
    );
}
