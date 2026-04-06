'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowUpIcon,
    ArrowDownIcon,
    ArrowCounterClockwiseIcon,
    SpinnerGapIcon,
    WarningCircleIcon,
    ToggleLeftIcon,
    ToggleRightIcon,
    FloppyDiskIcon,
    EyeIcon,
    LightningIcon,
    FireIcon,
    TrendUpIcon,
    StarIcon,
    SparkleIcon,
    SunIcon,
    SunHorizonIcon,
    MoonStarsIcon,
    MoonIcon,
    ClockIcon,
    UsersIcon,
    XIcon,
} from '@phosphor-icons/react';
import { menuService } from '@/lib/api/services/menu.service';
import { useBranch } from '@/app/components/providers/BranchProvider';
import { toast } from '@/lib/utils/toast';
import type { SmartCategorySetting, SmartCategoryPreview } from '@/types/api';

// ─── Menu sub-tabs ───────────────────────────────────────────────────────────

const MENU_SUB_TABS = [
    { href: '/admin/menu',                    label: 'Items'            },
    { href: '/admin/menu-add-ons',            label: 'Add-ons'          },
    { href: '/admin/menu-tags',               label: 'Tags'             },
    { href: '/admin/menu/configure',          label: 'Configure'        },
    { href: '/admin/menu/smart-categories',   label: 'Smart Categories' },
];

function MenuSubTabs() {
    const pathname = usePathname();
    const isActive = (href: string) => {
        if (href === '/admin/menu') return pathname === '/admin/menu';
        return pathname === href || pathname.startsWith(href + '/');
    };
    return (
        <div className="flex gap-6 border-b border-[#f0e8d8] mb-5">
            {MENU_SUB_TABS.map(tab => (
                <Link
                    key={tab.href}
                    href={tab.href}
                    className={`pb-2.5 text-sm font-medium font-body transition-colors border-b-2 -mb-px ${
                        isActive(tab.href)
                            ? 'text-primary border-primary'
                            : 'text-neutral-gray border-transparent hover:text-text-dark'
                    }`}
                >
                    {tab.label}
                </Link>
            ))}
        </div>
    );
}

// ─── Inline components ───────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
    return (
        <button type="button" onClick={() => !disabled && onChange(!checked)} className={disabled ? 'opacity-40' : 'cursor-pointer'}>
            {checked
                ? <ToggleRightIcon size={28} weight="fill" className="text-primary" />
                : <ToggleLeftIcon size={28} weight="fill" className="text-neutral-gray/40" />
            }
        </button>
    );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1">{children}</label>;
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <div className={`bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5 ${className}`}>{children}</div>;
}

// Map backend icon key → Phosphor component
const ICON_MAP: Record<string, React.ElementType> = {
    'fire': FireIcon,
    'trend-up': TrendUpIcon,
    'star': StarIcon,
    'sparkle': SparkleIcon,
    'sun': SunIcon,
    'sun-horizon': SunHorizonIcon,
    'moon-stars': MoonStarsIcon,
    'moon': MoonIcon,
    'arrow-counter-clockwise': ArrowCounterClockwiseIcon,
};

function CategoryIcon({ iconKey, size = 20 }: { iconKey: string; size?: number }) {
    const Icon = ICON_MAP[iconKey] ?? SparkleIcon;
    return <Icon size={size} weight="fill" />;
}

function formatHour(h: number | null): string {
    if (h === null) return '—';
    const period = h >= 12 ? 'PM' : 'AM';
    const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${display} ${period}`;
}

// ─── Category Setting Card ───────────────────────────────────────────────────

interface CategoryCardProps {
    setting: SmartCategorySetting;
    index: number;
    total: number;
    saving: number | null;
    onToggle: (id: number, enabled: boolean) => void;
    onUpdateLimit: (id: number, limit: number) => void;
    onUpdateTimeWindow: (id: number, start: number | null, end: number | null) => void;
    onMoveUp: (id: number) => void;
    onMoveDown: (id: number) => void;
    onReset: (id: number) => void;
    onPreview: (id: number) => void;
}

function CategoryCard({
    setting, index, total, saving,
    onToggle, onUpdateLimit, onUpdateTimeWindow,
    onMoveUp, onMoveDown, onReset, onPreview,
}: CategoryCardProps) {
    const isSaving = saving === setting.id;
    const isModified = setting.item_limit !== setting.default_item_limit
        || setting.visible_hour_start !== setting.default_visible_hour_start
        || setting.visible_hour_end !== setting.default_visible_hour_end;

    return (
        <div className={`bg-neutral-card border rounded-2xl p-4 transition-all ${
            setting.is_enabled ? 'border-[#f0e8d8]' : 'border-[#f0e8d8] opacity-60'
        }`}>
            {/* Header row */}
            <div className="flex items-center gap-3 mb-3">
                <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${
                    setting.is_enabled ? 'bg-primary/10 text-primary' : 'bg-neutral-light text-neutral-gray'
                }`}>
                    <CategoryIcon iconKey={setting.icon} size={18} />
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-text-dark text-sm font-bold font-body truncate">{setting.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        {setting.is_time_based && (
                            <span className="flex items-center gap-1 text-[10px] font-body text-neutral-gray">
                                <ClockIcon size={10} />
                                {formatHour(setting.visible_hour_start)}–{formatHour(setting.visible_hour_end)}
                            </span>
                        )}
                        {setting.requires_customer && (
                            <span className="flex items-center gap-1 text-[10px] font-body text-neutral-gray">
                                <UsersIcon size={10} />
                                Logged-in only
                            </span>
                        )}
                        {isModified && (
                            <span className="text-[10px] font-body text-primary font-medium">Modified</span>
                        )}
                    </div>
                </div>

                <Toggle checked={setting.is_enabled} onChange={v => onToggle(setting.id, v)} disabled={isSaving} />
            </div>

            {/* Settings row */}
            {setting.is_enabled && (
                <div className="flex flex-wrap gap-3 mb-3">
                    <div className="flex-1 min-w-25">
                        <FieldLabel>Item Limit</FieldLabel>
                        <input
                            type="number"
                            min={1} max={50}
                            value={setting.item_limit}
                            onChange={e => {
                                const val = parseInt(e.target.value);
                                if (val >= 1 && val <= 50) onUpdateLimit(setting.id, val);
                            }}
                            className="w-full px-3 py-2 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40"
                        />
                    </div>

                    {setting.is_time_based && (
                        <>
                            <div className="min-w-22.5">
                                <FieldLabel>From (Hour)</FieldLabel>
                                <select
                                    value={setting.visible_hour_start ?? ''}
                                    onChange={e => {
                                        const val = e.target.value === '' ? null : parseInt(e.target.value);
                                        onUpdateTimeWindow(setting.id, val, setting.visible_hour_end);
                                    }}
                                    className="w-full px-2 py-2 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40"
                                >
                                    {Array.from({ length: 24 }, (_, i) => (
                                        <option key={i} value={i}>{formatHour(i)}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="min-w-22.5">
                                <FieldLabel>To (Hour)</FieldLabel>
                                <select
                                    value={setting.visible_hour_end ?? ''}
                                    onChange={e => {
                                        const val = e.target.value === '' ? null : parseInt(e.target.value);
                                        onUpdateTimeWindow(setting.id, setting.visible_hour_start, val);
                                    }}
                                    className="w-full px-2 py-2 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40"
                                >
                                    {Array.from({ length: 24 }, (_, i) => (
                                        <option key={i} value={i}>{formatHour(i)}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Actions row */}
            <div className="flex items-center gap-1.5 pt-2 border-t border-[#f0e8d8]">
                <button
                    onClick={() => onMoveUp(setting.id)}
                    disabled={index === 0 || isSaving}
                    className="p-1.5 rounded-lg text-neutral-gray hover:bg-neutral-light disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-colors"
                    title="Move up"
                >
                    <ArrowUpIcon size={14} weight="bold" />
                </button>
                <button
                    onClick={() => onMoveDown(setting.id)}
                    disabled={index === total - 1 || isSaving}
                    className="p-1.5 rounded-lg text-neutral-gray hover:bg-neutral-light disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-colors"
                    title="Move down"
                >
                    <ArrowDownIcon size={14} weight="bold" />
                </button>

                <div className="flex-1" />

                <button
                    onClick={() => onPreview(setting.id)}
                    disabled={!setting.is_enabled || isSaving}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-body text-neutral-gray hover:bg-neutral-light hover:text-text-dark disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-colors"
                    title="Preview resolved items"
                >
                    <EyeIcon size={13} weight="bold" />
                    Preview
                </button>

                {isModified && (
                    <button
                        onClick={() => onReset(setting.id)}
                        disabled={isSaving}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-body text-neutral-gray hover:bg-neutral-light hover:text-text-dark disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-colors"
                        title="Reset to defaults"
                    >
                        <ArrowCounterClockwiseIcon size={13} weight="bold" />
                        Reset
                    </button>
                )}

                {isSaving && <SpinnerGapIcon size={14} className="animate-spin text-primary" />}
            </div>
        </div>
    );
}

// ─── Preview Panel ───────────────────────────────────────────────────────────

function PreviewPanel({ preview, onClose }: { preview: SmartCategoryPreview; onClose: () => void }) {
    return (
        <Card className="mt-4">
            <div className="flex items-center justify-between mb-3">
                <p className="text-text-dark text-sm font-bold font-body">
                    Preview: <span className="text-primary">{preview.slug}</span>
                    <span className="text-neutral-gray font-normal ml-2">
                        ({preview.item_count} item{preview.item_count !== 1 ? 's' : ''})
                    </span>
                </p>
                <button onClick={onClose} className="p-1 rounded-lg hover:bg-neutral-light cursor-pointer">
                    <XIcon size={14} />
                </button>
            </div>

            {preview.items.length === 0 ? (
                <p className="text-neutral-gray text-xs font-body py-4 text-center">
                    No items resolved for this category in this branch.
                </p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {preview.items.map(item => (
                        <div key={item.id} className="flex items-center gap-2 px-3 py-2 bg-neutral-light rounded-xl">
                            <div className="flex-1 min-w-0">
                                <p className="text-text-dark text-xs font-body font-medium truncate">{item.name}</p>
                                {item.category && (
                                    <p className="text-neutral-gray text-[10px] font-body truncate">{item.category}</p>
                                )}
                            </div>
                            {item.rating !== null && (
                                <span className="flex items-center gap-0.5 text-[10px] font-body text-primary shrink-0">
                                    <StarIcon size={10} weight="fill" />
                                    {item.rating.toFixed(1)}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminSmartCategoriesPage() {
    const { branches } = useBranch();
    const [settings, setSettings] = useState<SmartCategorySetting[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [saving, setSaving] = useState<number | null>(null);
    const [warming, setWarming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previewData, setPreviewData] = useState<SmartCategoryPreview | null>(null);
    const [previewBranchId, setPreviewBranchId] = useState<number | null>(null);

    // Default preview branch
    useEffect(() => {
        if (branches.length > 0 && previewBranchId === null) {
            setPreviewBranchId(parseInt(branches[0].id));
        }
    }, [branches, previewBranchId]);

    // Load settings
    const loadSettings = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await menuService.getSmartCategorySettings();
            setSettings(res.data);
        } catch {
            setError('Failed to load smart category settings.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { loadSettings(); }, [loadSettings]);

    // ─── Handlers ──────────────────────────────────────────────────────

    const handleToggle = async (id: number, isEnabled: boolean) => {
        setSaving(id);
        try {
            const res = await menuService.updateSmartCategorySetting(id, { is_enabled: isEnabled });
            setSettings(prev => prev.map(s => s.id === id ? res.data : s));
            toast.success(`${res.data.name} ${isEnabled ? 'enabled' : 'disabled'}`);
        } catch {
            toast.error('Failed to update setting');
        } finally {
            setSaving(null);
        }
    };

    const handleUpdateLimit = async (id: number, limit: number) => {
        // Optimistic update for snappy UX
        setSettings(prev => prev.map(s => s.id === id ? { ...s, item_limit: limit } : s));
    };

    const handleSaveLimit = async (id: number) => {
        const setting = settings.find(s => s.id === id);
        if (!setting) return;
        setSaving(id);
        try {
            const res = await menuService.updateSmartCategorySetting(id, { item_limit: setting.item_limit });
            setSettings(prev => prev.map(s => s.id === id ? res.data : s));
            toast.success('Item limit saved');
        } catch {
            toast.error('Failed to save limit');
            loadSettings(); // revert
        } finally {
            setSaving(null);
        }
    };

    const handleUpdateTimeWindow = async (id: number, start: number | null, end: number | null) => {
        setSaving(id);
        try {
            const res = await menuService.updateSmartCategorySetting(id, {
                visible_hour_start: start,
                visible_hour_end: end,
            });
            setSettings(prev => prev.map(s => s.id === id ? res.data : s));
            toast.success('Time window updated');
        } catch {
            toast.error('Failed to update time window');
        } finally {
            setSaving(null);
        }
    };

    const handleMoveUp = async (id: number) => {
        const idx = settings.findIndex(s => s.id === id);
        if (idx <= 0) return;
        const newOrder = [...settings];
        [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
        setSettings(newOrder); // optimistic
        try {
            const res = await menuService.reorderSmartCategories(newOrder.map(s => s.id));
            setSettings(res.data);
        } catch {
            toast.error('Failed to reorder');
            loadSettings();
        }
    };

    const handleMoveDown = async (id: number) => {
        const idx = settings.findIndex(s => s.id === id);
        if (idx >= settings.length - 1) return;
        const newOrder = [...settings];
        [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
        setSettings(newOrder); // optimistic
        try {
            const res = await menuService.reorderSmartCategories(newOrder.map(s => s.id));
            setSettings(res.data);
        } catch {
            toast.error('Failed to reorder');
            loadSettings();
        }
    };

    const handleReset = async (id: number) => {
        setSaving(id);
        try {
            const res = await menuService.resetSmartCategorySetting(id);
            setSettings(prev => prev.map(s => s.id === id ? res.data : s));
            toast.success(`${res.data.name} reset to defaults`);
        } catch {
            toast.error('Failed to reset');
        } finally {
            setSaving(null);
        }
    };

    const handlePreview = async (id: number) => {
        if (!previewBranchId) {
            toast.error('Select a branch first');
            return;
        }
        setSaving(id);
        try {
            const res = await menuService.previewSmartCategory(id, previewBranchId);
            setPreviewData(res.data);
        } catch {
            toast.error('Failed to load preview');
        } finally {
            setSaving(null);
        }
    };

    const handleWarmCache = async () => {
        setWarming(true);
        try {
            await menuService.warmSmartCategoryCache(previewBranchId ?? undefined);
            toast.success(previewBranchId ? 'Cache warmed for branch' : 'Cache warmed for all branches');
        } catch {
            toast.error('Failed to warm cache');
        } finally {
            setWarming(false);
        }
    };

    // ─── Stats ────────────────────────────────────────────────────────

    const enabledCount = settings.filter(s => s.is_enabled).length;
    const timeBasedCount = settings.filter(s => s.is_time_based && s.is_enabled).length;

    // ─── Render ────────────────────────────────────────────────────────

    return (
        <div>
            <MenuSubTabs />

            {/* Page header */}
            <div className="flex items-start justify-between mb-5">
                <div>
                    <h2 className="text-text-dark text-base font-bold font-body">Smart Categories</h2>
                    <p className="text-neutral-gray text-xs font-body mt-0.5">
                        Auto-computed categories shown on the customer menu. Enable, reorder, and customize each category.
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {/* Branch picker for preview */}
                    <select
                        value={previewBranchId ?? ''}
                        onChange={e => setPreviewBranchId(e.target.value ? parseInt(e.target.value) : null)}
                        className="px-3 py-2 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40"
                    >
                        {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>

                    {/* Warm cache button */}
                    <button
                        onClick={handleWarmCache}
                        disabled={warming}
                        className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium font-body hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-50"
                    >
                        {warming ? (
                            <SpinnerGapIcon size={14} className="animate-spin" />
                        ) : (
                            <LightningIcon size={14} weight="bold" />
                        )}
                        Warm Cache
                    </button>
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div className="flex items-center gap-2 bg-error/10 text-error px-4 py-3 rounded-xl text-sm font-body mb-4">
                    <WarningCircleIcon size={16} />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto cursor-pointer">
                        <XIcon size={14} />
                    </button>
                </div>
            )}

            {/* Stats bar */}
            <div className="flex items-center gap-4 mb-4">
                <span className="text-xs font-body text-neutral-gray">
                    <span className="text-text-dark font-medium">{enabledCount}</span> of {settings.length} enabled
                </span>
                <span className="text-xs font-body text-neutral-gray">
                    <span className="text-text-dark font-medium">{timeBasedCount}</span> time-based active
                </span>
            </div>

            {/* Loading state */}
            {isLoading && (
                <div className="flex items-center justify-center py-16">
                    <SpinnerGapIcon size={24} className="animate-spin text-primary" />
                </div>
            )}

            {/* Category cards grid */}
            {!isLoading && settings.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {settings.map((setting, idx) => (
                        <CategoryCard
                            key={setting.id}
                            setting={setting}
                            index={idx}
                            total={settings.length}
                            saving={saving}
                            onToggle={handleToggle}
                            onUpdateLimit={handleUpdateLimit}
                            onUpdateTimeWindow={handleUpdateTimeWindow}
                            onMoveUp={handleMoveUp}
                            onMoveDown={handleMoveDown}
                            onReset={handleReset}
                            onPreview={handlePreview}
                        />
                    ))}
                </div>
            )}

            {/* Save pending limit changes — shown when user edits a limit field */}
            {settings.some(s => s.item_limit !== s.default_item_limit) && (
                <div className="flex items-center gap-3 mt-4 p-3 bg-primary/5 border border-primary/20 rounded-xl">
                    <FloppyDiskIcon size={16} className="text-primary" />
                    <p className="text-xs font-body text-text-dark flex-1">
                        You have unsaved item limit changes.
                    </p>
                    <button
                        onClick={async () => {
                            const modified = settings.filter(s => s.item_limit !== s.default_item_limit);
                            for (const s of modified) {
                                await handleSaveLimit(s.id);
                            }
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium font-body hover:bg-primary-hover transition-colors cursor-pointer"
                    >
                        <FloppyDiskIcon size={12} weight="bold" />
                        Save All
                    </button>
                </div>
            )}

            {/* Preview panel */}
            {previewData && (
                <PreviewPanel preview={previewData} onClose={() => setPreviewData(null)} />
            )}
        </div>
    );
}
