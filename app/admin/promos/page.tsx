'use client';

import {
    DataTable,
    FilterBar,
    PageHeader,
    RowActionsMenu,
    SearchBar,
    SegmentedTabs,
    type DataTableColumn,
} from '@/app/inventory/_components';
import { ApiError } from '@/lib/api/client';
import { usePromos } from '@/lib/api/hooks/usePromos';
import { getPromoService, type Promo } from '@/lib/services/promos/promo.service';
import { toast } from '@/lib/utils/toast';
import { PencilSimpleIcon, PowerIcon } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { PromoStatusBadge } from './_components/PromoStatusBadge';
import { promoState, reachesBy, runs, takesOff, todayIso, type PromoState } from './_components/promoFacts';

type Show = PromoState | 'all';

/** Live first, then what is about to start, then what is over or off. */
const RANK: Record<PromoState, number> = { live: 0, scheduled: 1, off: 2, ended: 3 };

export default function PromosPage() {
    const router = useRouter();
    const { data: promos = [], isLoading: loading, isError, refetch } = usePromos();
    const [show, setShow] = useState<Show>('all');
    const [query, setQuery] = useState('');
    const today = todayIso();

    const counted = useMemo(() => {
        const by: Record<PromoState, number> = { live: 0, scheduled: 0, ended: 0, off: 0 };
        for (const p of promos) by[promoState(p, today)]++;
        return by;
    }, [promos, today]);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return promos.filter(p =>
            (show === 'all' || promoState(p, today) === show)
            && (!q || p.name.toLowerCase().includes(q) || (p.code ?? '').toLowerCase().includes(q)),
        );
    }, [promos, show, query, today]);

    const toggle = async (promo: Promo) => {
        try {
            await getPromoService().update(promo.id, { isActive: !promo.isActive });
            toast.success(promo.isActive ? `${promo.name} is switched off.` : `${promo.name} is switched on.`);
            await refetch();
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'That did not save.');
        }
    };

    const columns: DataTableColumn<Promo>[] = [
        {
            key: 'name',
            header: 'Promo',
            sortValue: p => p.name.toLowerCase(),
            cell: p => (
                <div className="min-w-0">
                    <p className="text-sm font-semibold font-body text-text-dark">{p.name}</p>
                    <p className={`mt-0.5 text-xs font-body text-neutral-gray ${p.redemption === 'shared_code' ? 'font-mono tracking-wide' : ''}`}>
                        {reachesBy(p)}
                    </p>
                </div>
            ),
        },
        {
            key: 'off',
            header: 'Takes off',
            sortValue: p => Number(p.value),
            cell: p => <span className="text-sm font-body text-text-dark tabular-nums">{takesOff(p)}</span>,
        },
        {
            key: 'used',
            header: 'Used',
            align: 'right',
            sortValue: p => (p.redemption === 'single_use' ? p.codesUsed ?? 0 : p.timesUsed ?? 0),
            cell: p => <span className="text-sm font-body text-text-dark tabular-nums">{usedCell(p)}</span>,
            hideBelow: 'sm',
        },
        {
            key: 'runs',
            header: 'Runs',
            sortValue: p => p.startDate,
            cell: p => <span className="whitespace-nowrap text-sm font-body text-neutral-gray tabular-nums">{runs(p, today)}</span>,
            hideBelow: 'md',
        },
        {
            key: 'state',
            header: 'Status',
            sortValue: p => RANK[promoState(p, today)],
            cell: p => <PromoStatusBadge state={promoState(p, today)} />,
        },
        {
            key: 'actions',
            header: '',
            align: 'right',
            cell: p => (
                <div onClick={e => e.stopPropagation()}>
                    <RowActionsMenu
                        actions={[
                            { label: 'Edit', icon: <PencilSimpleIcon size={15} />, onClick: () => router.push(`/admin/promos/${p.id}`) },
                            { label: p.isActive ? 'Switch off' : 'Switch on', icon: <PowerIcon size={15} />, onClick: () => void toggle(p) },
                        ]}
                    />
                </div>
            ),
        },
    ];

    const subtitle = loading
        ? ' '
        : isError
            ? 'The promos could not be loaded. Refresh to try again.'
            : counted.live === 0
            ? counted.scheduled > 0 ? `Nothing live today. ${counted.scheduled} starting soon.` : 'Nothing live today.'
            : `${counted.live} live today${counted.scheduled ? `, ${counted.scheduled} starting soon` : ''}.`;

    return (
        <div className="mx-auto w-full max-w-6xl p-6">
            <PageHeader
                title="Promos"
                subtitle={subtitle}
                action={{ label: 'New promo', onClick: () => router.push('/admin/promos/new') }}
            />

            <FilterBar>
                <SegmentedTabs
                    options={[
                        { value: 'all', label: 'All' },
                        { value: 'live', label: `Live ${counted.live}` },
                        { value: 'scheduled', label: 'Starting soon' },
                        { value: 'ended', label: 'Ended' },
                        { value: 'off', label: 'Switched off' },
                    ]}
                    value={show}
                    onChange={setShow}
                />
                <SearchBar value={query} onChange={setQuery} placeholder="Find a promo or a code" />
            </FilterBar>

            <DataTable
                data={visible}
                columns={columns}
                rowKey={p => p.id}
                defaultSortKey="state"
                pageSize={20}
                isLoading={loading}
                onRowClick={p => router.push(`/admin/promos/${p.id}`)}
                emptyState={
                    <div className="px-5 py-12 text-center">
                        <p className="text-sm font-semibold font-body text-text-dark">
                            {promos.length === 0 ? 'No promos yet.' : 'Nothing here.'}
                        </p>
                        <p className="mt-1 text-sm font-body text-neutral-gray">
                            {promos.length === 0 ? 'Make the first one with New promo.' : 'Try another tab, or clear the search.'}
                        </p>
                    </div>
                }
            />
        </div>
    );
}

function usedCell(p: Promo): string {
    if (p.redemption === 'single_use') {
        const made = p.codesCount ?? 0;
        return made === 0 ? 'No codes yet' : `${(p.codesUsed ?? 0).toLocaleString('en-GB')} of ${made.toLocaleString('en-GB')} codes`;
    }
    const n = (p.timesUsed ?? 0).toLocaleString('en-GB');
    return p.maxUses != null ? `${n} of ${p.maxUses.toLocaleString('en-GB')}` : `${n} order${p.timesUsed === 1 ? '' : 's'}`;
}
