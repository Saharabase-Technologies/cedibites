# New prices and the Put live button: the build plan

The working plan for staging menu changes and putting them live at a moment
the owner chooses. It spans both repos. Any agent, in any session, can pick it
up, do the next unticked task, tick it, and leave the file better than it found
it.

Started 2026-10-15. Owner: Richard Somda (the user). It began with a new price
list: a handwritten note, then the printed menu marked up by hand.

---

## How to use this file

1. Read the whole file before touching code.
2. Tick a box (`- [x]`) only when the thing is done and checked. Put the commit
   hash after it.
3. Add anything the next agent needs to **Section 9, Learnings**, with a date.
4. Keep **Section 1, Status** true.
5. Ask the user before any push and any deploy. One approval covers one push.
   A push to backend `master` or frontend `main` deploys prod.
6. House style everywhere, screen copy included: plain words, one idea per
   sentence, no em or en dashes.

---

## 1. Status

| Phase | What | State |
|---|---|---|
| 0 | Branches cut, plan written | Done 2026-10-15 |
| 1 | Backend: drafts, publish, schedule, undo, live signal | Not started |
| 2 | Backend: stage the October price list | Not started |
| 3 | Frontend: the New prices page | Not started |
| 4 | Frontend: tills and menus reload on the signal | Not started |
| 5 | Check end to end on a local stack | Not started |
| 6 | Ship, stage the list on prod, owner presses the button | Not started |

Branches, both cut 2026-10-15 with no upstream on purpose:

- Frontend: `feat/menu-price-publish`, off `origin/main` at `e8ae315`.
- Backend: `feat/menu-price-publish`, off `origin/master` at `0cd79c2`, in the
  worktree `cedibites_api/menu-prices`. The main backend tree has unrelated
  uncommitted work on `fix/order-number-skips-deleted`. Do not touch it.

---

## 2. What we are building

The owner's words: "I'll want a trigger for when we're ready to publish them."

- New prices are typed in as drafts. The till, the website and the app keep
  charging today's prices.
- A **New prices** tab under Admin › Menu lists every dish and option with
  today's price and a box for the new one. A draft can be corrected or removed
  there.
- New options (the wings) wait as drafts and go on sale at the same moment.
  So do renames, and taking a dish off sale.
- **Put new prices live** shows old and new side by side, then switches **Now**
  or **At a set time**, such as Monday 06:00 before the tills open. The time is
  the server's. Ghana is UTC+0 all year.
- Every publish is recorded: who, when, and every old and new value. **Undo**
  on the latest publish puts the old values back.
- At the switch every open till and menu reloads, so a cashier never sees 90
  while the customer is charged 100.

Who: `manage_menu`, which is the admin's. The RoleSeeder says "Prices are
Admin's". A manager does not hold it.

---

## 3. What was true before this build (prod, read only, 2026-10-15)

- Checkout and the till both charge `menu_item_options.price` at the moment of
  the order (`resolveItemPrices` in `CheckoutSessionController` and
  `PosOrderController`). The server is right the instant a price changes.
- A till keeps the menu it loaded. Nothing broadcasts a menu change. The till's
  basket holds the price from when the line was added.
- `cart_items` stores `unit_price` from when the line was added. Checkout
  reprices, but the cart sheet shows the stored figure.
- `menu_item_option_branch_prices`: 42 rows, every `price` null. One price per
  option for all three branches.
- The API returns every option, on sale or not, and the frontend adapter does
  not filter by `is_available`. **So a new option cannot wait as a hidden row.**
  It waits as a draft and is created at publish.
- The smart category cache holds item ids only, not prices.
- `menu:unify` runs on every deploy and groups by `slug`. A rename leaves the
  slug alone, so renames are safe.
- The scheduler runs under PM2 as `cedibites-scheduler` (`schedule:work`).

---

## 4. Design

### Tables

- `menu_drafts`: one waiting change. `menu_item_id`, `menu_item_option_id`
  (null for a dish level change), `field`, `value` (json), `created_by`,
  `updated_by`. Fields:
  - `price`, `option_label`, `display_name` on an option
  - `name` and `off_sale` on a dish
  - `new_option` on a dish, value `{option_key, option_label, display_name, price, display_order}`
- `menu_publications`: `status` (scheduled, published, cancelled, undone),
  `publish_at`, `published_at`, `scheduled_by`, `published_by`, `undone_at`,
  `undone_by`, `change_count`, `note`.
- `menu_publication_changes`: the log. `menu_publication_id`, `menu_item_id`,
  `menu_item_option_id`, `field`, `old_value`, `new_value`, `line_name` (the
  name at the time, so history reads right after a rename).

### Rules

- One draft per (dish, option, field), except `new_option`.
- A draft equal to today's value is deleted, not kept.
- Publish takes whatever drafts exist at that moment, in one transaction with
  the drafts locked. A scheduled publish therefore carries changes made after
  it was scheduled. The screen says so.
- One scheduled publish at a time.
- Publish also reprices `cart_items` for every changed option, so a basket
  filled before the switch shows the new figure.
- Undo only on the latest published publish. A value someone changed since is
  left alone and counted as skipped. A created option is soft deleted.
- The signal goes out after the commit, on the public channel `menu`, event
  `menu.updated`. A Reverb failure is logged and never fails the publish.
- `menu:publish-due` runs every minute, `withoutOverlapping`. A scheduled
  publish that finds nothing waiting is cancelled with a note.

### API (all under `/v1/admin`, `permission:manage_menu`)

- `GET menu-prices`: the whole board in one call. Dishes, options, drafts,
  the scheduled publish, the last 10 publishes with their changes.
- `PUT menu-drafts`: set or clear one draft.
- `POST menu-drafts/new-option`, `DELETE menu-drafts/{draft}`, `DELETE menu-drafts`.
- `POST menu-publications` with `when: now|at` and `publish_at`.
- `POST menu-publications/{publication}/cancel`
- `POST menu-publications/{publication}/undo`

### Screen

`/admin/menu/prices`, tab **New prices** in `MenuShell`. Built from the
inventory kit.

- A status card: nothing waiting; or "N changes waiting. The till and the
  website still charge today's prices." with **Put new prices live**; or
  "Goes live on Monday 20 October at 06:00" with **Cancel** and **Go live now**.
- Search, category filter, and **All dishes** / **Changes only**.
- A row per option: dish and option, today, a box for the new price. Badges
  for new options, renames and dishes coming off sale.
- Per dish, **Changes at publish**: rename, take off sale, option labels and
  receipt names, add an option.
- **Put new prices live** opens the review: every change, old beside new, then
  Now or At a set time.
- **History**: each publish with who, when and what, and **Undo** on the latest.

### Live reload

`useMenuLiveUpdates` listens on the public channel and invalidates
`menu-items`, `menu-item`, `admin-menu-items`, `menu-categories`,
`smart-categories` and `cart`. Mounted on the till, the staff store and the
customer layout. The till also reprices its basket from the fresh menu by
option id, on any menu change, signal or not.

---

## 5. The October price list

The source of truth is the marked-up printed menu. The owner's rule: "all
others just use what you see on the menu". A dish not on the printed menu keeps
today's price. Option ids are prod's.

| Line | Today | New |
|---|---|---|
| Assorted Jollof Rice (2) | 85 | 90 |
| Assorted Fried Rice (5) | 80 | 90 |
| Assorted Noodles (45) | 80 | 90 |
| Seafood Jollof Rice (3) | 105 | 120 |
| Seafood Fried Rice (6) | 100 | 120 |
| Seafood Noodles (46) | 100 | 120 |
| Rotisserie, Full (14) | 170 | 200 |
| Rotisserie, Half Cut (15) | 90 | 110 |
| Fried Rice + 3 pieces of Chicken (16) | 90 | 100 |
| Jollof Rice + 3 pieces of Chicken (52) | 95 | 100 |
| Assorted Fried Rice + 3 pieces (42) | 110 | 120 |
| Assorted Noodles + 3 pieces (44) | 110 | 120 |
| Assorted Jollof Rice + 3 pieces (43) | 115 | 120 |
| Assorted Fried Rice + Full Chicken + Kɔkɔɔ (60) | 250 | 260 |
| Assorted Jollof Rice + Full Chicken + Kɔkɔɔ (61) | 255 | 260 |
| Chicken Wraps (29) | 60 | 70 |
| Beef Wraps (30) | 60 | 70 |
| Mixed Wraps (31) | 70 | 85 |

**Banku**, one dish in two sizes:
- Dish 4 renamed "Banku With Grilled Tilapia" (today "Banku With  Tilapia").
- Option 9: label "Small", receipt name "Banku With Grilled Tilapia (Small)", 100 to 110.
- New option on dish 4: "XL", receipt name "Banku With Grilled Tilapia (XL)", 140.
- Dish 36 (the separate 140 Banku) comes off sale.

**Drumsticks and Wings**, in Special Crunch (dish 25) and Juicy Fried (dish 26):
- Dishes renamed "Drumsticks and Wings (Special Crunch)" and "Drumsticks and Wings (Juicy Fried)".
- Options 47 to 50 relabelled "5 Drumsticks" and "10 Drumsticks". Prices stay 65 and 110.
- New options on each: "7 Wings" at 65 and "15 Wings" at 110. Receipt names
  "7 Pieces of Special Crunch Wings" and so on, after the drumsticks.

Kept at today's price, not on the printed menu: Noodles + 3 pieces (59, 90),
Assorted Noodles + Full Chicken (62, 250), Assorted Noodles and Assorted Jollof
+ 7 pieces (55, 86), the Economy Packs, plain Jollof and Fried Rice, and the
rest. The owner sees them on the page and can add a draft in seconds.

---

## 6. Tasks

### Phase 1, backend

- [ ] 1.1 Migration and models: `MenuDraft`, `MenuPublication`, `MenuPublicationChange`.
- [ ] 1.2 `MenuPublisher`: publish, undo, cart repricing, the signal after commit.
- [ ] 1.3 Controller, requests, routes under `permission:manage_menu`.
- [ ] 1.4 `menu:publish-due` and its schedule line.
- [ ] 1.5 Tests: drafts, publish now, scheduled publish, cancel, undo with a
      skipped value, new option created, dish off sale, cart repriced, a
      manager refused.

### Phase 2, the October list

- [ ] 2.1 `menu:stage-october-prices` with `--dry-run`. Each line names the
      value it expects today and skips with a warning when prod differs.

### Phase 3, frontend page

- [ ] 3.1 Types and `menuPrices.service.ts`.
- [ ] 3.2 The page, the status card and the rows.
- [ ] 3.3 Changes at publish (per dish).
- [ ] 3.4 The review and the schedule.
- [ ] 3.5 History and Undo.

### Phase 4, live reload

- [ ] 4.1 `menu.updated` listener, mounted on the till, the staff store and the customer layout.
- [ ] 4.2 The till reprices its basket by option id.

### Phase 5, check

- [ ] 5.1 Backend tests green. `npm run lint:hooks` and `tsc` green.
- [ ] 5.2 Local stack: stage, review, publish now, see a till reload, undo.

### Phase 6, ship

- [ ] 6.1 Push and deploy, with the owner's go.
- [ ] 6.2 Run `menu:stage-october-prices --dry-run` on prod, read it, run it.
- [ ] 6.3 The owner reviews the page and presses the button.
- [ ] 6.4 Change the prices on Bolt Food by hand. Our system does not reach Bolt.

---

## 7. Out of scope

- Per-branch prices. The owner decided 2026-07-28 that only availability varies by branch.
- Staging a whole new dish. The admin menu still creates dishes straight away.
- Bolt Food prices.

---

## 8. Traps

- Renaming a dish breaks three things that key off its name as a string:
  `photoForMenuItem()`, `AshaimanRecipeSeeder::matches()` and the menu
  seeder. "Drumsticks and Wings" still contains "drum", so the photo holds.
  See the memory on the combos rename.
- A new option needs a receipt name (`display_name`). A bare "7 Wings" pill
  would print on its own.
- No photo of wings exists. Never attach the drumsticks photo to a wings option.

---

## 9. Learnings

- 2026-10-15: the owner's chat answers changed twice before the printed menu
  settled them. When a marked-up menu exists, it wins.
