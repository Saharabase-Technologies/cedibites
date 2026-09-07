/**
 * One scroll lock, counted, for every sheet and drawer on the customer side.
 *
 * Two things were wrong with the way this was done before.
 *
 * **Everybody had their own.** Five components each wrote
 * `document.body.style.overflow` directly, and every one of them cleared it to
 * `''` on cleanup. Close a cart drawer over an open item sheet and the drawer's
 * cleanup unlocked the page for the sheet that was still there. A count fixes
 * that: the page unlocks when the last thing holding it closes, not when the
 * first one lets go.
 *
 * **`overflow: hidden` is not a lock on a phone.** Safari on iOS scrolls the
 * document with touch regardless of it, which is exactly where a bottom sheet
 * matters most. The reliable move is to take the body out of flow, hold it at
 * the offset it was already at so nothing appears to jump, and put the reader
 * back where they were on the way out.
 *
 * The staff portals still lock the old way. They are a different world and this
 * has never bitten them, but the same utility works there when somebody wants
 * it: see InventoryModal and OrderDrawer.
 */

interface SavedBodyStyle {
    position: string;
    top: string;
    left: string;
    right: string;
    width: string;
    overflow: string;
}

let holders = 0;
let scrollY = 0;
let saved: SavedBodyStyle | null = null;

export function lockScroll(): void {
    if (typeof document === 'undefined') return;

    holders += 1;
    if (holders > 1) return;

    scrollY = window.scrollY;

    const body = document.body.style;
    saved = {
        position: body.position,
        top: body.top,
        left: body.left,
        right: body.right,
        width: body.width,
        overflow: body.overflow,
    };

    // `top` is what stops the page appearing to leap to its start the moment
    // the body stops being in flow.
    body.position = 'fixed';
    body.top = `-${scrollY}px`;
    body.left = '0';
    body.right = '0';
    body.width = '100%';
    body.overflow = 'hidden';
}

export function unlockScroll(): void {
    if (typeof document === 'undefined') return;

    holders = Math.max(0, holders - 1);
    if (holders > 0 || !saved) return;

    const body = document.body.style;
    body.position = saved.position;
    body.top = saved.top;
    body.left = saved.left;
    body.right = saved.right;
    body.width = saved.width;
    body.overflow = saved.overflow;
    saved = null;

    // Instant, and before paint. `scroll-behavior: smooth` anywhere on the page
    // would otherwise animate the reader back to where they already were.
    window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior });
}
