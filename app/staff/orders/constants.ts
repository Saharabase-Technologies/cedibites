import {
    PhoneIcon,
    WhatsappLogoIcon,
    InstagramLogoIcon,
    FacebookLogoIcon,
    GlobeIcon,
    DeviceMobileIcon,
} from '@phosphor-icons/react';
import type { KanbanColumn, OrderSource, PaymentMethod, StaffOrder } from './types';

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

export const MOCK_ORDERS: StaffOrder[] = [
    {
        id: 'CB847291', status: 'received', source: 'whatsapp', type: 'delivery',
        branch: 'East Legon', customer: { name: 'Ama Serwaa', phone: '0244123456' },
        items: [{ name: 'Jollof Rice', quantity: 2, price: 35 }, { name: 'Malt', quantity: 2, price: 12 }],
        total: 94, payment: 'momo', notes: 'Extra spicy please', placedAt: minsAgo(8),
        address: 'Trassacco Valley, East Legon',
    },
    {
        id: 'CB391045', status: 'received', source: 'phone', type: 'pickup',
        branch: 'Osu', customer: { name: 'Kweku Asante', phone: '0201987654' },
        items: [{ name: 'Waakye', quantity: 1, price: 30 }, { name: 'Kelewele', quantity: 1, price: 20 }],
        total: 50, payment: 'cash_pickup', placedAt: minsAgo(22),
    },
    {
        id: 'CB204837', status: 'preparing', source: 'instagram', type: 'delivery',
        branch: 'Tema', customer: { name: 'Abena Boateng', phone: '0551234567' },
        items: [{ name: 'Banku & Tilapia', quantity: 1, price: 55 }],
        total: 73, payment: 'momo', placedAt: minsAgo(34),
        address: 'Community 5, Tema',
    },
    {
        id: 'CB173920', status: 'preparing', source: 'facebook', type: 'delivery',
        branch: 'Madina', customer: { name: 'Yaw Darko', phone: '0277654321' },
        items: [{ name: 'Fufu & Light Soup', quantity: 2, price: 45 }, { name: 'Sobolo', quantity: 2, price: 10 }],
        total: 110, payment: 'cash_delivery', placedAt: minsAgo(19),
        address: 'Madina Market, near Mosque',
    },
    {
        id: 'CB998812', status: 'ready', source: 'phone', type: 'delivery',
        branch: 'East Legon', customer: { name: 'Efua Mensah', phone: '0244567890' },
        items: [{ name: 'Fried Rice', quantity: 1, price: 35 }, { name: 'Coke', quantity: 1, price: 12 }],
        total: 59, payment: 'momo', placedAt: minsAgo(45),
        address: 'Airport Residential',
    },
    {
        id: 'CB774433', status: 'out_for_delivery', source: 'whatsapp', type: 'delivery',
        branch: 'Osu', customer: { name: 'Kojo Appiah', phone: '0200112233' },
        items: [{ name: 'Jollof Rice', quantity: 3, price: 35 }],
        total: 117, payment: 'momo', placedAt: minsAgo(62),
        address: 'Cantonments, Accra',
    },
    {
        id: 'CB556677', status: 'ready_for_pickup', source: 'phone', type: 'pickup',
        branch: 'La Paz', customer: { name: 'Adwoa Ofori', phone: '0245678901' },
        items: [{ name: 'Combo Special', quantity: 2, price: 48 }],
        total: 96, payment: 'cash_pickup', placedAt: minsAgo(38),
    },
    {
        id: 'CB112233', status: 'delivered', source: 'online', type: 'delivery',
        branch: 'Dzorwulu', customer: { name: 'Fiifi Annan', phone: '0266778899' },
        items: [{ name: 'Waakye', quantity: 2, price: 30 }],
        total: 76, payment: 'momo', placedAt: minsAgo(95),
        address: 'Dzorwulu Junction, near Shell',
    },
];
