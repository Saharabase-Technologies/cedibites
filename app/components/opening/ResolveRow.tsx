'use client';

import { useState } from 'react';
import { openingService } from '@/lib/api/services/opening.service';
import { toast } from '@/lib/utils/toast';
import type { OpeningAnswer } from '@/types/opening';
import { PhotoStrip } from './PhotoStrip';

/**
 * A problem admitted at opening, and the button that marks it fixed. Saying
 * what was done is required; a photo of the fix is optional, and the server
 * files it as the fix rather than the problem.
 */
export function ResolveRow({
    branchId,
    answer,
    myUserId,
    onFixed,
}: {
    branchId: number;
    answer: OpeningAnswer;
    myUserId?: number;
    onFixed: (a: OpeningAnswer) => void;
}) {
    const [open, setOpen] = useState(false);
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);

    async function save() {
        setBusy(true);
        try {
            onFixed(await openingService.resolve(branchId, answer.id, note.trim()));
            toast.success(`${capitalise(answer.short)} marked fixed.`);
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <li className="py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 basis-56">
                    <p className="font-body text-sm font-semibold text-text-dark">{capitalise(answer.short)}</p>
                    <p className="font-body text-sm text-neutral-gray">{answer.note}</p>
                </div>
                {!open && (
                    <button type="button" onClick={() => setOpen(true)}
                        className="min-h-11 rounded-xl border border-[#e3ddd0] bg-white px-4 font-body text-sm font-semibold text-text-dark hover:border-neutral-gray/50 cursor-pointer">
                        Mark fixed
                    </button>
                )}
            </div>
            <div className="mt-2"><PhotoStrip branchId={branchId} answer={answer} myUserId={myUserId} onChange={onFixed} /></div>
            {open && (
                <div className="mt-2 flex flex-col gap-2">
                    <textarea
                        aria-label={`What was done about ${answer.short}`}
                        placeholder="What was done to fix it?"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={2}
                        autoFocus
                        className="w-full min-h-11 resize-y rounded-xl border border-[#e3e1de] bg-[#f5f4f2] px-3.5 py-2.5 font-body text-sm text-text-dark focus:outline-none focus:border-primary"
                    />
                    <div className="flex gap-2">
                        <button type="button" onClick={save} disabled={busy || note.trim().length < 3}
                            className="min-h-11 rounded-xl bg-primary px-5 font-body text-sm font-semibold text-white hover:bg-primary/90 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50">
                            {busy ? 'Saving...' : 'Save'}
                        </button>
                        <button type="button" onClick={() => setOpen(false)}
                            className="min-h-11 rounded-xl px-4 font-body text-sm font-semibold text-neutral-gray hover:text-text-dark cursor-pointer">
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </li>
    );
}

function capitalise(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}
