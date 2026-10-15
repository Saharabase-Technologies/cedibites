import { TONE, type StatusTone } from '@/app/inventory/_components/status-tokens';

export type PillTone = keyof typeof TONE;

/** A state badge. State sits in a pill beside what it describes, never in a side border. */
export function Pill({ tone, children }: { tone: PillTone; children: React.ReactNode }) {
    const style: StatusTone = TONE[tone];
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold font-body whitespace-nowrap ${style.bg} ${style.text}`}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} aria-hidden />
            {children}
        </span>
    );
}
