'use client';

import type { ElementType } from 'react';

interface StatCardProps {
    icon: ElementType;
    label: string;
    value: string;
    sub?: string;
    accent: string;
}

export default function StatCard({ icon: Icon, label, value, sub, accent }: StatCardProps) {
    return (
        <div className="bg-brown border dark:bg-brand-dark border-brown-light/15 rounded-2xl px-4 py-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
                {/* <Icon size={15} weight="fill" className={accent} /> */}
                <span className="text-neutral-gray text-sm font-bold font-body">{label}</span>
            </div>
            <p className={`text-3xl font-bold font-body leading-none ${accent}`}>{value}</p>
            {sub && <p className="text-neutral-gray text-xs font-body">{sub}</p>}
        </div>
    );
}
