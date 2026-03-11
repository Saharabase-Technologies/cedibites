// ─── CediBites Unified Order Display Constants ──────────────────────────────
// Single source of truth for status colors, source labels, payment labels, etc.
// Used by: Staff Kanban, POS, Kitchen, Admin, Customer

import {
    PhoneIcon,
    WhatsappLogoIcon,
    InstagramLogoIcon,
    FacebookLogoIcon,
    GlobeIcon,
    DeviceMobileIcon,
} from '@phosphor-icons/react';
import type { OrderStatus, OrderSource, PaymentMethod, FulfillmentType, KanbanColumn } from '@/types/order';

// ─── Status display config ──────────────────────────────────────────────────

export interface StatusDisplayConfig {
    label: string;
    dot: string;            // Tailwind bg class for dot
    color: string;          // Tailwind border/accent class
    bg: string;             // Tailwind bg class for badge
    textColor: string;      // hex color for inline styles
    pulse?: boolean;
}

export const STATUS_CONFIG: Record<OrderStatus, StatusDisplayConfig> = {
    received:          { label: 'Received',          dot: 'bg-neutral-gray',  color: 'border-neutral-gray/40',  bg: 'bg-info/8',       textColor: '#1976d2' },
    accepted:          { label: 'Accepted',          dot: 'bg-teal-600',      color: 'border-teal-600/40',      bg: 'bg-teal-600/8',   textColor: '#0d9488' },
    preparing:         { label: 'Preparing',         dot: 'bg-primary',       color: 'border-primary/40',       bg: 'bg-warning/8',    textColor: '#f9a61a', pulse: true },
    ready:             { label: 'Ready',             dot: 'bg-secondary',     color: 'border-secondary/40',     bg: 'bg-primary/8',    textColor: '#e49925' },
    out_for_delivery:  { label: 'Out for Delivery',  dot: 'bg-teal-600',      color: 'border-teal-600/40',      bg: 'bg-primary/8',    textColor: '#e49925', pulse: true },
    ready_for_pickup:  { label: 'Ready for Pickup',  dot: 'bg-teal-600',      color: 'border-teal-600/40',      bg: 'bg-primary/8',    textColor: '#e49925' },
    delivered:         { label: 'Delivered',          dot: 'bg-secondary',     color: 'border-secondary/40',     bg: 'bg-secondary/8',  textColor: '#6c833f' },
    completed:         { label: 'Completed',         dot: 'bg-secondary',     color: 'border-secondary/40',     bg: 'bg-secondary/8',  textColor: '#6c833f' },
    cancelled:         { label: 'Cancelled',         dot: 'bg-error',         color: 'border-error/40',         bg: 'bg-error/8',      textColor: '#d32f2f' },
};

// ─── Kitchen-specific status labels (overlay) ───────────────────────────────
// Kitchen uses different labels for some statuses

export const KITCHEN_STATUS_LABELS: Partial<Record<OrderStatus, string>> = {
    received: 'New',
    preparing: 'Cooking',
};

// ─── Source display config ──────────────────────────────────────────────────

export interface SourceDisplayConfig {
    label: string;
    icon: React.ElementType;
}

export const SOURCE_CONFIG: Record<OrderSource, SourceDisplayConfig> = {
    online:    { label: 'Online',    icon: GlobeIcon },
    phone:     { label: 'Phone',     icon: PhoneIcon },
    whatsapp:  { label: 'WhatsApp',  icon: WhatsappLogoIcon },
    instagram: { label: 'Instagram', icon: InstagramLogoIcon },
    facebook:  { label: 'Facebook',  icon: FacebookLogoIcon },
    pos:       { label: 'Walk-in',   icon: DeviceMobileIcon },
};

// Convenience re-exports for backward compat
export const SOURCE_ICON: Record<OrderSource, React.ElementType> = Object.fromEntries(
    Object.entries(SOURCE_CONFIG).map(([k, v]) => [k, v.icon])
) as Record<OrderSource, React.ElementType>;

export const SOURCE_LABEL: Record<OrderSource, string> = Object.fromEntries(
    Object.entries(SOURCE_CONFIG).map(([k, v]) => [k, v.label])
) as Record<OrderSource, string>;

// ─── Payment labels ─────────────────────────────────────────────────────────

export const PAYMENT_LABELS: Record<PaymentMethod, { short: string; full: string }> = {
    momo: { short: 'MoMo', full: 'Mobile Money (MoMo)' },
    cash: { short: 'Cash', full: 'Cash Payment' },
    card: { short: 'Card', full: 'Card Payment' },
};

// ─── Fulfillment labels ─────────────────────────────────────────────────────

export const FULFILLMENT_LABELS: Record<FulfillmentType, string> = {
    delivery: 'Delivery',
    pickup:   'Pickup',
    dine_in:  'Dine In',
    takeaway: 'Takeaway',
};

// ─── Kanban columns (staff order management) ────────────────────────────────

export const KANBAN_COLUMNS: KanbanColumn[] = [
    {
        id: 'received',
        label: 'Received',
        statuses: ['received', 'accepted'],
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

// ─── Branch coordinates lookup (for staff orders) ───────────────────────────

export const BRANCH_COORDS: Record<string, { latitude: number; longitude: number }> = {
    'Osu':        { latitude: 5.5557, longitude: -0.1769 },
    'East Legon': { latitude: 5.6465, longitude: -0.1549 },
    'Spintex':    { latitude: 5.6372, longitude: -0.0924 },
    'Tema':       { latitude: 5.6698, longitude: -0.0166 },
    'Madina':     { latitude: 5.6805, longitude: -0.1665 },
    'La Paz':     { latitude: 5.6095, longitude: -0.2508 },
    'Dzorwulu':   { latitude: 5.6141, longitude: -0.1956 },
};
