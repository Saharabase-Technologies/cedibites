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
 * These were filled pills, and the live one was filled red. Red is the action
 * colour on this side of the product, and which section you are reading is not
 * an action. The bottom tab bar settled the same argument the same way, with a
 * white lozenge rather than a red one.
 *
 * So the live section is simply darker, heavier, and underlined. No fill, no
 * border, no colour. Six pills across the top of a menu were competing with the
 * food for the eye, and losing would have been the right outcome.
 *
 * Jumping, not filtering. Tapping "Combos" used to hide the other 27 dishes;
 * tapping "Soft bites" left you on a page with one thing on it, because that
 * category really does hold one dish. The rail follows the scroll instead, so
 * the rest of the menu is always a thumb away and there is no empty state.
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
            <nav aria-label="Menu sections" className="flex flex-col">
                {sections.map(section => {
                    const active = section.id === activeId;
                    return (
                        <button
                            key={section.id}
                            onClick={() => onJump(section.id)}
                            aria-current={active ? 'true' : undefined}
                            className={`flex min-h-10 items-center gap-3 rounded-sm text-left text-sm transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg ${
                                active ? 'font-bold text-fg' : 'text-fg-muted hover:text-fg'
                            }`}
                        >
                            <span
                                aria-hidden
                                className={`h-4 w-0.5 shrink-0 rounded-full transition-colors duration-150 ease-out ${
                                    active ? 'bg-fg' : 'bg-transparent'
                                }`}
                            />
                            <span className="min-w-0 flex-1 truncate">{section.label}</span>
                            <span className="text-xs tabular-nums text-fg-subtle">{section.count}</span>
                        </button>
                    );
                })}
            </nav>
        );
    }

    return (
        <div ref={rail} className="no-scrollbar overflow-x-auto">
            <nav aria-label="Menu sections" className="flex w-max gap-5 px-5">
                {sections.map(section => {
                    const active = section.id === activeId;
                    return (
                        <button
                            key={section.id}
                            data-rail-id={section.id}
                            onClick={() => onJump(section.id)}
                            aria-current={active ? 'true' : undefined}
                            className={`shrink-0 border-b-2 pb-2.5 pt-0.5 text-sm whitespace-nowrap transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg ${
                                active
                                    ? 'border-fg font-bold text-fg'
                                    : 'border-transparent font-medium text-fg-muted'
                            }`}
                        >
                            {section.label}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
