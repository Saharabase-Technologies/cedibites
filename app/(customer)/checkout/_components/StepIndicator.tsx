'use client';

import React from 'react';
import { CheckCircleIcon } from '@phosphor-icons/react';
import type { Step } from './types';

// ─── Step Indicator ───────────────────────────────────────────────────────────
export default function StepIndicator({ current }: { current: Step }) {
    const steps = [{ n: 1, label: 'Details' }, { n: 2, label: 'Payment' }, { n: 3, label: 'Processing' }, { n: 4, label: 'Done' }];
    return (
        <div className="flex items-center">
            {steps.map((s, i) => {
                const done = current > s.n; const active = current === s.n;
                return (
                    <React.Fragment key={s.n}>
                        <div className="flex items-center gap-1.5">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${done ? 'bg-secondary text-white' : active ? 'bg-primary text-white' : 'bg-neutral-gray/20 text-neutral-gray'}`}>
                                {done ? <CheckCircleIcon weight="fill" size={16} /> : s.n}
                            </div>
                            <span className={`text-sm font-semibold hidden sm:inline transition-colors ${active ? 'text-text-dark dark:text-text-light' : done ? 'text-secondary' : 'text-neutral-gray'}`}>{s.label}</span>
                        </div>
                        {i < steps.length - 1 && <div className={`h-px w-8 sm:w-12 mx-2 transition-colors ${current > s.n ? 'bg-secondary' : 'bg-neutral-gray/20'}`} />}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
