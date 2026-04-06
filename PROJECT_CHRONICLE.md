# CediBites Frontend â€” Project Chronicle

> **Purpose**: Living record of all changes, decisions, and current state of the CediBites Next.js frontend. Maintained by the Project Chronicle agent. Read this before starting work on any area.

> **Current Branch**: `menu-audit` (off `main`)

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

- **19 service files** in `lib/api/services/` â€” covering auth, orders, checkout sessions, menu, cart, payments, customers, staff, branches, analytics, roles, activity logs, notifications
- **17+ hooks** in `lib/api/hooks/` â€” React Query wrappers for all services
- **Client** in `lib/api/client.ts` â€” Axios HTTP client config
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

## [2026-04-06] Session: Smart Categories Admin Settings UI

### Intent

Build the admin management page for smart categories — a card-based UI allowing admins to enable/disable categories, adjust item limits, customize time windows for time-based categories, reorder display priority, preview resolved items per branch, warm cache, and reset individual categories to defaults.

### Changes Made

| File                                       | Change                                                                                                                                                                                                                                                                                                             | Reason                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| `types/api.ts`                             | Added `SmartCategorySetting` interface (14 fields) and `SmartCategoryPreview` interface                                                                                                                                                                                                                            | Type contracts for admin settings API                    |
| `lib/api/services/menu.service.ts`         | Added 6 methods: getSmartCategorySettings, updateSmartCategorySetting, reorderSmartCategories, previewSmartCategory, warmSmartCategoryCache, resetSmartCategorySetting                                                                                                                                             | Admin API integration for all CRUD + operational actions |
| `app/admin/menu/page.tsx`                  | Added "Smart Categories" tab to MENU_SUB_TABS                                                                                                                                                                                                                                                                      | Navigation to new admin page                             |
| `app/admin/menu-tags/page.tsx`             | Added "Smart Categories" tab to MENU_SUB_TABS                                                                                                                                                                                                                                                                      | Navigation consistency across all menu sub-pages         |
| `app/admin/menu/configure/page.tsx`        | Added "Smart Categories" tab to MENU_SUB_TABS                                                                                                                                                                                                                                                                      | Navigation consistency                                   |
| `app/admin/menu-add-ons/page.tsx`          | Added "Smart Categories" tab to MENU_SUB_TABS                                                                                                                                                                                                                                                                      | Navigation consistency                                   |
| `app/admin/menu/smart-categories/page.tsx` | **NEW** — Full admin page with: CardGrid for 9 categories (icon, name, toggle, item limit input, time window selectors), reorder arrows, preview panel with branch picker, cache warm button, reset-to-defaults per card, "Save All" banner for unsaved limit changes, stats bar showing enabled/time-based counts | Complete admin management interface for smart categories |

### Decisions

- **Decision**: Card-based layout (3-col grid) matching existing admin menu page conventions
  - **Rationale**: Consistent with existing admin UI patterns (Card, Toggle, FieldLabel components)
- **Decision**: Optimistic updates for reorder and limit changes
  - **Rationale**: Snappy UX — state updates immediately, API call follows. Reverts on failure.
- **Decision**: Branch picker in page header (not per-card)
  - **Rationale**: Preview and cache-warm are branch-scoped; single picker reduces UI noise
- **Decision**: "Save All" banner for unsaved item limit changes instead of per-card save
  - **Rationale**: Item limit changes are frequent small edits; batching saves reduces API noise
- **Decision**: Icon mapping dict from backend string keys to Phosphor React components
  - **Rationale**: Backend stores icon keys (fire, trend-up, etc.); frontend maps to named Phosphor icons

### Cross-Repo Impact

| File (API repo)                                                     | Change                                                                                   | Triggered By               |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------- |
| `app/Models/SmartCategorySetting.php`                               | **NEW** — Model for runtime category settings                                            | Admin settings storage     |
| `app/Http/Controllers/Api/Admin/SmartCategorySettingController.php` | **NEW** — 6-action admin controller                                                      | CRUD + operations backend  |
| `app/Services/SmartCategories/SmartCategoryService.php`             | **MODIFIED** — Now respects is_enabled, custom limits, custom time windows from settings | Settings integration       |
| `routes/admin.php`                                                  | Added 6 admin routes under `permission:manage_menu`                                      | API endpoints for frontend |
| `tests/Feature/SmartCategorySettingTest.php`                        | **NEW** — 16 tests, 170 assertions                                                       | Backend test coverage      |

### Current State

- **Admin menu navigation**: 5 tabs — Items, Add-ons, Tags, Configure, Smart Categories
- **Smart Categories page**: Accessible at `/admin/menu/smart-categories`
- **Features**: Toggle enable/disable, item limit (1–50), time window pickers (time-based only), arrow reorder, preview panel, cache warm, reset to defaults
- **TypeScript**: 0 errors
- **Branch**: `menu-audit`

### Pending / Follow-up

- Drag-and-drop reorder (currently arrow-based) if UX feedback warrants it
- Bulk enable/disable toggle for all smart categories at once
- Consider inline editing of category display names (currently uses enum-derived names)
- Manager menu page (`/staff/manager/menu/`) may need Smart Categories tab too

---

## [2026-04-06] Session: UX Architect Agent Creation

### Intent

Create a comprehensive UI/UX Design System & Experience Architect agent that serves as the single authority on visual design quality, interaction patterns, layout composition, information architecture, and user experience across all CediBites portals (Customer, Staff, Kitchen Display, POS, Admin).

### Changes Made

| File                                   | Change                                                                                     | Reason                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `.github/agents/ux-architect.agent.md` | **NEW** — Full UX Architect agent definition encoding the complete CediBites design system | Needed a dedicated design quality gate for all frontend work across every portal |

### Agent Coverage

- **Design System**: Full color palette (brand, semantic, neutral), typography hierarchy (font sizes, weights, line heights), shape language (border radii, shadows), iconography rules (Lucide icon set, sizing)
- **Component Standards**: Button variants, input fields, card patterns, modal/dialog rules, navigation patterns, table/list layouts, loading/empty/error states
- **Portal-Specific Layouts**: Customer (mobile-first menu browsing), Staff (multi-panel dashboard), Kitchen Display (large-type scannable cards), POS (touch-optimized grid), Admin (dense data management)
- **Responsive Rules**: Breakpoint system, mobile-first approach, touch target sizing
- **Dark Mode**: Full color mapping for dark theme
- **Animation Principles**: Transition durations, easing curves, motion guidelines
- **Microcopy Standards**: Tone of voice, error message patterns, button label conventions
- **Quality Checklist**: Structured checklist for validating design quality on every component

### Decisions

- **Decision**: Agent placed in the `cedibites` frontend workspace (not the API)
  - **Rationale**: Purely frontend-focused — governs visual design, components, and UX patterns that live entirely in the Next.js codebase
- **Decision**: Granted broad tools: `read, search, edit, execute, web, agent, todo`
  - **Rationale**: Agent needs to inspect sibling components for consistency, edit code to fix design issues, run builds to verify changes, and delegate to other agents
- **Decision**: Keyword-dense description for broad subagent discovery
  - **Rationale**: Ensures the agent is invoked across all frontend tasks — styling, layout, components, accessibility, responsive design, dark mode, animations, etc.
- **Decision**: Full design system encoded directly in the agent file
  - **Alternatives**: Separate design token files or external design docs
  - **Rationale**: Self-contained agent definition means the design system is always available in context when the agent is invoked, no extra file reads needed

### Current State

- **Agent ecosystem**: 5 agents now defined in `.github/agents/` — order-auditor, offline-explorer, project-chronicle, menu-auditor, **ux-architect**
- **No code changes** — purely an agent definition addition
- **Agent invocable** via `@UX Architect` in chat
- **Branch**: `menu-audit`

### Pending / Follow-up

- Create a design checklist `.instructions.md` with `applyTo: "app/components/**"` to auto-trigger the quality checklist on every component file edit
- Create a Tailwind class audit hook to catch rogue hex values, forbidden classes (`rounded-none`, `rounded-sm`, `font-light`), or colors outside the palette
- First full design audit run by the new agent (recommended across all portals)

---

## [2026-04-06] Session: Smart Categories System — Data-Driven Menu Discovery

### Intent

Replace hardcoded "CediBites Mix" and "Most Popular" categories on the customer-facing menu with a data-driven Smart Categories system. Categories like "Most Popular", "Trending", "Top Rated", "New Arrivals", time-based categories (Breakfast Favorites, Lunch Picks, Dinner Favorites, Late Night Bites), and personalized "Order Again" are now computed from actual order data, ratings, timestamps, and customer history.

### Architecture

- **Pattern**: Strategy pattern — `SmartCategory` enum (backend) maps to Resolver classes; `SmartCategoryService` orchestrates resolution + caching
- **Caching**: Laravel Cache with 6-hour TTL; warmed by `menu:compute-smart-categories` artisan command scheduled `everySixHours()`
- **Category ID Convention**: Smart categories use `smart:{slug}` prefix (e.g., `smart:most-popular`) to distinguish from regular category names in the frontend state

### Changes Made

| File                                                 | Change                                                                                                                                                                                                                                                          | Reason                                                            |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `types/api.ts`                                       | Added `SmartCategory` interface: `{ slug: string; name: string; icon: string; item_ids: number[] }`                                                                                                                                                             | Type contract for smart categories API response                   |
| `lib/api/services/menu.service.ts`                   | Added `getSmartCategories(branchId)` method calling `GET /smart-categories`                                                                                                                                                                                     | API integration for smart categories                              |
| `lib/api/hooks/useSmartCategories.ts`                | **NEW** — TanStack Query hook with 10-minute staleTime, enabled when branchId present                                                                                                                                                                           | React Query hook for data fetching                                |
| `app/components/providers/MenuDiscoveryProvider.tsx` | Integrated `useSmartCategories`. Smart categories prepended before regular categories with `smart:{slug}` IDs. `filteredItems` detects `smart:` prefix and filters by `item_ids` set. Removed hardcoded "Most Popular" tag-based logic.                         | Dynamic smart category integration replacing hardcoded categories |
| `app/components/ui/MenuGrid.tsx`                     | Added `smartCategories` from context. `activeSmartCategory` memo resolves `smart:` prefix to SmartCategory object. Replaced hardcoded "Most Popular" section with generic smart category section using SectionHeader. Removed unused `PopularHeader` component. | Dynamic rendering of whichever smart category is selected         |
| `app/(customer)/menu/page.tsx`                       | Categories now objects `{id, label}` instead of strings. `categoryCounts` includes smart category counts. Mobile strip and sidebar use `cat.id`/`cat.label`. `GroupedGrid` receives only regular (non-smart) categories via filter.                             | Support for mixed category types (smart + regular)                |

### Decisions

- **Decision**: `smart:` prefix convention to distinguish smart vs regular categories in state
  - **Alternatives**: Separate data structures or boolean flag on category objects
  - **Rationale**: String prefix is clean, simple, and requires no structural changes to the existing category handling pipeline
- **Decision**: 10-minute staleTime on `useSmartCategories` hook
  - **Rationale**: Smart categories change infrequently (6-hour backend cache TTL); 10-minute staleTime reduces unnecessary refetches while keeping data reasonably fresh
- **Decision**: Smart categories prepended before regular categories in the category list
  - **Rationale**: Smart categories are discovery-oriented and should appear first to drive engagement
- **Decision**: `GroupedGrid` only receives regular (non-smart) categories
  - **Rationale**: Smart categories display a flat item list (from `item_ids`), not grouped by category; different rendering logic

### Cross-Repo Impact

| File (API repo)                                         | Change                                                                                         | Triggered By                                       |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `app/Enums/SmartCategory.php`                           | **NEW** — 9-case backed enum with metadata methods                                             | Defines all smart category types                   |
| `app/Services/SmartCategories/SmartCategoryService.php` | **NEW** — Orchestrator with caching                                                            | Resolves and caches smart categories per branch    |
| `app/Services/SmartCategories/Resolvers/*.php`          | **NEW** — 6 resolver classes (Popular, Trending, TopRated, NewArrivals, TimeBased, OrderAgain) | Each resolver computes items for one category type |
| `app/Http/Controllers/Api/SmartCategoryController.php`  | **NEW** — Public API controller                                                                | Serves `GET /v1/smart-categories?branch_id={id}`   |
| `routes/public.php`                                     | Added smart-categories route                                                                   | Public endpoint consumed by frontend               |
| `routes/console.php`                                    | Added scheduled cache warming                                                                  | `menu:compute-smart-categories` every 6 hours      |
| `tests/Feature/SmartCategoryTest.php`                   | **NEW** — 22 tests, 83 assertions                                                              | Comprehensive backend test coverage                |

### Current State

- **TypeScript**: 0 errors across all modified files
- **Smart categories**: Dynamically rendered on customer menu based on time of day, branch data, and customer history
- **Categories**: Menu page now supports mixed category types — smart categories (prefixed `smart:`) + regular categories (plain names)
- **Removed**: Hardcoded "CediBites Mix" / "Most Popular" tag-based logic replaced with data-driven system
- **API endpoint**: `GET /v1/smart-categories?branch_id={id}` — public, no auth required
- **Branch**: `menu-audit`

### Pending / Follow-up

- Admin settings UI for toggling/configuring smart categories (enable/disable individual categories, adjust limits)
- "Staff Picks" tag to replace the manual `popular` tag for curated picks
- Potential future: collaborative filtering for "You Might Like"
- Consider adding smart category configuration to the admin menu management page
- Monitor rendering performance with many smart categories active simultaneously

---

## [2026-04-05] Session: Menu Item Image Display Fix (Full Pipeline)

### Intent

Fix menu item images not displaying on customer-facing menu pages. Images were uploading successfully to the backend (Spatie Media Library) but returning 403 Forbidden when accessed via their `/storage/` URLs. Additionally, optimize image delivery with thumbnails and Next.js image optimization.

### Changes Made

#### Phase 1: Image Upload Cleanup (carried from previous session)

| File                               | Change                                 | Reason                                                       |
| ---------------------------------- | -------------------------------------- | ------------------------------------------------------------ |
| `lib/utils/compressImage.ts`       | Removed debug `console.log` statements | Cleanup — compression utility was finalized in prior session |
| `lib/api/services/menu.service.ts` | Removed debug `console.log` statements | Cleanup — image upload integration complete                  |
| `app/admin/menu/page.tsx`          | Removed debug `console.log` statements | Cleanup — save flow rewrite complete                         |

#### Phase 2: Image Display Fix

| File                                                 | Change                                                                                                                 | Reason                                                                                                           |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `next.config.ts`                                     | Removed `images: { unoptimized: true }`, added `remotePatterns` for `beta-api.cedibites.com` and `app.cedibites.com`   | Enables Next.js built-in image optimization (WebP/AVIF, responsive resizing, lazy loading) for API-served images |
| `types/api.ts`                                       | Added `thumbnail_url` field to `MenuItemOption` and `MenuItem` interfaces                                              | API now returns thumbnail URLs alongside full-size image URLs                                                    |
| `app/components/providers/MenuDiscoveryProvider.tsx` | `SearchableItem` type now includes `thumbnail` field; transform maps `thumbnail_url` → `thumbnail` for items and sizes | Provider feeds thumbnail data into menu discovery/search system                                                  |
| `app/components/ui/MenuItemCard.tsx`                 | Cards prefer `thumbnail` over full `image` for grid loading                                                            | 400×300 thumbnails load significantly faster than full-res images in card grids                                  |

### Decisions

- **Decision**: Enable Next.js image optimization via `remotePatterns` instead of `unoptimized: true`
  - **Rationale**: Automatic WebP/AVIF conversion, responsive `srcset`, and lazy loading — massive performance gain with no code changes needed in `<Image>` components
- **Decision**: Cards use `thumbnail` (400×300), detail modal keeps full resolution
  - **Rationale**: Cards are small and rendered in grids (many at once); thumbnails reduce bandwidth. Detail view is full-screen, warrants full-res.
- **Decision**: Map `thumbnail_url` → `thumbnail` in `MenuDiscoveryProvider` transform
  - **Rationale**: Keep frontend naming consistent (`image`/`thumbnail`) while API uses `image_url`/`thumbnail_url`

### Cross-Repo Impact

| File (API repo)                                 | Change                                                                | Impact on Frontend                                                     |
| ----------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `app/Http/Controllers/Api/MediaController.php`  | **NEW** — serves media through Laravel with caching headers           | Image URLs changed from `/storage/...` (403) to `/v1/media/{id}` (200) |
| `routes/public.php`                             | Added `GET /v1/media/{media}/{conversion?}`                           | New public route for all media access                                  |
| `app/Http/Resources/MenuItemResource.php`       | `image_url` uses `route('media.show', $media)`, added `thumbnail_url` | Frontend receives route-based URLs + thumbnails                        |
| `app/Http/Resources/MenuItemOptionResource.php` | Same changes as MenuItemResource                                      | Option images also served via new route                                |
| `app/Models/MenuItemOption.php`                 | Added `registerMediaConversions()` with `thumbnail` (400×300)         | Thumbnails generated on upload for options                             |

### Current State

- **Image upload pipeline**: Fully working — admin → client-side compress → API → Spatie Media Library
- **Image display on customer side**: Fully working — route-based media URLs bypass Nginx `/storage/` 403
- **Performance**: Next.js image optimization enabled, ETag/304 caching on media endpoint, thumbnail conversions for card grids
- **Note**: Existing images need `php artisan media-library:regenerate --only-missing` to generate thumbnails
- **Build**: Passes clean
- **Branch**: `payment-order-bug-fixes`

### Pending / Follow-up

- Run `php artisan media-library:regenerate --only-missing` on production to backfill thumbnails for existing images
- Other media types (if any) may also benefit from the route-based serving pattern
- Monitor Next.js image optimization cache behavior in production

---

## [2026-04-04] Session: syncOptions Race Condition Fix (Image Upload Root Cause)

### Intent

Fix the root cause of "images not showing on customer side" and the red toast error "Item saved but image/option sync failed. Please re-open and retry." — both caused by a delete-before-create race condition in the `syncOptions()` function within menu item save flows.

### Changes Made

| File                              | Change                                                                                                                                          | Reason                                                                                                                                                                                                                                  |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/admin/menu/page.tsx`         | Reordered `syncOptions()` inside `saveItem()` (~lines 1048-1086): upsert (create/update) desired options FIRST, then delete stale options AFTER | Previously deleted non-desired options before creating new ones. When all option keys were replaced (zero overlap), the delete loop hit the backend's `count() <= 1` guard on `MenuItemOptionController::destroy()`, returning HTTP 422 |
| `app/staff/manager/menu/page.tsx` | Same reorder in `syncOptions()` (~lines 792-826): upsert first, delete second                                                                   | Same race condition existed on the Branch Manager menu page                                                                                                                                                                             |

### Decisions

- **Decision**: Reorder syncOptions (upsert-then-delete) rather than modifying backend guard
  - **Alternatives**: Remove or weaken the backend's "cannot delete last option" guard; add a bulk-sync endpoint
  - **Rationale**: The backend guard is correct — menu items should always have at least one option. The frontend was just calling operations in the wrong order.
- **Decision**: No backend changes needed
  - **Rationale**: `MenuItemOptionController::destroy()` returning 422 when `count() <= 1` is the right behavior; the fix is purely a frontend operation ordering issue

### Cross-Repo Impact

| File (API repo)                                                       | Change    | Notes                                                                                                    |
| --------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------- |
| `app/Http/Controllers/Api/MenuItemOptionController.php` — `destroy()` | No change | Backend's `count() <= 1` guard confirmed correct. The 422 was a symptom of frontend calling delete first |

### Current State

- Both admin and BM menu pages now upsert options before deleting stale ones
- Image uploads complete successfully — they run at the end of the `syncOptions` chain, which no longer breaks at the delete step
- The red toast error no longer appears when replacing all option keys
- Build passes cleanly (0 errors, all routes static)
- Branch: `payment-order-bug-fixes`

### Pending / Follow-up

- Shared menu components extraction remains outstanding (ItemModal, syncOptions logic duplicated in admin and BM)
- Admin menu page decomposition (74KB single file) — syncOptions is one of many functions that should be extracted

---

## [2026-04-04] Session: Restore Missing DB Enum CHECK Constraints (Production)

### Intent

Production database inspection revealed that the `order_source` column on the `orders` table has **no CHECK constraint** — meaning any arbitrary string could be inserted. Investigation traced this to earlier migrations that dropped constraints and failed to consistently re-create them due to differing `LIKE` patterns. The same issue likely affects `order_type`, `status` on orders and `payment_method`, `payment_status` on payments.

### Root Cause

Two migrations modify enum constraints on the `orders` table using different constraint-finding patterns:

- `2026_04_02_145534` uses `LIKE '%{column}%'` (no parens) — broad match
- `2026_04_03_100005` uses `LIKE '%({column})%'` (with parens) — strict match

When the constraint format created by one migration doesn't match the lookup pattern of a later migration, constraints get dropped but not re-created. Result: production DB has `varchar(255)` columns with **no validation**.

### Changes Made

| File                  | Change | Reason                                  |
| --------------------- | ------ | --------------------------------------- |
| (No frontend changes) | —      | This is a backend-only DB integrity fix |

### Cross-Repo Impact (API repo)

| File                                                                       | Change                                                                                              | Reason                                                                        |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `database/migrations/2026_04_04_080726_restore_enum_check_constraints.php` | **NEW** — Idempotently restores CHECK constraints on 5 enum columns across orders + payments tables | Production DB missing constraints = no DB-level validation on critical fields |

### Constraints Restored

| Table      | Column           | Allowed Values                                                                                                              |
| ---------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `orders`   | `order_source`   | online, phone, whatsapp, instagram, facebook, pos, manual_entry                                                             |
| `orders`   | `order_type`     | delivery, pickup, dine_in, takeaway                                                                                         |
| `orders`   | `status`         | received, accepted, preparing, ready, out_for_delivery, delivered, ready_for_pickup, completed, cancelled, cancel_requested |
| `payments` | `payment_method` | mobile_money, card, wallet, ghqr, cash, no_charge, manual_momo                                                              |
| `payments` | `payment_status` | pending, completed, failed, refunded, cancelled, expired, no_charge                                                         |

### Decisions

- **Decision**: Idempotent migration that drops+recreates all constraints regardless of current state
  - **Rationale**: Safest approach — works whether constraints exist, partially exist, or are completely missing
- **Decision**: Canonical constraint naming: `{table}_{column}_check`
  - **Rationale**: Consistent naming prevents future lookup mismatches between migrations
- **Decision**: `down()` is a no-op
  - **Rationale**: Rolling back constraints would leave the DB less safe; no reason to ever remove them
- **Decision**: Covers both `orders` and `payments` tables
  - **Rationale**: Migration `2026_04_02` also widened `payment_method` on payments — same risk applies

### Current State

- **Migration ready** to run on production — will restore all 5 CHECK constraints
- **No data cleanup needed** — existing data should already be valid (app logic enforces valid values)
- **Branch**: `payment-order-bug-fixes`

### Pending / Follow-up

- Run migration on production: `php artisan migrate`
- After running, verify constraints exist in DB viewer (`check` column should show constraint definition)
- Consider standardizing all future enum-widening migrations to use the same `ensureEnumConstraint()` pattern

---

## [2026-04-04] Session: Fix Date Picker Not Showing in Record Past Order Modal

### Intent

The "Record Past Order" payment modal in the POS terminal only showed a time picker, even when the `manual_entry_date_enabled` setting was turned on in admin. The engineer expected a full date+time picker when the setting is enabled, and time-only (for today) when disabled.

### Changes Made

| File                                                  | Change                                                                                      | Reason                                                                                                                                                                                             |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/pos/terminal/page.tsx` (PaymentModal, ~line 965) | Changed type of `val` from `string` to `unknown`; added `val === true` to the boolean check | API's `SystemSettingService::get()` casts boolean settings to actual JS `true`/`false`, not strings â€” the old `val === 'true' \|\| val === '1'` strict comparison never matched a boolean `true` |

### Root Cause

The API `SystemSettingService::castValue()` for `type: 'boolean'` returns a real boolean via `filter_var(FILTER_VALIDATE_BOOLEAN)`. The settings GET route (`routes/employee.php`) uses `$service->get($key)` which returns this cast boolean. The JSON response sends `{ "data": { "value": true } }`. The frontend was comparing with `=== 'true'` (string), which never matches boolean `true`.

### Cross-Repo Impact

| Area                                                             | Detail                                                                                                                                                                                            |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cedibites_api/app/Services/SystemSettingService.php`            | No change needed â€” the API behavior (returning typed booleans) is correct                                                                                                                       |
| `cedibites_api/routes/employee.php` GET `/settings/{key}`        | Returns cast values via `$service->get()` â€” boolean settings come as real booleans                                                                                                              |
| Related: Admin settings toggle persistence fix (earlier session) | The admin `index()` endpoint was changed to return raw strings to fix toggle persistence â€” but the **individual** GET endpoint still returns cast values. This is a discrepancy to be aware of. |

### Decisions

- **Decision**: Fix on the frontend by accepting both boolean and string values
  - **Alternatives**: Could have changed the API to always return strings for consistency
  - **Rationale**: The API cast behavior is correct and used elsewhere; safest to make the frontend robust to both types

### Current State

- **POS Record Past Order modal**: Shows `datetime-local` picker when `manual_entry_date_enabled` is `true`; shows `time` picker when `false` â€” working correctly now
- **Build**: Passes clean
- **Branch**: `payment-order-bug-fixes`

### Pending / Follow-up

- The individual GET `/settings/{key}` returns cast values (booleans) while the admin `index()` returns raw strings â€” this inconsistency could cause similar bugs elsewhere. Consider standardizing.

---

## [2026-04-04] Session: Menu Auditor Agent Creation

### Intent

Create a dedicated agent to own and audit the entire menu system holistically across both the frontend and backend repos. The menu is the backbone of the multi-channel food-ordering platform â€” every order, cart, POS terminal, kitchen display, analytics report, and customer-facing menu page depends on menu data. A single authority was needed to ensure structural integrity, correctness, performance, scalability, and UX consistency.

### Changes Made

| File                                   | Change                                                                        | Reason                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `.github/agents/menu-auditor.agent.md` | **NEW** â€” Full-stack Menu Management Auditor and Architect agent definition | Dedicated cross-cutting authority for the menu domain across both repos |

### Decisions

- **Decision**: Placed in the frontend repo's `.github/agents/` directory
  - **Rationale**: Alongside existing agents (order-auditor, offline-explorer, project-chronicle) for consistency
- **Decision**: Granted edit capabilities (`read, search, execute, web, agent, todo, edit`)
  - **Rationale**: Agent may need to fix menu issues across both repos, not just audit them
- **Decision**: Comprehensive audit checklist embedded in the agent file
  - **Rationale**: Enables structured health reports covering all 7 menu models, price resolution, availability, cart integrity, and 6+ portal surfaces
- **Decision**: Cross-portal consistency rules documented (price display, availability filtering, option label usage per portal context)
  - **Rationale**: Menu data renders differently across Customer menu, Admin CRUD (~74KB page), POS, Kitchen display, Staff new-order, Manager menu, Partner portal, and Menu audit page
- **Decision**: Engineering principles section enforces N+1 prevention, thin controllers, type safety, transactions, soft deletes
  - **Rationale**: Menu queries are high-frequency and touch many relations; performance and data integrity are critical

### Agent Coverage

- **Models**: MenuItem, MenuCategory, MenuItemOption, MenuItemOptionBranchPrice, MenuAddOn, MenuTag, MenuItemRating
- **Backend**: Price resolution pipeline (branch override â†’ base price fallback), availability resolution across all layers, bulk import audit
- **Frontend**: TanStack React Query cache patterns, menu adapters/transformers, `types/api.ts` contract validation
- **Portals**: Customer menu, Admin CRUD, POS terminal, Kitchen display, Staff new-order, Manager menu, Partner portal, Menu audit page
- **Collaboration**: Inter-agent protocols with Order Auditor, Project Chronicle, Offline Explorer

### Cross-Repo Impact

| Area                                                       | Impact                                                                      |
| ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| `cedibites_api/` (all menu models, controllers, resources) | Menu Auditor agent now has formal ownership of auditing backend menu domain |
| `types/api.ts` â†” Laravel API Resources                   | Agent responsible for validating frontend-backend contract alignment        |
| Menu services, hooks, adapters in `lib/api/`               | Agent covers TanStack Query cache patterns and data transformation layer    |

### Current State

- **Agent ecosystem**: 4 agents now defined in `.github/agents/` â€” order-auditor, offline-explorer, project-chronicle, **menu-auditor**
- **No code changes** â€” purely an agent definition addition
- **Branch**: `payment-order-bug-fixes`

### Pending / Follow-up

- First full menu audit run by the new agent (recommended)
- Potential synergy check between Menu Auditor and Order Auditor on cart â†’ order snapshot integrity

---

## [2026-04-04] Session: Settings Toggle Persistence, Delivery Fee Toggle & Global Operating Hours

### Intent

Fix a bug where admin settings toggles reset on page refresh despite being saved correctly. Add a delivery fee toggle so admins can control whether the checkout shows delivery fees. Add global operating hours editable from admin settings and displayed dynamically in the customer-facing footer.

### Changes Made

| File                               | Change                                                                                                                         | Reason                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `app/admin/settings/page.tsx`      | Added "Enable Delivery Fee" toggle in Order Settings tab                                                                       | Admin control for delivery fee visibility in checkout                              |
| `app/admin/settings/page.tsx`      | Connected General tab operating hours inputs to API (load from settings on mount, save on submit)                              | Previously these inputs had no backend connection â€” values were lost on refresh  |
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
- **Decision**: Service charge math confirmed correct (1% of â‚µ0.10 = â‚µ0.001 â†’ rounds to â‚µ0.00)
  - **Rationale**: Mathematically correct, not a financial or code bug

### Cross-Repo Impact

| File (API repo)                                                                           | Change                                                                                      | Impact on Frontend                                                                                                                                                        |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/Http/Controllers/Api/Admin/SystemSettingController.php`                              | `index()` now returns raw string values instead of cast values                              | **Fixes toggle persistence bug** â€” frontend `s.value === 'true'` comparisons now work correctly because API returns `"true"`/`"false"` strings instead of JSON booleans |
| `database/migrations/2026_04_04_072214_add_delivery_fee_and_operating_hours_settings.php` | Seeds `delivery_fee_enabled`, `global_operating_hours_open`, `global_operating_hours_close` | New settings available for frontend to read/write                                                                                                                         |
| `routes/public.php`                                                                       | `/checkout-config` expanded with delivery fee and operating hours data                      | Frontend checkout and footer fetch from this endpoint                                                                                                                     |
| `routes/employee.php`                                                                     | Settings allowlist expanded                                                                 | Admin settings page can read/write the new settings                                                                                                                       |

### Current State

- **Admin Settings > Order Settings**: Service charge toggle + percentage + cap, manual entry date toggle, **new** delivery fee toggle â€” all persist correctly on refresh
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
| `app/(customer)/checkout/page.tsx` | Service charge label now shows dynamic percentage: "Service Charge (1%)"                                                      | UX clarity â€” user sees the actual percentage being applied                          |
| `app/admin/settings/page.tsx`      | Added `serviceChargeEnabled` (boolean toggle) and `serviceChargeCap` (text input) state variables                             | Admin needs controls for the two new system settings                                  |
| `app/admin/settings/page.tsx`      | Added loading of `service_charge_enabled` and `service_charge_cap` from admin settings API                                    | Populate UI with current values on page load                                          |
| `app/admin/settings/page.tsx`      | Added saving of both new settings alongside existing `manual_entry_date_enabled` and `service_charge_percent`                 | Persist changes when admin saves settings                                             |
| `app/admin/settings/page.tsx`      | Replaced static Service Charge card with: enable/disable toggle, percentage input, cap (GHS) input with conditional rendering | Full admin control over service charge behavior                                       |

### Decisions

- **Decision**: Fetch service charge config from a public `/checkout-config` endpoint
  - **Alternatives**: Could embed config in checkout session response or use authenticated endpoint
  - **Rationale**: Frontend needs service charge info before user is authenticated at checkout; public endpoint is simplest
- **Decision**: `calcServiceCharge()` helper applies percentage with cap logic client-side
  - **Rationale**: Matches the server-side calculation in `CheckoutSessionController::store()` â€” both use same percent + cap formula
- **Decision**: Conditional rendering for percentage/cap fields (only shown when service charge enabled)
  - **Rationale**: Reduces visual clutter when service charge is disabled

### Cross-Repo Impact

| File (API repo)                                          | Change                                                                                                                     | Impact on Frontend                                                    |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `routes/public.php`                                      | New `GET /checkout-config` endpoint                                                                                        | Frontend `useEffect` in checkout page fetches this                    |
| `app/Http/Controllers/Api/CheckoutSessionController.php` | Service charge now uses `service_charge_enabled`, `service_charge_percent`, `service_charge_cap` from SystemSettingService | Frontend calculation must match: `min(subtotal * percent / 100, cap)` |
| `app/Http/Requests/UpdateOrderStatusRequest.php`         | Removed `pending`, `confirmed`, `cancelled` from allowed statuses                                                          | No frontend impact â€” frontend already uses correct status values    |
| `app/Http/Controllers/Api/CheckoutSessionController.php` | Added branch authorization to `confirmCash()`/`confirmCard()`                                                              | No frontend impact â€” requests already scoped to correct branch      |

### Current State

- **Checkout page**: Service charge is fully dynamic â€” fetches config from API, applies percentage with cap, displays accurate label
- **Admin settings**: Full service charge management â€” toggle on/off, set percentage, set cap (GHS)
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

| Original File (now `layout-client.tsx`) | New Server `layout.tsx`        | Metadata                                                                       |
| --------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------ |
| `app/admin/layout.tsx`                  | `app/admin/layout.tsx`         | Template: `%s â€” Admin \| CediBites`, default: "Admin", robots noindex        |
| `app/kitchen/layout.tsx`                | `app/kitchen/layout.tsx`       | Template: `%s â€” Kitchen \| CediBites`, default: "Kitchen", robots noindex    |
| `app/partner/layout.tsx`                | `app/partner/layout.tsx`       | Template: `%s â€” Partner \| CediBites`, default: "Partner", robots noindex    |
| `app/pos/layout.tsx`                    | `app/pos/layout.tsx`           | Template: `%s â€” POS \| CediBites`, default: "POS", robots noindex            |
| `app/pos/terminal/layout.tsx`           | `app/pos/terminal/layout.tsx`  | Title: "Terminal"                                                              |
| `app/staff/layout.tsx`                  | `app/staff/layout.tsx`         | Template: `%s â€” Staff \| CediBites`, default: "Staff Portal", robots noindex |
| `app/staff/partner/layout.tsx`          | `app/staff/partner/layout.tsx` | Template: `%s â€” Partner \| CediBites`, default: "Partner"                    |
| `app/order-manager/layout.tsx`          | `app/order-manager/layout.tsx` | Title: "Order Manager", robots noindex                                         |

**1 existing server layout updated:**

| File                          | Change                                                   | Reason                                               |
| ----------------------------- | -------------------------------------------------------- | ---------------------------------------------------- |
| `app/(staff-auth)/layout.tsx` | Added metadata export â€” title: "Staff", robots noindex | Was a server component already, just needed metadata |

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
  - **Rationale**: Standard Next.js approach â€” metadata must be exported from server components; splitting keeps the client logic untouched
- **Decision**: Title templates at section level (e.g. `%s â€” Admin | CediBites`)
  - **Rationale**: Sub-page titles automatically get section context without repeating it in every file
- **Decision**: All internal/staff-facing sections get `robots: { index: false, follow: false }`
  - **Rationale**: These are private dashboards â€” search engines should not index them
- **Decision**: Sub-page layouts are minimal (metadata export + passthrough children)
  - **Rationale**: Only purpose is to set the title; no added complexity
- **Decision**: Customer payment result pages also get robots noindex
  - **Rationale**: Transient pages (success/cancelled) have no value in search results

### Current State

Every page in the app now has a unique, descriptive browser tab title. The title hierarchy is:

- **Root**: `CediBites â€” Authentic Ghanaian Food Delivery` (default) with template `%s | CediBites`
- **Section layouts**: Override with their own templates (e.g. `%s â€” Admin | CediBites`)
- **Sub-page layouts**: Set specific titles (e.g. "Dashboard", "Orders", "Analytics")
- **Result**: A page like Admin â†’ Dashboard shows **"Dashboard â€” Admin | CediBites"** on the tab

Build verified clean (exit code 0).

### Cross-Repo Impact

None â€” this is a frontend-only change. No API changes needed.

### Pending / Follow-up

- Customer-facing route group `(customer)/` already had some metadata; could audit for consistency with the new pattern
- If new pages are added in the future, they should include a `layout.tsx` with metadata to maintain tab title coverage

---

## [2026-04-04] Session: Project Chronicle Agent Setup

### Intent

Create an institutional memory system for the CediBites project â€” a "Project Chronicle" agent that silently observes all changes across sessions, records them, and can brief developers and other agents on the current state of any part of the system.

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

- **Decision**: Hybrid approach â€” seed with system map, build change log incrementally
  - **Alternatives**: Full scan first vs. purely incremental
  - **Rationale**: Gives the agent useful context from day 1 without requiring a massive upfront audit
- **Decision**: Place agent + chronicle in both repos
  - **Rationale**: Agent needs to be discoverable from either workspace; chronicle files track repo-specific changes
- **Decision**: Mandatory cross-referencing between repos
  - **Rationale**: API and frontend are tightly coupled â€” changes in one often affect the other
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
