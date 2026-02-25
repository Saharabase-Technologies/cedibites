import type { ElementType } from 'react';
import {
    PhoneIcon,
    WhatsappLogoIcon,
    InstagramLogoIcon,
    FacebookLogoIcon,
    GlobeIcon,
    DeviceMobileIcon,
} from '@phosphor-icons/react';
import type { OrderSource, OrderStatus, PaymentMethod, SalesOrder } from './types';

// ─── Label & icon maps ────────────────────────────────────────────────────────

export const SOURCE_ICON: Record<OrderSource, ElementType> = {
    online: GlobeIcon,
    phone: PhoneIcon,
    whatsapp: WhatsappLogoIcon,
    instagram: InstagramLogoIcon,
    facebook: FacebookLogoIcon,
    pos: DeviceMobileIcon,
};

export const SOURCE_LABEL: Record<OrderSource, string> = {
    online: 'Online',
    phone: 'Phone',
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    facebook: 'Facebook',
    pos: 'POS',
};

export const STATUS: Record<OrderStatus, { dot: string; label: string }> = {
    received: { dot: 'bg-neutral-gray', label: 'Received' },
    preparing: { dot: 'bg-primary', label: 'Preparing' },
    ready: { dot: 'bg-warning', label: 'Ready' },
    out_for_delivery: { dot: 'bg-info', label: 'Delivering' },
    ready_for_pickup: { dot: 'bg-info', label: 'Ready Pickup' },
    delivered: { dot: 'bg-secondary', label: 'Delivered' },
    completed: { dot: 'bg-secondary', label: 'Completed' },
    cancelled: { dot: 'bg-error', label: 'Cancelled' },
};

/** Short labels for the compact table column */
export const PAY_LABEL: Record<PaymentMethod, string> = {
    momo: 'MoMo',
    cash_delivery: 'Cash',
    cash_pickup: 'Cash',
};

/** Full labels for the detail drawer */
export const PAY_LABEL_FULL: Record<PaymentMethod, string> = {
    momo: 'Mobile Money (MoMo)',
    cash_delivery: 'Cash on Delivery',
    cash_pickup: 'Cash on Pickup',
};

// ─── Mock data — replace with GET /api/v1/staff/my-sales?period=today ─────────
//
// Backend must:
//   - Return only orders created by the authenticated staff member (JWT identity)
//   - Enforce 24-hour window server-side for non-manager staff
//   - Response shape: { orders: SalesOrder[], generatedAt: ISO string }

function hoursAgo(h: number) { return new Date(Date.now() - h * 3_600_000); }
function minsAgo(m: number) { return new Date(Date.now() - m * 60_000); }

export const MY_SALES_TODAY: SalesOrder[] = [
    {
        id: 'CB847291', status: 'out_for_delivery', source: 'whatsapp', branch: 'East Legon',
        fulfillment: 'delivery',
        customer: { name: 'Ama Serwaa', phone: '0244 123 456' },
        items: [
            { name: 'Jollof Rice', qty: 2, unitPrice: 22 },
            { name: 'Fried Rice', qty: 1, unitPrice: 20 },
            { name: 'Grilled Chicken', qty: 1, unitPrice: 20 },
        ],
        subtotal: 84, discount: 0, deliveryFee: 10, tax: 0, total: 94,
        payment: 'momo',
        deliveryAddress: '14 Ring Road, East Legon, Accra',
        gpsCoords: 'GE-017-8394',
        estimatedMinutes: 15,
        customerNotes: 'Extra rice on the side please',
        placedAt: minsAgo(22),
    },
    {
        id: 'CB391045', status: 'completed', source: 'phone', branch: 'Osu',
        fulfillment: 'pickup',
        customer: { name: 'Kweku Asante', phone: '0201 987 654' },
        items: [
            { name: 'Banku & Tilapia', qty: 1, unitPrice: 35 },
            { name: 'Spring Rolls', qty: 1, unitPrice: 15 },
        ],
        subtotal: 50, discount: 0, deliveryFee: 0, tax: 0, total: 50,
        payment: 'cash_pickup',
        placedAt: minsAgo(85),
    },
    {
        id: 'CB204837', status: 'delivered', source: 'instagram', branch: 'Tema',
        fulfillment: 'delivery',
        customer: { name: 'Abena Boateng', phone: '0551 234 567' },
        items: [
            { name: 'Grilled Chicken Platter', qty: 1, unitPrice: 65 },
        ],
        subtotal: 65, discount: 0, deliveryFee: 8, tax: 0, total: 73,
        payment: 'momo',
        deliveryAddress: '7 Community 9, Tema',
        gpsCoords: 'TE-004-2819',
        allergyFlags: ['No pepper', 'Gluten-free'],
        customerNotes: 'Call when at the gate',
        placedAt: hoursAgo(2),
    },
    {
        id: 'CB173920', status: 'preparing', source: 'facebook', branch: 'Madina',
        fulfillment: 'delivery',
        customer: { name: 'Yaw Darko', phone: '0277 654 321' },
        items: [
            { name: 'Fufu & Light Soup', qty: 1, unitPrice: 30 },
            { name: 'Grilled Chicken', qty: 1, unitPrice: 40 },
            { name: 'Jollof Rice', qty: 1, unitPrice: 20 },
            { name: 'Fried Plantain', qty: 1, unitPrice: 10 },
        ],
        subtotal: 100, discount: 0, deliveryFee: 10, tax: 0, total: 110,
        payment: 'cash_delivery',
        deliveryAddress: 'Near Madina Total, Madina, Accra',
        gpsCoords: 'GA-402-1133',
        estimatedMinutes: 40,
        placedAt: minsAgo(34),
    },
    {
        id: 'CB998812', status: 'delivered', source: 'phone', branch: 'East Legon',
        fulfillment: 'delivery',
        customer: { name: 'Efua Mensah', phone: '0244 567 890' },
        items: [
            { name: 'Waakye', qty: 1, unitPrice: 25 },
            { name: 'Shawarma', qty: 1, unitPrice: 25 },
        ],
        subtotal: 50, discount: 0, deliveryFee: 9, tax: 0, total: 59,
        payment: 'momo',
        deliveryAddress: '3 Boundary Road, East Legon',
        gpsCoords: 'GE-029-7712',
        staffNotes: 'Customer requested contactless delivery',
        placedAt: hoursAgo(3),
    },
    {
        id: 'CB774433', status: 'cancelled', source: 'whatsapp', branch: 'Osu',
        fulfillment: 'delivery',
        customer: { name: 'Kojo Appiah', phone: '0200 112 233' },
        items: [
            { name: 'Grilled Chicken', qty: 2, unitPrice: 45 },
            { name: 'Fufu & Palm Nut Soup', qty: 1, unitPrice: 27 },
        ],
        subtotal: 117, discount: 0, deliveryFee: 0, tax: 0, total: 117,
        payment: 'momo',
        deliveryAddress: '22 Cantonments Road, Osu, Accra',
        gpsCoords: 'GA-288-5544',
        customerNotes: 'Customer cancelled — said it was a duplicate',
        staffNotes: 'Refund initiated via MoMo',
        placedAt: hoursAgo(1),
    },
    {
        id: 'CB556677', status: 'completed', source: 'phone', branch: 'La Paz',
        fulfillment: 'pickup',
        customer: { name: 'Adwoa Ofori', phone: '0245 678 901' },
        items: [
            { name: 'Banku & Tilapia', qty: 1, unitPrice: 61 },
            { name: 'Kelewele', qty: 1, unitPrice: 40 },
        ],
        subtotal: 101, discount: 5, promoCode: 'LOYAL5', deliveryFee: 0, tax: 0, total: 96,
        payment: 'cash_pickup',
        allergyFlags: ['Dairy-free'],
        placedAt: hoursAgo(4),
    },
    {
        id: 'CB112233', status: 'delivered', source: 'facebook', branch: 'Dzorwulu',
        fulfillment: 'delivery',
        customer: { name: 'Fiifi Annan', phone: '0266 778 899' },
        items: [
            { name: 'Shawarma', qty: 1, unitPrice: 35 },
            { name: 'Fried Rice', qty: 1, unitPrice: 29 },
        ],
        subtotal: 64, discount: 0, deliveryFee: 12, tax: 0, total: 76,
        payment: 'momo',
        deliveryAddress: '24 Dzorwulu Road, Accra',
        gpsCoords: 'GA-153-6601',
        placedAt: hoursAgo(5),
    },
];
