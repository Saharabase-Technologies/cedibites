'use client';

import { useBranch } from '@/app/components/providers/BranchProvider';
import { useRouter } from 'next/navigation';
import ScreenHeader from '@/app/components/layout/ScreenHeader';
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
import StepPayment from './_components/StepPayment';
import StepProcessing from './_components/StepProcessing';
import { DEFAULT_SC_CONFIG } from './_components/types';
import type { ContactDetails, OrderType, PaymentMethod, ServiceChargeConfig, Step } from './_components/types';

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CheckoutPage() {
    const router = useRouter();
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

    /**
     * Where back goes, which depends on how far in you are.
     *
     * Step two returns to the details. Step one leaves the flow. Three and four
     * have no arrow at all: there is nothing useful to go back to while a
     * payment is being confirmed, and nothing to undo once it has been.
     */
    const goBack = step === 2
        ? () => setStep(1)
        : step === 1
            ? () => router.back()
            : undefined;

    const screenTitle = step === 4 ? 'Order confirmed'
        : step === 3 ? 'Confirming payment'
            : step === 2 ? 'Payment'
                : 'Checkout';

    const branchClosed = effectiveBranch && !effectiveBranch.isOpen;
    const branchInactive = effectiveBranch && !effectiveBranch.isActive;
    const branchUnavailable = branchClosed || branchInactive;

    return (
        <div className="min-h-dvh bg-bg">
            {/* Navbar renders nothing on a full-screen route, so this is the
                only chrome the screen has and the only way back out of it. */}
            <ScreenHeader
                title={screenTitle}
                onBack={goBack}
                backLabel={step === 2 ? 'Back to your details' : 'Leave checkout'}
                right={step <= 2 ? (
                    <span className="text-xs font-bold uppercase tracking-widest text-fg-muted">
                        Step {step} of 2
                    </span>
                ) : undefined}
                progress={step <= 2 ? step / 2 : undefined}
            />

            <div className="page-x mx-auto max-w-5xl py-6 md:py-8">

                {branchUnavailable && step <= 2 && (
                    <div className="mb-6 rounded-xl bg-surface-sunken px-4 py-3.5">
                        <p className="text-sm font-bold text-fg">
                            {branchInactive
                                ? `${effectiveBranch?.name} is not taking orders`
                                : `${effectiveBranch?.name} is closed`}
                        </p>
                        <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
                            {branchInactive
                                ? 'Nothing can be sent from here at the moment. Change the branch in your order to carry on.'
                                : 'Nothing leaves the kitchen until it opens again. Change the branch in your order to carry on.'}
                        </p>
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
