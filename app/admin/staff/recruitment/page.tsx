'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    LinkSimpleIcon,
    UsersThreeIcon,
    PlusIcon,
    SpinnerGapIcon,
    WarningCircleIcon,
} from '@phosphor-icons/react';
import { recruitmentService } from '@/lib/api/services/recruitment.service';
import type { RecruitmentApplication, RecruitmentLink } from '@/types/recruitment';
import { LinksPane } from './LinksPane';
import { ApplicationsPane } from './ApplicationsPane';
import { CreateLinkDialog } from './CreateLinkDialog';

type Pane = 'applications' | 'links';

/**
 * Onboarding — links you have out, and the new staff whose details came back.
 *
 * The hiring decision was made before anyone was sent a link; what happens here
 * is checking the details and switching the account on. That still creates a
 * staff account, which is why the whole surface sits behind `manage_employees`
 * and why the role picker only offers what the link may appoint.
 */
export default function RecruitmentPage() {
    const [pane, setPane] = useState<Pane>('applications');

    const [showHistory, setShowHistory] = useState(false);
    const [creating, setCreating] = useState(false);

    const linksQuery = useQuery({
        queryKey: ['recruitment', 'links'],
        queryFn: recruitmentService.getLinks,
    });

    const applicationsQuery = useQuery({
        queryKey: ['recruitment', 'applications', showHistory],
        queryFn: () => recruitmentService.getApplications(showHistory ? { status: 'all' } : {}),
    });

    const links: RecruitmentLink[] = linksQuery.data ?? [];
    const applications: RecruitmentApplication[] = applicationsQuery.data?.items ?? [];

    const loading = linksQuery.isPending || applicationsQuery.isPending;
    const failure = linksQuery.error ?? applicationsQuery.error;
    const error = failure instanceof Error ? failure.message : failure ? 'Could not load onboarding.' : null;

    /** Both lists move together — approving changes a link's counts as well. */
    const reload = () => {
        void linksQuery.refetch();
        void applicationsQuery.refetch();
    };

    const pendingCount = applications.filter((a) => a.status === 'pending').length;
    const openLinkCount = links.filter((l) => !l.is_expired).length;

    return (
        <div className="h-full overflow-y-auto bg-neutral-light dark:bg-brand-darker">
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">

                <header className="flex flex-wrap items-start justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-text-dark dark:text-text-light text-2xl font-semibold font-body tracking-tight">
                            Onboarding
                        </h1>
                        <p className="text-neutral-gray text-sm mt-1 font-body">
                            Send new staff a link, check the details that come back, and switch on their account.
                        </p>
                    </div>

                    <button
                        onClick={() => setCreating(true)}
                        className="flex items-center gap-2 rounded-2xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold font-body px-4 py-2.5 transition-colors"
                    >
                        <PlusIcon size={16} weight="bold" />
                        New link
                    </button>
                </header>

                <div className="flex gap-1 border-b border-[#f0e8d8] mb-6">
                    <PaneTab
                        active={pane === 'applications'}
                        onClick={() => setPane('applications')}
                        icon={<UsersThreeIcon size={16} weight={pane === 'applications' ? 'fill' : 'regular'} />}
                        label="New staff"
                        badge={pendingCount || undefined}
                    />
                    <PaneTab
                        active={pane === 'links'}
                        onClick={() => setPane('links')}
                        icon={<LinkSimpleIcon size={16} weight={pane === 'links' ? 'fill' : 'regular'} />}
                        label="Links"
                        badge={openLinkCount || undefined}
                    />
                </div>

                {error && (
                    <div className="mb-6 flex items-start gap-3 bg-error/10 border border-error/30 rounded-2xl px-4 py-3">
                        <WarningCircleIcon size={20} weight="fill" className="text-error shrink-0 mt-0.5" />
                        <p className="text-error text-sm font-body">{error}</p>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center gap-3 py-20 text-neutral-gray font-body">
                        <SpinnerGapIcon size={22} className="animate-spin" />
                        Loading…
                    </div>
                ) : pane === 'applications' ? (
                    <ApplicationsPane
                        applications={applications}
                        showHistory={showHistory}
                        onToggleHistory={setShowHistory}
                        onChanged={reload}
                    />
                ) : (
                    <LinksPane links={links} onChanged={reload} />
                )}
            </div>

            {creating && (
                <CreateLinkDialog
                    onClose={() => setCreating(false)}
                    onCreated={() => { setCreating(false); setPane('links'); reload(); }}
                />
            )}
        </div>
    );
}

function PaneTab({
    active, onClick, icon, label, badge,
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    badge?: number;
}) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium font-body border-b-2 -mb-px transition-colors ${
                active
                    ? 'border-primary text-primary'
                    : 'border-transparent text-neutral-gray hover:text-text-dark'
            }`}
        >
            {icon}
            {label}
            {badge !== undefined && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    active ? 'bg-primary/15 text-primary' : 'bg-neutral-gray/15 text-neutral-gray'
                }`}>
                    {badge}
                </span>
            )}
        </button>
    );
}
