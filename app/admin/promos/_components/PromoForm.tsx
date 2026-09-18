'use client';

import { FormField, PrimaryButton, TextInput, Toggle } from '@/app/inventory/_components';
import { useBranch } from '@/app/components/providers/BranchProvider';
import { DeleteConfirmDialog } from '@/app/components/ui/DeleteConfirmDialog';
import { ApiError } from '@/lib/api/client';
import { useMenuItems } from '@/lib/api/hooks/useMenuItems';
import { usePromo } from '@/lib/api/hooks/usePromos';
import { getPromoService, type Promo, type PromoRedemption } from '@/lib/services/promos/promo.service';
import { toast } from '@/lib/utils/toast';
import { ArrowLeftIcon, CheckIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { DishPicker } from './DishPicker';
import { PromoCodesPanel } from './PromoCodesPanel';
import { PromoStatusBadge } from './PromoStatusBadge';
import { addDays, promoState, readBack, todayIso } from './promoFacts';

type Draft = Omit<Promo, 'id'>;

function emptyDraft(): Draft {
    const today = todayIso();
    return {
        name: '',
        redemption: 'automatic',
        code: '',
        type: 'percentage',
        value: 10,
        maxDiscount: undefined,
        scope: 'global',
        branchIds: [],
        appliesTo: 'order',
        itemIds: [],
        minOrderValue: undefined,
        maxOrderValue: undefined,
        maxUses: undefined,
        maxUsesPerCustomer: undefined,
        firstOrderOnly: false,
        startDate: today,
        endDate: addDays(today, 30),
        isActive: true,
        accountingCode: '',
    };
}

/** Laravel's field names, onto the form's. */
const FIELD_FOR: Record<string, string> = {
    name: 'name', code: 'code', redemption: 'redemption', value: 'value', max_discount: 'maxDiscount',
    min_order_value: 'minOrderValue', max_order_value: 'maxOrderValue', max_uses: 'maxUses',
    max_uses_per_customer: 'maxUsesPerCustomer', start_date: 'startDate', end_date: 'endDate',
    branch_ids: 'branchIds', item_ids: 'itemIds',
};

const HOW_OPTIONS: { value: PromoRedemption; label: string }[] = [
    { value: 'automatic', label: 'By itself' },
    { value: 'shared_code', label: 'One code' },
    { value: 'single_use', label: 'One-off codes' },
];

/**
 * Creating and editing a promo, as a page.
 *
 * It was a modal: fourteen fields in a box 512px wide, scrolling inside itself,
 * with the save button stuck to the bottom of the box. The form is one card of
 * sections now, each titled on the left, with the promo read back as plain
 * sentences in a column beside it. The read-back is the check: a rule nobody
 * meant is easier to see in "20% off, on the whole order, once per phone
 * number" than across the fields that produced it.
 */
export function PromoForm({ promoId }: { promoId?: string }) {
    const router = useRouter();
    const editing = Boolean(promoId);
    const { branches } = useBranch();
    const { items: dishes } = useMenuItems();

    const queryClient = useQueryClient();
    const promoQuery = usePromo(promoId);
    const saved = promoQuery.data ?? null;
    const loading = editing && promoQuery.isLoading;
    const missing = editing && !promoQuery.isLoading && !saved;

    // What somebody has changed, laid over the saved promo (or a blank one).
    // Keeping only the changes means the saved promo never has to be copied
    // into state, and a save that comes back refreshes the page underneath.
    const [blank] = useState<Draft>(emptyDraft);
    const [edits, setEdits] = useState<Partial<Draft>>({});
    const draft: Draft = { ...(saved ? fromSaved(saved) : blank), ...edits };

    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const refresh = () => queryClient.invalidateQueries({ queryKey: ['promos'] });

    const patch = (p: Partial<Draft>) => {
        setEdits(e => ({ ...e, ...p }));
        // An edited field's old complaint no longer applies to it.
        setErrors(e => {
            const next = { ...e };
            for (const k of Object.keys(p)) delete next[k];
            return next;
        });
    };

    const names = useMemo(() => ({
        branches: (id: string) => branches.find(b => b.id === id)?.name,
        dishes: (id: string) => dishes.find(d => d.id === id)?.name,
    }), [branches, dishes]);

    const sentences = readBack(draft, names);

    const blocker =
        !draft.name.trim() ? 'Give it a name.'
            : !(Number(draft.value) > 0) ? 'Say how much it takes off.'
                : draft.type === 'percentage' && Number(draft.value) > 100 ? 'A percentage cannot pass 100.'
                    : draft.redemption === 'shared_code' && !draft.code?.trim() ? 'Type the code customers will use.'
                        : draft.scope === 'branch' && (draft.branchIds?.length ?? 0) === 0 ? 'Choose at least one branch.'
                            : draft.appliesTo === 'items' && draft.itemIds.length === 0 ? 'Choose at least one dish.'
                                : draft.endDate < draft.startDate ? 'It cannot end before it starts.'
                                    : null;

    const save = async () => {
        if (blocker || saving) return;
        // Only what the choices shown actually use. A cap left over from when
        // it was a percentage would still apply to a fixed amount otherwise.
        const clean: Draft = {
            ...draft,
            name: draft.name.trim(),
            code: draft.redemption === 'shared_code' ? draft.code?.trim() : '',
            maxDiscount: draft.type === 'percentage' ? draft.maxDiscount : undefined,
            branchIds: draft.scope === 'branch' ? draft.branchIds : [],
            itemIds: draft.appliesTo === 'items' ? draft.itemIds : [],
        };

        setSaving(true);
        try {
            if (promoId) {
                await getPromoService().update(promoId, clean);
                toast.success(`${clean.name} is saved.`);
                await refresh();
                setEdits({});
            } else {
                const made = await getPromoService().create(clean);
                void refresh();
                toast.success(clean.redemption === 'single_use' ? `${clean.name} is saved. Make its codes below.` : `${clean.name} is saved.`);
                router.replace(`/admin/promos/${made.id}`);
            }
        } catch (err) {
            const api = err instanceof ApiError ? err : null;
            const fieldErrors: Record<string, string> = {};
            for (const [key, list] of Object.entries(api?.errors ?? {})) {
                const field = FIELD_FOR[key.split('.')[0]];
                if (field && list?.[0]) fieldErrors[field] = list[0];
            }
            setErrors(fieldErrors);
            toast.error(api?.message ?? 'The promo could not be saved. Try again.');
        } finally {
            setSaving(false);
        }
    };

    const remove = async () => {
        if (!promoId || !saved) return;
        setDeleting(true);
        try {
            await getPromoService().delete(promoId);
            toast.success(`${saved.name} is deleted.`);
            void refresh();
            router.replace('/admin/promos');
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'The promo could not be deleted.');
            setDeleting(false);
        }
    };

    if (missing) {
        return (
            <Frame>
                <p className="text-sm font-body text-neutral-gray">That promo is not there any more. It may have been deleted.</p>
            </Frame>
        );
    }

    if (loading) {
        return (
            <Frame>
                <div className="h-8 w-56 animate-pulse rounded-lg bg-neutral-light" />
                <div className="mt-6 h-96 animate-pulse rounded-2xl bg-neutral-light" />
            </Frame>
        );
    }

    const state = saved ? promoState(saved) : null;

    return (
        <Frame>
            <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold font-brand text-text-dark wrap-break-word">
                        {editing ? saved?.name : 'New promo'}
                    </h1>
                    {saved && (
                        <p className="mt-1 text-sm font-body text-neutral-gray tabular-nums">
                            {usageLine(saved)}
                        </p>
                    )}
                </div>
                {state && <PromoStatusBadge state={state} />}
            </header>

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="divide-y divide-[#f0e8d8] rounded-2xl border border-[#f0e8d8] bg-neutral-card">
                    <Section title="Name">
                        <FormField label="What customers see on the receipt" htmlFor="promo-name" error={errors.name}>
                            <TextInput
                                id="promo-name"
                                value={draft.name}
                                onChange={e => patch({ name: e.target.value })}
                                placeholder="Jollof Friday"
                                maxLength={255}
                            />
                        </FormField>
                    </Section>

                    <Section title="What it takes off">
                        <Choice
                            options={[{ value: 'percentage', label: 'A percentage' }, { value: 'fixed_amount', label: 'A fixed amount' }]}
                            value={draft.type}
                            onChange={type => patch({ type })}
                        />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FormField label={draft.type === 'percentage' ? 'Percentage off' : 'Amount off'} htmlFor="promo-value" error={errors.value}>
                                <Adorned before={draft.type === 'fixed_amount' ? '₵' : undefined} after={draft.type === 'percentage' ? '%' : undefined}>
                                    <TextInput
                                        id="promo-value"
                                        type="number"
                                        inputMode="decimal"
                                        min={0}
                                        max={draft.type === 'percentage' ? 100 : undefined}
                                        value={draft.value || ''}
                                        onChange={e => patch({ value: Number(e.target.value) })}
                                        className={`tabular-nums ${draft.type === 'fixed_amount' ? 'pl-8' : 'pr-9'}`}
                                    />
                                </Adorned>
                            </FormField>
                            {draft.type === 'percentage' && (
                                <FormField label="Most it can take off" htmlFor="promo-cap" hint="Leave empty for no cap." error={errors.maxDiscount}>
                                    <Adorned before="₵">
                                        <NumberBox id="promo-cap" value={draft.maxDiscount} onChange={maxDiscount => patch({ maxDiscount })} placeholder="30" className="pl-8" />
                                    </Adorned>
                                </FormField>
                            )}
                        </div>
                    </Section>

                    <Section title="How customers get it">
                        <Choice options={HOW_OPTIONS} value={draft.redemption} onChange={redemption => patch({ redemption })} />
                        {draft.redemption === 'automatic' && (
                            <p className="text-sm font-body text-neutral-gray">Every order that meets the rules below gets it. Nobody types anything.</p>
                        )}
                        {draft.redemption === 'shared_code' && (
                            <FormField label="The code" htmlFor="promo-code" hint="Anybody who has it can type it at checkout or give it to the cashier." error={errors.code}>
                                <TextInput
                                    id="promo-code"
                                    value={draft.code ?? ''}
                                    onChange={e => patch({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') })}
                                    placeholder="CEDI20"
                                    maxLength={20}
                                    autoComplete="off"
                                    spellCheck={false}
                                    className="font-mono font-semibold tracking-wider sm:max-w-xs"
                                />
                            </FormField>
                        )}
                        {draft.redemption === 'single_use' && (
                            <p className="text-sm font-body text-neutral-gray">
                                {saved?.redemption === 'single_use'
                                    ? 'Each code works for one order. Make them and download the list further down this page.'
                                    : 'Each code works for one order. Save the promo, then make the codes on this page.'}
                            </p>
                        )}
                    </Section>

                    <Section title="Where it counts">
                        <div className="flex flex-col gap-3">
                            <Choice
                                options={[{ value: 'global', label: 'Every branch' }, { value: 'branch', label: 'Chosen branches' }]}
                                value={draft.scope}
                                onChange={scope => patch({ scope })}
                            />
                            {draft.scope === 'branch' && (
                                <div className="flex flex-wrap gap-2">
                                    {branches.map(b => {
                                        const on = draft.branchIds?.includes(b.id) ?? false;
                                        return (
                                            <button
                                                key={b.id}
                                                type="button"
                                                aria-pressed={on}
                                                onClick={() => patch({ branchIds: on ? draft.branchIds?.filter(id => id !== b.id) : [...(draft.branchIds ?? []), b.id] })}
                                                className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium font-body transition-colors duration-150 ${on ? 'border-primary bg-primary/10 text-text-dark' : 'border-[#e3e1de] bg-[#f5f4f2] text-neutral-gray hover:text-text-dark'}`}
                                            >
                                                {on && <CheckIcon size={14} weight="bold" className="text-primary" />}
                                                {b.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            {errors.branchIds && <p className="text-xs font-body text-red-500">{errors.branchIds}</p>}
                        </div>

                        <div className="flex flex-col gap-3">
                            <Choice
                                options={[{ value: 'order', label: 'The whole order' }, { value: 'items', label: 'Chosen dishes' }]}
                                value={draft.appliesTo}
                                onChange={appliesTo => patch({ appliesTo })}
                            />
                            {draft.appliesTo === 'items' && (
                                <>
                                    <p className="text-sm font-body text-neutral-gray">It comes off those dishes only, not the rest of the order.</p>
                                    <DishPicker selected={draft.itemIds} onChange={itemIds => patch({ itemIds })} />
                                </>
                            )}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <FormField label="Smallest order" htmlFor="promo-min" hint="Leave empty for any size." error={errors.minOrderValue}>
                                <Adorned before="₵">
                                    <NumberBox id="promo-min" value={draft.minOrderValue} onChange={minOrderValue => patch({ minOrderValue })} placeholder="100" className="pl-8" />
                                </Adorned>
                            </FormField>
                            <FormField label="Largest order" htmlFor="promo-max" error={errors.maxOrderValue}>
                                <Adorned before="₵">
                                    <NumberBox id="promo-max" value={draft.maxOrderValue} onChange={maxOrderValue => patch({ maxOrderValue })} placeholder="No limit" className="pl-8" />
                                </Adorned>
                            </FormField>
                        </div>
                    </Section>

                    <Section title="Limits">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FormField label="Orders in all" htmlFor="promo-uses" hint="Leave empty for no limit." error={errors.maxUses}>
                                <NumberBox id="promo-uses" value={draft.maxUses} onChange={maxUses => patch({ maxUses })} placeholder="No limit" whole />
                            </FormField>
                            <FormField label="Times per phone number" htmlFor="promo-per" error={errors.maxUsesPerCustomer}>
                                <NumberBox id="promo-per" value={draft.maxUsesPerCustomer} onChange={maxUsesPerCustomer => patch({ maxUsesPerCustomer })} placeholder="No limit" whole />
                            </FormField>
                        </div>
                        <Toggle checked={Boolean(draft.firstOrderOnly)} onChange={firstOrderOnly => patch({ firstOrderOnly })} label="Only for somebody's first order" />
                        <p className="text-xs font-body text-neutral-gray">A cancelled order gives its use back. A limit by phone number needs the number at the till.</p>
                    </Section>

                    <Section title="When it runs">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FormField label="From" htmlFor="promo-start" error={errors.startDate}>
                                <TextInput id="promo-start" type="date" value={draft.startDate} onChange={e => patch({ startDate: e.target.value })} />
                            </FormField>
                            <FormField label="Until the end of" htmlFor="promo-end" error={errors.endDate}>
                                <TextInput id="promo-end" type="date" value={draft.endDate} min={draft.startDate} onChange={e => patch({ endDate: e.target.value })} />
                            </FormField>
                        </div>
                        <Toggle checked={draft.isActive} onChange={isActive => patch({ isActive })} label="Switched on" />
                    </Section>
                </div>

                <aside className="flex flex-col gap-3 lg:sticky lg:top-6">
                    <div className="rounded-2xl border border-[#f0e8d8] bg-neutral-card p-5">
                        <h2 className="text-sm font-semibold font-body text-text-dark">What the cashier would say</h2>
                        <div className="mt-3 flex flex-col gap-2 text-[15px] leading-relaxed font-body text-text-dark">
                            {sentences.map(line => <p key={line}>{line}</p>)}
                        </div>
                    </div>

                    {blocker && <p className="px-1 text-sm font-body text-amber-700">{blocker}</p>}
                    <PrimaryButton type="button" onClick={save} loading={saving} disabled={Boolean(blocker)}>
                        {editing ? 'Save changes' : 'Save promo'}
                    </PrimaryButton>
                    <Link
                        href="/admin/promos"
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#f0e8d8] bg-neutral-light px-5 text-sm font-semibold font-body text-text-dark transition-colors duration-150 hover:bg-neutral-light/70"
                    >
                        {editing ? 'Back to promos' : 'Cancel'}
                    </Link>
                </aside>
            </div>

            {saved?.redemption === 'single_use' && promoId && (
                <PromoCodesPanel promoId={promoId} promoName={saved.name} onChange={() => void refresh()} />
            )}

            {saved && (
                <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[#f0e8d8] pt-6">
                    <p className="text-sm font-body text-neutral-gray">Deleting takes it off every order from now on. Orders that already have it keep it.</p>
                    <button
                        type="button"
                        onClick={() => setConfirmDelete(true)}
                        className="min-h-11 rounded-xl border border-rose-200 px-4 text-sm font-semibold font-body text-rose-700 transition-colors duration-150 hover:bg-rose-50"
                    >
                        Delete promo
                    </button>
                </div>
            )}

            <DeleteConfirmDialog
                isOpen={confirmDelete}
                title="Delete this promo?"
                message="{itemName} comes off every order from now on. Orders that already have it keep it."
                itemName={saved?.name ?? ''}
                onConfirm={remove}
                onCancel={() => setConfirmDelete(false)}
                isLoading={deleting}
            />
        </Frame>
    );
}

// ─── Parts ────────────────────────────────────────────────────────────────────

/** A saved promo as the form holds it: empty text rather than missing text. */
function fromSaved(promo: Promo): Draft {
    const draft: Partial<Promo> = { ...promo, code: promo.code ?? '', accountingCode: promo.accountingCode ?? '' };
    // The id and the counts are the promo's, not things the form edits.
    delete draft.id;
    delete draft.timesUsed;
    delete draft.codesCount;
    delete draft.codesUsed;
    return draft as Draft;
}

function Frame({ children }: { children: React.ReactNode }) {
    return (
        <div className="mx-auto w-full max-w-6xl p-6 pb-24 md:pb-6">
            <Link
                href="/admin/promos"
                className="mb-4 inline-flex items-center gap-1.5 text-sm font-body text-neutral-gray transition-colors duration-150 hover:text-text-dark"
            >
                <ArrowLeftIcon size={14} weight="bold" />
                All promos
            </Link>
            {children}
        </div>
    );
}

/**
 * One answer out of two or three, in the look of the portal's segmented tabs.
 *
 * Not `SegmentedTabs` itself: that is for tab strips and filters, and it wraps
 * on a phone, which left "One-off codes" alone on a second line looking broken.
 * Here each option takes an equal share of the row, and on a phone the three
 * stack into full-width rows.
 */
function Choice<T extends string>({ options, value, onChange }: {
    options: { value: T; label: string }[];
    value: T;
    onChange: (v: T) => void;
}) {
    const cols = options.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2';
    return (
        <div role="radiogroup" className={`grid ${cols} gap-1 rounded-xl border border-[#f0e8d8] bg-neutral-card p-1`}>
            {options.map(option => {
                const on = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => onChange(option.value)}
                        className={`min-h-11 rounded-lg px-3 text-sm font-medium font-body transition-colors duration-150 ${on ? 'bg-neutral-light text-text-dark shadow-sm' : 'text-neutral-gray hover:text-text-dark'}`}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}

/** A titled part of the one form card: the title on the left on a wide screen, above on a phone. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="grid gap-4 p-5 md:grid-cols-[180px_minmax(0,1fr)] md:gap-6">
            <h2 className="text-sm font-semibold font-body text-text-dark md:pt-2.5">{title}</h2>
            <div className="flex min-w-0 flex-col gap-4">{children}</div>
        </section>
    );
}

/** A box with ₵ in front or % behind, drawn inside the field rather than beside it. */
function Adorned({ before, after, children }: { before?: string; after?: string; children: React.ReactNode }) {
    return (
        <div className="relative">
            {before && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-body text-neutral-gray">{before}</span>}
            {children}
            {after && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-body text-neutral-gray">{after}</span>}
        </div>
    );
}

/** A number that can be left empty, which means "no limit" rather than zero. */
function NumberBox({ id, value, onChange, placeholder, whole, className = '' }: {
    id: string;
    value: number | undefined;
    onChange: (v: number | undefined) => void;
    placeholder?: string;
    whole?: boolean;
    className?: string;
}) {
    return (
        <TextInput
            id={id}
            type="number"
            inputMode={whole ? 'numeric' : 'decimal'}
            min={whole ? 1 : 0}
            step={whole ? 1 : 'any'}
            value={value ?? ''}
            placeholder={placeholder}
            onChange={e => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
            className={`tabular-nums ${className}`}
        />
    );
}

function usageLine(promo: Promo): string {
    if (promo.redemption === 'single_use') {
        const made = promo.codesCount ?? 0;
        const used = promo.codesUsed ?? 0;
        return made === 0 ? 'No codes made yet.' : `${used.toLocaleString('en-GB')} of ${made.toLocaleString('en-GB')} codes used.`;
    }
    const n = promo.timesUsed ?? 0;
    if (promo.maxUses != null) return `On ${n.toLocaleString('en-GB')} of ${promo.maxUses.toLocaleString('en-GB')} orders it allows.`;
    return n === 0 ? 'Not on any order yet.' : `On ${n.toLocaleString('en-GB')} order${n === 1 ? '' : 's'} so far.`;
}
