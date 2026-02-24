'use client';

import { useRouter } from 'next/navigation';
import { CaretLeftIcon, CheckCircleIcon } from '@phosphor-icons/react';
import { useNewOrder } from './context';
import StepSetup from './steps/StepSetup';
import StepMenu from './steps/StepMenu';
import StepCustomer from './steps/StepCustomer';
import StepReview from './steps/StepReview';
import OrderConfirmed from './steps/OrderConfirmed';

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEP_LABELS = ['Setup', 'Menu', 'Customer', 'Review'];

function StepIndicator({ current }: { current: number }) {
    return (
        <div className="flex items-center gap-0 mb-6">
            {STEP_LABELS.map((label, i) => {
                const step = i + 1;
                const done = step < current;
                const active = step === current;
                const isLast = i === STEP_LABELS.length - 1;

                return (
                    <div key={label} className="flex items-center flex-1">
                        <div className="flex flex-col items-center gap-1 shrink-0">
                            <div className={`
                w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-body
                transition-all duration-200
                ${done ? 'bg-secondary text-white' : ''}
                ${active ? 'bg-primary text-text-dark' : ''}
                ${!done && !active ? 'bg-brown-light/20 text-neutral-gray' : ''}
              `}>
                                {done ? <CheckCircleIcon size={16} weight="fill" /> : step}
                            </div>
                            <span className={`text-[12px] font-body font-medium hidden sm:block ${active ? 'text-primary' : done ? 'text-secondary' : 'text-neutral-gray'}`}>
                                {label}
                            </span>
                        </div>
                        {!isLast && (
                            <div className={`h-px flex-1 mx-1 transition-colors duration-200 ${done ? 'bg-secondary' : 'bg-brown-light/20'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─── NewOrderFlow ─────────────────────────────────────────────────────────────

export default function NewOrderFlow() {
    const router = useRouter();
    const { step, orderCode, setStep } = useNewOrder();

    // Confirmation screen — full scrollable view
    if (orderCode) {
        return (
            <div className="h-screen overflow-y-none">
                <div className="px-4 md:px-8 py-6 max-w-lg mx-auto">
                    <OrderConfirmed />
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col">

            {/* ── Pinned header ─────────────────────────────────────────────── */}
            <div className="shrink-0 px-4 md:px-8 pt-6 pb-0 max-w-lg mx-auto w-full">

                {/* Page header */}
                <div className="flex items-center gap-3 mb-6">
                    {/* the back button */}
                    <button
                        type="button"
                        onClick={() => step > 1 ? setStep((step - 1) as 1 | 2 | 3 | 4) : router.push('/staff/dashboard')}
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-brown-light/25 text-neutral-gray hover:text-text-light hover:border-brown-light/50 transition-colors cursor-pointer shrink-0"
                    >
                        <CaretLeftIcon size={16} weight="bold" />
                    </button>
                    <div>
                        <h1 className="text-text-dark dark:text-text-light text-xl font-bold font-body leading-none">New Order</h1>
                        <p className="text-neutral-gray text-sm font-body mt-0.5">
                            Step {step} of 4
                        </p>
                    </div>
                </div>

                {/* Step indicator */}
                <StepIndicator current={step} />
            </div>

            {/* ── Scrollable step content ────────────────────────────────────── */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <div className={`flex-1 min-h-0 px-4 md:px-8 pb-6 mx-auto w-full flex flex-col ${step === 2 ? 'md:max-w-4xl' : 'max-w-lg'}`}>
                    {step === 1 && <StepSetup />}
                    {step === 2 && <StepMenu />}
                    {step === 3 && <StepCustomer />}
                    {step === 4 && <StepReview />}
                </div>
            </div>

        </div>
    );
}
