# Clone Build Brief — multi-channel food ordering + inventory platform

> **Audience:** a Claude Code session tasked with building this system from scratch.
> **Status of this document:** the spec. Written 2026-07-29 from the running CediBites
> codebase (frontend `aa1b9a5`, backend `855990e`). Where it states a rule, that rule was
> paid for — usually by a production incident named in §10.

---

## 0. Read this section fully before writing any code

### 0.1 What you are building

A multi-channel food ordering platform with an integrated inventory management system.
Orders arrive from five channels, are fulfilled by any of N physical branches, and every
sale deducts raw ingredients from that branch's stock ledger through recipes. Twelve
distinct UI surfaces sit on one API and one order shape.

Scale of the original, so you can calibrate: **125 page routes, ~350 React components,
111 migrations, ~70 Eloquent models, 75 permissions, 10 roles, ~1,100 lines of route
declarations.** This is a 10-phase build (§9), not a weekend. Do not attempt to hold it
all in one context window — work phase by phase, and treat each phase's exit criteria as
a hard gate.

### 0.2 Ground rules

1. **Build in the phase order in §9.** The order is by dependency, not size. Phase 3
   cannot be correct before Phase 1 exists, because scope enforcement is server-side and
   retrofitting it is how the original shipped six security holes.
2. **Never trust a client-supplied scope value** — `branch_id`, `location_id`, `staff_id`,
   `role`. Derive every one of them server-side from the authenticated principal. §4.5.
3. **Do not skip the tests in each phase's exit criteria.** Several rules in §10 are only
   detectable by a test; they produce *plausible empty results*, not errors.
4. **When this brief and your instinct disagree, follow the brief and flag it.** Most
   surprising rules here exist because the obvious design failed in production.
5. **Ask, don't guess, on the items in §12.** Everything else: make the call and note it.

### 0.3 Reference implementation

The original repos may be available on this machine:

| | Path |
|---|---|
| Frontend (Next.js) | `c:\Users\iamjn\Desktop\WEBZ\CediBites\cedibites` |
| Backend (Laravel) | `c:\Users\iamjn\Desktop\WEBZ\cedibites_api\cedibites_api` |

Use them as an **answer key**, not a source to copy wholesale:

- **Do** read them to resolve an ambiguity in this brief, to see the shape of a resource
  transformer, or to check a status-machine edge case.
- **Do not** copy `.env`, credentials, Hubtel keys, seeded production data, customer
  records, or the `recoverable_password` column (§10.14 — it is an anti-pattern, not a
  feature).
- **Do not** copy `SYSTEM_OVERVIEW.md` or `architecture.md` from the original as truth.
  Both predate the API and describe a mock/localStorage era that no longer exists. They
  will tell you tax is 2.5% and orders are `CB4821F9`. Both are wrong now. This brief is
  current; they are not.

If the repos are absent, this brief is self-sufficient. Say so and proceed.

### 0.4 Parameters to fix before Phase 0

Fill this table first and record it in the new repo's `CLAUDE.md`. Every value below
appears in dozens of files; deciding late means a mechanical sweep.

| Parameter | Original | Yours |
|---|---|---|
| Product name / brand | CediBites | ? |
| Package / DB name | `cedibites` | ? |
| Storage key prefix | `cedibites_` | ? |
| Currency code + symbol | GHS, ₵ | ? |
| Phone format + validator | `^(\+233\|0)[2-9]\d{8}$` | ? |
| Locale / timezone | Ghana, Africa/Accra | ? |
| SMS + payment provider | Hubtel | ? |
| Maps provider | Google Maps | ? |
| Brand palette | primary `#e49925`, secondary `#6c833f` | ? |
| Order-number scheme | per-branch letter + sequence (`A001`) | ? |
| Branch count at launch | 7 | ? |
| Service charge | 1% of subtotal, capped at ₵5 | ? |

**Do not hardcode any of these inline.** Currency goes in one formatter, phone in one
validator, palette in CSS custom properties, service charge in a settings table read at
runtime (§5.2). The original has duplicated currency formatters and duplicated haversine
helpers and is still paying for it.

---

## 1. The twelve surfaces

One API, one order shape, twelve consumers. Each is a real screen set with its own
navigation and permission gate.

| # | Surface | Route root | Primary users | What it is |
|---|---|---|---|---|
| 1 | Customer web | `/` | Public, guests | Browse, cart, checkout, live order tracking |
| 2 | Staff portal | `/staff` | All staff | Login, profile, my-sales, my-shifts |
| 3 | Sales / call centre | `/staff/sales` | `sales_staff`, `call_center` | Take phone/WhatsApp orders; request cancellations |
| 4 | Manager portal | `/staff/manager` | `manager` | Own-branch ops, staff notes, availability, analytics |
| 5 | Admin | `/admin` | `admin` | All branches: orders, menu, staff, promos, transactions, audit |
| 6 | Platform admin | `/admin/platform` | `tech_admin` | Roles, password resets, error logs, system health |
| 7 | Partner portal | `/partner` | `branch_partner` | Read-only branch performance (investor lens) |
| 8 | POS terminal | `/pos` | Cashiers (PIN) | In-branch till: basket → checkout session → receipt |
| 9 | Kitchen display | `/kitchen` | `kitchen` | Order board, accept/advance, no auth chrome |
| 10 | Inventory (IMS) | `/inventory` | `warehouse_manager`, `purchasing_clerk`, `manager` | Catalog, POs, purchases, requisitions, transfers, production, wastage, closing, reconciliation, reports |
| 11 | Order manager | `/order-manager` | `order_manager` duty | Cross-branch order triage |
| 12 | Feedback | `/my-feedback`, `/admin/feedback` | All + triage | Beta feedback capture and triage |

Plus one unauthenticated utility surface: **`/u/[token]`** — phone-as-camera. A desktop
page renders a QR; the phone opens the token URL and uploads photos/video straight into an
upload session. The token in the URL is the entire credential, so those two routes sit
*outside* the auth middleware group deliberately. Rate-limit them and scope the token to
one session with a short TTL.

---

## 2. Architecture — the six laws

Stack (pin these; they are what the original runs and what this brief assumes):

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 App Router, React 19, TypeScript strict |
| Styling | Tailwind v4 via `@theme` in `globals.css` — no `tailwind.config` |
| Server state | TanStack Query v5. Client state: React Context |
| HTTP | Axios, one client module, base URL from env |
| Backend | Laravel 12, PHP 8.3+, Sanctum tokens |
| DB | **PostgreSQL** in every environment |
| Realtime | Laravel Reverb (Pusher protocol) + Laravel Echo |
| Queue | Redis |

### Law 1 — One order shape, one store, one subscription

Define `Order` once in a shared types module. Customer tracking, KDS, POS, staff kanban,
admin and partner all consume that exact type. No per-module order interface, no per-page
realtime hook. Exactly one subscription per browser tab, held by one provider near the
root; every surface reads from it.

*Prevents:* six divergent order shapes and N sockets per tab. The original had per-page
realtime hooks and had to rip them out.

### Law 2 — The server owns scope

`branch_id` never arrives from the client as an authority. Resolve it from the principal:
a manager gets their assigned branches, an admin gets all, a cashier gets the branch of
their PIN session. A request that omits a scope parameter must return **that user's scope**
— never company-wide totals.

*Prevents:* the original's Phase 1 hole, where dropping `?branch=` returned every branch's
revenue to anyone holding `view_orders` — which included cashiers, kitchen and riders.

### Law 3 — Token abilities separate staff from customer

One `users` table holds everyone (§4.1). But a token minted by **customer OTP login** must
never reach a staff endpoint, even if that user genuinely holds staff permissions (an
employee who also orders lunch). Mint staff tokens with a `staff` ability; gate every
staff route group on it.

*Prevents:* privilege escalation via the softer of two login paths.

### Law 4 — A service layer between UI and HTTP

UI → hook (TanStack Query) → service module (typed, interface-shaped) → HTTP client.
Components never touch Axios. Adapters/transformers convert API shapes to display shapes
at exactly one place per entity.

### Law 5 — The ledger is append-only; balances are derived

Stock changes are **movements**, never in-place edits of a balance. `stock_balances` is a
projection you may cache, but the movement rows are the truth. Every movement carries
type, quantity, location, actor, timestamp and a reference to the document that caused it.
A loss is **one** movement, not a decrement plus an adjustment.

*Prevents:* an unauditable ledger, and double-counting wastage.

### Law 6 — Three-state checks. No verdict never means refuse

Any gate that can fail to evaluate returns **three** states, not two: `ok`, `refuse`, and
`unjudged`. A branch with no inventory location, or a dish with no recipe, yields
`unjudged` — and `unjudged` **must not block the sale**.

*Prevents:* a configuration gap stopping a branch from trading. In the original, the stock
gate blocked 55 of 59 sellable options at a new branch because a *missing* balance row read
as zero. Serviettes closed the shop.

### 2.1 Response envelope (fix this on day one)

```
{ "success": bool, "message": string, "data": T, "errors"?: object }
```

Two contract rules that cost the original real time:

- The success helper takes **`(data, message)` only**. If you add a third positional
  argument expecting a status code, it will be silently dropped and you will return `200`
  for creations for months. Set status explicitly.
- The frontend response interceptor **already unwraps one level**. So `apiClient.get()`
  yields `{ data: ... }` — **one** unwrap, not two. `data.data.x` is `undefined`, which
  falls back to `{}`, which is indistinguishable from "nothing to report." §10.4.

Errors must carry the raw body through to the client, not just `status`/`message`. Any
endpoint returning more than one sentence of detail needs it.

---

## 3. Data model

111 migrations in the original. Grouped by family, with the load-bearing ones spec'd.

### 3.1 Families

| Family | Tables |
|---|---|
| Identity | `users`, `customers`, `employees`, `employee_notes`, `otps`, `personal_access_tokens`, `password_reset_tokens`, `addresses` |
| Branches | `branches`, `branch_operating_hours`, `branch_delivery_settings`, `branch_order_types`, `branch_payment_methods`, `branch_revenue_targets` |
| Menu | `menu_items`, `menu_item_sizes`, `menu_item_options`, `menu_item_option_branch_prices`, `menu_item_branches` (pivot), `menu_categories`, `menu_tags`, `menu_item_menu_tag`, `menu_add_ons`, `menu_item_menu_add_on`, `menu_item_ratings`, `smart_category_settings` |
| Ordering | `carts`, `cart_items`, `checkout_sessions`, `orders`, `order_items`, `order_status_history`, `payments`, `promos`, `promo_branches`, `promo_menu_items` |
| Workforce | `shifts`, `shift_orders` |
| Inventory | 27 tables, all `inventory_*` — see §7.1 |
| Platform | `system_settings`, `activity_log`, `request_logs`, `notifications`, `push_subscriptions`, `media`, `upload_sessions`, `feedback_reports`, `feedback_report_notes` |
| Framework | `jobs`, `cache`, permission tables |

### 3.2 `orders` — the centre of the system

```
id, order_number (unique)
branch_id                      → branches
customer_id (nullable)         → customers. NULL for guests. See §10.6
status                         → §5.1 enum, CHECK-constrained
order_type                     → delivery | pickup | dine_in | takeaway
source                         → online | phone | whatsapp | social_media | pos
payment_method                 → mobile_money | cash | card | no_charge
payment_status                 → pending | completed | failed | refunded
is_paid                        bool
subtotal, service_charge, delivery_fee, discount, total   (decimal, minor-unit safe)
promo_code (nullable), discount_amount
delivery_fee_collection        → who collects a third-party delivery fee (§5.3)
contact_name, contact_phone, delivery_address, gps_code, delivery_note
staff_id (nullable)            → employee who created it (staff/POS)
internal_notes                 → staff-only, never surfaced to the customer
cancel_requested_by, cancel_requested_at, cancel_request_reason,
cancel_previous_status         → §5.4
placed_at, accepted_at, started_at, ready_at, completed_at
is_manual_entry                bool
```

**Snapshot, don't join, for anything the customer saw.** Branch name/address/phone and
item name/price at time of order are embedded on the order (or its items). A branch that
renames itself must not rewrite last month's receipts.

`order_items`: `order_id, menu_item_id, menu_item_option_id, name, quantity, unit_price,
size_label, variant_key, notes, category`. The **option id is load-bearing** — recipes key
off it (§7.4).

### 3.3 `menu_items` — one dish, many branches

This is the single most important modelling decision in the system, and the original got
it wrong first.

**Wrong:** `menu_items.branch_id` with `UNIQUE(branch_id, slug)`. The same dish becomes a
different row at every branch.

**Right:** one row per dish. `UNIQUE(slug)`. Branch service is the pivot
`menu_item_branches (menu_item_id, branch_id, is_available)`. Per-branch price overrides
live in `menu_item_option_branch_prices`.

*Why it matters more than tidiness:* everything downstream keys off menu-item and option
ids. Under the wrong model, opening a second branch **silently stopped recipe deduction
entirely** — recipes key on `menu_item_option_id`, the second branch's options matched no
recipe, and the deduction service hit `continue` on every single sale without an error.
Promos landed at one branch only. Ratings reset per branch.

Two rules on the pivot:

- **Availability sync is insert-only.** A manager's "sold out today" must never be
  switched back on by a deploy or a sync command.
- **Authority split:** the manager may flip *availability* at a branch they are assigned
  to. Only the admin sets *price*, including per-branch price. One menu, one price list.

### 3.4 `users` — one table, many roles

Do **not** split staff and customer tables. A cashier ordering lunch on their day off is
one human with one phone number; two tables means two identities, duplicate accounts, and
a reconciliation problem forever. See §4.1 for how to keep them safe in one table.

---

## 4. Identity, roles, permissions

### 4.1 Three authentication mechanisms

| Principal | Credential | Session | Notes |
|---|---|---|---|
| Customer | Phone + OTP | Sanctum token, no `staff` ability | Guests may order with no account at all |
| Staff | Email or phone + password | Sanctum token **with `staff` ability** | Single `/staff/login` for all roles; role decides landing route |
| POS cashier | 4-digit PIN | Short-TTL session, tab-scoped | Independent of the staff portal session |

Rules learned the hard way:

- **A customer OTP login must never overwrite a staff member's name** on the shared user
  row. The original's OTP flow did, and required a repair command.
- **Claiming an existing account requires OTP verification.** Otherwise "register with
  this phone number" is an account takeover of the employee who owns it.
- Guests order with a **guest-session header**; the HTTP client attaches either the staff
  token or the guest session per route, never both.
- Track "also ordered as" so support can see a staff member's customer orders without
  merging the identities.

### 4.2 Roles (10)

| Role | Portal | Scope |
|---|---|---|
| `tech_admin` | Admin + Platform | Everything, incl. roles, password resets, maintenance |
| `admin` | Admin | All branches; menu, price, staff, promos |
| `manager` | Staff (manager) | **Own assigned branches only** |
| `sales_staff` | Staff (sales) | Create orders; own sales |
| `call_center` | Staff (sales) | Create orders; *request* cancellation, cannot approve |
| `branch_partner` | Partner | **Read-only**, own branches |
| `kitchen` | KDS only | Advance kitchen statuses |
| `rider` | none yet | Delivery statuses |
| `warehouse_manager` | Inventory | Stock ops across locations |
| `purchasing_clerk` | Inventory | POs and purchases |

`super_admin` and `platform_admin` do not exist — the original renamed and removed them.
Don't reintroduce a god role with an ambiguous name.

### 4.3 Permissions (75) — groups

Fine-grained, verb-per-document. Groups: orders (4) · menu (2 + `menu.availability.manage`)
· branches (2 + `branch.operate`) · customers (2) · employees (2 +
`employee.notes.manage`) · analytics (1) · audit (1) · portal access (7) · feature flags
(4) · platform (8) · inventory (~35, one per document verb — see §7).

**The manager permission ceiling.** This is the single most-exploitable design mistake in
the original. `PATCH /employees/{id}` was gated on `manage_employees`, which the manager
held. The endpoint accepted any value from the role enum, had no ceiling check and no
self-edit guard. **One request with `{"role":"tech_admin"}` was a full takeover.**

Required:

1. A manager holds **narrow** grants, never coarse ones — `menu.availability.manage`, not
   `manage_menu`; `employee.notes.manage`, not `manage_employees`; `branch.operate`, not
   `manage_branches`.
2. An explicit **role ceiling**: no actor may assign a role at or above their own.
3. An explicit **self-edit guard** on role and permission fields.
4. Coarse permissions that exist and are *unused in any route* are a trap — the original
   had `view_analytics` correctly granted to exactly the right roles and referenced by
   **zero** routes, while analytics sat behind `view_orders`. Add a test that asserts every
   permission is either referenced by a route/policy or deliberately listed as unused.

### 4.4 Revoking is a separate job from seeding

A role seeder that only ever *adds* cannot fix an over-granted role. You need a cleanup
migration or command that **revokes**. And it must strip the permission from users who
hold it **directly**, not just from the role — permission checks resolve through
`$user->can()`, which a direct grant satisfies. Revoking from the role alone leaves an
already-escalated account escalated.

### 4.5 Branch and location scoping

Two distinct concepts; do not collapse them:

- **`accessibleLocationIds`** — what you may *read*. Derived from assigned branches unless
  you hold a view-all grant.
- **`operatingLocationIds`** — where you may *act*. Narrower.

Middleware that compares a route's `{branch}` binding to the principal's branches **must
refuse when there is no binding to compare**. The original's failed *open*: putting it on
`/employees/{employee}` guarded nothing while looking like it did. Fail closed and log.

Separation of duties, enforced server-side:

- No self-approval on any document.
- Sender ≠ receiver on a transfer.
- Requester ≠ approver on a requisition.
- The employee id and the user id are different keys. Scope by **user id**.

---

## 5. Order lifecycle

### 5.1 Status machine

```
received
 ├─ accepted → preparing → ready
 │                          ├─ out_for_delivery → delivered → completed   (delivery)
 │                          ├─ ready_for_pickup → completed               (pickup)
 │                          └─ completed                     (dine_in / takeaway / POS)
 ├─ cancel_requested → cancelled            (approved by manager/admin)
 │                   → cancel_previous_status  (rejected — restore, don't guess)
 └─ cancelled                                (manager/admin direct-cancel, non-terminal only)
```

- Enforce transitions **server-side**. The client's `getNextStatuses()` is UX, not policy.
- Timestamps are written by the transition, not by the caller: `accepted_at`,
  `started_at`, `ready_at`, `completed_at`.
- Append a row to `order_status_history` on every transition — actor, from, to, at. Keep
  the CHECK constraint on that table in sync with the enum, including
  `cancel_requested`.
- Advancing status is permissioned. `call_center` creates and requests cancellation but
  cannot advance.

### 5.2 Pricing

```
subtotal        = Σ (unit_price × quantity)
service_charge  = min(subtotal × service_charge_percent, service_charge_cap)   if enabled
delivery_fee    = per-branch flat fee, if delivery and enabled          else 0
discount        = resolved server-side (§5.5)
total           = subtotal + service_charge + delivery_fee − discount    (floor 0)
```

**It is a service charge, not a tax.** The original started with "tax 2.5%" and migrated
away from it; calling a service charge tax is a compliance statement you don't want to
make by accident.

Every one of `service_charge_enabled`, `service_charge_percent`, `service_charge_cap`,
`delivery_fee_enabled` and global operating hours is a **runtime setting** in
`system_settings`, exposed to the client through one public `checkout-config` endpoint.
Never hardcode them. Compute money **server-side** and treat client totals as display
only.

### 5.3 Delivery fee is not revenue

When a third-party courier collects the fee it is **pass-through**, not income. Model who
collects (`delivery_fee_collection`) and exclude pass-through fees from revenue in
analytics and shift totals. Getting this wrong overstates every revenue figure in the
business.

### 5.4 Cancel-request workflow

`call_center` sets `cancel_requested` and writes requester, timestamp, reason, and
**`cancel_previous_status`**. A manager/admin approves → `cancelled`, or rejects → restore
the stored previous status. Store it; do not re-derive it.

### 5.5 Promos

Resolve **server-side** and return the single best promo. Client never picks.

1. Active, and today within `[start_date, end_date]`.
2. Scope: `global`, or `branch` and this branch is listed.
3. `applies_to = items` requires at least one cart item in the promo's item list.
4. Order-value gates: `min_order_value`, `max_order_value`.
5. Percentage → `subtotal × value/100`, capped by `max_discount`. Fixed → `min(value,
   subtotal)`.
6. Return the highest resulting discount.

### 5.6 Order numbers

Per-branch letter + sequence (`A001`, `A002`, … `B001`). Human-readable and dictatable
over the phone — that is the requirement, and it is worth keeping.

**But it is guessable, so treat it as an identifier, not a credential.** Guest order
tracking must stay unauthenticated (it is where the payment gateway redirects a guest who
has no account), which means anyone can walk the sequence and read off each branch's daily
volume. The original throttles it to 20/min and calls that mitigation, not a fix.

**Do this properly in your clone:** issue a per-order random tracking token, redirect the
gateway to `/orders/{token}`, and keep the human number for phone conversations only. It
is one extra column now versus a contract change across checkout, receipt and gateway
redirect later.

### 5.7 Payment

Gateway (Hubtel in the original) with two flows: hosted checkout for online, and direct
receive-money for POS mobile money. Both need:

- Callback endpoints **outside** the auth group (the gateway is not logged in), verified by
  signature/shared secret, and **idempotent** — assume duplicate callbacks.
- A `payments` row per attempt, not per order.
- A client-callable `verify` endpoint; never trust a browser redirect as proof of payment.
- `mobile_money` / `no_charge` → `is_paid: true`, `payment_status: completed` at creation.
  `cash` / `card` → `pending` until confirmed.

### 5.8 Checkout sessions

Both the customer checkout and the POS terminal create a **checkout session** and then
confirm it — the session, not a direct order POST, is the real path to an order.

**Any business rule you enforce on order creation must be enforced on the session-confirm
path too.** The original gated its stock check on the direct POS order endpoint, which the
till does not use; a sale went through for 23 portions against a balance of 6 **four
minutes after the gate deployed.** Put shared checks in one trait/service consumed by every
basket-to-order path, and write a test per path.

---

## 6. Menu and discovery

- **Options are the sellable unit.** A dish has options (sizes/variants) with prices; the
  order line references the option. Recipes attach to options.
- **A soft-deleted option still occupies its unique index.** `UNIQUE(menu_item_id,
  option_key)` will reject a re-add after a delete unless you resolve with
  `withTrashed()->firstOrNew()`. §10.5.
- Categories, tags, add-ons. **Retire computed tags** — "popular" and "new" as stored
  flags go stale and lie. Either compute them from order data at read time or don't ship
  them. The original removed them.
- **Smart categories** (time-window driven, e.g. breakfast) are a real feature and a real
  test hazard: their resolvers emit `EXTRACT(HOUR FROM …)`, so a SQLite test suite fails
  differently depending on the wall-clock hour. §11.2.
- Availability is per branch (§3.3); price authority is admin-only.

---

## 7. Inventory (IMS)

The largest subsystem — 27 tables, ~35 permissions, ~10 document types. Build it in three
phases (6, 7, 8), never one.

### 7.1 Tables

`inventory_items`, `inventory_categories`, `inventory_units`, `inventory_suppliers`,
`inventory_locations`, `inventory_item_location_thresholds`, `inventory_stock_movements`,
`inventory_stock_balances`, `inventory_batches`, `inventory_purchase_orders(+_items)`,
`inventory_purchases(+_items)`, `inventory_requisitions(+_lines)`,
`inventory_transfers(+_lines)`, `inventory_production_logs(+_inputs)`,
`inventory_wastages(+_lines, +_photos)`, `inventory_daily_closings(+_lines)`,
`inventory_reconciliation_cycles(+_lines)`, `inventory_dispute_resolutions`,
`inventory_recipes(+_ingredients)`, `inventory_alerts`.

### 7.2 Document chain

```
PURCHASE ORDER ──approve──> PURCHASE (goods received) ──> stock IN at a location
                                   │
                                   └─ per-line delivery refusal (refuse a bad crate,
                                      not the whole delivery)

REQUISITION (branch asks) ──approve──> TRANSFER ──send──> ──receive──> stock moves
                                                   │            │
                                                   │            └─ per-line refusal
                                                   └─ DISPUTE ──> resolution

PRODUCTION (mother kitchen: raw in → prepared out)

SALE ──recipe──> deduction at the selling branch's location

WASTAGE (one movement per loss) · DAILY CLOSING (blind count)
RECONCILIATION CYCLE ──> counted vs expected ──> adjustment
```

### 7.3 Locations, and why a branch is more than a row

**Creating a branch must create its inventory location, in the same transaction.** Without
one, its manager is locked out of IMS *and its sales fall through to debiting the mother
kitchen* — silently. Provide a provisioning service plus a backfill command, and make the
fallback **loud**: raise a critical alert on any misrouted deduction rather than absorbing
it.

**Reorder thresholds are per location, not per item.** One global figure made a
fully-stocked branch read Critical on 49 of 55 lines — which trains everyone to ignore the
dashboard.

### 7.4 Recipes and deduction

- A recipe maps a `menu_item_option_id` to ingredient quantities.
- On sale, deduct at the **selling branch's** location.
- **Add-ons do not deduct** in the original. Decide deliberately; don't inherit it by
  accident.
- Recipes support a global definition, per-branch override, and a lock.
- Never let deduction fail silently. A `continue` on a missing recipe must emit a warning
  and an alert, or you will lose every sale's deduction and see nothing.
- A negative balance is the fingerprint of fire-and-forget deduction — it means a sale went
  through under zero. Treat any negative as an incident.

### 7.5 The stock gate — "no stock, no sale"

Refuse a sale whose recipe cannot be covered. Non-negotiable design points:

1. **Three states** (Law 6): `ok`, `refuse`, `unjudged`. A missing location or missing
   recipe → `unjudged` → **allow**. Half the original's gate test suite exists to pin this
   down.
2. **A missing balance row is not zero.** It is *unknown*. Reading it as zero is what
   blocked 55 of 59 options at a new branch — the top blockers were serviettes and carrier
   bags.
3. **One shared implementation** across every basket-to-order path (§5.8).
4. **An override permission exists** (`inventory.stock_gate.override`) for when the ledger
   is wrong rather than the shelf empty. Every use logs actor and reason. **Deliberately
   not a cashier's to hold** — an override anyone can reach is not a rule.
5. Expose a per-option sellable map so the till can grey items out **before** the customer
   commits, plus a basket-check endpoint.

### 7.6 Wastage, closing, reconciliation

- **One movement per loss.** Never decrement-then-adjust.
- **Blind counts:** the counter must not see the expected figure, or the count becomes a
  confirmation.
- **`count_adjustment` so tomorrow opens where tonight closed.** A neutral daily close, not
  a reset.
- **Photo evidence + enforced return above a value threshold** for wastage claims.
- Approval is separate from recording, and no self-approval.
- Approved quantity may differ from claimed quantity — model both.

### 7.7 Document references

`PREFIX-YYMMDD-NNN`. **Backend-assigned, always** — SKUs, document codes and order numbers
are server concerns. A client that generates an id will collide.

### 7.8 Stock valuation honesty

If someone asks for a blanket "set every item to N units" floor, that is a
`count_adjustment`, **never** a `purchase`. A fake purchase inflates cost-of-goods and
makes the day's margin a lie. The original carries exactly this distortion in production
and it is the most important caveat in its handoff.

---

## 8. Realtime

- **One subscription per tab**, in a root-level provider (Law 1). No per-page hooks.
- **Cascade broadcasts:** one domain event fans out to the channels that care (branch
  channel, kitchen channel, POS channel), rather than every surface polling.
- Events: order created, status changed, payment settled, stock movement posted, alert
  raised.
- **Authorize private channels** against the same scope rules as HTTP (§4.5). A channel
  is an endpoint.
- Target: any connected client sees a state change in ~1s with no refresh.

---

## 9. Build phases

Each phase ends with a **gate**. Do not start the next until the gate passes. Commit at
each gate. Report status against these numbers.

### Phase 0 — Foundations
Both repos scaffolded. Parameter table (§0.4) filled and recorded in `CLAUDE.md`. Postgres
up, Sanctum installed, response envelope (§2.1) implemented with tests, brand tokens in
`@theme`, one currency formatter, one phone validator, lint + typecheck + test all green in
CI.
**Gate:** `/api/v1/health` returns the envelope; frontend renders a themed page; CI green.

### Phase 1 — Identity, RBAC, branches
`users`/`customers`/`employees`, the three auth mechanisms (§4.1), 10 roles, 75
permissions, token abilities, the role ceiling, self-edit guard, revoke-capable seeding,
`accessibleLocationIds`/`operatingLocationIds`, fail-closed scope middleware. Branches with
hours, delivery settings, order types, payment methods. **Branch provisioning creates the
inventory location** (§7.3) even though IMS doesn't exist yet — write the hook now.
**Gate:** a test proves a manager **cannot** set their own role to `tech_admin`, cannot
edit another branch's employee, and that a customer OTP token is rejected by a staff route.
A test asserts every permission is route-referenced or explicitly listed as unused.

### Phase 2 — Menu
One dish per row, `UNIQUE(slug)`, `menu_item_branches` pivot from the start. Options,
sizes, per-branch price overrides, categories, tags, add-ons. Insert-only availability
sync. Admin menu editor as a **branch availability matrix**, not a per-item branch
dropdown.
**Gate:** the same dish serves two branches from one row at two prices; a manager can flip
availability at their branch and cannot change price; a re-added soft-deleted option
succeeds (§10.5).

### Phase 3 — Ordering, checkout, payment
Cart, checkout session, order creation, status machine + history, server-side pricing from
`system_settings`, promo resolution, payments with idempotent callbacks and verify, guest
tracking **with a per-order token** (§5.6), receipts.
**Gate:** guest and authenticated checkout both work end to end against gateway sandbox; a
duplicated callback does not double-credit; server totals are authoritative; every
basket-to-order path shares one creation service.

### Phase 4 — Operational surfaces
Staff portal + sales portal, kanban with server-enforced transitions, KDS, POS (PIN
session, terminal, today's orders), shifts + sales attribution.
**Gate:** an order placed on POS appears on KDS and in the staff kanban; `call_center`
can request but not approve a cancellation; shift totals reconcile to order totals with
pass-through delivery fees excluded (§5.3).

### Phase 5 — Admin, analytics, partner
Admin orders/staff/branches/promos/customers/transactions/audit/settings. Analytics gated
on `view_analytics` — **not** `view_orders`. Partner portal read-only. Activity log.
**Gate:** a request with no branch parameter returns the caller's scope, never
company-wide; a cashier token cannot reach any analytics endpoint; partner writes are
rejected.

### Phase 6 — IMS core
Items, categories, units, suppliers, locations, per-location thresholds, the **append-only
movement ledger**, derived balances, batches, alerts.
**Gate:** balances reconstruct exactly from movements alone; a branch created in Phase 1
already has its location; a per-location threshold drives its own status.

### Phase 7 — IMS documents
Purchase orders (draft→submit→approve→close/cancel), purchases with per-line refusal,
requisitions, transfers (submit→approve→send→receive) with per-line refusal, disputes and
resolutions, production logs.
**Gate:** separation of duties enforced by test — no self-approval, sender ≠ receiver,
requester ≠ approver; every document posts movements and nothing else mutates a balance.

### Phase 8 — IMS control
Recipes (global/override/lock), sale deduction with loud failure, wastage with photos and
approval, daily closing with blind counts and `count_adjustment`, reconciliation cycles,
reports, the **stock gate** with all five rules in §7.5.
**Gate:** a dish with no recipe and a branch with no location both yield `unjudged` and
**sell**; a genuinely short basket is refused on **every** basket path; the override logs
actor and reason and is not held by a cashier role.

### Phase 9 — Realtime, notifications, feedback, platform admin
Reverb + Echo with one subscription and cascade broadcasts, channel authorization,
notifications and push, feedback capture + triage, platform admin (roles, resets, error
logs, health, maintenance), upload sessions and the phone-as-camera flow.
**Gate:** one socket per tab proven; a private channel rejects an out-of-scope subscriber;
a phone-as-camera token works once and expires.

### Phase 10 — Hardening
Rate limits on every unauthenticated route, throttles on OTP send/verify, security review
of all scope middleware, negative-balance audit, an end-to-end pass per surface, deploy
runbook.
**Gate:** security review clean; a documented test baseline (§11.2); runbook exercised at
least once.

---

## 10. Traps — the expensive list

Read before Phase 1. Each of these cost the original real time or real money.

1. **Scope middleware that fails open.** No `{branch}` binding to compare → it called
   `$next()`. Guarded nothing, looked like it did. Fail closed, log.
2. **A coarse permission the manager holds is a takeover.** `manage_employees` + no role
   ceiling = `{"role":"tech_admin"}`. §4.3.
3. **Seeders only add.** Revoking needs its own command, and it must strip **direct**
   grants too, because `$user->can()` is satisfied by a direct grant. §4.4.
4. **Double-unwrapping the API response.** The interceptor already returns the body.
   `data.data.x` → `undefined` → `{}` → *looks exactly like "nothing to report."* Both of
   the original's frontend stock-gate bugs had this shape: **a wrong boundary assumption
   producing a plausible empty result instead of a noise.** An empty map is
   indistinguishable from "everything is in stock."
5. **Soft-deleted rows still hold unique indexes.** Resolve with `withTrashed()`.
6. **Guest orders need a nullable `customer_id`** — and every query that joins customer
   must tolerate the null.
7. **Route ordering:** a literal route (`customers/export-contacts`) must be declared
   **before** the wildcard (`customers/{customer}`) or the wildcard eats it.
8. **A missing row is not a zero.** Especially a stock balance. §7.5.2.
9. **Guarding the door nobody uses.** The till uses checkout-session-confirm, not the
   direct order POST. A check on the wrong path is live and inert at once. §5.8.
10. **Silent `continue` in a loop over sales** loses every deduction with no error. Alert,
    don't skip.
11. **Enum widening needs the CHECK constraint updated too** — including on
    `order_status_history`, which is easy to forget.
12. **The success-response helper drops a third argument.** Creations return 200 forever.
    §2.1.
13. **Don't call a service charge "tax."** §5.2.
14. **Never store a decryptable copy of a password.** The original has a
    `recoverable_password` column. Do not clone it. If staff need recovery, use a reset
    token.
15. **Check your branch tracking before committing.** In the original's environment,
    commits auto-pushed and a branch created from `origin/master` tracked it — five
    commits and a production deploy landed unreviewed. `git status -sb` first.
16. **`php artisan tinker <file>` hangs over SSH** (waits on a TTY). Pipe:
    `cat /tmp/x.php | php artisan tinker`. Namespaces don't survive `--execute` through SSH
    quoting.
17. **Deploying a gate before looking at what it will refuse.** The original's stock gate
    shipped, blocked live sales, and was reverted the same day. Run it in report-only mode
    against production data first, read the list, *then* enforce.

---

## 11. Verification

### 11.1 Per phase
Every gate in §9 is a test, not an assertion in prose. Where a gate says "a test proves,"
write that test and name it in the phase's commit message.

### 11.2 Test baseline discipline

State the pass/fail baseline **as a number, with the cause of each failure named**, and
re-state it every phase.

The original's cautionary tale: its suite fails **3 to 6 tests depending on the wall-clock
hour**, because smart-category resolvers emit `EXTRACT(HOUR FROM …)` which SQLite cannot
parse, and which category resolves depends on the current time. A drop from 6 failures to
3 therefore means *the clock moved*, not that you fixed something.

Two conclusions for your clone:

- **Test against PostgreSQL, not SQLite.** SQLite folds `LIKE` case and can't parse
  `EXTRACT`; a green SQLite suite does not prove the Postgres path.
- **Zero known-failing tests.** If a test can't pass, it is skipped with a linked reason,
  never left red. A red baseline destroys the signal.

### 11.3 Handback
At each gate report: what was built, the gate result with test names, the current baseline,
decisions made under §0.2 rule 5, and anything deferred with the reason.

---

## 12. Ask before deciding

These are genuinely the owner's call and materially change the build. Ask; do not assume.

1. **Domain and brand** — the §0.4 table. Same vertical or different? A different vertical
   changes the menu/recipe model.
2. **Which surfaces are in scope for v1.** All twelve is a very large build. A defensible
   v1 is surfaces 1–5, 8, 9 (customer, staff, sales, manager, admin, POS, KDS) with IMS
   deferred to v2 — but IMS is roughly 40% of the original's value, and deferring it means
   Phase 2's option ids and Phase 3's deduction hooks must still be designed for it.
3. **Payment and SMS provider** — Hubtel is Ghana-specific. A different market means a
   different gateway, different callback shapes, and possibly a different currency
   precision.
4. **Multi-tenant or single-tenant?** The original is one business with many branches. If
   the clone must host multiple businesses, that is a tenant column on nearly every table
   and it must be Phase 1, not a retrofit.
5. **Delivery: own riders, third-party, or both?** Drives the rider portal, live GPS
   tracking, and the pass-through fee model in §5.3.

---

*Written 2026-07-29 against CediBites frontend `aa1b9a5` / backend `855990e`. Every rule
stated as a rule was verified in that code or paid for in that system's production.*
