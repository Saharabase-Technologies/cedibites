import {
    PhoneIcon,
    WhatsappLogoIcon,
    ShareNetworkIcon,
} from '@phosphor-icons/react';
import type { MenuItem } from '@/lib/data/SampleMenu';
import type { OrderSource } from '@/types/order';
export { formatGHS} from '@/lib/utils/currency';

// ─── Order sources ────────────────────────────────────────────────────────────

export const ORDER_SOURCES: { id: OrderSource; label: string; icon: React.ElementType }[] = [
    { id: 'phone',        label: 'Phone',        icon: PhoneIcon },
    { id: 'whatsapp',     label: 'WhatsApp',     icon: WhatsappLogoIcon },
    { id: 'social_media', label: 'Social Media', icon: ShareNetworkIcon },
];

// ─── Formatters ───────────────────────────────────────────────────────────────

export function formatPhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('233')) return '+' + digits;
    if (digits.startsWith('0') && digits.length <= 10) {
        const d = digits.slice(1);
        if (d.length <= 2) return '0' + d;
        if (d.length <= 5) return '0' + d.slice(0, 2) + ' ' + d.slice(2);
        return '0' + d.slice(0, 2) + ' ' + d.slice(2, 5) + ' ' + d.slice(5);
    }
    return raw;
}

// Re-export the canonical generator so wizard uses the same format
export { generateOrderId as generateOrderCode } from '@/types/order';

// Returns the lowest applicable price for any menu item (flat, sized, or variant)
export function getBasePrice(item: MenuItem): number {
    if (item.price !== undefined) return item.price;
    if (item.variants) return Math.min(item.variants.plain ?? Infinity, item.variants.assorted ?? Infinity);
    if (item.sizes) return Math.min(...item.sizes.map(s => s.price));
    return 0;
}
