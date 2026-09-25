'use client';

import { useEffect, useState } from 'react';
import { useBranch } from '../providers/BranchProvider';
import { useAuth } from '../providers/AuthProvider';
import { serverNow } from '@/lib/utils/serverClock';
import ActiveOrderChip from './ActiveOrderChip';
import { branchOpenState, OPEN_STATE_INK, OPEN_STATE_LABEL } from '@/lib/utils/branchOpenState';

function greetingFor(hour: number): string {
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

/**
 * Replaces the tall gradient greeting card.
 *
 * It carries the two things the header chip does not: the time of day, and
 * whether the kitchen is actually cooking. The branch name is already one tap
 * away at the top of the screen, so it is not repeated here.
 *
 * The hour comes from `serverNow()`. A phone with a wrong clock used to be able
 * to read "Good evening" at noon, and worse, to read Closed on an open branch.
 */
export default function GreetingBar() {
    const { selectedBranch } = useBranch();
    const { user } = useAuth();

    // Rendered after mount so the server pass and the first client pass agree.
    const [greeting, setGreeting] = useState<string | null>(null);
    useEffect(() => {
        const tick = () => setGreeting(greetingFor(serverNow().getHours()));
        tick();
        const t = setInterval(tick, 60_000);
        return () => clearInterval(t);
    }, []);

    const firstName = user?.name?.trim().split(/\s+/)[0];
    const openState = selectedBranch ? branchOpenState(selectedBranch) : null;

    return (
        // Indented by exactly the hero frame's own padding, so the greeting
        // lands on the same vertical as the red block inside the photograph
        // below it. Both are display type; lining them up is what makes the top
        // of the screen read as one thing rather than two.
        <div className="flex flex-col gap-2 px-4 sm:px-6">
            {/*
              * Two rows, not one.
              *
              * The greeting is display type at 36px and a name makes it long:
              * "GOOD MORNING, KWABENA" beside a chip forced the heading to wrap
              * mid-phrase on a phone, so the top of the screen read as four
              * ragged lines. It gets the full width to itself, and the two small
              * things — whether the kitchen is open, and the order on its way —
              * share the row underneath, where they are the same size and belong
              * together anyway.
              */}
            <h1 className="font-brand text-4xl leading-none tracking-wide text-balance text-fg md:text-5xl">
                {greeting ?? 'Welcome'}{firstName ? `, ${firstName}` : ''}
            </h1>

            <div className="flex items-center justify-between gap-3">
                {openState ? (
                    <p className="flex items-center gap-2 text-sm">
                        <span
                            aria-hidden
                            className={`h-2 w-2 shrink-0 rounded-xs ${OPEN_STATE_INK[openState].dot}`}
                        />
                        <span className={`font-bold ${OPEN_STATE_INK[openState].text}`}>
                            {OPEN_STATE_LABEL[openState]}
                        </span>
                    </p>
                ) : <span />}

                <ActiveOrderChip />
            </div>
        </div>
    );
}
