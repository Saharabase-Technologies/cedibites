'use client';

import ScreenHeader from '@/app/components/layout/ScreenHeader';
import React from 'react';
import { useAccount } from './AccountContext';
import FootAction, { type Foot } from './FootAction';
import Hub from './Hub';

/**
 * Every account screen, laid out for the width it is on.
 *
 * Below lg the hub and its screens are separate places. The hub is a list of
 * ways in, and each screen has a back arrow and one button at the foot. Each
 * screen is a route, so the phone's back gesture steps back one screen. The
 * checkout's steps are state, not routes, and there it leaves checkout.
 *
 * From lg up they are one page. The hub is a column on the left that stays in
 * view with the current screen marked, and the screen sits beside it. The
 * hub's own route shows the addresses there: a desk has room for both, and the
 * addresses are what people come to change.
 */
export default function AccountShell({ title, parent, foot, hub = false, children }: {
    /** The bar title below lg, the heading beside the column from lg up. */
    title: string;
    /** Where the back arrow goes. */
    parent?: string;
    foot?: Foot;
    /** The hub's own route, which is the hub alone below lg. */
    hub?: boolean;
    children: React.ReactNode;
}) {
    const { goUp } = useAccount();

    return (
        <>
            {!hub && parent && (
                <ScreenHeader
                    title={title}
                    onBack={() => goUp(parent)}
                    backLabel="Back"
                    className="lg:hidden"
                />
            )}

            <div className="page-x">
                {/* The width caps sit on this inner div. `.page-x` carries a
                    max-width of its own that beats any max-w-* beside it. */}
                <div className="mx-auto max-w-xl lg:grid lg:max-w-6xl lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start lg:gap-12 lg:py-12 xl:grid-cols-[22rem_minmax(0,1fr)] xl:gap-16">

                    <div className={`${hub ? 'pb-10 pt-6' : 'hidden'} lg:sticky lg:top-[calc(var(--nav-h)+2rem)] lg:block lg:py-0`}>
                        {hub && <h1 className="sr-only lg:hidden">Your account</h1>}
                        <Hub />
                    </div>

                    <main className={`${hub ? 'hidden' : 'pb-6 pt-4'} min-w-0 lg:block lg:py-0`}>
                        <h1 className="mb-5 hidden text-2xl font-bold leading-tight text-fg lg:block">{title}</h1>
                        {children}
                        {foot && <FootAction {...foot} pinned={!hub} />}
                    </main>
                </div>
            </div>
        </>
    );
}
