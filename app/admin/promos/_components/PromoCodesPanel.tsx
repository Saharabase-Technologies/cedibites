'use client';

import {
    DataTable,
    FilterBar,
    FormField,
    RowActionButton,
    SearchBar,
    SegmentedTabs,
    TextInput,
    type DataTableColumn,
} from '@/app/inventory/_components';
import { TONE } from '@/app/inventory/_components/status-tokens';
import { ApiError } from '@/lib/api/client';
import { usePromoCodes } from '@/lib/api/hooks/usePromos';
import { getPromoService, type PromoCodeRow } from '@/lib/services/promos/promo.service';
import { toast } from '@/lib/utils/toast';
import { CopyIcon, DownloadSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { formatDay } from './promoFacts';

type Show = 'all' | 'unused' | 'used';

/**
 * The one-off codes on a promo: making a batch, and seeing which went where.
 *
 * Each code works for one order. The list says which order used it and when,
 * so a customer who says "my code did not work" can be answered by looking it
 * up here. The download is the same list, for printing or for pasting into
 * whatever sends the codes out.
 */
export function PromoCodesPanel({ promoId, promoName, onChange }: {
    promoId: string;
    promoName: string;
    /** Called after codes are made or taken back, so the page's counts follow. */
    onChange: () => void;
}) {
    const { data: rows = [], isLoading: loading, refetch } = usePromoCodes(promoId);
    const [show, setShow] = useState<Show>('all');
    const [query, setQuery] = useState('');

    const [count, setCount] = useState('50');
    const [prefix, setPrefix] = useState('');
    const [batch, setBatch] = useState('');
    const [making, setMaking] = useState(false);
    const [makeError, setMakeError] = useState<string | null>(null);

    const used = rows.filter(r => r.used).length;
    const howMany = Math.floor(Number(count));
    const canMake = howMany >= 1 && howMany <= 1000 && !making;

    const make = async () => {
        if (!canMake) return;
        setMaking(true);
        setMakeError(null);
        try {
            const made = await getPromoService().generateCodes(promoId, { count: howMany, prefix: prefix.trim(), batch: batch.trim() });
            toast.success(`${made.length.toLocaleString('en-GB')} codes made.`);
            setBatch('');
            await refetch();
            onChange();
        } catch (err) {
            const api = err instanceof ApiError ? err : null;
            const first = api?.errors ? Object.values(api.errors)[0]?.[0] : undefined;
            setMakeError(first ?? api?.message ?? 'The codes could not be made. Try again.');
        } finally {
            setMaking(false);
        }
    };

    const remove = async (row: PromoCodeRow) => {
        try {
            await getPromoService().deleteCode(promoId, row.id);
            toast.success(`${row.code} is taken back.`);
            await refetch();
            onChange();
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'The code could not be taken back.');
        }
    };

    const copy = async (code: string) => {
        try {
            await navigator.clipboard.writeText(code);
            toast.success(`Copied ${code}.`);
        } catch {
            toast.error('This browser would not copy it.');
        }
    };

    const visible = useMemo(() => {
        const q = query.trim().toUpperCase().replace(/[\s-]/g, '');
        return rows.filter(r =>
            (show === 'all' || (show === 'used') === r.used)
            && (!q
                || r.code.replace(/-/g, '').includes(q)
                || (r.batch ?? '').toUpperCase().includes(q)
                || (r.orderNumber ?? '').toUpperCase().includes(q)),
        );
    }, [rows, show, query]);

    const download = () => {
        const cell = (v: string | null) => {
            const s = v ?? '';
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const lines = [
            'Code,Batch,Status,Order,Used on',
            ...rows.map(r => [r.code, r.batch, r.used ? 'Used' : 'Not used', r.orderNumber, r.usedAt ? formatDay(r.usedAt) : ''].map(cell).join(',')),
        ];
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${promoName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'promo'}-codes.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const columns: DataTableColumn<PromoCodeRow>[] = [
        {
            key: 'code',
            header: 'Code',
            sortValue: r => r.code,
            cell: r => <span className="font-mono text-sm font-semibold tracking-wider text-text-dark">{r.code}</span>,
        },
        {
            key: 'batch',
            header: 'Batch',
            sortValue: r => r.batch ?? '',
            cell: r => <span className="text-sm font-body text-neutral-gray">{r.batch ?? ''}</span>,
            hideBelow: 'md',
        },
        {
            key: 'status',
            header: 'Status',
            sortValue: r => (r.used ? 1 : 0),
            cell: r => {
                const tone = r.used ? TONE.done : TONE.neutral;
                return (
                    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold font-body ${tone.bg} ${tone.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} aria-hidden />
                        {r.used ? 'Used' : 'Not used'}
                    </span>
                );
            },
        },
        {
            key: 'order',
            header: 'Order',
            sortValue: r => r.orderNumber ?? '',
            cell: r => <span className="text-sm font-body font-medium text-text-dark">{r.orderNumber ?? ''}</span>,
        },
        {
            key: 'usedAt',
            header: 'Used on',
            sortValue: r => r.usedAt ?? '',
            cell: r => <span className="text-sm font-body text-neutral-gray tabular-nums">{r.usedAt ? formatDay(r.usedAt) : ''}</span>,
            hideBelow: 'sm',
        },
        {
            key: 'actions',
            header: '',
            align: 'right',
            cell: r => (
                <div className="flex items-center justify-end gap-1">
                    <RowActionButton icon={<CopyIcon size={15} />} label={`Copy ${r.code}`} onClick={() => void copy(r.code)} />
                    {!r.used && (
                        <RowActionButton icon={<TrashIcon size={15} />} label={`Take back ${r.code}`} destructive onClick={() => void remove(r)} />
                    )}
                </div>
            ),
        },
    ];

    return (
        <section className="mt-10">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold font-brand text-text-dark">One-off codes</h2>
                    <p className="mt-1 text-sm font-body text-neutral-gray tabular-nums">
                        {loading
                            ? ' '
                            : rows.length === 0
                            ? 'None made yet.'
                            : `${rows.length.toLocaleString('en-GB')} made, ${used.toLocaleString('en-GB')} used, ${(rows.length - used).toLocaleString('en-GB')} still good.`}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={download}
                    disabled={rows.length === 0}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#e3ddd0] bg-neutral-card px-4 text-sm font-semibold font-body text-text-dark transition-colors duration-150 hover:border-neutral-gray/50 disabled:opacity-40"
                >
                    <DownloadSimpleIcon size={16} weight="bold" />
                    Download the list
                </button>
            </div>

            <div className="mb-5 rounded-2xl border border-[#f0e8d8] bg-neutral-card p-5">
                <div className="grid items-start gap-4 sm:grid-cols-[120px_180px_minmax(0,1fr)] lg:grid-cols-[120px_180px_minmax(0,1fr)_auto]">
                    <FormField label="How many" htmlFor="codes-count">
                        <TextInput id="codes-count" type="number" inputMode="numeric" min={1} max={1000} value={count} onChange={e => setCount(e.target.value)} className="tabular-nums" />
                    </FormField>
                    <FormField label="Starts with" htmlFor="codes-prefix" hint="Optional.">
                        <TextInput
                            id="codes-prefix"
                            value={prefix}
                            onChange={e => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12))}
                            placeholder="JOLLOF"
                            autoComplete="off"
                            spellCheck={false}
                            className="font-mono tracking-wider"
                        />
                    </FormField>
                    <FormField label="Batch name" htmlFor="codes-batch" hint="Optional. Shown in the list, so you can tell batches apart.">
                        <TextInput id="codes-batch" value={batch} onChange={e => setBatch(e.target.value.slice(0, 60))} placeholder="Radio giveaway" />
                    </FormField>
                    <div className="flex flex-col gap-1.5 sm:col-span-3 lg:col-span-1">
                        <span className="hidden text-sm font-medium font-body lg:block" aria-hidden>&nbsp;</span>
                        <button
                            type="button"
                            onClick={make}
                            disabled={!canMake}
                            className="min-h-11 whitespace-nowrap rounded-xl bg-primary px-5 text-sm font-semibold font-body text-white transition-colors duration-150 hover:bg-primary/90 disabled:opacity-50"
                        >
                            {making ? 'Making them' : howMany >= 1 ? `Make ${howMany.toLocaleString('en-GB')} code${howMany === 1 ? '' : 's'}` : 'Make codes'}
                        </button>
                    </div>
                </div>
                <p className="mt-3 text-xs font-body text-neutral-gray">
                    {prefix ? `They will look like ${prefix}-K7Q2MX.` : 'They will look like K7Q2MXB4.'} No 0, O, 1, I or L, so nobody misreads one off a screen.
                </p>
                {makeError && <p className="mt-2 text-sm font-body text-red-500">{makeError}</p>}
            </div>

            <FilterBar>
                <SegmentedTabs
                    options={[
                        { value: 'all', label: `All ${rows.length.toLocaleString('en-GB')}` },
                        { value: 'unused', label: 'Not used' },
                        { value: 'used', label: 'Used' },
                    ]}
                    value={show}
                    onChange={setShow}
                />
                <SearchBar value={query} onChange={setQuery} placeholder="Find a code, batch or order" />
            </FilterBar>

            <DataTable
                data={visible}
                columns={columns}
                rowKey={r => r.id}
                pageSize={25}
                isLoading={loading}
                emptyState={
                    <p className="px-5 py-10 text-center text-sm font-body text-neutral-gray">
                        {rows.length === 0 ? 'Make the first batch above.' : 'No code matches that.'}
                    </p>
                }
            />
        </section>
    );
}
