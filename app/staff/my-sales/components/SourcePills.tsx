'use client';

import type { OrderSource } from '../types';
import { SOURCE_ICON, SOURCE_LABEL } from '../constants';

interface SourcePillsProps {
    breakdown: [string, number][];
}

export default function SourcePills({ breakdown }: SourcePillsProps) {
    if (breakdown.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2 mb-6">
            {breakdown.map(([src, count]) => {
                const Icon = SOURCE_ICON[src as OrderSource];
                return (
                    <div
                        key={src}
                        className="flex items-center gap-1.5 bg-transparent border border-neutral-gray rounded-full px-3 py-2"
                    >
                        <Icon size={12} weight="fill" className="text-neutral-gray" />
                        <span className="text-text-dark dark:text-neutral-gray text-xs font-body">{SOURCE_LABEL[src as OrderSource]}</span>
                        <span className="text-text-dark dark:text-text-light/50 text-xs font-bold font-body">{count}</span>
                    </div>
                );
            })}
        </div>
    );
}
