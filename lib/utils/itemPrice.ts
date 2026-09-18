/**
 * What a dish costs, said honestly.
 *
 * Nearly every item on this menu is sold in several sizes: "Drumsticks" is four
 * options between ₵65 and ₵255. Printing the first option's price as though it
 * were the price is how a customer arrives expecting ₵65. The cheapest one, with
 * "From" in front of it, is the only figure that cannot be wrong.
 */
export interface ItemPrice {
    amount: number;
    /** There is more than one size, so the figure is a floor rather than the price. */
    from: boolean;
}

export function cheapestPrice(item: {
    price?: number;
    sizes?: { price: number }[];
}): ItemPrice | null {
    const prices = (item.sizes ?? [])
        .map(size => Number(size.price))
        .filter(price => Number.isFinite(price) && price > 0);

    if (prices.length > 0) {
        return { amount: Math.min(...prices), from: prices.length > 1 };
    }

    const flat = Number(item.price);
    return Number.isFinite(flat) && flat > 0 ? { amount: flat, from: false } : null;
}
