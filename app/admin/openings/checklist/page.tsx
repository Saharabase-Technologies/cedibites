'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { EyeIcon, EyeSlashIcon, PencilSimpleIcon, PlusIcon } from '@phosphor-icons/react';
import {
    FilterBar,
    FilterSelect,
    InventoryModal,
    PageHeader,
    RowActionsMenu,
    SearchBar,
    SegmentedTabs,
} from '@/app/inventory/_components';
import { TONE } from '@/app/inventory/_components/status-tokens';
import { openingService } from '@/lib/api/services/opening.service';
import { toast } from '@/lib/utils/toast';
import type { ChecklistItem, ShowIf } from '@/types/opening';
import { ChecklistLineForm, KIND_TEXT } from '../_components/ChecklistLineForm';
import { Pill } from '../_components/OpeningStatusBadge';
import { OpeningsTabs } from '../_components/OpeningsTabs';

type Show = '' | 'must_pass' | 'sometimes' | 'off';

/**
 * What the opening checklist asks.
 *
 * Read first, changed on purpose: each line is a sentence to scan, and
 * changing one opens it on its own. Each morning copies the checklist as it
 * stands, so a change applies from the next opening and never rewrites a day
 * already done.
 */
export default function ChecklistEditorPage() {
    const queryClient = useQueryClient();
    const { data: items = [], isLoading, error, refetch } = useQuery({
        queryKey: ['opening-checklist'],
        queryFn: openingService.checklist,
    });

    const [tab, setTab] = useState('all');
    const [query, setQuery] = useState('');
    const [show, setShow] = useState<Show>('');
    const [editing, setEditing] = useState<ChecklistItem | null>(null);
    const [adding, setAdding] = useState(false);

    const byKey = useMemo(() => new Map(items.map((i) => [i.key, i])), [items]);
    const sections = useMemo(() => [...new Set(items.map((i) => i.section))], [items]);
    const setsBySection = useMemo(() => {
        const map = new Map<string, string[]>();
        for (const i of items) {
            if (!map.has(i.section)) map.set(i.section, []);
            if (i.group && !map.get(i.section)!.includes(i.group)) map.get(i.section)!.push(i.group);
        }
        return map;
    }, [items]);

    const q = query.trim().toLowerCase();
    const visible = groupLines(items.filter((i) =>
        (tab === 'all' || i.section === tab)
        && (!q || [i.label, i.short, i.group ?? ''].some((s) => s.toLowerCase().includes(q)))
        && (show === ''
            || (show === 'must_pass' && i.weight === 'must_pass')
            || (show === 'sometimes' && !!i.show_if)
            || (show === 'off' && !i.is_active)),
    ));

    const asked = items.filter((i) => i.is_active).length;

    async function setAsked(item: ChecklistItem, value: boolean) {
        try {
            await openingService.updateItem(item.id, { is_active: value });
            await queryClient.invalidateQueries({ queryKey: ['opening-checklist'] });
            toast.success(value ? `"${item.short}" is asked again from the next opening.` : `"${item.short}" is no longer asked.`);
        } catch (err) {
            toast.error((err as Error).message);
        }
    }

    const askedWhen = (item: ChecklistItem) => (item.show_if ? describeRule(item.show_if, byKey) : null);
    const closeEdit = () => setEditing(null);
    const closeAdd = () => setAdding(false);

    return (
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
            <PageHeader
                title="Openings"
                subtitle={isLoading ? ' ' : `${asked} lines asked each morning. A change applies from the next opening.`}
                action={items.length ? { label: 'Add a line', onClick: () => setAdding(true), icon: <PlusIcon size={16} weight="bold" /> } : undefined}
            />
            <OpeningsTabs />

            <FilterBar>
                <SegmentedTabs
                    options={[{ value: 'all', label: 'All' }, ...sections.map((s) => ({ value: s, label: sectionName(s) }))]}
                    value={tab}
                    onChange={setTab}
                />
                <SearchBar value={query} onChange={setQuery} placeholder="Find a line" />
                <FilterSelect
                    value={show}
                    onChange={(v) => setShow(v as Show)}
                    placeholder="Every line"
                    options={[
                        { value: 'must_pass', label: 'Must pass' },
                        { value: 'sometimes', label: 'Asked only sometimes' },
                        { value: 'off', label: 'Not asked' },
                    ]}
                />
            </FilterBar>

            {isLoading && (
                <div className="space-y-2 rounded-2xl border border-[#f0e8d8] bg-neutral-card p-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-12 animate-pulse rounded-lg bg-neutral-light" />
                    ))}
                </div>
            )}

            {error && !items.length && (
                <div className="rounded-2xl border border-[#f0e8d8] bg-neutral-card px-6 py-12 text-center">
                    <p className="font-body text-sm font-semibold text-text-dark">The checklist could not be loaded.</p>
                    <button
                        type="button"
                        onClick={() => refetch()}
                        className="mt-3 min-h-11 rounded-xl border border-[#e3ddd0] bg-neutral-card px-4 font-body text-sm font-semibold text-text-dark hover:border-neutral-gray/50 cursor-pointer"
                    >
                        Try again
                    </button>
                </div>
            )}

            {!isLoading && items.length > 0 && visible.length === 0 && (
                <div className="rounded-2xl border border-[#f0e8d8] bg-neutral-card px-6 py-12 text-center">
                    <p className="font-body text-sm font-semibold text-text-dark">No line matches.</p>
                    <button
                        type="button"
                        onClick={() => { setQuery(''); setShow(''); setTab('all'); }}
                        className="mt-3 min-h-11 rounded-xl px-4 font-body text-sm font-semibold text-primary hover:underline cursor-pointer"
                    >
                        Show every line
                    </button>
                </div>
            )}

            <div className="space-y-5">
                {visible.map(({ section, groups, count, mustPass }) => (
                    <section key={section} className="overflow-hidden rounded-2xl border border-[#f0e8d8] bg-neutral-card">
                        <div className="flex items-baseline justify-between gap-3 border-b border-[#f0e8d8] px-5 py-4">
                            <h2 className="font-body text-sm font-semibold text-text-dark">{section}</h2>
                            <p className="shrink-0 font-body text-xs text-neutral-gray tabular-nums">
                                {count} {count === 1 ? 'line' : 'lines'}{mustPass ? `, ${mustPass} must pass` : ''}
                            </p>
                        </div>
                        {groups.map(({ group, lines }) => (
                            <div key={group}>
                                <p className="bg-neutral-light/60 px-5 py-2 font-body text-[11px] font-semibold uppercase tracking-wider text-neutral-gray">
                                    {group}
                                </p>
                                <ul className="divide-y divide-[#f0e8d8]">
                                    {lines.map((item) => (
                                        <Line
                                            key={item.id}
                                            item={item}
                                            askedWhen={askedWhen(item)}
                                            onEdit={() => setEditing(item)}
                                            onAsked={(v) => setAsked(item, v)}
                                        />
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </section>
                ))}
            </div>

            <InventoryModal isOpen={editing !== null} onClose={closeEdit} title="Change the line" size="lg">
                {editing && (
                    <ChecklistLineForm
                        key={editing.id}
                        item={editing}
                        sections={sections}
                        setsBySection={setsBySection}
                        defaultSection={editing.section}
                        askedWhen={askedWhen(editing)}
                        onDone={closeEdit}
                    />
                )}
            </InventoryModal>

            <InventoryModal isOpen={adding} onClose={closeAdd} title="Add a line" size="lg">
                {adding && (
                    <ChecklistLineForm
                        sections={sections}
                        setsBySection={setsBySection}
                        defaultSection={tab !== 'all' ? tab : sections[0] ?? ''}
                        onDone={closeAdd}
                    />
                )}
            </InventoryModal>
        </div>
    );
}

function Line({
    item,
    askedWhen,
    onEdit,
    onAsked,
}: {
    item: ChecklistItem;
    askedWhen: string | null;
    onEdit: () => void;
    onAsked: (value: boolean) => void;
}) {
    return (
        <li className={`flex items-start gap-2 px-5 py-3 transition-colors hover:bg-primary/5 ${item.is_active ? '' : 'bg-neutral-light/40'}`}>
            <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left cursor-pointer">
                <span className={`block font-body text-sm ${item.is_active ? 'text-text-dark' : 'text-neutral-gray'}`}>{item.label}</span>
                <span className="mt-0.5 block font-body text-xs text-neutral-gray">
                    In texts: {item.short}.{item.kind !== 'check' ? ` ${KIND_TEXT[item.kind]}` : ''}
                    {askedWhen ? ` ${askedWhen}` : ''}
                </span>
                {(item.weight === 'must_pass' || item.allows_na || !item.is_active) && (
                    <span className="mt-1.5 flex flex-wrap gap-1.5">
                        {!item.is_active && <Pill label="Not asked" tone={TONE.settled} />}
                        {item.weight === 'must_pass' && <Pill label="Must pass" tone={TONE.problem} />}
                        {item.allows_na && <Pill label="Offers Not needed" tone={TONE.neutral} />}
                    </span>
                )}
            </button>
            <RowActionsMenu
                actions={[
                    { label: 'Change', icon: <PencilSimpleIcon size={15} />, onClick: onEdit },
                    item.is_active
                        ? { label: 'Stop asking it', icon: <EyeSlashIcon size={15} />, onClick: () => onAsked(false) }
                        : { label: 'Ask it again', icon: <EyeIcon size={15} />, onClick: () => onAsked(true) },
                ]}
            />
        </li>
    );
}

/** "Staffing and team readiness" on a tab: the first word. */
function sectionName(section: string): string {
    return section.split(' ')[0];
}

/** Lines by section, then by set, keeping the checklist's own order. Notes sit last. */
function groupLines(items: ChecklistItem[]) {
    const sections = new Map<string, Map<string, ChecklistItem[]>>();
    for (const item of items) {
        const group = item.group ?? 'Notes';
        if (!sections.has(item.section)) sections.set(item.section, new Map());
        const groups = sections.get(item.section)!;
        if (!groups.has(group)) groups.set(group, []);
        groups.get(group)!.push(item);
    }
    return [...sections.entries()].map(([section, groups]) => {
        const all = [...groups.values()].flat();
        const ordered = [...groups.entries()].sort(([a], [b]) => Number(a === 'Notes') - Number(b === 'Notes'));
        return {
            section,
            groups: ordered.map(([group, lines]) => ({ group, lines })),
            count: all.length,
            mustPass: all.filter((i) => i.weight === 'must_pass').length,
        };
    });
}

/** When a line is asked, in words, from the rule the seeder put on it. */
function describeRule(rule: ShowIf, byKey: Map<string, ChecklistItem>): string | null {
    if ('when' in rule && rule.when) {
        const other = byKey.get(rule.when);
        const is = rule.is ?? 'problem';
        const answer = is === 'problem' ? 'a problem' : is === 'ok' ? 'a Yes' : 'Not needed';
        return `Asked only when ${other ? other.short : 'another line'} is ${answer}.`;
    }
    if ('any_problem' in rule && rule.any_problem?.length) {
        const scopes = rule.any_problem;
        const list = scopes.length === 1 ? scopes[0] : `${scopes.slice(0, -1).join(', ')} or ${scopes[scopes.length - 1]}`;
        return `Asked only when something under ${list} is a problem.`;
    }
    return null;
}
