# Admin Menu — UX and Technical Audit

> **Status: built, not committed and not deployed** (2026-07-28). Steps 1–5 of Part 7 are done.
> Verified: `tsc` clean, `lint:hooks` clean, `next build` clean, backend 483 passed / 6 failed
> (the known wall-clock baseline — was 476/6 before, so +7 and no new failures).
>
> **Two things must run on prod when this deploys:**
> 1. `php artisan db:seed --class=RetireComputedMenuTagsSeeder` — detaches and deactivates
>    `popular` / `new`. `MenuTagSeeder` only adds, so removing them from it does nothing on its own.
> 2. Nothing else. No migration: the availability matrix reads `menu_item_branches`, already populated.
>
> **Not done:** Step 6, the contract migration (dropping `menu_items.branch_id` /
> `menu_categories.branch_id`). Deliberately left — see the ordering warning at the end.

Date: 2026-07-28. Frontend `f3e490c`, backend `0e46a5e` (both live).
Follows on from `HANDOFF-2026-07-28.md` §6.1 — "Admin menu editor still has a per-item branch
dropdown … must become a branch availability matrix."

The short version: **Phase 3 unified the menu and nobody told the admin editor.** The page is still
written against the one-dish-per-branch model that no longer exists, so several of its controls now
read or write nothing. It is not that the page is ugly — the page is *lying*.

## Surface under audit

| Route | Lines | What it is |
|---|---|---|
| `/admin/menu` | 1385 | Items list + item modal + bulk import. All in one file. |
| `/admin/menu-add-ons` | 251 | Add-on CRUD |
| `/admin/menu-tags` | 330 | Tag CRUD |
| `/admin/menu/configure` | 393 + 622 | Categories + smart categories |
| `/admin/menu/smart-categories` | 8 | `redirect()` to configure |
| `/admin/menu/layout.tsx` | 7 | Metadata only, no shell |
| `/staff/manager/menu` | 1053 | Near-clone of `/admin/menu` |
| `/staff/manager/menu/page.tsx.bak` | 52 KB | Committed backup file |

---

# Part 1 — Technical findings

Ordered by consequence. T1–T5 are the ones that make the page untrustworthy.

### T1 — Branch Overrides writes nothing, and reports success

`MenuItemBranchOptionController` resolves "the same dish at another branch" as a **sibling row**:

```php
// show()
MenuItem::query()->where('slug', $menuItem->slug)->get();   // was: many rows, one per branch
// update()
MenuItem::query()->where('branch_id', $branchId)->where('slug', $menuItem->slug)->first();
```

`menu:unify` collapsed those siblings into one row per dish. So today:

- **`show`** returns exactly one key — the surviving row's own `branch_id`. The modal's Branch
  Overrides panel lists **one** branch (Mother Kitchen), never the branches the dish is actually
  served at.
- **`update`** finds no sibling for any other branch, pushes it onto `$skipped`, and writes nothing.
- The frontend at [app/admin/menu/page.tsx:1119](../app/admin/menu/page.tsx#L1119) does
  `await apiClient.put(...)` and **discards the response**. The "Skipped N branch(es)" message that
  Phase 2 deliberately added to make this loud never reaches a human. The toast says
  *"Menu item updated successfully!"*

Net effect: **per-branch pricing cannot be set from the admin UI at all**, and the UI does not admit
it. This is the single most important finding.

### T2 — The admin list reads the public storefront endpoint

There is no `GET /admin/menu-items`. `menuService.getItems` hits `GET /menu-items`
([routes/public.php:24](../../cedibites_api/cedibites_api/routes/public.php#L24)), unauthenticated,
shared with the customer menu. Two consequences:

- No admin-only fields will ever arrive, because adding them would change the storefront payload.
- `?branch_id` goes through `scopeServedAt()`. With the pivot fully populated (82 rows, both
  branches serving all dishes), **every branch returns the same 41 dishes.** The branch selector at
  [page.tsx:1277](../app/admin/menu/page.tsx#L1277) is now a no-op.

### T3 — The Branch column shows the wrong thing

[page.tsx:1345](../app/admin/menu/page.tsx#L1345) renders
`branches.find(b => b.id === String(item.branchId))`. `item.branchId` is `menu_items.branch_id` — the
legacy **owning** branch, not where the dish is served. Post-unification every row reads
"Mother Kitchen" while 82 pivot rows say otherwise. This column is exactly what handoff §6.1 says
must become a matrix.

### T4 — The Global toggle is decorative on load

The adapter never carries availability:
[menu.adapter.ts:63-76](../lib/api/adapters/menu.adapter.ts#L63-L76) omits `is_available`, though it
exists on the API type at [types/api.ts:151](../types/api.ts#L151). The page then hardcodes it:

```ts
// page.tsx:915
globallyAvailable: true,
```

**Every item renders as ON regardless of the database.** An admin has no way to see what is
currently withdrawn. It also drops `rating` and `rating_count`, which the type carries.

### T5 — Editing any item silently puts it back on sale

Follows directly from T4. `saveItem` sends `is_available: item.globallyAvailable`
([page.tsx:1002](../app/admin/menu/page.tsx#L1002)) — which is the hardcoded `true`. Open a withdrawn
dish to fix a typo in its description, hit Save, and it goes back on sale company-wide. No warning.

### T6 — Every save mints a new slug

```ts
// page.tsx:983-984  — used for updates as well as creates
const baseSlug = item.name.toLowerCase()...;
const slug = baseSlug + '-' + Date.now();
```

So each edit changes the item's slug. That (a) breaks `DisplayMenuItem.url` = `/menu?item=${slug}`
for anything cached or linked, (b) breaks `MenuItemBranchOptionController`, which matches siblings
**by slug**, and (c) leaves prod slugs looking like `jollof-rice-1764328891234`.

### T7 — Option-key mismatch silently drops branch prices

Two different key derivations for the same option:

```ts
// page.tsx:614  (override editor input key)
opt.label.trim().toLowerCase().replace(/\s+/g, '-')
// page.tsx:181  (the key actually sent)
o.label.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '')
```

An option labelled `Large (2pc)` keys the input as `large-(2pc)` and sends `large-2pc`. The typed
price is dropped. Moot while T1 stands, but it is in the same code path and will surface the moment
T1 is fixed.

### T8 — Overrides round-trip through the branch *display name*

`openItemEditor` maps branch id → `branch.name` ([page.tsx:1175](../app/admin/menu/page.tsx#L1175));
`saveItem` maps name → id ([page.tsx:1104](../app/admin/menu/page.tsx#L1104)). Renaming a branch in
`/admin/branches` orphans its overrides.

### T9 — An override can never be *added*, only edited

`form.branchAvailability` is only ever populated from the GET, and the panel iterates
`Object.keys(...)`. A new item gets `{}` and shows *"Save the item first to configure per-branch
overrides"* — but saving does not create rows either, so it shows that forever.

### T10 — Stale list when you switch branch

```ts
// page.tsx:905-921
useEffect(() => { hasInitialized.current = false; }, [selectedBranchId]);
useEffect(() => { if (!hasInitialized.current && menuItems.length > 0) { ... } }, [menuItems]);
```

If the newly selected branch returns zero items, `items` keeps the previous branch's rows. You are
then looking at branch A's menu under branch B's label — the same failure shape the handoff flags in
§4: *a wrong boundary assumption producing a plausible result instead of a noise.*

### T11 — Add-ons and Bulk Import ignore the branch selector

- Add-ons effect keys off `branches[0]`, not `selectedBranchId`
  ([page.tsx:937](../app/admin/menu/page.tsx#L937)).
- `BulkImportModal` is handed `Number(branches[0]?.id) || 1`
  ([page.tsx:1382](../app/admin/menu/page.tsx#L1382)) — **an import runs against the first branch, or
  hardcoded branch 1, whatever the selector says.**

### T12 — The rating cell would break the grid

Header declares seven tracks ([page.tsx:1296](../app/admin/menu/page.tsx#L1296)); the row
conditionally renders an eighth cell for `item.rating`
([page.tsx:1337](../app/admin/menu/page.tsx#L1337)). Dead today only because T4 means `rating` is
always `undefined`. Wire ratings up and every column after Price shifts.

### T13 — Manager's sold-out state never survives a refresh

Not the admin page, but the same root cause and worth fixing together. `/staff/manager/menu` writes
correctly via `menuAvailabilityService.setAvailable`, but **reads nothing**: it spreads adapter output
into `ManagerMenuItem` without an `available` field
([manager/menu/page.tsx:702-708](../app/staff/manager/menu/page.tsx#L702-L708)), so
`item.available !== false` is always true. `menuAvailabilityService.list()` — the endpoint built for
exactly this — **is never called anywhere in the codebase.** Phase 0's headline manager feature
writes and does not read.

### T14 — Delete copy is wrong

`MenuItem` uses `SoftDeletes` and `destroy()` calls `$menuItem->delete()`. The modal says
*"permanently removed from the menu and cannot be recovered"*
([page.tsx:1377](../app/admin/menu/page.tsx#L1377)). It is recoverable, and saying otherwise makes
admins avoid a safe action.

### T15 — Debug logging in production paths

`console.log` at [page.tsx:685](../app/admin/menu/page.tsx#L685),
[701](../app/admin/menu/page.tsx#L701), [1203](../app/admin/menu/page.tsx#L1203),
[1210](../app/admin/menu/page.tsx#L1210).

---

# Part 2 — Structure

**S1 — `MenuSubTabs` copy-pasted into 7 files.** `app/admin/menu/page.tsx`,
`menu/configure/page.tsx`, `menu-add-ons/page.tsx`, `menu-tags/page.tsx`, and three under
`staff/manager/menu/`. In **three different implementations** — the admin/menu and configure copies
prefix-match, the add-ons and tags copies use exact `pathname === tab.href`.

**S2 — `/staff/manager/menu` is a 1053-line clone of `/admin/menu`.** `ItemModal`,
`BulkImportModal`, `PriceDisplay`, `ActionMenu`, `ConfirmModal`, `ImagePicker` and the entire
option-sync sequence are duplicated verbatim. Every fix has to land twice — and T4/T13 show that it
already didn't.

**S3 — `app/staff/manager/menu/page.tsx.bak` is committed.** 52 KB of dead code in the repo.

**S4 — Zero reuse of `app/inventory/_components`.** That directory already exports `DataTable`
(sortable, paginated, skeleton loading, portal-based row menus, `needsAttention` highlighting),
`PageHeader`, `FilterBar`/`SearchBar`/`FilterSelect`, `SegmentedTabsLink`, `InventoryModal`
(scroll-lock, Escape-to-close, deliberately no click-outside-to-discard) and `FormPrimitives`
(`FormField`, `TextInput`, `Select`, `Toggle`, `PrimaryButton`). The menu pages hand-roll every one
of those, worse, four times over.

---

# Part 3 — Routes and information architecture

**R1 — The route tree contradicts the tab bar.** Tabs are Items / Add-ons / Tags / Configure, but the
routes are `/admin/menu`, `/admin/menu-add-ons`, `/admin/menu-tags`, `/admin/menu/configure`. Two of
four are *siblings* of `/admin/menu`, not children — which is why the sidebar needs a hardcoded
special case to stay highlighted:

```ts
// layout-client.tsx:95
(href === '/admin/menu' && (pathname === '/admin/menu-add-ons' || pathname === '/admin/menu-tags'))
```

**R2 — `/admin/menu/layout.tsx` is a 7-line metadata pass-through.** No shared shell, so every tab
re-renders its own header, tab bar and branch selector independently. `/admin/menu/smart-categories`
is a redirect-only page.

**R3 — Three different page headers, three different widths.** Items: "Menu Management" + item count,
`max-w-6xl`. Add-ons: "Menu Management" + "Manage add-ons for each branch", `max-w-4xl`. Configure:
**no `h1` at all** — it opens with a branch selector then an `h2`, `max-w-5xl`. The content visibly
jumps as you move across tabs.

**R4 — The branch selector appears three ways and means three things.** A bare select inside the
filter row (Items), a labelled select rendered only `if (branches.length > 1)` (Configure), a bare
select beside the Add button (Add-ons), and **absent** on Tags. Worse, its *meaning* differs: on
Items it is now a no-op (T2); on Add-ons and Configure it is real scoping, because
`menu_categories` and `menu_add_ons` still carry `branch_id` (handoff §6.3).

---

# Part 4 — UI/UX

**U1 — No pagination, sorting or column control** on a table that is 41 rows today and is the
business's core catalogue. `DataTable` provides all three.

**U2 — No bulk actions.** Taking a category off for the day is N individual toggles.

**U3 — The item modal is one 6-section scroll at `max-w-xl`:** basic info, pricing, add-ons, tags,
global availability, branch overrides — no grouping, no steps, no sticky footer. The options editor
inside it is a five-column CSS grid (`36px 1fr 1fr 90px 24px`) at that width; below ~500 px it is
unusable.

**U4 — The listing photo is only reachable in "Single price" mode.** In options mode there is no
listing-photo picker at all; `formToGlobalItem` quietly scavenges the first option's image
([page.tsx:167-172](../app/admin/menu/page.tsx#L167-L172)). Nothing in the UI says so.

**U5 — Three control shapes in one filter row:** category pills, a native `<select>` for branch, and
a search input — different heights, different radii, no shared container. Inventory puts these in a
single `FilterBar` card.

**U6 — Loading is a bare text line** ("Loading menu…"); `DataTable` renders skeleton rows.

**U7 — Empty state is generic.** "No items match your filters." — no distinction between *no items
exist*, *filters exclude everything*, and *this branch serves nothing*. Phase 2 fixed exactly this
wording for the POS; the admin page never got it.

**U8 — No optimistic/again feedback on Save.** The button reads "Saving…" through a sequence of up to
5 sequential network round-trips (item → options list → per-option PATCH/POST → per-option image →
branch-options). On a slow connection that is many seconds of a modal that looks stuck, and any
failure mid-sequence leaves the item half-written with no rollback.

---

# Part 5 — Do the other three tabs earn their place?

Investigated on request. Two of the three do not, in their current form.

## 5a — Add-ons: **built, priced, attachable, and never sold**

`menu_add_ons` and `menu_item_menu_add_on` exist. The admin editor lets you create add-ons, price
them, mark them per-piece, and attach them to dishes. Downstream, nothing reads any of it:

- **No order path touches them.** No reference to `add_on` in `Order`/`OrderItem`, cart, or any
  checkout service. No `add_on` column in any order migration — the only two migrations mentioning
  add-ons are the table and the item pivot themselves.
- **No frontend consumes them** outside the admin editor. Nothing in `app/pos`,
  `app/staff/new-order`, or the customer menu.
- The only backend consumers are `MenuAddOnController` and an eager-load in `MenuItemController`.

So an admin can spend an afternoon configuring add-ons and no customer can ever buy one. This also
recasts the handoff's IMS note — "add-ons never deduct" is not a recipe gap; they never deduct
because **they never sell.**

**Recommendation:** drop the Add-ons *tab* now; keep the tables and data (they are soft-deleted and
harmless). Reinstate it when ordering actually supports add-ons — at which point the work is in the
cart/checkout/POS, not here. Attaching add-ons in the item modal should go too, for the same reason.

> This one is a product call, not a technical one. Flagged rather than assumed.

## 5b — Tags: half of them duplicate Smart Categories, and can contradict them

Good news first: **`MenuTag` has no `branch_id`.** Tags are already global and need no unification.

The problem is overlap. Seeded tags (`MenuTagSeeder`) are `popular`, `new`, `spicy`, `vegetarian`.
Smart categories (`App\Enums\SmartCategory`) include `most-popular`, `new-arrivals`, `top-rated` —
each with a resolver that *computes* membership from real data (`PopularResolver`: items ordered most
frequently in the last 30 days).

Both are live customer-side **at the same time**: the customer menu sorts by the manual `popular` tag
at [(customer)/menu/page.tsx:44](<../app/(customer)/menu/page.tsx#L44>) *and* renders smart-category
rows from the resolver. A dish hand-tagged "Popular" that has not sold in a month will head the
"Most Popular" sort while being absent from the computed Most Popular row. Same for `new` vs
`new-arrivals`.

Second issue: **`rule_description` implies an automation that does not exist.** It is a plain text
column, rendered as a hint under each tag in the item modal
([page.tsx:563](../app/admin/menu/page.tsx#L563)). There is no rule engine behind it. A tag can
describe a rule it does not enforce.

**Recommendation:** tags keep only what cannot be computed — genuine attributes: `spicy`,
`vegetarian`, and future ones like halal / contains-nuts. Retire `popular` and `new` in favour of the
resolvers that already do the job properly, and drop the customer-side `popular` sort with them.
Either drop `rule_description` or rename it to `description`. That leaves Tags small enough to live
as a section inside Configure rather than a top-level tab.

## 5c — Configure: works, and is the strongest thing on this surface

Smart categories are genuinely well built — nine resolvers, per-branch caching with a 6-hour TTL, a
scheduled warm command, admin-tunable enable/limit/time-window, plus preview and reset-to-default
endpoints. No changes recommended beyond the shell.

Two notes:

- **Categories carry the same disease `menu_items` had.** `menu_categories` is
  `branch_id` + `UNIQUE(branch_id, slug)` — one "Basic Meals" row *per branch*. That is why the admin
  page has to dedupe category names before rendering
  ([page.tsx:900](../app/admin/menu/page.tsx#L900)) and why `categoryMap` keeps "the first occurrence
  of each category name" ([page.tsx:886-895](../app/admin/menu/page.tsx#L886-L895)) — a coin-flip as
  to which branch's category id an item gets filed under.
- The smart-category resolvers emit `EXTRACT(HOUR FROM …)`, which SQLite cannot parse. **This is the
  cause of the flapping test baseline** described in the handoff (3–6 failures depending on the wall
  clock), not a menu regression.

---

# Part 6 — Answers to the open design questions

## 6a — Does anything still need `branch_id`?

No. Per table:

| Table | `branch_id` today | Verdict |
|---|---|---|
| `menu_items` | legacy owning branch | **Drop** — handoff §6.2. `menu_item_branches` says where it is served. |
| `menu_categories` | `UNIQUE(branch_id, slug)` | **Drop** — a category is a name; one row per branch is duplication with a coin-flip id (5c). |
| `menu_add_ons` | `UNIQUE(branch_id, slug)` | Moot — see 5a. If add-ons return, they return global. |
| `menu_tags` | *none* | Already correct. |

**What genuinely varies by branch is exactly two things, and neither needs `branch_id` on the parent:**

1. **Is it on today** → `menu_item_branches.is_available` (pivot, exists, populated, correct).
2. **What does it cost here** → `menu_item_option_branch_prices` (exists).

Everything else — name, description, photo, options, category, tags, base price — is one company-wide
value. That is the whole thesis of Phase 3, and the admin editor is the last place still arguing with
it.

## 6b — Routes: separate pages *or* tabs that stay put? Both.

The premise that these are alternatives is the thing to correct. **A Next.js App Router `layout.tsx`
shared by sibling routes does not unmount when you navigate between those siblings** — React keeps
the layout mounted and swaps only the page slot. So a real `/admin/menu/layout.tsx` gives the
"header and tabs stay, only the data changes" behaviour *and* keeps real URLs, browser back, refresh
position, deep links and per-tab metadata. State-based tabs would buy nothing and cost all of that.

The inventory catalog already proves the pattern — `CatalogShell` + `SegmentedTabsLink`
([catalog/_components/CatalogTabs.tsx](../app/inventory/catalog/_components/CatalogTabs.tsx)).

Target tree — every tab a genuine **child** of `/admin/menu`:

```
app/admin/menu/
  layout.tsx          ← the shell: <h1>Menu</h1> + SegmentedTabsLink. Never unmounts.
  page.tsx            ← Items      (/admin/menu)
  tags/page.tsx       ← Tags       (/admin/menu/tags)
  configure/page.tsx  ← Configure  (/admin/menu/configure)
```

Removed: `/admin/menu-add-ons` and `/admin/menu-tags` (siblings pretending to be children — the
reason `layout-client.tsx:95` needs its hardcoded special case), `/admin/menu/smart-categories` (a
redirect-only page), and the Add-ons tab per 5a. Leave permanent redirects on the two old paths for
bookmarks.

Items stays at `/admin/menu` rather than `/admin/menu/items` — the sidebar's "Menu" link then lands
directly on the thing people want, with no redirect hop.

## 6c — One width, one shell

Today: Items `max-w-6xl`, Add-ons `max-w-4xl`, Configure `max-w-5xl`, no shared `h1`. Inventory has
already settled this question — **`max-w-6xl` in 48 of its files**, against 5 at `max-w-5xl`. The
shell sets it once and no page sets it again.

The Items table needs the room: name + description + category + price + per-branch availability does
not fit at `max-w-4xl`, which is why descriptions are `truncate`d to a single grey line today.

## 6d — Accordion rows for the Items table

Right instinct, and it fixes a real blind spot. **Options are currently invisible.** `PriceDisplay`
([page.tsx:92-115](../app/admin/menu/page.tsx#L92-L115)) crushes them into either four pills or a
bare `₵min – ₵max` range — so for anything with five or more options you cannot see what they are, or
what each costs, without opening the modal.

Expanding a row should show one line per option: label, receipt name, base price, per-branch price
where set, and the stock verdict from the gate. That makes the table the place you *read* the menu,
leaving the modal for editing only.

`DataTable` has no expansion support today. Add it as an optional prop —

```ts
expandedContent?: (row: T) => ReactNode;   // renders a full-width <tr> beneath the row
```

— so it lands as a reusable capability the inventory pages get too, not a menu-only fork.

---

# Part 7 — Build order

Sequenced so nothing depends on work that has not landed.

### Step 1 — Stop the page lying (backend + adapter, no UI)

Smallest change, biggest honesty return. Nothing visual.

1. Carry `is_available`, `rating`, `rating_count` through `menu.adapter.ts`. Kills T4, T5, T12.
2. Add `GET /admin/menu-items` under `permission:manage_menu`, returning the pivot
   (`branches: [{id, name, is_available}]`) alongside the item. Kills T2, T3; unblocks the matrix.
3. Stop sending `slug` on update in `saveItem`. Kills T6.
4. Read the `PUT /branch-options` response and surface `skipped_branch_ids`. Kills the *silence* in
   T1 immediately, before the endpoint itself is fixed.

### Step 2 — The shell and the routes (6b, 6c)

Real `/admin/menu/layout.tsx` with `PageHeader` + `SegmentedTabsLink` at `max-w-6xl`. Move tags in,
drop add-ons and smart-categories, add redirects, delete all 7 copies of `MenuSubTabs` (S1) and the
sidebar special case (R1). Pure structure — no data behaviour changes, so it can land beside Step 1.

### Step 3 — Items table on `DataTable` + accordion (6d, U1/U5/U6)

`FilterBar` + `SearchBar` + `FilterSelect` for filters; `DataTable` with the new `expandedContent`
for the table. Sorting, pagination and skeletons arrive free.

### Step 4 — Branch availability matrix (handoff §6.1)

Replace the per-item Branch dropdown and the dead Branch Overrides panel with one matrix:
rows = dishes, columns = branches, cell = served / sold out / not served, plus branch price where set.

- Availability rides `MenuItemAvailabilityController` — **already exists, already correct, already
  writes the pivot with `syncWithoutDetaching`, already has the admin bypass.**
- `MenuItemBranchOptionController` gets rewritten to resolve branches through `menu_item_branches`
  instead of sibling rows. Kills T1, T7, T8, T9.
- Fix T13 in the same pass — one call to the `menuAvailabilityService.list()` that already exists.

### Step 5 — Split the file, delete the clone

`/admin/menu/page.tsx` → `_components/{ItemsTable,ItemModal,BulkImportModal,BranchMatrix}.tsx`. Point
`/staff/manager/menu` at the same components behind its `canEditMenu` gate; delete the clone and the
`.bak` (S2, S3).

### Step 6 — Contract migration (handoff §6.2)

With the editor no longer reading or writing `menu_items.branch_id`, dropping the column and changing
`UNIQUE(branch_id, slug)` → `UNIQUE(slug)` has no frontend blocker left. Do `menu_categories` in the
same migration (6a) — it is the same shape and the same fix.

**Order matters:** `MenuItem::scopeServedAt()` keeps a legacy `branch_id` fallback, and removing it
before every item has a pivot row would empty every menu in the business. Pivot first, verify, then
drop.
