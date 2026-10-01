'use client';

import type { Campaign, CampaignReach, CampaignReport } from '@/types/marketing';
import { CHART, ChartKey, CheckpointColumns, MagnitudeBars, PartsBar, type Segment } from './charts';

/**
 * How far a campaign got, starting from the whole list.
 *
 * The first thing on the page once a campaign has gone out. The bar is the
 * list, cut into what happened to each part of it, so "39 of 3,539" is a sliver
 * of green at the end of a long gold bar and cannot be read as a success.
 */

/**
 * The list's figures when the API serves no report.
 *
 * An older API, or the moment before the report loads. The campaign row holds
 * enough to draw the bar honestly, only without the finer split.
 */
export function reachFromCampaign(campaign: Campaign): CampaignReach {
    const accounted = campaign.sent_count + campaign.failed_count;

    return {
        tracked: false,
        audience: campaign.recipient_count,
        accepted: campaign.sent_count,
        delivered: campaign.delivered_count,
        refused: campaign.failed_count,
        unsure: 0,
        waiting: Math.max(0, campaign.recipient_count - accounted),
        not_mobile: 0,
        resumable: campaign.resumable_count ?? 0,
        resumable_with_unsure: campaign.resumable_count ?? 0,
    };
}

function reachSegments(campaign: Campaign, reach: CampaignReach, topReason: string | null): Segment[] {
    // Nothing honest to say about delivery until the poll has run once.
    const delivered = campaign.delivery_checked_at ? Math.min(reach.delivered, reach.accepted) : 0;

    return [
        {
            key: 'delivered',
            label: 'Delivered',
            note: 'The phone confirmed it arrived.',
            value: delivered,
            color: CHART.delivered,
        },
        {
            key: 'on_its_way',
            label: 'Sent, not confirmed',
            note: campaign.delivery_checked_at
                ? 'Hubtel has it. No receipt from the phone.'
                : 'Hubtel has it. Delivery has not been checked yet.',
            value: reach.accepted - delivered,
            color: CHART.onItsWay,
        },
        {
            key: 'waiting',
            label: 'Not sent yet',
            note:
                campaign.status === 'sending'
                    ? 'Still going out.'
                    : 'Held. Nothing was sent to these people.',
            value: reach.waiting,
            color: CHART.waiting,
        },
        {
            key: 'refused',
            label: 'Refused by Hubtel',
            note: topReason ? `${topReason}. Nothing was sent.` : 'Hubtel took nothing. Nothing was sent.',
            value: reach.refused,
            color: CHART.refused,
        },
        {
            key: 'unsure',
            label: 'No answer from Hubtel',
            note: 'May have arrived. Not sent again unless you choose to.',
            value: reach.unsure,
            color: CHART.unsure,
        },
        {
            key: 'not_mobile',
            label: 'Not mobile numbers',
            note: 'No network uses these prefixes. Left out.',
            value: reach.not_mobile,
            color: CHART.muted,
        },
    ];
}

const MARK_LABELS: Record<number, string> = { 1: '1 hour', 6: '6 hours', 24: '1 day', 48: '2 days' };

export function ReachPanel({ campaign, report }: { campaign: Campaign; report: CampaignReport | null }) {
    const reach = report?.reach ?? reachFromCampaign(campaign);

    if (reach.audience <= 0) {
        return null;
    }

    // The commonest reason people on this list were not sent to, for the note
    // beside the refused figure. Invalid numbers have their own row.
    const topReason = report?.reasons.find((r) => r.reason !== 'invalid_recipient')?.label ?? null;

    const segments = reachSegments(campaign, reach, topReason);

    return (
        <section className="bg-neutral-card rounded-2xl shadow-sm px-5 py-5 mb-4">
            <h2 className="font-brand text-text-dark text-2xl font-bold leading-tight">
                {reach.accepted.toLocaleString()} of {reach.audience.toLocaleString()} people sent to
            </h2>
            <p className="text-neutral-gray text-sm font-body mt-1 mb-3">{reachSentence(campaign, reach)}</p>

            <PartsBar
                segments={segments}
                total={reach.audience}
                label={`${reach.accepted.toLocaleString()} of ${reach.audience.toLocaleString()} people sent to`}
            />
        </section>
    );
}

/** One plain sentence under the headline. Says the state, never repeats the figures. */
function reachSentence(campaign: Campaign, reach: CampaignReach): string {
    switch (campaign.status) {
        case 'sending':
            return 'Going out now. This page updates on its own.';
        case 'paused':
            return 'Stopped part way. The rest of the list is held and has not been sent to.';
        case 'sent':
            return 'Everyone on the list was sent to.';
        case 'partly_sent':
            return reach.resumable > 0
                ? 'Finished, with part of the list missed.'
                : 'Finished. Everyone who can be sent to has been.';
        case 'failed':
            return 'Nobody was sent to.';
        default:
            return '';
    }
}

/**
 * Delivery over time and by network, side by side.
 *
 * Only once Hubtel has accepted something. Before that there is no delivery to
 * chart, and two empty frames would say less than the bar above already does.
 */
export function DeliveryCharts({ campaign, report }: { campaign: Campaign; report: CampaignReport | null }) {
    if (!report || report.reach.accepted <= 0) {
        return null;
    }

    const accepted = report.reach.accepted;

    const marks = report.curve.map((point) => ({
        key: String(point.hour),
        label: MARK_LABELS[point.hour] ?? `${point.hour} hours`,
        value: point.delivered,
        // An API that does not say assumes the mark has passed, which is what
        // the page showed before.
        reached: point.reached ?? true,
    }));

    const networks = report.networks
        .filter((n) => n.sent_to > 0)
        .map((n) => ({
            key: n.value,
            label: n.label,
            value: n.sent_to,
            muted: n.value === 'other',
            parts: [
                { key: 'delivered', value: n.delivered, color: CHART.delivered },
                { key: 'on_its_way', value: Math.max(0, n.accepted - n.delivered), color: CHART.onItsWay },
            ],
            readout: (
                <>
                    <span className="font-semibold">{n.delivered.toLocaleString()}</span>
                    <span className="text-neutral-gray"> of {n.sent_to.toLocaleString()}</span>
                </>
            ),
        }));

    return (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.35fr] items-start gap-4 mb-4">
            <section className="bg-neutral-card rounded-2xl shadow-sm px-5 py-4">
                <h2 className="text-text-dark font-semibold font-body">Delivered over time</h2>
                <p className="text-neutral-gray text-xs font-body mt-0.5 mb-4">
                    How many phones had confirmed it by each mark after the send.
                </p>
                <CheckpointColumns
                    marks={marks}
                    ceiling={accepted}
                    ceilingLabel={`${accepted.toLocaleString()} accepted`}
                />
            </section>

            {networks.length > 0 && (
                <section className="bg-neutral-card rounded-2xl shadow-sm px-5 py-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <h2 className="text-text-dark font-semibold font-body">By network</h2>
                        <ChartKey
                            items={[
                                { label: 'Delivered', color: CHART.delivered },
                                { label: 'Sent, not confirmed', color: CHART.onItsWay },
                                { label: 'Not sent', color: CHART.track },
                            ]}
                        />
                    </div>
                    <p className="text-neutral-gray text-xs font-body mt-0.5 mb-4">
                        Delivered, out of everyone on the list with that network. Read off the number&apos;s
                        prefix, so a ported number counts where it started.
                    </p>
                    <MagnitudeBars rows={networks} label="Delivery by network" />
                    {campaign.delivery_checked_at === null && (
                        <p className="text-neutral-gray text-xs font-body mt-3">
                            Delivery has not been checked yet. It is read from Hubtel every 15 minutes.
                        </p>
                    )}
                </section>
            )}
        </div>
    );
}
