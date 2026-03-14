'use client';

import { useState, useMemo } from 'react';
import { useBranches } from '@/lib/api/hooks/useBranches';
import { useMenu } from '@/lib/api/hooks/useMenu';
import { menuCategories } from '@/lib/data/SampleMenu';
import type { MenuItem as ApiMenuItem } from '@/types/api';

// ─── Types ────────────────────────────────────────────────────────────────────
type ViewMode = 'cards' | 'matrix';

export default function MenuAuditPage() {
    const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [viewMode, setViewMode] = useState<ViewMode>('cards');
    const [showOnlyUnavailable, setShowOnlyUnavailable] = useState(false);

    const { branches, isLoading: branchesLoading } = useBranches();
    const { items: apiItems, isLoading: menuLoading } = useMenu({ per_page: 500 });

    const isLoading = branchesLoading || menuLoading;

    const branchesWithMenu = useMemo(() => {
        if (!branches.length) return [];
        const branchMap = new Map<number, Set<string>>();
        apiItems.forEach((item: ApiMenuItem) => {
            const bid = item.branch_id ?? 0;
            if (!branchMap.has(bid)) branchMap.set(bid, new Set());
            branchMap.get(bid)!.add(item.slug ?? String(item.id));
        });
        return branches.map(b => ({
            id: String(b.id),
            name: b.name,
            address: b.address,
            isOpen: b.is_active,
            menuItemIds: Array.from(branchMap.get(b.id) ?? []),
            menuItemSlugs: branchMap.get(b.id) ?? new Set<string>(),
        }));
    }, [branches, apiItems]);

    const allSlugs = useMemo(() => {
        const slugs = new Set<string>();
        apiItems.forEach((item: ApiMenuItem) => slugs.add(item.slug ?? String(item.id)));
        return Array.from(slugs);
    }, [apiItems]);

    const itemsBySlug = useMemo(() => {
        const map = new Map<string, ApiMenuItem>();
        apiItems.forEach((item: ApiMenuItem) => {
            const slug = item.slug ?? String(item.id);
            if (!map.has(slug)) map.set(slug, item);
        });
        return map;
    }, [apiItems]);

    const activeBranch = useMemo(() => {
        const id = activeBranchId ?? branchesWithMenu[0]?.id;
        return branchesWithMenu.find(b => b.id === id) ?? null;
    }, [activeBranchId, branchesWithMenu]);

    const availableSet = useMemo(() => activeBranch?.menuItemSlugs ?? new Set<string>(), [activeBranch]);

    const categories = [
        { id: 'all', label: 'All' },
        ...menuCategories.filter(c => c.id !== 'all'),
    ];

    const visibleItems = useMemo(() => {
        let slugs = allSlugs;
        if (activeCategory !== 'all') {
            const cat = menuCategories.find(c => c.id === activeCategory);
            slugs = slugs.filter(slug => {
                const item = itemsBySlug.get(slug);
                return item && cat && item.category?.name === cat.label;
            });
        }
        if (showOnlyUnavailable) {
            slugs = slugs.filter(slug => !availableSet.has(slug));
        }
        return slugs.map(slug => itemsBySlug.get(slug)!).filter(Boolean);
    }, [allSlugs, activeCategory, availableSet, showOnlyUnavailable, itemsBySlug]);

    const allItemsCount = allSlugs.length;
    const availableCount = allSlugs.filter(slug => availableSet.has(slug)).length;
    const unavailableCount = allItemsCount - availableCount;
    const coverage = allItemsCount > 0 ? Math.round((availableCount / allItemsCount) * 100) : 0;

    if (isLoading && branchesWithMenu.length === 0) {
        return (
            <div className="min-h-screen bg-brand-darker text-text-light pt-24 pb-16 px-4 flex items-center justify-center">
                <div className="text-neutral-gray">Loading branches and menu...</div>
            </div>
        );
    }

    if (branchesWithMenu.length === 0) {
        return (
            <div className="min-h-screen bg-brand-darker text-text-light pt-24 pb-16 px-4 flex items-center justify-center">
                <div className="text-neutral-gray">No branches found. Add branches and menu items in the admin.</div>
            </div>
        );
    }

    const effectiveActiveBranchId = activeBranchId ?? branchesWithMenu[0].id;

    return (
        <div className="min-h-screen bg-brand-darker text-text-light pt-24 pb-16 px-4 sm:px-8">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-primary">Branch Menu Visualizer</h1>
                </div>

                {/* Branch tabs */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {branchesWithMenu.map(branch => {
                        const bAvail = branch.menuItemIds.length;
                        const isActive = branch.id === effectiveActiveBranchId;
                        return (
                            <button
                                key={branch.id}
                                onClick={() => { setActiveBranchId(branch.id); setShowOnlyUnavailable(false); }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all
                                    ${isActive
                                        ? 'bg-primary/15 border-primary text-primary'
                                        : 'bg-white/5 border-white/10 text-neutral-gray hover:border-white/25 hover:text-text-light'
                                    }`}
                            >
                                <span className={`w-2 h-2 rounded-full shrink-0 ${branch.isOpen ? 'bg-secondary' : 'bg-error'}`} />
                                {branch.name}
                                <span className={`text-xs px-1.5 py-0.5 rounded-md font-bold ${isActive ? 'bg-primary/20 text-primary' : 'bg-white/10 text-neutral-gray'}`}>
                                    {bAvail}/{allItemsCount}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    {[
                        { label: 'Available', value: availableCount, color: 'text-secondary', bg: 'bg-secondary/10 border-secondary/20' },
                        { label: 'Not Available', value: unavailableCount, color: 'text-error', bg: 'bg-error/10 border-error/20' },
                        { label: 'Menu Coverage', value: `${coverage}%`, color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
                        { label: 'Status', value: activeBranch?.isOpen ? 'Open' : 'Closed', color: activeBranch?.isOpen ? 'text-secondary' : 'text-error', bg: activeBranch?.isOpen ? 'bg-secondary/10 border-secondary/20' : 'bg-error/10 border-error/20' },
                    ].map(stat => (
                        <div key={stat.label} className={`border rounded-2xl p-4 ${stat.bg}`}>
                            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                            <p className="text-xs text-neutral-gray mt-1">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Coverage bar */}
                <div className="mb-6">
                    <div className="flex items-center justify-between text-xs text-neutral-gray mb-1.5">
                        <span>{activeBranch?.name} Branch — Menu Coverage</span>
                        <span>{availableCount} of {allItemsCount} items</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${coverage}%` }}
                        />
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center gap-3 mb-5">
                    <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
                        {(['cards', 'matrix'] as ViewMode[]).map(v => (
                            <button
                                key={v}
                                onClick={() => setViewMode(v)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all
                                    ${viewMode === v ? 'bg-primary text-white' : 'text-neutral-gray hover:text-text-light'}`}
                            >
                                {v}
                            </button>
                        ))}
                    </div>

                    {viewMode === 'cards' && (
                        <div className="flex flex-wrap gap-2">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all
                                        ${activeCategory === cat.id
                                            ? 'bg-primary/15 border-primary text-primary'
                                            : 'bg-transparent border-white/10 text-neutral-gray hover:border-white/25'
                                        }`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {viewMode === 'cards' && unavailableCount > 0 && (
                        <button
                            onClick={() => setShowOnlyUnavailable(p => !p)}
                            className={`ml-auto px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all
                                ${showOnlyUnavailable
                                    ? 'bg-error/15 border-error/40 text-error'
                                    : 'bg-transparent border-white/10 text-neutral-gray hover:border-error/30 hover:text-error'
                                }`}
                        >
                            {showOnlyUnavailable ? `Showing ${unavailableCount} unavailable` : `Show unavailable only`}
                        </button>
                    )}
                </div>

                {/* ── CARD VIEW ── */}
                {viewMode === 'cards' && (
                    <>
                        {visibleItems.length === 0 ? (
                            <div className="text-center py-16 text-neutral-gray text-sm">
                                No items match this filter
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {visibleItems.map(item => {
                                    const slug = item.slug ?? String(item.id);
                                    const available = availableSet.has(slug);
                                    return (
                                        <div
                                            key={item.id}
                                            className={`rounded-2xl border p-4 transition-all
                                                ${available
                                                    ? 'bg-secondary/5 border-secondary/25'
                                                    : 'bg-error/5 border-error/20 opacity-60'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-text-light leading-tight">{item.name}</p>
                                                    <p className="text-xs text-neutral-gray mt-0.5">{item.category?.name ?? '-'}</p>
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg shrink-0
                                                    ${available ? 'bg-secondary/20 text-secondary' : 'bg-error/20 text-error'}`}>
                                                    {available ? 'Available' : 'Not here'}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-[10px] font-mono bg-white/5 text-neutral-gray px-2 py-0.5 rounded-lg">
                                                    {item.slug ?? item.id}
                                                </span>
                                                {item.is_popular && (
                                                    <span className="text-[10px] font-bold bg-primary/15 text-primary px-2 py-0.5 rounded-lg">Popular</span>
                                                )}
                                                {item.is_new && (
                                                    <span className="text-[10px] font-bold bg-secondary/15 text-secondary px-2 py-0.5 rounded-lg">New</span>
                                                )}
                                            </div>

                                            <div className="mt-2 text-xs text-neutral-gray">
                                                {item.sizes?.length
                                                    ? `₵${item.sizes[0].price} – ${item.sizes[item.sizes.length - 1].price}`
                                                    : `₵${Number(item.base_price)?.toFixed(2) ?? '-'}`}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* ── MATRIX VIEW ── */}
                {viewMode === 'matrix' && (
                    <div className="overflow-x-auto rounded-2xl border border-white/10">
                        <table className="w-full text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left px-4 py-3 font-semibold text-neutral-gray bg-white/5 sticky left-0 min-w-[200px]">
                                        Item
                                    </th>
                                    {branchesWithMenu.map(b => (
                                        <th key={b.id} className={`px-3 py-3 font-semibold text-center min-w-[90px] bg-white/5
                                            ${b.id === effectiveActiveBranchId ? 'text-primary' : 'text-neutral-gray'}`}>
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`w-1.5 h-1.5 rounded-full ${b.isOpen ? 'bg-secondary' : 'bg-error'}`} />
                                                {b.name}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const rows: React.ReactNode[] = [];
                                    let lastCat = '';
                                    allSlugs.forEach(slug => {
                                        const item = itemsBySlug.get(slug);
                                        if (!item) return;
                                        const catName = item.category?.name ?? '-';
                                        if (catName !== lastCat) {
                                            lastCat = catName;
                                            rows.push(
                                                <tr key={`cat-${catName}`} className="border-b border-white/5">
                                                    <td colSpan={branchesWithMenu.length + 1} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-primary/70 bg-primary/5 sticky left-0">
                                                        {catName}
                                                    </td>
                                                </tr>
                                            );
                                        }
                                        rows.push(
                                            <tr key={slug} className="border-b border-white/5 hover:bg-white/3 transition-colors group">
                                                <td className="px-4 py-2.5 sticky left-0 bg-brand-darker group-hover:bg-white/5 transition-colors">
                                                    <div>
                                                        <span className="font-semibold text-text-light">{item.name}</span>
                                                        <span className="ml-2 font-mono text-neutral-gray text-[10px]">#{slug}</span>
                                                    </div>
                                                </td>
                                                {branchesWithMenu.map(branch => {
                                                    const has = branch.menuItemSlugs.has(slug);
                                                    const isHighlighted = branch.id === effectiveActiveBranchId;
                                                    return (
                                                        <td key={branch.id} className={`text-center py-2.5 px-3 ${isHighlighted ? 'bg-primary/5' : ''}`}>
                                                            {has
                                                                ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-secondary/20 text-secondary font-bold text-[10px]">✓</span>
                                                                : <span className="text-white/10 text-base">·</span>
                                                            }
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    });
                                    return rows;
                                })()}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Legend */}
                <div className="mt-6 flex items-center gap-6 text-xs text-neutral-gray">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-secondary/20 text-secondary font-bold text-[9px]">✓</span>
                        Available at this branch
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-white/10 text-sm">·</span>
                        Not on this branch&apos;s menu
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-secondary inline-block" /> Open
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-error inline-block" /> Closed
                    </div>
                </div>

            </div>
        </div>
    );
}
