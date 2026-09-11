import {
    HouseIcon,
    ForkKnifeIcon,
    ReceiptIcon,
    MagnifyingGlassIcon,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

/**
 * One source for the customer tabs. The bottom bar and the desktop header both
 * read this, so a label can never say "Track Order" in one place and "My
 * Orders" in another, pointing at two different routes. That is exactly what
 * the old header and hamburger drawer did.
 */
export interface CustomerNavItem {
    /** Tab label. Kept short: it sits under a 22px icon in an 11px type size. */
    label: string;
    /** Header label, where there is room for the longer form. */
    longLabel: string;
    icon: Icon;
    /** A destination. Absent on a tab that opens something over the current screen. */
    href?: string;
    /** Opens a sheet instead of navigating. Such a tab is never the active one. */
    action?: 'search';
    /** Extra routes that should light this tab up. */
    matchPrefixes?: string[];
}

export const CUSTOMER_NAV: CustomerNavItem[] = [
    {
        label: 'Home',
        longLabel: 'Home',
        href: '/',
        icon: HouseIcon,
    },
    {
        label: 'Menu',
        longLabel: 'Our Menu',
        href: '/menu',
        icon: ForkKnifeIcon,
        matchPrefixes: ['/menu/'],
    },
    {
        label: 'Orders',
        longLabel: 'My Orders',
        href: '/orders',
        icon: ReceiptIcon,
        matchPrefixes: ['/orders/', '/track'],
    },
    {
        // Search is an action, not a place. It opens over whatever you were
        // looking at and hands the screen back when you close it, which is why
        // it never lights up as the current tab.
        label: 'Search',
        longLabel: 'Search',
        icon: MagnifyingGlassIcon,
        action: 'search',
    },
];

/**
 * Home is an exact match on purpose. Every path starts with "/", so a prefix
 * test would leave the Home tab lit on every screen in the app.
 */
export function isNavActive(pathname: string, item: CustomerNavItem): boolean {
    if (!item.href) return false;
    if (pathname === item.href) return true;
    return item.matchPrefixes?.some(p => pathname === p || pathname.startsWith(p)) ?? false;
}

/**
 * Routes that own the whole screen. Checkout is a paid flow with its own header
 * and its own way back, and a tab bar sitting under a payment button is an
 * invitation to leave halfway through.
 */
export const FULL_SCREEN_ROUTES = ['/checkout'];

export function isFullScreenRoute(pathname: string): boolean {
    return FULL_SCREEN_ROUTES.some(p => pathname === p || pathname.startsWith(p + '/'));
}

/**
 * Hubs whose screens own the whole screen below the desktop breakpoint.
 *
 * On a phone or a tablet, changing your details or an address is a task with
 * its own back arrow and its own button at the foot. The site header above it
 * is a second way out, and the floating tab bar sat over the address form's
 * second field. From lg up the same routes keep the site header and sit beside
 * the account's own column. The hub itself is not included, only its screens.
 */
export const SUBSCREEN_HUBS = ['/account'];

export function isSubscreenRoute(pathname: string): boolean {
    return SUBSCREEN_HUBS.some(p => pathname.startsWith(p + '/'));
}
