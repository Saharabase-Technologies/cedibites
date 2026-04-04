# CediBites Frontend — Project Chronicle

> **Purpose**: Living record of all changes, decisions, and current state of the CediBites Next.js frontend. Maintained by the Project Chronicle agent. Read this before starting work on any area.

> **Current Branch**: `payment-order-bug-fixes` (off `main`)

---

## System Map

### Route Groups

| Group            | Purpose                                 | Auth            |
| ---------------- | --------------------------------------- | --------------- |
| `(customer)/`    | Menu browsing, checkout, order tracking | Customer auth   |
| `(staff-auth)/`  | Staff login entry                       | Unauthenticated |
| `admin/`         | System management dashboard             | Admin role      |
| `kitchen/`       | Real-time kitchen display system        | Staff auth      |
| `order-manager/` | Centralized order management            | Manager role    |
| `partner/`       | Partner/merchant portal                 | Partner access  |
| `pos/`           | In-store point-of-sale terminal         | POS device      |
| `staff/`         | Multi-purpose staff dashboard           | Staff auth      |

### State Management

| Context/Provider       | Location                         | Purpose                               |
| ---------------------- | -------------------------------- | ------------------------------------- |
| Kitchen context        | `app/kitchen/context.tsx`        | Kitchen display state                 |
| Kitchen branch context | `app/kitchen/branch-context.tsx` | Branch selection for kitchen          |
| POS context            | `app/pos/context.tsx`            | POS terminal cart & checkout sessions |
| StaffAuthProvider      | `app/staff/providers/`           | Staff authentication state            |

### API Layer

- **19 service files** in `lib/api/services/` — covering auth, orders, checkout sessions, menu, cart, payments, customers, staff, branches, analytics, roles, activity logs, notifications
- **17+ hooks** in `lib/api/hooks/` — React Query wrappers for all services
- **Client** in `lib/api/client.ts` — Axios HTTP client config
- **Adapters & Transformers** in `lib/api/adapters/` and `lib/api/transformers/`

### Utilities

| Utility             | Location                       | Purpose                    |
| ------------------- | ------------------------------ | -------------------------- |
| Currency formatting | `lib/utils/currency.ts`        | GHS display                |
| Distance calc       | `lib/utils/distance.ts`        | Delivery distance          |
| Error handler       | `lib/utils/error-handler.ts`   | Centralized error handling |
| PDF export          | `lib/utils/exportPdf.ts`       | Report export              |
| Order adapter       | `lib/utils/orderAdapter.ts`    | Order data transformation  |
| Receipt printing    | `lib/utils/printReceipt.ts`    | POS receipt printing       |
| Report generator    | `lib/utils/reportGenerator.ts` | Report generation          |

---

## Change Log

_Entries are added per session, newest first._

<!--
Template for new entries:

## [YYYY-MM-DD] Session: Brief Title

### Intent
What the engineer wanted to achieve.

### Changes Made
| File | Change | Reason |
|------|--------|--------|
| path/to/file | Description | Why |

### Decisions
- **Decision**: description
  - **Rationale**: why

### Current State
What the system looks like after changes.

### Pending / Follow-up
Items still needing attention.
-->

---

## [2026-04-04] Session: Menu Management Audit — Full-Stack Fixes

### Intent

Comprehensive audit and fix of the entire menu system across admin and branch manager portals. Fix critical bugs in image upload, category CRUD, availability toggle persistence, and cross-portal UX inconsistencies.

### Changes Made

| File                                        | Change                                                                                                                        | Reason                                                                                                                           |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `app/admin/menu/page.tsx`                   | Added `uploadSimpleImage()` function for simple-priced items; chained before `syncOptions()` in save flow                     | Images for simple-priced items were silently lost — backend creates a 'standard' option but the frontend skipped uploading to it |
| `app/admin/menu/page.tsx`                   | Fixed `toggleGlobal()` to persist via API with optimistic update + rollback                                                   | Toggle only updated local React state; refreshing the page reverted availability                                                 |
| `app/admin/menu/page.tsx`                   | Added `ActionMenu` component (3-dot dropdown with Edit/Delete); replaced inline buttons                                       | User requested hiding delete button inside a contextual menu                                                                     |
| `app/admin/menu/page.tsx`                   | Adjusted grid columns (Actions column 100px → 40px)                                                                           | ActionMenu is more compact than two separate buttons                                                                             |
| `app/admin/menu-add-ons/page.tsx`           | Completely rewritten — simplified to Name + Price only form; auto-generates slug; defaults is_per_piece=false, is_active=true | User wanted "just name and price, simple straightforward, no options to complicate things"                                       |
| `app/staff/manager/menu/page.tsx`           | Added `uploadSimpleImage()` function (ported from admin)                                                                      | Same image upload bug existed on BM page                                                                                         |
| `app/staff/manager/menu/page.tsx`           | Fixed `useMenuCategories` call to pass `branch_id: branchId`                                                                  | BM was loading ALL branches' categories — could assign items to wrong branch                                                     |
| `app/staff/manager/menu/page.tsx`           | Added `ActionMenu` component; replaced inline edit/delete buttons                                                             | UX consistency with admin page                                                                                                   |
| `app/staff/manager/menu/page.tsx`           | Fixed `MENU_SUB_TABS` — added Configure tab                                                                                   | Items page only showed [Items, Tags] — Configure page was unreachable                                                            |
| `app/staff/manager/menu/configure/page.tsx` | Fixed `MENU_SUB_TABS` — added Configure tab                                                                                   | Only showed [Items, Tags] — page couldn't navigate back to itself                                                                |
| `app/staff/manager/menu/tags/page.tsx`      | Standardized `MENU_SUB_TABS` to [Items, Tags, Configure]                                                                      | Consistency across all 3 BM menu sub-pages                                                                                       |
| `types/api.ts`                              | Added `branch_id?: number` and `slug?: string` to `MenuCategory` interface                                                    | Backend now serializes these fields; frontend type contract needed alignment                                                     |

### Decisions

- **Decision**: Sub-tabs for BM are [Items, Tags, Configure] (no Add-ons tab yet)
  - **Rationale**: BM doesn't have an add-ons management page yet; will be added as a follow-up
- **Decision**: Slug auto-generated from name for add-ons
  - **Rationale**: Slug is an implementation detail; exposing it to users adds complexity with no benefit
- **Decision**: ActionMenu (3-dot) pattern standardized across admin and BM
  - **Rationale**: Consistent UX; delete action is destructive and should be behind a click

### Cross-Repo Impact

| File (API repo)                 | Change                                                         | Impact on Frontend                                                       |
| ------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `CreateMenuCategoryRequest.php` | Added `branch_id` validation; scoped name uniqueness to branch | Fixes category creation failing when same name exists in another branch  |
| `UpdateMenuCategoryRequest.php` | Added branch-scoped uniqueness                                 | Same fix for updates                                                     |
| `MenuCategoryResource.php`      | Added `branch_id` to serialized output                         | Frontend can now read branch_id from category responses                  |
| `MenuCategoryController.php`    | Removed broken groupBy name deduplication from index()         | Categories were being collapsed into one per unique name across branches |

### Current State

- Admin menu page: CRUD works, images upload for both simple and multi-option items, toggle persists, 3-dot action menu
- Admin add-ons page: Simplified to name + price, auto-slug
- BM menu page: Matches admin behavior — image upload, branch-scoped categories, 3-dot menu, all 3 sub-tabs navigable
- Build: Passes clean (71 static pages)

### Pending / Follow-up

- BM add-ons management page (currently no equivalent of `/admin/menu-add-ons`)
- Tags page simplification (both admin and BM expose slug/display_order to users)
- Shared menu components extraction (ItemModal, PriceDisplay, TagBadge, ConfirmModal duplicated in admin and BM)
- Admin menu page decomposition (74KB single file)

---

## [2026-04-04] Session: Settings Toggle Persistence, Delivery Fee Toggle & Global Operating Hours

### Intent

Fix a bug where admin settings toggles reset on page refresh despite being saved correctly. Add a delivery fee toggle so admins can control whether the checkout shows delivery fees. Add global operating hours editable from admin settings and displayed dynamically in the customer-facing footer.

### Changes Made

| File                               | Change                                                                                                                         | Reason                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `app/admin/settings/page.tsx`      | Added "Enable Delivery Fee" toggle in Order Settings tab                                                                       | Admin control for delivery fee visibility in checkout                              |
| `app/admin/settings/page.tsx`      | Connected General tab operating hours inputs to API (load from settings on mount, save on submit)                              | Previously these inputs had no backend connection — values were lost on refresh    |
| `app/(customer)/checkout/page.tsx` | `OrderSummary` component now accepts `deliveryFeeEnabled` prop; delivery fee row conditionally rendered only when toggle is on | Checkout was showing "Delivery Fee: Free" even when delivery fees weren't intended |
| `app/components/layout/Footer.tsx` | Fetches `global_operating_hours_open` and `global_operating_hours_close` from `/checkout-config` endpoint                      | Previously used hardcoded "7:00 AM - 10:00 PM" values                              |
| `app/components/layout/Footer.tsx` | Added `formatTime12h()` helper for converting "HH:MM" to "H:MM AM/PM" display format                                           | Hours stored as 24h strings in DB, need 12h format for display                     |

### Decisions

- **Decision**: Delivery fee toggle defaults to off
  - **Rationale**: Delivery fees were already "temporarily disabled" in the codebase; defaulting to off maintains current behavior
- **Decision**: Operating hours displayed as single "Daily" entry in footer
  - **Alternatives**: Could show per-day schedules
  - **Rationale**: Backend stores global hours (not per-day), so a single "Daily" row is accurate
- **Decision**: Footer fetches from public `/checkout-config` endpoint
  - **Alternatives**: Could use a dedicated `/operating-hours` endpoint
  - **Rationale**: `/checkout-config` already existed and now includes hours data; avoids an extra endpoint
- **Decision**: Service charge math confirmed correct (1% of ₵0.10 = ₵0.001 → rounds to ₵0.00)
  - **Rationale**: Mathematically correct, not a financial or code bug

### Cross-Repo Impact

| File (API repo)                                                                           | Change                                                                                      | Impact on Frontend                                                                                                                                                      |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/Http/Controllers/Api/Admin/SystemSettingController.php`                              | `index()` now returns raw string values instead of cast values                              | **Fixes toggle persistence bug** — frontend `s.value === 'true'` comparisons now work correctly because API returns `"true"`/`"false"` strings instead of JSON booleans |
| `database/migrations/2026_04_04_072214_add_delivery_fee_and_operating_hours_settings.php` | Seeds `delivery_fee_enabled`, `global_operating_hours_open`, `global_operating_hours_close` | New settings available for frontend to read/write                                                                                                                       |
| `routes/public.php`                                                                       | `/checkout-config` expanded with delivery fee and operating hours data                      | Frontend checkout and footer fetch from this endpoint                                                                                                                   |
| `routes/employee.php`                                                                     | Settings allowlist expanded                                                                 | Admin settings page can read/write the new settings                                                                                                                     |

### Current State

- **Admin Settings > Order Settings**: Service charge toggle + percentage + cap, manual entry date toggle, **new** delivery fee toggle — all persist correctly on refresh
- **Admin Settings > General**: Operating hours inputs now load from and save to the API
- **Checkout page**: Delivery fee row appears only when `delivery_fee_enabled` is `true`; service charge remains dynamic
- **Footer**: Operating hours displayed dynamically from API instead of hardcoded
- **Build**: Passes clean
- **Branch**: `payment-order-bug-fixes`

### Pending / Follow-up

- POS checkout flow may also need delivery fee toggle integration
- Per-branch operating hours UI if the feature is needed later
- Delivery fee amount/calculation logic when delivery fees are actually enabled

---

## [2026-04-04] Session: Order Audit & Security Bug Fixes

### Intent

A comprehensive audit of the order/payment/checkout pipeline was performed across both repos, identifying 7 bugs. All were fixed in this session on the `payment-order-bug-fixes` branch. Frontend changes focused on making the service charge calculation dynamic (fetched from API) and adding admin controls for the new service charge settings.

### Changes Made

| File                               | Change                                                                                                                        | Reason                                                                                |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `app/(customer)/checkout/page.tsx` | Added `ServiceChargeConfig` interface, `DEFAULT_SC_CONFIG` constant, and `calcServiceCharge(subtotal, config)` helper         | Replace hardcoded 1% service charge with dynamic config from API                      |
| `app/(customer)/checkout/page.tsx` | Added `scConfig` state + `useEffect` fetching from `/checkout-config` public endpoint                                         | Frontend needs real service charge config (enabled, percent, cap) before checkout     |
| `app/(customer)/checkout/page.tsx` | Updated `OrderSummary` and `StepPayment` components to accept and use `scConfig` prop                                         | Both components need access to service charge config for accurate display/calculation |
| `app/(customer)/checkout/page.tsx` | Service charge label now shows dynamic percentage: "Service Charge (1%)"                                                      | UX clarity — user sees the actual percentage being applied                            |
| `app/admin/settings/page.tsx`      | Added `serviceChargeEnabled` (boolean toggle) and `serviceChargeCap` (text input) state variables                             | Admin needs controls for the two new system settings                                  |
| `app/admin/settings/page.tsx`      | Added loading of `service_charge_enabled` and `service_charge_cap` from admin settings API                                    | Populate UI with current values on page load                                          |
| `app/admin/settings/page.tsx`      | Added saving of both new settings alongside existing `manual_entry_date_enabled` and `service_charge_percent`                 | Persist changes when admin saves settings                                             |
| `app/admin/settings/page.tsx`      | Replaced static Service Charge card with: enable/disable toggle, percentage input, cap (GHS) input with conditional rendering | Full admin control over service charge behavior                                       |

### Decisions

- **Decision**: Fetch service charge config from a public `/checkout-config` endpoint
  - **Alternatives**: Could embed config in checkout session response or use authenticated endpoint
  - **Rationale**: Frontend needs service charge info before user is authenticated at checkout; public endpoint is simplest
- **Decision**: `calcServiceCharge()` helper applies percentage with cap logic client-side
  - **Rationale**: Matches the server-side calculation in `CheckoutSessionController::store()` — both use same percent + cap formula
- **Decision**: Conditional rendering for percentage/cap fields (only shown when service charge enabled)
  - **Rationale**: Reduces visual clutter when service charge is disabled

### Cross-Repo Impact

| File (API repo)                                          | Change                                                                                                                     | Impact on Frontend                                                    |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `routes/public.php`                                      | New `GET /checkout-config` endpoint                                                                                        | Frontend `useEffect` in checkout page fetches this                    |
| `app/Http/Controllers/Api/CheckoutSessionController.php` | Service charge now uses `service_charge_enabled`, `service_charge_percent`, `service_charge_cap` from SystemSettingService | Frontend calculation must match: `min(subtotal * percent / 100, cap)` |
| `app/Http/Requests/UpdateOrderStatusRequest.php`         | Removed `pending`, `confirmed`, `cancelled` from allowed statuses                                                          | No frontend impact — frontend already uses correct status values      |
| `app/Http/Controllers/Api/CheckoutSessionController.php` | Added branch authorization to `confirmCash()`/`confirmCard()`                                                              | No frontend impact — requests already scoped to correct branch        |

### Current State

- **Checkout page**: Service charge is fully dynamic — fetches config from API, applies percentage with cap, displays accurate label
- **Admin settings**: Full service charge management — toggle on/off, set percentage, set cap (GHS)
- **Build**: Passes clean
- **Branch**: `payment-order-bug-fixes`

### Pending / Follow-up

- POS checkout flow may also need service charge config integration (currently separate flow)
- Consider caching `/checkout-config` response client-side to avoid re-fetching on every checkout visit

---

## [2026-04-04] Session: Metadata Page Titles Across All Pages

### Intent

Every page in the app should have a unique, descriptive browser tab title. Previously most pages showed a generic "CediBites" title, making it impossible to tell tabs apart. The root layout had a `%s | CediBites` template, but almost no pages filled in the `%s`. Customer-facing routes under `(customer)` had some metadata, but all staff/admin/kitchen/partner/POS pages had none.

### Changes Made

**8 `'use client'` layouts split into server + client pairs:**

| Original File (now `layout-client.tsx`) | New Server `layout.tsx`        | Metadata                                                                     |
| --------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------- |
| `app/admin/layout.tsx`                  | `app/admin/layout.tsx`         | Template: `%s — Admin \| CediBites`, default: "Admin", robots noindex        |
| `app/kitchen/layout.tsx`                | `app/kitchen/layout.tsx`       | Template: `%s — Kitchen \| CediBites`, default: "Kitchen", robots noindex    |
| `app/partner/layout.tsx`                | `app/partner/layout.tsx`       | Template: `%s — Partner \| CediBites`, default: "Partner", robots noindex    |
| `app/pos/layout.tsx`                    | `app/pos/layout.tsx`           | Template: `%s — POS \| CediBites`, default: "POS", robots noindex            |
| `app/pos/terminal/layout.tsx`           | `app/pos/terminal/layout.tsx`  | Title: "Terminal"                                                            |
| `app/staff/layout.tsx`                  | `app/staff/layout.tsx`         | Template: `%s — Staff \| CediBites`, default: "Staff Portal", robots noindex |
| `app/staff/partner/layout.tsx`          | `app/staff/partner/layout.tsx` | Template: `%s — Partner \| CediBites`, default: "Partner"                    |
| `app/order-manager/layout.tsx`          | `app/order-manager/layout.tsx` | Title: "Order Manager", robots noindex                                       |

**1 existing server layout updated:**

| File                          | Change                                                 | Reason                                               |
| ----------------------------- | ------------------------------------------------------ | ---------------------------------------------------- |
| `app/(staff-auth)/layout.tsx` | Added metadata export — title: "Staff", robots noindex | Was a server component already, just needed metadata |

**55+ new sub-page `layout.tsx` files created**, each exporting specific `Metadata` titles:

| Section       | Count | Pages                                                                                                                                              |
| ------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin         | 14    | Dashboard, Orders, Branches, Menu, Configure Menu, Staff, Customers, Promos, Transactions, Analytics, Settings, Audit Log, Menu Add-ons, Menu Tags |
| Staff root    | 10    | Sign In, Forgot Password, Reset Password, Dashboard, Orders, Store, New Order, My Sales, My Shifts, Profile                                        |
| Staff/Manager | 12    | Manager Dashboard, Manager Orders, Analytics, Menu, Configure Menu, Menu Tags, Staff, Staff Sales, Shifts, My Shifts, Settings, New Order          |
| Staff/Partner | 5     | Dashboard, Orders, My Branch, Staff, Analytics                                                                                                     |
| Staff/Sales   | 5     | Sales Dashboard, Sales Orders, New Sales Order, My Sales, My Shifts                                                                                |
| Partner       | 5     | Dashboard, Orders, My Branch, Staff, Analytics                                                                                                     |
| Kitchen       | 1     | Kitchen Display                                                                                                                                    |
| POS           | 2     | Terminal, Orders                                                                                                                                   |
| Customer      | 4     | Payment Successful, Payment Cancelled, Checkout Return, Checkout Cancelled                                                                         |
| (Staff-auth)  | 1     | Change Password                                                                                                                                    |

### Decisions

- **Decision**: Layout-splitting pattern for `'use client'` layouts (rename to `layout-client.tsx` + create server `layout.tsx` wrapper)
  - **Alternatives**: Could have used `generateMetadata()` or other dynamic approaches
  - **Rationale**: Standard Next.js approach — metadata must be exported from server components; splitting keeps the client logic untouched
- **Decision**: Title templates at section level (e.g. `%s — Admin | CediBites`)
  - **Rationale**: Sub-page titles automatically get section context without repeating it in every file
- **Decision**: All internal/staff-facing sections get `robots: { index: false, follow: false }`
  - **Rationale**: These are private dashboards — search engines should not index them
- **Decision**: Sub-page layouts are minimal (metadata export + passthrough children)
  - **Rationale**: Only purpose is to set the title; no added complexity
- **Decision**: Customer payment result pages also get robots noindex
  - **Rationale**: Transient pages (success/cancelled) have no value in search results

### Current State

Every page in the app now has a unique, descriptive browser tab title. The title hierarchy is:

- **Root**: `CediBites — Authentic Ghanaian Food Delivery` (default) with template `%s | CediBites`
- **Section layouts**: Override with their own templates (e.g. `%s — Admin | CediBites`)
- **Sub-page layouts**: Set specific titles (e.g. "Dashboard", "Orders", "Analytics")
- **Result**: A page like Admin → Dashboard shows **"Dashboard — Admin | CediBites"** on the tab

Build verified clean (exit code 0).

### Cross-Repo Impact

None — this is a frontend-only change. No API changes needed.

### Pending / Follow-up

- Customer-facing route group `(customer)/` already had some metadata; could audit for consistency with the new pattern
- If new pages are added in the future, they should include a `layout.tsx` with metadata to maintain tab title coverage

---

## [2026-04-04] Session: Project Chronicle Agent Setup

### Intent

Create an institutional memory system for the CediBites project — a "Project Chronicle" agent that silently observes all changes across sessions, records them, and can brief developers and other agents on the current state of any part of the system.

### Changes Made

| File                                                      | Change                                        | Reason                                                                                                     |
| --------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `.github/agents/project-chronicle.agent.md`               | Created agent definition                      | New agent with read/search/edit/agent/todo tools, mandatory cross-referencing, structured chronicle format |
| `.github/instructions/chronicle-reminder.instructions.md` | Created instruction file with `applyTo: "**"` | Auto-reminds all agents to ask user about updating the chronicle after every code change                   |
| `PROJECT_CHRONICLE.md`                                    | Created knowledge base file                   | Seeded with system map (route groups, state management, API layer, utilities) as a hybrid starting point   |

### Cross-Repo Impact

| File (API repo)                                           | Change                              | Reason                                                                        |
| --------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------- |
| `.github/agents/project-chronicle.agent.md`               | Mirror of frontend agent definition | Same agent available in both repos                                            |
| `.github/instructions/chronicle-reminder.instructions.md` | Mirror of frontend instruction      | Reminder works regardless of which repo is being edited                       |
| `PROJECT_CHRONICLE.md`                                    | API knowledge base file             | Seeded with system map (routes, models, services, architecture, integrations) |

### Decisions

- **Decision**: Hybrid approach — seed with system map, build change log incrementally
  - **Alternatives**: Full scan first vs. purely incremental
  - **Rationale**: Gives the agent useful context from day 1 without requiring a massive upfront audit
- **Decision**: Place agent + chronicle in both repos
  - **Rationale**: Agent needs to be discoverable from either workspace; chronicle files track repo-specific changes
- **Decision**: Mandatory cross-referencing between repos
  - **Rationale**: API and frontend are tightly coupled — changes in one often affect the other
- **Decision**: `applyTo: "**"` for the reminder instruction
  - **Rationale**: Should trigger after editing any file type, not just specific ones

### Current State

The Project Chronicle system is fully set up and operational:

- Agent definition in both repos (`.github/agents/project-chronicle.agent.md`)
- Auto-reminder instruction in both repos (`.github/instructions/chronicle-reminder.instructions.md`)
- Knowledge base files in both repo roots (`PROJECT_CHRONICLE.md`)
- System maps seeded; change log ready for entries

### Pending / Follow-up

- First real development session will test the reminder flow end-to-end
- Chronicle entries will accumulate as sessions happen
