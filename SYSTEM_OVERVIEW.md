# CediBites — System Overview
### How the modules talk to each other, what ties the system together, and how every order flows end-to-end

---

## The Big Idea

CediBites is a food delivery platform built entirely in the browser — no backend server, no database, no API calls. Every piece of data lives in `localStorage` in the user's browser. Yet every screen — a customer placing an order, a cashier ringing up a table, a kitchen team seeing what to cook, a manager watching orders roll in — all see the same data at the same time, automatically, without ever refreshing the page.

The thing that makes this possible is a single, shared **Order Store**: a React context that wraps the entire application and acts as the single source of truth for every order in the system. Everything reads from it. Everything writes through it. And a two-layer real-time sync mechanism keeps every open tab in sync the moment any change happens.

---

## The Foundation Layer — Providers

When the app starts, before any page renders, a stack of providers wraps everything. Think of these as the "operating system" of the app. They are mounted once and live for the entire browser session.

```
ModalProvider
  └── AuthProvider
        └── LocationProvider
              └── BranchProvider
                    └── OrderStoreProvider          ← the central nervous system
                          └── MenuDiscoveryProvider
                                └── CartProvider
                                      └── [every page in the app]
```

Each layer has a distinct responsibility:

- **ModalProvider** — controls which global modal (if any) is open: the location prompt or the branch selector.
- **AuthProvider** — manages the logged-in *customer* session (name, phone, saved address) stored in `localStorage` under `cedibites-auth-user`.
- **LocationProvider** — tracks the customer's GPS coordinates via the browser's Geolocation API. It feeds latitude/longitude into BranchProvider so the nearest branch can be found.
- **BranchProvider** — holds the list of all 7 branches (Osu, East Legon, Tema, Madina, La Paz, Spintex, Dzorwulu) with their coordinates, delivery radius, operating hours, and menu availability. It uses the customer's location to compute distance and pick the nearest open branch. The `selectedBranch` it provides is what the checkout page uses to know where to send an order.
- **OrderStoreProvider** — described in full below. This is the core.
- **MenuDiscoveryProvider** — holds the 22 menu items, enables search, category filtering, and cross-references with the selected branch's available items.
- **CartProvider** — manages the customer's shopping cart: items, quantities, the selected size for each item, and total calculations. It persists the cart to `localStorage` under `cedibites-cart` so items survive a page refresh.

---

## The Central Nervous System — OrderStoreProvider

`OrderStoreProvider` is the single most important file in the system. It is the bridge between every front-end module and the data layer. Every order ever created, updated, or read passes through it.

### What it holds

It holds one piece of state: `orders` — an array of every order in the system. This is the live, in-memory representation of the database. Every component that needs order data reads from this array. No component ever reads from `localStorage` directly.

### How it loads data

On mount, it calls `service.getAll()` which reads from `localStorage` key `cedibites-orders`. The result is set into React state. From that moment, the `orders` array is the app's working memory.

### How it stays live

Two mechanisms keep the state fresh without any manual refresh:

**1. Service subscription** — The `OrderStoreProvider` registers a callback with the service: `service.subscribe(callback)`. Whenever any module writes an order change (new order, status update, patch), the service notifies every registered callback with the fresh list of all orders. The callback does one thing: `setOrders(updatedOrders)`. This causes every component reading from the store to re-render with the new data.

**2. Visibility change** — When a browser tab regains focus (the user switches to it after being elsewhere), `OrderStoreProvider` immediately re-reads from `localStorage` and refreshes its state. This guarantees that even if a tab was sleeping in the background while other tabs were active, it catches up the moment the user looks at it.

### What it exposes

It exposes these to any component in the app:

- `orders` — the full live array
- `getOrderById(id)` — find a specific order
- `getOrdersByFilter(filter)` — filter by branchId, status, source, date range, search term, etc.
- `createOrder(input)` — place a new order
- `updateOrderStatus(id, status)` — advance an order through its lifecycle
- `updateOrder(id, patch)` — update arbitrary fields (e.g. rider coordinates)
- `deleteOrder(id)` — remove an order
- `refresh()` — force a re-read from storage

---

## The Data Layer — MockOrderService

The `OrderStoreProvider` doesn't touch `localStorage` directly. It delegates all storage operations to a service object obtained via `getOrderService()`. This factory returns a singleton instance of `MockOrderService`.

The singleton pattern is intentional: there is exactly one `MockOrderService` per browser tab. This single instance holds the BroadcastChannel connection and the set of subscriber callbacks. All calls to `getOrderService()` from any part of the app (kitchen context, POS context, staff orders context, checkout page) return the same object.

### MockOrderService responsibilities

- **Read** — `getAll()`, `getById()` both call `readAll()` which parses the JSON from `localStorage`.
- **Write** — `create()`, `updateStatus()`, `update()`, `delete()` all modify the orders array and call `writeAll()`, which saves back to `localStorage` and then broadcasts the change.
- **Subscribe** — Any code can register a callback via `subscribe(fn)`. The service holds these in a `Set`. When `notifyListeners()` is called, it reads fresh from `localStorage` and calls every registered callback.
- **Cross-tab sync** — two mechanisms run in parallel:
  - **BroadcastChannel** (`cedibites-orders-sync`) — a modern browser API that sends a message to the same channel in all other open tabs. When any tab's `writeAll()` posts `'update'`, every other tab's `onmessage` fires and calls `notifyListeners()`.
  - **Storage event** — a fallback native to the browser. When `localStorage` changes in one tab, every other tab receives a `storage` event. The service listens for this on the `cedibites-orders` key and calls `notifyListeners()` if it fires.

Together, these ensure that a status change made in the staff dashboard is visible on the kitchen screen within milliseconds, without any polling.

### Seed data

On first run (when `localStorage` is empty), the service writes 13 pre-built seed orders covering every combination of status, source, fulfillment type, and payment method. This gives every module something to display immediately without any setup.

---

## The Order Lifecycle

An order moves through these statuses in sequence:

```
received → accepted → preparing → ready → out_for_delivery / ready_for_pickup → delivered / completed / cancelled
```

Each status has a clear meaning:

| Status | Meaning |
|---|---|
| `received` | Order placed, waiting for someone to accept it |
| `accepted` | A staff member or kitchen has acknowledged it |
| `preparing` | Kitchen is actively cooking |
| `ready` | Food is done — waiting for rider pickup or customer pickup |
| `out_for_delivery` | Rider has the order and is en route to customer |
| `ready_for_pickup` | Customer pickup order is ready at the counter |
| `delivered` | Delivery confirmed |
| `completed` | Pickup/dine-in/POS order closed out |
| `cancelled` | Order cancelled at any point |

Timestamps are recorded at each transition: `acceptedAt`, `startedAt`, `readyAt`, `completedAt`. These are used for calculating average prep times and displaying elapsed time on the kitchen and staff screens.

---

## The Five Modules

### 1. Customer (Online Ordering)

**Pages:** `/`, `/menu`, `/checkout`, `/orders`, `/orders/[orderCode]`, `/order-history`

**Flow — placing an order:**

The customer browses the menu on `/menu`. The `MenuDiscoveryProvider` powers search, category filtering, and item lookup. When they tap an item, it goes into the `CartProvider`. The cart persists to `localStorage` so it survives refresh.

At checkout (`/checkout`), the page reads three things from context: the selected branch from `BranchProvider`, the customer's GPS coordinates from `LocationProvider`, and the cart items from `CartProvider`. It assembles a `CreateOrderInput` object — a standardised shape that all order-creating modules use — and calls `createOrder()` from `OrderStoreProvider`.

`createOrder()` calls `service.create()`, which generates a unique order ID (format: `CB` + 6 random digits), computes the totals, builds the full `Order` object, saves it to `localStorage`, and broadcasts the change. The `OrderStoreProvider`'s own state is updated immediately. Every other tab's `OrderStoreProvider` gets the update via BroadcastChannel and the storage event.

After the order is placed, the cart is cleared and the customer is shown their order confirmation with the order number. The "Track My Order" link takes them to `/orders/[orderCode]` where they can watch the status update in real time.

**How order tracking works:**
The `/orders/[orderCode]` page reads from `OrderStoreProvider` using `getOrderById()`. Because `OrderStoreProvider` is live and reactive, if the kitchen or staff advance the order status, this page updates automatically — the customer sees "Preparing" appear without refreshing.

**Order history:**
`/order-history` shows all orders. If the customer is logged in (via `AuthProvider`), it filters by phone number match. If they are a guest, it shows all `source: 'online'` orders (since there's no user identification for guests yet).

---

### 2. Point of Sale — POS (`/pos`)

**Who uses it:** Cashiers at a branch. Runs on a dedicated terminal (tablet/computer at the counter).

**Authentication:** The POS has its own login system, separate from both customer auth and staff auth. A cashier logs in with their staff ID and PIN. The session is stored in `sessionStorage` under `pos-session` with a 12-hour TTL. Closing the browser tab ends the session.

**The POSProvider** wraps the POS layout and provides all POS-specific logic: cart management, customer name/phone input, order type (dine-in vs. takeaway), and payment processing.

**Flow — taking an order:**

The cashier browses the menu on `/pos/terminal`, adds items to the POS cart (separate from the customer-facing CartProvider), enters the customer's name and phone, chooses dine-in or takeaway, then opens the payment modal.

`processPayment()` builds a `CreateOrderInput` with `source: 'pos'` and the branch details from the logged-in session, then calls `createOrder()` from `OrderStoreProvider`. This is the exact same function the customer checkout uses. The order flows into the exact same storage layer and is immediately visible everywhere.

**Today's orders:** The POS orders page (`/pos/orders`) shows only orders from today, from the logged-in cashier's branch, and with `source: 'pos'`. This filter is applied in the `POSProvider` using `useMemo` over the live `allOrders` from `OrderStoreProvider`. Any status update from the kitchen shows up here automatically.

**Dependency tree:**
```
POSProvider → useOrderStore → MockOrderService → localStorage
```

---

### 3. Kitchen Display (`/kitchen`)

**Who uses it:** Kitchen staff on a screen mounted in the kitchen. Runs continuously, always visible.

**The layout has two pages:**
- `/kitchen/display` — a read-only board showing what's being cooked (received → accepted → preparing → ready)
- `/kitchen/control` — the interactive board where staff tap to accept and advance orders

**The KitchenProvider** is the module-level context for the kitchen. It wraps both kitchen pages and sits *inside* `OrderStoreProvider` (which is in the root layout). It does not have its own authentication — the kitchen screen is assumed to be a locked, dedicated display.

**How it gets orders:**

`KitchenProvider` calls `useKitchenOrders()`, a hook that calls `getOrdersByFilter()` from `OrderStoreProvider` with a filter of `status: ['received', 'accepted', 'preparing', 'ready']` and no `branchId` — meaning it shows active orders from all branches. The result is re-computed every time the `orders` array in `OrderStoreProvider` changes.

Because `getOrdersByFilter` is wrapped in `useCallback([orders])`, a new function reference is created every time `orders` changes. `useKitchenOrders` has `getOrdersByFilter` in its `useMemo` dependency array, so it recomputes whenever orders change.

**Derived data:**
`KitchenProvider` groups orders into four buckets (`ordersByStatus.received`, `.accepted`, `.preparing`, `.ready`), sorted oldest-first so the most urgent order is always at the top. It also computes live stats: counts per status, and average prep time calculated from `readyAt - startedAt` timestamps.

**Sounds:**
`useKitchenSounds` uses the Web Audio API (no sound files, pure waveform synthesis) to play distinct tones for new orders, accepted, preparing, ready, and taps. When `kitchenOrders.length` increases compared to the previous render, a new-order sound plays.

**Flow — accepting an order:**

A staff member taps "Accept" on an order card in the "New" (received) tab of `/kitchen/control`. This calls `acceptOrder(orderId)` in `KitchenProvider`, which calls `updateOrderStatus(orderId, 'accepted', { acceptedAt: now })` from `OrderStoreProvider`. That writes to `localStorage`, broadcasts the change, and the order card disappears from the "New" column and reappears in "Accepted" — simultaneously on every open screen showing that order.

**Dependency tree:**
```
KitchenProvider
  → useKitchenOrders → useOrderStore (getOrdersByFilter)
  → useOrderStore (updateOrderStatus, createOrder, refresh)
  → useKitchenSounds (Web Audio API)
```

---

### 4. Staff Orders (`/staff/orders`, `/staff/manager/orders`, `/staff/sales/orders`)

**Who uses it:** Sales staff and managers. This is the main operational view — a Kanban board showing all orders across all branches (for managers) or filtered by the user's branch (for sales).

**Authentication:** Staff use a separate login at `/staff/login`. `StaffAuthProvider` wraps the entire `/staff/` layout subtree. On login, it validates credentials against the mock staff list (18 staff members across 3 branches) and saves the session to `localStorage` under `cedibites-staff-session`. The session persists across refreshes.

**Role-based routing:** After login, the `roleHomeRoute()` function reads the staff member's role and redirects them:
- `admin` → `/admin/dashboard`
- `manager` → `/staff/manager/dashboard`
- `sales`, `kitchen`, `rider`, `call_center` → `/staff/sales/dashboard`

A `useStaffRoutes()` hook provides role-correct URLs for navigation links so sales and manager see the same UI components but routed to different paths.

**The OrdersProvider** is the module-level context for the staff orders module. It receives the `role` prop from the page (`'sales'` or `'manager'`) and uses it to control what actions are permitted via the `canAdvanceOrder()` helper from `types/order.ts`.

**What OrdersProvider does:**
- Reads `storeOrders` from `OrderStoreProvider` (the full live array)
- Applies filters: search text, branch filter, date range, show/hide cancelled
- Exposes `filteredOrders` for the Kanban board to render
- Manages `selectedOrder` (which order's detail panel is open), kept in sync with the store so status updates appear immediately in the open panel
- Manages drag-and-drop: `draggingId` tracks which card is being dragged; `handleDrop` resolves where it was dropped and calls `handleAdvance`
- Plays 7 distinct sounds for different transitions (sine waveforms)
- Shows toast notifications for status changes, customer SMS simulation, and new orders

**Flow — advancing an order:**

A manager drags an order card from "Preparing" to "Ready". `handleDrop` fires → `handleAdvance(id, 'ready')` → `canAdvanceOrder(role, order, 'ready')` returns `true` (managers can do anything) → `updateOrderStatus(id, 'ready', { readyAt: now })` is called on `OrderStoreProvider` → the order moves in the Kanban board → the kitchen display also updates immediately.

When a manager marks an order `out_for_delivery`, two additional things happen: a notification is shown simulating an SMS to the customer, and `startRiderSim(id)` begins interpolating the rider's GPS coordinates from branch to customer every 5 seconds via `updateOrder(id, { coords: { ...rider } })`. This makes the live map on `/orders/[orderCode]` animate the rider moving.

**Dependency tree:**
```
OrdersProvider
  → useOrderStore (storeOrders, updateOrderStatus, updateOrder, createOrder)
  → canAdvanceOrder (types/order.ts)
  → useSounds (Web Audio API)
  → KANBAN_COLUMNS, BRANCH_COORDS (lib/constants)
```

---

### 5. Admin (`/admin`)

**Who uses it:** The admin user (`role: 'admin'`). Has access to all data and all branches.

**Pages:** Dashboard, Orders, Staff, Branches, Menu, Analytics, Audit, Settings, Customers

The admin layout wraps `StaffAuthProvider` (same as staff). The admin orders page reuses the same `OrdersProvider` used by staff, passed `role="manager"` (admins have at least manager-level permissions). The admin menu page reads from `useMenuConfig()` — a hook that reads/writes the menu configuration from `localStorage` under `cedibites_menu_config`. The staff management page reads from `staff.service.mock.ts` which wraps the static `MOCK_STAFF` array of 18 staff members.

---

## Cross-Cutting Concerns

### Real-Time Sync (the full picture)

When any write happens (order created, status changed, patch applied):

```
Module calls updateOrderStatus / createOrder / etc.
        ↓
OrderStoreProvider calls service.updateStatus / service.create / etc.
        ↓
MockOrderService.writeAll()
    → saves to localStorage['cedibites-orders']
    → BroadcastChannel.postMessage('update')        → fires in ALL OTHER TABS
    → (storage event auto-fires in all other tabs)  → second layer fallback
        ↓ (in each other tab)
MockOrderService.notifyListeners()
    → reads fresh from localStorage
    → calls every subscriber callback with updated orders
        ↓
OrderStoreProvider.setOrders(updatedOrders)
    → React re-renders everything reading from the store
        ↓
Kitchen display updates. Staff kanban updates. Customer tracking page updates.
```

In the same tab that made the write, `OrderStoreProvider` applies an optimistic state update immediately (without waiting for the BroadcastChannel), so the UI feels instantaneous.

Additionally, when any tab regains focus (`visibilitychange` to `visible`), `OrderStoreProvider` re-reads from `localStorage` as a final safety net — guaranteeing freshness even if the tab was sleeping for a long time.

### Authentication — Three Separate Systems

The system has three unrelated authentication contexts that do not know about each other:

| System | Provider | Storage | Who uses it |
|---|---|---|---|
| Customer auth | `AuthProvider` | `localStorage` — `cedibites-auth-user` | Customers on the public site |
| Staff auth | `StaffAuthProvider` | `localStorage` — `cedibites-staff-session` | Sales, managers, admin on `/staff/` and `/admin/` |
| POS session | `POSProvider` (internal) | `sessionStorage` — `pos-session` (12h TTL) | Cashiers on `/pos/` |

These are completely independent. A staff member logged into the staff portal and a customer logged in on the public site can coexist in the same browser without interference.

### Branch Data — Two Sources

Branch information is defined in two places:

1. **`BranchProvider.tsx`** — the `BRANCHES` array with full UI details (delivery radius, operating hours, menu item IDs). Used by the customer-facing app to select branches, filter menus, and compute delivery estimates.
2. **`order.service.mock.ts`** — the `BRANCH_COORDS` map (branch name → latitude/longitude). Used when building seed orders so orders have realistic coordinates for the map.

When an order is created, the full branch object (id, name, address, phone, coordinates) is embedded directly into the order. This means an order carries all the branch information it needs — there's no join or lookup required later.

### The Unified Order Type

All five modules (customer checkout, POS, staff new-order wizard, kitchen, admin) use exactly the same `Order` type from `types/order.ts`. Every field on the type is used by at least one module. Every module that creates orders uses the same `CreateOrderInput` type. This uniformity is what makes the shared `OrderStoreProvider` possible — every module speaks the same language.

---

## What Connects Everything — Summary

| Node | Role | Depends On | Consumed By |
|---|---|---|---|
| `MockOrderService` | Persistence + broadcast | `localStorage`, `BroadcastChannel`, `storage event` | `OrderStoreProvider` (singleton per tab) |
| `OrderStoreProvider` | Shared state + live sync | `MockOrderService` | Kitchen, POS, Staff, Admin, Customer tracking |
| `BranchProvider` | Branch selection + geo | `LocationProvider`, branch data | Checkout, POS (branch lookup), `OrderStoreProvider` context |
| `CartProvider` | Customer cart state | `MenuDiscoveryProvider` (item data) | Checkout page |
| `StaffAuthProvider` | Staff session | `mockStaff.ts` | Staff layout, Admin layout, role routing |
| `POSProvider` | POS session + cart + orders | `OrderStoreProvider`, `BranchProvider` | POS terminal, POS orders |
| `KitchenProvider` | Kitchen order state + sounds | `OrderStoreProvider`, `useKitchenOrders` | Kitchen display, kitchen control |
| `OrdersProvider` | Staff kanban state | `OrderStoreProvider`, `canAdvanceOrder` | Staff orders, manager orders, admin orders |
| `types/order.ts` | Shared type language | — | Every module |
| `lib/constants/order.constants.ts` | Display labels + column config | — | Kitchen, Staff orders, Admin |

---

## A Day in the Life — End-to-End Scenario

**8:00 AM** — The kitchen staff open `/kitchen/control` on a wall-mounted tablet. `OrderStoreProvider` loads 13 seed orders from `localStorage`. `KitchenProvider` filters them down to 4 with active statuses. The kitchen sees 2 orders in "New", 1 in "Preparing", 1 in "Ready". A sound plays.

**8:03 AM** — A cashier at the East Legon branch opens `/pos/terminal` on a counter tablet, logs in with their staff PIN. `POSProvider` validates the 12-hour session from `sessionStorage`. They browse the menu and add Jollof Rice and a Coke.

**8:04 AM** — The cashier taps "Charge", selects Cash, confirms payment. `processPayment()` calls `createOrder()`. The order is written to `localStorage`. BroadcastChannel fires. The kitchen tablet receives the broadcast → `notifyListeners()` → `setOrders()` → the kitchen's "New" count jumps from 2 to 3. A new-order sound plays in the kitchen.

**8:05 AM** — The kitchen taps "Accept" on the new order. `acceptOrder()` calls `updateOrderStatus()`. The order moves from "New" to "Accepted" on the kitchen screen. The POS orders page on the cashier's tablet also updates — the order shows as "Accepted" in their history.

**8:06 AM** — A customer on their phone opens the CediBites website, browses the menu. Their location is detected. `BranchProvider` calculates distances and selects East Legon (2.1 km away) as the nearest open branch. They add items to their cart, go to checkout, fill in their address, and tap "Place Order". `createOrder()` runs with `source: 'online'`. The same broadcast fires. The kitchen sees a 4th order appear in "New".

**8:10 AM** — A manager opens `/staff/manager/orders` in a browser on their laptop. `OrderStoreProvider` loads all orders. `OrdersProvider` shows them on a Kanban board across 5 columns. They see the customer's online order in "New". They drag it to "Preparing". `handleDrop` → `handleAdvance` → `updateOrderStatus`. The status updates. The kitchen display shows the order move from "New" to "Preparing" — automatically.

**8:30 AM** — The manager marks the customer's order "Out for Delivery". A simulated SMS notification fires. `startRiderSim()` begins updating the rider's GPS every 5 seconds. On the customer's phone at `/orders/[orderCode]`, the status updates from "Preparing" to "Out for Delivery" and the live map shows the rider dot moving toward their address — no refresh needed.

---

*This document reflects the system as of March 2026. The architecture is designed to swap the `MockOrderService` for a real `ApiOrderService` in a single line per entity in each `*.service.ts` factory file — all modules above that layer remain unchanged.*
