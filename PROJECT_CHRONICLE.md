# CediBites Frontend — Project Chronicle

> **Purpose**: Living record of all changes, decisions, and current state of the CediBites Next.js frontend. Maintained by the Project Chronicle agent. Read this before starting work on any area.

> **Current Branch**: `payment-order-bug-fixes` (off `main`)

---

## System Map

### Route Groups

| Group | Purpose | Auth |
|-------|---------|------|
| `(customer)/` | Menu browsing, checkout, order tracking | Customer auth |
| `(staff-auth)/` | Staff login entry | Unauthenticated |
| `admin/` | System management dashboard | Admin role |
| `kitchen/` | Real-time kitchen display system | Staff auth |
| `order-manager/` | Centralized order management | Manager role |
| `partner/` | Partner/merchant portal | Partner access |
| `pos/` | In-store point-of-sale terminal | POS device |
| `staff/` | Multi-purpose staff dashboard | Staff auth |

### State Management

| Context/Provider | Location | Purpose |
|-----------------|----------|---------|
| Kitchen context | `app/kitchen/context.tsx` | Kitchen display state |
| Kitchen branch context | `app/kitchen/branch-context.tsx` | Branch selection for kitchen |
| POS context | `app/pos/context.tsx` | POS terminal cart & checkout sessions |
| StaffAuthProvider | `app/staff/providers/` | Staff authentication state |

### API Layer

- **19 service files** in `lib/api/services/` — covering auth, orders, checkout sessions, menu, cart, payments, customers, staff, branches, analytics, roles, activity logs, notifications
- **17+ hooks** in `lib/api/hooks/` — React Query wrappers for all services
- **Client** in `lib/api/client.ts` — Axios HTTP client config
- **Adapters & Transformers** in `lib/api/adapters/` and `lib/api/transformers/`

### Utilities

| Utility | Location | Purpose |
|---------|----------|---------|
| Currency formatting | `lib/utils/currency.ts` | GHS display |
| Distance calc | `lib/utils/distance.ts` | Delivery distance |
| Error handler | `lib/utils/error-handler.ts` | Centralized error handling |
| PDF export | `lib/utils/exportPdf.ts` | Report export |
| Order adapter | `lib/utils/orderAdapter.ts` | Order data transformation |
| Receipt printing | `lib/utils/printReceipt.ts` | POS receipt printing |
| Report generator | `lib/utils/reportGenerator.ts` | Report generation |

---

## Change Log

*Entries are added per session, newest first.*

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

## [2026-04-04] Session: Metadata Page Titles Across All Pages

### Intent
Every page in the app should have a unique, descriptive browser tab title. Previously most pages showed a generic "CediBites" title, making it impossible to tell tabs apart. The root layout had a `%s | CediBites` template, but almost no pages filled in the `%s`. Customer-facing routes under `(customer)` had some metadata, but all staff/admin/kitchen/partner/POS pages had none.

### Changes Made

**8 `'use client'` layouts split into server + client pairs:**

| Original File (now `layout-client.tsx`) | New Server `layout.tsx` | Metadata |
|----------------------------------------|------------------------|----------|
| `app/admin/layout.tsx` | `app/admin/layout.tsx` | Template: `%s — Admin \| CediBites`, default: "Admin", robots noindex |
| `app/kitchen/layout.tsx` | `app/kitchen/layout.tsx` | Template: `%s — Kitchen \| CediBites`, default: "Kitchen", robots noindex |
| `app/partner/layout.tsx` | `app/partner/layout.tsx` | Template: `%s — Partner \| CediBites`, default: "Partner", robots noindex |
| `app/pos/layout.tsx` | `app/pos/layout.tsx` | Template: `%s — POS \| CediBites`, default: "POS", robots noindex |
| `app/pos/terminal/layout.tsx` | `app/pos/terminal/layout.tsx` | Title: "Terminal" |
| `app/staff/layout.tsx` | `app/staff/layout.tsx` | Template: `%s — Staff \| CediBites`, default: "Staff Portal", robots noindex |
| `app/staff/partner/layout.tsx` | `app/staff/partner/layout.tsx` | Template: `%s — Partner \| CediBites`, default: "Partner" |
| `app/order-manager/layout.tsx` | `app/order-manager/layout.tsx` | Title: "Order Manager", robots noindex |

**1 existing server layout updated:**

| File | Change | Reason |
|------|--------|--------|
| `app/(staff-auth)/layout.tsx` | Added metadata export — title: "Staff", robots noindex | Was a server component already, just needed metadata |

**55+ new sub-page `layout.tsx` files created**, each exporting specific `Metadata` titles:

| Section | Count | Pages |
|---------|-------|-------|
| Admin | 14 | Dashboard, Orders, Branches, Menu, Configure Menu, Staff, Customers, Promos, Transactions, Analytics, Settings, Audit Log, Menu Add-ons, Menu Tags |
| Staff root | 10 | Sign In, Forgot Password, Reset Password, Dashboard, Orders, Store, New Order, My Sales, My Shifts, Profile |
| Staff/Manager | 12 | Manager Dashboard, Manager Orders, Analytics, Menu, Configure Menu, Menu Tags, Staff, Staff Sales, Shifts, My Shifts, Settings, New Order |
| Staff/Partner | 5 | Dashboard, Orders, My Branch, Staff, Analytics |
| Staff/Sales | 5 | Sales Dashboard, Sales Orders, New Sales Order, My Sales, My Shifts |
| Partner | 5 | Dashboard, Orders, My Branch, Staff, Analytics |
| Kitchen | 1 | Kitchen Display |
| POS | 2 | Terminal, Orders |
| Customer | 4 | Payment Successful, Payment Cancelled, Checkout Return, Checkout Cancelled |
| (Staff-auth) | 1 | Change Password |

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
| File | Change | Reason |
|------|--------|--------|
| `.github/agents/project-chronicle.agent.md` | Created agent definition | New agent with read/search/edit/agent/todo tools, mandatory cross-referencing, structured chronicle format |
| `.github/instructions/chronicle-reminder.instructions.md` | Created instruction file with `applyTo: "**"` | Auto-reminds all agents to ask user about updating the chronicle after every code change |
| `PROJECT_CHRONICLE.md` | Created knowledge base file | Seeded with system map (route groups, state management, API layer, utilities) as a hybrid starting point |

### Cross-Repo Impact
| File (API repo) | Change | Reason |
|------|--------|--------|
| `.github/agents/project-chronicle.agent.md` | Mirror of frontend agent definition | Same agent available in both repos |
| `.github/instructions/chronicle-reminder.instructions.md` | Mirror of frontend instruction | Reminder works regardless of which repo is being edited |
| `PROJECT_CHRONICLE.md` | API knowledge base file | Seeded with system map (routes, models, services, architecture, integrations) |

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
