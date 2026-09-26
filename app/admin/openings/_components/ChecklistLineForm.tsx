'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FormField, PrimaryButton, Select, SegmentedTabs, TextInput, Textarea, Toggle } from '@/app/inventory/_components';
import { openingService } from '@/lib/api/services/opening.service';
import { toast } from '@/lib/utils/toast';
import type { AnswerKind, AnswerWeight, ChecklistItem } from '@/types/opening';

export const KIND_TEXT: Record<AnswerKind, string> = {
    check: 'Answered Yes or Problem.',
    number: 'Answered with a number.',
    text: 'Answered with a note.',
};

/**
 * Adding a line, or changing one. What kind of answer a line takes is fixed
 * once it exists, because every morning already done kept its answers in
 * that shape.
 */
export function ChecklistLineForm({
    item,
    sections,
    setsBySection,
    defaultSection,
    askedWhen,
    onDone,
}: {
    item?: ChecklistItem;
    sections: string[];
    setsBySection: Map<string, string[]>;
    defaultSection: string;
    askedWhen?: string | null;
    onDone: () => void;
}) {
    const queryClient = useQueryClient();
    const editing = !!item;

    const [section, setSection] = useState(item?.section ?? defaultSection);
    const [kind, setKind] = useState<AnswerKind>(item?.kind ?? 'check');
    const sets = setsBySection.get(section) ?? [];
    const [group, setGroup] = useState<string>(item?.group ?? sets[0] ?? '');
    const [label, setLabel] = useState(item?.label ?? '');
    const [short, setShort] = useState(item?.short ?? '');
    const [help, setHelp] = useState(item?.help ?? '');
    const [weight, setWeight] = useState<AnswerWeight>(item?.weight === 'must_pass' ? 'must_pass' : 'can_open');
    const [allowsNa, setAllowsNa] = useState(item?.allows_na ?? false);
    const [active, setActive] = useState(item?.is_active ?? true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const valid = label.trim().length >= 3 && short.trim().length >= 2;
    const isCheck = kind === 'check';

    // Only what changed, so a save never rewrites a field nobody touched.
    const patch: Partial<ChecklistItem> = {};
    if (item) {
        if (label.trim() !== item.label) patch.label = label.trim();
        if (short.trim() !== item.short) patch.short = short.trim();
        if ((help.trim() || null) !== (item.help || null)) patch.help = help.trim() || null;
        if (kind !== 'text' && group && group !== item.group) patch.group = group;
        if (isCheck && weight !== item.weight) patch.weight = weight;
        if (isCheck && allowsNa !== item.allows_na) patch.allows_na = allowsNa;
        if (active !== item.is_active) patch.is_active = active;
    }
    const dirty = !item || Object.keys(patch).length > 0;

    function chooseSection(next: string) {
        setSection(next);
        setGroup(setsBySection.get(next)?.[0] ?? '');
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!valid || !dirty) return;
        setBusy(true);
        setError(null);
        try {
            if (item) {
                await openingService.updateItem(item.id, patch);
            } else {
                await openingService.createItem({
                    section,
                    group: kind === 'text' ? null : group || null,
                    label: label.trim(),
                    short: short.trim(),
                    help: help.trim() || null,
                    kind,
                    weight: isCheck ? weight : 'record',
                    allows_na: isCheck ? allowsNa : false,
                });
            }
            await queryClient.invalidateQueries({ queryKey: ['opening-checklist'] });
            toast.success(item ? 'Saved. It applies from the next opening.' : 'Added. It is asked from the next opening.');
            onDone();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <form onSubmit={submit} className="flex flex-col gap-4">
            {editing ? (
                <div className="rounded-xl bg-neutral-light/70 px-4 py-3 font-body text-sm text-neutral-gray">
                    <p>
                        <span className="font-semibold text-text-dark">{item.section}.</span> {KIND_TEXT[item.kind]}
                    </p>
                    {askedWhen && <p className="mt-0.5">{askedWhen}</p>}
                </div>
            ) : (
                <>
                    <FormField label="Section" htmlFor="line-section">
                        <Select id="line-section" value={section} onChange={(e) => chooseSection(e.target.value)}>
                            {sections.map((s) => <option key={s} value={s}>{s}</option>)}
                        </Select>
                    </FormField>
                    <div className="flex flex-col gap-1.5">
                        <p className="font-body text-sm font-medium text-text-dark">Answered with</p>
                        <div>
                            <SegmentedTabs
                                options={[
                                    { value: 'check', label: 'Yes or Problem' },
                                    { value: 'number', label: 'A number' },
                                    { value: 'text', label: 'A note' },
                                ]}
                                value={kind}
                                onChange={setKind}
                            />
                        </div>
                    </div>
                </>
            )}

            <FormField label="What the manager is asked" htmlFor="line-label" required>
                <Textarea
                    id="line-label"
                    rows={2}
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="For example: Delivery bikes fuelled and working."
                    autoFocus={!editing}
                />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Short name" htmlFor="line-short" hint="Used in texts to head office." required>
                    <TextInput id="line-short" value={short} onChange={(e) => setShort(e.target.value)} placeholder="bikes" />
                </FormField>
                {kind !== 'text' && sets.length > 0 && (
                    <FormField label="Set" htmlFor="line-set" hint="The page it sits on in the checklist.">
                        <Select id="line-set" value={group} onChange={(e) => setGroup(e.target.value)}>
                            {sets.map((g) => <option key={g} value={g}>{g}</option>)}
                        </Select>
                    </FormField>
                )}
            </div>

            <FormField label="Help line" htmlFor="line-help" hint="Shown in small type under the question. Leave it empty for none.">
                <TextInput id="line-help" value={help} onChange={(e) => setHelp(e.target.value)} placeholder="Enough for today?" />
            </FormField>

            {isCheck && (
                <FormField label="When the answer is Problem" htmlFor="line-weight">
                    <Select id="line-weight" value={weight} onChange={(e) => setWeight(e.target.value as AnswerWeight)}>
                        <option value="can_open">The branch can still open. Head office is told.</option>
                        <option value="must_pass">The branch stays shut. Only head office can open it.</option>
                    </Select>
                </FormField>
            )}

            {(isCheck || editing) && (
                <div className="flex flex-wrap gap-x-6 gap-y-3">
                    {isCheck && <Toggle checked={allowsNa} onChange={setAllowsNa} label="Offer Not needed" />}
                    {editing && <Toggle checked={active} onChange={setActive} label="Asked each morning" />}
                </div>
            )}

            {error && <p className="font-body text-sm text-rose-700">{error}</p>}

            <PrimaryButton type="submit" loading={busy} disabled={!valid || !dirty}>
                {editing ? 'Save the line' : 'Add the line'}
            </PrimaryButton>
        </form>
    );
}
