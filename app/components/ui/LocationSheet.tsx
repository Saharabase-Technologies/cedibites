'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowClockwiseIcon, ArrowLeftIcon, CaretRightIcon, CrosshairIcon,
    MagnifyingGlassIcon, SpinnerGapIcon, StorefrontIcon, XIcon,
} from '@phosphor-icons/react';
import BottomSheet from './BottomSheet';
import { BranchConflictPanel, useBranchSwitch } from './BranchSwitch';
import { useModal } from '../providers/ModalProvider';
import { useBranch, type Branch, type BranchWithDistance } from '../providers/BranchProvider';
import { useLocation } from '../providers/LocationProvider';
import { locationRecovery, type PermissionRecovery } from '@/lib/utils/locationPermission';
import { branchTitle } from '@/lib/utils/branchName';

/**
 * Where you are, and which kitchen you are ordering from.
 *
 * This used to be two dialogs. One asked for the location and, if you declined
 * it, closed itself and opened a second one holding the branch list — a
 * different panel, a different width, a different set of colours, and both of
 * them still on the warm staff tokens after the rest of the customer side moved
 * to the brand. Answering one question took two screens and looked like two
 * products.
 *
 * It is one sheet now, with two faces. `openLocationModal()` opens on the
 * question; `openBranchSelector()`, which is what the branch chip in the header
 * calls, opens straight on the list. Sliding between them never remounts the
 * sheet, because ModalProvider flips both flags in the same batch.
 *
 * The list is deliberately not a grid of equal cards. The nearest open branch
 * is the answer to the question that opened this sheet, so it is the biggest
 * thing on the screen and everything else is a row underneath it.
 */

const SEEN_KEY = 'location-prompt-shown';

/**
 * Screens the question must never interrupt.
 *
 * Somebody halfway through paying has already chosen a branch, and a sheet
 * arriving over the payment step is a dialog that appears because a page
 * loaded — the kind browsers have trained everybody to dismiss without
 * reading. Checkout asks for the location itself, in the address field, where
 * pressing the button is what asks.
 */
const NEVER_INTERRUPT = ['/checkout', '/orders', '/track', '/account'];

// ─── The red block heading ────────────────────────────────────────────────────
// White on #f40002 is 4.33:1, which clears AA at display size and nothing else.
function Block({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-block bg-primary px-2.5 py-1.5 font-brand text-[21px] uppercase leading-none tracking-[0.03em] text-white">
            {children}
        </span>
    );
}

function OpenPill({ branch }: { branch: Branch }) {
    if (!branch.isActive) {
        return <span className="rounded-lg bg-surface-sunken px-1.5 py-0.5 text-[11px] font-bold text-fg-muted">Not open yet</span>;
    }
    return branch.isOpen
        ? <span className="rounded-lg bg-success-soft px-1.5 py-0.5 text-[11px] font-bold text-success-ink">Open</span>
        : <span className="rounded-lg bg-surface-sunken px-1.5 py-0.5 text-[11px] font-bold text-fg-muted">Closed</span>;
}

function distanceLine(branch: BranchWithDistance, haveFix: boolean): string | null {
    if (!haveFix || !Number.isFinite(branch.distance)) return null;
    const km = branch.distance < 1
        ? `${Math.round(branch.distance * 1000)} m`
        : `${branch.distance.toFixed(1)} km`;
    return branch.isWithinRadius ? `${km} away · ${branch.deliveryTime}` : `${km} away · outside its delivery ring`;
}

// ─── The question ─────────────────────────────────────────────────────────────

function AskPane({ onPickManually }: { onPickManually: () => void }) {
    const { requestLocation, permissionStatus, error, isSupported, deniedWithoutPrompt } = useLocation();
    const [recovery, setRecovery] = useState<PermissionRecovery | null>(null);

    // Read after mount. The user agent is a client fact and reading it during
    // render would make the server pass and the first client pass disagree.
    useEffect(() => { setRecovery(locationRecovery()); }, []);

    const blocked = permissionStatus === 'denied' || !isSupported;
    const working = permissionStatus === 'loading';

    if (blocked && recovery) {
        return (
            <div className="flex flex-col gap-5 px-5 pb-6">
                <div>
                    <Block>Location is off</Block>
                    <p className="mt-4 text-sm leading-relaxed text-fg">
                        {deniedWithoutPrompt
                            ? 'Your phone turned us down before this page could even ask. That switch is in the phone’s own settings, not on this site.'
                            : 'This browser will not share where you are. Two switches can block it: the browser’s and the phone’s.'}
                    </p>
                </div>

                <div>
                    <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-fg-muted">
                        {recovery.device}
                    </p>
                    <ol className="mt-3 flex flex-col gap-3">
                        {recovery.steps.map((step, i) => (
                            <li key={step} className="flex gap-2.5">
                                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-lg bg-fg text-[11px] font-bold tabular-nums text-surface">
                                    {i + 1}
                                </span>
                                <span className="min-w-0 text-sm leading-relaxed text-balance text-fg">{step}</span>
                            </li>
                        ))}
                    </ol>
                    <p className="mt-3 pl-7.5 text-[13px] font-semibold text-fg-muted">{recovery.after}</p>
                </div>

                <div className="flex flex-col gap-2.5">
                    <button
                        onClick={requestLocation}
                        className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary-fill px-5 text-sm font-bold text-white transition-[filter] duration-150 ease-out hover:brightness-95"
                    >
                        <ArrowClockwiseIcon size={16} weight="bold" />
                        I have changed it, try again
                    </button>
                    <button
                        onClick={onPickManually}
                        className="flex min-h-12 items-center justify-center rounded-xl border border-hairline-strong px-5 text-sm font-bold text-fg transition-colors duration-150 ease-out hover:bg-surface-sunken"
                    >
                        Pick a branch myself
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 px-5 pb-6">
            <div>
                <Block>Where are you?</Block>
                <p className="mt-4 text-sm leading-relaxed text-fg">
                    Tell us once. The nearest kitchen goes to the top of the list, with the real
                    distance to your door beside it.
                </p>
            </div>

            {error && permissionStatus !== 'loading' && (
                <p className="text-[13px] font-semibold text-danger-ink">{error}</p>
            )}

            <div className="flex flex-col gap-2.5">
                <button
                    onClick={requestLocation}
                    disabled={working}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary-fill px-5 text-sm font-bold text-white transition-[filter] duration-150 ease-out hover:brightness-95 disabled:opacity-60"
                >
                    {working
                        ? <><SpinnerGapIcon size={16} className="animate-spin" /> Finding you</>
                        : <><CrosshairIcon size={16} weight="bold" /> Use my location</>}
                </button>
                <button
                    onClick={onPickManually}
                    className="flex min-h-12 items-center justify-center rounded-xl border border-hairline-strong px-5 text-sm font-bold text-fg transition-colors duration-150 ease-out hover:bg-surface-sunken"
                >
                    Pick a branch myself
                </button>
            </div>

            <p className="text-[13px] leading-relaxed text-fg-muted">
                It sorts the branches and works out how far the food has to travel. Nothing is
                saved to your account.
            </p>
        </div>
    );
}

// ─── The list ─────────────────────────────────────────────────────────────────

function NearestBranch({ branch, haveFix, onSelect }: {
    branch: BranchWithDistance;
    haveFix: boolean;
    onSelect: (b: Branch) => void;
}) {
    const line = distanceLine(branch, haveFix);

    return (
        <button
            onClick={() => onSelect(branch)}
            className="w-full rounded-2xl bg-surface-sunken px-4 py-4 text-left transition-colors duration-150 ease-out hover:bg-hairline"
        >
            <span className="inline-block rounded-lg bg-accent px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-on-accent">
                Nearest to you
            </span>
            <span className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <span className="font-brand text-[22px] uppercase leading-none tracking-[0.01em] text-fg sm:text-[26px]">
                    {branchTitle(branch.name)}
                </span>
                <OpenPill branch={branch} />
            </span>
            <span className="mt-1.5 block text-[13px] leading-relaxed text-fg-muted">{branch.address}</span>
            {line && <span className="mt-1 block text-[13px] font-semibold tabular-nums text-fg">{line}</span>}
        </button>
    );
}

function BranchRow({ branch, haveFix, isCurrent, onSelect }: {
    branch: BranchWithDistance;
    haveFix: boolean;
    isCurrent: boolean;
    onSelect: (b: Branch) => void;
}) {
    const line = distanceLine(branch, haveFix);
    const shut = !branch.isActive;

    return (
        <button
            onClick={() => onSelect(branch)}
            disabled={shut}
            className="flex w-full items-center gap-3 py-3.5 text-left transition-opacity duration-150 ease-out hover:opacity-70 disabled:opacity-40 disabled:hover:opacity-40"
        >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-sunken text-fg-muted">
                <StorefrontIcon size={16} weight="fill" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="min-w-0 break-words text-sm font-bold text-fg">{branchTitle(branch.name)}</span>
                    {isCurrent
                        ? <span className="rounded-lg bg-primary-fill px-1.5 py-0.5 text-[11px] font-bold text-white">You are here</span>
                        : <OpenPill branch={branch} />}
                </span>
                <span className="mt-0.5 block truncate text-[13px] text-fg-muted">{branch.address}</span>
                {line && <span className="mt-0.5 block truncate text-[13px] tabular-nums text-fg-subtle">{line}</span>}
            </span>
            {!shut && <CaretRightIcon size={15} weight="bold" className="shrink-0 text-fg-subtle" />}
        </button>
    );
}

function ListPane({ onSelect }: { onSelect: (b: Branch) => void }) {
    const { selectedBranch, branches, getBranchesWithDistance, isLoading } = useBranch();
    const { coordinates, requestLocation, permissionStatus } = useLocation();
    const [query, setQuery] = useState('');

    const haveFix = Boolean(coordinates);

    const sorted: BranchWithDistance[] = useMemo(() => (
        coordinates
            ? getBranchesWithDistance(coordinates.latitude, coordinates.longitude)
            : branches.map(b => ({ ...b, distance: NaN, deliveryTime: '–', isWithinRadius: true }))
    ), [coordinates, branches, getBranchesWithDistance]);

    const matches = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return sorted;
        return sorted.filter(b =>
            b.name.toLowerCase().includes(q)
            || (b.area ?? '').toLowerCase().includes(q)
            || b.address.toLowerCase().includes(q),
        );
    }, [sorted, query]);

    /**
     * Raised out of the list, but only when it was actually worked out.
     *
     * With no position every branch is equidistant, so calling the first one
     * "nearest to you" would be a guess printed as a fact. And a search is a
     * question about a particular branch: pinning a different one above the
     * answers is in the way.
     */
    const nearest = haveFix && !query.trim()
        ? matches.find(b => b.isOpen && b.isActive) ?? null
        : null;
    const rest = nearest ? matches.filter(b => b.id !== nearest.id) : matches;

    return (
        <div className="flex flex-col gap-4 px-5 pb-6">
            <div className="flex min-h-12 items-center rounded-xl border border-hairline bg-surface transition-colors duration-150 ease-out focus-within:border-fg">
                <MagnifyingGlassIcon size={16} weight="bold" className="ml-3.5 shrink-0 text-fg-subtle" />
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="A branch, an area, a street"
                    className="min-w-0 flex-1 bg-transparent px-3 text-fg outline-none placeholder:text-fg-subtle"
                />
                {query && (
                    <button
                        onClick={() => setQuery('')}
                        aria-label="Clear the search"
                        className="grid h-11 w-11 shrink-0 place-items-center text-fg-subtle transition-colors duration-150 ease-out hover:text-fg"
                    >
                        <XIcon size={15} weight="bold" />
                    </button>
                )}
            </div>

            {!haveFix && permissionStatus !== 'denied' && (
                <button
                    onClick={requestLocation}
                    disabled={permissionStatus === 'loading'}
                    className="flex items-center gap-1.5 self-start text-[13px] font-bold text-fg underline underline-offset-4 transition-opacity duration-150 ease-out hover:opacity-70 disabled:opacity-50"
                >
                    {permissionStatus === 'loading'
                        ? <><SpinnerGapIcon size={13} className="animate-spin" /> Finding you</>
                        : <><CrosshairIcon size={13} weight="bold" /> Sort these by how close they are</>}
                </button>
            )}

            {isLoading && branches.length === 0 ? (
                <div className="flex justify-center py-14">
                    <SpinnerGapIcon size={24} className="animate-spin text-fg-subtle" />
                </div>
            ) : matches.length === 0 ? (
                <p className="py-14 text-center text-sm text-fg-muted">
                    {query.trim()
                        ? `Nothing matches “${query.trim()}”.`
                        : 'No branch is taking orders right now.'}
                </p>
            ) : (
                <>
                    {nearest && (
                        <NearestBranch branch={nearest} haveFix={haveFix} onSelect={onSelect} />
                    )}
                    <div className="divide-y divide-hairline">
                        {rest.map(branch => (
                            <BranchRow
                                key={branch.id}
                                branch={branch}
                                haveFix={haveFix}
                                isCurrent={branch.id === selectedBranch?.id}
                                onSelect={onSelect}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// ─── The sheet ────────────────────────────────────────────────────────────────

export default function LocationSheet() {
    const {
        isLocationModalOpen, openLocationModal, closeLocationModal,
        isBranchSelectorOpen, openBranchSelector, closeBranchSelector,
    } = useModal();
    const { coordinates, permissionStatus } = useLocation();
    const { selectNearestBranchNow } = useBranch();
    const pathname = usePathname();

    const open = isLocationModalOpen || isBranchSelectorOpen;
    const pane = isBranchSelectorOpen ? 'list' : 'ask';

    const close = useCallback(() => {
        closeLocationModal();
        closeBranchSelector();
    }, [closeLocationModal, closeBranchSelector]);

    const remember = useCallback(() => {
        try { localStorage.setItem(SEEN_KEY, 'true'); } catch { /* private window */ }
    }, []);

    const { conflict, removing, selectBranch, removeAndSwitch, keepCurrentBranch, reset } =
        useBranchSwitch({ onSettled: () => { remember(); close(); } });

    // Backing out and coming back must not reopen a conflict about a branch
    // that has already been walked away from.
    useEffect(() => {
        if (open) return;
        const t = setTimeout(reset, 300);
        return () => clearTimeout(t);
    }, [open, reset]);

    // ── The one automatic appearance ────────────────────────────────────────
    const prompted = useRef(false);
    useEffect(() => {
        if (prompted.current || open) return;
        // Still working it out, or already answered.
        if (permissionStatus === 'loading' || permissionStatus === 'granted') return;
        // Refused. Asking again on every page load is nagging, and the recovery
        // steps are one tap away on the branch chip and at checkout.
        if (permissionStatus === 'denied') return;
        if (coordinates) return;
        if (NEVER_INTERRUPT.some(p => pathname === p || pathname.startsWith(`${p}/`))) return;

        try {
            if (localStorage.getItem(SEEN_KEY)) { prompted.current = true; return; }
        } catch { return; }

        prompted.current = true;
        openLocationModal();
    }, [permissionStatus, coordinates, open, pathname, openLocationModal]);

    /**
     * Granting it from the question answers the question.
     *
     * Only while the sheet is open on the ask pane, so a permission granted
     * somewhere else on the site never silently moves a branch the customer
     * chose for themselves.
     */
    useEffect(() => {
        if (!isLocationModalOpen || !coordinates) return;
        selectNearestBranchNow();
        remember();
        const t = setTimeout(close, 400);
        return () => clearTimeout(t);
    }, [isLocationModalOpen, coordinates, selectNearestBranchNow, remember, close]);

    const goToList = useCallback(() => { remember(); openBranchSelector(); }, [remember, openBranchSelector]);

    const dismiss = useCallback(() => { remember(); close(); }, [remember, close]);

    const header = (
        <div className="flex items-center gap-2 px-5 pb-3 pt-1 md:pt-5">
            {conflict && (
                <button
                    onClick={keepCurrentBranch}
                    aria-label="Back to the branch list"
                    className="-ml-2 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-fg transition-colors duration-150 ease-out hover:bg-surface-sunken"
                >
                    <ArrowLeftIcon size={17} weight="bold" />
                </button>
            )}
            <h2 className="flex-1 text-lg font-bold text-fg">
                {conflict ? 'Not on that menu' : pane === 'list' ? 'Choose a branch' : 'Your location'}
            </h2>
            <button
                onClick={dismiss}
                aria-label="Close"
                className="-mr-2 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-fg-muted transition-colors duration-150 ease-out hover:bg-surface-sunken hover:text-fg"
            >
                <XIcon size={18} weight="bold" />
            </button>
        </div>
    );

    if (!open) return null;

    return (
        <BottomSheet open={open} onClose={dismiss} label="Choose a branch" header={header}>
            {conflict ? (
                <div className="px-5 pb-5">
                    <BranchConflictPanel
                        conflict={conflict}
                        removing={removing}
                        onRemoveAndSwitch={removeAndSwitch}
                        onKeepCurrent={dismiss}
                        onPickAnother={keepCurrentBranch}
                    />
                </div>
            ) : pane === 'list' ? (
                <ListPane onSelect={selectBranch} />
            ) : (
                <AskPane onPickManually={goToList} />
            )}
        </BottomSheet>
    );
}
