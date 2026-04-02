'use client';

import { useRef, useState, useEffect } from 'react';
import { DotsThreeVertical } from '@phosphor-icons/react';

export interface ActionMenuItem {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    color?: string;
    hidden?: boolean;
}

interface ActionMenuProps {
    items: ActionMenuItem[];
}

export default function ActionMenu({ items }: ActionMenuProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    const visible = items.filter(i => !i.hidden);
    if (visible.length === 0) return null;

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="p-2 rounded-xl text-neutral-gray hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                title="Actions"
            >
                <DotsThreeVertical size={18} weight="bold" />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] bg-white rounded-xl shadow-lg border border-neutral-light py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    {visible.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.label}
                                type="button"
                                onClick={() => { setOpen(false); item.onClick(); }}
                                className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium font-body hover:bg-neutral-light/60 transition-colors cursor-pointer ${item.color ?? 'text-neutral-gray'}`}
                            >
                                <Icon size={14} weight="bold" />
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
