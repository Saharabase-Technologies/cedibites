# The customer design system

How the customer side of CediBites is built, and why it is built that way. The
staff portals are a different world and are not covered here: see the "inventory
portal is the design language" section of `CLAUDE.md` for those.

Written 2026-09-05, on branch `feat/customer-rebrand`.

---

## 1. The idea

The brand already existed, in the flyers. Red block, white condensed caps,
photography of the actual food, hard rectangles, yellow as a small accent. The
app did not look like any of it: warm orange and cream, a hamburger drawer, and
no photography at all.

So the work was not "design a look". It was **make the product look like the
company**, and make it behave like an app rather than a website.

Two devices carry the identity:

- **The red block.** White condensed caps sitting in a solid red rectangle. It
  is the one thing every piece of CediBites artwork has in common.
- **The photography.** Real dishes shot at the branch on the real packaging.
  Eight of them live in `public/brand/`.

---

## 2. The token layer

`app/globals.css`, in three layers. The order matters and is load-bearing.

### Layer 1 — primitives

Raw brand ramps. Nothing outside layer 2 references these.

```
--cb-red-*      anchored on   #f40002   (500)
--cb-yellow-*   anchored on   #ffdd0b   (400)
--cb-green-*    anchored on   #8fa84e   (500)
--cb-mono-*     0 → 950, true neutral, no warm cream
--cb-warm-*     the staff portals' original ramp, kept verbatim
```

### Layer 2 — semantic roles

`:root` holds the staff foundation. `.cb-customer` overrides it. `.dark` and
`.dark .cb-customer` follow.

**`:root` and `.cb-customer` have equal specificity**, so the customer block must
come second in the file. `.dark .cb-customer` is `(0,2,0)` and comes last.

### Layer 3 — `@theme inline`

`inline` is required, not cosmetic. A plain `@theme` resolves `var()` at `:root`
and hands descendants the already-substituted value, so `.cb-customer` could
never re-tint anything. `@theme inline` emits `background-color: var(--cb-primary)`
straight into the utility, which resolves per element and therefore cascades.

Every legacy utility name is remapped through the role layer, which is what
re-tinted 395 `primary`, 417 `neutral-gray` and 194 `text-light` usages without
touching a single component.

### Scoping

The whole rebrand hangs off a `.cb-customer` wrapper on
`app/(customer)/layout.tsx`. POS, kitchen, inventory, admin and partner keep the
warm foundation untouched. Verified there is no `createPortal` in the customer
tree, so drawers, sheets and modals inherit the wrapper.

---

## 3. Colour

| Role | Value | Job |
|---|---|---|
| `--cb-primary` | `#f40002` | The brand red. Identity surfaces, block headings, active states. |
| `--cb-primary-fill` | `#d90002` | Any red fill carrying a small white label. |
| `--cb-primary-ink` | `#c40004` | Red text on light. |
| `--cb-accent` | `#ffdd0b` | Attention, never action. Deal buttons, badges. |
| `--cb-success` | `#8fa84e` | Open, confirmed, available. |
| `--cb-danger` | `#b00204` | Destructive. Deliberately a deeper red than the brand. |

The contrast arithmetic behind those splits:

- White on `#f40002` is **4.33:1**. Clears AA for large text only, which is why
  a button carrying a 14px label uses `primary-fill` at **5.3:1** instead, and
  why the block heading (24px+ in a heavy condensed face) may use the real brand
  red.
- White on `#ffdd0b` is **1.35:1**. Yellow never carries white text. Ink on it is
  **12.9:1**.
- `#8fa84e` is **2.7:1** on white. Green fills chips and never sets text;
  `success-ink` (green-700) is **6.3:1**.
- Destructive must not be the brand red, or "Place order" and "Cancel order"
  become the same button.

**Red is action. Yellow is attention. Green is confirmation. Neutrals carry
everything else** — that is what lets a saturated red read as deliberate rather
than as a discount flyer.

### Light only

Enforced, not defaulted. `ThemeProvider` uses `forcedTheme="light"`, which
ignores the OS *and* any preference already in localStorage, plus
`color-scheme: light` at the root so the browser paints its own furniture light.
Nothing ever writes `.dark`, so every `dark:` utility in the codebase is inert.

The dark token blocks stay in `globals.css`. They cost nothing while no element
carries `.dark`, and deleting them would make bringing dark back a rebuild
rather than a one-line change in `ThemeProvider`.

---

## 4. Type

```
font-brand   American Captain   self-hosted, fonts/AmericanCaptain.ttf
font-body    Montserrat         standing in for Mont, which is not licensed
```

**`font-brand` and `font-body` never worked before this.** The theme declared
`--font-family-*`, and Tailwind 4 builds font utilities from `--font-*`. Roughly
3,000 class usages across the app emitted nothing. `font-body` looked correct by
accident because the `body` rule already set the face. Both spellings are now
declared so the old `font-family-brand` usage keeps working too.

American Captain is all-caps and condensed. It carries the wordmark, section
titles and dish names on tiles. It does **not** carry item names in a card or
any running copy: "GRILLED CHICKEN WITH JOLLOF AND SHITO" at card size is
unreadable.

Staff headings deliberately stay on the body face. Pointing `--cb-font-brand` at
`var(--font-caprasimo)` in `:root` would switch ~60 staff headings to Caprasimo
for the first time ever. One line, deliberately not taken.

---

## 5. Shape

### Radius

The brand's artwork has no pills. Headline blocks, the contact bar and the QR
panel are all hard rectangles. So the customer scale is roughly half Tailwind's
defaults, driven off the same `--radius-*` namespace so every existing
`rounded-*` squares up without a component being edited.

| | staff | customer |
|---|---|---|
| `rounded-lg` | 8px | 4px |
| `rounded-xl` | 12px | 6px |
| `rounded-2xl` | 16px | **8px** |
| `rounded-3xl` | 24px | 10px |

`rounded-full` is not var-driven, so 107 explicit pills were swept to
`rounded-lg` across 19 customer files. **Five spinner rings kept their circles**
— a spinning square is a spinning square. `BranchSwitch.tsx` was deliberately
skipped because the kitchen board, order manager and POS terminal all render it.

### The page gutter

One variable, `--page-gutter`, read by the `.page-x` class.

```
1.25rem (20px)  phones
2.5rem  (40px)  md
4rem    (64px)  xl
```

Every section on home uses `.page-x`. Before this there were nine copies of
`w-[95%] md:w-[90%] xl:w-[85%]` across four files, and a percentage gutter
collapses to 9px on a small phone — not enough air for a card that casts a
shadow.

### Elevation

`.card-lift`, with `.card-lift-tap` adding hover **only on cards that are
themselves clickable**. A card that lifts under the cursor but ignores the click
is a lie.

```
0 1px 4px   rgb(0 0 0 / 0.06)        wraps all four sides
0 10px 24px -6px rgb(0 0 0 / 0.13)   clears the card by 6px either side
```

A card never carries a border and a shadow at once. In dark mode the same class
draws an inset outline instead, since a shadow on a near-black ground is
invisible — an outline rather than a border so nothing shifts by a pixel.

---

## 6. The shell

- **Floating tab bar**, detached from the edges, dark chrome, white lozenge on
  the live tab. Red stays reserved for action, so the cart button beside the
  pill is red and the active tab is not.
- **Tabs are Home, Menu, Orders, Search.** Account moved to the header: it is a
  screen people visit rarely, which is the wrong shape for a permanent tab.
  Search is an action rather than a place, so it never lights up as current.
- **`lib/constants/nav.ts` is the only place a tab is defined.** Before this the
  header said "Track Order" pointing at `/orders`, the account dropdown said "My
  Orders" pointing at `/order-history`, and the drawer said "My Orders" pointing
  at `/orders`.
- **The hamburger drawer is gone**, 130 lines and a body-scroll lock with it.
- **`--nav-h` folds in `env(safe-area-inset-top)`**, so the ~20 screens sizing
  themselves with `calc(100svh - var(--nav-h))` got the notch right for free.
- `viewportFit: 'cover'`, `overscroll-behavior-y: none`, and
  `-webkit-tap-highlight-color: transparent`.

---

## 7. Home

Four things, in order of how much they matter, on a flat ground.

1. **Greeting** plus the live-order pill, which renders nothing unless something
   is actually cooking.
2. **Hero**, full width. The last order for a returning customer; otherwise a
   branch photograph with the block heading over it.
3. **Deals**, a rail you push. Photo on top, light panel beneath, yellow button.
4. **Staples**, then **Where we are**.

### The staple tiles

Seven dishes people arrive already thinking about. A tile is **not a product**,
so it needs no per-item photograph — the menu items mostly have none, which is
why an item grid rendered as pink rectangles.

Tapping one runs a search and lists every variation with its own price. The
search term is the **shared substring**, not the label: Drumsticks searches
`drum` so "7 Drums" and "3 Drumsticks" both come back. A tile only appears if the
branch actually sells something matching it.

### Rules learned the hard way

- **Text over a photograph needs a scrim, and a scrim heavy enough to carry
  white caps buries dark food.** On a 224px deal card the scrim had to reach 85%
  black, and a plate of jollof under 85% black is a black rectangle that reads as
  a broken image. Photo and type now get their own halves.
- **A card with no photograph must look decided, not failed.** It takes the red
  block heading instead.
- **A horizontal rail needs three separate things**: `px-*` to put the first
  card on the gutter, `-mx-*` so the shadow is not sliced off (setting
  `overflow-x` makes `overflow-y` compute to `auto`, which clips), and
  **`scroll-px-*`** because `scroll-snap-align: start` aligns to the scrollport
  edge, not to where padding puts the content. Without the third the browser
  snaps on load and parks the first card flush against the viewport.

---

## 8. The map

`app/components/ui/BranchMap.tsx`. Classic `google.maps.Marker` with data-URI
SVG icons — Google's newer marker library would need `libraries=marker` and a
mapId, and the script on the page loads `places` only.

- The marker **is the branch chip from the header**: the red tile with
  Phosphor's `Storefront` in white, lifted out of the package at its native
  viewBox so the two are the same glyph rather than two drawings of a shop.
- The name rides above on a plate baked into the SVG. A `MarkerLabel` is bare
  text with no plate, unreadable the moment it crosses a road. An SVG in a data
  URI cannot load a webfont, so the plate uses a system sans and its width is
  estimated from the character count.
- The customer is a person, not a blue dot.
- The nearest shop bounces until you choose one, and holds still under
  `prefers-reduced-motion`.
- Selecting a shop draws **that branch's delivery radius**. It is the thing a
  list of distances could never do: you can see whether your own pin falls
  inside the ring.

Distance and bike time come from `calculateDistance` and `estimateDeliveryTime`
in `lib/utils/distance.ts`, the same pair the branch switcher and nearest-branch
logic already use. Two numbers for one journey, disagreeing, is worse than one.
The bike time only shows when the branch would actually deliver — outside its
radius the honest answer is that it will not.

---

## 9. Defects found and fixed

| What | Where | Why it mattered |
|---|---|---|
| `font-brand` / `font-body` emitted nothing | theme declared `--font-family-*`, Tailwind 4 reads `--font-*` | ~3,000 class usages did nothing app-wide |
| Branch lat/lng typed `number`, arrive as strings or null | `BranchProvider` | Every distance was `NaN`; the Maps SDK throws on a non-finite lat |
| `permissionStatus` opens at `'loading'` and only moves via `navigator.permissions` | `LocationProvider` | Any control gated on it stays disabled forever on browsers without that API |
| Reorder used the historical branch and price | `/order-history` | Can route a basket to the wrong kitchen and charge a stale price |
| Branch open/closed decided from the phone's clock | `menu/page.tsx`, `DynamicGreeting` | A wrong device clock showed Closed on an open kitchen |
| Promo CTA had no handler | `PromoBanner` | A dead button on every slide |
| `CATEGORY_ICONS` mapped every category to `''` | `menu/page.tsx` | Empty spans in five places, including a 36px tile holding nothing |

---

## 10. Standing rules

1. **Red is action, yellow is attention, green is confirmation.** Do not fill
   large chrome with red.
2. **The block heading is display type only.** Never at body size — the contrast
   does not hold.
3. **Never attach a photograph to a dish it is not a picture of.** A customer
   paying GHS 255 for a full chicken who saw drumsticks has a fair complaint.
4. **Do not invent prices, ETAs, popularity or promo copy.** Derive them or
   leave them out. `PromoBanner` carries hardcoded prices that nothing validates
   against the menu.
5. **A card that looks like a broken image is broken**, whatever the reasoning
   behind it.
6. **One horizontal rail per screen.** Two stacked read as repetition.
7. Every `rounded-*`, gutter and shadow comes from the token layer. If you are
   typing a pixel value, it probably belongs there instead.

---

## 11. Still open

- **Photography.** Three of the eight shots are unplaced (a close crop of fried
  rice and drumsticks, plain fried rice with sauces, noodles). No full-chicken
  shot exists, which is why the Assorted Jollof deal card carries type instead.
  No grilled chicken shot, so that staple tile is type on ink.
- **Menu item photographs.** Most items have none, so `MenuItemCard` shows a
  pink placeholder. The eight branch photos could fill that by name match across
  the whole menu — `matchMenuItem` in `lib/constants/branchPhotos.ts` already
  does this for the hero. Not switched on: it is a heuristic applied to every
  dish and wants a decision first.
- **Promo copy and prices** are hardcoded in `PromoBanner.tsx` and nothing
  validates them against the menu.
- **Brand voice.** The flyers write in pidgin — "Nor make loose oo", "Main
  character energy nkoaaaaaa" — and the app does not. That gap is deliberate:
  the voice is the client's to set.
- **Phases 3 and 4** of the original plan: consolidating `/orders`,
  `/order-history` and `/orders/[code]` into one Orders tab, and the sheet /
  skeleton / Account pass.
