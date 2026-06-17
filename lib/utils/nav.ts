import type { CustomerNavItem } from '../constants/nav';

/**
 * Shared active-route test for customer nav items. An item is active when the
 * pathname matches its href exactly, or starts with one of its matchPrefixes.
 */
export function isNavActive(
    pathname: string,
    item: Pick<CustomerNavItem, 'href' | 'matchPrefixes'>,
): boolean {
    if (pathname === item.href) return true;
    return item.matchPrefixes?.some((p) => pathname === p || pathname.startsWith(p)) === true;
}
