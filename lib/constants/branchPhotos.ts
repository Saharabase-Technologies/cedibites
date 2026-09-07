/**
 * Photographs of the food, shot for CediBites.
 *
 * Every caption below describes what is actually in the frame rather than a
 * menu SKU, because the rule that governs all of this is that a photograph is
 * never attached to a dish it is not a picture of. A customer who sees a
 * photograph expects to be handed that plate, and the counter is where a wrong
 * one gets argued about.
 *
 * Twenty new frames landed 2026-09-07 and replaced most of the originals. The
 * three surviving originals are the ones nothing new covers: rice in a box with
 * drumsticks on it, which is what the combos actually are.
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
     * Words to look for in a menu item name, most specific first. Used by the
     * home page to turn a photograph into a link to the dish it shows.
     */
    match: string[];
}

export const BRANCH_PHOTOS = {
    // ── Plain plates ────────────────────────────────────────────────────────
    jollofPlain: {
        src: '/brand/jollof-plain.jpg',
        title: 'Jollof rice',
        line: 'Smoky, in the bowl',
        alt: 'A white bowl of jollof rice scattered with spring onion, on a yellow ground',
        match: ['jollof rice', 'jollof'],
    },
    friedRice: {
        src: '/brand/fried-rice-plain.jpg',
        title: 'Fried rice',
        line: 'Mixed vegetable',
        alt: 'A white bowl of vegetable fried rice with carrot, onion and spring onion, on a yellow ground',
        match: ['fried rice'],
    },
    friedRiceClose: {
        src: '/brand/fried-rice-plain-close.jpg',
        title: 'Fried rice',
        line: 'Mixed vegetable',
        alt: 'A close view of vegetable fried rice in a white bowl on a yellow ground',
        match: ['fried rice'],
    },
    friedRiceSauces: {
        src: '/brand/fried-rice-three-sauces.jpg',
        title: 'Fried rice',
        line: 'Three sauces on the side',
        alt: 'A plate of fried rice beside shito, green pepper sauce and spiced mayo on a wooden board',
        match: ['fried rice'],
    },
    noodles: {
        src: '/brand/noodles-plain.jpg',
        title: 'Noodles',
        line: 'Peppers and carrots through them',
        alt: 'A white bowl of noodles with green pepper and carrot, on a yellow ground',
        match: ['noodle'],
    },
    noodlesBowl: {
        src: '/brand/noodles-plain-bowl.jpg',
        title: 'Noodles',
        line: 'Peppers and carrots through them',
        alt: 'A bowl of noodles with sliced green pepper and carrot, seen from above on yellow',
        match: ['noodle'],
    },
    noodlesBox: {
        src: '/brand/noodles-plain-box.jpg',
        title: 'Noodles',
        line: 'In the takeaway box',
        alt: 'Noodles with peppers and carrots filling a white takeaway box',
        match: ['noodle'],
    },

    // ── Assorted, which on this menu means sausage, beef and chicken ────────
    assortedFriedRice: {
        src: '/brand/assorted-fried-rice-bowl.jpg',
        title: 'Assorted fried rice',
        line: 'Sausage, beef and chicken through the rice',
        alt: 'A white bowl of assorted fried rice with sausage and beef, on a wooden table beside a branded box',
        match: ['assorted fried rice', 'assorted rice'],
    },
    assortedFriedRiceTable: {
        src: '/brand/assorted-fried-rice-table.jpg',
        title: 'Assorted fried rice',
        line: 'With shito, green pepper sauce and spiced mayo',
        alt: 'A bowl of assorted fried rice on a wooden table with three sauces in a white dish',
        match: ['assorted fried rice'],
    },
    assortedFriedRiceTall: {
        src: '/brand/assorted-fried-rice-tall.jpg',
        title: 'Assorted fried rice',
        line: 'On the table, with the sauces',
        alt: 'A bowl of assorted fried rice on a light wooden table beside three dipping sauces',
        match: ['assorted fried rice'],
    },
    assortedNoodles: {
        src: '/brand/assorted-noodles-bowl.jpg',
        title: 'Assorted noodles',
        line: 'Sausage, beef and chicken through them',
        alt: 'A white bowl of noodles with sausage, beef and vegetables, beside a branded box',
        match: ['assorted noodles'],
    },
    assortedNoodlesBox: {
        src: '/brand/assorted-noodles-box.jpg',
        title: 'Assorted noodles',
        line: 'In the takeaway box',
        alt: 'A takeaway box of noodles with sausage, beef, chicken, carrot and green pepper',
        match: ['assorted noodles'],
    },
    assortedNoodlesBoxClose: {
        src: '/brand/assorted-noodles-box-close.jpg',
        title: 'Assorted noodles',
        line: 'In the takeaway box',
        alt: 'A close view of a takeaway box of assorted noodles with beef and sausage',
        match: ['assorted noodles'],
    },
    assortedSpread: {
        src: '/brand/assorted-spread.jpg',
        title: 'Assorted rice and noodles',
        line: 'Both, with the three sauces',
        alt: 'A bowl of assorted fried rice and a bowl of assorted noodles beside three sauces',
        match: ['package'],
    },
    assortedSpreadClose: {
        src: '/brand/assorted-spread-close.jpg',
        title: 'Assorted rice and noodles',
        line: 'Both, with the three sauces',
        alt: 'A close view of assorted fried rice and assorted noodles with three dipping sauces',
        match: ['package'],
    },

    // ── Chicken, fish and wraps ─────────────────────────────────────────────
    drumsticks: {
        src: '/brand/drumsticks-three-sauces.jpg',
        title: 'Chicken drumsticks',
        line: 'Shito, green pepper sauce and spiced mayo on the side',
        alt: 'Four glazed chicken drumsticks on a wooden board beside three dipping sauces',
        match: ['drumstick', 'drums'],
    },
    drumsticksClose: {
        src: '/brand/drumsticks-close.jpg',
        title: 'Chicken drumsticks',
        line: 'Straight off the grill',
        alt: 'A close view of glazed chicken drumsticks on a board with three sauces',
        match: ['drumstick', 'drums'],
    },
    tilapia: {
        src: '/brand/tilapia-banku-plate.jpg',
        title: 'Tilapia and banku',
        line: 'Grilled whole, with lime and three sauces',
        alt: 'A whole grilled tilapia with lime slices on a white plate, two balls of banku beside it',
        match: ['tilapia'],
    },
    wraps: {
        src: '/brand/wraps-board.jpg',
        title: 'Cedi wraps',
        line: 'Grilled, with three sauces on the side',
        alt: 'Grilled wraps cut open on a wooden board with three dipping sauces, on a red ground',
        match: ['wrap'],
    },

    // ── Rice with drumsticks, which is what a combo actually is ─────────────
    jollofDrumsticks: {
        src: '/brand/jollof-drumsticks.jpg',
        title: 'Jollof and drumsticks',
        line: 'Assorted meats through the rice',
        alt: 'A takeaway box of jollof rice with chicken drumsticks, sausage and beef',
        match: ['jollof + 3 drum', 'jollof and drum'],
    },
    friedRiceDrumsticks: {
        src: '/brand/fried-rice-drumsticks.jpg',
        title: 'Fried rice and drumsticks',
        line: 'Sausage, beef and pork through the rice',
        alt: 'A takeaway box of fried rice with three chicken drumsticks',
        match: ['fried rice + 7', 'fried rice and drum'],
    },
    friedRiceDrumsticksClose: {
        src: '/brand/fried-rice-drumsticks-close.jpg',
        title: 'Fried rice and drumsticks',
        line: 'Sausage, beef and pork through the rice',
        alt: 'A close view of a takeaway box of assorted fried rice with chicken drumsticks',
        match: ['assorted fried rice and drum'],
    },

    // ── Not on the menu ─────────────────────────────────────────────────────
    /**
     * Shot in the same session, and there is no pizza on the menu. Kept because
     * it exists and somebody clearly meant to sell it; `photoForMenuItem` will
     * find it the day a pizza is added and not before.
     */
    pizza: {
        src: '/brand/pizza.jpg',
        title: 'Pizza',
        line: 'Not on the menu yet',
        alt: 'A whole pizza on a wooden board with a cutter beside it, on a red ground',
        match: ['pizza'],
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
 * The photograph a menu row carries, or nothing.
 *
 * Ordered most specific first, and every rule has to survive being read out
 * loud: "this is a picture of that dish". The order matters more than the
 * tests do, because almost every combo name contains the name of a plain dish.
 * "Assorted Fried Rice / Jollof Rice / Noodles + 7 Drums" holds "fried rice",
 * "jollof" and "noodles" inside it, and a bowl of plain rice is not a picture
 * of a box of rice with seven drumsticks on it.
 *
 * Where two frames show the same dish, different items get different frames, so
 * a section does not print the same photograph six times.
 *
 * What it deliberately refuses, because nothing in the set is a picture of it:
 * every drink, the whole rotisserie chicken, extra plantain, extra egg and
 * extra seafood. Those need photographing; guessing at them is how a customer
 * ends up holding a phone at the counter.
 */
export function photoForMenuItem(name: string): BranchPhoto | null {
    const n = name.toLowerCase().replace(/\s+/g, ' ').trim();
    const has = (...words: string[]) => words.every(word => n.includes(word));

    // ── Never ───────────────────────────────────────────────────────────────
    if (has('test menu item') || has('test /') || n === 'test menu item') return null;

    // A side is not the plate it usually arrives on. Extra Banku is ₵10 and the
    // tilapia frame is a ₵140 plate of fish; extra plantain, extra egg and
    // extra seafood have no frame at all. These want their own photographs.
    if (n.startsWith('extra ')) return null;

    // ── Unmistakable ────────────────────────────────────────────────────────
    if (has('pizza')) return BRANCH_PHOTOS.pizza;
    if (has('wrap')) return BRANCH_PHOTOS.wraps;
    if (has('tilapia') || has('banku')) return BRANCH_PHOTOS.tilapia;

    // A combo built on a whole chicken, which nobody has photographed. The
    // spread is the honest stand-in: it is what a big meal off this menu looks
    // like, and it claims nothing about the bird.
    if (has('full chicken')) return BRANCH_PHOTOS.assortedSpread;

    // ── Drumsticks, and rice carrying them ──────────────────────────────────
    if (has('drum')) {
        // The dish that is only drumsticks.
        if (has('drumsticks (') || n === 'drumsticks' || has('special crunch') || has('juicy fried')) {
            return has('juicy') ? BRANCH_PHOTOS.drumsticksClose : BRANCH_PHOTOS.drumsticks;
        }

        if (has('assorted')) return BRANCH_PHOTOS.friedRiceDrumsticksClose;
        if (has('jollof') && !has('fried rice') && !has('noodles')) return BRANCH_PHOTOS.jollofDrumsticks;
        return BRANCH_PHOTOS.friedRiceDrumsticks;
    }

    // Chicken on its own, which on this menu is the rotisserie bird. There is
    // no photograph of one, and drumsticks are not it.
    if (has('rotisserie') || has('grilled chicken') || n === 'rotisserie grilled') return null;

    // ── The packages, whose contents nobody has written down ────────────────
    if (has('package')) {
        return has('delight') ? BRANCH_PHOTOS.assortedSpreadClose : BRANCH_PHOTOS.assortedSpread;
    }

    // ── Assorted plates ─────────────────────────────────────────────────────
    if (has('assorted')) {
        if (has('noodles')) return BRANCH_PHOTOS.assortedNoodlesBox;
        if (has('jollof')) return BRANCH_PHOTOS.assortedFriedRiceTable;
        return BRANCH_PHOTOS.assortedFriedRice;
    }

    // ── Rice and noodles carrying something ─────────────────────────────────
    // Not the plain-bowl frames: these plates have meat on them and the plain
    // frames do not. The assorted bowls are the honest stand-in, because that
    // is what rice with meat through it looks like.
    if (has('economy pack') || has('peppered chicken') || has('pepper chicken') || has('fried egg') || has('+ chicken')) {
        if (has('noodles')) return BRANCH_PHOTOS.assortedNoodles;
        if (has('jollof')) return BRANCH_PHOTOS.jollofDrumsticks;
        return BRANCH_PHOTOS.assortedFriedRice;
    }

    // ── Plain plates ────────────────────────────────────────────────────────
    if (has('noodle')) return BRANCH_PHOTOS.noodles;
    if (has('jollof')) return BRANCH_PHOTOS.jollofPlain;
    if (has('fried rice') || n === 'rice') return BRANCH_PHOTOS.friedRice;
    if (has('plantain')) return null;

    return null;
}
