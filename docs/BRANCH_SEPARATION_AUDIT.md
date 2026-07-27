# Branch Separation Audit — 2026-07-27

Audit of how CediBites keeps one branch's data, money and people separate from another's.
Covers menu, orders/sales, POS, kitchen, analytics, staff, shifts, customers, inventory and realtime.

Frontend paths are relative to the Next.js repo. Backend paths are relative to `cedibites_api/cedibites_api`.

---

## 1. The one-paragraph answer

Branch separation is **half-built**. The parts that were built deliberately — the POS
order-writing path, the employee order feed, shifts, the whole inventory module, and the
realtime order channels — are properly locked down and work. But **the entire admin API
surface has no branch scoping at all**, and it is gated on permissions that ordinary
cashiers hold. Today, a cashier's login token can pull company-wide revenue, every
branch's daily takings, every staff member's sales figures, and the full customer contact
list. A branch manager's token can promote themselves to `tech_admin`. Those are not
theoretical — they are three or four HTTP calls with a normal staff token.

The POS menu problem you spotted is **not a bug**. It is branch separation working
correctly on a design that requires you to physically duplicate the menu into each new
branch, and nobody did that for the test branch.

---

## 2. How branch separation is meant to work

Two different models exist in the codebase at the same time, and they contradict each other.

### Model A — each branch owns its own copy of the menu

`menu_items` has a `branch_id` column and a `UNIQUE (branch_id, slug)` index
(`database/migrations/2025_02_20_000006_create_menu_items_table.php`). Same for
`menu_categories` and `menu_add_ons`. So "Jollof Rice" at Ashaiman and "Jollof Rice" at
the test branch are **two separate rows with two separate IDs**, linked only by having the
same `slug`.

`MenuItemBranchOptionController` calls these "siblings" and matches them by slug. This is
the model the system actually runs on.

### Model B — one menu, per-branch price overrides

`menu_item_option_branch_prices` lets a single option carry a different price and
availability per branch. The admin menu editor exposes this as the "per-branch overrides"
panel ([app/admin/menu/page.tsx:589-628](app/admin/menu/page.tsx#L589-L628)).

### Why that's a problem

Model B only ever fires on rows that already exist under Model A. In
`MenuItemBranchOptionController::update()`, if the branch has no sibling row the code does
`continue` — **silently**. No error, no warning. So an admin can open the per-branch price
panel for the test branch, type prices, hit save, get a success toast, and **nothing has
been written**. The item does not exist at that branch, so there was nothing to override.

The two models need to be reconciled. Either the menu is global with per-branch overrides,
or it is duplicated per branch — running both means the UI lies to you.

---

## 3. Your POS bug: why the test branch shows no menu items

### The chain

1. The POS terminal fetches **all** menu items across **all** branches with no branch
   filter: [app/pos/terminal/page.tsx:176](app/pos/terminal/page.tsx#L176) —
   `useMenuItems({ is_available: true })`.
2. It then filters them **client-side** against an ID list for the current branch:
   [app/pos/terminal/page.tsx:264-272](app/pos/terminal/page.tsx#L264-L272).
3. That ID list comes from `BranchProvider`, which reads `menu_items` off the branch
   payload: [app/components/providers/BranchProvider.tsx:93](app/components/providers/BranchProvider.tsx#L93) —
   `apiBranch.menu_items?.map(...) ?? []`.
4. The test branch has **zero rows in `menu_items` with its `branch_id`**, so the API
   returns `menu_items: []`.
5. `menuItemIds` becomes `[]`. The fallback on line 265 is `??`, which only fires on
   `null`/`undefined` — an empty array passes straight through.
6. Filter against an empty list → **empty POS menu.**

### So it is a data gap, not a code gap

The test branch was created without a menu. `BranchSeeder` only ever seeds Ashaiman, and
`MenuSeeder` seeds against that one branch. Nothing in the app clones a menu when you
create a branch.

### How to confirm on prod

```sql
SELECT b.id, b.name,
       COUNT(mi.id) FILTER (WHERE mi.deleted_at IS NULL) AS menu_items,
       COUNT(mc.id) FILTER (WHERE mc.deleted_at IS NULL) AS categories
FROM branches b
LEFT JOIN menu_items mi ON mi.branch_id = b.id
LEFT JOIN menu_categories mc ON mc.branch_id = b.id
GROUP BY b.id, b.name ORDER BY b.id;
```

Or with no DB access, just hit the public endpoint: `GET /api/v1/branches` and count
`menu_items` per branch.

### Three ways to fix it

| Option | What it does | Effort |
|---|---|---|
| **Clone-on-create** (recommended) | When a branch is created, copy every category, item, option and add-on from a chosen source branch, keeping slugs identical so the sibling/override machinery works | Medium — one service + a hook in `BranchController@store` |
| **Bulk import** | Use the existing `POST /admin/menu-items/bulk-import` with `branch_id` for the test branch | Low — works today, manual per branch |
| **Flip to a global menu** | Drop `branch_id` from `menu_items`, make availability purely an override table | High — schema change, touches POS, customer menu, recipes, analytics |

Also worth fixing regardless: line 265's `??` should be a length check, so a branch with no
menu shows **"No menu configured for this branch"** instead of a silent blank grid. Right
now the operator cannot tell the difference between "loading", "no items" and "misconfigured".

---

## 4. Area-by-area findings

### 4.1 Menu — ⚠️ partly working

| | |
|---|---|
| ✅ Works | Customer menu is properly branch-scoped — `MenuDiscoveryProvider` passes `branch_id` to the API |
| ✅ Works | POS **cannot** sell another branch's item — `PosOrderController::validateMenuItems()` rejects any item whose `branch_id` doesn't match |
| ❌ Gap | New branches get no menu. Nothing clones it. |
| ❌ Gap | Per-branch price overrides silently no-op when the sibling row is missing |
| ⚠️ Risk | `GET /menu-items` is **public and unscoped** — omit `branch_id` and you get every branch's items and prices |
| ⚠️ Waste | POS downloads every branch's entire menu on every load, then throws most of it away client-side |

### 4.2 Orders and sales — ⚠️ mixed, with two real holes

| | |
|---|---|
| ✅ Works | `EmployeeOrderController` → `OrderManagementService::getBranchOrders()` scopes correctly: admins see all, everyone else is restricted to their assigned branches, and a forged `branch_id` returns an empty set rather than another branch's data |
| ✅ Works | `EmployeeOrderController::updateStatus()` checks branch membership before allowing a status change |
| ✅ Works | `PosOrderController::verifyStaffAuthorization()` — you cannot ring up a sale at a branch you're not assigned to |
| ✅ Works | Order Manager feed (`OrderController::orderManagerOrders`) scopes to assigned branches and 403s on a foreign `branch_id` |
| 🔴 **Hole** | `GET /orders/{id}` (`OrderController::show`, line 329) has **no ownership or branch check whatsoever**. Any logged-in user — any customer, any cashier at any branch — can read any order by its numeric ID: customer name, phone, delivery address, items, totals. Classic IDOR. |
| 🔴 **Hole** | `PATCH /orders/{id}` (`OrderController::update`, line 339) is gated on `update_orders` only — **no branch check**. Sales staff, kitchen, riders and call-centre agents all hold that permission. Any of them can change the status, reassign, or rewrite the delivery address of **any order at any branch**. `UpdateOrderRequest::authorize()` returns `true`. |
| ⚠️ Risk | `GET /orders/by-number/{orderNumber}` is **public, no auth** (`routes/public.php`), and order numbers are sequential and trivially guessable — `A001, A002 … A999, B001` (`OrderNumberService`). Anyone can walk the whole order history: items, quantities, prices, totals, branch, timeline. A competitor can measure your daily volume per branch. |
| ⚠️ Risk | `DELETE /orders/{id}` is gated on `delete_orders` (managers hold it) with no branch check — a manager can delete another branch's orders |

### 4.3 Kitchen — ⚠️ not scoped

`OrderController::kitchenOrders` (line 308) treats `branch_id` as an **optional query
filter** with no validation. Omit it and you get every branch's live kitchen queue. The
docblock still says "public, no auth required" — the route now requires `access_kitchen`,
but the code was never brought in line. Kitchen staff at the test branch can watch the main
branch's tickets.

Compare with `orderManagerOrders` right above it, which does this correctly — that's the
pattern `kitchenOrders` should copy.

### 4.4 Analytics — 🔴 no branch separation at all

This is the biggest gap.

Every endpoint under `/admin/analytics/*` (~28 of them: sales, revenue trend, top items,
staff sales, branch performance, customer lifecycle, demand forecast, revenue targets…) is
gated by a single middleware: `permission:view_orders` (`routes/admin.php:133`). The
`admin` prefix group itself carries **no role gate** (line 22).

Who holds `view_orders`? From `RoleSeeder`: **admin, tech_admin, manager, call_center,
kitchen, rider, sales_staff, branch_partner** — that is every staff role in the business.

The only branch enforcement anywhere in that controller is `applyPartnerScope()`, which
restricts `branch_partner` and nobody else. For everyone else, `branch_id` is a filter the
**client chooses**:

- The manager analytics page sets `branch_id` from `staffUser.branches[0].id`
  ([app/staff/manager/analytics/page.tsx:630](app/staff/manager/analytics/page.tsx#L630)) — a client-side decision.
- The admin analytics page reads it from a URL query param `?branch=`.

Drop the parameter and the server happily returns **company-wide** figures.

**Net effect:** a cashier at the test branch, using their own valid token, can call
`GET /api/v1/admin/analytics/sales` and see total company revenue; `…/staff-sales` and see
every colleague's sales at every branch; `…/branch-performance` and see a full branch
league table. No exploit needed — just the URL.

Same story for `GET /admin/dashboard` (`AdminDashboardController`, line 21): it loads
`Branch::where('is_active', true)` unconditionally and returns today's revenue and order
count for **every** branch plus the last 10 live orders company-wide. `$user` is read on
line 22 and used only to print a name.

The frontend admin UI *is* walled off (`access_admin_panel`, which only admins hold —
[app/admin/layout-client.tsx:192](app/admin/layout-client.tsx#L192)). But that is a UI gate,
not an API gate. The API doesn't check `access_admin_panel` anywhere.

### 4.5 Staff — 🔴 privilege escalation

`PATCH /admin/employees/{employee}` is gated on `manage_employees`, which **managers hold**
(`RoleSeeder`). The controller has:

- **no branch check** — a manager can edit an employee at any other branch
- **no self-edit guard** — a manager can edit their own record
- **no role-ceiling check** — `UpdateEmployeeRequest` line 36 accepts any value from the
  `Role` enum, including `admin` and `tech_admin`, and `authorize()` returns `true`
- **no permission-ceiling check** — `permissions.*` accepts any permission that exists in
  the table, and the controller does `syncPermissions()` with it verbatim

So a branch manager can `PATCH` their own employee record with `{"role": "tech_admin"}` and
become a platform administrator. They can also `sync` `branch_ids` to assign themselves (or
anyone) to any branch, which then unlocks all the *correctly*-scoped endpoints for that
branch too.

Additionally, `EmployeeController::index` is scoped for `branch_partner` only — a manager
with `view_employees` sees the full company staff roster, including HR fields (SSNIT
number, Ghana Card ID, TIN, date of birth, emergency contacts).

**Note:** `recoverable_password` stores a decryptable copy of staff passwords (encrypted
cast, so reversible with the app key) and `PlatformController` serves it over the API. That
is tech_admin-only today, but combined with the escalation above it means the escalation
path ends in *readable staff passwords*.

### 4.6 Shifts — ✅ mostly good

`ShiftController` is one of the better-scoped controllers: admins see everything, managers
see their assigned branches, everyone else sees only their own shifts. `getActive`,
`endShift` and `addOrder` all check `employee_id` ownership. Good.

One gap: `startShift` writes `'branch_id' => $request->branch_id` with no check that the
employee is assigned to that branch. A cashier can open a shift at a branch they don't work
at, which pollutes that branch's shift and labour reporting.

### 4.7 Customers — ⚠️ global by design, but the export is a risk

Customers are not branch-scoped at all — one global list. For a food business that is a
defensible design choice (a customer orders from whichever branch is nearest).

The risk is `GET /admin/customers/export-contacts` (`routes/admin.php:53`), gated on
`view_customers` — which **sales_staff, call_center, rider, manager and branch_partner** all
hold. Any cashier can download the entire customer name + phone database in one call. It is
logged to the activity log, which is something, but nothing blocks it.

### 4.8 Inventory (IMS) — ✅ the model to copy

This is the best-built part of the system and it is worth saying so clearly.

- `User::accessibleLocationIds()` / `operatingLocationIds()` (`app/Models/User.php:160-204`)
  give a real, considered scoping model, with read scope deliberately wider than write scope
  so one person cannot both send and receive the same delivery
- Out-of-scope records 404 rather than 403, so you can't probe for existence
- There is a purpose-built diagnostic — `php artisan inventory:scope-check {user}` — that
  explains *why* a user can or cannot see something
- It has actual tests: `tests/Feature/Inventory/LocationScopeTest.php`
- The realtime channels are global but carry scalars only, and listeners refetch through the
  scoped API — documented and deliberate

Two branch-related gaps:

1. **Warehouse fallback on sales deduction.** `RecipeDeductionService::resolveDeductionLocation()`
   (line 190) falls back to the **warehouse** when a branch has no inventory location mapped.
   Your test branch almost certainly has no location, so if it ever takes a real sale, that
   sale eats Mother Kitchen's stock. This is the same class of problem as the 24 mis-located
   Ashaiman sales already on record. The fallback was a roll-out convenience; it should now
   log loudly or refuse rather than quietly debit the wrong store.
2. **Branch↔location wiring drifts.** Nothing provisions an inventory location when a branch
   is created — the `inventory:scope-check` command's own docblock says so. A new branch's
   manager is silently locked out of IMS until someone creates the location by hand.

### 4.9 Realtime — ✅ correct

`routes/channels.php` gets `orders.branch.{branchId}` right: admins pass, everyone else must
be an assigned employee of that branch. A test-branch cashier cannot subscribe to the main
branch's order stream.

### 4.10 Public endpoints — ⚠️ leaking business figures

`GET /api/v1/branches` is **public, no auth** (`routes/public.php`). `BranchController::index`
attaches `today_orders` and `today_revenue` to every branch in the response (lines 45-55).

So anyone on the internet can read **today's revenue for every CediBites branch**, plus the
full menu with prices, phone numbers, and operating hours. The menu and hours are meant to be
public; the revenue is not.

---

## 5. Security risks, ranked

| # | Risk | Severity | Who can do it | Where |
|---|---|---|---|---|
| 1 | Manager promotes self/anyone to `tech_admin` via employee update | 🔴 Critical | Any manager | `EmployeeController::update` + `UpdateEmployeeRequest:36` |
| 2 | Any authenticated user reads any order by ID (IDOR) | 🔴 Critical | Any logged-in customer or staff | `OrderController::show:329` |
| 3 | Any staff with `update_orders` edits any order at any branch | 🔴 High | sales_staff, kitchen, rider, call_center, manager | `OrderController::update:339` |
| 4 | Company-wide analytics exposed to every staff role | 🔴 High | Any role with `view_orders` (all of them) | `routes/admin.php:133` |
| 5 | Full customer contact export by any cashier | 🔴 High | Any role with `view_customers` | `routes/admin.php:53` |
| 6 | Company-wide dashboard + per-branch revenue to any staff role | 🟠 High | Any role with `view_orders` | `AdminDashboardController:21` |
| 7 | Public order lookup with sequential, guessable order numbers | 🟠 High | Anyone on the internet | `routes/public.php` + `OrderNumberService` |
| 8 | Manager creates/edits/deletes any branch, edits any branch's menu | 🟠 High | Any manager | `routes/admin.php:67,76,~95` — no `branch.access` |
| 9 | Every branch's daily revenue on a public endpoint | 🟠 Medium | Anyone on the internet | `BranchController::index:45-55` |
| 10 | Kitchen queue not branch-scoped | 🟡 Medium | Any kitchen user | `OrderController::kitchenOrders:308` |
| 11 | Full staff roster + HR/PII visible to any manager | 🟡 Medium | Any manager | `EmployeeController::index` |
| 12 | Sales at a location-less branch silently debit the warehouse | 🟡 Medium | Automatic | `RecipeDeductionService:190` |
| 13 | Shift can be opened at an unassigned branch | 🟡 Low | Any staff | `ShiftController::startShift` |
| 14 | Decryptable staff passwords stored and served | 🟡 Low (High once #1 lands) | tech_admin | `recoverable_password` |

**The root cause of #1, #3, #4, #5, #6, #8 and #11 is one architectural fact:** the entire
`/admin/*` route file is gated on *capability* permissions (`view_orders`, `manage_employees`)
that ordinary staff hold, with **no role gate on the group and no branch scoping in the
controllers**. `routes/manager.php` shows the team already knows the right pattern —
`['permission:view_branches', 'branch.access']` — it was just never applied to `admin.php`.

---

## 6. Recommended fix order

**Do first — these are live and exploitable:**

1. **Cap role and permission assignment.** In `UpdateEmployeeRequest` / the store request,
   reject any `role` or `permissions` entry the acting user does not already hold, and block
   editing your own record. This alone closes the escalation path.
2. **Add an ownership check to `OrderController::show`.** Customers see their own orders;
   staff see orders at their assigned branches; admins see all.
3. **Add a branch check to `OrderController::update` and `destroy`,** copying the pattern
   already in `EmployeeOrderController::updateStatus`.
4. **Put a role gate on the `admin` prefix group** — `role:admin|tech_admin` for genuinely
   admin-only surfaces — and give the manager the properly-scoped equivalents under
   `routes/manager.php`. Add `branch.access` to every `/{branch}` route in `admin.php`.
5. **Enforce branch scope server-side in `AdminAnalyticsController`.** Generalise
   `applyPartnerScope()` into `applyBranchScope()`: admins unrestricted, everyone else
   intersected with their assigned branches regardless of what `branch_id` they send.
6. **Move `export-contacts` behind `role:admin|tech_admin`.**

**Do next:**

7. Branch-scope `kitchenOrders` the way `orderManagerOrders` already is.
8. Scope `AdminDashboardController` to the caller's branches.
9. Require auth on `orders/by-number/{orderNumber}`, or add a non-guessable token to the
   lookup. Sequential order numbers are fine for humans at the counter; they are not an
   access credential.
10. Drop `today_revenue` / `today_orders` from the public `GET /branches` response — serve
    them only on the authenticated admin/manager path.
11. Validate `branch_id` in `ShiftController::startShift` against the employee's branches.

**Then the branch-provisioning work — this is what actually unblocks your test branch:**

12. **Clone-on-create for menus.** Create a `BranchProvisioningService` that, on branch
    creation, copies categories, items, options and add-ons from a source branch preserving
    slugs, and creates the matching `inventory_locations` row. That kills both the empty-POS
    problem and the silent IMS lockout in one place.
13. Make the POS show an explicit **"No menu configured for this branch"** state instead of a
    blank grid ([app/pos/terminal/page.tsx:265](app/pos/terminal/page.tsx#L265)).
14. Make `MenuItemBranchOptionController::update()` report skipped branches instead of
    `continue`-ing silently.
15. Have the POS pass `branch_id` to the menu API instead of downloading every branch's menu
    and filtering client-side.
16. Decide, once, whether the menu is per-branch (Model A) or global-with-overrides (Model B),
    and delete the other one.
17. Make `RecipeDeductionService` refuse or alert loudly instead of silently falling back to
    the warehouse.

---

## 7. The test gap

There is **no test anywhere that asserts branch isolation** for orders, sales, analytics,
staff or menu. The only scoping tests in the suite are
`tests/Feature/Inventory/LocationScopeTest.php`, on the IMS side.

That is why these gaps are invisible day to day — nothing fails when someone at branch A can
read branch B's data.

The minimum set worth writing, before any of the fixes above are called done:

- A cashier at branch B cannot read, list or update an order belonging to branch A
- A cashier cannot reach `/admin/analytics/*` or `/admin/dashboard` at all
- A manager's analytics request without `branch_id` returns only their own branch
- A manager cannot set any role or permission above their own
- A manager cannot edit an employee, branch or menu item outside their branches
- A branch with no menu items returns an empty POS menu **and a clear message**, not a blank screen

`tests/Feature/Inventory/LocationScopeTest.php` is a good template — the IMS side already
proves this style of test works here.

---

## 8. Scorecard

| Area | Verdict |
|---|---|
| Inventory (IMS) location scoping | ✅ Solid — the reference implementation |
| Realtime order channels | ✅ Solid |
| POS order writing (who may sell where) | ✅ Solid |
| Employee order feed / Order Manager | ✅ Solid |
| Shifts | ✅ Good — one small gap |
| Customer-facing menu | ✅ Correctly branch-scoped |
| POS menu display | ⚠️ Correct logic, missing data, silent failure |
| Menu data model | ⚠️ Two contradictory models running at once |
| Kitchen feed | ⚠️ Not scoped |
| Public endpoints | ⚠️ Leaking revenue and order history |
| Orders read/update by ID | 🔴 No scoping |
| Analytics & dashboard | 🔴 No scoping |
| Staff management | 🔴 No scoping, plus privilege escalation |
| Test coverage for separation | 🔴 None outside IMS |
