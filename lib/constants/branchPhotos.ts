/**
 * Photographs shot at the branch, on the counter, with the real packaging.
 *
 * The captions describe what is in the frame, not a menu SKU. That distinction
 * matters: a customer who sees a photo captioned with a dish name expects to be
 * able to order exactly that, and none of these have been matched to a menu
 * item id yet. Once they are, the caption should become the item's real name and
 * the card should link to the item rather than to the menu.
 */
export interface BranchPhoto {
    src: string;
    /** Short enough to sit in the headline block. */
    title: string;
    /** What is actually on the plate. */
    line: string;
    /** Alt text, for anyone who cannot see it. */
    alt: string;
    /**
     * Words to look for in a menu item name, most specific first. When one hits,
     * the photo stops being decoration and starts being that dish: the card
     * shows its real name and price and opens its sheet.
     *
     * Deliberately narrow. "rice" alone would put a fried rice photograph on
     * jollof, which is a different dish and a real complaint at the counter.
     */
    match: string[];
}

export const BRANCH_PHOTOS = {
    drumsticks: {
        src: '/brand/chicken-drumsticks.jpg',
        title: 'Chicken drumsticks',
        line: 'Shito, green pepper sauce and spiced mayo on the side',
        alt: 'Four glazed chicken drumsticks on a wooden board beside three dipping sauces',
        match: ['drumstick', 'drums'],
    },
    tilapia: {
        src: '/brand/tilapia-banku.jpg',
        title: 'Tilapia and banku',
        line: 'Grilled whole, with lime and three sauces',
        alt: 'A whole grilled tilapia on a white board with lime slices, banku and three dipping sauces',
        match: ['tilapia'],
    },
    assortedFriedRice: {
        src: '/brand/assorted-fried-rice.jpg',
        title: 'Assorted fried rice',
        line: 'Sausage, beef, chicken and pork',
        alt: 'A bowl of assorted fried rice with sausage, beef, chicken and pork',
        match: ['assorted fried rice', 'assorted rice'],
    },
    friedRice: {
        src: '/brand/fried-rice-sauces.jpg',
        title: 'Fried rice',
        line: 'Three sauces on the side',
        alt: 'A bowl of fried rice beside shito, green pepper sauce and spiced mayo',
        match: ['fried rice'],
    },
    noodles: {
        src: '/brand/noodles.jpg',
        title: 'Noodles',
        line: 'Beef, sausage, chicken and peppers',
        alt: 'A bowl of noodles with beef, sausage, chicken, peppers and carrots',
        match: ['noodle', 'spaghetti'],
    },
    jollofDrumsticks: {
        src: '/brand/jollof-drumsticks.jpg',
        title: 'Jollof and drumsticks',
        line: 'Assorted meats through the rice',
        alt: 'A takeaway box of jollof rice with chicken drumsticks, sausage and beef',
        match: ['jollof + 3 drum', 'jollof and drum', 'jollof'],
    },
    friedRiceDrumsticks: {
        src: '/brand/fried-rice-drumsticks.jpg',
        title: 'Fried rice and drumsticks',
        line: 'Sausage, beef and pork through the rice',
        alt: 'A takeaway box of assorted fried rice with three chicken drumsticks',
        match: ['fried rice + 7', 'fried rice and drum'],
    },
    friedRiceDrumsticksClose: {
        src: '/brand/fried-rice-drumsticks-close.jpg',
        title: 'Fried rice and drumsticks',
        line: 'Sausage, beef and pork through the rice',
        alt: 'A close view of a takeaway box of assorted fried rice with chicken drumsticks',
        match: ['fried rice and drum'],
    },
    wraps: {
        src: '/brand/wraps.jpg',
        title: 'Wraps',
        line: 'Grilled, with three sauces on the side',
        alt: 'Four grilled wraps on a wooden board with spiced mayo, green pepper sauce and shito',
        match: ['wrap'],
    },
} satisfies Record<string, BranchPhoto>;

/** The first menu item this photograph is honestly a picture of, if there is one. */
export function matchMenuItem<T extends { name: string }>(
    photo: BranchPhoto,
    items: T[],
): T | null {
    for (const word of photo.match) {
        const hit = items.find(i => i.name.toLowerCase().includes(word));
        if (hit) return hit;
    }
    return null;
}
