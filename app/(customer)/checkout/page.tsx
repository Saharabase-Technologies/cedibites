'use client';

import { useBranch } from '@/app/components/providers/BranchProvider';
import { useCart } from '@/app/components/providers/CartProvider';
import { useLocation } from '@/app/components/providers/LocationProvider';
import { normalizeGhanaPhone } from '@/app/lib/phone';
import apiClient, { ApiError } from '@/lib/api/client';
import { useCreateCheckoutSession } from '@/lib/api/hooks/useCheckoutSession';
import { getPromoService } from '@/lib/services/promos/promo.service';
import type { Promo } from '@/lib/services/promos/promo.service';
import { toast } from '@/lib/utils/toast';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useState } from 'react';
import EmptyCartGuard from './_components/EmptyCartGuard';
import OrderSummary from './_components/OrderSummary';
import StepDetails from './_components/StepDetails';
import StepDone from './_components/StepDone';
import StepIndicator from './_components/StepIndicator';
import StepPayment from './_components/StepPayment';
import StepProcessing from './_components/StepProcessing';
import { DEFAULT_SC_CONFIG } from './_components/types';
import type { ContactDetails, OrderType, PaymentMethod, ServiceChargeConfig, Step } from './_components/types';

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CheckoutPage() {
    const { displayItems: items, clearCart, subtotal } = useCart();
    const { selectedBranch, branches } = useBranch();
    const { coordinates } = useLocation();
    const createSession = useCreateCheckoutSession();
    const [step, setStep] = useState<Step>(1);
    const [orderType, setOrderType] = useState<OrderType>('delivery');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mobile_money');
    const [placing, setPlacing] = useState(false);
    const [orderNumber, setOrderNumber] = useState('');
    const [sessionToken, setSessionToken] = useState<string | null>(null);
    const [contact, setContact] = useState<ContactDetails>({ name: '', phone: '', address: '', note: '' });
    const [scConfig, setScConfig] = useState<ServiceChargeConfig>(DEFAULT_SC_CONFIG);
    const [deliveryFeeEnabled, setDeliveryFeeEnabled] = useState(false);
    const [activePromo, setActivePromo] = useState<Promo | null>(null);
    const [promoDiscount, setPromoDiscount] = useState(0);

    useEffect(() => {
        apiClient.get('/checkout-config').then((res: unknown) => {
            const d = (res as { data?: { service_charge_enabled?: boolean; service_charge_percent?: number; service_charge_cap?: number; delivery_fee_enabled?: boolean } })?.data;
            if (d) {
                setScConfig({ enabled: d.service_charge_enabled ?? true, percent: d.service_charge_percent ?? 1, cap: d.service_charge_cap ?? 5 });
                setDeliveryFeeEnabled(d.delivery_fee_enabled ?? false);
            }
        }).catch(() => { /* fall back to defaults */ });
    }, []);

    const effectiveBranch = selectedBranch ?? branches.find(b => b.isOpen) ?? branches[0] ?? null;

    // Auto-resolve best applicable promo
    useEffect(() => {
        if (!effectiveBranch || items.length === 0) { setActivePromo(null); setPromoDiscount(0); return; }
        const itemIds = items.map(ci => String(ci.item.id));
        getPromoService().resolvePromo(itemIds, String(effectiveBranch.id), subtotal).then(p => {
            if (!p) { setActivePromo(null); setPromoDiscount(0); return; }
            setActivePromo(p);
            setPromoDiscount(getPromoService().calculateDiscount(p, subtotal));
        }).catch(() => { setActivePromo(null); setPromoDiscount(0); });
    }, [items, effectiveBranch, subtotal]);

    const handlePlaceOrder = useCallback(async () => {
        if (!effectiveBranch) return;
        setPlacing(true);
        try {
            const session = await createSession.mutateAsync({
                branch_id: Number(effectiveBranch.id),
                order_type: orderType,
                customer_name: contact.name,
                customer_phone: normalizeGhanaPhone(contact.phone),
                delivery_address: orderType === 'delivery' ? contact.address : undefined,
                delivery_latitude: orderType === 'delivery' && coordinates ? coordinates.latitude : undefined,
                delivery_longitude: orderType === 'delivery' && coordinates ? coordinates.longitude : undefined,
                special_instructions: contact.note || undefined,
                payment_method: paymentMethod,
            });

            if (paymentMethod === 'mobile_money') {
                // Redirect to Hubtel checkout if we have a URL
                if (session.checkout_url) {
                    // Don't clear cart here — backend clears it when order is created.
                    // If payment fails, the customer can retry with their cart intact.
                    window.location.href = session.checkout_url;
                    return;
                }
                // Otherwise poll for status (e.g. if redirect didn't happen)
                setSessionToken(session.session_token);
                setStep(3);
            } else {
                // Cash: backend creates order immediately
                if (session.status === 'confirmed' && session.order?.order_number) {
                    clearCart();
                    setOrderNumber(session.order.order_number);
                    setStep(4);
                } else {
                    // Session still pending — poll for status
                    setSessionToken(session.session_token);
                    setStep(3);
                }
            }
        } catch (err: unknown) {
            const msg = err instanceof ApiError ? err.message : 'Failed to place order. Please try again.';
            toast.error(msg);
        } finally {
            setPlacing(false);
        }
    }, [effectiveBranch, paymentMethod, orderType, contact, coordinates, createSession, clearCart]);

    const handleProcessingSuccess = useCallback((num: string) => {
        clearCart();
        setOrderNumber(num);
        setStep(4);
    }, [clearCart]);

    const handleProcessingFail = useCallback((message: string) => {
        toast.error(message);
        setStep(2);
        setSessionToken(null);
    }, []);

    const handleProcessingAbandon = useCallback(() => {
        setStep(2);
        setSessionToken(null);
    }, []);

    if (items.length === 0 && step !== 3 && step !== 4) return <EmptyCartGuard />;

    const branchClosed = effectiveBranch && !effectiveBranch.isOpen;
    const branchInactive = effectiveBranch && !effectiveBranch.isActive;
    const branchUnavailable = branchClosed || branchInactive;

    return (
        <div className="min-h-[calc(100svh-var(--nav-h))] bg-neutral-light dark:bg-brand-darker pt-10 pb-12">
            <div className="w-[95%] md:w-[85%] xl:w-[75%] max-w-5xl mx-auto">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-text-dark dark:text-text-light">{step === 4 ? 'Order Confirmed' : step === 3 ? 'Processing Payment' : 'Checkout'}</h1>
                        {step <= 2 && <p className="text-sm text-neutral-gray mt-1">Complete your order details below</p>}
                    </div>
                    {step <= 3 && <StepIndicator current={step} />}
                </div>

                {branchUnavailable && step <= 2 && (
                    <div className="mb-6 flex items-start gap-3 p-4 rounded-2xl bg-error/5 border border-error/20">
                        <WarningCircleIcon weight="fill" size={22} className="text-error shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-error">
                                {branchInactive ? 'This branch is currently inactive' : 'This branch is currently closed'}
                            </p>
                            <p className="text-xs text-error/80 mt-1">
                                {branchInactive
                                    ? 'This branch is not accepting orders at the moment. Please select a different branch or try again later.'
                                    : 'This branch is closed right now. Please check back during operating hours or select a different branch.'}
                            </p>
                        </div>
                    </div>
                )}

                {step === 4 ? (
                    <div className="max-w-md mx-auto">
                        <StepDone orderNumber={orderNumber} orderType={orderType} contact={contact} />
                    </div>
                ) : step === 3 && sessionToken ? (
                    <div className="max-w-md mx-auto">
                        <StepProcessing sessionToken={sessionToken} onSuccess={handleProcessingSuccess} onFail={handleProcessingFail} onAbandon={handleProcessingAbandon} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
                        <div>
                            {step === 1 && <StepDetails orderType={orderType} setOrderType={setOrderType} contact={contact} setContact={setContact} onNext={() => { setContact(c => ({ ...c, phone: normalizeGhanaPhone(c.phone) })); setStep(2); }} />}
                            {step === 2 && <StepPayment paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} orderType={orderType} contact={contact} onBack={() => setStep(1)} onPlace={handlePlaceOrder} placing={placing} scConfig={scConfig} />}
                        </div>
                        <div className="lg:sticky lg:top-24 h-fit"><OrderSummary orderType={orderType} scConfig={scConfig} deliveryFeeEnabled={deliveryFeeEnabled} discount={promoDiscount} promoName={activePromo?.name} /></div>
                    </div>
                )}
            </div>
        </div>
    );
}
