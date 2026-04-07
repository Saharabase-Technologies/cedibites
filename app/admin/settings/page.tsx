'use client';

import { useState, useEffect } from 'react';
import {
    GearSixIcon,
    CreditCardIcon,
    ChatTextIcon,
    TruckIcon,
    ShieldIcon,
    WarningCircleIcon,
    EyeIcon,
    EyeSlashIcon,
    CheckCircleIcon,
    XCircleIcon,
    FloppyDiskIcon,
    ArrowCounterClockwiseIcon,
    LockKeyIcon,
    SignOutIcon,
    DatabaseIcon,
    ToggleLeftIcon,
    ToggleRightIcon,
    ReceiptIcon,
    SpinnerIcon,
} from '@phosphor-icons/react';
import apiClient from '@/lib/api/client';
import { toast } from '@/lib/utils/toast';

// ─── Types / helpers ──────────────────────────────────────────────────────────

type Tab = 'general' | 'orders' | 'payment' | 'sms' | 'delivery' | 'roles' | 'danger';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button type="button" onClick={() => onChange(!checked)} className="cursor-pointer shrink-0">
            {checked
                ? <ToggleRightIcon size={26} weight="fill" className="text-primary" />
                : <ToggleLeftIcon size={26} weight="fill" className="text-neutral-gray/40" />
            }
        </button>
    );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return <label className="block text-[10px] font-bold font-body text-neutral-gray uppercase tracking-wider mb-1.5">{children}</label>;
}

function TextInput({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
    return (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            className="w-full px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40" />
    );
}

function SaveButton({ label = 'Save Changes', onClick }: { label?: string; onClick?: () => void }) {
    return (
        <button type="button" onClick={onClick}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium font-body hover:bg-primary-hover transition-colors cursor-pointer">
            <FloppyDiskIcon size={15} weight="bold" />
            {label}
        </button>
    );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return <div className={`bg-neutral-card border border-[#f0e8d8] rounded-2xl p-5 ${className}`}>{children}</div>;
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
    return (
        <div className="mb-4">
            <p className="text-text-dark text-sm font-bold font-body">{title}</p>
            {sub && <p className="text-neutral-gray text-xs font-body mt-0.5">{sub}</p>}
        </div>
    );
}

// ─── Tab: General ─────────────────────────────────────────────────────────────

function GeneralTab() {
    const [form, setForm] = useState({
        businessName: 'CediBites',
        contactEmail: 'admin@cedibites.com',
        contactPhone: '0302123456',
        defaultOrderType: 'Delivery',
        minOrderValue: '45',
        globalHoursFrom: '08:00',
        globalHoursTo: '22:00',
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        apiClient.get('/admin/settings')
            .then((res: unknown) => {
                const settings = (res as { data?: Array<{ key: string; value: string }> })?.data ?? [];
                for (const s of settings) {
                    if (s.key === 'global_operating_hours_open') {
                        setForm(f => ({ ...f, globalHoursFrom: s.value }));
                    }
                    if (s.key === 'global_operating_hours_close') {
                        setForm(f => ({ ...f, globalHoursTo: s.value }));
                    }
                }
            })
            .catch(() => toast.error('Failed to load settings'))
            .finally(() => setIsLoading(false));
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await apiClient.put('/admin/settings/global_operating_hours_open', {
                value: form.globalHoursFrom,
            });
            await apiClient.put('/admin/settings/global_operating_hours_close', {
                value: form.globalHoursTo,
            });
            toast.success('General settings saved');
        } catch {
            toast.error('Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-5">
            <Card>
                <SectionHeader title="Business Details" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <FieldLabel>Business Name</FieldLabel>
                        <TextInput value={form.businessName} onChange={v => setForm(f => ({ ...f, businessName: v }))} />
                    </div>
                    <div>
                        <FieldLabel>Contact Phone</FieldLabel>
                        <TextInput value={form.contactPhone} onChange={v => setForm(f => ({ ...f, contactPhone: v }))} />
                    </div>
                    <div className="sm:col-span-2">
                        <FieldLabel>Contact Email</FieldLabel>
                        <TextInput value={form.contactEmail} onChange={v => setForm(f => ({ ...f, contactEmail: v }))} />
                    </div>
                    <div>
                        <FieldLabel>Default Currency</FieldLabel>
                        <div className="px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-neutral-gray text-sm font-body">₵— Ghanaian Cedi (locked)</div>
                    </div>
                    <div>
                        <FieldLabel>Default Order Type</FieldLabel>
                        <select value={form.defaultOrderType} onChange={e => setForm(f => ({ ...f, defaultOrderType: e.target.value }))}
                            className="w-full px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40">
                            {['Delivery', 'Pickup', 'Dine-in'].map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                    <div>
                        <FieldLabel>Global Min. Order Value (GHS)</FieldLabel>
                        <TextInput value={form.minOrderValue} onChange={v => setForm(f => ({ ...f, minOrderValue: v }))} type="number" />
                    </div>
                </div>
            </Card>

            <Card>
                <SectionHeader title="Global Operating Hours" sub="Used as fallback when a branch has no hours configured" />
                <div className="flex items-center gap-4">
                    <div>
                        <FieldLabel>Opens</FieldLabel>
                        <input type="time" value={form.globalHoursFrom} onChange={e => setForm(f => ({ ...f, globalHoursFrom: e.target.value }))}
                            className="px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40" />
                    </div>
                    <span className="text-neutral-gray text-sm font-body mt-5">to</span>
                    <div>
                        <FieldLabel>Closes</FieldLabel>
                        <input type="time" value={form.globalHoursTo} onChange={e => setForm(f => ({ ...f, globalHoursTo: e.target.value }))}
                            className="px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body focus:outline-none focus:border-primary/40" />
                    </div>
                </div>
            </Card>

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving || isLoading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium font-body hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-60"
                >
                    {isSaving
                        ? <SpinnerIcon size={15} className="animate-spin" />
                        : <FloppyDiskIcon size={15} weight="bold" />
                    }
                    Save Changes
                </button>
            </div>
        </div>
    );
}

// ─── Tab: Order Settings ──────────────────────────────────────────────────────

function OrderSettingsTab() {
    const [manualEntryDateEnabled, setManualEntryDateEnabled] = useState(false);
    const [serviceChargeEnabled, setServiceChargeEnabled] = useState(true);
    const [serviceChargePercent, setServiceChargePercent] = useState('1');
    const [serviceChargeCap, setServiceChargeCap] = useState('5');
    const [deliveryFeeEnabled, setDeliveryFeeEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        apiClient.get('/admin/settings')
            .then((res: unknown) => {
                const settings = (res as { data?: Array<{ key: string; value: string }> })?.data ?? [];
                for (const s of settings) {
                    const boolVal = s.value === 'true' || s.value === '1';
                    if (s.key === 'manual_entry_date_enabled') {
                        setManualEntryDateEnabled(boolVal);
                    }
                    if (s.key === 'service_charge_enabled') {
                        setServiceChargeEnabled(boolVal);
                    }
                    if (s.key === 'service_charge_percent') {
                        setServiceChargePercent(s.value);
                    }
                    if (s.key === 'service_charge_cap') {
                        setServiceChargeCap(s.value);
                    }
                    if (s.key === 'delivery_fee_enabled') {
                        setDeliveryFeeEnabled(boolVal);
                    }
                }
            })
            .catch(() => toast.error('Failed to load order settings'))
            .finally(() => setIsLoading(false));
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await apiClient.put('/admin/settings/manual_entry_date_enabled', {
                value: manualEntryDateEnabled ? 'true' : 'false',
            });
            await apiClient.put('/admin/settings/service_charge_enabled', {
                value: serviceChargeEnabled ? 'true' : 'false',
            });
            await apiClient.put('/admin/settings/service_charge_percent', {
                value: serviceChargePercent,
            });
            await apiClient.put('/admin/settings/service_charge_cap', {
                value: serviceChargeCap,
            });
            await apiClient.put('/admin/settings/delivery_fee_enabled', {
                value: deliveryFeeEnabled ? 'true' : 'false',
            });
            toast.success('Order settings saved');
        } catch {
            toast.error('Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <Card>
                <div className="flex items-center justify-center py-12">
                    <SpinnerIcon size={24} className="animate-spin text-primary" />
                </div>
            </Card>
        );
    }

    return (
        <div className="flex flex-col gap-5">
            <Card>
                <SectionHeader title="Service Charge" sub="A percentage-based fee added to online customer orders" />
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                        <p className="text-text-dark text-sm font-medium font-body">Enable Service Charge</p>
                        <p className="text-neutral-gray text-xs font-body mt-0.5">
                            When off, no service charge is applied to online orders.
                        </p>
                    </div>
                    <Toggle checked={serviceChargeEnabled} onChange={setServiceChargeEnabled} />
                </div>
                {serviceChargeEnabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
                        <div>
                            <FieldLabel>Percentage (%)</FieldLabel>
                            <TextInput
                                value={serviceChargePercent}
                                onChange={v => setServiceChargePercent(v)}
                                type="number"
                                placeholder="1"
                            />
                            <p className="text-neutral-gray text-[11px] font-body mt-1.5">
                                Applied to the order subtotal.
                            </p>
                        </div>
                        <div>
                            <FieldLabel>Cap (GHS)</FieldLabel>
                            <TextInput
                                value={serviceChargeCap}
                                onChange={v => setServiceChargeCap(v)}
                                type="number"
                                placeholder="5"
                            />
                            <p className="text-neutral-gray text-[11px] font-body mt-1.5">
                                Max charge amount. Set to 0 for no cap.
                            </p>
                        </div>
                    </div>
                )}
            </Card>

            <Card>
                <SectionHeader title="Delivery Fee" sub="Standard delivery fee charged on delivery orders" />
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-text-dark text-sm font-medium font-body">Enable Delivery Fee</p>
                        <p className="text-neutral-gray text-xs font-body mt-0.5">
                            When off, no delivery fee is shown or charged on customer orders.
                        </p>
                    </div>
                    <Toggle checked={deliveryFeeEnabled} onChange={setDeliveryFeeEnabled} />
                </div>
            </Card>

            <Card>
                <SectionHeader title="Manual Entry" sub="Controls how staff record past orders in the POS" />
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-text-dark text-sm font-medium font-body">Allow date selection</p>
                        <p className="text-neutral-gray text-xs font-body mt-0.5">
                            When off, staff can only enter a time (today&apos;s date is used automatically).
                            When on, staff can pick any past date and time.
                        </p>
                    </div>
                    <Toggle checked={manualEntryDateEnabled} onChange={setManualEntryDateEnabled} />
                </div>
            </Card>

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium font-body hover:bg-primary-hover transition-colors cursor-pointer disabled:opacity-60"
                >
                    {isSaving
                        ? <SpinnerIcon size={15} className="animate-spin" />
                        : <FloppyDiskIcon size={15} weight="bold" />
                    }
                    Save Changes
                </button>
            </div>
        </div>
    );
}
// ─── Tab: Payment & Hubtel ────────────────────────────────────────────────────

function PaymentTab() {
    const [showKey, setShowKey] = useState(false);
    const [showSecret, setShowSecret] = useState(false);
    const [testMode, setTestMode] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<null | 'ok' | 'error'>(null);
    const [form, setForm] = useState({
        apiKey: 'hbt_live_•••••••••••••••••••••••••••••',
        clientId: 'cb-client-12345',
        clientSecret: '•••••••••••••••••',
        senderId: 'CediBites',
    });
    const [payments, setPayments] = useState({ momo: true, cod: true });

    return (
        <div className="flex flex-col gap-5">
            <Card>
                <SectionHeader title="Hubtel Integration" sub="API credentials for payment processing and SMS" />
                <div className="flex flex-col gap-4">
                    <div>
                        <FieldLabel>API Key</FieldLabel>
                        <div className="flex gap-2">
                            <input type={showKey ? 'text' : 'password'} value={form.apiKey} onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
                                className="flex-1 px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body font-mono focus:outline-none focus:border-primary/40" />
                            <button type="button" onClick={() => setShowKey(!showKey)}
                                className="px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-neutral-gray hover:text-text-dark transition-colors cursor-pointer">
                                {showKey ? <EyeSlashIcon size={16} /> : <EyeIcon size={16} />}
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <FieldLabel>Client ID</FieldLabel>
                            <TextInput value={form.clientId} onChange={v => setForm(f => ({ ...f, clientId: v }))} />
                        </div>
                        <div>
                            <FieldLabel>Client Secret</FieldLabel>
                            <div className="flex gap-2">
                                <input type={showSecret ? 'text' : 'password'} value={form.clientSecret} onChange={e => setForm(f => ({ ...f, clientSecret: e.target.value }))}
                                    className="flex-1 px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body font-mono focus:outline-none focus:border-primary/40" />
                                <button type="button" onClick={() => setShowSecret(!showSecret)}
                                    className="px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-neutral-gray hover:text-text-dark transition-colors cursor-pointer">
                                    {showSecret ? <EyeSlashIcon size={16} /> : <EyeIcon size={16} />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <FieldLabel>SMS Sender ID</FieldLabel>
                            <TextInput value={form.senderId} onChange={v => setForm(f => ({ ...f, senderId: v }))} placeholder="CediBites" />
                        </div>
                    </div>

                    {/* Test mode */}
                    <div className="flex items-center justify-between p-3 bg-warning/5 border border-warning/20 rounded-xl">
                        <div>
                            <p className="text-text-dark text-sm font-semibold font-body">Test Mode (Sandbox)</p>
                            <p className="text-neutral-gray text-xs font-body">Uses Hubtel sandbox — no real charges</p>
                        </div>
                        <Toggle checked={testMode} onChange={setTestMode} />
                    </div>

                    {/* Test connection */}
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={() => setConnectionStatus('ok')}
                            className="flex items-center gap-2 px-4 py-2.5 bg-neutral-light border border-[#f0e8d8] text-text-dark rounded-xl text-sm font-medium font-body hover:bg-[#f0e8d8] transition-colors cursor-pointer">
                            <ArrowCounterClockwiseIcon size={15} weight="bold" className="text-primary" />
                            Test Connection
                        </button>
                        {connectionStatus === 'ok' && (
                            <span className="flex items-center gap-1.5 text-secondary text-sm font-body">
                                <CheckCircleIcon size={16} weight="fill" />
                                Connected successfully
                            </span>
                        )}
                        {connectionStatus === 'error' && (
                            <span className="flex items-center gap-1.5 text-error text-sm font-body">
                                <XCircleIcon size={16} weight="fill" />
                                Connection failed
                            </span>
                        )}
                    </div>
                </div>
            </Card>

            <Card>
                <SectionHeader title="Global Payment Methods" sub="Enabled methods apply to all branches (branches can restrict further)" />
                <div className="flex flex-col gap-3">
                    {[
                        { key: 'momo', label: 'Mobile Money', sub: 'MTN, Vodafone, AirtelTigo MoMo via Hubtel' },
                        { key: 'cod',  label: 'Cash on Delivery', sub: 'Customer pays rider on delivery' },
                    ].map(({ key, label, sub }) => (
                        <div key={key} className="flex items-center justify-between p-3 bg-neutral-light rounded-xl">
                            <div>
                                <p className="text-text-dark text-sm font-semibold font-body">{label}</p>
                                <p className="text-neutral-gray text-xs font-body">{sub}</p>
                            </div>
                            <Toggle checked={payments[key as keyof typeof payments]} onChange={v => setPayments(p => ({ ...p, [key]: v }))} />
                        </div>
                    ))}
                </div>
            </Card>

            <div className="flex justify-end"><SaveButton /></div>
        </div>
    );
}

// ─── Tab: SMS & Notifications ─────────────────────────────────────────────────

const SMS_TEMPLATES = [
    { key: 'confirm',  label: 'Order Confirmation',     vars: ['{order_number}', '{branch_name}', '{estimated_time}'],
      defaultText: 'Hi! Your CediBites order #{order_number} has been received at {branch_name}. Estimated time: {estimated_time}. Thank you!' },
    { key: 'ready',    label: 'Ready for Pickup',       vars: ['{order_number}', '{branch_name}'],
      defaultText: 'Your order #{order_number} is ready for pickup at {branch_name}. Please collect within 15 minutes.' },
    { key: 'delivery', label: 'Out for Delivery',       vars: ['{order_number}', '{rider_name}'],
      defaultText: 'Your CediBites order #{order_number} is on the way! Rider: {rider_name}. ETA 20-30 mins.' },
    { key: 'delivered',label: 'Order Delivered',        vars: ['{order_number}'],
      defaultText: 'Your CediBites order #{order_number} has been delivered. Enjoy your meal! Rate us at cedibites.com.' },
    { key: 'cancelled',label: 'Order Cancelled',        vars: ['{order_number}', '{reason}'],
      defaultText: 'Unfortunately your order #{order_number} has been cancelled. Reason: {reason}. We apologise for the inconvenience.' },
];

function SmsTab() {
    const [smsEnabled, setSmsEnabled] = useState(true);
    const [templates, setTemplates] = useState<Record<string, string>>(
        Object.fromEntries(SMS_TEMPLATES.map(t => [t.key, t.defaultText]))
    );
    const [previewing, setPreviewing] = useState<string | null>(null);

    function preview(key: string) {
        setPreviewing(previewing === key ? null : key);
    }

    function renderPreview(text: string) {
        return text
            .replace('{order_number}', 'A042')
            .replace('{branch_name}', 'East Legon')
            .replace('{estimated_time}', '25-35 mins')
            .replace('{rider_name}', 'Kweku Mensah')
            .replace('{reason}', 'Item unavailable');
    }

    return (
        <div className="flex flex-col gap-5">
            <Card>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-text-dark text-sm font-bold font-body">SMS Notifications</p>
                        <p className="text-neutral-gray text-xs font-body mt-0.5">Master kill-switch for all outbound SMS</p>
                    </div>
                    <Toggle checked={smsEnabled} onChange={setSmsEnabled} />
                </div>
                {!smsEnabled && (
                    <div className="mt-3 p-3 bg-error/5 border border-error/20 rounded-xl flex items-center gap-2">
                        <WarningCircleIcon size={16} weight="fill" className="text-error shrink-0" />
                        <p className="text-error text-xs font-body">SMS is disabled. No messages will be sent to customers.</p>
                    </div>
                )}
            </Card>

            {SMS_TEMPLATES.map(tmpl => {
                const text = templates[tmpl.key];
                const charCount = text.length;
                const msgCount = Math.ceil(charCount / 160);
                return (
                    <Card key={tmpl.key}>
                        <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                                <p className="text-text-dark text-sm font-bold font-body">{tmpl.label}</p>
                                <div className="flex gap-1.5 mt-1 flex-wrap">
                                    {tmpl.vars.map(v => (
                                        <span key={v} className="text-[10px] font-mono font-body bg-primary/10 text-primary px-1.5 py-0.5 rounded">{v}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`text-[10px] font-body ${charCount > 160 ? 'text-warning' : 'text-neutral-gray'}`}>{charCount}/160 · {msgCount} msg</span>
                                <button type="button" onClick={() => preview(tmpl.key)}
                                    className="px-2.5 py-1.5 bg-neutral-light text-neutral-gray text-[11px] font-medium font-body rounded-lg hover:text-text-dark transition-colors cursor-pointer">
                                    {previewing === tmpl.key ? 'Hide' : 'Preview'}
                                </button>
                            </div>
                        </div>
                        <textarea
                            value={text}
                            onChange={e => setTemplates(t => ({ ...t, [tmpl.key]: e.target.value }))}
                            rows={3}
                            className="w-full px-3 py-2.5 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-sm font-body resize-none focus:outline-none focus:border-primary/40"
                        />
                        {previewing === tmpl.key && (
                            <div className="mt-3 p-3 bg-[#dcf8c6] rounded-xl border border-[#c3e6ab]">
                                <p className="text-[10px] font-bold font-body text-[#128C7E] mb-1 uppercase tracking-wider">Preview (dummy values)</p>
                                <p className="text-text-dark text-xs font-body">{renderPreview(text)}</p>
                            </div>
                        )}
                    </Card>
                );
            })}

            <div className="flex justify-end"><SaveButton /></div>
        </div>
    );
}

// ─── Tab: Delivery ────────────────────────────────────────────────────────────

function DeliveryTab() {
    const [model, setModel] = useState<'flat' | 'perkm'>('perkm');
    const [form, setForm] = useState({
        flatFee: '15',
        baseFee: '12',
        perKm: '3',
        freeThreshold: '200',
        hasFreeThreshold: false,
        baseTime: '15',
        perKmTime: '3',
    });

    return (
        <div className="flex flex-col gap-5">
            <Card>
                <SectionHeader title="Fee Structure" sub="Branches can override per-branch delivery fees" />
                <div className="flex gap-3 mb-5">
                    {([['flat', 'Flat Fee'], ['perkm', 'Per Kilometre']] as const).map(([k, label]) => (
                        <button key={k} type="button" onClick={() => setModel(k)}
                            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium font-body border transition-all cursor-pointer ${model === k ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-neutral-light border-[#f0e8d8] text-neutral-gray hover:text-text-dark'}`}>
                            {label}
                        </button>
                    ))}
                </div>

                {model === 'flat' ? (
                    <div className="max-w-xs">
                        <FieldLabel>Flat Delivery Fee (GHS)</FieldLabel>
                        <TextInput value={form.flatFee} onChange={v => setForm(f => ({ ...f, flatFee: v }))} type="number" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4 max-w-sm">
                        <div>
                            <FieldLabel>Base Fee (GHS)</FieldLabel>
                            <TextInput value={form.baseFee} onChange={v => setForm(f => ({ ...f, baseFee: v }))} type="number" />
                        </div>
                        <div>
                            <FieldLabel>Per-km Rate (GHS)</FieldLabel>
                            <TextInput value={form.perKm} onChange={v => setForm(f => ({ ...f, perKm: v }))} type="number" />
                        </div>
                    </div>
                )}

                <div className="mt-5">
                    <div className="flex items-center gap-3 mb-2">
                        <Toggle checked={form.hasFreeThreshold} onChange={v => setForm(f => ({ ...f, hasFreeThreshold: v }))} />
                        <p className="text-text-dark text-sm font-semibold font-body">Free delivery threshold</p>
                    </div>
                    {form.hasFreeThreshold && (
                        <div className="max-w-xs">
                            <FieldLabel>Free delivery for orders above (GHS)</FieldLabel>
                            <TextInput value={form.freeThreshold} onChange={v => setForm(f => ({ ...f, freeThreshold: v }))} type="number" />
                        </div>
                    )}
                </div>
            </Card>

            <Card>
                <SectionHeader title="Estimated Time" sub="Used for customer-facing delivery ETA" />
                <div className="grid grid-cols-2 gap-4 max-w-sm">
                    <div>
                        <FieldLabel>Base Time (mins)</FieldLabel>
                        <TextInput value={form.baseTime} onChange={v => setForm(f => ({ ...f, baseTime: v }))} type="number" />
                    </div>
                    <div>
                        <FieldLabel>Per-km Time (mins)</FieldLabel>
                        <TextInput value={form.perKmTime} onChange={v => setForm(f => ({ ...f, perKmTime: v }))} type="number" />
                    </div>
                </div>
                <p className="text-neutral-gray text-xs font-body mt-3">
                    Example: {form.baseTime} mins base + {form.perKmTime} mins/km → 3km delivery = {Number(form.baseTime) + 3 * Number(form.perKmTime)} mins
                </p>
            </Card>

            <div className="flex justify-end"><SaveButton /></div>
        </div>
    );
}

// ─── Tab: Roles & Permissions ─────────────────────────────────────────────────

const PERMISSIONS = [
    { feature: 'View all branches',      admin: 'Full', manager: 'Branch Only', staff: 'Branch Only', callcenter: 'Read Only'    },
    { feature: 'Create orders',          admin: 'Full', manager: 'Full',         staff: 'Full',        callcenter: 'Full'         },
    { feature: 'Cancel orders',          admin: 'Full', manager: 'Branch Only', staff: 'Not Available', callcenter: 'Not Available'},
    { feature: 'Issue refunds',          admin: 'Full', manager: 'Not Available', staff: 'Not Available', callcenter: 'Not Available'},
    { feature: 'View analytics',         admin: 'Full', manager: 'Branch Only', staff: 'Not Available', callcenter: 'Not Available'},
    { feature: 'Manage menu',            admin: 'Full', manager: 'Branch Only', staff: 'Not Available', callcenter: 'Not Available'},
    { feature: 'Manage staff',           admin: 'Full', manager: 'Branch Only', staff: 'Not Available', callcenter: 'Not Available'},
    { feature: 'View customers',         admin: 'Full', manager: 'Branch Only', staff: 'Not Available', callcenter: 'Read Only'    },
    { feature: 'Edit system settings',   admin: 'Full', manager: 'Not Available', staff: 'Not Available', callcenter: 'Not Available'},
    { feature: 'Access POS',             admin: 'Full', manager: 'Full',         staff: 'Full',        callcenter: 'Not Available'},
    { feature: 'View audit log',         admin: 'Full', manager: 'Not Available', staff: 'Not Available', callcenter: 'Not Available'},
];

const PERM_STYLES: Record<string, string> = {
    'Full':          'text-secondary',
    'Branch Only':   'text-primary',
    'Read Only':     'text-info',
    'Not Available': 'text-neutral-gray/50',
};

function RolesTab() {
    return (
        <Card>
            <SectionHeader title="Roles & Permissions Reference" sub="Read-only. Contact your IT team to modify role capabilities." />
            <div className="overflow-x-auto">
                <table className="w-full text-xs font-body min-w-[500px]">
                    <thead>
                        <tr className="border-b border-[#f0e8d8]">
                            <th className="text-neutral-gray text-[10px] font-bold uppercase tracking-wider pb-2 pr-4 text-left">Feature / Action</th>
                            {['Admin', 'Branch Manager', 'Branch Staff', 'Call Center'].map(r => (
                                <th key={r} className="text-neutral-gray text-[10px] font-bold uppercase tracking-wider pb-2 pr-4 text-left whitespace-nowrap">{r}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {PERMISSIONS.map(p => (
                            <tr key={p.feature} className="border-b border-[#f0e8d8] last:border-0 hover:bg-neutral-light/50 transition-colors">
                                <td className="py-2.5 pr-4 text-text-dark font-medium">{p.feature}</td>
                                <td className={`py-2.5 pr-4 font-semibold ${PERM_STYLES[p.admin]}`}>{p.admin}</td>
                                <td className={`py-2.5 pr-4 font-semibold ${PERM_STYLES[p.manager]}`}>{p.manager}</td>
                                <td className={`py-2.5 pr-4 font-semibold ${PERM_STYLES[p.staff]}`}>{p.staff}</td>
                                <td className={`py-2.5 pr-4 font-semibold ${PERM_STYLES[p.callcenter]}`}>{p.callcenter}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

// ─── Tab: Danger Zone ─────────────────────────────────────────────────────────

function DangerZoneTab() {
    const ACTIONS = [
        {
            icon: SignOutIcon,
            label: 'Flush All Active Sessions',
            sub: 'Logs out every user across the entire platform immediately. They will need to log in again.',
            btnLabel: 'Flush Sessions',
            confirmText: 'CONFIRM',
            danger: true,
        },
        {
            icon: DatabaseIcon,
            label: 'Reset Test Data',
            sub: 'Wipes all seeded mock orders and customers. Only available in development/staging.',
            btnLabel: 'Reset Test Data',
            confirmText: 'CONFIRM',
            danger: true,
        },
        {
            icon: LockKeyIcon,
            label: 'Export Full Database Backup',
            sub: 'Triggers a JSON/CSV dump of all tables. The file will be available for download.',
            btnLabel: 'Export Backup',
            confirmText: 'CONFIRM',
            danger: false,
        },
        {
            icon: WarningCircleIcon,
            label: 'Deactivate Entire Platform',
            sub: 'Sets all branches to closed and shows a maintenance message to customers. Staff can still log in.',
            btnLabel: 'Deactivate Platform',
            confirmText: 'CONFIRM',
            danger: true,
        },
    ];

    return (
        <div className="flex flex-col gap-4">
            <div className="p-4 bg-error/5 border border-error/20 rounded-2xl flex items-start gap-3">
                <WarningCircleIcon size={18} weight="fill" className="text-error shrink-0 mt-0.5" />
                <p className="text-text-dark text-sm font-body">
                    <strong>Danger Zone.</strong> Every action below requires typing CONFIRM before it activates. These actions may be irreversible or have wide-reaching consequences.
                </p>
            </div>
            {ACTIONS.map(action => (
                <DangerAction key={action.label} {...action} />
            ))}
        </div>
    );
}

function DangerAction({ icon: Icon, label, sub, btnLabel, confirmText, danger }: {
    icon: React.ElementType; label: string; sub: string; btnLabel: string; confirmText: string; danger: boolean;
}) {
    const [input, setInput] = useState('');
    const confirmed = input === confirmText;

    return (
        <Card>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-start gap-3 flex-1">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${danger ? 'bg-error/10' : 'bg-primary/10'}`}>
                        <Icon size={18} weight="fill" className={danger ? 'text-error' : 'text-primary'} />
                    </div>
                    <div>
                        <p className="text-text-dark text-sm font-bold font-body">{label}</p>
                        <p className="text-neutral-gray text-xs font-body mt-0.5">{sub}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder={confirmText}
                        className="w-24 px-2.5 py-2 bg-neutral-light border border-[#f0e8d8] rounded-xl text-text-dark text-xs font-body text-center focus:outline-none focus:border-error/50"
                    />
                    <button
                        type="button"
                        disabled={!confirmed}
                        className={`px-4 py-2 rounded-xl text-xs font-medium font-body transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${danger ? 'bg-error text-white hover:bg-error/90' : 'bg-primary text-white hover:bg-primary-hover'}`}
                    >
                        {btnLabel}
                    </button>
                </div>
            </div>
        </Card>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'general',  label: 'General',         icon: GearSixIcon      },
    { key: 'orders',   label: 'Order Settings',  icon: ReceiptIcon      },
    { key: 'payment',  label: 'Payment & Hubtel', icon: CreditCardIcon   },
    { key: 'sms',      label: 'SMS & Notifications', icon: ChatTextIcon  },
    { key: 'delivery', label: 'Delivery',         icon: TruckIcon        },
    { key: 'roles',    label: 'Roles & Perms',    icon: ShieldIcon       },
    { key: 'danger',   label: 'Danger Zone',      icon: WarningCircleIcon},
];

export default function AdminSettingsPage() {
    const [tab, setTab] = useState<Tab>('general');

    return (
        <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">

            {/* Header */}
            <div className="mb-6">
                <h1 className="text-text-dark text-2xl font-bold font-body">Settings</h1>
                <p className="text-neutral-gray text-sm font-body mt-0.5">System-wide configuration · Admin only</p>
            </div>

            <div className="flex flex-col md:flex-row gap-5">

                {/* Left tab list (desktop) */}
                <nav className="md:w-52 shrink-0">
                    <div className="flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-visible no-scrollbar pb-1 md:pb-0">
                        {TABS.map(({ key, label, icon: Icon }) => (
                            <button key={key} type="button" onClick={() => setTab(key)}
                                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium font-body whitespace-nowrap md:whitespace-normal text-left transition-all cursor-pointer w-full ${tab === key ? 'bg-[#fff8ec] text-primary border-l-[3px] border-primary pl-[9px]' : 'text-neutral-gray hover:bg-neutral-light hover:text-text-dark'} ${key === 'danger' ? (tab === key ? '' : 'text-error/70 hover:text-error hover:bg-error/5') : ''}`}>
                                <Icon size={16} weight={tab === key ? 'fill' : 'regular'} className="shrink-0" />
                                {label}
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {tab === 'general'  && <GeneralTab />}
                    {tab === 'orders'   && <OrderSettingsTab />}
                    {tab === 'payment'  && <PaymentTab />}
                    {tab === 'sms'      && <SmsTab />}
                    {tab === 'delivery' && <DeliveryTab />}
                    {tab === 'roles'    && <RolesTab />}
                    {tab === 'danger'   && <DangerZoneTab />}
                </div>
            </div>
        </div>
    );
}
