'use client';

import { XIcon } from '@phosphor-icons/react';
import { useEmployees } from '@/lib/api/hooks/useEmployees';
import { roleDisplayName } from '@/types/staff';

/**
 * Pick individual staff by name.
 *
 * Addresses people by their USERS-table id, never the employee id. Both are
 * small integers and either will usually resolve to somebody, so getting it
 * wrong does not error — it quietly messages the wrong person. See
 * StaffMember.userId.
 *
 * Suspended staff are filtered server-side by the audience resolver, so a name
 * picked here that has since been suspended drops out of the send rather than
 * failing it.
 */
export function PersonPicker({
    selected,
    query,
    onQueryChange,
    onToggle,
}: {
    selected: number[];
    query: string;
    onQueryChange: (value: string) => void;
    onToggle: (userId: number) => void;
}) {
    const { employees, isLoading } = useEmployees({ per_page: 200 });

    // `userId` is optional on StaffMember because the staff editor builds a
    // draft before the account exists. Anything from the API has one; narrowing
    // here keeps the rest of this component free of null checks.
    const addressable = (employees ?? []).filter(
        (person): person is typeof person & { userId: number } => typeof person.userId === 'number',
    );

    const chosen = addressable.filter((person) => selected.includes(person.userId));

    const matches = query.trim()
        ? addressable
              .filter((person) => {
                  const q = query.toLowerCase();
                  return (
                      (person.name ?? '').toLowerCase().includes(q) ||
                      (person.phone ?? '').toLowerCase().includes(q) ||
                      roleDisplayName(person.role).toLowerCase().includes(q)
                  );
              })
              .slice(0, 8)
        : [];

    return (
        <div>
            {chosen.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {chosen.map((person) => (
                        <button
                            key={person.userId}
                            type="button"
                            onClick={() => onToggle(person.userId)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-white text-xs font-body cursor-pointer"
                        >
                            {person.name}
                            <XIcon size={11} weight="bold" />
                        </button>
                    ))}
                </div>
            )}

            <input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder={isLoading ? 'Loading staff…' : 'Type a name…'}
                disabled={isLoading}
                // Card rather than neutral-light: this sits inside the audience
                // panel, which is itself neutral-light.
                className="w-full bg-neutral-card border border-[#e3ddd0] rounded-xl px-3.5 py-2.5 text-sm font-body text-text-dark placeholder:text-neutral-gray/70 focus:outline-none focus:border-primary transition-colors min-h-11"
            />

            {matches.length > 0 && (
                <ul className="mt-1.5 rounded-xl border border-[#e3ddd0] bg-neutral-card overflow-hidden divide-y divide-[#f0e8d8]">
                    {matches.map((person) => (
                        <li key={person.userId}>
                            <button
                                type="button"
                                onClick={() => {
                                    onToggle(person.userId);
                                    onQueryChange('');
                                }}
                                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-neutral-light transition-colors cursor-pointer"
                            >
                                <span className="font-body text-sm text-text-dark truncate">{person.name}</span>
                                <span className="font-body text-[11px] text-neutral-gray shrink-0">
                                    {roleDisplayName(person.role)}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {query.trim() && matches.length === 0 && !isLoading && (
                <p className="mt-1.5 font-body text-xs text-neutral-gray">Nobody by that name.</p>
            )}
        </div>
    );
}
