'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SpinnerIcon } from '@phosphor-icons/react';
import { PageHeader } from '@/app/inventory/_components/PageHeader';
import { Select, TextInput, Toggle } from '@/app/inventory/_components/FormPrimitives';
import { openingService } from '@/lib/api/services/opening.service';
import { toast } from '@/lib/utils/toast';
import type { AnswerKind, AnswerWeight, ChecklistItem } from '@/types/opening';
import { OpeningsTabs } from '../_components/OpeningsTabs';

const KIND_LABEL: Record<AnswerKind, string> = { check: 'Yes or problem', number: 'A number', text: 'A note' };

/**
 * What the opening checklist asks.
 *
 * Each morning copies the checklist as it stands, so a change here applies
 * from the next opening and never rewrites a day already done.
 */
export default function ChecklistEditorPage() {
    const { data: items, isLoading, error } = useQuery({
        queryKey: ['opening-checklist'],
        queryFn: openingService.checklist,
    });

    const sections = useMemo(() => {
        const map = new Map<string, ChecklistItem[]>();
        for (const item of items ?? []) {
            if (!map.has(item.section)) map.set(item.section, []);
            map.get(item.section)!.push(item);
        }
        return [...map.entries()];
    }, [items]);

    return (
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
            <PageHeader
                title="The opening checklist"
                subtitle="A change applies from the next opening. Openings already done keep the questions they were asked."
            />
            <OpeningsTabs />

            {isLoading && <SpinnerIcon className="h-6 w-6 animate-spin text-primary" />}
            {error && <p className="text-sm font-body text-rose-700">{(error as Error).message}</p>}

            {sections.map(([section, list]) => (
                <section key={section} className="mb-8">
                    <h2 className="mb-2 font-brand text-lg text-text-dark">{section}</h2>
                    <ul className="divide-y divide-[#f0e8d8] rounded-2xl border border-[#f0e8d8] bg-neutral-card px-4">
                        {list.map((item) => <ItemRow key={item.id} item={item} />)}
                    </ul>
                    <AddItem section={section} groups={[...new Set(list.map((i) => i.group).filter(Boolean) as string[])]} />
                </section>
            ))}
        </div>
    );
}

function ItemRow({ item }: { item: ChecklistItem }) {
    const queryClient = useQueryClient();
    const [label, setLabel] = useState(item.label);
    const [short, setShort] = useState(item.short);
    const [busy, setBusy] = useState(false);
    const dirty = label !== item.label || short !== item.short;

    async function save(patch: Partial<ChecklistItem>) {
        setBusy(true);
        try {
            await openingService.updateItem(item.id, patch);
            await queryClient.invalidateQueries({ queryKey: ['opening-checklist'] });
            toast.success('Saved. It applies from the next opening.');
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <li className={`flex flex-col gap-2 py-3 ${item.is_active ? '' : 'opacity-60'}`}>
            <div className="flex flex-wrap items-center gap-2">
                <TextInput aria-label="What the manager is asked" value={label} onChange={(e) => setLabel(e.target.value)} className="min-w-0 flex-1 basis-80" />
                <TextInput aria-label="Short name, used in texts" value={short} onChange={(e) => setShort(e.target.value)} className="w-44" />
                {dirty && (
                    <button type="button" disabled={busy} onClick={() => save({ label: label.trim(), short: short.trim() })}
                        className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold font-body text-white hover:bg-primary/90 cursor-pointer disabled:opacity-50">
                        Save
                    </button>
                )}
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-body text-neutral-gray">
                <span>{item.group ? `${item.group}. ` : ''}{KIND_LABEL[item.kind]}</span>
                {item.kind === 'check' && (
                    <>
                        <label className="flex items-center gap-2">
                            <span className="sr-only">If the answer is a problem</span>
                            <Select
                                value={item.weight}
                                disabled={busy}
                                onChange={(e) => save({ weight: e.target.value as AnswerWeight })}
                                className="w-56"
                            >
                                <option value="can_open">A problem can be admitted</option>
                                <option value="must_pass">Must pass to open</option>
                            </Select>
                        </label>
                        <Toggle checked={item.allows_na} onChange={(v) => save({ allows_na: v })} label="Offer Not needed" />
                    </>
                )}
                <Toggle checked={item.is_active} onChange={(v) => save({ is_active: v })} label="Asked" />
            </div>
        </li>
    );
}

function AddItem({ section, groups }: { section: string; groups: string[] }) {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [label, setLabel] = useState('');
    const [short, setShort] = useState('');
    const [group, setGroup] = useState(groups[0] ?? '');
    const [kind, setKind] = useState<AnswerKind>('check');
    const [weight, setWeight] = useState<AnswerWeight>('can_open');
    const [busy, setBusy] = useState(false);

    async function add() {
        setBusy(true);
        try {
            await openingService.createItem({
                section,
                group: kind === 'text' ? null : group || null,
                label: label.trim(),
                short: short.trim(),
                kind,
                weight: kind === 'check' ? weight : 'record',
                allows_na: false,
            });
            await queryClient.invalidateQueries({ queryKey: ['opening-checklist'] });
            toast.success('Added. It is asked from the next opening.');
            setLabel('');
            setShort('');
            setOpen(false);
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setBusy(false);
        }
    }

    if (!open) {
        return (
            <button type="button" onClick={() => setOpen(true)} className="mt-2 min-h-11 text-sm font-semibold font-body text-primary hover:underline cursor-pointer">
                Add a line to {section.split(' ')[0].toLowerCase()}
            </button>
        );
    }

    return (
        <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-[#f0e8d8] bg-neutral-card p-4">
            <TextInput placeholder="What the manager is asked, for example: Delivery bikes fuelled and working." value={label} onChange={(e) => setLabel(e.target.value)} />
            <div className="flex flex-wrap gap-2">
                <TextInput placeholder="Short name for texts, for example: bikes" value={short} onChange={(e) => setShort(e.target.value)} className="w-60" />
                <Select value={kind} onChange={(e) => setKind(e.target.value as AnswerKind)} className="w-44">
                    <option value="check">Yes or problem</option>
                    <option value="number">A number</option>
                    <option value="text">A note</option>
                </Select>
                {kind !== 'text' && groups.length > 0 && (
                    <Select value={group} onChange={(e) => setGroup(e.target.value)} className="w-56">
                        {groups.map((g) => <option key={g} value={g}>{g}</option>)}
                    </Select>
                )}
                {kind === 'check' && (
                    <Select value={weight} onChange={(e) => setWeight(e.target.value as AnswerWeight)} className="w-56">
                        <option value="can_open">A problem can be admitted</option>
                        <option value="must_pass">Must pass to open</option>
                    </Select>
                )}
            </div>
            <div className="flex gap-2">
                <button type="button" onClick={add} disabled={busy || label.trim().length < 3 || short.trim().length < 2}
                    className="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold font-body text-white hover:bg-primary/90 cursor-pointer disabled:opacity-50">
                    {busy ? 'Adding...' : 'Add'}
                </button>
                <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-xl px-4 text-sm font-semibold font-body text-neutral-gray hover:text-text-dark cursor-pointer">
                    Cancel
                </button>
            </div>
        </div>
    );
}
