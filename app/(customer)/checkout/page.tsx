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
import { UNCHECKED, type MomoCheck } from './_components/MomoField';
import EmptyCartGuard from './_components/EmptyCartGuard';
import OrderPlaced from './_components/OrderPlaced';
import PaymentWait from './_components/PaymentWait';
import { OrderPanel, OrderRecap } from './_components/OrderPanel';
import { PayBar, PayBarSpacer, PayAction } from './_components/PayBar';
import { stageBlocker, enabledOrderTypes, enabledPaymentMethods } from './_components/availability';
import { computeTotals } from './_components/pricing';
import { readRecalled, writeRecalled, type RecalledDetails } from './_components/recall';
import { writeLastOrder } from '@/lib/orders/lastOrder';
import { useAddresses } from '@/lib/api/hooks/useAddresses';
import { DEFAULT_SC_CONFIG, STAGES, nextStage, stageIsBefore } from './_components/types';
import type { ContactDetails, OrderType, PaymentMethod, Phase, ServiceChargeConfig, Stage } from './_components/types';

const NO_RECALL: RecalledDetails = { name: '', phone: '', address: '' };

export default function CheckoutPage() {
    const router = useRouter();
    const { displayItems: items, clearCart, subtotal, isLoading: cartLoading } = useCart();
    const { selectedBranch, branches } = useBranch();
    const { coordinates } = useLocation();
    const { user, isLoggedIn } = useAuth();
    // Empty for a guest: the query only runs when there is a customer token.
    // The list itself is rendered by CheckoutForm, off the same cached query.
    const { defaultAddress, saveAddress } = useAddresses();
    const createSession = useCreateCheckoutSession();

    const [phase, setPhase] = useState<Phase>('form');

    /**
     * The question on screen, and the furthest one reached.
     *
     * `furthest` is what makes Change cheap. Tap it on the address while
     * standing at payment and you are taken back one question, but Continue
     * returns you straight to payment rather than walking you through the name
     * and number you had already given.
     */
    const [stage, setStage] = useState<Stage>('where');
    const [furthest, setFurthest] = useState<Stage>('where');
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
     * The number the Mobile Money prompt goes to.
     *
     * Null means nobody has changed it, and it follows the number they gave for
     * the order, because that is the one people pay from. Typing in the field
     * takes it off that leash for good: somebody paying from a different wallet
     * should not have it snatched back when they correct their contact number.
     */
    /**
     * One branch sheet for the whole screen.
     *
     * The form used to own it, which was fine while the only way to change
     * branch was a line inside the delivery question. Now the order summary
     * offers it too, and two components cannot each hold their own copy of the
     * same sheet without one of them opening behind the other.
     */
    const [branchSheet, setBranchSheet] = useState(false);
    const openBranchSheet = useCallback(() => setBranchSheet(true), []);

    const [momoOverride, setMomoOverride] = useState<string | null>(null);
    const [momoCheck, setMomoCheck] = useState<MomoCheck>(UNCHECKED);
    const momoNumber = momoOverride ?? contact.phone;

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
    useEffect(() => {
        if (!effectiveBranch || items.length === 0) {
            setPromo(null); setPromoDiscount(0); setPromoReady(true);
            return;
        }
        setPromoReady(false);
        const itemIds = items.map(ci => String(ci.item.id));
        getPromoService().resolvePromo(itemIds, String(effectiveBranch.id), subtotal).then(p => {
            setPromo(p ?? null);
            setPromoDiscount(p ? getPromoService().calculateDiscount(p, subtotal) : 0);
        }).catch(() => {
            setPromo(null); setPromoDiscount(0);
        }).finally(() => setPromoReady(true));
    }, [items, effectiveBranch, subtotal]);

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

    // ── The money, worked out once for the bar and the panel ─────────────────
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
     * whether this order has a promo on it. Before that the screen would be
     * showing a total built from the fallbacks, then quietly changing it. The
     * bar holds the button until both have landed.
     */
    const moneyReady = configReady && promoReady;

    const serviceLabel = scConfig.percent > 0 ? `Service charge, ${scConfig.percent}%` : 'Service charge';

    const blocked = stageBlocker(stage, {
        branch: effectiveBranch, orderType, contact, orderTypes, methods,
        paymentMethod, momoNumber, momoRegistered: momoCheck.registered,
    });

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
         * Only for a delivery — a pickup has no address to keep — and only for
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

    /**
     * The one button at the foot. It moves you on, or on the last question it
     * takes the money.
     */
    const handleAdvance = useCallback(() => {
        if (stage === 'pay') { handlePlace(); return; }

        // Standing behind where they had already got to means they came back
        // through Change. Send them forward to where they were, not through
        // answers they have already given.
        const next = stageIsBefore(stage, furthest) ? furthest : nextStage(stage);
        if (!next) return;

        setStage(next);
        setFurthest(f => (stageIsBefore(f, next) ? next : f));
    }, [stage, furthest, handlePlace]);

    // ── What is on screen ────────────────────────────────────────────────────
    const title = phase === 'placed' ? 'Order placed' : phase === 'paying' ? 'Payment' : 'Checkout';

    /**
     * Back is one question, then out.
     *
     * There is nothing useful behind a payment being confirmed and nothing to
     * undo once it has been, so the arrow is gone on those two screens.
     */
    const stageIndex = STAGES.indexOf(stage);
    const goBack = phase !== 'form'
        ? undefined
        : stageIndex > 0
            ? () => setStage(STAGES[stageIndex - 1])
            : () => router.back();

    if (phase === 'form' && items.length === 0) {
        return (
            <div className="min-h-dvh bg-bg">
                <ScreenHeader title={title} onBack={goBack} backLabel="Leave checkout" />
                {/* Nothing is claimed about an empty cart until this browser
                    has actually looked in it. */}
                {mounted && !cartLoading && <EmptyCartGuard />}
            </div>
        );
    }

    return (
        <div className="min-h-dvh bg-bg">
            <ScreenHeader
                title={title}
                onBack={goBack}
                backLabel={stageIndex > 0 ? 'Back to the last question' : 'Leave checkout'}
                progress={phase === 'form' ? (stageIndex + 1) / STAGES.length : undefined}
            />

            <div className="page-x mx-auto max-w-5xl">
                {phase === 'placed' ? (
                    <OrderPlaced orderNumber={orderNumber} orderType={orderType} contact={contact} trackingToken={trackingToken} />
                ) : phase === 'paying' && sessionToken ? (
                    <PaymentWait
                        sessionToken={sessionToken}
                        onSuccess={handlePaid}
                        onFail={msg => { toast.error(msg); handleGaveUp(); }}
                        onAbandon={handleGaveUp}
                    />
                ) : (
                    <>
                        <OrderRecap totals={totals} serviceLabel={serviceLabel} ready={moneyReady} onChangeBranch={openBranchSheet} />

                        <div className="grid items-start gap-10 py-7 lg:grid-cols-[1fr_340px] lg:py-9">
                            {/* min-w-0, or the column refuses to go narrower
                                than its widest line. A grid item is auto-width
                                by default, so a long address pushed the whole
                                form past the edge of the page instead of
                                wrapping inside it. */}
                            <div className="min-w-0">
                                <CheckoutForm
                                    stage={stage}
                                    onJumpTo={setStage}
                                    orderType={orderType}
                                    setOrderType={setOrderType}
                                    orderTypes={orderTypes}
                                    paymentMethod={paymentMethod}
                                    setPaymentMethod={setPaymentMethod}
                                    methods={methods}
                                    contact={contact}
                                    setContact={setContact}
                                    recalled={recalled}
                                    momoNumber={momoNumber}
                                    setMomoNumber={setMomoOverride}
                                    onMomoChecked={setMomoCheck}
                                    totals={totals}
                                    serviceLabel={serviceLabel}
                                    moneyReady={moneyReady}
                                    onChangeBranch={openBranchSheet}
                                />

                                {/* Under the question, not beside it. On a
                                    phone this is hidden and the pinned bar at
                                    the foot of the screen carries it. */}
                                <div className="mt-9">
                                    <PayAction
                                        stage={stage}
                                        method={paymentMethod}
                                        placing={placing}
                                        ready={moneyReady}
                                        blockedBecause={blocked}
                                        onAdvance={handleAdvance}
                                    />
                                </div>
                            </div>

                            <OrderPanel totals={totals} serviceLabel={serviceLabel} ready={moneyReady} onChangeBranch={openBranchSheet} />
                        </div>

                        <PayBarSpacer />
                        <BranchSelectorSheet isOpen={branchSheet} onClose={() => setBranchSheet(false)} />

                        <PayBar
                            totals={totals}
                            stage={stage}
                            method={paymentMethod}
                            placing={placing}
                            ready={moneyReady}
                            blockedBecause={blocked}
                            onAdvance={handleAdvance}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
