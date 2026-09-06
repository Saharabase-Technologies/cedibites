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

/**
 * The photograph a menu row may honestly carry, or nothing.
 *
 * The house rule is that a photograph is never attached to a dish it is not a
 * picture of, and on this menu that rule does most of the work. Only nine
 * photographs exist against 43 dishes, and several of the nine are of
 * combinations rather than of a plain plate, so a loose match does real damage:
 * "Fried Rice + Chicken + Fried Egg" would take a bowl of plain fried rice with
 * neither the chicken nor the egg in the frame, and that is the picture somebody
 * holds up at the counter when the box arrives.
 *
 * So the rules run most specific first, and refuse rather than approximate.
 * Eleven of the 43 rows come back with a photograph. The rest keep the initials
 * tile, which is the honest answer until the shots are taken.
 *
 * What the frames actually hold, since every rule below is checked against it:
 *
 *   drumsticks                drumsticks and three sauces, nothing else
 *   tilapia                   a WHOLE grilled tilapia, lime, banku, three sauces
 *   noodles                   a bowl of noodles with beef, sausage and chicken
 *   friedRice                 a bowl of fried rice and three sauces
 *   assortedFriedRice         a bowl of assorted fried rice
 *   jollofDrumsticks          a box of jollof WITH drumsticks, sausage and beef
 *   friedRiceDrumsticks       a box of fried rice WITH three drumsticks
 *   friedRiceDrumsticksClose  the same, closer, assorted
 *   wraps                     four wraps and three sauces
 */
export function photoForMenuItem(name: string): BranchPhoto | null {
    const n = name.toLowerCase().replace(/\s+/g, ' ').trim();
    const has = (...words: string[]) => words.every(word => n.includes(word));

    if (has('wrap')) return BRANCH_PHOTOS.wraps;

    // Whole tilapia sitting on banku. Not the half, and not the version with an
    // egg the frame does not have.
    if (has('banku', 'tilapia') && !has('half') && !has('egg')) return BRANCH_PHOTOS.tilapia;

    // The drumsticks on their own. "Drumsticks (Special Crunch)".
    if (has('drumsticks (')) return BRANCH_PHOTOS.drumsticks;

    // Rice or noodles carrying drumsticks, which is exactly what those two
    // takeaway-box frames show.
    if (has('drum')) {
        // Nobody has photographed a full chicken. The design system already
        // notes this: one deal card is typographic for the same reason.
        if (has('full chicken')) return null;
        if (has('jollof') && !has('fried rice') && !has('noodles')) return BRANCH_PHOTOS.jollofDrumsticks;
        if (has('assorted')) return BRANCH_PHOTOS.friedRiceDrumsticksClose;
        if (has('fried rice') || has('noodles')) return BRANCH_PHOTOS.friedRiceDrumsticks;
        return null;
    }

    // A plain plate, and only when the name carries nothing the frame lacks.
    // An exact match is the whole point: every Economy Pack and every "+ Fried
    // Egg" falls through to nothing on purpose.
    if (n === 'noodles') return BRANCH_PHOTOS.noodles;
    if (n === 'fried rice') return BRANCH_PHOTOS.friedRice;
    if (n === 'assorted fried rice') return BRANCH_PHOTOS.assortedFriedRice;

    return null;
}
