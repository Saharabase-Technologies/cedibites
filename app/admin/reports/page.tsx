'use client';

import { useState } from 'react';
import { ArrowSquareOutIcon, CheckIcon, CopyIcon } from '@phosphor-icons/react';
import { PageHeader } from '@/app/inventory/_components';
import { REPORTS, type Report } from '@/lib/constants/reports';

/**
 * Where the admin finds the written reports. Each one opens at its own public
 * address in a new tab, so it can be read beside the portal and the link can be
 * sent to somebody who has no login.
 */
export default function AdminReportsPage() {
    return (
        <div className="h-full overflow-y-auto bg-neutral-light">
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
                <PageHeader
                    title="Reports"
                    subtitle="Anyone with a report's link can read it, with no sign-in."
                />

                <ul className="space-y-3">
                    {REPORTS.map((report) => (
                        <ReportRow key={report.slug} report={report} />
                    ))}
                </ul>
            </div>
        </div>
    );
}

function ReportRow({ report }: { report: Report }) {
    const [copied, setCopied] = useState(false);
    const href = `/reports/${report.slug}`;

    async function copy() {
        try {
            await navigator.clipboard.writeText(new URL(href, window.location.origin).toString());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* clipboard blocked: Open report still gives the address */
        }
    }

    return (
        <li className="bg-neutral-card border border-[#f0e8d8] rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4">
            <div className="min-w-0 flex-1">
                <h2 className="text-text-dark font-semibold font-body">{report.title}</h2>
                <p className="text-neutral-gray text-sm font-body mt-1">{report.summary}</p>
                <p className="text-neutral-gray text-xs font-body mt-2">
                    {report.period}. Updated {report.updated}.
                </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <button
                    onClick={copy}
                    className="flex items-center gap-2 bg-neutral-card border border-[#e3ddd0] text-text-dark px-4 py-2.5 rounded-xl text-sm font-semibold font-body hover:border-neutral-gray/50 transition-colors min-h-11 cursor-pointer"
                >
                    {copied ? (
                        <CheckIcon size={16} weight="bold" className="text-emerald-600" />
                    ) : (
                        <CopyIcon size={16} />
                    )}
                    {copied ? 'Link copied' : 'Copy link'}
                </button>
                <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-semibold font-body hover:bg-primary/90 transition-colors min-h-11 shadow-sm"
                >
                    <ArrowSquareOutIcon size={16} weight="bold" />
                    Open report
                </a>
            </div>
        </li>
    );
}
