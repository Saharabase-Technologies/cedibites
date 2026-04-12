# CediBites Frontend â€” Project Chronicle

> **Purpose**: Living record of all changes, decisions, and current state of the CediBites Next.js frontend. Maintained by the Project Chronicle agent. Read this before starting work on any area.

> **Current Branch**: `main` / `beta` (synced)

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

## [2026-04-12] Session: Shifts & Staff Sales in Admin Staff Section

### Intent

Bring shift tracking and staff sales analytics into the Admin Staff section (`/admin/staff`), giving admins a centralized cross-branch view of staff activity alongside the existing directory. Previously these were only accessible from the Branch Manager portal.

### Changes Made

| File | Change | Reason |
|------|--------|--------|
| `app/admin/staff/layout.tsx` | Updated to render `StaffTabNav` above page content | Enable tab-based navigation within staff section |
| `app/admin/staff/StaffTabNav.tsx` | New client component with Directory / Shifts / Staff Sales tabs using `usePathname` for active state | Admin needs to switch between staff views without leaving the section |
| `app/admin/staff/shifts/page.tsx` | New admin shifts page with branch filter, staff search, calendar toggle, active sessions hero, and session list | Admins need cross-branch shift visibility — reuses `ShiftsCalendar` from manager |
| `app/admin/staff/sales/page.tsx` | New admin staff sales page with period selector (7 options), branch filter, staff search, payment method breakdown cards | Admins need cross-branch sales breakdown — uses new admin analytics endpoint |
| `lib/api/services/analytics.service.ts` | Added `AdminStaffSalesRow` interface and `getAdminStaffSales()` method calling `GET /admin/analytics/staff-sales` | Frontend contract for new admin endpoint |
| `lib/api/hooks/useAnalytics.ts` | Added `useAdminStaffSales()` TanStack Query hook with period/branch filters | Data fetching for admin staff sales page |

### Decisions

- **Decision**: Use route-based tabs under `/admin/staff/` (Directory | Shifts | Sales) instead of putting data in the staff detail drawer
  - **Rationale**: Shifts need a full calendar grid and sales need filterable tables — too cramped for a drawer. Dedicated pages with branch/search filters are the right primary surface.
- **Decision**: Reuse `ShiftsCalendar` component from manager portal
  - **Rationale**: Avoid duplication — same UX pattern, different data scoping (admin sees all branches)
- **Decision**: Admin staff sales uses new `GET /admin/analytics/staff-sales` endpoint with date range + branch filters (not the manager's single-date endpoint)
  - **Rationale**: Admin needs period-based views (today, week, month, etc.) across all branches, unlike the manager's single-branch/single-date view

### Current State

- `/admin/staff` — Directory tab (existing CRUD page, unchanged)
- `/admin/staff/shifts` — Shifts tab with branch filter, staff search, calendar, active sessions
- `/admin/staff/sales` — Staff Sales tab with period selector, branch filter, payment breakdown
- Tab navigation visible on all three pages via shared layout

### Cross-Repo Impact

| File (Backend) | Change |
|------|--------|
| `AdminAnalyticsController.php` | Added `staffSales()` method |
| `routes/admin.php` | Registered `GET admin/analytics/staff-sales` under `view_orders` permission |

---

## [2026-04-12] Session: BM Staff Sales Fix + manual_momo Support

### Intent

Fix Branch Manager Staff Sales page (`/staff/manager/staff-sales`) showing "No sales recorded" despite having data, and add support for the `manual_momo` payment method as a distinct "Direct MoMo" category.

### Changes Made

| File | Change | Reason |
|------|--------|--------|
| `lib/api/services/branch.service.ts` | Added `manual_momo_total: number` and `manual_momo_count: number` to `StaffSalesRow` interface | Match new backend response shape after `manual_momo` was added as a standalone metric |
| `app/staff/manager/staff-sales/page.tsx` | Added `manual_momo_total`/`manual_momo_count` to local `StaffSalesRow` interface | Match new backend response shape |
| `app/staff/manager/staff-sales/page.tsx` | Added `HandCoinsIcon` import, "Direct MoMo" entry in `METHODS` array with orange-600 color | New payment method card in per-staff breakdown |
| `app/staff/manager/staff-sales/page.tsx` | Updated `totals` reducer to include `manualMomo` accumulator | Grand totals need to sum manual_momo across all staff |
| `app/staff/manager/staff-sales/page.tsx` | Added conditional Direct MoMo line in grand total footer | Shows Direct MoMo total only when > 0 |
| `app/staff/manager/staff-sales/page.tsx` | Changed per-staff grid from `sm:grid-cols-4` to `sm:grid-cols-5` | 5 payment methods now (MoMo, Cash, Direct MoMo, No Charge, Card) |

### Decisions

- **Decision**: No changes needed to My Sales page (`MySalesView.tsx`)
  - **Rationale**: `cash_on_delivery` is a branch payment setting key, not a payments DB value. The payments table stores `cash`. `manual_momo` already has a card in `PAYMENT_BREAKDOWN_CONFIG`.

### Current State

- **BM Staff Sales**: Page now correctly displays staff rows with per-method breakdowns including Direct MoMo
- **Direct MoMo card**: Appears with orange `HandCoinsIcon`, only shown in grand total footer when > 0
- **Grid layout**: 5-column grid accommodates all payment methods
- **Deployed**: Committed and pushed to `main`

### Cross-Repo Impact

| File (Backend repo) | Change | Impact |
|------|--------|--------|
| `app/Services/Analytics/AnalyticsService.php` | Rewrote `getStaffSalesMetrics()` with explicit JOINs, table-prefixed filters, `payments.amount` SUMs, `manual_momo` columns, `cash_on_delivery` merged into `cash`, manual soft-delete check | Root cause fix for ambiguous column error; new response shape consumed by frontend |

### Pending / Follow-up

- My Sales page 200-order cap (deferred to future session)
- Repository redirect warning on push (GitHub repo moved from somdarv to Saharabase-Technologies — cosmetic, pushes succeed)

---

## [2026-04-12] Session: 13-Issue Audit Fix

### Intent

Fix and enhance analytics UI across admin, partner, and manager portals — correcting corrupted chart rendering, adding new period options, surfacing new backend data fields (order type splits, supporting stats, fulfilled customer filtering), and UX improvements.

### Changes Made

| File | Change | Reason |
|------|--------|--------|
| `app/admin/analytics/page.tsx` | Fixed corrupted WeeklyRevenueComparison (bar widths, heights, text positioning) | Chart bars and labels were misaligned after prior changes |
| `app/admin/analytics/page.tsx` | Added "Last Week" period option | Users needed week-over-week comparison capability |
| `app/admin/analytics/page.tsx` | Enhanced AvgItemsPerOrder with supporting stats (`single_item_orders_pct`, `multi_item_orders`, `max_items_in_order`) | Provides actionable context around the average |
| `app/admin/analytics/page.tsx` | Dynamic order type donut chart (delivery, pickup, dine_in, etc. with label/pct/revenue) | Replaced static delivery vs pickup binary with dynamic breakdown from backend |
| `app/admin/analytics/page.tsx` | Changed top customers title to "Top 5 Customers by Fulfilled Orders" | Reflects backend change to filter by completed/delivered orders only |
| `app/partner/analytics/page.tsx` | Updated customer title to fulfilled orders, added dynamic order type split | Partner portal aligned with admin analytics changes |
| `app/staff/manager/analytics/page.tsx` | Fixed custom filter button guard, increased pill sizing | Button was accessible when it shouldn't be; pills were too small on mobile |
| `app/staff/manager/analytics/page.tsx` | Made FulfilmentRate and TopItemsCard period-aware | These cards were ignoring the selected period — now filter by date range |
| `app/staff/manager/settings/page.tsx` | Added help tooltip explaining branch status toggle | BM needed guidance on what the toggle does (chosen over full documentation page) |
| `lib/api/hooks/useAnalytics.ts` | Added `last_week` to `AnalyticsPeriod` type and `getDateRange()` | New period option for analytics hooks |
| `lib/api/services/analytics.service.ts` | Updated `SalesAnalytics` and `DeliveryPickupAnalytics` types with new fields | TypeScript types match updated API response shape |

### Decisions

- **Decision**: BM configurator gets tooltip explanation rather than full documentation page
  - **Rationale**: A tooltip provides just-in-time help without navigating away. Full docs page is overkill for a single toggle.
- **Decision**: Average items per order enhanced with 3 supporting stats (Option A) over redesigning the card layout
  - **Rationale**: Adding stats below the main metric preserves the existing card grid layout while adding actionable detail. A redesign would affect the entire analytics page structure.
- **Decision**: Dynamic order type donut chart replaces static delivery/pickup split
  - **Rationale**: Backend now returns all order types dynamically. Hardcoding delivery/pickup would miss dine_in and future order types.

### Current State

- **Admin Analytics**: WeeklyRevenueComparison chart renders correctly, 10 period options (Today through Lifetime including Last Week), dynamic order type donut, enhanced avg items card, top 5 fulfilled customers
- **Partner Analytics**: Dynamic order type split, fulfilled customer title
- **Manager Analytics**: Custom filter button guarded properly, larger pills, period-aware FulfilmentRate and TopItemsCard
- **Manager Settings**: Branch status toggle has explanatory tooltip
- **Analytics types**: `SalesAnalytics` and `DeliveryPickupAnalytics` updated with new fields from backend
- **Deployed**: Commit `7f3e1a8` merged to `main`

### Cross-Repo Impact

| File (Backend repo) | Change | Impact |
|------|--------|--------|
| `app/Http/Controllers/Api/CustomerController.php` | PostgreSQL sort fix: `NULLS LAST` | Proper NULL handling for customer sort |
| `app/Services/Analytics/AnalyticsService.php` | Separated cash/cash_on_delivery, dynamic order types, fulfilled customer filter, avg items stats, staff sales unassigned bucket | All new data fields consumed by updated frontend types and UI |

### Pending / Follow-up

- Monitor WeeklyRevenueComparison chart with different data volumes to ensure bar scaling holds
- Consider making the analytics period selector a shared component (duplicated across admin, partner, manager)

---

## [2026-04-10] Session: Multi-Issue Fix – Analytics, Menu Toggle, Branch Status, Scrollbar, Shifts

### Intent

Address 11+ production bugs/features reported from live testing across Admin Analytics, Manager Dashboard, Manager Analytics, Manager Shifts, Manager Staff Sales, Admin Menu (toggle), Admin Customers, Manager Config, and UI scrollbar styling.

### Changes Made

| File | Change | Reason |
|------|--------|--------|
| `lib/api/hooks/useAnalytics.ts` | Added `'last_month'` and `'lifetime'` to `AnalyticsPeriod` type and `getDateRange()` switch (last_month = 1st–last of prev month, lifetime = 2024-01-01 to today) | Admin analytics lacked Last Month and Lifetime period options |
| `app/admin/analytics/page.tsx` | Extended `Period` type and `PERIODS` array with Last Month + Lifetime. Changed top customers from "Top 10" to "Top 5" (title, `.slice(0,5)`, border logic `i < 4`) | Requested reduction and new period filters |
| `app/staff/manager/dashboard/page.tsx` | Top items display changed from `item.name` to `getOrderItemLineLabel({ name: item.name, sizeLabel: item.size_label })` | Manager dashboard showed long condensed DB names instead of short receipt/display names |
| `app/staff/manager/analytics/page.tsx` | **Major rewrite**: Added `ManagerPeriod` type (7 options: today/yesterday/week/last_week/month/last_month/custom), `MANAGER_PERIODS` array, `getManagerDateRange()`, custom date picker with validation (limited to current + last month), previous-period comparison for trends. New variables: `periodRevenue`, `periodOrderCount`, `avgOrderValuePeriod`, `fulfilmentRate`. Added period selector pill bar to JSX, custom date picker UI, dynamic KPI labels. Report generator now uses selected period range. | Manager analytics was hardcoded to "today" only — needed full date range filtering |
| `app/components/providers/MenuDiscoveryProvider.tsx` | Added `is_available: true` to `useMenu()` call | Toggled-off menu items still appeared on customer site |
| `app/pos/terminal/page.tsx` | Added `{ is_available: true }` to `useMenuItems()` call | Toggled-off items still appeared on POS terminal |
| `app/staff/new-order/steps/StepMenu.tsx` | Added `{ is_available: true }` to `useMenuItems()` call | Staff new order showed unavailable items |
| `app/staff/new-order/NewOrderFlow.tsx` | Added `{ is_available: true }` to `useMenuItems()` call | Staff new order flow showed unavailable items |
| `app/staff/store/page.tsx` | Added `{ is_available: true }` to `useMenuItems()` call | Staff store showed unavailable items |
| `app/staff/manager/settings/page.tsx` | Added `isEffectivelyOpen` computed from `is_active` AND current time vs today's operating hours. New `statusLabel` and `statusSub` with 3 states: open, closed (manual override), closed (outside hours). JSX updated to use computed status. | Branch status showed "Open" even when outside operating hours |
| `app/globals.css` | Added global slim scrollbar styling: `scrollbar-width: thin` for Firefox, `::-webkit-scrollbar` (6px body, 5px children) with semi-transparent brown thumb matching design system. Applied to `body` and `*` selector. | Bold classic white scrollbar looked out of place — needed slim blended scrollbar |

### Decisions

- **Decision**: Menu `is_available` filter applied on 5 ordering surfaces (customer, POS, staff new-order ×2, staff store), NOT on admin/promos pages
  - **Rationale**: Admin needs to see all items to manage them. Ordering surfaces should only show available items.
- **Decision**: Manager analytics limited to current + last month for custom date ranges
  - **Rationale**: Prevents excessive data queries. Managers don't need deep historical access — that's admin territory.
- **Decision**: Branch status uses client-side time comparison against operating hours
  - **Rationale**: Operating hours are already loaded from the API. Real-time check avoids an extra API call. The toggle still controls `is_active` (manual override).
- **Decision**: Global scrollbar via `*` selector instead of applying classes to each scrollable element
  - **Rationale**: Ensures consistency everywhere without hunting down every overflow container. Individual elements can still use `.no-scrollbar` to opt out.

### Current State

- **Admin Analytics**: 9 period options (Today through Lifetime), top 5 customers with resolved names
- **Manager Analytics**: 7 period options with custom date picker, trend comparison vs previous period, report generation uses selected period
- **Manager Dashboard**: Top items show receipt-friendly display names
- **Menu Toggle**: Disabled items correctly hidden from all ordering surfaces (customer, POS, staff new-order, staff store)
- **Manager Config**: Branch status reflects both manual toggle AND operating hours
- **Scrollbar**: Slim, semi-transparent brown scrollbar globally across all portals
- **Admin Customers**: Highest spend sort handles NULL correctly via COALESCE (backend fix)
- **Manager Shifts**: All staff shifts visible to managers (not just their own sessions — backend fix)

### Cross-Repo Impact

| File (Backend repo) | Change | Impact |
|------|--------|--------|
| `app/Services/Analytics/AnalyticsService.php` | `getCustomerMetrics()` eager-loads `user` + latest order, maps to arrays with resolved names | Admin analytics top customers now show names + order counts |
| `app/Http/Controllers/Api/CustomerController.php` | Sort by spend uses `COALESCE(total_spend, 0) DESC` | NULL spend values no longer break sort order |
| `app/Http/Controllers/Api/ShiftController.php` | `index()`, `getByDate()`, `getByStaff()` all allow Manager role to see shifts within their branch(es) | Manager shifts page shows all branch staff, not just own sessions |

### Pending / Follow-up

- Monitor analytics query performance with "Lifetime" period — may need server-side caching for large date ranges
- Consider adding a periodic `setInterval` to re-evaluate `isEffectivelyOpen` on the settings page (currently computed once on render)

---

## [2026-04-09] Session: Unified Analytics Data Freshness Across Admin Pages

### Intent

Eliminate stale-data discrepancies between Admin Dashboard, Analytics, and Branches pages — all three display today's revenue/order counts but used different cache durations, causing confusing mismatched numbers.

### Root Cause

With only 1 branch active, the branch card showed stale cached data (₵409/6 orders) while the dashboard showed current data (₵751/10 orders). The backend calculations (via `AnalyticsQueryBuilder`) were identical — the discrepancy was purely frontend cache staleness. Each hook family had a different `staleTime`: Dashboard (1min), Analytics hooks (2min), Branch hooks (10min).

### Changes Made

| File | Change | Reason |
|------|--------|--------|
| `lib/api/hooks/useBranches.ts` | Reduced `staleTime` from 10 minutes to 1 minute for both `useBranches` and `useBranch` hooks | Branch cards on the Branches page showed stale revenue/order counts vs other admin pages |
| `lib/api/hooks/useAnalytics.ts` | Reduced `staleTime` from 2 minutes to 1 minute for all 10 analytics hooks (sales, orders, customers, order-sources, top-items, bottom-items, category-revenue, branch-performance, delivery-pickup, payment-methods) | Analytics page data lagged behind dashboard by up to 1 minute, creating confusing discrepancies |

### Decisions

- **Decision**: Standardize all analytics-related hooks to 1-minute `staleTime`
  - **Alternatives**: Keep different cadences per page importance; use WebSocket push for real-time; use shorter intervals like 30s
  - **Rationale**: 1 minute matches the Dashboard's existing refresh cadence — proven acceptable for UX and API load. Uniform staleness eliminates cross-page inconsistency for volatile "today" metrics without adding complexity.

### Current State

- **Admin Dashboard**: 1-minute refresh (unchanged)
- **Analytics Page**: 1-minute refresh (was 2 minutes)
- **Branches Page**: 1-minute refresh (was 10 minutes)
- All three pages now show consistent data for today's revenue and order counts. No backend changes needed — the canonical query definitions in `AnalyticsQueryBuilder` were already consistent.

### Cross-Repo Impact

None — purely frontend cache configuration. Backend analytics queries were already correct and consistent.

### Pending / Follow-up

- Monitor API load after reducing branch `staleTime` from 10min to 1min — if branch list queries become expensive with many branches, consider WebSocket invalidation instead
- The 10-minute staleTime on branches was originally set because branch data (name, location, hours) changes infrequently — but the `BranchResource` now includes volatile analytics fields (today's revenue/orders), justifying the shorter cache

---

## [2026-04-09] Session: Manager Dashboard & Shifts Bug Fixes

### Intent

Fix cancel request "double-fire" error on manager dashboard, correct overview KPI math for `cancel_requested` orders, and rework the manager Shifts page to match the improved MyShiftsView layout from the staff portal.

### Changes Made

| File | Change | Reason |
|------|--------|--------|
| `app/staff/manager/dashboard/page.tsx` | Added `cancel_requested` to `STATUS_STYLES` map (orange dot, "Cancel Requested" label). Added info block: "Cancel Requested — Waiting for admin approval" when order is in `cancel_requested` status. Changed cancel button condition from `!isTerminal` to `!isTerminal && order.status !== 'cancel_requested'`. | Orders in `cancel_requested` status still showed the "Request Cancel" button. Clicking it triggered a 422 error since the order was already in that status. This was NOT a double-click issue — it was a missing status check. |
| `app/staff/manager/dashboard/page.tsx` | Added `'cancel_requested'` to the `useEmployeeOrders` status filter array. Was: `['received', 'preparing', 'ready', 'ready_for_pickup', 'out_for_delivery']`. Now includes `'cancel_requested'`. | Active Orders KPI count was excluding orders pending cancellation approval, making the number seem wrong. |
| `app/staff/manager/shifts/page.tsx` | Full rewrite (~480 lines) to match `MyShiftsView` pattern from `app/staff/my-shifts/MyShiftsView.tsx`. Both tabs (All Staff / My Shifts) now share the same visual pattern: active session hero card (green pulse, duration/orders/sales grid), Today's Summary cards (Sessions, Orders, Revenue), collapsible calendar (button in header), cleaner shift cards with SignIn→SignOut time flow. Extracted `ShiftCard` component. All Staff tab shows multi-staff active sessions hero with staff count and names. Improved `formatDuration` with safety checks. | Previous shifts page layout was dated and inconsistent with the already-redesigned MyShiftsView. Manager should see the same polished pattern. |

### Decisions

- **Decision**: `cancel_requested` is treated as an "active" order status for dashboard KPI purposes
  - **Rationale**: Cancel-requested orders are still in-flight until admin approves/rejects. Excluding them from Active Orders misrepresents the workload.
- **Decision**: Shifts calendar is collapsible by default (triggered via header button) rather than always showing
  - **Rationale**: Cleaner initial view — staff open shifts to check current status, not browse the calendar. Matches the same pattern already shipped in `MyShiftsView`.
- **Decision**: Extract `ShiftCard` component within the page
  - **Rationale**: Both All Staff and My Shifts tabs render identical shift card layouts. Extracting avoids duplication without over-abstracting to a separate file.

### Current State

- **Manager Dashboard**: `cancel_requested` orders display correctly with orange status dot, info banner, and no duplicate cancel button. Active Orders KPI includes cancel-requested orders.
- **Manager Shifts Page**: Visual parity with MyShiftsView — hero card, today's summary, collapsible calendar, unified shift cards across both tabs.
- **Orders Page**: Already had the `cancel_requested` guard from a prior session — no changes needed.

### Cross-Repo Impact

| File (Backend repo) | Change | Impact |
|------|--------|--------|
| `app/Services/Analytics/AnalyticsService.php` | `getBranchRevenueChart()` now uses `startOfWeek(Carbon::SUNDAY)` / `endOfWeek(Carbon::SATURDAY)` | Fixes Sunday bar showing flat — business week starts Sunday, not Monday |
| `app/Services/OrderManagementService.php` | Auto-assignment condition changed from `$status === 'accepted'` to `in_array($status, ['accepted', 'preparing'])` | Fixes Staff Sales showing empty — online orders skip `accepted` → `preparing` directly, so `assigned_employee_id` was never set. Fix applies forward only. |

### Pending / Follow-up

- Existing orders without `assigned_employee_id` are not retroactively fixed — staff sales for historical orders placed before this fix will still be missing
- Consider a one-time migration to backfill `assigned_employee_id` for past orders if historical accuracy matters

---

## [2026-04-09] Session: Cancel Double-Fire Guard, Revenue Fix, Dashboard Drawer Fix

### Intent

Three bugs from live staff testing: (1) Cancel modal could potentially fire twice and showed wrong button text in staff context, (2) POS/orders revenue included cancelled and no_charge orders, (3) Dashboard active order click didn't open the detail drawer due to ID type mismatch.

### Changes Made

| File | Change | Reason |
|------|--------|--------|
| `app/components/ui/CancelOrderModal.tsx` | Confirm button text now context-aware ("Request Cancellation" for staff, "Cancel Order" otherwise). Loading text: "Requesting…" vs "Cancelling…". Added `succeeded` to disabled guard. | Prevents double-fire edge cases and matches staff workflow language |
| `app/pos/orders/page.tsx` | Revenue now filters out `cancelled` status and `no_charge` payment method | Revenue was summing ALL orders including cancelled/no_charge |
| `app/admin/dashboard/page.tsx` | Revenue KPI now excludes `no_charge` payment method orders (already excluded cancelled) | Consistent revenue definition across portals |
| `app/staff/partner/dashboard/page.tsx` | Revenue now excludes `no_charge` payment method orders (already excluded cancelled) | Consistent revenue definition across portals |
| `app/staff/my-sales/MySalesView.tsx` | Revenue now excludes `no_charge` payment method orders (already excluded cancelled) | Staff cash reconciliation shouldn't include no_charge |
| `app/staff/dashboard/SalesDashboardView.tsx` | Changed `handleOrderClick` to accept `order.dbId` (numeric DB ID) instead of `order.id` (order number). Drawer now correctly finds matching order. | `AdminOrder.id` = order_number (e.g. "AC086"), `Order.id` = DB ID (e.g. "287") — mismatch prevented drawer from finding the order |

### Decisions

- **Decision**: Exclude `no_charge` from revenue across all portals, not just POS
  - **Rationale**: No_charge orders represent comp/free orders — they shouldn't inflate revenue metrics anywhere. Applied consistently to admin dashboard, partner dashboard, staff my-sales, and POS orders.
- **Decision**: Keep `cancel_requested` orders in revenue
  - **Rationale**: Cancel_requested orders are still active (pending manager approval) and may still be fulfilled. Only fully cancelled orders should be excluded from revenue.

### Current State

- **Revenue**: Consistent definition across POS, Admin Dashboard, Partner Dashboard, Staff My Sales: sum of non-cancelled, non-no_charge orders.
- **Cancel Modal**: Button reads "Request Cancellation" for staff, "Cancel Order" for customer/admin. Disabled after first click and after success.
- **Dashboard Drawer**: Clicking an active order on the staff dashboard now correctly opens the OrderDrawer.

### Cross-Repo Impact

None — all frontend-only changes.

---

## [2026-04-09] Session: Staff Portal — Cancel UX, Dashboard Drawer, Role Label

### Intent

Three UX refinements from live staff testing at Ashaiman branch: (1) Staff should not have a "Cancel Order" button — they can only "Request Cancel" which goes to manager/admin for approval. (2) Active orders on the staff dashboard should open an inline order detail drawer instead of redirecting to the orders page. (3) The role label in the staff sidebar should say "Sales Staff" instead of generic "Staff".

### Changes Made

| File | Change | Reason |
|------|--------|--------|
| `app/staff/sales/orders/page.tsx` | Changed cancel button text from "Cancel Order" to "Request Cancel" | Staff cannot directly cancel — they submit cancellation requests for manager approval |
| `app/components/ui/CancelOrderModal.tsx` | Modal title is now conditional: "Request Cancellation" when `context === 'staff'`, "Cancel Order" otherwise | Reinforce that staff are requesting, not executing, cancellation |
| `app/staff/dashboard/SalesDashboardView.tsx` | Replaced `<Link>` wrappers on active order cards with `<button onClick>`. Added `OrderDrawer` (reused from My Sales) with `useState` for selected order ID, `mapApiOrderToOrder` for drawer-compatible Order mapping. | Eliminates unnecessary redirect — staff can view order details inline without leaving the dashboard |
| `app/staff/layout-client.tsx` | Changed `employee` role label from `'Staff'` to `'Sales Staff'` | Better reflects the actual role designation in the CediBites system |

### Decisions

- **Decision**: Reuse `OrderDrawer` from My Sales instead of building a new component
  - **Rationale**: Same dark-themed drawer with full order detail already exists and is styled for the staff portal. Dual-mapping the raw orders (AdminOrder for cards, Order for drawer) avoids restructuring existing card display logic.
- **Decision**: Button text "Request Cancel" (not "Request Cancellation")
  - **Rationale**: Shorter, fits the compact button layout. The modal title uses the full "Request Cancellation" phrasing for clarity.

### Current State

- **Staff Orders Page**: Cancel button now reads "Request Cancel". The underlying logic already correctly called `requestCancel()` (not `cancelOrder()`) for non-admin staff — this change aligns the UI label with the behavior.
- **Staff Dashboard**: Clicking an active order opens the same `OrderDrawer` used in My Sales. No more redirect to `/staff/sales/orders?select=ID`.
- **Sidebar**: Role displays as "Sales Staff — Ashaiman" instead of "Staff — Ashaiman".
- **CancelOrderModal**: Title reads "Request Cancellation" in staff context, "Cancel Order" for customer/admin context.

### Cross-Repo Impact

None — all changes are frontend-only. The backend `requestCancel` API endpoint was already correctly wired.

### Pending / Follow-up

- Replicate My Shifts page design to Branch Manager portal (user mentioned this is next)
- Consider adding "Request Cancel" capability directly in the dashboard's OrderDrawer (currently cancel is only on the orders page)

---

## [2026-04-09] Session: Staff Portal — Dashboard, My Sales, My Shifts Redesign

### Intent

Overhaul the Staff (Sales) portal to make the dashboard CTA route to POS instead of the call center new-order page, show staff-specific order stats instead of branch-wide stats, redesign My Sales to include a payment method revenue breakdown, redesign My Shifts to prioritize current session and today's data over lifetime stats and a full calendar, and align table styling with the analytics page design system.

### Changes Made

| File | Change | Reason |
|------|--------|--------|
| `app/staff/dashboard/SalesDashboardView.tsx` | CTA now opens POS Terminal (`/pos/terminal`, new tab) with `CashRegisterIcon`. Stats now show staff's own orders (Received, Preparing, My Orders Today) using `useOrderStore` + `getOrdersByFilter({ staffId })` instead of `useEmployeeOrderStats()` branch-wide counts. | Sales staff should go to POS, not call center flow. Stats should reflect the individual staff member's performance. |
| `app/staff/my-sales/MySalesView.tsx` | Replaced "Items Sold" and "Avg. Order Value" stat cards with "Cancelled" (count of cancelled orders) and "Completed" (fulfilled orders count). Added **Revenue Breakdown** section — secondary cards for Cash Collected, POS MoMo, Direct MoMo, Card Payments, No Charge — only showing payment methods with activity. | Staff need to reconcile their cash/MoMo collected at end of shift. Payment breakdown enables staff + manager alignment. |
| `app/staff/my-shifts/MyShiftsView.tsx` | Full redesign: Active session is now a hero card with Duration/Orders/Sales sub-stats. Today's Summary replaces lifetime stats. Calendar collapsed behind a date-picker button (toggled via header). Off-shift state shown explicitly. | Calendar dominated the page with no room for actionable daily context. Priority is "Am I clocked in? How's today going?" |
| `app/staff/my-sales/components/SalesTable.tsx` | Table container changed from `border-brand-dark/50` with dark `bg-brown` header to `bg-neutral-card border-[#f0e8d8]` with neutral header matching analytics page. Border colors unified to `border-[#f0e8d8]`. | Align with analytics page table design system for visual consistency. |
| `app/staff/my-sales/components/SalesRow.tsx` | Row borders updated to `border-[#f0e8d8]`, selection state softened to `bg-primary/10`, added `last:border-0`. | Match analytics table row styling. |

### Decisions

- **Decision**: Route dashboard CTA to POS Terminal instead of new-order flow
  - **Rationale**: The new-order flow (`/staff/sales/new-order`) is designed for call center staff taking phone/WhatsApp orders. Sales staff at a branch should use the full POS terminal. The sidebar nav already had a POS link under Displays but it wasn't the primary CTA.
- **Decision**: Replace Items Sold / Avg Order Value with Cancelled / Completed counts
  - **Rationale**: Items sold and average order value are less actionable for daily reconciliation. Cancelled count helps track voided orders. Completed count shows fulfilled orders. Revenue already covers the monetary summary.
- **Decision**: Payment breakdown as secondary cards, not a chart
  - **Rationale**: Staff need exact numbers for reconciliation ("I collected ₵150 in cash, ₵200 via MoMo"), not relative proportions. Cards with exact amounts are more scannable at a glance.
- **Decision**: Collapse calendar behind a button, show Today's Summary as default
  - **Rationale**: Staff open My Shifts daily to check their current status. The calendar is a secondary navigation tool for historical lookups. Prioritizing today's data reduces cognitive load.
- **Decision**: No backend changes needed
  - **Rationale**: All required data (paymentMethod, staffId, status) already exists on the `Order` type from the `OrderStoreProvider`. Payment breakdown is computed client-side from existing order data.

### Current State

- **Dashboard**: CTA opens POS in new tab. Stats show staff's own received/preparing/total orders for the day.
- **My Sales**: 4 primary stat cards (Orders Placed, Revenue, Cancelled, Completed) + payment method revenue breakdown cards + analytics-styled order table.
- **My Shifts**: Hero active session card → Today's summary → Collapsible calendar → Selected day sessions.
- **Tables**: All staff order tables now use `bg-neutral-card border-[#f0e8d8]` analytics styling.

### Cross-Repo Impact

None — all changes are frontend-only. No new API endpoints, no type changes, no backend modifications.

### Pending / Follow-up

- The payment breakdown data on My Sales will also be shown in the Manager portal's Staff Sales view and shift reports (future work)
- Consider adding a "View in POS" quick-link from My Sales order drawer for order reprinting
- The staff orders page (`/staff/sales/orders`) still uses expandable rows instead of the analytics table — could be unified in a future pass

---

## [2026-04-09] Session: ApiError Code Passthrough Fix

### Intent

Fix the POS branch-closed modal not appearing — a toast was showing instead because the `code` field from API error responses was being stripped out by the Axios interceptor.

### Root Cause

The Axios response interceptor in `lib/api/client.ts` catches all error responses and throws a custom `ApiError` object. The `ApiError` class only had `status`, `message`, and `errors` fields — the `code` field from the API response (`{ code: "branch_closed", message: "..." }`) was being silently dropped during this transformation. When the POS error handler checked `err.response.data.code`, it was always `undefined`.

### Changes Made

| File | Change | Reason |
|------|--------|--------|
| `lib/api/client.ts` | Added `code?: string` as a 4th constructor parameter to the `ApiError` class. Updated both the 422 handler and the catch-all error handler to pass `(data as any).code` through to the `ApiError` constructor. | Preserve any `code` field from API error responses for downstream consumers |
| `app/pos/terminal/page.tsx` | Updated `handlePaymentComplete` catch block to read `err.code` directly from the `ApiError` instance instead of `err.response.data.code` | After the interceptor transforms the response, `err.response.data` doesn't exist — must read from the `ApiError` instance directly |

### Decisions

- **Decision**: Add `code` as an optional field on `ApiError` rather than passing through the entire response data object
  - **Alternatives**: Attach the raw `response.data` object to `ApiError`, or stop intercepting errors
  - **Rationale**: Minimal change, follows existing pattern of explicitly declaring fields. Adding the full data object would be a larger refactor with wider blast radius.

### Key Lesson

When using Axios interceptors that transform errors into custom error classes, any additional fields from the API response must be **explicitly passed through** to the custom class — they don't survive the transformation automatically. This applies to any future API error codes added to the backend.

### Cross-Repo Impact

None — the API was already correctly returning `{ code: "branch_closed", message: "..." }` with a 422. This was purely a frontend data-loss bug in the error transformation layer.

### Current State

- **`ApiError` class**: Now carries `status`, `message`, `errors`, and `code` fields
- **POS terminal**: Correctly reads `err.code` from `ApiError` — branch-closed modal now displays as intended
- **Other error handlers**: Any consumer of `ApiError` can now access `err.code` if the API sends one
- **Deployed**: `main` + `beta` (both synced)

### Pending / Follow-up

- Audit other error handlers across the frontend to see if any were also trying to access `err.response.data` fields that got stripped (e.g., in checkout, order-manager)
- Consider adding a generic `data` or `meta` bag to `ApiError` for future-proofing against additional API error fields

---

## [2026-04-09] Session: WebSocket Broadcast & POS Error UX for Branch Access

### Intent

Make branch extended access toggles propagate in real-time to all connected POS/KDS/Order Manager clients via WebSocket broadcast (eliminating the 10-minute staleTime wait), and improve the POS error UX when an order is rejected because the branch is closed.

### Changes Made

| File | Change | Reason |
|------|--------|--------|
| `app/components/providers/BranchProvider.tsx` | Added `useQueryClient` import from TanStack Query and `getEcho` from echo. Added `useEffect` that listens for `.branch.access.updated` events on the staff's current branch channel (`orders.branch.{id}`). On event, invalidates `['branches']` query cache for instant re-fetch. Uses `channel.stopListening()` on cleanup (not `channel.leave()`). | Real-time branch data refresh when admin toggles extended access — no more waiting for 10-minute staleTime |
| `app/pos/terminal/page.tsx` | Added `branchClosedNotice` state variable. Updated `handlePaymentComplete` catch block to detect `code === 'branch_closed'` from API response. Shows a modal with amber `ProhibitIcon`, "Order Not Allowed" title, API message, and "Got it" dismiss button. Non-branch-closed errors still show as toasts. | Clear, actionable feedback when POS order is rejected due to branch being closed |

### Decisions

- **Decision**: Use `stopListening()` instead of `leave()` on channel cleanup
    - **Alternatives**: Use `channel.leave()` which fully disconnects from the channel
    - **Rationale**: `useOrderChannel` (in Kitchen/Order Manager) may also be listening on the same `orders.branch.{id}` channel. Calling `leave()` would disconnect both listeners. `stopListening('.branch.access.updated')` only removes this specific listener.
- **Decision**: Modal over toast for branch-closed errors
    - **Alternatives**: Toast notification, inline error banner
    - **Rationale**: Branch closure is a deliberate access control decision that requires user acknowledgment, not a transient notification. A modal ensures the staff member reads the message and understands the next step (ask an admin).
- **Decision**: Amber/warning color scheme for the modal instead of red/error
    - **Rationale**: "Access not enabled" is informational/warning — it's not a system error or failure. Amber conveys "action required" rather than "something went wrong".

### Cross-Repo Impact

| File (API repo) | Change | Impact |
|------|--------|--------|
| `app/Events/BranchAccessUpdatedEvent.php` | **NEW** — Broadcasts `.branch.access.updated` on `orders.branch.{id}` | Frontend `BranchProvider` listens for this event to invalidate branch cache |
| `app/Http/Controllers/Api/BranchController.php` | Toggle methods dispatch `BranchAccessUpdatedEvent` | Triggers the WebSocket event that frontend consumes |
| `app/Http/Controllers/Api/CheckoutSessionController.php` | `posStore()` returns `code: 'branch_closed'` on 422 | Frontend POS detects this code to show modal instead of generic toast |

### Current State

- **BranchProvider**: Listens for `.branch.access.updated` WebSocket events — branch data refreshes instantly when admin toggles access
- **POS terminal**: Shows amber modal with actionable message when order is rejected due to branch closure. Other errors still show as toasts.
- **10-minute staleTime**: Still in place as a fallback, but WebSocket event provides the instant update path
- **Deployed**: Committed on `manager-staff-fixes`, merged to `main` and `beta`

### Pending / Follow-up

- Monitor WebSocket event reception in production POS/KDS/OM to confirm real-time updates work
- Consider adding the same `.branch.access.updated` listener in Kitchen and Order Manager layouts for instant UI updates (currently they rely on the BranchProvider invalidation which covers them)

---

## [2026-04-09] Session: Branch Extended Access — After-Hours Staff System Access

### Intent

Add admin-controlled "Extended Access" toggles per branch so staff can continue using POS, Kitchen Display System (KDS), and Order Manager after the branch closes (e.g., for sales reconciliation). A second toggle allows placing new POS orders during extended access (for special/after-hours orders). Customers continue seeing the branch as closed.

### Changes Made

| File                                          | Change                                                                                                                                                                                                                                               | Reason                                           |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `types/api.ts`                                | Added `extended_staff_access`, `extended_order_access`, `staff_access_allowed` to `Branch` interface                                                                                                                                                 | TypeScript type matches API response             |
| `app/components/providers/BranchProvider.tsx` | Added `extendedStaffAccess`, `extendedOrderAccess`, `staffAccessAllowed` to `Branch` interface and mapping from API                                                                                                                                  | Frontend data layer for extended access flags    |
| `lib/api/services/branch.service.ts`          | Added `toggleExtendedStaffAccess()` and `toggleExtendedOrderAccess()` service methods                                                                                                                                                                | API client for admin toggle endpoints            |
| `app/pos/terminal/page.tsx`                   | Updated branch-closed guard: now checks `staffAccessAllowed` — allows access when extended staff access is enabled even if branch is closed                                                                                                          | POS extended access bypass                       |
| `app/kitchen/layout-client.tsx`               | Added full branch-closed gate with admin/extended access bypass. Uses `useBranch()` from BranchProvider. Shows dark-themed "Branch Closed" UI matching KDS aesthetics with Switch Branch and Sign Out options                                        | KDS had NO branch-closed gate before — now gated |
| `app/order-manager/page.tsx`                  | Updated existing branch-closed guard to check `staffAccessAllowed`                                                                                                                                                                                   | Order Manager extended access bypass             |
| `app/admin/settings/page.tsx`                 | Added new "Branch Access" tab with per-branch extended access toggle UI. Shows all active branches with Staff Access and Order Access toggles. Order Access is disabled/greyed when Staff Access is off. Invalidates branches query cache on toggle. | Admin control UI for extended access             |

### Decisions

- **Decision**: Two separate toggles (Staff Access + Order Access) instead of one
  - **Rationale**: Restaurant business is dynamic — sometimes staff need access for reconciliation only (no new orders), other times they need to place special after-hours orders. Separate toggles give fine-grained control.
- **Decision**: Extended access is a persistent per-branch flag, NOT tied to operating hours schedule
  - **Rationale**: Unlike the existing `manual_override_open` (which is per-day and resets), extended access persists until admin explicitly turns it off.
- **Decision**: Customers still see the branch as closed during extended access
  - **Rationale**: `is_open` (customer-facing) is still computed from operating hours. `staff_access_allowed` is a separate computed field for staff systems only.

### Cross-Repo Impact

| File (API repo)                                          | Change                                                                                         | Impact on Frontend                                                         |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `database/migrations/2026_04_09_015228_*.php`            | Added `extended_staff_access` and `extended_order_access` boolean columns to `branches` table  | Frontend `Branch` type updated to match                                    |
| `app/Models/Branch.php`                                  | Added `isStaffAccessAllowed()` and `isExtendedOrderAllowed()` methods                          | Business logic consumed via `BranchResource`                               |
| `app/Http/Resources/BranchResource.php`                  | Added `extended_staff_access`, `extended_order_access`, `staff_access_allowed` to API response | Frontend `BranchProvider` maps these fields                                |
| `app/Http/Controllers/Api/BranchController.php`          | Added toggle endpoints                                                                         | Frontend `branchService` calls these via admin routes                      |
| `app/Http/Controllers/Api/CheckoutSessionController.php` | `posStore()` now checks `isCurrentlyOpen()` + `isExtendedOrderAllowed()` server-side           | POS orders blocked when branch closed unless extended order access enabled |
| `routes/admin.php`                                       | Added `PATCH` routes for toggles under `manage_branches` permission                            | Frontend admin settings tab consumes these                                 |

### Current State

- **POS**: Gated — allows access when branch open, extended staff access on, or admin
- **KDS**: Gated — same logic (NEW gate, didn't exist before)
- **Order Manager**: Gated — same logic (existing gate updated)
- **Admin Settings**: New "Branch Access" tab with per-branch toggles
- **Customer-facing**: Unchanged — customers see branch as closed based on operating hours
- **Branch**: `menu-audit`

### Pending / Follow-up

- ~~Consider broadcasting a WebSocket event when extended access is toggled so POS/KDS/OM update in real-time without waiting for next branch query refetch~~ — **DONE** in [2026-04-09] WebSocket Broadcast & POS Error UX session
- Consider adding an auto-disable mechanism (e.g., extended access expires after X hours) to prevent accidental overnight access
- ~~Frontend branch data refetches on 10-minute staleTime — staff may need to refresh browser after admin enables extended access (or wait up to 10 minutes)~~ — **RESOLVED** by WebSocket listener in BranchProvider

---

## [2026-04-09] Session: Master Orchestrator Agent Creation

### Intent

Create a supreme coordination agent that can parse complex multi-domain prompts, decompose them into discrete tasks, route to the correct specialized agent(s), and ensure cross-cutting consistency across the entire CediBites platform (both repos, all 6+ portals).

### Changes Made

| File                                          | Change                                                                               | Reason                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `.github/agents/master-orchestrator.agent.md` | **NEW** — Created Master Orchestrator agent (custom `.agent.md` for VS Code Copilot) | Needed a central coordinator for 7 specialized agents spanning both repos |

### Agent Details

- **Type**: VS Code Copilot custom agent (`.agent.md`)
- **Model**: Pinned to Claude Opus 4 (strongest reasoning for complex orchestration)
- **Scope**: Both repos — `cedibites/` (frontend) and `cedibites_api/` (backend)
- **Subordinate Agents**: Analytics Auditor, Order Auditor, IAM Auditor, Menu Auditor, UX Architect, Project Chronicle, Offline Explorer
- **Invocability**: Can be invoked by users directly or as a subagent by other agents (escalation pattern)

### Agent File Structure

| Section                           | Content                                                                                                               |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| I — Agent Registry                | All 7 agents: domains, file locations, knowledge bases                                                                |
| II — Orchestration Protocol       | 5-phase pipeline: Receive & Parse → Decompose & Plan → Delegate & Execute → Cross-Cut Reconciliation → Verify & Close |
| III — System Mental Model         | Portal map, data flow architecture, critical cross-cutting flows                                                      |
| IV — Decision-Making Authority    | What the orchestrator decides vs escalates to the developer                                                           |
| V — Prompt Classification         | Single-agent, multi-agent, and ambiguous prompt routing patterns                                                      |
| VI — Cross-Repo Change Management | Backend-first, frontend-first, and hotfix protocols                                                                   |
| VII — Quality Gates               | Embedded engineering practices (SOLID, file size limits, backend/frontend/security rules)                             |
| VIII — Communication Style        | Plan presentation, completion reporting, escalation templates                                                         |
| IX — Non-Negotiable Constraints   | 10 hard rules                                                                                                         |
| X — First Activation Protocol     | Session startup behavior                                                                                              |

### Decisions

- **Decision**: Pin to Claude Opus 4 model
  - **Alternatives**: Default model, Claude Sonnet
  - **Rationale**: Orchestration requires strong reasoning over complex multi-step plans with dependency awareness — Opus 4 is best suited
- **Decision**: No subagent restrictions — can invoke any available agent
  - **Alternatives**: Restrict to only the 7 registered agents
  - **Rationale**: Flexibility for future agents and edge cases
- **Decision**: Allow self-invocability (other agents can escalate to the orchestrator)
  - **Rationale**: Enables agents to escalate cross-cutting concerns back to the coordinator
- **Decision**: Embed critical engineering practices directly in Section VII rather than just referencing `Engineering-practices.instructions.md`
  - **Alternatives**: Reference the file only
  - **Rationale**: Ensures engineering rules are always in context during orchestration, even if the instructions file isn't auto-loaded

### Cross-Repo Impact

| File (API repo)                                              | Relationship                                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `.github/instructions/Engineering-practices.instructions.md` | Key engineering rules are embedded in the orchestrator's Section VII      |
| `AGENTS.md`                                                  | Backend agent definitions referenced by the orchestrator's agent registry |

The orchestrator references backend engineering practices and backend agent files to coordinate cross-repo work.

### Current State

- **Master Orchestrator**: Fully defined and ready for use at `.github/agents/master-orchestrator.agent.md`
- **Agent ecosystem**: 8 agents total (7 specialized + 1 orchestrator)
- **Branch**: `menu-audit`

### Pending / Follow-up

- Test orchestrator with a complex multi-domain prompt to validate routing and sequencing
- Consider adding a brief reference to the orchestrator in the other 7 agent files so they know they can escalate

---

## [2026-04-09] Session: Staff Pages Blank on Production — Backend Encrypted Cast Incident (No Frontend Changes)

### Intent

Investigate why both the admin staff page (`/admin/staff`) and partner/branch manager staff page (`/partner/staff`) showed "0 staff found" on the production app.

### Investigation

- IAM Auditor traced the full request chain: both pages use `useEmployees` hook → `employeeService.getEmployees()` → `GET /admin/employees?per_page=200`.
- The production API (`api.cedibites.com`) was returning **500 Internal Server Error** on the employees endpoint.
- Frontend code was completely correct — the issue was entirely a backend data integrity problem.

### Root Cause (Backend)

- 3 employee records in the production database had `ghana_card_id` stored as **plain text** (before the `encrypted` cast was added to the Employee model on April 7).
- Laravel's `Crypt::decrypt()` threw `DecryptException` on plain-text values, crashing the entire paginated query.

### Fix Applied (Backend — Production Database)

- Plain-text Ghana Card IDs were nulled via SQL: `UPDATE employees SET ghana_card_id = NULL WHERE ghana_card_id NOT LIKE 'eyJ%'`
- Staff pages immediately started loading again.

### Changes Made

No frontend code changes — the issue was entirely in the backend data layer.

### Files Involved (Unmodified, But Relevant to Diagnosis)

| File                                   | Role                                                               |
| -------------------------------------- | ------------------------------------------------------------------ |
| `lib/api/services/employee.service.ts` | `getEmployees()` call that received the 500 error                  |
| `lib/api/hooks/useEmployees.ts`        | React Query hook wrapping the service — returned empty/error state |
| `app/admin/staff/page.tsx`             | Consumed the hook, showed "0 staff found" due to error response    |
| `app/partner/staff/page.tsx`           | Same symptom — consumed same hook                                  |

### Cross-Repo Impact

| File (API repo)           | Change                                              | Impact                                                      |
| ------------------------- | --------------------------------------------------- | ----------------------------------------------------------- |
| `app/Models/Employee.php` | `encrypted` cast on `ghana_card_id` (added April 7) | Caused `DecryptException` on pre-existing plain-text values |
| Production DB             | 3 rows nulled (`ghana_card_id`)                     | Fix — staff endpoint returns 200 again                      |

### Lessons Learned

- When the backend adds `encrypted` casts to existing fields, a **data migration** must be deployed alongside it to encrypt pre-existing plain-text values.
- The `encrypted` cast fails hard (500) — one bad row crashes the entire paginated listing.
- Frontend error handling showed "0 staff found" instead of an error message — consider improving empty-state vs error-state differentiation in `useEmployees`.

### Current State

- **Admin staff page** (`/admin/staff`): Working — loads employees from production API
- **Partner staff page** (`/partner/staff`): Working — same
- **No code changes** — this was a backend data fix only
- **Branch**: `menu-audit`

### Pending / Follow-up

- Consider improving error handling in `useEmployees` to distinguish between "no employees exist" and "API returned an error" — currently both show "0 staff found"
- No frontend follow-ups from this session otherwise

---

## [2026-04-08] Session: Branch Sync — No Frontend Changes

### Intent

Verify frontend is up to date after backend deploy pipeline and response macro changes.

### Changes Made

No code changes in this session — the frontend was already up to date.

### Cross-Repo Impact

| File (API repo)                                  | Change                                                       | Impact on Frontend                                                               |
| ------------------------------------------------ | ------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `.github/workflows/deploy.yml`                   | Added `PermissionSeeder` and `RoleSeeder` to deploy pipeline | None — backend infrastructure only                                               |
| `app/Providers/ResponseMacroServiceProvider.php` | `success()` macro now supports optional `?string $message`   | No frontend impact — response `data` key is unchanged; `message` key is additive |
| `database/seeders/TechAdminSeeder.php`           | Deleted                                                      | None — frontend never referenced this                                            |

### Current State

- **All branches synced**: `menu-audit` = `main` @ `ee1b2c1`
- **Branch**: `menu-audit`

### Pending / Follow-up

- No frontend follow-ups from this session

---

## [2026-04-08] Session: POS Receipt Item Name & Timestamp Fixes

### Intent

Fix two POS first-print receipt bugs: items showing machine keys instead of display names, and receipt timestamps being 1 hour off due to using the POS device's local clock instead of the server timestamp.

### Changes Made

| File                             | Change                                                                                                        | Reason                                                                                                                                                                                                                                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/pos/context.tsx` (line 301) | Changed `sizeLabel: item.variantKey` → `sizeLabel: item.name` in the receipt data mapping                     | Receipt displayed the option's machine key (e.g. "assorted") instead of the display/receipt name (e.g. "Assorted Jollof Rice"). The cart item's `name` field already contains the correct display name resolved from `size.displayName` (DB's `display_name` / Receipt Name field) in `getItemOptions()`. |
| `app/pos/context.tsx` (line 323) | Changed `placedAt: Date.now()` → `placedAt: new Date(apiOrder?.created_at ?? csSession.created_at).getTime()` | Receipt time was 1 hour behind because `Date.now()` used the POS device's local clock (which was wrong). Now uses the server's `created_at` timestamp, making receipt time accurate regardless of device clock.                                                                                           |

### Decisions

- **Decision**: Use server timestamps over device clock for all time-sensitive displays
  - **Rationale**: POS device clocks cannot be trusted — this device's system clock was set 1 hour ahead of actual UTC, causing `Date.now()` to return an incorrect timestamp
- **Decision**: Use `item.name` as the receipt label source (not `item.variantKey`)
  - **Rationale**: `POSCartItem.name` already carries the correct display name resolved from `size.displayName` in `getItemOptions()`. `variantKey` is the machine-readable key (e.g. "assorted"), not meant for customer-facing display.

### Scope

- **Affected**: Only the first-print receipt from POS (built from local cart data)
- **Not affected**: Reprints from API — `mapApiOrderToOrder` already correctly resolves `display_name ?? option_label` from the order snapshot

### Cross-Repo Impact

No backend changes required. The `display_name` and `created_at` fields are already correctly stored and served by the API. This was purely a frontend mapping issue.

### Current State

- **POS receipts**: Item names now show correct display names (e.g. "Assorted Jollof Rice" instead of "assorted")
- **POS receipt time**: Uses server `created_at` timestamp — accurate regardless of device clock drift
- **Branch**: `menu-audit`

### Pending / Follow-up

- Audit other POS flows for any remaining usage of `Date.now()` where server timestamps should be preferred
- Consider adding a general utility that always sources time from the server for POS displays

---

## [2026-04-07] Session: Admin Orders Page — Source Badge, Override Status Logic, SMS Cleanup & Role Seeding

### Intent

Polish the admin orders page: convert source badge to plain text, replace naive override status filtering with a proper status transition map, remove a non-functional Re-send SMS button, and fix a database seeding gap for the `sales_staff` role.

### Changes Made

| File                        | Change                                                                                                                                                                                                                                                                                                                                                                                                 | Reason                                                                                                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/admin/orders/page.tsx` | Replaced `SourceBadge` (colored pill with `rounded-full` + background colors) with plain colored text. Renamed `SOURCE_STYLES` → `SOURCE_COLORS` keeping only text color classes.                                                                                                                                                                                                                      | Source display was visually heavy; plain colored text matches the rest of the order detail panel                                                   |
| `app/admin/orders/page.tsx` | Replaced naive "show all statuses except current" override logic with `ADMIN_OVERRIDE_TARGETS` status transition map. Each status now only shows valid next statuses. `cancel_requested` excluded from override options (admins cancel directly via Cancel button). Terminal statuses (`completed`, `cancelled`) show no Override button. Button conditionally rendered only when valid targets exist. | Previous logic allowed invalid status transitions (e.g., going from `completed` back to `pending`). Proper transition map enforces business rules. |
| `app/admin/orders/page.tsx` | Removed non-functional "Re-send SMS" button and cleaned up unused `ChatTextIcon` import.                                                                                                                                                                                                                                                                                                               | Button had no implementation — dead UI element                                                                                                     |

### Decisions

- **Decision**: Source displayed as plain colored text instead of pill badge
  - **Rationale**: Visual consistency — the source label sits in the order detail panel alongside other plain text fields. A pill badge was unnecessarily prominent.
- **Decision**: `ADMIN_OVERRIDE_TARGETS` map instead of exclusion-based filtering
  - **Alternatives**: Keep showing all statuses except current; use a shared transition map from types
  - **Rationale**: Explicit allowlist of valid transitions per status is safer and more maintainable than blacklisting the current status. Prevents invalid state transitions at the UI level.
- **Decision**: `cancel_requested` excluded from override targets
  - **Rationale**: Admins have a dedicated Cancel button for cancellations. Showing `cancel_requested` in the override dropdown would be redundant and confusing.
- **Decision**: Terminal statuses (`completed`, `cancelled`) show no Override button at all
  - **Rationale**: No valid transition exists from a terminal state. Hiding the button is cleaner than showing it disabled.

### Database Fix (Not a Code Change)

- **Issue**: `sales_staff` role was missing from the database, causing role-related queries to fail
- **Fix**: Ran `PermissionSeeder` and `RoleSeeder` to populate all 8 roles including `sales_staff`
- **Root Cause**: Seeders had never been run after the role restructuring session — database was out of sync with code

### Cross-Repo Impact

No backend code changes needed. The database seeding fix was in `cedibites_api` but only involved running existing seeders (`PermissionSeeder`, `RoleSeeder`), not modifying code.

### Current State

- **Admin orders page** (`/admin/orders`): Source shown as plain colored text, override status dropdown enforces valid transitions only, no dead SMS button
- **Override status transitions**: Each status maps to a defined set of valid next statuses; terminal statuses have no override option
- **Database**: All 8 roles now seeded including `sales_staff`
- **Branch**: `menu-audit`

### Pending / Follow-up

- Consider extracting `ADMIN_OVERRIDE_TARGETS` to a shared constants file if the same transition logic is needed elsewhere (e.g., order manager, POS)
- Verify that the override status API endpoint also validates transitions server-side (UI enforcement alone is insufficient)

---

## [2026-04-07] Session: Promo System End-to-End — Audit Fixes, Route Bug, POS Subtotal Bug & Display

### Intent

Complete the promo system end-to-end after an audit found promos were "infrastructure-complete but customer-disconnected." Admin CRUD worked, but promos never reached customers or POS. This session wired promo resolution into checkout & POS, fixed a missing route, fixed a subtotal calculation bug, and enhanced POS promo display.

### Changes Made

#### Promo Display in Customer Checkout & Order Details

| File                                    | Change                                                                                                                    | Reason                                            |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `types/api.ts`                          | Added `promo_id?: number`, `promo_name?: string` to `Order` interface                                                     | Backend now serializes promo fields on orders     |
| `lib/api/adapters/order.adapter.ts`     | Maps `promo_name → promoCode` in order adapter                                                                            | Frontend order model needs promo info for display |
| `app/(customer)/checkout/page.tsx`      | Auto-resolves best promo via `ApiPromoService.resolvePromo()`, shows green discount row with `TagIcon` when promo applies | Customers now see promos applied at checkout      |
| `app/components/order/OrderDetails.tsx` | Displays discount + service charge in order detail view                                                                   | Order history and tracking show promo savings     |

#### POS Promo Subtotal Bug Fix

| File                              | Change                                                 | Reason                                                                                                                                                |
| --------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/pos/terminal/page.tsx`       | Pass `cartTotal` as third argument to `resolvePromo()` | Was passing `undefined`, API received `subtotal: 0`, filtered out all promos with `min_order_value` checks and calculated ₵0.00 for percentage promos |
| `app/staff/new-order/context.tsx` | Same fix — compute subtotal before the resolve call    | Same bug in staff new-order flow                                                                                                                      |

#### POS Promo Display Enhancement

| File                        | Change                                                                                                                 | Reason                                                                                                      |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `app/pos/terminal/page.tsx` | Rewrote cart footer total section: shows Subtotal → Promo Discount → Total when promo active; just Total when no promo | Original POS only showed discount + final total — no subtotal visible, unclear what the original amount was |

### Decisions

- **Decision**: Promo resolve route placed outside `manage_menu` permission gate
  - **Rationale**: Both POS staff and customers need to resolve promos — gating behind `manage_menu` would block all non-admin users
- **Decision**: Backend `PromoResolutionService` returns the promo with the highest calculated discount when multiple apply
  - **Rationale**: Best-value-for-customer approach; simpler than letting users choose between promos
- **Decision**: POS shows three-line total (Subtotal → Discount → Total) only when a promo is active
  - **Rationale**: Keeps the common case (no promo) clean with a single Total line

### Cross-Repo Impact

| File (API repo)                                          | Change                                                                        | Triggered By                                                               |
| -------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `database/migrations/2026_04_07_003326_*`                | Added `discount`, `promo_id`, `promo_name` to orders table                    | Promo data persistence                                                     |
| `database/migrations/2026_04_07_003331_*`                | Added `promo_id`, `promo_name` to checkout_sessions table                     | Promo carried through checkout flow                                        |
| `app/Models/Order.php`                                   | `promo()` BelongsTo, new fillable/cast fields                                 | Order ↔ Promo relationship                                                 |
| `app/Services/OrderCreationService.php`                  | Carries promo data from checkout session → order                              | End-to-end promo flow                                                      |
| `app/Http/Controllers/Api/CheckoutSessionController.php` | Auto-resolves best promo in `store()`, server-side validation in `posStore()` | Promo application at checkout                                              |
| `app/Http/Resources/OrderResource.php`                   | Serializes `discount`, `promo_id`, `promo_name`                               | Frontend consumes promo data                                               |
| `routes/promos.php`                                      | **BUG FIX**: Added `POST promos/resolve` route (was missing!)                 | Route was never registered despite controller/service/request all existing |

### Current State

- **Promo flow**: End-to-end working — checkout auto-resolves best promo, POS validates server-side, orders store promo data
- **Customer checkout**: Shows green discount row with TagIcon when promo applies
- **POS terminal**: Shows Subtotal → Promo Discount → Total when promo active
- **Order details**: Discount visible in order history and tracking
- **2 active test promos**: "10% off orders over ₵100" (min_order_value=100) and "20% off for new customers" (global, no minimum)
- **Branch**: `menu-audit`

### Pending / Follow-up

- Menu item promo badges (user wanted "badge better than strikethrough" — skipped due to architectural complexity)
- `PromoBanner.tsx` still uses hardcoded fake data — needs API integration
- "20% off for new customers" promo currently applies to ALL users — customer-specific filtering logic not yet implemented
- Service charge + discount interaction edge cases not yet tested

---

## [2026-04-07] Session: Role Restructuring — `platform_admin` → `tech_admin`, Removed `super_admin`

### Intent

Align frontend type system, role routing, and authorization checks with the backend role restructuring: `platform_admin` renamed to `tech_admin` (IT personnel), `super_admin` removed and merged into `admin` (business owner). Frontend role mapping simplified from many-to-one collapsing to clean 1:1 mapping.

### Changes Made

#### Type System Updates

| File             | Change                                                                                               | Reason                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `types/staff.ts` | `StaffRole` type: replaced `platform_admin` with `tech_admin`, removed `super_admin` from union type | Backend role enum alignment                  |
| `types/order.ts` | `StaffRole` re-export updated (imports from `staff.ts`)                                              | Type consistency — role defined in one place |

#### Service Layer

| File                                   | Change                                                                                                                                                      | Reason                                                                                              |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `lib/api/services/employee.service.ts` | Role mapping simplified to 1:1 — removed collapsing of `admin` → `super_admin`. `platform_admin` → `tech_admin` mapping updated. Backend role type updated. | Previous mapping collapsed distinct roles; now each backend role maps directly to one frontend role |

#### Auth & Routing

| File                                             | Change                                                                                                                         | Reason                                              |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| `app/components/providers/StaffAuthProvider.tsx` | Updated role-based routing: `tech_admin` routes to admin dashboard (replacing `platform_admin`), `super_admin` routing removed | Auth provider must route users by their actual role |

#### Page & Layout Updates

| File                                        | Change                                                                                             | Reason                             |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `app/admin/staff/page.tsx`                  | Role checks updated: `super_admin` → `admin`, `platform_admin` → `tech_admin`                      | Admin staff page authorization     |
| `app/staff/manager/staff/page.tsx`          | Role references updated                                                                            | Manager staff page authorization   |
| `app/staff/dashboard/page.tsx`              | Role-based dashboard content updated for new role names                                            | Staff dashboard routing            |
| `app/staff/layout-client.tsx`               | Role checks in staff layout updated                                                                | Staff layout authorization         |
| `app/admin/layout-client.tsx`               | Admin layout role guard updated — `tech_admin` and `admin` both access admin portal                | Admin portal access control        |
| `app/pos/terminal/page.tsx`                 | `isAdmin` check updated: `admin` or `tech_admin` (was `admin` or `super_admin`)                    | POS admin bypass for branch guards |
| `app/pos/orders/page.tsx`                   | Role checks updated                                                                                | POS orders access                  |
| `app/order-manager/page.tsx`                | Admin bypass updated: `admin` and `tech_admin` bypass branch guard (was `admin` and `super_admin`) | Order manager branch guard         |
| `app/components/order/OrderDetailPanel.tsx` | Role-based action visibility updated                                                               | Order detail permissions           |

### Decisions

- **Decision**: Frontend role mapping is now 1:1 (backend role → frontend role, no collapsing)
  - **Previously**: `admin` was collapsed to `super_admin` in the mapper, creating confusion
  - **Rationale**: With `super_admin` gone and `admin` being a distinct business-owner role, 1:1 mapping is correct and simpler
- **Decision**: Both `admin` and `tech_admin` can access the admin portal
  - **Rationale**: Admin portal contains business management tools (for `admin`) and platform tools (for `tech_admin`). Platform-specific pages have additional permission checks.
- **Decision**: POS and order-manager admin bypass uses `admin` OR `tech_admin`
  - **Rationale**: Same bypass behavior as before, just with correct role names

### Cross-Repo Impact

| File (API repo)                      | Change                                              | Triggered By                          |
| ------------------------------------ | --------------------------------------------------- | ------------------------------------- |
| `app/Enums/Role.php`                 | `PlatformAdmin` → `TechAdmin`, `SuperAdmin` removed | Role hierarchy redesign               |
| `database/seeders/RoleSeeder.php`    | Permission assignments restructured                 | `admin` loses 8 platform permissions  |
| `database/migrations/2026_04_07_*`   | **NEW** — Data migration for role rename + removal  | Safe migration of existing user roles |
| 7 controllers + middleware + service | Role references updated throughout backend          | Authorization alignment               |

### Current State

- **StaffRole type**: `tech_admin | admin | branch_manager | kitchen_staff | sales_staff | delivery_staff | cashier | pos_operator`
- **Role mapping**: 1:1 backend → frontend (no more collapsing)
- **Admin portal access**: `admin` (business owner) + `tech_admin` (IT) — both can access, platform pages gated by additional permissions
- **Admin bypass** (POS, order-manager branch guards): `admin` OR `tech_admin`
- **No TypeScript errors** in any modified file
- **Branch**: `menu-audit`

### Pending / Follow-up

- Verify all role badge/label display strings are updated (e.g., "Platform Admin" → "Tech Admin" in UI labels)
- Ensure `defaultPermissions()` in `types/staff.ts` is updated for the new `tech_admin` role permissions
- Check that admin sidebar navigation shows/hides platform section based on permission, not role name

---

## [2026-04-06] Session: Admin Staff Page Redesign + Employee Notes Frontend Integration

### Intent

Redesign the admin staff management page for a cleaner, more consistent look matching the product table pattern. Add a staff detail drawer with overview, notes, and action capabilities. Integrate employee notes with the new backend API (replacing localStorage).

### Changes Made

#### Admin Staff Page Redesign

| File                       | Change                                                                                                                                                                                                                                                                                                                                                    | Reason                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `app/admin/staff/page.tsx` | Complete redesign: search bar moved above role category tabs (full-width); table redesigned with `bg-[#faf6f0]` header matching product table; columns simplified to Name, Role, Contact, Branch, Status (removed Last Login + Actions); role badges changed to plain colored text; status uses dot + text pattern; rows are clickable with hover effects | Cleaner, more consistent design matching product table pattern with quick access via clickable rows |
| `app/admin/staff/page.tsx` | **NEW component**: `StaffDetailDrawer` — slides in from right with Overview tab (contact info, work info grid, HR details, permissions summary), Notes tab (threaded notes with add/delete), and bottom action bar (Edit, Force Logout, Reset Password, Suspend/Reinstate, Terminate/Delete)                                                              | Consolidated staff detail access via drawer instead of inline actions and separate pages            |

#### Employee Notes Frontend Integration

| File                                   | Change                                                                                                                                              | Reason                                                                     |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `lib/api/services/employee.service.ts` | Added `EmployeeNoteResponse` type and `getNotes()`, `addNote()`, `deleteNote()` service methods                                                     | API integration for employee notes CRUD                                    |
| `app/admin/staff/page.tsx`             | Notes tab in StaffDetailDrawer fetches from API, displays threaded notes with author name, date, delete button (own notes only), and add note input | Complete localStorage → API migration for persistent, author-tracked notes |

### Decisions

- **Decision**: Staff notes are a sub-resource of employees with author tracking
  - **Rationale**: Each note records who wrote it and when; only the author can delete their own notes. Proper persistence replaces unreliable localStorage.
- **Decision**: Drawer pattern for staff details instead of separate detail page
  - **Rationale**: Quick access without losing table context; matches modern admin dashboard patterns
- **Decision**: Removed Last Login and Actions columns from the table
  - **Rationale**: Last Login was low-value data for the main table view; Actions moved into the drawer's bottom action bar for a cleaner table

### Cross-Repo Impact

| File (API repo)                                                         | Change                                                                                     | Triggered By                       |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------- |
| `database/migrations/2026_04_06_113513_create_employee_notes_table.php` | **NEW** — employee_notes table with employee_id, author_id, content                        | Backend storage for staff notes    |
| `app/Models/EmployeeNote.php`                                           | **NEW** — Model with belongsTo Employee + User (author)                                    | Data model for notes               |
| `app/Models/Employee.php`                                               | Added `notes(): HasMany` relationship                                                      | Employee → notes relationship      |
| `app/Http/Controllers/Api/EmployeeController.php`                       | Added `notes()`, `addNote()`, `deleteNote()` methods                                       | CRUD endpoints for notes           |
| `app/Http/Controllers/Api/EmployeeController.php`                       | `generateSimplePassword()` replaces `Str::password(12)`                                    | Human-friendly temporary passwords |
| `routes/admin.php`                                                      | Added GET/POST `employees/{employee}/notes` and DELETE `employees/{employee}/notes/{note}` | API routes for notes               |

### Current State

- **Admin staff page** (`/admin/staff`) fully redesigned with new table layout, clickable rows, and drawer-based detail view
- **Staff notes** persisted via API with author tracking (no more localStorage)
- **StaffDetailDrawer** has Overview + Notes tabs and full action bar
- **Branch**: `menu-audit`

### Pending / Follow-up

- Wire remaining drawer actions (Edit, Force Logout, Reset Password) to actual API calls if not yet connected
- Consider adding pagination to notes if a staff member accumulates many notes
- Activity log integration for note add/delete actions

---

## [2026-04-06] Session: Branch Settings Enforcement — Admin & Order Manager Guards

### Intent

Complete the branch settings enforcement story by preventing contradictory "Mark Open" actions on inactive branches in admin, and blocking non-admin staff from accessing the order manager when the selected branch is closed or inactive. These are the final enforcement pieces after checkout, cart drawer, and POS were already guarded in a prior session.

### Changes Made

| File                          | Change                                                                                                                                                                                                                                                                                  | Reason                                                                                                                      |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `app/admin/branches/page.tsx` | "Mark Open" button is now disabled when a branch is inactive — shows reduced opacity, `cursor-not-allowed`, and tooltip "Reactivate this branch before marking it open". "Mark Closed" still works on inactive branches that happen to be open.                                         | Prevents admins from putting an inactive branch into "open" state, which would be contradictory business logic              |
| `app/order-manager/page.tsx`  | Added closed/inactive branch guard using `useBranch` hook and `effectiveBranchId`. Shows a full-screen unavailable message (card with warning icon, "Switch Branch" and "Sign Out" options) when branch is closed or inactive. Admin and `super_admin` roles bypass the guard entirely. | Non-admin staff shouldn't manage orders for a closed/deactivated branch; admins need unrestricted access for oversight      |
| `app/pos/terminal/page.tsx`   | Added `staffUser` to `useStaffAuth()` destructure, computed `isAdmin` flag (`admin` or `super_admin`), and prepended `!isAdmin &&` to the existing branch guard condition. Admin/super_admin roles now bypass the closed/inactive branch guard.                                         | Admins need POS access regardless of branch status for oversight and troubleshooting — matches order manager bypass pattern |

### Decisions

- **Decision**: Disable "Mark Open" rather than hide it entirely on inactive branches
  - **Rationale**: Keeping the button visible (with tooltip explanation) teaches admins the correct workflow: reactivate first, then mark open. Hiding it would leave admins wondering where the button went.
- **Decision**: Admin/super_admin roles bypass the order manager branch guard
  - **Rationale**: Admins need oversight access regardless of branch state — they may need to review or manage orders during closures or deactivation.
- **Decision**: Reused the POS guard pattern (full-screen card with warning icon, switch branch, sign out) for the order manager guard
  - **Alternatives**: Redirect to dashboard, toast notification, or modal
  - **Rationale**: Visual consistency across staff portals — POS terminal already established this guard pattern, and staff will recognize the UX.
- **Decision**: "Mark Closed" still works on inactive branches
  - **Rationale**: An inactive branch that was left in "open" state should still be closeable without first reactivating it.

### Cross-Repo Impact

No backend changes required — branch `is_active` and `is_open` states are already served via the branch API. Enforcement is purely frontend-side UX policy.

### Current State

- **Branch settings enforcement** is now complete across all surfaces:
  - **Checkout** — filters order types and payment methods based on branch settings
  - **Cart drawer** — blocks checkout for closed/inactive branches
  - **POS terminal** — full-screen guard for closed/inactive branches (admin bypass)
  - **Order manager** — full-screen guard for closed/inactive branches (admin bypass)
  - **Admin branches page** — "Mark Open" disabled for inactive branches
- **All staff portals** use consistent guard UX (full-screen card pattern)
- **Branch**: `menu-audit`

### Pending / Follow-up

- Backend validation: `CheckoutSessionController::store()` and `posStore()` still need server-side branch status checks (defense in depth)
- Customer-facing inactive branch UX: greyed-out branches with "Temporarily Closed" badge on location picker
- Kitchen display may also need a branch status guard (currently not guarded)

---

## [2026-04-06] Session: IAM Hardening — Frontend Status Alignment & Admin Tooling

### Intent

Align frontend staff status types, role definitions, and admin tooling with the backend IAM hardening work that resolved 22 open audit findings. The backend moved from 3 staff statuses (`active`, `inactive`, `archived`) to 4 (`active`, `on_leave`, `suspended`, `terminated`), removed password exposure, and added force-logout capabilities. Frontend needed end-to-end alignment.

### Changes Made

#### Type System Alignment (IAM-025, IAM-030, IAM-031, IAM-034, IAM-035)

| File             | Change                                                                                                                                                                                                                 | Reason                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `types/staff.ts` | `StaffStatus` changed from `'active' \| 'inactive' \| 'archived'` to `'active' \| 'on_leave' \| 'suspended' \| 'terminated'`. `EmploymentStatus` aligned to same 4 states. Added `staffStatusLabel()` helper function. | IAM-025, IAM-034, IAM-035: Frontend statuses must mirror backend enum exactly — 4 states, not 3 |
| `types/staff.ts` | Removed `password` field from `StaffMember` interface                                                                                                                                                                  | IAM-031: Passwords should never be modeled on the frontend                                      |
| `types/order.ts` | `StaffRole` now re-exports from `staff.ts` instead of defining its own union                                                                                                                                           | IAM-030: Role is an identity concern that belongs in `staff.ts`, not `order.ts`                 |

#### Service Layer Updates (IAM-025, IAM-026, IAM-031)

| File                                   | Change                                                                                                                                                                                                           | Reason                                                                                                        |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `lib/api/services/employee.service.ts` | Status mapping passes through backend values directly instead of collapsing to 3 states. Removed `password: ''` from staff member mapping. `employmentStatus` mapped from backend response instead of hardcoded. | IAM-025, IAM-031: Direct passthrough preserves all 4 backend statuses; no more phantom password field         |
| `lib/api/services/customer.service.ts` | Added `forceLogoutCustomer()` method                                                                                                                                                                             | IAM-026: Admin needs frontend integration to call new `POST admin/customers/{customer}/force-logout` endpoint |

#### Admin Staff Page (IAM-025, IAM-034, IAM-035)

| File                       | Change                                                                                                                                                                                                                                                                         | Reason                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `app/admin/staff/page.tsx` | Status filter tabs: Terminated replaces Archived. Badge colors updated for Suspended (amber) and On Leave (blue). Suspend action sets `'suspended'` status. Archive action now terminates (sets `'terminated'`). Employment status dropdown options aligned to 4-state system. | IAM-034, IAM-035: Admin UI must reflect the actual backend status states |

#### Manager Staff Page (IAM-025)

| File                               | Change                                                                                                                                                | Reason                                          |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `app/staff/manager/staff/page.tsx` | Same status updates as admin page — tabs (Terminated instead of Archived), badges (Suspended/On Leave/Terminated), actions, employment status options | IAM-025: Parity with admin page status handling |

#### Partner & Staff Partner Pages

| File                                   | Change                                                | Reason                                           |
| -------------------------------------- | ----------------------------------------------------- | ------------------------------------------------ |
| `app/partner/staff/page.tsx`           | All `'archived'` references changed to `'terminated'` | Consistent status terminology across all portals |
| `app/partner/dashboard/page.tsx`       | `'archived'` → `'terminated'`                         | Consistent status terminology                    |
| `app/staff/partner/staff/page.tsx`     | `'archived'` → `'terminated'`                         | Consistent status terminology                    |
| `app/staff/partner/dashboard/page.tsx` | `'archived'` → `'terminated'`                         | Consistent status terminology                    |

### Decisions

- **Decision**: Frontend status types mirror backend exactly (4 states) rather than collapsing into 3
  - **Alternatives**: Keep 3-state frontend model and map `on_leave`/`suspended` → `inactive`
  - **Rationale**: Different statuses have different UI treatments (badges, actions, messaging). Collapsing loses information and creates UX ambiguity.
- **Decision**: Passwords are never modeled on the frontend — removed from `StaffMember` interface
  - **Rationale**: Frontend never needs to read or set passwords via the staff member object. Password operations go through dedicated auth endpoints.
- **Decision**: `StaffRole` canonical definition moved to `staff.ts` (re-exported from `order.ts`)
  - **Rationale**: Role is an identity/IAM concern, not an order-domain concern. `order.ts` should consume, not define, role types.
- **Decision**: `staffStatusLabel()` helper added to `types/staff.ts` for display labels
  - **Rationale**: Centralizes status → display text mapping (e.g., `'on_leave'` → `'On Leave'`) rather than duplicating across pages

### Cross-Repo Impact

| File (API repo)                                         | Change                                            | Triggered By                                                          |
| ------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------- |
| `app/Http/Middleware/EnsureCustomerActive.php`          | **NEW** — Blocks suspended customers              | Frontend will receive 403 for suspended customer sessions             |
| `app/Http/Controllers/Api/Admin/CustomerController.php` | `suspend()` revokes tokens, `forceLogout()` added | Frontend `forceLogoutCustomer()` calls new endpoint                   |
| `app/Http/Resources/EmployeeAuthResource.php`           | Added `status` to login response                  | Frontend can now read employee status at login                        |
| `app/Http/Resources/AuthUserResource.php`               | Added customer `status` field                     | Frontend auth context has customer status                             |
| `app/Http/Controllers/Api/EmployeeAuthController.php`   | Descriptive login error messages                  | Frontend can show specific error reasons (wrong password vs inactive) |

### Current State

- **Staff statuses**: All portals (admin, manager, partner, staff-partner) use 4-state system: `active`, `on_leave`, `suspended`, `terminated`
- **Type safety**: `StaffStatus`, `EmploymentStatus`, `StaffRole` all aligned with backend enums
- **Password field**: Removed from frontend type system entirely
- **Force-logout**: Customer service has `forceLogoutCustomer()` ready for admin UI integration
- **No TypeScript errors** in any modified file
- **Branch**: `menu-audit`

### Pending / Follow-up

- Wire `forceLogoutCustomer()` into the admin customers page UI (button + confirmation dialog)
- Handle `CustomerSessionEvent` broadcast on the customer frontend (auto-logout on suspend)
- Staff login page should display specific error messages from the new descriptive backend responses
- Admin active sessions page (`GET admin/employees/sessions/active`) needs frontend UI

---

## [2026-04-06] Session: Permission Expansion + Legacy Employee Role Removal

### Intent

Expand the staff permission system from 10 visible permissions to all 24 backend permissions in both admin and manager staff pages. Remove the legacy `employee` role (a duplicate of `sales_staff`) from the frontend type system and role mappers.

### Changes Made

| File                                   | Change                                                                                                                                                                                                                                                      | Reason                                                                            |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `types/staff.ts`                       | Expanded `StaffPermissions` interface from 10 to 25 boolean fields covering all 24 backend permissions. Added `ALL_FALSE` and `ALL_TRUE` helper constants. Rewrote `defaultPermissions()` to match exact `RoleSeeder` data per role.                        | Previously 14 permissions were invisible to the admin UI                          |
| `lib/api/services/employee.service.ts` | Expanded `apiEmployeeToStaffMember()` mapper to map all 25 boolean permission fields. Rewrote `mapPermissionsToBackend()` as data-driven map. Removed `'employee'` from `BackendRole` type. Removed `employee: 'sales_staff'` from `mapApiRoleToStaffRole`. | Frontend mapper only handled 10 of 24 permissions; employee role no longer exists |
| `app/admin/staff/page.tsx`             | Replaced `getPermissionMapping()` 10-case switch with data-driven `BACKEND_TO_FRONTEND` map covering all 24 permissions. Removed `if (role.name === 'employee')` filter from `availableRoles`.                                                              | Data-driven map is easier to maintain; employee role removed                      |
| `app/staff/manager/staff/page.tsx`     | Same update as admin page: replaced 10-permission switch with data-driven `BACKEND_TO_FRONTEND` map. Removed `if (role.name === 'employee') return false;` filter from `availableRoles`.                                                                    | Parity with admin page; employee role removed                                     |

### Decisions

- **Decision**: Data-driven `BACKEND_TO_FRONTEND` map (`Record<string, keyof StaffPermissions>`) instead of switch/case
  - **Rationale**: Adding a new permission only requires one line — more maintainable than a growing switch statement
- **Decision**: Kept backward-compatibility `'employee': 'sales_staff'` entries in role mappers
  - **Rationale**: Old database records may still reference the employee role until the backend migration runs
- **Decision**: Permission toggles still use smart filtering (hide permissions already granted by role)
  - **Rationale**: Only show extras that can be toggled per-user, reducing noise in the UI

### Cross-Repo Impact

| File (API repo)                                                                  | Change                                                                                                          | Triggered By              |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `app/Enums/Role.php`                                                             | Removed `case Employee = 'employee'`                                                                            | Employee role elimination |
| `database/seeders/RoleSeeder.php`                                                | Removed legacy employee role sync block                                                                         | Employee role elimination |
| `app/Http/Controllers/Api/RoleController.php`                                    | Removed `'employee' => 'Employee'` from display name map                                                        | Employee role elimination |
| `database/migrations/2026_04_06_040105_migrate_employee_role_to_sales_staff.php` | **NEW** — Reassigns users from employee→sales_staff, cleans up role_has_permissions, deletes legacy role record | Safe data migration       |
| `docs/agents/iam-auditor-kb.md`                                                  | Updated with IAM-021 through IAM-036 findings and permission expansion changelog                                | Audit documentation       |

### Current State

- All 24 backend permissions are individually toggleable in both admin (`/admin/staff`) and manager (`/staff/manager/staff`) pages
- Legacy `employee` role removed from frontend type system, role mappers, and role filter lists
- No TypeScript errors in any modified file
- **Branch**: `menu-audit`

### Pending / Follow-up

- 16 new IAM audit findings (IAM-021 through IAM-036) documented in backend KB — 2 Critical, 3 High, 7 Medium, 4 Low — all still open
- Backend migration `2026_04_06_040105_migrate_employee_role_to_sales_staff.php` needs to be run in production
- Monitor for any stale `employee` role references in other areas of the codebase

---

## [2026-04-06] Session: Remove Cash at Pickup Payment Method + Branch Settings Audit

### Intent

Audit whether branch admin settings (order types, payment methods, branch active status) actually work end-to-end. Remove the "Cash at Pickup" payment method which doesn't exist in the business model.

### Changes Made

| File                                       | Change                                                                               | Reason                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------------ | ----------------------------------------------- |
| `lib/api/adapters/order.adapter.ts`        | Removed `'Cash at Pickup'` from PaymentMethod type union and PAYMENT_METHOD_MAP      | Payment method no longer exists                 |
| `lib/api/adapters/branch.adapter.ts`       | Removed `cashAtPickup` from DisplayBranch.payments type and mapper                   | Payment method removed                          |
| `types/order.ts`                           | Removed pickup-specific cash label from `getPaymentLabel()`                          | Cash label no longer varies by fulfillment type |
| `app/(customer)/checkout/page.tsx`         | Cash option now always shows "Cash on Delivery" instead of varying by order type     | No more pickup cash distinction                 |
| `app/admin/branches/page.tsx`              | Removed cashAtPickup toggle, validation, and API payload mapping                     | Setting no longer exists                        |
| `app/admin/orders/page.tsx`                | Removed `'Cash at Pickup'` from PaymentMethod type                                   | Type cleanup                                    |
| `app/admin/settings/page.tsx`              | Removed `cup` toggle from global payment methods                                     | Setting no longer exists                        |
| `app/staff/store/page.tsx`                 | Removed "Cash at Pickup" from PAYMENT_OPTIONS                                        | Option removed                                  |
| `app/staff/new-order/steps/StepReview.tsx` | Removed pickup-specific cash option from PAYMENT_OPTIONS                             | Option removed                                  |
| `app/staff/manager/settings/page.tsx`      | Removed cashPickup from BranchSettings type, defaults, API read/write, and toggle UI | Setting no longer exists                        |
| `app/staff/partner/branch/page.tsx`        | Removed cashAtPickup from type definition, demo data, and payment display            | Setting no longer exists                        |
| `app/partner/branch/page.tsx`              | Removed cashAtPickup from type definition, demo data, and payment display            | Setting no longer exists                        |

### Decisions

- **Decision**: Remove "Cash at Pickup" entirely rather than keeping it disabled
  - **Rationale**: Business does not use this payment method — it was dead code adding complexity to every payments touchpoint
- **Decision**: Cash option in checkout now always labeled "Cash on Delivery"
  - **Rationale**: With cash_at_pickup gone, there's no need for dynamic labeling of the cash option

### Audit Findings (Branch Settings)

The audit revealed that admin branch settings toggles (order types, payment methods, branch active status) **save correctly to the database but have zero functional effect** on the customer or POS ordering experience:

- **Order types**: Customer checkout hardcodes delivery + pickup; POS hardcodes dine_in + takeaway. Neither checks branch settings.
- **Payment methods**: Checkout hardcodes momo + cash. No branch-level filtering.
- **Branch active status**: No validation prevents orders at inactive branches. Customers still see inactive branches.
- **Backend validation gap**: Order creation only validates enum values (e.g., `in:delivery,pickup`), not branch-level enablement.

### Current State

- "Cash at Pickup" fully removed from all 12 frontend files
- Payment methods across all portals: Mobile Money, Cash on Delivery only
- Branch settings audit documented — enforcement implementation is a follow-up task
- **Branch**: `menu-audit`

### Pending / Follow-up

- **Backend validation**: Add branch-level checks in `CheckoutSessionController::store()` and `posStore()` for is_active, order type enablement, payment method enablement
- **Frontend filtering**: ~~Extend BranchProvider Branch interface with orderTypes/payments, filter checkout options based on branch settings~~ ✅ Done — checkout, cart drawer, POS, order manager, and admin branches all enforce branch settings (see [2026-04-06] Branch Settings Enforcement session)
- **Inactive branch handling**: Customer UX for inactive branches (greyed out with "Temporarily Closed" badge)
- ~~**POS disabled states**: Show disabled order types/payment methods with "Turned off by admin" label~~ ✅ Done
- **changePayment endpoint**: Also needs branch validation

---

## [2026-04-06] Session: Smart Categories Relocated to Configure Page + Helper Text

### Intent

Move Smart Categories from a standalone top-level tab to a section within the Configure page, grouping it logically with category management. Add descriptive helper text so admins understand what smart categories are and what each individual category does.

### Changes Made

| File                                                  | Change                                                                                                                                                                                                                                                                                                                                                                                                                            | Reason                                                                                                                                               |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/admin/menu/configure/SmartCategoriesSection.tsx` | **NEW** — Extracted smart categories UI into a reusable section component. Contains all card management (toggle, reorder, preview, reset, time windows, item limits). Wrapped in `bg-neutral-light/50` container with proper padding. Grid changed from 3-col to 2-col max. Added "How Smart Categories work" explainer card with 5 bullet points. Added per-card description text keyed by slug via `CATEGORY_DESCRIPTIONS` map. | Reusable section for embedding in Configure page; cards no longer touch edges; 2-col fits `max-w-5xl` container; self-documenting feature for admins |
| `app/admin/menu/configure/page.tsx`                   | Imports and renders `SmartCategoriesSection` below the categories table, separated by a `border-t` divider. Removed "Smart Categories" from `MENU_SUB_TABS`.                                                                                                                                                                                                                                                                      | Groups smart categories logically with category management                                                                                           |
| `app/admin/menu/page.tsx`                             | Removed "Smart Categories" entry from `MENU_SUB_TABS`                                                                                                                                                                                                                                                                                                                                                                             | Navigation consistency — tab no longer exists                                                                                                        |
| `app/admin/menu-tags/page.tsx`                        | Removed "Smart Categories" entry from `MENU_SUB_TABS`                                                                                                                                                                                                                                                                                                                                                                             | Navigation consistency                                                                                                                               |
| `app/admin/menu-add-ons/page.tsx`                     | Removed "Smart Categories" entry from `MENU_SUB_TABS`                                                                                                                                                                                                                                                                                                                                                                             | Navigation consistency                                                                                                                               |
| `app/admin/menu/smart-categories/page.tsx`            | Gutted to a simple redirect to `/admin/menu/configure`                                                                                                                                                                                                                                                                                                                                                                            | Keeps route alive for existing bookmarks                                                                                                             |

### Decisions

- **Decision**: Slug-keyed `CATEGORY_DESCRIPTIONS` map for per-card text instead of storing descriptions in the backend
  - **Rationale**: These are static explanations of category behavior — no dynamic data needed, simpler to maintain in the frontend
- **Decision**: Old `/admin/menu/smart-categories` route kept as a redirect rather than deleted
  - **Rationale**: Avoids breaking any existing bookmarks or shared links
- **Decision**: Changed from 3-column to 2-column card grid
  - **Rationale**: Cards now live within the narrower Configure page `max-w-5xl` container; 2-col provides better readability and spacing
- **Decision**: Added "How Smart Categories work" explainer card
  - **Rationale**: Admins had no explanation of what smart categories are or how the controls work — makes the feature self-documenting

### Current State

- **Configure page** now has two sections:
  1. **Menu Categories** — existing category CRUD table
  2. **Smart Categories** — separated by divider, with explainer card, stats bar, and card grid
- **Admin menu navigation**: 4 tabs — Items, Add-ons, Tags, Configure (Smart Categories tab removed)
- **All 4 menu sub-pages** have consistent `MENU_SUB_TABS`
- **Old route** `/admin/menu/smart-categories` redirects to `/admin/menu/configure`
- **Branch**: `menu-audit`

### Pending / Follow-up

- Drag-and-drop reorder (currently arrow-based) if UX feedback warrants it
- Bulk enable/disable toggle for all smart categories at once
- Consider inline editing of category display names
- Manager menu page (`/staff/manager/menu/`) may need Smart Categories in its configure section too

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
