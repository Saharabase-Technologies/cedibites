'use client';

import Link from 'next/link';
import { CheckCircleIcon, ClockIcon } from '@phosphor-icons/react';
import { BRANCHES } from '@/app/components/providers/BranchProvider';
import { useNewOrder } from '../context';
import { useStaffRoutes } from '@/app/components/providers/StaffAuthProvider';

// ─── Confirmation screen ──────────────────────────────────────────────────────

export default function OrderConfirmed() {
    const { orderCode, branchId, resetOrder } = useNewOrder();
    const { orders } = useStaffRoutes();
    const branch = BRANCHES.find(b => b.id === branchId);

    return (
        <div className="flex flex-col items-center text-center gap-6 py-8">
            <div className="w-16 h-16 rounded-full bg-secondary/15 flex items-center justify-center">
                <CheckCircleIcon size={40} weight="fill" className="text-secondary" />
            </div>

            <div>
                <h2 className="text-text-dark dark:text-text-light text-xl font-bold font-body">Order Placed</h2>
                <p className="text-neutral-gray text-sm font-body mt-1">
                    {branch?.name} branch has been notified.
                </p>
            </div>

            <div className="bg-brown border border-brown-light/15 rounded-2xl px-8 py-5 w-full">
                <p className="text-neutral-gray text-xs font-body mb-1">Order Number</p>
                <p className="text-primary text-3xl font-bold font-body tracking-wider">{orderCode}</p>
                <p className="text-neutral-gray text-xs font-body mt-2 flex items-center justify-center gap-1">
                    <ClockIcon size={12} weight="fill" />
                    Customer SMS sent with this code
                </p>
            </div>

            <div className="flex flex-col gap-2 w-full">
                <button
                    type="button"
                    onClick={resetOrder}
                    className="w-full bg-primary hover:bg-primary-hover text-brand-darker font-semibold font-body py-4 rounded-full transition-colors cursor-pointer text-sm"
                >
                    Create Another Order
                </button>
                <Link
                    href={orders}
                    className="w-full border-brand-dark/50 dark:border-neutral-gray/50 dark:text-text-light border cursor-pointer hover:bg-primary/10 text-text-dark dark:hover:text-text-light font-body py-4 rounded-full transition-colors text-sm text-center block"
                >
                    View All Orders
                </Link>
            </div>
        </div>
    );
}
