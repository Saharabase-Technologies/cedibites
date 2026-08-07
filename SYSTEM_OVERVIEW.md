# CediBites — System Overview for Backend Engineering

> **Purpose:** This document describes what the frontend expects from a backend API. Every data type, business rule, and service contract here was extracted directly from the running frontend code. When you build the API, this is your source of truth.

---

## 1. Business Domain

CediBites is a multi-channel food ordering platform for Ghana. Orders flow in from five sources and get fulfilled by one of seven physical branches. The lifecycle of every order moves through a shared status machine visible to all operator roles simultaneously.

**Order sources:** Online (customer web), Phone, WhatsApp, Social Media, POS (in-branch terminal)

**Fulfillment types:** Delivery, Pickup, Dine-in, Takeaway

**Payment methods:** Mobile Money (MoMo), Cash, Card, No Charge (comped order)

**Currency:** GHS (₵). Tax rate: 2.5% of subtotal. Delivery fee: per-branch, typically ₵12–18.

---

## 2. Core Data Models

### 2.1 Order

The most important entity. Every module reads and writes orders through the same unified shape.

```typescript
Order {
  // Identity
  id: string                    // CB + 6 random digits, e.g. "CB4821F9"
  orderNumber: string           // same as id — used for customer-facing display

  // Workflow
  status: OrderStatus           // see §3
  source: OrderSource           // 'online' | 'phone' | 'whatsapp' | 'social_media' | 'pos'
  fulfillmentType: FulfillmentType // 'delivery' | 'pickup' | 'dine_in' | 'takeaway'

  // Payment
  paymentMethod: PaymentMethod  // 'momo' | 'cash' | 'card' | 'no_charge'
  isPaid: boolean               // true if momo or no_charge at placement
  paymentStatus: PaymentStatus  // 'pending' | 'completed' | 'failed' | 'refunded'

  // Items & pricing (all values in GHS)
  items: OrderItem[]
  subtotal: number              // sum of (unitPrice × quantity) for all items
  deliveryFee: number           // 0 for non-delivery orders
  discount: number              // promo discount applied (0 if none)
  promoCode?: string
  tax: number                   // subtotal × 0.025
  total: number                 // subtotal + deliveryFee + tax − discount

  // People
  contact: OrderContact         // customer name, phone, address
  branch: OrderBranch           // snapshot of branch at order time
  staffId?: string              // who created the order (staff/POS only)
  staffName?: string

  // Timestamps (Unix ms)
  placedAt: number
  acceptedAt?: number           // set when status → accepted
  startedAt?: number            // set when status → preparing
  readyAt?: number              // set when status → ready
  completedAt?: number          // set when status → delivered/completed

  estimatedMinutes?: number     // not yet calculated by frontend

  // Tracking
  kitchenConfirmed?: boolean
  coords?: OrderCoords          // branch + customer + rider GPS coordinates

  // Notes
  allergyFlags?: string[]
  staffNotes?: string

  // Cancel request workflow (call_center flow)
  cancelRequestedBy?: string    // staffId who requested
  cancelRequestedAt?: number
  cancelRequestReason?: string
  cancelPreviousStatus?: OrderStatus // to restore if manager rejects
}
```

#### OrderItem
```typescript
OrderItem {
  id: string                    // line-item ID, unique within an order
  menuItemId: string            // references menu item ID
  name: string
  quantity: number
  unitPrice: number
  image?: string
  icon?: string
  sizeLabel?: string            // "Large", "350ml"
  variantKey?: string           // "plain", "assorted", "large"
  notes?: string                // per-item kitchen notes
  category?: string
}
```

#### OrderContact
```typescript
OrderContact {
  name: string
  phone: string                 // +233 format preferred
  email?: string
  address?: string              // delivery address
  gpsCoords?: string            // Ghana Post GPS code
  notes?: string                // customer delivery notes
}
```

#### OrderBranch (snapshot embedded in order)
```typescript
OrderBranch {
  id: string
  name: string
  address: string
  phone: string
  coordinates: { latitude: number; longitude: number }
}
```

#### OrderCoords
```typescript
OrderCoords {
  branch: { latitude: number; longitude: number }
  customer?: { latitude: number; longitude: number }
  rider?: { latitude: number; longitude: number }   // updated during delivery
}
```

---

### 2.2 Branch

```typescript
Branch {
  id: string                    // '1' through '7'
  name: string                  // e.g. "East Legon"
  address: string
  area: string                  // neighborhood label for display
  phone: string
  coordinates: { latitude: number; longitude: number }
  deliveryRadius: number        // km — orders beyond this radius are rejected
  deliveryFee: number           // GHS
  operatingHours: string        // e.g. "8:00 AM – 10:00 PM"
  isOpen: boolean               // real-time status
  menuItemIds: string[]         // which menu items are available at this branch
}
```

**Current branches:** Osu (1), East Legon (2), Spintex (3, currently closed), Tema (4), Madina (5), La Paz (6), Dzorwulu (7)

---

### 2.3 Staff Member

```typescript
StaffMember {
  id: string
  name: string
  email: string
  phone: string                 // +233 format
  role: StaffRole               // see §5.2
  branch: string | string[]     // display name(s)
  branchIds: string[]           // system IDs — matches Branch.id
  status: 'active' | 'inactive' | 'archived'
  employmentStatus: 'active' | 'on_leave' | 'resigned'
  systemAccess: 'enabled' | 'disabled'
  permissions: StaffPermissions
  pin: string                   // 4-digit POS PIN (empty = no POS access)
  password: string              // staff portal login password
  joinedAt: string
  ssnit?: string
  ghanaCard?: string
  tinNumber?: string
  photoUrl?: string
  emergencyContact?: { name: string; phone: string; relationship: string }
}

StaffPermissions {
  canPlaceOrders: boolean       // call_center, manager, super_admin
  canAdvanceOrders: boolean     // manager, super_admin
  canAccessPOS: boolean         // any staff with a PIN
  canViewReports: boolean       // manager, super_admin, branch_partner
  canManageMenu: boolean        // manager (if delegated), super_admin
  canManageStaff: boolean       // manager (if delegated), super_admin
}
```

---

### 2.4 Staff Shift

Tracks a staff member's active login session for sales attribution and reporting.

```typescript
StaffShift {
  id: string
  staffId: string
  staffName: string
  branchId: string
  branchName: string
  loginAt: number               // Unix ms
  logoutAt?: number             // null = shift still active
  orderIds: string[]            // order numbers placed during this shift
  totalSales: number            // sum of non-cancelled order totals (GHS)
  orderCount: number
}
```

---

### 2.5 Promo

```typescript
Promo {
  id: string
  name: string
  type: 'percentage' | 'fixed_amount'
  value: number                 // e.g. 20 = 20% off OR ₵20 off
  scope: 'global' | 'branch'
  branchIds?: string[]          // populated when scope = 'branch'
  appliesTo: 'order' | 'items'  // order = whole cart, items = specific menu items
  itemIds: string[]             // populated when appliesTo = 'items'
  minOrderValue?: number        // promo only fires when subtotal >= this
  maxOrderValue?: number
  maxDiscount?: number          // cap on GHS value of a percentage discount
  startDate: string             // ISO date
  endDate: string               // ISO date
  isActive: boolean
  accountingCode?: string
}
```

---

### 2.6 Menu Item

Currently static (`lib/data/SampleMenu.ts`). The admin menu manager persists overrides to localStorage under `cedibites_menu_config`.

```typescript
MenuItem {
  id: string
  name: string
  category: string              // 'basic-meals' | 'budget-bowls' | 'combos' | 'top-ups' | 'drinks'
  price?: number                // flat price (no sizes)
  sizes?: { key: string; label: string; price: number }[]
  hasVariants?: boolean
  variants?: { plain?: number; assorted?: number }
  image?: string
  icon?: string
  isNew?: boolean
  popular?: boolean
  description?: string
  calories?: number
}
```

---

## 3. Order Status Machine

```
received
  → accepted
      → preparing
          → ready
              → out_for_delivery  (delivery orders)
                  → delivered
                      → completed
              → ready_for_pickup  (pickup orders)
                  → completed
              → completed         (dine_in / takeaway / POS direct)
  → cancel_requested              (call_center requests, awaiting manager)
      → cancelled                 (manager approves) or back to previous status (manager rejects)
  → cancelled                     (manager can direct-cancel any non-terminal order)
```

**Business rules:**
- `isPaid` is set `true` at order creation for `momo` and `no_charge` payments
- `paymentStatus` becomes `completed` at creation for `momo`/`no_charge`; cash/card remain `pending` until confirmed
- Timestamps written by the status transitions:
  - `accepted` → `acceptedAt`
  - `preparing` → `startedAt`
  - `ready` → `readyAt`
  - `delivered` | `completed` → `completedAt`
- Only `manager` and `super_admin` roles can advance order status
- `call_center` can create orders and request cancellations but cannot advance status
- `branch_partner` is read-only

---

## 4. Service Contracts

The frontend calls these service interfaces. The backend must implement all methods. The factory in each `*.service.ts` file is swapped from `MockXxxService` to `ApiXxxService` in a single line per entity — all frontend code above that layer remains unchanged.

### 4.1 OrderService

```
GET    /api/orders              getAll(filter?)    → Order[]
GET    /api/orders/:id          getById(id)        → Order | null
POST   /api/orders              create(input)      → Order
PATCH  /api/orders/:id/status   updateStatus(id, status, timestamps?) → Order
PATCH  /api/orders/:id          update(id, patch)  → Order
DELETE /api/orders/:id          delete(id)         → void

// Real-time
WebSocket /ws/orders            subscribe(callback) — emits full Order[] on every change
```

**Filter params for `getAll`:**
```
branchId, branchName, staffId, status[], fulfillmentType[], source[],
contactPhone, dateFrom (Unix ms), dateTo (Unix ms), search (text)
```

### 4.2 BranchService

```
GET /api/branches               getAll()                  → Branch[]
GET /api/branches/:id           getById(id)               → Branch | null
GET /api/branches/by-name/:name getByName(name)           → Branch | null
GET /api/branches/:id/menu-items getMenuItemIds(id)       → string[]
GET /api/branches/:id/menu-items/:itemId/available        → boolean
```

### 4.3 ShiftService

```
GET    /api/shifts              getAll()                  → StaffShift[]
GET    /api/shifts/active/:staffId  getActive(staffId)    → StaffShift | null
POST   /api/shifts              startShift(staffId, staffName, branchId, branchName) → StaffShift
PATCH  /api/shifts/:id/end      endShift(id)              → StaffShift
POST   /api/shifts/:id/orders   addOrder(id, orderId, orderTotal) → void
GET    /api/shifts/by-date/:date  getByDate('YYYY-MM-DD') → StaffShift[]
GET    /api/shifts/by-staff/:staffId  getByStaff(staffId) → StaffShift[]
```

### 4.4 PromoService

```
GET    /api/promos              getAll()                  → Promo[]
GET    /api/promos/:id          getById(id)               → Promo | null
POST   /api/promos              create(promo)             → Promo
PATCH  /api/promos/:id          update(id, patch)         → Promo
DELETE /api/promos/:id          delete(id)                → void
POST   /api/promos/resolve      resolvePromo({ itemIds[], branchId, subtotal? }) → Promo | null
```

**Promo resolution logic (currently on client):**
1. Filter by `isActive = true` and current date within `[startDate, endDate]`
2. Filter by scope: `global` promos always included; `branch` promos only if `branchId` in `branchIds`
3. Filter by `appliesTo`: `'items'` promos require at least one cart `itemId` in promo's `itemIds`
4. Filter by order value gates (`minOrderValue`, `maxOrderValue`)
5. Return the promo with the highest resulting discount (backend resolves, client doesn't pick)

**Discount calculation:**
```
if type === 'percentage':
  discount = subtotal × (value / 100)
  if maxDiscount: discount = min(discount, maxDiscount)
else: // fixed_amount
  discount = min(value, subtotal)  // never exceed subtotal
```

### 4.5 StaffService (authentication + HR)

Currently backed by a static array. Authentication is checked against email/phone + password. POS uses a 4-digit PIN.

```
POST /api/auth/staff/login          { identifier, password }  → StaffUser
POST /api/auth/staff/logout         (session token)
POST /api/auth/pos/login            { pin }                    → PosSession
GET  /api/staff                     getAll(filter?)            → StaffMember[]
GET  /api/staff/:id                 getById(id)                → StaffMember | null
POST /api/staff                     create(member)             → StaffMember
PATCH /api/staff/:id                update(id, patch)          → StaffMember
DELETE /api/staff/:id               delete(id)                 → void
GET  /api/staff/by-branch/:branchId getByBranch(branchId)     → StaffMember[]
```

**StaffUser** (session object returned after login):
```typescript
{
  id: string
  name: string
  role: StaffRole
  branch: string    // display name, e.g. "East Legon"
  branchId: string  // system ID, e.g. "2"
}
```

---

## 5. Authentication — Three Independent Systems

### 5.1 Customer Auth
- **Scope:** Public customer site (`/`, `/menu`, `/checkout`, `/orders`)
- **Mechanism:** Self-registration with name + phone number. No password.
- **Storage:** `localStorage` key `cedibites-auth-user`
- **Guest support:** Yes — guests can place orders without an account; order tracking is by order code

### 5.2 Staff Auth
- **Scope:** `/staff/`, `/admin/`, `/partner/` routes
- **Mechanism:** Email or Ghanaian phone number (`0XX XXXX XXXX` or `+233XX...`) + password
- **Session:** Persisted to `localStorage` key `cedibites-staff-session`; survives page refresh
- **Roles and home routes:**

| Role | Home Route | Capabilities |
|---|---|---|
| `super_admin` | `/admin/dashboard` | Full platform access |
| `branch_partner` | `/partner/dashboard` | Read-only, own branch(es) only |
| `manager` | `/staff/manager/dashboard` | Full ops, own branch |
| `call_center` | `/staff/sales/dashboard` | Place orders; request cancellations |
| `kitchen` | — (no portal) | KDS display only |
| `rider` | — (no portal) | No current portal |

### 5.3 POS Session Auth
- **Scope:** `/pos/terminal`, `/pos/orders`
- **Mechanism:** 4-digit PIN lookup against staff list
- **Session:** `sessionStorage` key `pos-session` with 12-hour TTL; clears on tab close
- **Note:** POS sessions are completely independent of staff portal sessions

---

## 6. Real-Time Requirements

Every connected client must see order state changes within ~1 second of the change occurring, without any manual refresh. The frontend uses a two-layer mechanism today; the backend must replace this with a proper push channel.

**What needs to be real-time:**
- New orders appearing on the Kitchen Display System (KDS)
- Order status changes appearing on the Kanban board (staff orders page)
- Rider GPS coordinate updates appearing on customer order tracking map
- New POS orders appearing in the branch's POS orders list

**Expected interface:**
The `OrderService.subscribe(callback: (orders: Order[]) => void): () => void` method must:
1. Connect to a WebSocket (or SSE) channel
2. On any order event, call `callback` with the full current orders array
3. Return an unsubscribe function

All five frontend modules (customer tracking, kitchen, POS orders, staff kanban, admin) share a single `OrderStoreProvider` which holds one subscription. The push channel is subscribed to once per browser tab.

---

## 7. Business Logic Rules

### Pricing
- `subtotal` = Σ (unitPrice × quantity) across all items
- `tax` = subtotal × 0.025 (if not provided by caller, the service defaults it)
- `deliveryFee` = branch-specific flat fee (or 0 for non-delivery)
- `total` = subtotal + deliveryFee + tax − discount
- Discount is capped so `total` never goes below zero

### Order ID Format
- Pattern: `CB` + 6 uppercase alphanumeric characters, e.g. `CB4821F9`
- Generated by the backend on `create`; frontend does not pre-generate IDs

### isPaid / paymentStatus
- `momo` → `isPaid: true`, `paymentStatus: 'completed'`
- `no_charge` → `isPaid: true`, `paymentStatus: 'completed'`
- `cash` → `isPaid: false`, `paymentStatus: 'pending'`
- `card` → `isPaid: false`, `paymentStatus: 'pending'`

### Shift Tracking
- On staff login: `ShiftService.startShift()` is called (skipped for `kitchen` and `rider` roles)
- On staff logout: `ShiftService.endShift()` is called
- When a staff member places an order: `ShiftService.addOrder()` is called with the order's `orderNumber` and `total`
- Shifts are used to compute per-staff sales reports

### Cancel Request Workflow
1. A `call_center` agent sets `status: 'cancel_requested'` on an order and writes `cancelRequestedBy`, `cancelRequestedAt`, `cancelRequestReason`, and `cancelPreviousStatus`
2. A `manager` or `super_admin` either:
   - Approves: advances status to `cancelled`
   - Rejects: restores status to `cancelPreviousStatus`
3. No other role can trigger or resolve a cancel request

---

## 8. Data Storage Keys (current frontend localStorage)

These are what the frontend uses today. The backend replaces them with server-side storage; the frontend's `ApiXxxService` implementations will stop using localStorage.

| Key | Contents | Notes |
|---|---|---|
| `cedibites-orders` | `Order[]` JSON | Primary data store |
| `cedibites-auth-user` | Customer session object | |
| `cedibites-staff-session` | `StaffUser` JSON | Includes `branchId` (added in fix) |
| `cedibites-cart` | Cart items | Customer cart, client-side only |
| `cedibites-recent-searches` | `string[]` | Client-side only, no backend needed |
| `cedibites_menu_config` | Menu overrides | Needs a Menu Config API endpoint |
| `selected-branch-id` | Branch ID string | Client-side preference |
| `location-prompt-shown` | boolean | Client-side only |
| `user-location` | `{ latitude, longitude }` | Client-side only |
| `pos-session` (sessionStorage) | POS session | 12h TTL |
| `cedibites-shifts` (localStorage) | `StaffShift[]` | Shifts data |

---

## 9. Service Swap Instructions

The frontend is structured so that swapping from mock to real API requires changing **one line per entity** in each `*.service.ts` factory file:

```typescript
// lib/services/orders/order.service.ts
export function getOrderService(): OrderService {
    if (!_instance) {
        _instance = new ApiOrderService();  // ← change MockOrderService to this
    }
    return _instance;
}
```

The `ApiOrderService` class must implement the `OrderService` interface exactly. Same pattern for `BranchService`, `ShiftService`, `PromoService`, and `StaffService`.

All frontend modules — `OrderStoreProvider`, `KitchenProvider`, `OrdersProvider` (staff kanban), `POSProvider`, `NewOrderProvider`, checkout page — call the service through the interface only. None of them are aware of whether the underlying implementation is mock or real.

---

## 10. Routes Reference (Frontend)

### Customer
| Route | Description |
|---|---|
| `/` | Landing page with hero search |
| `/menu` | Menu browser (branch-aware) |
| `/checkout` | 2-step checkout (address + payment) |
| `/orders` | All orders for logged-in customer |
| `/orders/[orderCode]` | Live order tracking with map |
| `/order-history` | Full order history |

### Staff Portal
| Route | Visible to |
|---|---|
| `/staff/login` | All staff |
| `/staff/manager/dashboard` | manager, super_admin |
| `/staff/manager/orders` | manager, super_admin |
| `/staff/manager/new-order` | manager, super_admin |
| `/staff/manager/menu` | manager, super_admin |
| `/staff/manager/staff` | manager, super_admin |
| `/staff/manager/analytics` | manager, super_admin |
| `/staff/manager/settings` | manager, super_admin |
| `/staff/sales/dashboard` | call_center |
| `/staff/sales/orders` | call_center |
| `/staff/sales/new-order` | call_center |
| `/staff/my-sales` | All logged-in staff |
| `/staff/my-shifts` | All logged-in staff |
| `/staff/store` | All logged-in staff |

### Admin
| Route | Description |
|---|---|
| `/admin/dashboard` | Platform-wide KPIs |
| `/admin/orders` | All orders, all branches |
| `/admin/staff` | HR and staff management |
| `/admin/branches` | Branch configuration |
| `/admin/menu` | Menu item management |
| `/admin/analytics` | Detailed analytics |
| `/admin/customers` | Customer lookup |
| `/admin/audit` | System audit log |
| `/admin/settings` | Platform settings |

### Partner Portal
| Route | Description |
|---|---|
| `/partner/dashboard` | Branch-scoped overview |
| `/partner/orders` | Branch orders (read-only) |
| `/partner/branch` | Branch details |
| `/partner/staff` | Staff list (read-only) |
| `/partner/analytics` | Branch analytics |

### POS
| Route | Description |
|---|---|
| `/pos` | PIN login |
| `/pos/terminal` | Order entry |
| `/pos/orders` | Today's orders for this branch |

### Kitchen Display
| Route | Description |
|---|---|
| `/kitchen` | Role selection |
| `/kitchen/display` | Read-only order board |
| `/kitchen/control` | Interactive KDS — accept/advance orders |

---

## 11. Known Issues / Tech Debt to Address

1. **Duplicate BRANCHES array** — defined in both `BranchProvider.tsx` and `branch.service.mock.ts`. Consolidate to `lib/data/branches.ts` when backend is ready; both providers import from the single source.

2. **Duplicate currency formatter** — `formatPrice()` in `types/order.ts` and `formatGHS()` in `lib/utils/currency.ts` are identical. Callers use both. Consolidate to `formatGHS`.

3. **Duplicate haversine** — `haversineKm()` in `types/order.ts` and `calculateDistance()` in `lib/utils/distance.ts`. Consolidate to one.

4. **Admin auth** — `/admin/*` routes have no authentication guard in the current demo. Real backend must protect these routes (role = `super_admin` only) via middleware or server-side session check.

5. **Cart tax** — `CartDrawer.tsx` doesn't display tax; tax only appears in the checkout payment step. Decide whether to surface tax earlier or leave it to checkout.

6. **`StaffUser.branchId`** — was added in March 2026 fix. Old sessions in `localStorage` without this field will require the user to log in again.

---

*Generated March 2026 from live frontend codebase. All types and contracts are authoritative.*
