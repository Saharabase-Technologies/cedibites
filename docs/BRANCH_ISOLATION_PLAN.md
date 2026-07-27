# Branch Isolation — Implementation Plan

Companion to [BRANCH_SEPARATION_AUDIT.md](./BRANCH_SEPARATION_AUDIT.md), which explains *why*.
This doc is the build order.

Backend paths are relative to `cedibites_api/cedibites_api`. Frontend paths are relative to this repo.

---

## Decisions locked (2026-07-27)

| Question | Decision |
|---|---|
| Do branches serve different dishes? | **No.** Same institution, different POS. One menu, same everywhere. |
| Can a manager edit the menu? | **No.** Nothing. Not name, not description, not price. |
| Can a manager set a branch price? | **No.** Even per-branch prices are set by the admin. |
| Can a manager set availability at their branch? | **Yes** — the only menu power they keep ("we're out of Jollof today"). |
| Can a manager manage staff? | **No.** No create, no edit, no role changes, no disabling access. |
| Can a manager keep notes on their staff? | **Yes** — read, write, edit **and delete** their own notes. That's it. |
| Can a manager delete orders? | **No.** Admin only. |
| Can a sale go through with no stock? | **No.** No stock, no sale. See Phase 4. |

Everything below follows from these.

---

## Status

| Phase | State |
|---|---|
| 0 — Permissions foundation | **Done**, not committed. `ManagerScopeTest` — 36 tests. |
| 1 — Access isolation (API) | **Done**, not committed. `BranchIsolationTest` — 42 tests. Frontend follow-up outstanding, see §1.6. |
| 2 — Branch provisioning | Not started |
| 3 — Menu unification | Not started |
| 4 — No stock, no sale | Not started |

Backend suite after Phases 0+1: **409 passed, 6 failed** — the same 6 pre-existing failures as
before this work (4 `SmartCategoryTest`, `EXTRACT` is not SQLite-compatible; 2
`SecurityHardeningTest`).

---

## Phase 0 — Permissions foundation

Do this first. Every later phase leans on it, and Phase 3 is **unsafe without it** — once the
menu is global, a manager holding `manage_menu` can change every branch's menu at once.

### 0.1 New permissions

Use the dotted namespace convention (matches the IMS-era permissions in `app/Enums/Permission.php`).

| Permission | What it allows | Granted to |
|---|---|---|
| `menu.availability.manage` | Toggle a menu item on/off **at branches you are assigned to**. No price, no name, no create, no delete. | manager, admin, tech_admin |
| `employee.notes.manage` | Read, create and edit notes on employees **at branches you are assigned to**. | manager, admin, tech_admin |
| `branch.operate` | Open/close, manual override, extended staff/order access — **for branches you are assigned to**. | manager, admin, tech_admin |

### 0.2 Manager role, after

Remove from `RoleSeeder`:

- `ManageMenu` → admin only. Replaced by `menu.availability.manage`.
- `ManageEmployees` → admin only. Replaced by `employee.notes.manage`.
- `ManageBranches` → admin only. Replaced by `branch.operate`.

Keep, unchanged: `ViewOrders`, `CreateOrders`, `UpdateOrders`, `ViewMenu`, `ViewBranches`,
`ViewCustomers`, `ManageCustomers`, `ViewEmployees`, `ViewAnalytics`, `AccessManagerPortal`,
`AccessPos`, `AccessKitchen`, `AccessOrderManager`, `ManageShifts`, `ViewMyShifts`, and the
whole IMS block (that side is already correct).

- `DeleteOrders` → admin only. Managers keep the existing cancel-request flow.

**No action needed:** `ManageSettings` gates no route anywhere — it is a frontend nav flag only
(`RoleController:95`). Harmless, leave it.

### 0.3 Migration seeder for existing environments

`RoleSeeder::addPermissions()` only ever *adds* — it never revokes. Prod and beta already have
managers holding `manage_menu`, `manage_employees` and `manage_branches`. Follow the existing
pattern (`WarehouseManagerCleanup2Seeder`) and write a `ManagerScopeCleanupSeeder` that
explicitly revokes the three and grants the three new ones.

- [x] Add three permissions to `Permission` enum (`PermissionSeeder` loops the enum, so no edit needed)
- [x] Amend manager grants in `RoleSeeder`
- [x] Write `ManagerScopeCleanupSeeder` to revoke on existing environments
- [x] Wire it into `deploy.yml` and `deploy-beta.yml` beside `WarehouseManagerCleanup2Seeder`
- [x] Add labels/descriptions to `RoleController` so they render in the staff UI

**Free win:** `EmployeeResource` already gates HR PII (SSNIT, Ghana Card, TIN, DOB, emergency
contacts) behind `manage_employees`. Taking that permission off the manager hid the PII from them
automatically — no resource change was needed.

---

## Phase 1 — Access isolation

No schema change. No migration risk. Ships independently of everything else.

### 1.1 The one-word fix: analytics

`routes/admin.php:133` gates ~28 analytics endpoints on `permission:view_orders`, which **every
staff role holds**. `Permission::ViewAnalytics` already exists, is already granted to exactly the
right roles (admin, tech_admin, manager, branch_partner) and is **used in zero routes**.

- [x] Swap `permission:view_orders` → `permission:view_analytics` on the analytics group
- [x] Same for `admin/reports/*` (nested inside it) and `admin/dashboard`
- [x] `admin/payments*` too — the payment ledger is financial reporting, not order handling

That alone closes the "cashier reads company revenue" hole.

### 1.2 Route gating

**Changed approach from the original plan.** A blanket `role:admin|tech_admin` on the `/admin/*`
prefix would have broken both the manager and partner portals, which legitimately read
`/admin/analytics`, `/admin/employees`, `/admin/customers` and `/admin/branches`. The URL prefix
was never the problem — the wrong permission and the missing scope were. So:

- [x] Correct the permission on each group (§1.1)
- [x] Scope every controller to the caller's branches (§1.3)
- [x] Role-gate only the endpoints that are genuinely admin-only (contacts export)
- [ ] Add `branch.access` to every `/{branch}` route a non-admin can reach — `routes/manager.php`
      already has it; `admin/branches/{branch}/*` still relies on the controller scope

> **Trap — `EnsureBranchAccess` fails open.** Lines 30-34: if the route has no `{branch}`
> parameter it calls `$next($request)` and waves the request through. Putting `branch.access` on
> `/employees/{employee}` or `/orders/{order}` does **nothing**. Either add an
> `EnsureEmployeeBranchAccess` middleware for employee-bound routes, or make the existing
> middleware fail closed when it finds no branch to check. Fail-closed is the better fix.

### 1.3 Controller scoping

| Done | File | Fix |
|---|---|---|
| [x] | `OrderController::show` | Added `canAccessOrder()`: the customer who placed it, or staff at the owning branch, or an admin. 404 rather than 403 so it does not confirm the order exists. |
| [x] | `OrderController::update` | Same guard, 403. |
| [x] | `OrderController::destroy` | Same guard, 403. Manager also lost `delete_orders` in Phase 0. |
| [x] | `OrderController::kitchenOrders` | Branch-scoped, copying `orderManagerOrders` directly above. Stale "public, no auth required" docblock corrected. |
| [x] | `AdminAnalyticsController` | `restrictPartnerBranchScope()` → `restrictBranchScope()`, now applying to everyone except admin/tech_admin. New `assignedBranchIds()` helper. `getRevenueTargets` scoped too — it listed every branch's target. |
| [x] | `AdminDashboardController` | Branch list and live-orders feed scoped to the caller's branches. |
| [x] | `EmployeeController::index` | Scoped to the caller's branches (was `branch_partner` only). HR PII handled free by Phase 0. |
| [x] | `PaymentController::index/stats/show` | Scoped. `show` had the same IDOR as orders. |
| [x] | `AnalyticsService::getPaymentStats` | Taught to honour `branch_ids`; it only understood `branch_id`, so the new scope would have silently done nothing. |
| [x] | `CustomerController::exportContacts` | Behind `role:admin|tech_admin`, declared before the `{customer}` wildcard so it is not swallowed. |
| [ ] | `ShiftController::startShift` | Validate `branch_id` against the employee's assigned branches. **Still outstanding.** |

### 1.4 Employee notes — manager-safe surface

Notes currently sit under `/admin/employees/{employee}/notes` gated on `manage_employees`, which
the manager is about to lose.

- [x] Regrouped the note routes under `permission:employee.notes.manage` (they stay under the
      `/admin` prefix — the prefix was never the gate, the permission is)
- [x] Guard on the target employee sharing a branch with the caller — new
      `EmployeeController::sharesBranchWith()`, 404 not 403
- [x] **Added the missing `PATCH`.** `EmployeeController` had only `addNote` and `deleteNote`.
- [x] Edit **and** delete restricted to the note's own `author_id`; delete now writes an activity
      log entry so the record of who removed what survives the note
- [x] Fixed `addNote` returning 200 for a creation — `response()->success()` takes only
      `($data, $message)`, so the `201` third argument had always been silently dropped

### 1.5 Public endpoint hygiene

- [x] `today_orders` / `today_revenue` are attached only for a caller who holds `view_analytics`
      **and** is assigned to that branch. Unauthenticated callers get menu, hours and address only.
      No frontend consumer read those fields off the branch list, so nothing broke.
- [x] `GET /orders/by-number/{orderNumber}` throttled to 20/min. **Not fully closed** — see below.
- [ ] Consider requiring `branch_id` on the public `GET /menu-items` so it can't dump every
      branch's catalogue in one call.

> **`orders/by-number` is mitigated, not fixed.** It must stay unauthenticated: it is where the
> payment gateway redirects a guest after paying, and they have no account. The response carries
> no customer name, phone or address, so the exposure is *what* was ordered rather than *who*
> ordered it — but sequential order numbers still let someone walk the history and read off each
> branch's daily volume. Throttling makes that impractical rather than impossible. The real fix is
> a per-order tracking token in the URL, which is a contract change across checkout, the printed
> receipt and the gateway redirect. Worth doing; deliberately not done here.

### 1.6 Frontend follow-up — outstanding

The backend now lets a manager keep notes, but **there is no screen for it**. Managers cannot
reach `/admin/*` in the UI (`access_admin_panel`, admin-only) and the manager portal has no staff
notes page. `employee.service.ts` has get/post/delete and no `patch`.

- [ ] Manager-portal staff notes screen (list, add, edit own, delete own)
- [ ] `updateNote` method in `lib/api/services/employee.service.ts`
- [ ] Manager availability-toggle screen for `menu.availability.manage` (no route consumes that
      permission yet — it is granted but not yet wired to an endpoint; that lands with Phase 3)

---

## Phase 2 — Branch provisioning

Unblocks the test branch **on the current schema**. Does not wait for Phase 3.

### 2.1 `BranchProvisioningService`

One code path that runs on branch creation:

1. Create the branch (existing).
2. Create its `inventory_locations` row (`type: satellite`, `branch_id` set). Nothing does this
   today, which is why a new branch's manager is silently locked out of IMS.
3. Make the menu available at the branch — clone rows under the current schema, or insert pivot
   rows once Phase 3 lands.

- [ ] Write the service, call it from `BranchController::store`
- [ ] Backfill command for branches that already exist without a location
- [ ] Extend `php artisan inventory:scope-check` to assert every active branch has a location

### 2.2 Stop the silent failures

- [ ] `RecipeDeductionService::resolveDeductionLocation:190` falls back to the **warehouse** when
      a branch has no location — a sale at a new branch quietly eats Mother Kitchen's stock.
      Make it raise an alert, or refuse, rather than debit the wrong store.
- [ ] POS shows a blank grid when a branch has no menu. Fix
      [app/pos/terminal/page.tsx:265](../app/pos/terminal/page.tsx#L265) — `??` does not fire on
      `[]`, so an empty list passes straight through the fallback. Show
      **"No menu configured for this branch"**.
- [ ] `MenuItemBranchOptionController::update()` `continue`s silently when a branch has no sibling
      row — the UI reports success and writes nothing. Return which branches were skipped.

---

## Phase 3 — Menu unification

Decision: **branches serve the same dishes, prices may differ.** So the menu becomes global with a
branch availability pivot, mirroring how `inventory_locations` references a branch.

### 3.1 Target schema

```
menu_items          drop branch_id;  UNIQUE(slug)
menu_categories     drop branch_id;  UNIQUE(slug)
menu_add_ons        drop branch_id;  UNIQUE(slug)

menu_item_branches  (menu_item_id, branch_id, is_available)   -- NEW: where it's served
menu_item_option_branch_prices                                 -- EXISTS: per-branch price
```

All three tables carry `branch_id` + `UNIQUE(branch_id, slug)` today and need identical treatment.
Plan them as **one migration**, not three.

### 3.2 Why this is safer than it looks

`order_items` stores `menu_item_snapshot`, `menu_item_option_snapshot`, `unit_price` and
`subtotal` on every line, and **every** creation path populates them — `CheckoutSessionController`,
`OrderController`, `PosOrderController`. Historical orders do not read the live menu. Repointing
`menu_item_id` to a surviving row **cannot rewrite a past receipt or a revenue figure.**

### 3.3 Expand → migrate → contract

Never leave prod mid-flight.

1. **Expand.** Add `menu_item_branches`. Dual-write alongside `branch_id`.
2. **Backfill.** Group by slug, pick a survivor per group, insert pivot rows for every branch that
   had a sibling, and lift each sibling's option prices into `menu_item_option_branch_prices`.
3. **Repoint** to the survivor: `order_items`, `cart_items`, `inventory_recipes`,
   `promo_menu_items`, `menu_item_ratings` (merge and dedupe on `customer_id`),
   `menu_item_menu_tag`, `menu_item_menu_add_on`.
4. **Switch reads.** `MenuItemController`, `BranchResource`, `MenuItemBranchOptionController`,
   POS terminal, `MenuDiscoveryProvider`, smart categories.
5. **Contract.** Soft-delete the losers, drop `branch_id`, change `UNIQUE(branch_id, slug)` →
   `UNIQUE(slug)`.

- [ ] Build step 2 as an artisan command with `--dry-run` that prints the merge plan — which slugs
      have siblings, which prices diverge, which ratings collide — so it can be eyeballed against
      prod before anything writes.

### 3.4 What this fixes for free

- **Recipes start working at every branch.** `inventory_recipes` keys on `menu_item_option_id`.
  Today each branch has its own option IDs, so the 59 Ashaiman recipes match nothing at a second
  branch and `RecipeDeductionService` hits `continue` — **stock deduction silently does nothing.**
  One set of options means one set of recipes that works everywhere.
- **`inventory_recipes.branch_id` becomes useful.** It is dead weight today (per-branch option IDs
  already encode the branch — the `AshaimanRecipeSeeder` docblock says so). Under a global menu it
  becomes a genuine per-branch override for when one branch uses a bigger portion.
- **Promos apply everywhere.** `promo_menu_items` keys on `menu_item_id`; today a promo lands at
  one branch only.
- **Ratings stop resetting.** `menu_item_ratings` is `UNIQUE(customer_id, menu_item_id)` and
  `rating`/`rating_count` live on the branch row, so a new branch shows every dish as unrated.
- **Basket affinity and demand forecast stop fragmenting.** They key on
  `menu_item_option_id`/`menu_item_id` (`AnalyticsService:1415-1423`), so cross-branch pairs are
  counted as unrelated and every pairing looks weaker than it is.
- **Top items stop being string-fragile.** They group by `menu_items.name`, so they merge across
  branches today — until someone types "Jollof rice" at a new branch and it splits in two.

### 3.5 Frontend follow-up

- [ ] Admin menu editor: one item, a branch availability matrix, and admin-only price fields
- [ ] Manager menu screen: **availability toggles only**, for their own branches, no price inputs
- [ ] POS: pass `branch_id` to the menu API instead of downloading every branch's menu and
      filtering client-side ([app/pos/terminal/page.tsx:176](../app/pos/terminal/page.tsx#L176))

---

## Phase 4 — No stock, no sale

**Decision: a sale cannot go through when the ingredients aren't there.** This reverses today's
behaviour, which is documented as *low stock does NOT block a sale* — deduction is a
fire-and-forget side effect that lets the balance go negative and raises an alert
(`Alert::raiseNegativeStock`, `RecipeDeductionService:119`).

### 4.1 Hard dependency on Phase 3

The check computes demand **from the recipe**. No recipe means no demand means "always in stock",
so the rule is inert wherever recipes are missing — which today is every branch except Ashaiman,
because recipes key on `menu_item_option_id` and each branch has its own option IDs.

**Phase 4 must not ship before Phase 3**, or it will read as working while silently checking
nothing at exactly the branches it was written for.

### 4.2 Operational risk — read this before building it

Blocking sales couples the till to the accuracy of the stock ledger. When the ledger drifts — and
it drifts, which is why reconciliation exists — the POS refuses to sell food that is physically
on the shelf, in front of a customer, at the counter. That is lost revenue and a bad moment for
the cashier.

Mitigations to build in from the start, not bolt on later:

- **Check at the point of adding to the cart**, not at payment. Refusing after the customer has
  paid attention and money is far worse than greying out the item.
- **A supervisor override**, logged with who overrode and why. There will be legitimate cases
  (a delivery arrived and hasn't been recorded yet) and the rule must not strand the branch.
- **Block on the ingredient, name the ingredient.** "Out of stock" is useless to a cashier;
  "no chicken at Ashaiman" tells them what to go and check.
- **Add-ons never deduct** today, so they can never block. Either give them recipes or state
  plainly that add-ons are exempt.

### 4.3 Build

- [ ] `StockAvailabilityService` — given branch + menu option + quantity, resolve the recipe,
      resolve the location, and report which ingredients (if any) fall short
- [ ] POS: call it as the cart is built; disable the item and show the short ingredient
- [ ] `PosOrderController::store` — re-check server-side before the order is written. The client
      check is UX; this one is the rule.
- [ ] Supervisor override path with an activity-log entry
- [ ] Decide and document the add-on exemption

---

## Test plan

There is currently **no test anywhere** asserting branch isolation outside IMS. That is why none
of this was visible. `tests/Feature/Inventory/LocationScopeTest.php` is the template.

Write these **alongside** Phase 1, not after:

- [ ] A cashier cannot read, list or update an order belonging to another branch
- [ ] A cashier gets 403 on `/admin/analytics/*`, `/admin/dashboard` and `/admin/reports/*`
- [ ] A cashier gets 403 on `customers/export-contacts`
- [ ] A manager's analytics request **without** `branch_id` returns only their own branches
- [ ] A manager's analytics request **with** another branch's `branch_id` returns nothing, not a 500
- [ ] A manager cannot set any role or permission (403 on the employee update route)
- [ ] A manager cannot create, edit or deactivate an employee
- [ ] A manager cannot delete an order
- [ ] A manager **can** read, create, edit and delete their **own** notes on an employee at their branch
- [ ] A manager cannot edit or delete a note written by someone else
- [ ] A manager cannot touch notes on an employee at another branch
- [ ] A manager cannot edit a menu item, its name, or any price
- [ ] A manager **can** toggle availability at their own branch, and only there
- [ ] A manager cannot create, edit or delete a branch
- [ ] Kitchen orders are branch-scoped, with and without a `branch_id` param
- [ ] A branch with no menu returns an empty POS menu **and a clear message**, not a blank screen
- [ ] Every active branch has an inventory location (guards the Phase 2 provisioning)

---

## Order of work

```
Phase 0  ─┬─> Phase 1  ──> ship
          │
          └─> Phase 2  ──> ship  (unblocks the test branch)
                   │
                   └─> Phase 3  ──> ship
                            │
                            └─> Phase 4  ──> ship
```

Phase 0 gates everything. Phase 1 and Phase 2 are independent of each other and can run in
parallel. **Phase 3 must not start until Phase 0 has shipped to prod** — a global menu plus a
manager holding `manage_menu` means one person editing every branch at once. **Phase 4 must not
start until Phase 3 has shipped** — see §4.1.

---

## Open items

1. `recoverable_password` stores a decryptable copy of every staff password and
   `PlatformController` serves it. Tech-admin only today, so it is not urgent once Phase 0 closes
   the escalation path — but it should not exist long term.
2. Add-ons never deduct stock, so under Phase 4 they can never block a sale. Give them recipes,
   or state the exemption. (§4.2)
