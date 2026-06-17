import { HouseIcon, HamburgerIcon, PathIcon, type Icon } from '@phosphor-icons/react';

/**
 * Single source of truth for the customer-facing primary navigation.
 * Consumed by both the top Navbar (uses `label`) and the mobile BottomNav
 * (uses `shortLabel`). Keep this in sync — do NOT redefine nav items elsewhere.
 */
export interface CustomerNavItem {
    href: string;
    /** Full label used on the desktop navbar. */
    label: string;
    /** Compact label used on the mobile bottom tab bar. */
    shortLabel: string;
    icon: Icon;
    /** Extra path prefixes that should mark this item active. */
    matchPrefixes?: string[];
}

export const CUSTOMER_NAV: CustomerNavItem[] = [
    { href: '/', label: 'Home', shortLabel: 'Home', icon: HouseIcon },
    { href: '/menu', label: 'Our Menu', shortLabel: 'Menu', icon: HamburgerIcon },
    {
        href: '/orders',
        label: 'Track Order',
        shortLabel: 'Orders',
        icon: PathIcon,
        matchPrefixes: ['/orders/', '/order-history'],
    },
];
