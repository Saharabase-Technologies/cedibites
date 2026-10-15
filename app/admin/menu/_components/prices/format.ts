import { formatGHS } from '@/lib/utils/currency';
import { receiptName } from '@/lib/utils/receiptName.mjs';
import type { BoardDish, BoardOption, PriceBoard, PublicationChange } from '@/lib/api/services/menuPrices.service';

const TZ = 'Africa/Accra';

/** "Monday 20 October at 06:00", in Ghana time whatever this machine thinks. */
export function formatWhen(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    const day = d.toLocaleDateString('en-GB', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });
    const time = d.toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
    return `${day} at ${time}`;
}

/** "2026-10-20" and "06:00" for a date and time input, in Ghana time. */
export function ghanaDateAndTime(d: Date): { date: string; time: string } {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-GB', {
            timeZone: TZ,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
        })
            .formatToParts(d)
            .map(p => [p.type, p.value]),
    );
    return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

/** The option's name on its own, by the receipt name rule. */
export function optionName(dish: BoardDish, option: BoardOption): string {
    return receiptName(dish.name, option.display_name || option.option_label);
}

export interface ReviewLine {
    key: string;
    what: string;
    line: string;
    from: string;
    to: string;
}

export interface ReviewGroup {
    dishId: number;
    dish: string;
    lines: ReviewLine[];
}

/** Every waiting change, grouped by dish, in menu order. */
export function waitingChanges(board: PriceBoard): ReviewGroup[] {
    const groups: ReviewGroup[] = [];

    for (const dish of board.dishes) {
        const lines: ReviewLine[] = [];

        if (dish.drafts.name) {
            lines.push({ key: `n${dish.id}`, what: 'Dish name', line: dish.name, from: dish.name, to: dish.drafts.name.value });
        }

        if (dish.drafts.off_sale) {
            lines.push({ key: `s${dish.id}`, what: 'On sale', line: dish.name, from: 'On sale', to: 'Off sale' });
        }

        for (const option of dish.options) {
            const name = optionName(dish, option);
            const d = option.drafts;
            if (d.price) {
                lines.push({ key: `p${option.id}`, what: 'Price', line: name, from: formatGHS(option.price), to: formatGHS(d.price.value) });
            }
            if (d.option_label) {
                lines.push({ key: `l${option.id}`, what: 'Option', line: name, from: option.option_label, to: d.option_label.value });
            }
            if (d.display_name) {
                lines.push({ key: `r${option.id}`, what: 'Receipt name', line: name, from: option.display_name ?? 'None', to: d.display_name.value });
            }
        }

        for (const added of dish.new_options) {
            lines.push({
                key: `a${added.draft_id}`,
                what: 'New option',
                line: added.display_name,
                from: 'Not sold yet',
                to: `${added.option_label}, ${formatGHS(added.price)}`,
            });
        }

        if (lines.length > 0) {
            groups.push({ dishId: dish.id, dish: dish.drafts.name?.value ?? dish.name, lines });
        }
    }

    return groups;
}

/** One logged change, said plainly. */
export function describeChange(change: PublicationChange): { what: string; from: string; to: string } {
    const text = (v: unknown) => (v === null || v === undefined || v === '' ? 'None' : String(v));

    switch (change.field) {
        case 'price':
            return { what: 'Price', from: formatGHS(change.old_value as number), to: formatGHS(change.new_value as number) };
        case 'option_label':
            return { what: 'Option', from: text(change.old_value), to: text(change.new_value) };
        case 'display_name':
            return { what: 'Receipt name', from: text(change.old_value), to: text(change.new_value) };
        case 'name':
            return { what: 'Dish name', from: text(change.old_value), to: text(change.new_value) };
        case 'is_available':
            return { what: 'On sale', from: change.old_value ? 'On sale' : 'Off sale', to: change.new_value ? 'On sale' : 'Off sale' };
        case 'created': {
            const v = (change.new_value ?? {}) as { option_label?: string; price?: number };
            return { what: 'New option', from: 'Not sold yet', to: `${v.option_label ?? ''}, ${formatGHS(v.price ?? 0)}` };
        }
        default:
            return { what: change.field, from: text(change.old_value), to: text(change.new_value) };
    }
}
