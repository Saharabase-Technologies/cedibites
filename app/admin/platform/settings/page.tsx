'use client';

import { useState } from 'react';
import { ArrowCounterClockwiseIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';

/**
 * Behaviour settings, changeable without SSH.
 *
 * These are DB overrides on top of the server's .env, not edits to it. That is
 * why a change takes effect immediately with no restart, why a bad value cannot
 * stop the app booting, and why no credential appears here — the allowlist that
 * makes it safe lives in RuntimeSettings::definitions() on the backend.
 */

interface RuntimeSetting {
    key: string;
    group: string;
    label: string;
    help: string;
    type: 'boolean' | 'integer';
    value: boolean | number;
    default: boolean | number;
    /** Which of value/default is winning. */
    source: 'env' | 'override';
    danger?: boolean;
    min?: number;
    max?: number;
}

export default function PlatformSettingsPage() {
    const queryClient = useQueryClient();
    const [note, setNote] = useState<string | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ['platform-settings'],
        queryFn: () =>
            apiClient
                .get('/platform/settings')
                .then((response) => (response as { data: { settings: RuntimeSetting[]; environment: string } }).data),
    });

    const save = useMutation({
        mutationFn: (payload: { key: string; value: boolean | number }) =>
            apiClient.put('/platform/settings', payload),
        onSuccess: () => {
            setNote('Saved. It takes effect immediately — no restart needed.');
            queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
        },
    });

    const revert = useMutation({
        mutationFn: (key: string) => apiClient.post('/platform/settings/revert', { key }),
        onSuccess: () => {
            setNote('Back to the server default.');
            queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
        },
    });

    if (isLoading || !data) {
        return <p className="p-6 font-body text-sm text-neutral-gray">Loading…</p>;
    }

    const isProduction = data.environment === 'production';
    const groups = Array.from(new Set(data.settings.map((setting) => setting.group)));

    return (
        <div className="p-4 sm:p-6 max-w-3xl mx-auto">
            <h1 className="font-brand text-2xl text-brand-dark">Platform settings</h1>
            <p className="font-body text-sm text-neutral-gray mt-1">
                Changes apply straight away. No deploy, no restart.
            </p>

            {/* Which server you are on, in plain sight. Two tabs open side by
                side is how somebody changes production believing it is beta. */}
            <div
                className={`flex items-center gap-2 mt-4 mb-5 rounded-xl px-4 py-3 ${
                    isProduction
                        ? 'bg-error/10 border border-error/25'
                        : 'bg-neutral-light border border-black/5'
                }`}
            >
                {isProduction && <WarningCircleIcon size={18} weight="fill" className="text-error" />}
                <p className="font-body text-sm text-brand-dark">
                    You are editing{' '}
                    <strong className={isProduction ? 'text-error' : 'text-brand-dark'}>
                        {data.environment}
                    </strong>
                    .
                </p>
            </div>

            {note && (
                <p className="mb-4 rounded-xl bg-secondary-light/50 px-4 py-2.5 font-body text-sm text-secondary">
                    {note}
                </p>
            )}

            {groups.map((group) => (
                <section key={group} className="mb-6">
                    <h2 className="font-body font-semibold text-brand-dark mb-3">{group}</h2>

                    <div className="space-y-3">
                        {data.settings
                            .filter((setting) => setting.group === group)
                            .map((setting) => (
                                <SettingRow
                                    key={setting.key}
                                    setting={setting}
                                    isProduction={isProduction}
                                    busy={save.isPending || revert.isPending}
                                    onSave={(value) => save.mutate({ key: setting.key, value })}
                                    onRevert={() => revert.mutate(setting.key)}
                                />
                            ))}
                    </div>
                </section>
            ))}
        </div>
    );
}

function SettingRow({
    setting,
    isProduction,
    busy,
    onSave,
    onRevert,
}: {
    setting: RuntimeSetting;
    isProduction: boolean;
    busy: boolean;
    onSave: (value: boolean | number) => void;
    onRevert: () => void;
}) {
    const [draft, setDraft] = useState(String(setting.value));

    function toggle() {
        const next = !setting.value;

        // Only the dangerous ones on production ask twice. Confirming everything
        // trains people to click through the confirmation without reading it,
        // which is worse than not having one.
        if (setting.danger && isProduction && next !== setting.default) {
            const ok = window.confirm(
                `Turn ${next ? 'ON' : 'OFF'} "${setting.label}" on PRODUCTION?\n\nThis affects every branch immediately.`,
            );
            if (!ok) return;
        }

        onSave(next);
    }

    return (
        <div className="rounded-2xl bg-neutral-card shadow-sm p-4">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="font-body text-sm font-semibold text-brand-dark">{setting.label}</p>
                        {setting.source === 'override' && (
                            <span className="px-2 py-0.5 rounded-full bg-primary-light text-[10px] font-body text-brand-dark">
                                overridden
                            </span>
                        )}
                    </div>
                    <p className="font-body text-xs text-neutral-gray mt-1">{setting.help}</p>
                </div>

                <div className="shrink-0">
                    {setting.type === 'boolean' ? (
                        <button
                            type="button"
                            onClick={toggle}
                            disabled={busy}
                            aria-label={setting.label}
                            className={`relative w-12 h-6.5 rounded-full transition-colors disabled:opacity-50 cursor-pointer ${
                                setting.value ? 'bg-secondary' : 'bg-neutral-gray/35'
                            }`}
                        >
                            <span
                                className={`absolute top-0.75 w-5 h-5 rounded-full bg-white shadow transition-all ${
                                    setting.value ? 'left-6.25' : 'left-0.75'
                                }`}
                            />
                        </button>
                    ) : (
                        <div className="flex items-center gap-1.5">
                            <input
                                type="number"
                                value={draft}
                                min={setting.min}
                                max={setting.max}
                                onChange={(event) => setDraft(event.target.value)}
                                className="w-20 px-2 py-1 rounded-lg border border-black/10 bg-neutral-light/40 text-sm font-body"
                            />
                            <button
                                type="button"
                                onClick={() => onSave(Number(draft))}
                                disabled={busy || draft === String(setting.value)}
                                className="px-2.5 py-1 rounded-lg bg-primary hover:bg-primary-hover text-brand-darker text-xs font-body font-semibold transition-colors disabled:opacity-40 cursor-pointer"
                            >
                                Save
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3 mt-2.5">
                <p className="font-body text-[11px] text-neutral-gray">
                    Server default: <strong>{String(setting.default)}</strong>
                </p>

                {setting.source === 'override' && (
                    <button
                        type="button"
                        onClick={onRevert}
                        disabled={busy}
                        className="flex items-center gap-1 font-body text-[11px] text-primary hover:underline disabled:opacity-50 cursor-pointer"
                    >
                        <ArrowCounterClockwiseIcon size={12} />
                        Use the default
                    </button>
                )}
            </div>
        </div>
    );
}
