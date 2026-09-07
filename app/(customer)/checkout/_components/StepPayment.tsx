'use client';

import { useBranch } from '@/app/components/providers/BranchProvider';
import { useCart } from '@/app/components/providers/CartProvider';
import { ArrowLeftIcon, ArrowRightIcon, BagIcon, DeviceMobileIcon, LockIcon, MoneyIcon, PencilSimpleIcon, StorefrontIcon, TruckIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import BranchSelectorSheet from './BranchSelectorSheet';
import { calcServiceCharge, formatPrice } from './pricing';
import { DELIVERY_FEE } from './types';
import type { ContactDetails, OrderType, PaymentMethod, ServiceChargeConfig, Step } from './types';

// ─── Step 2 ───────────────────────────────────────────────────────────────────
export default function StepPayment({ paymentMethod, setPaymentMethod, orderType, contact, onBack, onPlace, placing, scConfig }: {
    paymentMethod: PaymentMethod; setPaymentMethod: (m: PaymentMethod) => void;
    orderType: OrderType; contact: ContactDetails; onBack: () => void; onPlace: () => void; placing: boolean; scConfig: ServiceChargeConfig;
}) {
    const { subtotal } = useCart();
    const { selectedBranch } = useBranch();
    const [branchSheetOpen, setBranchSheetOpen] = useState(false);
    const delivery = orderType === 'delivery' ? (selectedBranch?.deliveryFee ?? DELIVERY_FEE) : 0;
    const serviceCharge = calcServiceCharge(subtotal, scConfig);
    const total = subtotal + delivery + serviceCharge;

    // Map frontend payment keys to backend DB keys for branch settings lookup
    const paymentKeyMap: Record<string, string> = { mobile_money: 'momo', cash: 'cash_on_delivery' };

    const allMethods = [
        { id: 'mobile_money' as const, icon: <DeviceMobileIcon weight="fill" size={20} />, label: 'Mobile Money', sub: 'MTN MoMo · Telecel · AirtelTigo', color: 'text-warning' },
        { id: 'cash' as const, icon: <MoneyIcon weight="fill" size={20} />, label: 'Cash on Delivery', sub: 'Pay when your order arrives', color: 'text-secondary' },
    ];
    const methods = selectedBranch
        ? allMethods.filter(m => selectedBranch.paymentMethods[paymentKeyMap[m.id]]?.is_enabled !== false)
        : allMethods;

    // Auto-select payment method if only one is available
    useEffect(() => {
        if (methods.length === 1 && paymentMethod !== methods[0].id) {
            setPaymentMethod(methods[0].id);
        }
    }, [methods.length]);

    return (
        <>
            <div className="flex flex-col gap-5">
                <div className="bg-white dark:bg-brand-dark rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                            {orderType === 'delivery' ? <TruckIcon weight="fill" size={18} className="text-primary" /> : <BagIcon weight="fill" size={18} className="text-primary" />}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-text-dark dark:text-text-light">{orderType === 'delivery' ? 'Delivering to' : 'Pickup at'}</p>
                            <p className="text-xs text-neutral-gray truncate max-w-50">{orderType === 'delivery' ? contact.address : selectedBranch?.name + ' Branch'}</p>
                        </div>
                    </div>
                    <button onClick={onBack} className="text-xs cursor-pointer font-semibold text-primary hover:underline flex items-center gap-1 shrink-0"><PencilSimpleIcon size={12} /> Edit</button>
                </div>

                {selectedBranch && (
                    <div className="bg-white dark:bg-brand-dark rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <StorefrontIcon weight="fill" size={18} className="text-primary shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-text-dark dark:text-text-light">{selectedBranch.name} Branch</p>
                                <p className="text-xs text-neutral-gray">{selectedBranch.address}</p>
                            </div>
                        </div>
                        <button onClick={() => setBranchSheetOpen(true)} className="text-xs cursor-pointer font-semibold text-primary hover:underline shrink-0">Change</button>
                    </div>
                )}

                <div className="bg-white dark:bg-brand-dark rounded-2xl p-5 shadow-sm flex flex-col gap-3">
                    <h2 className="font-bold text-text-dark dark:text-text-light">Payment Method</h2>
                    {methods.length === 0 ? (
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-error/5 border border-error/20">
                            <WarningCircleIcon weight="fill" size={20} className="text-error shrink-0" />
                            <p className="text-sm text-error">No payment methods are currently available at this branch.</p>
                        </div>
                    ) : methods.map(m => (
                        <div key={m.id}>
                            <button onClick={() => setPaymentMethod(m.id)}
                                className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left cursor-pointer ${paymentMethod === m.id ? 'border-primary bg-primary/5' : 'border-neutral-gray/15 hover:border-primary/30'}`}>
                                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 ${paymentMethod === m.id ? 'border-primary' : 'border-neutral-gray/40'}`}>
                                    {paymentMethod === m.id && <div className="w-2.5 h-2.5 rounded-lg bg-primary" />}
                                </div>
                                <span className={`${m.color} shrink-0`}>{m.icon}</span>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-text-dark dark:text-text-light">{m.label}</p>
                                    <p className="text-xs text-neutral-gray">{m.sub}</p>
                                </div>
                            </button>
                        </div>
                    ))}
                </div>

                <div className="flex gap-3">
                    <button onClick={onBack} className="flex cursor-pointer items-center gap-2 px-5 py-4 rounded-2xl border-2 border-neutral-gray/20 font-bold text-neutral-gray hover:border-primary/40 hover:text-primary transition-all">
                        <ArrowLeftIcon weight="bold" size={16} /> Back
                    </button>
                    <button onClick={() => onPlace()} disabled={placing || methods.length === 0}
                        className="flex-1 flex cursor-pointer items-center justify-between bg-brown dark:bg-brand-dark hover:bg-brown-light disabled:opacity-70 text-white font-bold px-6 py-4 rounded-2xl transition-all active:scale-[0.98] group">
                        <span>{placing ? 'Placing Order...' : paymentMethod === 'mobile_money' ? 'Pay & Place Order' : 'Place Order'}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-primary font-bold">{formatPrice(paymentMethod === 'mobile_money' ? total - delivery : total)}</span>
                            <ArrowRightIcon weight="bold" size={18} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </button>
                </div>
                {delivery > 0 && (
                    <p className="text-xs text-center text-neutral-gray">
                        {paymentMethod === 'mobile_money'
                            ? `You pay ${formatPrice(total - delivery)} now for your order · ${formatPrice(delivery)} delivery is paid to the rider on delivery.`
                            : `You'll pay ${formatPrice(total)} to the rider on delivery (incl. ${formatPrice(delivery)} delivery).`}
                    </p>
                )}
                <p className="text-xs text-center text-neutral-gray flex items-center justify-center gap-1"><LockIcon size={11} /> Secured · Encrypted · Powered by Hubtel</p>
            </div>
            <BranchSelectorSheet isOpen={branchSheetOpen} onClose={() => setBranchSheetOpen(false)} />
        </>
    );
}
