/**
 * Banners designed by hand, in the hero deck behind the dish.
 *
 * Empty on purpose, and the deck reads that: with one slide it draws no dots
 * and no scroller. Add an entry and the hero becomes a deck you push.
 *
 * Nothing of ours is drawn over the artwork. No heading, no scrim, no button.
 * The file carries its own words, which is the point of designing one, so the
 * only thing added is the tap that takes somebody where the banner promises.
 *
 * **Two files per banner, because the hero is not one shape.** It is a square on
 * a phone and a wide strip from the small breakpoint up, so one image has to be
 * cropped for one of them and the crop takes the sides off a wide design.
 *
 *   wide    1600 x 700   (the desk strip)
 *   square  1080 x 1080  (the phone)
 *
 * Put the files in `public/brand/banners/`. Keep the words well inside the
 * frame: a rounded corner takes 8px off each one.
 */
export interface HeroBanner {
    /** 1600 x 700. Shown from the small breakpoint up. */
    src: string;
    /** 1080 x 1080. Falls back to `src`, which crops its sides on a phone. */
    srcPhone?: string;
    /** What the banner says, for anybody who cannot see it. Not decoration. */
    alt: string;
    /** Where it goes when tapped. A dish, a menu category, any route in the app. */
    href: string;
}

export const HERO_BANNERS: HeroBanner[] = [];
