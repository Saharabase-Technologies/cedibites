'use client';

import React, { useEffect, useRef } from 'react';

export interface MenuSection {
    id: string;
    label: string;
    count: number;
}

/**
 * Which part of the menu you are in, and how to get to another part.
 *
 * This replaced a filter. Tapping "Combos" used to hide the other 27 dishes and
 * leave you on a page of its own, and tapping "Soft bites" left you looking at
 * a page with one thing on it, because that category really does hold one item.
 * Jumping instead of filtering means the rest of the menu is always one scroll
 * away, and there is no empty state to design for.
 *
 * The active entry is driven by where the page actually is, not by what was
 * last tapped, so scrolling past the end of Combos moves the rail on its own.
 */
export default function SectionRail({
    sections,
    activeId,
    onJump,
    orientation,
}: {
    sections: MenuSection[];
    activeId: string | null;
    onJump: (id: string) => void;
    orientation: 'row' | 'column';
}) {
    const rail = useRef<HTMLDivElement>(null);

    /**
     * Keep the live section in view on the horizontal rail.
     *
     * On a phone the rail is wider than the screen, so without this the active
     * entry scrolls off to the left as you read down the menu and the control
     * stops answering the question it exists to answer.
     */
    useEffect(() => {
        if (orientation !== 'row' || !activeId || !rail.current) return;

        const entry = rail.current.querySelector<HTMLElement>(`[data-rail-id="${CSS.escape(activeId)}"]`);
        if (!entry) return;

        const railBox = rail.current.getBoundingClientRect();
        const entryBox = entry.getBoundingClientRect();

        // Only when it is actually out of view. Calling this on every tick
        // fights the reader's own horizontal scrolling.
        if (entryBox.left < railBox.left || entryBox.right > railBox.right) {
            entry.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, [activeId, orientation]);

    if (orientation === 'column') {
        return (
            <nav aria-label="Menu sections" className="flex flex-col gap-1">
                {sections.map(section => {
                    const active = section.id === activeId;
                    return (
                        <button
                            key={section.id}
                            onClick={() => onJump(section.id)}
                            aria-current={active ? 'true' : undefined}
                            className={`flex min-h-11 items-center gap-3 rounded-lg px-3.5 text-left text-sm transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-fill ${
                                active
                                    ? 'bg-primary-fill font-bold text-white'
                                    : 'font-medium text-fg hover:bg-surface-sunken'
                            }`}
                        >
                            <span className="min-w-0 flex-1 truncate">{section.label}</span>
                            <span className={`text-xs tabular-nums ${active ? 'text-white/75' : 'text-fg-muted'}`}>
                                {section.count}
                            </span>
                        </button>
                    );
                })}
            </nav>
        );
    }

    return (
        <div ref={rail} className="no-scrollbar overflow-x-auto">
            <nav aria-label="Menu sections" className="flex w-max gap-2 px-5 pb-3">
                {sections.map(section => {
                    const active = section.id === activeId;
                    return (
                        <button
                            key={section.id}
                            data-rail-id={section.id}
                            onClick={() => onJump(section.id)}
                            aria-current={active ? 'true' : undefined}
                            className={`flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-sm font-bold whitespace-nowrap transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-fill ${
                                active
                                    ? 'bg-primary-fill text-white'
                                    : 'border border-hairline bg-surface text-fg'
                            }`}
                        >
                            {section.label}
                            <span className={`text-xs tabular-nums ${active ? 'text-white/75' : 'text-fg-muted'}`}>
                                {section.count}
                            </span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
