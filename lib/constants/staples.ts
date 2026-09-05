import { BRANCH_PHOTOS, type BranchPhoto } from './branchPhotos';

/**
 * The dishes people arrive already thinking about.
 *
 * A customer does not want "Main Dishes", they want fried rice. Then they want
 * to see every fried rice on the menu at once: the plain one, the assorted one,
 * the one with seven drums and korkoor. So a staple is not a product. It is the
 * word somebody would have typed, with a photograph on it.
 *
 * Tapping one opens search with the term already run, which is why this list is
 * short and made of base dishes rather than packages. `term` has to be the
 * substring the variations share; anything narrower and half of them fall out
 * of the results.
 */
export interface Staple {
    /** What the tile says. */
    label: string;
    /** What gets searched. Must appear in every variation's name. */
    term: string;
    photo?: BranchPhoto;
}

export const STAPLES: Staple[] = [
    { label: 'Fried Rice', term: 'fried rice', photo: BRANCH_PHOTOS.friedRice },
    { label: 'Jollof', term: 'jollof', photo: BRANCH_PHOTOS.jollofDrumsticks },
    { label: 'Noodles', term: 'noodles', photo: BRANCH_PHOTOS.noodles },
    { label: 'Drumsticks', term: 'drum', photo: BRANCH_PHOTOS.drumsticks },
    { label: 'Banku', term: 'banku', photo: BRANCH_PHOTOS.tilapia },
    { label: 'Wraps', term: 'wrap', photo: BRANCH_PHOTOS.wraps },
    // No grilled chicken photograph yet, so this tile carries type instead of a
    // picture. It still works; it is just quieter than the others.
    { label: 'Grilled Chicken', term: 'grilled chicken' },
];

/**
 * A staple only earns a tile if the branch actually sells something matching it.
 * Without this, a tile opens search and lands on "nothing matches", which is a
 * worse outcome than the tile never being there.
 */
export function availableStaples<T extends { name: string }>(items: T[]): Staple[] {
    if (items.length === 0) return [];
    const names = items.map(i => i.name.toLowerCase());
    return STAPLES.filter(s => names.some(n => n.includes(s.term)));
}
