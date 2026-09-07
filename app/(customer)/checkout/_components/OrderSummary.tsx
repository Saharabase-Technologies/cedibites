'use client';

import { useBranch } from '@/app/components/providers/BranchProvider';
import { useCart } from '@/app/components/providers/CartProvider';
import type { Promo } from '@/lib/services/promos/promo.service';
import { TagIcon } from '@phosphor-icons/react';
import Image from 'next/image';
import { calcServiceCharge, formatPrice } from './pricing';
import { DELIVERY_FEE } from './types';
import type { OrderType, ServiceChargeConfig } from './types';

// ─── Order Summary ────────────────────────────────────────────────────────────
export default function OrderSummary({ orderType, scConfig, deliveryFeeEnabled, discount, promoName }: { orderType: OrderType; scConfig: ServiceChargeConfig; deliveryFeeEnabled: boolean; discount?: number; promoName?: string }) {
    const { displayItems: items, subtotal } = useCart();
    const { selectedBranch } = useBranch();
    const showDelivery = deliveryFeeEnabled && orderType === 'delivery';
    const delivery = showDelivery ? (selectedBranch?.deliveryFee ?? DELIVERY_FEE) : 0;
    const serviceCharge = calcServiceCharge(subtotal, scConfig);
    const total = subtotal + delivery + serviceCharge - (discount ?? 0);
    return (
        <div className="bg-white dark:bg-brand-dark rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-text-dark dark:text-text-light">Order Summary</h3>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary/15 text-primary">{items.length} item{items.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex flex-col gap-3">
                {items.map(ci => (
                    <div key={ci.cartItemId} className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-primary/10 shrink-0">
                            {ci.item.image ? <Image src={ci.item.image} alt={ci.item.name} fill sizes="48px" className="object-cover" /> : <div className="w-full h-full" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-text-dark dark:text-text-light truncate">{ci.item.name}</p>
                            <p className="text-xs text-neutral-gray">{ci.sizeLabel} · Qty: {ci.quantity}</p>
                        </div>
                        <span className="text-sm font-bold text-primary shrink-0">{formatPrice(ci.price * ci.quantity)}</span>
                    </div>
                ))}
            </div>
            <div className="h-px bg-neutral-gray/10" />
            <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between"><span className="text-neutral-gray">Subtotal</span><span className="font-semibold text-text-dark dark:text-text-light">{formatPrice(subtotal)}</span></div>
                {deliveryFeeEnabled && (
                    <div className="flex justify-between">
                        <span className="text-neutral-gray">Delivery Fee{showDelivery ? <span className="text-neutral-gray/70"> · paid to rider</span> : ''}</span>
                        <span className="font-semibold text-text-dark dark:text-text-light">{showDelivery ? formatPrice(delivery) : <span className="text-secondary">Free</span>}</span>
                    </div>
                )}
                <div className="flex justify-between"><span className="text-neutral-gray">Service Charge{scConfig.enabled ? ` (${scConfig.percent}%)` : ''}</span><span className="font-semibold text-text-dark dark:text-text-light">{formatPrice(serviceCharge)}</span></div>
                {(discount ?? 0) > 0 && (
                    <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5 text-secondary text-sm">
                            <TagIcon size={14} weight="fill" />
                            {promoName || 'Promo Discount'}
                        </span>
                        <span className="font-semibold text-secondary">-{formatPrice(discount!)}</span>
                    </div>
                )}
            </div>
            <div className="h-px bg-neutral-gray/10" />
            <div className="flex justify-between items-center">
                <span className="font-bold text-text-dark dark:text-text-light">Total</span>
                <span className="text-2xl font-bold text-primary">{formatPrice(total)}</span>
            </div>
        </div>
    );
}
