import type { State } from './shiftSalesFormat';

/** A shift's sign-off state, as a TONE pill. */
export function StatePill({ state }: { state: State }) {
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${state.bg} ${state.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${state.dot}`} aria-hidden />
            {state.label}
        </span>
    );
}
