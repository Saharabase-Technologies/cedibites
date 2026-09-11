'use client';

import { useBranch } from '@/app/components/providers/BranchProvider';
import { useCart } from '@/app/components/providers/CartProvider';
import { useLocation } from '@/app/components/providers/LocationProvider';
import { useAuth } from '@/app/components/providers/AuthProvider';
import ScreenHeader from '@/app/components/layout/ScreenHeader';
import { normalizeGhanaPhone } from '@/app/lib/phone';
import apiClient, { ApiError } from '@/lib/api/client';
import { useCreateCheckoutSession } from '@/lib/api/hooks/useCheckoutSession';
import { getPromoService } from '@/lib/services/promos/promo.service';
import type { Promo } from '@/lib/services/promos/promo.service';
import { toast } from '@/lib/utils/toast';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import BranchSelectorSheet from './_components/BranchSelectorSheet';
import CheckoutForm from './_components/CheckoutForm';
import { PayStep, WhereStep, WhoStep } from './_components/CheckoutSteps';
import { useMomoCheck } from './_components/MomoField';
import EmptyCartGuard from './_components/EmptyCartGuard';
import OrderPlaced from './_components/OrderPlaced';
import PaymentWait from './_components/PaymentWait';
import { OrderSummary } from './_components/OrderPanel';
import { PayBar, PayBarSpacer, PayAction, type BarAction } from './_components/PayBar';
import { enabledOrderTypes, enabledPaymentMethods, questionBlocker, reviewBlocker } from './_components/availability';
import { computeTotals, formatPrice } from './_components/pricing';
import { readRecalled, writeRecalled, type RecalledDetails } from './_components/recall';
import { writeLastOrder } from '@/lib/orders/lastOrder';
import { useAddresses } from '@/lib/api/hooks/useAddresses';
import { DEFAULT_SC_CONFIG, QUESTIONS, STEPS, stepIndex } from './_components/types';
import type { ContactDetails, OrderType, PaymentMethod, Phase, Question, ServiceChargeConfig, Step } from './_components/types';

const NO_RECALL: RecalledDetails = { name: '', phone: '', address: '' };

/** Each question is the title of its own screen, so the screen needs no heading. */
const QUESTION_TITLES: Record<Question, string> = {
    where: 'Where it goes',
    who: 'Who it is for',
    pay: 'How you pay',
};

export default function CheckoutPage() {
    const router = useRouter();
    const { displayItems: items, clearCart, subtotal, isLoading: cartLoading } = useCart();
    const { selectedBranch, branches } = useBranch();
    const { coordinates } = useLocation();
    const { user, isLoggedIn } = useAuth();
    // Empty for a guest: the query only runs when there is a customer token.
    // The list itself is rendered by the address question and the review, off
    // the same cached query.
    const { defaultAddress, saveAddress } = useAddresses();
    const createSession = useCreateCheckoutSession();

    const [phase, setPhase] = useState<Phase>('form');

    /**
     * The screen on show, and the furthest one reached.
     *
     * `furthest` is what makes Change on the review cheap. It takes them back to
     * one question, and Continue there returns them straight to the review
     * rather than walking them through answers they have already given.
     */
    const [stage, setStage] = useState<Step>('where');
    const [furthest, setFurthest] = useState<Step>('where');

    const [orderType, setOrderType] = useState<OrderType>('delivery');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mobile_money');
    const [placing, setPlacing] = useState(false);
    const [orderNumber, setOrderNumber] = useState('');
    const [trackingToken, setTrackingToken] = useState<string | undefined>();
    const [sessionToken, setSessionToken] = useState<string | null>(null);
    const [contact, setContact] = useState<ContactDetails>({ name: '', phone: '', address: '', note: '' });

    const [scConfig, setScConfig] = useState<ServiceChargeConfig>(DEFAULT_SC_CONFIG);
    const [deliveryFeeEnabled, setDeliveryFeeEnabled] = useState(false);
    const [configReady, setConfigReady] = useState(false);

    const [promo, setPromo] = useState<Promo | null>(null);
    const [promoDiscount, setPromoDiscount] = useState(0);
    const [promoReady, setPromoReady] = useState(false);

    const [recalled, setRecalled] = useState<RecalledDetails>(NO_RECALL);

    /**
     * One branch sheet for the whole checkout.
     *
     * The pickup question, and the button on any screen when the branch cannot
     * take the order, both open it. Two components cannot each hold their own
     * copy of the same sheet without one of them opening behind the other.
     */
    const [branchSheet, setBranchSheet] = useState(false);
    const openBranchSheet = useCallback(() => setBranchSheet(true), []);
    const closeBranchSheet = useCallback(() => setBranchSheet(false), []);

    /**
     * The number the Mobile Money prompt goes to.
     *
     * Null means nobody has changed it, and it follows the number they gave for
     * the order, because that is the one people pay from. Typing in the field
     * takes it off that leash for good: somebody paying from a different wallet
     * should not have it snatched back when they correct their contact number.
     */
    const [momoOverride, setMomoOverride] = useState<string | null>(null);
    const momoNumber = momoOverride ?? contact.phone;

    /*
     * Hubtel is only asked whose wallet it is once they have reached the payment
     * question. Every lookup is paid for, and somebody who opens checkout and
     * leaves at the address has not told us how they mean to pay.
     */
    const reachedPay = stepIndex(furthest) >= stepIndex('pay');
    const { check: momoCheck, checking: momoChecking } = useMomoCheck(
        momoNumber,
        paymentMethod === 'mobile_money' && reachedPay,
    );

    /**
     * Whether the browser has had a turn yet.
     *
     * /checkout is prerendered at build time, and the cart lives behind a guest
     * session id in localStorage that a build machine has never seen. React
     * Query reports a disabled query as `isLoading: false`, so the static HTML
     * for this route was the "nothing to pay for yet" screen. Every visit
     * painted an empty cart first, whatever was actually in it.
     */
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const effectiveBranch = selectedBranch ?? branches.find(b => b.isOpen) ?? branches[0] ?? null;
    const branchId = effectiveBranch?.id;

    // ── What this phone and this account already know ────────────────────────
    // localStorage cannot be read while rendering without the server and the
    // client disagreeing about what the first paint says, so it lands here and
    // fills in only the fields still empty. Nobody's typing is ever overwritten.
    useEffect(() => {
        const saved = readRecalled();
        setRecalled(saved);
        setContact(c => ({
            ...c,
            name: c.name || (isLoggedIn ? user?.name ?? '' : '') || saved.name,
            phone: c.phone || (isLoggedIn ? user?.phone ?? '' : '') || saved.phone,
            // The account's default address outranks this device's last one:
            // it is the place they told us they usually order to, and it
            // follows them between a phone and a laptop. `readRecalled` is the
            // guest's fallback and the signed-in customer's until they save one.
            address: c.address || defaultAddress?.full_address || saved.address,
        }));
    }, [isLoggedIn, user?.name, user?.phone, defaultAddress?.full_address]);

    // ── Charges ──────────────────────────────────────────────────────────────
    useEffect(() => {
        apiClient.get('/checkout-config').then((res: unknown) => {
            const d = (res as { data?: { service_charge_enabled?: boolean; service_charge_percent?: number; service_charge_cap?: number; delivery_fee_enabled?: boolean } })?.data;
            if (d) {
                // Absent means absent. Falling back to 1% here was the second
                // place a charge could appear that nobody had configured.
                setScConfig({
                    enabled: d.service_charge_enabled ?? false,
                    percent: d.service_charge_percent ?? 0,
                    cap: d.service_charge_cap ?? 0,
                });
                setDeliveryFeeEnabled(d.delivery_fee_enabled ?? false);
            }
        }).catch(() => { /* the defaults stand */ })
            .finally(() => setConfigReady(true));
    }, []);

    // ── The best promo this order qualifies for ──────────────────────────────
    // Keyed on which dishes and which branch, not on the objects carrying them.
    // The cart and the branch list both refetch on focus and hand back fresh
    // copies of the same things, and every fresh copy blanked the totals to
    // grey bars and asked all over again.
    const itemIdsKey = items.map(ci => String(ci.item.id)).join(',');
    useEffect(() => {
        const itemIds = itemIdsKey ? itemIdsKey.split(',') : [];
        if (!branchId || itemIds.length === 0) {
            setPromo(null); setPromoDiscount(0); setPromoReady(true);
            return;
        }
        setPromoReady(false);
        getPromoService().resolvePromo(itemIds, String(branchId), subtotal).then(p => {
            setPromo(p ?? null);
            setPromoDiscount(p ? getPromoService().calculateDiscount(p, subtotal) : 0);
        }).catch(() => {
            setPromo(null); setPromoDiscount(0);
        }).finally(() => setPromoReady(true));
    }, [itemIdsKey, branchId, subtotal]);

    // ── What the branch will take ────────────────────────────────────────────
    const orderTypes = useMemo(() => enabledOrderTypes(effectiveBranch), [effectiveBranch]);
    const methods = useMemo(() => enabledPaymentMethods(effectiveBranch), [effectiveBranch]);

    // A branch offering one of something has already made the choice.
    useEffect(() => {
        if (orderTypes.length > 0 && !orderTypes.includes(orderType)) setOrderType(orderTypes[0]);
    }, [orderTypes, orderType]);

    useEffect(() => {
        if (methods.length > 0 && !methods.includes(paymentMethod)) setPaymentMethod(methods[0]);
    }, [methods, paymentMethod]);

    // ── The money, worked out once for the review ────────────────────────────
    const totals = useMemo(() => computeTotals({
        subtotal,
        orderType,
        scConfig,
        deliveryFeeEnabled,
        branchDeliveryFee: effectiveBranch?.deliveryFee,
        discount: promoDiscount,
        promoName: promo?.name,
        paymentMethod,
    }), [subtotal, orderType, scConfig, deliveryFeeEnabled, effectiveBranch?.deliveryFee, promoDiscount, promo?.name, paymentMethod]);

    /**
     * The figures are only true once the server has said what it charges and
     * whether this order has a promo on it. Before that the review would show a
     * total built from the fallbacks, then quietly change it. The pay button
     * holds until both have landed.
     */
    const moneyReady = configReady && promoReady;

    const serviceLabel = scConfig.percent > 0 ? `Service charge, ${scConfig.percent}%` : 'Service charge';

    // ── Placing it ───────────────────────────────────────────────────────────
    const handlePlace = useCallback(async () => {
        if (!effectiveBranch) return;
        const phone = normalizeGhanaPhone(contact.phone);
        setPlacing(true);

        // Written now rather than on confirmation. They typed it either way, and
        // a payment that fails is exactly when nobody wants to type it again.
        writeRecalled({ name: contact.name.trim(), phone, address: contact.address.trim() });

        /**
         * And onto the account, where it survives this browser.
         *
         * Only for a delivery (a pickup has no address to keep) and only for
         * somebody signed in. The endpoint matches on the address text and
         * updates the row that is already there, so ordering to the same door
         * every week does not collect a row per order. Deliberately not awaited
         * and deliberately silent: nothing about placing an order should wait
         * on, or fail because of, an address book.
         */
        if (isLoggedIn && orderType === 'delivery' && contact.address.trim().length >= 4) {
            void saveAddress({ full_address: contact.address.trim() }).catch(() => { /* not worth a word */ });
        }

        try {
            const session = await createSession.mutateAsync({
                branch_id: Number(effectiveBranch.id),
                order_type: orderType,
                customer_name: contact.name,
                customer_phone: phone,
                delivery_address: orderType === 'delivery' ? contact.address : undefined,
                delivery_latitude: orderType === 'delivery' && coordinates ? coordinates.latitude : undefined,
                delivery_longitude: orderType === 'delivery' && coordinates ? coordinates.longitude : undefined,
                special_instructions: contact.note || undefined,
                payment_method: paymentMethod,
                momo_number: paymentMethod === 'mobile_money'
                    ? normalizeGhanaPhone(momoNumber)
                    : undefined,
            });

            if (paymentMethod === 'mobile_money') {
                // The backend clears the cart when the order is created, so it is
                // deliberately left alone here: a payment that fails leaves the
                // customer with their order still in hand.
                if (session.checkout_url) {
                    window.location.href = session.checkout_url;
                    return;
                }
                setSessionToken(session.session_token);
                setPhase('paying');
                return;
            }

            if (session.status === 'confirmed' && session.order?.order_number) {
                clearCart();
                setOrderNumber(session.order.order_number);
                setTrackingToken(session.tracking_token);
                // So the home screen can carry it beside the greeting until it
                // is delivered, whether or not they ever sign in.
                writeLastOrder({ number: session.order.order_number, token: session.tracking_token });
                setPhase('placed');
            } else {
                setSessionToken(session.session_token);
                setPhase('paying');
            }
        } catch (err: unknown) {
            toast.error(err instanceof ApiError ? err.message : 'The order did not go through. Try again.');
        } finally {
            setPlacing(false);
        }
    }, [effectiveBranch, paymentMethod, orderType, contact, momoNumber, coordinates, createSession, clearCart, isLoggedIn, saveAddress]);

    const handlePaid = useCallback((num: string, token?: string) => {
        clearCart();
        setOrderNumber(num);
        setTrackingToken(token);
        writeLastOrder({ number: num, token });
        setPhase('placed');
    }, [clearCart]);

    const handleGaveUp = useCallback(() => {
        setPhase('form');
        setSessionToken(null);
    }, []);

    // ── Moving between screens ───────────────────────────────────────────────
    // Each screen opens at its top, not wherever the last one was scrolled to.
    useEffect(() => { window.scrollTo({ top: 0 }); }, [stage]);

    const goTo = useCallback((next: Step) => {
        setStage(next);
        setFurthest(f => (stepIndex(next) > stepIndex(f) ? next : f));
    }, []);

    const advance = () => {
        if (stage === 'review') return;
        goTo(furthest === 'review' ? 'review' : STEPS[stepIndex(stage) + 1]);
    };

    const showForm = phase === 'form' || (phase === 'paying' && !sessionToken);

    const title = phase === 'placed'
        ? 'Order placed'
        : !showForm
            ? 'Payment'
            : stage === 'review' ? 'Check your order' : QUESTION_TITLES[stage];

    /**
     * Back is one screen, then out.
     *
     * A question reached through Change on the review goes back to the review.
     * There is nothing useful behind a payment being confirmed and nothing to
     * undo once it has been, so the arrow is gone on those two screens.
     */
    const goBack = !showForm
        ? undefined
        : stage === 'review'
            ? () => setStage('pay')
            : furthest === 'review'
                ? () => setStage('review')
                : stage === 'where'
                    ? () => router.back()
                    : () => setStage(STEPS[stepIndex(stage) - 1]);

    const leaving = showForm && stage === 'where' && furthest !== 'review';

    // ── The button ───────────────────────────────────────────────────────────
    const checkoutState = {
        branch: effectiveBranch, orderType, contact, orderTypes, methods,
        paymentMethod, momoNumber, momoRegistered: momoCheck.registered,
    };
    const blocker = stage === 'review' ? reviewBlocker(checkoutState) : questionBlocker(stage, checkoutState);
    const verb = paymentMethod === 'mobile_money' ? 'Pay now' : 'Place order';

    const action: BarAction = (() => {
        if (blocker?.opens === 'branch') {
            return { label: blocker.action, reason: blocker.reason, onPress: openBranchSheet };
        }

        if (stage !== 'review') {
            return { label: 'Continue', arrow: true, onPress: blocker ? undefined : advance };
        }

        if (!moneyReady) return { label: verb };

        if (blocker) {
            // A branch blocker was answered above, so anything left points at
            // one of the questions.
            const to = blocker.opens;
            return {
                label: blocker.action,
                reason: blocker.reason,
                onPress: to ? () => setStage(to) : undefined,
            };
        }

        return {
            label: placing ? 'Sending it through' : verb,
            // A delivery fee the rider collects at the door never reaches
            // Hubtel, so a MoMo button shows what leaves the wallet now.
            figure: formatPrice(totals.dueNow),
            busy: placing,
            onPress: handlePlace,
            note: totals.delivery > 0
                ? (paymentMethod === 'mobile_money'
                    ? `The rider collects ${formatPrice(totals.delivery)} for delivery at the door.`
                    : `Includes ${formatPrice(totals.delivery)} delivery, all of it paid to the rider.`)
                : undefined,
        };
    })();

    // ── What is on screen ────────────────────────────────────────────────────
    if (phase === 'form' && items.length === 0) {
        return (
            <div className="min-h-dvh bg-bg">
                <ScreenHeader title="Checkout" onBack={() => router.back()} backLabel="Leave checkout" />
                {/* Nothing is claimed about an empty cart until this browser
                    has actually looked in it. */}
                {mounted && !cartLoading && <EmptyCartGuard />}
            </div>
        );
    }

    return (
        // The form sits on the grey so its white blocks read as groups. The
        // page ground is #fafafa, which is too close to white to separate anything.
        <div className={`min-h-dvh ${showForm ? 'bg-surface-sunken' : 'bg-bg'}`}>
            <ScreenHeader
                title={title}
                onBack={goBack}
                backLabel={leaving ? 'Leave checkout' : 'Back'}
                right={showForm && stage !== 'review'
                    ? (
                        <span className="text-[13px] font-semibold tabular-nums text-fg-muted">
                            {stepIndex(stage) + 1} of {QUESTIONS.length}
                        </span>
                    )
                    : undefined}
            />

            {/* The width cap sits inside the gutter rather than on it. `.page-x`
                carries its own max-width of 80rem, which quietly beat the
                max-w-5xl that used to share this element, so on a laptop the
                form ran the full width of the screen. */}
            <div className="page-x">
            <div className="mx-auto max-w-5xl">
                {phase === 'placed' ? (
                    <OrderPlaced orderNumber={orderNumber} orderType={orderType} contact={contact} trackingToken={trackingToken} />
                ) : !showForm && sessionToken ? (
                    <PaymentWait
                        sessionToken={sessionToken}
                        onSuccess={handlePaid}
                        onFail={msg => { toast.error(msg); handleGaveUp(); }}
                        onAbandon={handleGaveUp}
                    />
                ) : (
                    <>
                        {stage === 'review' ? (
                            <div className="grid items-start gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8 lg:py-9">
                                {/* min-w-0, or the column refuses to go narrower
                                    than its widest line. A grid item is auto-width
                                    by default, so a long address pushed the whole
                                    page past the edge instead of wrapping inside it. */}
                                <div className="min-w-0">
                                    <CheckoutForm
                                        branch={effectiveBranch}
                                        orderType={orderType}
                                        paymentMethod={paymentMethod}
                                        contact={contact}
                                        momoNumber={momoNumber}
                                        momoCheck={momoCheck}
                                        momoChecking={momoChecking}
                                        onChange={setStage}
                                    />
                                </div>

                                <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-24">
                                    <OrderSummary
                                        branch={effectiveBranch}
                                        showBranch={orderType === 'delivery'}
                                        totals={totals}
                                        serviceLabel={serviceLabel}
                                        ready={moneyReady}
                                    />
                                    <PayAction {...action} />
                                </div>
                            </div>
                        ) : (
                            <div className="mx-auto min-w-0 max-w-xl py-4 lg:py-9">
                                {stage === 'where' && (
                                    <WhereStep
                                        orderType={orderType}
                                        setOrderType={setOrderType}
                                        orderTypes={orderTypes}
                                        branch={effectiveBranch}
                                        onChangeBranch={openBranchSheet}
                                        contact={contact}
                                        setContact={setContact}
                                        recalledAddress={recalled.address}
                                    />
                                )}
                                {stage === 'who' && (
                                    <WhoStep contact={contact} setContact={setContact} />
                                )}
                                {stage === 'pay' && (
                                    <PayStep
                                        methods={methods}
                                        paymentMethod={paymentMethod}
                                        setPaymentMethod={setPaymentMethod}
                                        orderType={orderType}
                                        momoNumber={momoNumber}
                                        setMomoNumber={setMomoOverride}
                                        momoCheck={momoCheck}
                                        momoChecking={momoChecking}
                                    />
                                )}
                                <PayAction {...action} className="mt-4" />
                            </div>
                        )}

                        <PayBarSpacer />
                        <BranchSelectorSheet isOpen={branchSheet} onClose={closeBranchSheet} />
                        <PayBar {...action} />
                    </>
                )}
            </div>
            </div>
        </div>
    );
}
