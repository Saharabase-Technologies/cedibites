# Home

What each section of the customer home page is, what decides what it shows, and
what is still open on it. Read this before changing `app/(customer)/page.tsx` or
any of the sections it mounts.

Written 2026-09-11 on `feat/customer-rebrand`, when the client asked for every
section to be defined. The visual rules underneath, the palette, the type, the
radius and the rails, live in `docs/CUSTOMER_DESIGN_SYSTEM.md`.

---

## The page

Five sections on a flat ground, in falling order of how much they matter:

1. Greeting
2. Hero
3. Deals
4. Staples
5. Where we are

Then the footer. The spacing between them is deliberately uneven: a heading sits
tight against the thing it names, and the air goes between sections rather than
inside them.

What used to be here, before the rebrand: a greeting, a scrolling row of ten
category chips, a reorder rail, a rotating promo and fourteen menu cards, every
band at the same weight, 24px apart, over a tiled background pattern.

---

## 1. Greeting

`app/components/ui/GreetingBar.tsx`

**Is** the time of day with the customer's first name, whether the kitchen is
cooking, and a chip for an order on its way.

**Runs on** `serverNow()` for the hour, never the device clock: a phone an hour
out used to read "Good evening" at noon, and worse, read Closed on an open
kitchen. The open mark is `selectedBranch.isOpen`. The chip is
`ActiveOrderChip`, which reads the order this device placed and, for a signed-in
customer, their live order off `/orders`, so it survives ordering on a phone and
opening the site on a laptop.

**Open:** a shut kitchen says Closed and stops. `nextOpening` in
`lib/utils/branchHours.ts` already works out when it opens, and the cart says
it. This does not.

---

## 2. Hero

`app/components/ui/HomeHero.tsx`

**Is** one full-width slide: the dish this branch has sold most of, with any
hand-designed banners behind it in a deck you push.

**Runs on `most-popular`**, a smart category the API computes from paid orders of
the last thirty days, ranked by units sold. `GET /v1/smart-categories?branch_id=`
is public, cached for six hours, and computes on demand when the cache is cold,
so nothing has to be scheduled for it to work. The first id in it is the dish.
It is read with `useSmartCategories` on the same query key the menu provider
uses, so the hero costs no second request.

**An empty answer means something.** A branch with no paid order in the last
thirty days has no such category at all, and then the hero falls back to a
photograph of real food that claims nothing but the menu. The fallback is not an
edge case, it is a new branch's first month.

Where each environment stood on 2026-09-11: production ranks a dish first at
Ashaiman and Lakeside, ranks water first at East Legon, and has no ranking at
all for Test Branch. Beta's only branch has no ranking, so **beta shows the
photograph** and production shows real dishes. Judge the section on production.

### Decisions

- **It walks the ranking to the first real dish.** Units sold is the ranking, and
  a bottle of water outsells food: East Legon's most ordered item is Bel Aqua at
  ₵7, and Extra Sea Food is filed beside the drumsticks. Drinks, anything named
  "Extra", anything sold out, and anything the branch has stopped serving since
  the ranking was computed are all walked past. East Legon lands on the ₵90
  combo, which is its most ordered dish. If nothing in the ranking qualifies, the
  photograph takes over.
- **The claim is in the display face, the dish name is not.** The red block says
  "Most ordered" and the dish's own name sits under it in Montserrat. American
  Captain does not set item names: "ASSORTED FRIED RICE / JOLLOF / NOODLES +
  FULL CHICKEN + KƆKƆƆ" in condensed caps is a wall of letters.
- **The price is the cheapest option, with "From" in front of it** when the dish
  has more than one (`cheapestPrice` in `lib/utils/itemPrice.ts`). Nearly every
  dish here is sold in three or four sizes. Drumsticks run ₵65 to ₵255, and
  printing the first option's price as though it were the price is how somebody
  arrives expecting ₵65.
- **The button is 40px and yellow.** It was a 48px red slab that read as the
  point of the slide, and the client asked for it smaller. Yellow because the red
  block is already in that corner, and black on `#ffdd0b` is 12.9:1, which holds
  over a photograph.
- **The scrim is held to the bottom half.** It used to wash the whole frame to
  carry type that only sits in the last third, which dimmed the food for nothing.
- **The photograph comes from `photoForMenuItem`**, which refuses to guess. A
  dish with no honest photograph gets the ink panel instead, sized to its own
  words, because a card that looks like a broken image is broken.
- **The customer's own last order is not here.** Home no longer asks the API for
  anybody's orders. It used to fetch twelve of them on every visit and use them
  to pick a heading level. A live order is the chip beside the greeting.

### The hand-designed banners

`lib/constants/heroBanners.ts`, empty by default.

Nothing of ours is drawn over the artwork: no heading, no scrim, no button. The
file carries its own words, which is the point of designing one. Two files per
banner, 1600x700 for a desk and 1080x1080 for a phone, because the hero is a
strip on one and a square on the other and a single image loses its sides to the
crop. Add an entry and the deck grows a slide and its dots; with one slide it
draws neither.

---

## 3. Deals

`app/components/ui/PromoBanner.tsx`

**Is** four cards chosen by us, photo above and type below, that you push
sideways.

**The money is live.** Every figure on this rail used to be typed in beside the
copy, GHS 95, GHS 110, GHS 145, so a price change in the admin never reached it
and nothing could tell you whether any of the three was still true. Each card
now names its dish in `find` words and shows what the live menu says that dish
costs today. A card whose dish this branch does not sell, or has sold out of,
keeps its photograph and its words and shows no figure at all.

- **Order matters more than the words do.** "jollof" on its own is a ₵65 plate,
  not a box of jollof with chicken on it, so the specific spellings are looked
  for first. The combos were renamed on 2026-09-06 from "3 Drums" to "3 pieces
  of Chicken" and the environments are not always on the same wording, so both
  are listed.
- **A matched card opens the dish**, in the same sheet the menu uses. The wraps
  card opens the menu filtered to the wraps category instead, because it is
  about a category rather than one dish.
- **Yellow buttons.** Red was already on the hero, the cart and every heading
  block, and four more red buttons in a row made the screen one note.

**This is not the promo engine.** Real promos exist and checkout resolves them
per basket, but `GET /promos` sits behind auth, so this page cannot list what is
actually running. Turning this rail into real offers needs a public "active
promos for this branch" route on the API. That was offered and deliberately not
taken today: the client chose editorial cards with live prices.

---

## 4. Staples

`app/components/ui/StapleGrid.tsx`, `lib/constants/staples.ts`

**Is** up to seven squares carrying the word somebody would have typed. Tapping
one opens search with that term already run, so every variation comes back at
once, priced.

A tile is not a product, which is why it needs no per-item photograph. The menu
items mostly have none, and the six-item grid of orderable dishes this replaced
rendered as pink rectangles with prices under them.

**Runs on the live menu.** A tile only appears when the branch sells something
matching it, and, since 2026-09-11, only when at least one match is not sold
out. The kitchen running out of noodles at eight in the evening is the same dead
end as never selling them, and the stock map that decides it is already on the
page. Grilled Chicken has no photograph and no matching item on some menus, so
it is the tile that comes and goes.

---

## 5. Where we are

`app/components/ui/NearbyBranches.tsx`, `app/components/ui/BranchMap.tsx`

**Is** the kitchens and the customer on one map, with the branch you tapped in
red, its delivery ring drawn, and a dotted line to you carrying the minutes.

All of it is real: real branches, real coordinates, the Routes API for the drive
with a straight-line estimate at 30 km/h when the server cannot reach it. Both
are worded identically on purpose. A customer has no use for knowing which one
they got, and the map must not look broken on the day the routing key expires.

It is the most expensive thing on the page, and it sits last, so the Maps script
costs nothing until somebody scrolls. It renders nothing at all when the script
never arrives, rather than leaving a grey rectangle.

---

## 6. Footer

`app/components/layout/Footer.tsx`

Two footers. A phone gets a way to reach a person, because the tab bar is
already the way around and every branch is on the map above. A desk gets the
site map a restaurant website has had for twenty years.

**Open:** the desktop half has dead links. All three social icons and "Find a
Branch" point at `#`.

---

## Still open

- **Beta shows the fallback hero**, because that branch has no paid order in the
  last thirty days. Production has sales, so production would show a real dish.
  Worth checking there before judging the section.
- **The deals rail is still chosen by hand.** The public promos route is the
  real fix.
- **The footer's dead links.**
- **Nothing on home says what delivery costs or how long it takes.** The first
  time either appears is checkout.
- **No reason to come back.** The two account screens the client sent both lead
  with a wallet and a loyalty card. This product has neither, and
  `PromoResolutionService::resolve` takes no customer, so there are no
  per-customer offers to build one from yet.
- **`matchMenuItem` in `lib/constants/branchPhotos.ts` is now unused.** The hero
  used it to turn a chosen photograph into a dish; it works the other way round
  now. It is kept because filling menu photographs by name match is still an
  open idea.
