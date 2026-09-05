'use client';

import { useEffect, useState } from 'react';
import { useBranch } from '../providers/BranchProvider';
import { useAuth } from '../providers/AuthProvider';
import { serverNow } from '@/lib/utils/serverClock';

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
    const isOpen = selectedBranch?.isOpen;

    return (
        // Indented by exactly the hero frame's own padding, so the greeting
        // lands on the same vertical as the red block inside the photograph
        // below it. Both are display type; lining them up is what makes the top
        // of the screen read as one thing rather than two.
        <div className="flex flex-col gap-1 pl-4 sm:pl-6">
            <h1 className="font-brand text-4xl leading-none tracking-wide text-fg md:text-5xl">
                {greeting ?? 'Welcome'}{firstName ? `, ${firstName}` : ''}
            </h1>

            {selectedBranch && typeof isOpen === 'boolean' && (
                <p className="flex items-center gap-2 text-sm">
                    <span
                        aria-hidden
                        className={`h-2 w-2 shrink-0 rounded-xs ${isOpen ? 'bg-success' : 'bg-danger'}`}
                    />
                    <span className={`font-bold ${isOpen ? 'text-success-ink' : 'text-danger-ink'}`}>
                        {isOpen ? 'Open now' : 'Closed'}
                    </span>
                </p>
            )}
        </div>
    );
}
