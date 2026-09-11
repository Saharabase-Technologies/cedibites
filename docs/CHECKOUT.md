# Checkout

How the customer checkout and the cart sheet work, and why they are built this
way. Read this before changing anything under `app/(customer)/checkout` or
`app/components/ui/CartDrawer.tsx`.

Written 2026-09-11 on `feat/customer-rebrand`. Everything here is on beta.
Production has none of it.

The visual rules underneath (brand colours, radius, type) live in
`docs/CUSTOMER_DESIGN_SYSTEM.md`. This file is about flow, copy and the traps.

---

## 1. The flow

Four screens.

1. **Where it goes.** Delivery or pickup, then the address (or the branch, for
   pickup), then "Add a note".
2. **Who it is for.** Name and phone.
3. **How you pay.** Mobile Money or cash, and the number to charge.
4. **Check your order.** Every answer as a row, the dishes, the money, and
   "Pay now ₵97.20".

The question is the title in the bar, with "1 of 3" beside it. Each question
screen is one white block and nothing else. **The dishes and the total appear
only on the last screen.**

Change on the review goes back to that one question. Continue there comes
straight back to the review, not on through the questions after it. Back does
the same in reverse. Both run off `furthest` in `page.tsx`.

---

## 2. How it got here

Four versions in one week, each with one lesson.

| Version | What it did | What was wrong with it |
|---|---|---|
| Stacked form | Seven answers down one page | Nothing said where to start or when you were done |
| Steps with a recap (2026-09-07) | One question at a time, each answer folded into a line above the next | By step three the question sat under three recap rows. The total showed three times. Underlined links everywhere. A display heading under a title on every screen |
| One review screen with sheets (2026-09-11) | Every answer on one page, each changed in a sheet | The look was right. The flow was not: too much at once on a phone |
| Questions, then check and pay (now) | One light screen per question, everything gathered at the end | |

**The lesson: the look and the flow are separate decisions.** The client kept
the look of version three and rejected its flow. When feedback arrives, work out
which of the two it is about before changing either.

---

## 3. Decisions, and the reason for each

### A light screen per question

One white block, no recap of earlier answers, no order strip, no running total.
The question is the bar title, so no screen carries two headings.

### The dishes and the money wait for the review

They matter at the moment somebody agrees to them. Shown on every step, the
same total appeared three times on one phone screen.

### One button at the foot

Same place and same size on all four screens: 60px tall, 16px label, the same
as the cart sheet's button.

- **On a question** it says Continue and waits in grey until the question is
  answered. It does not explain, because the field it waits for is the only
  thing on the screen and carries its own error line.
- **On the review** it says "Pay now ₵97.20" or "Place order ₵96.00". The amount
  is on the button because on a phone the total above is often scrolled away.
- **When the branch cannot take the order** the reason sits above the button
  ("Ashaiman opens at 8:00 am.") and the button becomes "Choose another branch".
  This happens on every screen, including the first question. Nobody should
  answer three questions for an order that cannot be cooked.

The logic is `questionBlocker` and `reviewBlocker` in `availability.ts`.

### Two kinds of button, and no underlined links

The big red one at the foot, and a small grey rectangle for everything else:
`SmallAction` in `app/components/ui/QuietControls.tsx`. The old screens used
bold underlined text for every secondary action, eight of them across five
screens, all at the same volume, none looking pressable.

The brand has no pills. Corners come from the radius tokens.

### A caption over a value

`ReviewRow` in `Field.tsx`. A small grey caption, the answer in bold, the whole
row is the button, and a "Change" on the right so it looks like one. It wraps
rather than truncates, because a Ghanaian address is long and a cut one is when
somebody needed to check it.

### State goes in a badge

Closed, Not taking orders, Not at Ashaiman: a yellow `AttentionBadge` beside the
thing it describes. Yellow is attention and never carries white text.

### One entry point, not parallel buttons

"Add a note for the kitchen" and "Add a note for the rider" sat side by side on
the address question, and the client said the two buttons ruined the page. One
"Add a note" opens `NoteSheet`, where each target is a labelled field. Once
written, the notes read back as lines with one Change.

The general rule: when two controls on a light screen lead to related things,
give them one entry point and put the choice inside.

### Two notes, one field on the order

- A delivery used to take only a rider note, so somebody allergic had nowhere to
  say so. There is now a kitchen note on every order and a rider note on a
  delivery.
- **An order has one note field.** The checkout's `special_instructions` becomes
  the order's `delivery_note` in `OrderCreationService.php`. `composeNote` in
  `types.ts` sends the two as separate labelled lines, kitchen first:
  `Kitchen: No shrimp, I am allergic` then `Rider: Blue gate`.
- **Three staff places keep the line break**, or the two run together:
  `OrderTicket.tsx` and `OrderDetailSheet.tsx` (`whitespace-pre-line`), and
  `printReceipt.ts` (`.note { white-space: pre-line }`). Anything new that
  prints the order note needs the same.
- A rider note is dropped when the order becomes a pickup.
- Considered and not built: a separate `kitchen_note` column. It is cleaner for
  allergies, but it touches printing and needs a backend deploy. Revisit if
  staff start missing allergy lines on the ticket.

### Saved addresses show a name only when the customer gave one

A signed-in customer's delivery address is saved silently when they place an
order, with no name. Those rows used to be titled "Saved address", which put a
made-up name beside Home and Office. Now the street is the title unless there
is a real name, at checkout and on the account page. Names come from the account
page.

A guest with no account list gets "Last time", this device's last address, from
`recall.ts`.

### Money

- `formatGHS` from the cart onwards: two decimals, `₵120.00`. The cart said ₵120
  and checkout said ₵120.00 a second apart.
- The subtotal is hidden when nothing adjusts it, because it would just repeat
  the total.
- The service charge follows the payment method. Cash never carries it
  (`calcServiceCharge`).
- **There is no "Delivery: Free" line.** Nobody has confirmed whether riders
  collect money at the door. Do not print Free until somebody has.
- The promo lookup is keyed on dish ids and branch id, not on object identity.
  Keyed on objects, every refetch blanked the totals to grey bars.

### Copy

- "Cash on delivery" and "Cash at pickup", because that is what people call it.
- Phone numbers read `059 212 3054` (`formatGhanaPhone`).
- The Mobile Money holder's name in ordinary case, not Hubtel's capitals
  (`holderName`).
- Titles: "Where it goes", "Who it is for", "How you pay", "Check your order".
- No sub-line that repeats its label. "MTN, Telecel or AirtelTigo" under
  "Mobile Money" went.

### Hubtel lookups cost money

`useMomoCheck` only runs once the customer has reached the payment question. It
waits 600ms after typing and keeps definite answers per number for the tab.
When Hubtel cannot be reached the answer is null, and null means carry on.

### The cart sheet

- The branch is one row with a Closed badge and "Opens at 8:00 am". It has no
  Change while shut, because "Choose another branch" at the foot is the way out.
- Minus turns into a bin at one. There is no separate bin.
- A dish the branch cannot make gets a "Not at Ashaiman" badge, and the button
  becomes "Take out what Ashaiman can't make".
- Removed: "Add something else", the count beside "Your order", and "Delivery,
  if you choose it, is added at checkout."

---

## 4. Traps

- **`BottomSheet` re-runs its focus effect when `onClose` changes identity.** A
  sheet with fields needs a stable `onClose` from `useCallback`, or typing loses
  focus mid-word. `closeCart` in `ModalProvider` is not stable. That is harmless
  only because the cart has no fields.
- **`autoFocus` inside a `BottomSheet` loses** to the sheet's own focus effect.
  Focus after a 60ms timeout, the way `NoteSheet` and the sign-in sheet do.
- **Never keep a branch object in state and read it later.** `BranchProvider`
  used to hold a copy of the picked branch that never refreshed, so a branch
  opening or closing never reached the cart or checkout. It resolves by id
  against the live list now.
- **`.page-x` carries `max-width: 80rem`**, which beats a `max-w-*` on the same
  element. Put a width cap on an inner div.
- **Every customer page has a 20px gutter at every width.** The md and xl
  overrides of `--page-gutter` in `app/globals.css` sit before the base value,
  so the base wins. Reported, not fixed, because fixing it moves every page.
- **Opening times come from `nextOpening`** in `lib/utils/branchHours.ts`, on the
  server clock. It returns nothing when the timetable cannot be trusted: shut by
  hand, or closed during its own hours. A missing time beats a wrong one.
- **`ScreenHeader`'s `progress` line reads as a border** and gives no count. Use
  its `right` slot for "1 of 3".

---

## 5. Checking a change

- `npx tsc --noEmit`, `node scripts/lint-hooks.mjs` (the deploy gate), and
  `npm run build` before any beta deploy.
- Locally: `php artisan serve --port=8000` in the backend and
  `npx next dev -p 3000` here. `.env.local` points at `http://localhost:8000/v1`.
  The backend prefix is `/v1`, not `/api/v1`.
- Screenshots: `playwright-core` driving the installed Edge
  (`channel: 'msedge'`) at 390 by 844.
  - Seed a guest cart with `POST /v1/cart/items` and an `X-Guest-Session` header.
  - Stub `/v1/momo/verify`, so nothing reaches Hubtel.
  - Local branches follow real hours (08:00 to 22:00). Force open or closed by
    patching `/v1/branches` in the browser, not by waiting.
  - Set `location-prompt-shown` in localStorage, or the location sheet covers the
    cart.
  - Hide the Next.js badge and the React Query devtools button, which sit on the
    pay button.
- Deploy: `gh workflow run deploy-beta.yml -f branch=feat/customer-rebrand`.
  Never cancel it past `npm ci`. Confirm with the server's HEAD and BUILD_ID over
  SSH, and by finding new text in beta's JavaScript.

---

## 6. Still open

- Should a returning customer skip the questions and land on "Check your
  order"? Today everyone walks all three, with saved details filled in.
- Is delivery free for the customer? That decides the Delivery line.
- A separate kitchen note column, if allergy lines get missed on the ticket.
- The page gutter bug.
- The phone's own back gesture leaves checkout rather than going back one
  question, because the steps are state rather than URLs.
