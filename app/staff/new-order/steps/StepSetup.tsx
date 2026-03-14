'use client';

import { CaretRightIcon } from '@phosphor-icons/react';
import { BRANCHES } from '@/app/components/providers/BranchProvider';
import { useNewOrder } from '../context';
import { ORDER_SOURCES, formatGHS} from '../utils';

// ─── Step 1: Setup ────────────────────────────────────────────────────────────

export default function StepSetup() {
    const { source, branchId, setSource, setBranchId, setStep } = useNewOrder();
    const canProceed = !!source && !!branchId;

    return (
        <div className="flex flex-col h-full">

            {/* Order source */}
            <div className="shrink-0">
                <h2 className="text-text-dark dark:text-text-light text-sm font-semibold font-body mb-3">
                    Where is this order coming from?
                </h2>
                <div className="grid grid-cols-4 gap-2">
                    {ORDER_SOURCES.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setSource(id)}
                            className={`
                flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border-2
                font-body text-xs font-medium transition-all duration-150 cursor-pointer
                ${source === id
                                    ? 'border-primary bg-primary/10 text-text-dark dark:text-primary'
                                    : 'border-brown-light/20 bg-transparent text-neutral-gray hover:border-brown-light/40 hover:text-text-dark dark:hover:text-text-light'
                                }
              `}
                        >
                            <Icon size={22} weight={source === id ? 'fill' : 'regular'} />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Branch heading — pinned above scroll area */}
            <h2 className="shrink-0 text-text-dark dark:text-text-light text-sm font-semibold font-body mt-8 mb-3">
                Which branch fulfills this order?
            </h2>

            {/* Branch list — fills remaining space, scrolls when needed */}
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
                <div className="flex flex-col gap-2 pb-2">
                    {BRANCHES.map(branch => (
                        <button
                            key={branch.id}
                            type="button"
                            disabled={!branch.isOpen}
                            onClick={() => setBranchId(branch.id)}
                            className={`
                flex items-center justify-between px-4 py-3.5 rounded-2xl border-2
                transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed
                text-left
                ${branchId === branch.id
                                    ? 'border-primary bg-primary/10'
                                    : 'border-brown-light/20 hover:border-brown-light/40'
                                }
              `}
                        >
                            <div>
                                <p className={`font-semibold font-body text-sm ${branchId === branch.id ? 'text-text-dark dark:text-primary' : 'text-text-dark dark:text-text-light'}`}>
                                    {branch.name}
                                </p>
                                <p className="text-neutral-gray text-xs font-body mt-0.5">{branch.area}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <span className="text-neutral-gray text-xs font-body">
                                    +{formatGHS(branch.deliveryFee)} delivery
                                </span>
                                <span className={`text-[10px] font-medium font-body px-2 py-1 rounded-full ${branch.isOpen ? 'bg-secondary/15 text-secondary' : 'bg-error/15 text-error'}`}>
                                    {branch.isOpen ? 'Open' : 'Closed'}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Next — always pinned at the bottom */}
            <div className="shrink-0 pt-4">
                <button
                    type="button"
                    disabled={!canProceed}
                    onClick={() => setStep(2)}
                    className="
          w-full flex items-center justify-center gap-2
          bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed
          text-brand-darker font-semibold font-body py-4 rounded-full
          transition-all duration-150 cursor-pointer
        "
                >
                    Pick Items
                    <CaretRightIcon size={18} weight="bold" />
                </button>
            </div>
        </div>
    );
}
