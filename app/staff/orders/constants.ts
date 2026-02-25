import {
    PhoneIcon,
    WhatsappLogoIcon,
    InstagramLogoIcon,
    FacebookLogoIcon,
    GlobeIcon,
    DeviceMobileIcon,
} from '@phosphor-icons/react';
import type { KanbanColumn, OrderSource, PaymentMethod, StaffOrder } from './types';

// ─── Status config ────────────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<string, { label: string; dot: string; color: string; pulse?: boolean }> = {
    received:         { label: 'Received',        dot: 'bg-neutral-gray', color: 'border-neutral-gray/40'              },
    preparing:        { label: 'Preparing',        dot: 'bg-primary',     color: 'border-primary/40',    pulse: true   },
    ready:            { label: 'Ready',            dot: 'bg-warning',     color: 'border-warning/40'                   },
    out_for_delivery: { label: 'Out for Delivery', dot: 'bg-teal-600',    color: 'border-teal-600/40',   pulse: true   },
    ready_for_pickup: { label: 'Ready for Pickup', dot: 'bg-teal-600',    color: 'border-teal-600/40'                  },
    delivered:        { label: 'Delivered',        dot: 'bg-secondary',   color: 'border-secondary/40'                 },
    completed:        { label: 'Completed',        dot: 'bg-secondary',   color: 'border-secondary/40'                 },
    cancelled:        { label: 'Cancelled',        dot: 'bg-error',       color: 'border-error/40'                     },
};

// ─── Kanban columns ───────────────────────────────────────────────────────────

export const COLUMNS: KanbanColumn[] = [
    {
        id: 'received',
        label: 'Received',
        statuses: ['received'],
        dot: 'bg-neutral-gray',
        nextStatus: 'preparing',
        nextLabel: 'Start Preparing',
        color: 'border-neutral-gray/40',
    },
    {
        id: 'preparing',
        label: 'Preparing',
        statuses: ['preparing'],
        dot: 'bg-primary',
        nextStatus: 'ready',
        nextLabel: 'Mark Ready',
        color: 'border-primary/40',
    },
    {
        id: 'ready',
        label: 'Ready',
        statuses: ['ready'],
        dot: 'bg-warning',
        nextStatus: null,
        nextLabel: null,
        color: 'border-warning/40',
    },
    {
        id: 'en_route',
        label: 'En Route',
        statuses: ['out_for_delivery', 'ready_for_pickup'],
        dot: 'bg-info',
        nextStatus: null,
        nextLabel: null,
        color: 'border-info/40',
    },
    {
        id: 'done',
        label: 'Done',
        statuses: ['delivered', 'completed'],
        dot: 'bg-secondary',
        nextStatus: null,
        nextLabel: null,
        color: 'border-secondary/40',
    },
];

// ─── Payment labels ───────────────────────────────────────────────────────────

export const PAY_LABEL: Record<PaymentMethod, string> = {
    momo: 'MoMo',
    cash_delivery: 'Cash (Delivery)',
    cash_pickup: 'Cash (Pickup)',
};

// ─── Source icons ─────────────────────────────────────────────────────────────

export const SOURCE_ICON: Record<OrderSource, React.ElementType> = {
    online: GlobeIcon,
    phone: PhoneIcon,
    whatsapp: WhatsappLogoIcon,
    instagram: InstagramLogoIcon,
    facebook: FacebookLogoIcon,
    pos: DeviceMobileIcon,
};

// ─── Source labels ────────────────────────────────────────────────────────────

export const SOURCE_LABEL: Record<OrderSource, string> = {
    online: 'Online',
    phone: 'Phone',
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    facebook: 'Facebook',
    pos: 'POS',
};

// ─── Mock data — replace with real API ───────────────────────────────────────

function minsAgo(m: number) { return new Date(Date.now() - m * 60000); }

// ─── Branch coordinates (Accra, Ghana) ───────────────────────────────────────

export const BRANCH_COORDS: Record<string, { latitude: number; longitude: number }> = {
    'East Legon': { latitude: 5.6465, longitude: -0.1549 },
    'Osu':        { latitude: 5.5557, longitude: -0.1769 },
    'Tema':       { latitude: 5.6636, longitude: -0.0166 },
    'Madina':     { latitude: 5.6681, longitude: -0.1769 },
    'La Paz':     { latitude: 5.6150, longitude: -0.2350 },
    'Dzorwulu':   { latitude: 5.6050, longitude: -0.1920 },
};

export const MOCK_ORDERS: StaffOrder[] = [
    {
        id: 'CB847291', status: 'received', source: 'whatsapp', type: 'delivery',
        branch: 'East Legon', customer: { name: 'Ama Serwaa', phone: '0244123456' },
        items: [{ name: 'Jollof Rice', qty: 2, unitPrice: 35 }, { name: 'Malt', qty: 2, unitPrice: 12 }],
        total: 94, payment: 'momo', notes: 'Extra spicy please', placedAt: minsAgo(8),
        address: 'Trassacco Valley, East Legon',
        coords: { branch: BRANCH_COORDS['East Legon'], customer: { latitude: 5.6320, longitude: -0.1480 } },
    },
    {
        id: 'CB391045', status: 'received', source: 'phone', type: 'pickup',
        branch: 'Osu', customer: { name: 'Kweku Asante', phone: '0201987654' },
        items: [{ name: 'Waakye', qty: 1, unitPrice: 30 }, { name: 'Kelewele', qty: 1, unitPrice: 20 }],
        total: 50, payment: 'cash_pickup', placedAt: minsAgo(22),
    },
    {
        id: 'CB204837', status: 'preparing', source: 'instagram', type: 'delivery',
        branch: 'Tema', customer: { name: 'Abena Boateng', phone: '0551234567' },
        items: [{ name: 'Banku & Tilapia', qty: 1, unitPrice: 55 }],
        total: 73, payment: 'momo', placedAt: minsAgo(34),
        address: 'Community 5, Tema',
        coords: { branch: BRANCH_COORDS['Tema'], customer: { latitude: 5.6525, longitude: -0.0080 } },
    },
    {
        id: 'CB173920', status: 'preparing', source: 'facebook', type: 'delivery',
        branch: 'Madina', customer: { name: 'Yaw Darko', phone: '0277654321' },
        items: [{ name: 'Fufu & Light Soup', qty: 2, unitPrice: 45 }, { name: 'Sobolo', qty: 2, unitPrice: 10 }],
        total: 110, payment: 'cash_delivery', placedAt: minsAgo(19),
        address: 'Madina Market, near Mosque',
        coords: { branch: BRANCH_COORDS['Madina'], customer: { latitude: 5.6750, longitude: -0.1650 } },
    },
    {
        id: 'CB998812', status: 'ready', source: 'phone', type: 'delivery',
        branch: 'East Legon', customer: { name: 'Efua Mensah', phone: '0244567890' },
        items: [{ name: 'Fried Rice', qty: 1, unitPrice: 35 }, { name: 'Coke', qty: 1, unitPrice: 12 }],
        total: 59, payment: 'momo', placedAt: minsAgo(45),
        address: 'Airport Residential',
        coords: { branch: BRANCH_COORDS['East Legon'], customer: { latitude: 5.6085, longitude: -0.1780 } },
    },
    {
        // Already out for delivery — rider starts part-way between Osu and Cantonments
        id: 'CB774433', status: 'out_for_delivery', source: 'whatsapp', type: 'delivery',
        branch: 'Osu', customer: { name: 'Kojo Appiah', phone: '0200112233' },
        items: [{ name: 'Jollof Rice', qty: 3, unitPrice: 35 }],
        total: 117, payment: 'momo', placedAt: minsAgo(62),
        address: 'Cantonments, Accra',
        coords: {
            branch:   BRANCH_COORDS['Osu'],
            customer: { latitude: 5.5745, longitude: -0.1690 },
            rider:    { latitude: 5.5651, longitude: -0.1730 }, // ~halfway
        },
    },
    {
        id: 'CB556677', status: 'ready_for_pickup', source: 'phone', type: 'pickup',
        branch: 'La Paz', customer: { name: 'Adwoa Ofori', phone: '0245678901' },
        items: [{ name: 'Combo Special', qty: 2, unitPrice: 48 }],
        total: 96, payment: 'cash_pickup', placedAt: minsAgo(38),
    },
    {
        id: 'CB112233', status: 'delivered', source: 'online', type: 'delivery',
        branch: 'Dzorwulu', customer: { name: 'Fiifi Annan', phone: '0266778899' },
        items: [{ name: 'Waakye', qty: 2, unitPrice: 30 }],
        total: 76, payment: 'momo', placedAt: minsAgo(95),
        address: 'Dzorwulu Junction, near Shell',
        coords: { branch: BRANCH_COORDS['Dzorwulu'], customer: { latitude: 5.6030, longitude: -0.2050 } },
    },
];
