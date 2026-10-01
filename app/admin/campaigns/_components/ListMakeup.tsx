'use client';

import { useCampaignSegments } from '@/lib/api/hooks/useCampaigns';
import type { CampaignSegmentOption, CampaignSegmentValue } from '@/types/marketing';
import { CHART, MagnitudeBars, PartsBar, type Segment } from './charts';

/**
 * Who the campaigns on this page can reach.
 *
 * The six audience presets were only ever numbers in a picker, three screens
 * into writing a campaign. Drawn here they answer the questions somebody has
 * before writing one: how big is the list, how much of it is still ordering,
 * and how much of it cannot be texted at all.
 *
 * Two bars and a short list, because the presets are two different cuts of the
 * same people. One is how recently they ordered, the other how often, and a
 * person sits in one slice of each. Putting all five in a single chart would
 * count everybody twice.
 */
export function ListMakeup() {
    const { segments, networks, isLoading, error } = useCampaignSegments();

    if (error) {
        return null;
    }

    if (isLoading) {
        return <div className="h-52 rounded-2xl bg-neutral-card shadow-sm animate-pulse motion-reduce:animate-none mt-6" />;
    }

    const count = (value: CampaignSegmentValue): CampaignSegmentOption | undefined =>
        segments.find((s) => s.value === value);

    const total = count('all')?.count ?? 0;

    if (total <= 0) {
        return null;
    }

    const part = (value: CampaignSegmentValue, color: string): Segment => ({
        key: value,
        label: count(value)?.label ?? value,
        value: count(value)?.count ?? 0,
        color,
    });

    // Dark to light as the last order gets older. One hue, because these are
    // steps along one scale and not three different kinds of customer.
    const recency = [
        part('active', CHART.ramp[0]),
        part('at_risk', CHART.ramp[1]),
        part('churned', CHART.ramp[2]),
    ];

    const frequency = [part('loyal', CHART.ramp[0]), part('one_time', CHART.ramp[2])];

    // People with an account and no order yet. They are on the list and in
    // neither cut, so each bar says so instead of quietly coming up short.
    const neverOrdered = Math.max(0, total - recency.reduce((sum, s) => sum + s.value, 0));

    const never: Segment = { key: 'never', label: 'Never ordered', value: neverOrdered, color: CHART.muted };

    const notMobile = networks.find((n) => n.value === 'other')?.count ?? 0;
    const reachable = total - notMobile;

    return (
        <section className="bg-neutral-card rounded-2xl shadow-sm px-5 py-5 mt-6">
            <h2 className="font-brand text-text-dark text-xl font-bold leading-tight">
                {reachable.toLocaleString()} people can be texted
            </h2>
            <p className="text-neutral-gray text-sm font-body mt-1 max-w-2xl">
                {notMobile > 0
                    ? `The list holds ${total.toLocaleString()} numbers. ${notMobile.toLocaleString()} of them are not mobile numbers, mostly placeholders typed at the till, and are left off every send.`
                    : 'Every number we hold from an order or an account.'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr] gap-x-10 gap-y-6 mt-5">
                <div className="space-y-5">
                    <div>
                        <h3 className="text-text-dark text-sm font-semibold font-body">When they last ordered</h3>
                        <PartsBar
                            segments={[...recency, never]}
                            total={total}
                            keyLayout="inline"
                            label="The list by how recently each person ordered"
                        />
                        <p className="text-neutral-gray text-xs font-body mt-1.5">
                            {describe(['active', 'at_risk', 'churned'], count)}
                        </p>
                    </div>

                    <div>
                        <h3 className="text-text-dark text-sm font-semibold font-body">How often they order</h3>
                        <PartsBar
                            segments={[...frequency, never]}
                            total={total}
                            keyLayout="inline"
                            label="The list by how many times each person has ordered"
                        />
                        <p className="text-neutral-gray text-xs font-body mt-1.5">
                            {describe(['loyal', 'one_time'], count)}
                        </p>
                    </div>
                </div>

                {networks.length > 0 && (
                    <div>
                        <h3 className="text-text-dark text-sm font-semibold font-body mb-3">By network</h3>
                        <MagnitudeBars
                            label="The list by mobile network"
                            rows={networks
                                .filter((n) => n.count > 0)
                                .map((n) => ({
                                    key: n.value,
                                    label: n.label,
                                    value: n.count,
                                    muted: n.value === 'other',
                                }))}
                        />
                        <p className="text-neutral-gray text-xs font-body mt-3">
                            Read off each number&apos;s prefix, so a ported number counts where it started.
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}

/**
 * What each slice means, in the server's own words.
 *
 * "Active: Ordered in the last 30 days." The definitions live on the backend
 * beside the code that applies them, so they are quoted and not retyped here.
 */
function describe(
    values: CampaignSegmentValue[],
    count: (value: CampaignSegmentValue) => CampaignSegmentOption | undefined,
): string {
    return values
        .map((value) => count(value))
        .filter((s): s is CampaignSegmentOption => Boolean(s))
        .map((s) => `${s.label}: ${s.description.replace(/\.$/, '').toLowerCase()}.`)
        .join(' ');
}
