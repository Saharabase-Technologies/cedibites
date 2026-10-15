'use client';

import { useState } from 'react';
import { InventoryModal, PrimaryButton } from '@/app/inventory/_components';
import type { Publication } from '@/lib/api/services/menuPrices.service';
import { describeChange, formatWhen } from './format';
import { Pill } from './Pill';
import { BUTTON_QUIET } from './StatusCard';

/** Each time changes went live, who pressed it, what changed, and Undo on the latest. */
export function HistoryList({ history, onUndo }: { history: Publication[]; onUndo: (id: number) => Promise<void> }) {
    const [confirming, setConfirming] = useState<Publication | null>(null);
    const [busy, setBusy] = useState(false);

    if (history.length === 0) {
        return (
            <div className="bg-neutral-card border border-[#f0e8d8] rounded-2xl py-16 text-center">
                <p className="text-neutral-gray text-sm font-body">Nothing has gone live from this page yet.</p>
            </div>
        );
    }

    async function undo() {
        if (!confirming) return;
        setBusy(true);
        try {
            await onUndo(confirming.id);
            setConfirming(null);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="space-y-3">
            {history.map(p => (
                <details key={p.id} className="group bg-neutral-card border border-[#f0e8d8] rounded-2xl">
                    <summary className="flex flex-wrap items-center gap-3 px-4 py-3 cursor-pointer list-none min-h-11">
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold font-body text-text-dark">{title(p)}</p>
                                <StatusPill status={p.status} />
                            </div>
                            <p className="text-xs font-body text-neutral-gray mt-0.5">{byline(p)}</p>
                            {p.note && <p className="text-xs font-body text-neutral-gray mt-0.5">{p.note}</p>}
                        </div>
                        {p.status !== 'cancelled' && (
                            <span className="text-xs font-body text-neutral-gray tabular-nums">
                                {p.change_count} change{p.change_count === 1 ? '' : 's'}
                            </span>
                        )}
                        {p.can_undo && (
                            <button
                                type="button"
                                className={BUTTON_QUIET}
                                onClick={e => {
                                    e.preventDefault();
                                    setConfirming(p);
                                }}
                            >
                                Undo
                            </button>
                        )}
                    </summary>

                    {p.changes.length > 0 && (
                        <ul className="border-t border-[#f0e8d8] px-4 py-3 space-y-1">
                            {p.changes.map((c, i) => {
                                const d = describeChange(c);
                                return (
                                    <li key={i} className="grid grid-cols-[1fr_auto] gap-x-3 text-sm font-body">
                                        <span className="min-w-0 text-text-dark">
                                            {c.line_name} <span className="text-xs text-neutral-gray">{d.what}</span>
                                        </span>
                                        <span className="text-right tabular-nums whitespace-nowrap">
                                            <span className="text-neutral-gray">{d.from}</span>
                                            <span className="text-neutral-gray mx-1.5" aria-label="became">→</span>
                                            <span className="text-text-dark">{d.to}</span>
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </details>
            ))}

            {confirming && (
                <InventoryModal isOpen onClose={() => setConfirming(null)} title="Put the old values back?" size="sm">
                    <p className="text-sm font-body text-text-dark mb-2">
                        {confirming.change_count} change{confirming.change_count === 1 ? '' : 's'} from {formatWhen(confirming.published_at)} will be reversed.
                    </p>
                    <p className="text-sm font-body text-neutral-gray mb-5">
                        New options from that time come off the menu. A value somebody has changed since is left alone.
                    </p>
                    <PrimaryButton loading={busy} onClick={undo}>
                        Put the old values back
                    </PrimaryButton>
                </InventoryModal>
            )}
        </div>
    );
}

function title(p: Publication): string {
    if (p.status === 'cancelled') {
        return p.publish_at ? `Was set for ${formatWhen(p.publish_at)}` : 'Called off';
    }
    return `Went live ${formatWhen(p.published_at)}`;
}

function byline(p: Publication): string {
    const parts: string[] = [];
    if (p.status !== 'cancelled') {
        if (p.published_by) parts.push(`Pressed by ${p.published_by}.`);
        else if (p.scheduled_by) parts.push(`Set by ${p.scheduled_by}. Went live on time.`);
    }
    if (p.status === 'undone') {
        parts.push(`Put back by ${p.undone_by ?? 'someone'} on ${formatWhen(p.undone_at)}.`);
    }
    return parts.join(' ');
}

function StatusPill({ status }: { status: Publication['status'] }) {
    if (status === 'published') return <Pill tone="done">Live</Pill>;
    if (status === 'undone') return <Pill tone="settled">Undone</Pill>;
    return <Pill tone="neutral">Called off</Pill>;
}
