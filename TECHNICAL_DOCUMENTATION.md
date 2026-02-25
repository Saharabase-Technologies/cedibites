# CediBites — Technical Documentation

> Last updated: February 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Provider / State Architecture](#4-provider--state-architecture)
5. [Pages — Customer](#5-pages--customer)
6. [Components — Customer](#6-components--customer)
7. [Data Layer](#7-data-layer)
8. [Utilities](#8-utilities)
9. [Types](#9-types)
10. [Authentication Flow](#10-authentication-flow)
11. [Cart & Branch Switching Logic](#11-cart--branch-switching-logic)
12. [Checkout Flow](#12-checkout-flow)
13. [Order Tracking Flow](#13-order-tracking-flow)
14. [Google Maps Integration](#14-google-maps-integration)
15. [Staff Module](#15-staff-module)
16. [Known Stubs, TODOs & Inconsistencies](#16-known-stubs-todos--inconsistencies)

---

## 1. Project Overview

CediBites is a **multi-branch Ghanaian restaurant ordering web app** built with Next.js. Customers can:

- Browse the full menu (with search, category filtering, and sort)
- Add items to a persistent cart
- Switch between restaurant branches (with automatic cart validation)
- Checkout with delivery or pickup, paying via Mobile Money or cash
- Track their order in real time using a code
- Sign in via phone number + SMS OTP to save their profile

Staff can:

- View an operational dashboard with live order counts
- Create new orders from phone, WhatsApp, Instagram, and Facebook channels
- Manage orders on a Kanban board (desktop) or tab view (mobile) with role-based controls
- Track rider positions in real time (simulated via linear interpolation)
- View their own daily sales analytics

The app is a **client-side SPA** embedded inside the Next.js App Router. All data (menu, branches, orders) is currently served from static TypeScript files — ready to be swapped for real API calls.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1.6 (App Router) |
| UI Library | React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Icons | @phosphor-icons/react v2 |
| Fonts | Cabin & Caprasimo (Google Fonts), ABeeZee (local) |
| Maps | Google Maps JS API + Nominatim (OpenStreetMap) fallback |
| Sound | Web Audio API (synthesised — no asset files) |
| Linting | ESLint 9 with eslint-config-next |
| Package Manager | npm |

### Key Environment Variables

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY   — Required for Maps JS API and Places Autocomplete
```

---

## 3. Project Structure

```
cedibites/
├── app/
│   ├── layout.tsx                    # Root layout — provider tree + fonts
│   ├── page.tsx                      # Home page (/)
│   ├── globals.css                   # Global styles + Tailwind
│   ├── menu/
│   │   └── page.tsx                  # Full menu page (/menu)
│   ├── checkout/
│   │   └── page.tsx                  # Checkout page (/checkout)
│   ├── orders/
│   │   ├── page.tsx                  # Order tracking search (/orders)
│   │   └── [orderCode]/
│   │       └── page.tsx              # Live order tracking (/orders/[code])
│   ├── order-history/
│   │   └── page.tsx                  # Order history (/order-history)
│   ├── menuaudit/
│   │   └── page.tsx                  # Internal branch menu visualizer
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   └── Footer.tsx
│   │   ├── base/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── AddressSearchField.tsx
│   │   │   └── Loader.tsx
│   │   ├── ui/
│   │   │   ├── AuthModal.tsx
│   │   │   ├── BranchSelectorModal.tsx
│   │   │   ├── CartDrawer.tsx
│   │   │   ├── DynamicGreeting.tsx
│   │   │   ├── ItemDetailModal.tsx
│   │   │   ├── LocationBadge.tsx
│   │   │   ├── LocationRequestModal.tsx
│   │   │   ├── MenuGrid.tsx
│   │   │   ├── MenuItemCard.tsx
│   │   │   ├── PromoBanner.tsx
│   │   │   ├── Stepdone.tsx
│   │   │   └── UniversalSearch.tsx
│   │   ├── sections/
│   │   │   └── HeroSearch.tsx
│   │   ├── order/
│   │   │   ├── LiveMap.tsx
│   │   │   ├── OrderDetails.tsx
│   │   │   └── OrderTimeline.tsx
│   │   └── providers/
│   │       ├── AuthProvider.tsx
│   │       ├── BranchProvider.tsx
│   │       ├── CartProvider.tsx
│   │       ├── LocationProvider.tsx
│   │       ├── MenuDiscoveryProvider.tsx
│   │       └── ModalProvider.tsx
│   └── staff/
│       ├── layout.tsx                # Staff shell (sidebar + bottom nav)
│       ├── login/
│       │   └── page.tsx              # Staff login (/staff/login)
│       ├── dashboard/
│       │   └── page.tsx              # Dashboard (/staff/dashboard)
│       ├── new-order/
│       │   ├── page.tsx
│       │   ├── NewOrderFlow.tsx      # 4-step wizard shell
│       │   ├── context.tsx           # Wizard state
│       │   ├── types.ts
│       │   ├── utils.ts
│       │   └── steps/
│       │       ├── StepSetup.tsx     # Step 1 — source, type, branch
│       │       ├── StepCustomer.tsx  # Step 2 — customer details
│       │       ├── StepMenu.tsx      # Step 3 — menu selection
│       │       ├── StepReview.tsx    # Step 4 — review & confirm
│       │       └── OrderConfirmed.tsx
│       ├── orders/
│       │   ├── page.tsx
│       │   ├── OrdersView.tsx        # Kanban + filters shell
│       │   ├── types.ts
│       │   ├── constants.ts          # Columns, STATUS_CONFIG, mock data
│       │   ├── context.tsx           # OrdersProvider (role-based)
│       │   ├── utils.ts
│       │   ├── components/
│       │   │   ├── KanbanColumn.tsx
│       │   │   ├── OrderCard.tsx
│       │   │   ├── OrderDetailPanel.tsx
│       │   │   ├── MobileTabView.tsx
│       │   │   ├── BranchFilter.tsx
│       │   │   ├── DateFilter.tsx
│       │   │   └── ToastStack.tsx
│       │   └── hooks/
│       │       └── useSounds.ts      # Web Audio API chimes
│       ├── my-sales/
│       │   ├── page.tsx
│       │   ├── MySalesView.tsx       # Today's sales analytics
│       │   ├── types.ts
│       │   ├── constants.ts          # Source/status maps, mock data
│       │   ├── utils.ts
│       │   └── components/
│       │       ├── StatCard.tsx
│       │       ├── SourcePills.tsx
│       │       ├── SalesTable.tsx
│       │       ├── SalesRow.tsx
│       │       └── OrderDrawer.tsx
│       └── store/
│           └── page.tsx              # Store/branch management (stub)
├── lib/
│   ├── data/
│   │   ├── SampleMenu.ts             # Menu items, categories, add-ons
│   │   └── HeroSearchCategoryItems.ts # Category pill labels for hero
│   └── utils/
│       └── distance.ts               # Haversine distance + delivery time
├── types/
│   ├── order.ts                      # Customer order types, mock data, timeline builders
│   ├── branch.ts
│   ├── components.ts
│   └── index.ts
├── fonts/
│   ├── ABeeZee-Regular.ttf
│   └── ABeeZee-Italic.ttf
├── public/
│   └── images/
│       ├── cblogo.webp
│       └── menu/                     # Item images (1.webp … 15.webp)
├── next.config.ts
├── tsconfig.json
├── tailwind.config (via postcss.config.mjs)
└── package.json
```

---

## 4. Provider / State Architecture

The app uses React Context for all global state. Providers are nested in `app/layout.tsx` in this order (outermost first):

```
ModalProvider
  AuthProvider
    LocationProvider (autoRequest=false)
      BranchProvider
        MenuDiscoveryProvider (items=sampleMenuItems)
          CartProvider
            <page content>
              LocationRequestModal  (global)
              BranchSelectorModal   (global)
```

Each provider exposes a custom hook for consuming its context.

The **staff module** has its own isolated provider (`OrdersProvider`) that is **not** part of the global tree — it wraps only the orders page.

---

### 4.1 ModalProvider

**File:** `app/components/providers/ModalProvider.tsx`

Centralised controller for all modal/drawer open states. Prevents multiple overlays from being open simultaneously.

| State | Hook method | Notes |
|---|---|---|
| `isCartOpen` | `openCart / closeCart` | Cart drawer |
| `isBranchSelectorOpen` | `openBranchSelector / closeBranchSelector` | Global branch modal |
| `isLocationModalOpen` | `openLocationModal / closeLocationModal` | Location permission modal |
| `isAuthOpen` | `openAuth / closeAuth` | Auth modal — closes all other overlays when opened |

Also manages a **single scroll lock** via `document.body.style.overflow = 'hidden'` whenever any overlay is open.

---

### 4.2 AuthProvider

**File:** `app/components/providers/AuthProvider.tsx`

Handles phone + OTP authentication with localStorage session persistence.

**Auth steps:** `idle` → `phone` → `otp` → `naming` → `done`

**Key API:**

| Method | Description |
|---|---|
| `sendOTP(phone)` | Generates a 6-digit OTP; logs to console in dev; production stub for Africa's Talking / Hubtel SMS |
| `verifyOTP(code)` | Compares against in-memory OTP; routes to `naming` for new users, `done` for returning users |
| `saveProfile(name, phone)` | Persists `AuthUser` to `localStorage` under key `cedibites-auth-user` |
| `saveFromCheckout(name, phone)` | Quick-save after successful order (no OTP needed — trust from checkout) |
| `logout()` | Clears user from state and localStorage |

**Storage key:** `cedibites-auth-user`
**Dev helper:** `devOTP` state is exposed — the `AuthModal` renders it visibly in development mode with an "Auto-fill" button.

---

### 4.3 LocationProvider

**File:** `app/components/providers/LocationProvider.tsx`

Wraps the browser `navigator.geolocation` API.

- On mount: reads a previously stored location from `localStorage` key `user-location`
- `autoRequest` prop (passed as `false` from root layout) controls whether to prompt immediately on mount
- Cached location has no built-in TTL enforcement (stored with a `timestamp` field for future use)
- Permission state: `loading | prompt | granted | denied`
- `requestLocation()` calls `getCurrentPosition` with `enableHighAccuracy: true`, 10s timeout, 5-min cache

---

### 4.4 BranchProvider

**File:** `app/components/providers/BranchProvider.tsx`

Manages the selected branch and all branch-related computations.

**Branch data** is defined inline as `BRANCHES: Branch[]` (exported). 7 branches in Accra:

| ID | Name | Type | Status |
|---|---|---|---|
| 1 | Osu | Flagship (full menu) | Open |
| 2 | East Legon | Flagship | Open |
| 3 | Spintex | Smaller (limited menu) | **Closed** |
| 4 | Tema | Flagship (full menu) | Open |
| 5 | Madina | Traditional focus | Open |
| 6 | La Paz | Medium | Open |
| 7 | Dzorwulu | Flagship (full menu) | Open |

Each branch has a `menuItemIds: string[]` representing which menu item IDs it carries. Flagship branches carry `ALL_ITEMS` (IDs 1–34 — legacy numbering from previous menu schema).

**Key methods:**

| Method | Description |
|---|---|
| `getBranchesWithDistance(lat, lon)` | Returns all branches sorted by distance, with `distance`, `deliveryTime`, `isWithinRadius` attached |
| `findNearestBranch(lat, lon)` | Returns nearest open branch within radius, or nearest open branch if none within radius |
| `selectNearestBranchNow()` | Imperatively selects the nearest branch based on current coordinates |
| `validateCartForBranch` | (delegated to CartProvider) — splits cart into available/unavailable for a given branch |
| `isItemAvailableAtBranch(itemId, branchId)` | Single item availability check |

**Auto-selection:** When `coordinates` change by more than 0.5 km, the nearest branch is re-computed and auto-selected if it differs from the current selection.

**Persistence:** Selected branch ID is stored in `localStorage` under key `selected-branch-id`.

---

### 4.5 MenuDiscoveryProvider

**File:** `app/components/providers/MenuDiscoveryProvider.tsx`

Provides synchronous menu filtering for search and category selection.

- Accepts `items: SearchableItem[]` as a prop (passed `sampleMenuItems` from the root layout)
- `filteredItems` is a `useMemo` that applies both category filter and text search
- Searching clears the active category
- `selectedCategory === 'Most Popular'` filters `item.popular === true`
- `recentSearches` (max 8) are persisted to `localStorage` key `cedibites-recent-searches`

---

### 4.6 CartProvider

**File:** `app/components/providers/CartProvider.tsx`

Shopping cart with localStorage hydration.

**Cart item ID:** Composite key `${itemId}__${sizeKey}` — allows the same item in different sizes to be separate cart entries.

**Key API:**

| Method | Description |
|---|---|
| `addToCart(item, sizeKey)` | Adds item or increments quantity if already present |
| `removeFromCart(cartItemId)` | Removes entry entirely |
| `updateQuantity(cartItemId, qty)` | Sets qty; removes if qty ≤ 0 |
| `clearCart()` | Empties cart and removes from localStorage |
| `removeUnavailableItems(ids[])` | Batch removal used during branch switching |
| `validateCartForBranch(branchMenuItemIds)` | Returns `{ available, unavailable }` split |
| `isInCart(itemId, sizeKey)` | Boolean check |
| `getCartItem(itemId, sizeKey)` | Returns full CartItem or undefined |

**Derived values:** `totalItems` (sum of quantities), `subtotal` (sum of price × quantity).
**Storage key:** `cedibites-cart`

---

## 5. Pages — Customer

### 5.1 Home Page — `/`

**File:** `app/page.tsx`

Renders:
- `Navbar`
- `HeroSearch` — greeting card + promo banner + search + category pills
- `MenuGrid` — default "CediBites Mix" or filtered results
- `Footer`

### 5.2 Full Menu Page — `/menu`

**File:** `app/menu/page.tsx`

Features:
- **Sticky top bar** with search input, branch pill, sort dropdown, grid/list toggle, and mobile filter toggle
- **Desktop sidebar** with category list and branch info card (open/closed status, operating hours, "Change branch" link)
- **Mobile category strip** (shown via toggle) — horizontal scroll
- **Sort options:** Featured, Most Popular, Price Low→High, Price High→Low
- **View modes:** Grid (default) and List
- **Grouped grid:** When "All" selected with no search, items are grouped by category with section headers
- **Back-to-top button:** Appears after scrolling 600px

Sub-components (defined locally):
- `SortDropdown` — click-outside-aware dropdown
- `BranchPill` — shows selected branch name and distance, opens branch selector
- `EmptyState` — no-results message
- `ListItemRow` — single item in list view
- `SidebarCategoryBtn` — sidebar category button with count
- `GroupedGrid` — groups cards by category
- `BranchInfoCard` — sidebar branch status card

### 5.3 Checkout Page — `/checkout`

**File:** `app/checkout/page.tsx`

Three-step checkout flow:

| Step | Component | Description |
|---|---|---|
| 1 | `StepDetails` | Order type (delivery/pickup), branch selection, name, phone, delivery address |
| 2 | `StepPayment` | Payment method selection (MoMo, cash on delivery, cash at pickup), MoMo phone + network |
| 3 | `StepDone` | Order confirmed screen with order number, ETA, and "Save info" prompt |

**Guard:** If cart is empty and not on step 3, renders `EmptyCartGuard`.

**Order number generation:** `CB${Date.now().toString().slice(-6)}` — a 8-character code like `CB847291`.

**Inline `BranchSelectorSheet`:** A self-contained bottom sheet / centred modal for changing branches during checkout (separate from the global `BranchSelectorModal`). Handles cart conflict resolution inline.

**`AddressSearchField`:** Delivery address input with:
- Google Places Autocomplete (if `window.google.maps.places` is available)
- Nominatim (OpenStreetMap) fallback for address search
- "Use my current location" reverse-geocoding via Nominatim
- 300ms debounce on input

**Post-order save prompt:** On step 3, if the user is not logged in, a card offers to save their name/phone to localStorage for future fast checkout.

### 5.4 Order Tracking Search — `/orders`

**File:** `app/orders/page.tsx`

Simple search page accepting an 8-character order code matching pattern `CB\d{6}`. Validates format before navigating to `/orders/[orderCode]`. Includes:
- "Try example: CB847291" helper link
- "How to find your order code" guidance card
- "Track every step" status explainer
- Support phone number

### 5.5 Live Order Tracking — `/orders/[orderCode]`

**File:** `app/orders/[orderCode]/page.tsx`

Dynamic route. On mount, fetches mock order via `getMockOrder(orderCode)`. Layout:

**Left column (2/3 width on desktop):**
- Live status banner (when `out_for_delivery`)
- `LiveMap` — Google Maps with branch, customer, and rider markers (delivery orders only)
- `OrderDetails` — collapsible order items + pricing breakdown

**Right column (1/3 width):**
- `OrderTimeline` — step-by-step order status
- Delivery address card
- Contact card (call branch; call rider when out for delivery)
- Branch info card

**Share button:** Uses `navigator.share` Web Share API if available.

**Back navigation:** Reads `?from=order-history` query param to decide whether to navigate to `/order-history` or `/orders` on back press.

**WebSocket stub:** A commented-out WebSocket block shows where real-time updates would be wired in production.

### 5.6 Order History — `/order-history`

**File:** `app/order-history/page.tsx`

- Loads orders from `getMockOrdersForUser()` (mock, same data for all users)
- Guest notice with "Sign in" prompt (uses `openAuth()`)
- Search by order number, item name, or branch name
- Each order card links to `/orders/[orderCode]?from=order-history`
- "Reorder" button on completed/delivered orders (navigates to `/` — actual re-add to cart is a TODO)

### 5.7 Menu Audit — `/menuaudit`

**File:** `app/menuaudit/page.tsx`

Internal developer/admin tool for visualising menu coverage across branches. **Not linked from the public UI.**

Features:
- Branch tabs with item count
- Stats row: available items, unavailable items, coverage %, open/closed status
- Coverage progress bar
- **Cards view:** Item cards with availability badge, category filter, "show unavailable only" toggle
- **Matrix view:** Cross-tab of all items vs all branches with ✓/· availability cells

---

## 6. Components — Customer

### 6.1 Navbar

**File:** `app/components/layout/Navbar.tsx`

Fixed top navbar. Two visual rows (brown accent bar + dark main bar).

**Desktop:** Logo + nav links (Home, Our Menu, Track Order) + cart button + user avatar/button.

**Mobile:** Logo + cart button + hamburger → slide-in right drawer containing account section, nav links, current branch, and quick actions (view cart).

Active link detection uses exact path match + `matchPrefixes` for the orders section.

User avatar shows initials when logged in; dropdown menu provides "My Orders" and "Sign Out". Guest shows a user icon that opens the auth modal.

Renders `<CartDrawer />` and `<AuthModal />` (these are mounted here so they're always present in the DOM).

### 6.2 Footer

**File:** `app/components/layout/Footer.tsx`

Four-column desktop grid (hidden on mobile), containing:
- Brand + social links (Instagram, Facebook, WhatsApp — placeholder `#` hrefs)
- Opening hours
- Branch list (Osu, East Legon, Spintex, Madina, Tema)
- Contact details + quick links

Copyright and "Built by Saharabasetech" credit in bottom bar.

### 6.3 CartDrawer

**File:** `app/components/ui/CartDrawer.tsx`

Right-side slide-in panel on desktop, bottom sheet on mobile (`max-h-[92dvh]`).

Three internal views controlled by local `DrawerView` state:

| View | Content |
|---|---|
| `cart` | Cart items, branch pill (shows ordering branch), subtotal/delivery/tax/total, checkout CTA |
| `branch-select` | Branch list sorted by distance |
| `branch-conflict` | Warning + unavailable/available item split + 3 action buttons |

**Branch conflict resolution:**
1. User selects a new branch
2. `validateCartForBranch` splits cart items
3. If conflicts exist → show conflict view
4. Options: "Remove X items & Switch" / "Keep current branch" / "Pick a different branch"

Closes on Escape key or backdrop click.

### 6.4 MenuItemCard

**File:** `app/components/ui/MenuItemCard.tsx`

Grid card for a menu item. Handles:
- Image with fallback to empty placeholder on error
- "Popular" (fire icon) and "New" (star icon) badges
- Category badge (bottom-right of image)
- **Variant pills** (Plain/Assorted) — stops click propagation to prevent opening detail modal
- **Size pills** — same stop-propagation
- Add/Remove toggle button (green → red on hover when in cart)
- Clicking the card body calls `onOpenDetail(item)`

### 6.5 ItemDetailModal

**File:** `app/components/ui/ItemDetailModal.tsx`

Bottom sheet on mobile, centred modal on `sm+`. Animated slide-up via `requestAnimationFrame` + CSS transform.

Features:
- 16:9 hero image with gradient overlay
- Variant selector cards (with per-variant cart quantity badges)
- Size selector cards (with per-size cart quantity badges)
- Quantity counter (inline +/−) when item already in cart
- "Add to Cart" CTA when not in cart
- Live running price (qty × unit price shown above total)
- Closes on Escape or backdrop click

### 6.6 AuthModal

**File:** `app/components/ui/AuthModal.tsx`

Phone OTP authentication modal. Bottom sheet on mobile, centred modal on desktop.

Steps rendered as separate sub-components:

| Sub-component | Renders |
|---|---|
| `StepPhone` | Ghana (+233) flag prefix + phone input; validates ≥ 9 digits |
| `StepOTP` | `OTPInput` (6 individual boxes, paste-aware); resend with 30s cooldown; dev OTP auto-fill banner |
| `StepName` | Name input with "Skip for now" (saves as "Guest") |
| `StepDoneWelcome` | Success screen; auto-closes after 2.2s; animated progress bar |

`OTPInput` features: individual input boxes, auto-advance on digit entry, backspace-to-previous, paste support.

Resets to `phone` step when re-opened (unless user is already logged in).

### 6.7 BranchSelectorModal

**File:** `app/components/ui/BranchSelectorModal.tsx`

Global bottom sheet / centred modal for branch selection. Triggered by `ModalProvider.openBranchSelector()`.

Shows all branches sorted by distance. Closed branches are disabled. Selecting a branch with cart items triggers the conflict flow (same as CartDrawer).

### 6.8 LocationRequestModal

**File:** `app/components/ui/LocationRequestModal.tsx`

Prompt shown to request browser geolocation permission. Displayed globally.

### 6.9 HeroSearch

**File:** `app/components/sections/HeroSearch.tsx`

Row 1: `DynamicGreeting` card (left, fixed width) + `PromoBanner` (right, flex-1).
Row 2: `UniversalSearch` + category quick-filter pill row (powered by `HeroSearchCategoryItems`).

### 6.10 DynamicGreeting

**File:** `app/components/ui/DynamicGreeting.tsx`

Gradient card (amber/gold) with diagonal line pattern overlay and glow blob. Shows time-based greeting (Morning/Afternoon/Evening), `LocationBadge` with current branch and distance, and an open/closed badge for the selected branch.

### 6.11 MenuGrid

**File:** `app/components/ui/MenuGrid.tsx`

Home page grid component. Three display modes:

1. **Default (no search, no category):** Shows "CediBites Mix" — a curated selection defined by `MIX_CONFIG`:
   - 2 × Basic Meals (most popular first)
   - 2 × Combos
   - 2 × Budget Bowls
   - 1 × Top Ups
   - 1 × Drinks

2. **Most Popular category:** Shows all items with `popular: true`

3. **Search or other category:** Shows `filteredItems` from `MenuDiscoveryProvider`

### 6.12 UniversalSearch

**File:** `app/components/ui/UniversalSearch.tsx`

Search input connected to `MenuDiscoveryProvider.setSearchQuery`. Includes search-results dropdown with recent searches and live filtered suggestions.

### 6.13 Order Components

**`OrderTimeline`** (`app/components/order/OrderTimeline.tsx`)
Renders a vertical timeline. Each event shows a circle icon (filled = done/active, empty dot = pending), label, timestamp (if available), and description. Active step has a pulsing dot and "Current Status" label.

**`OrderDetails`** (`app/components/order/OrderDetails.tsx`)
Collapsible card showing order items (with images/icons), subtotal, delivery fee, tax, total, and payment method label + paid badge.

**`LiveMap`** (`app/components/order/LiveMap.tsx`)
Google Maps instance with three markers:
- Branch (orange circle, `#e49925`)
- Customer location (green circle, `#6c833f`)
- Rider (orange circle, larger, with BOUNCE animation that stops after 2s)

`fitBounds` is called to frame all visible markers. Shows graceful error state if `window.google` is unavailable. Map options hide POI labels, street view, and map type controls.

---

## 7. Data Layer

### 7.1 Menu Data

**File:** `lib/data/SampleMenu.ts`

**Current menu (19 items):**

| Category | Items |
|---|---|
| Basic Meals | Fried Rice with Chicken Drumsticks (plain/assorted variants), Jollof Rice with Chicken Drumsticks (plain/assorted), Assorted Noodles, Banku with Tilapia |
| Budget Bowls | Jollof Bowl, Fried Rice Bowl, Assorted Jollof Bowl, Assorted Fried Rice Bowl, Assorted Noodles Bowl (all in Small/Large sizes) |
| Combos | Banku × Grilled Tilapia, Street Budget (FR/Jollof + 3 drums), Street Budget (Assorted + 3 drums), Big Budget (FR/Jollof + 5 drums), Big Budget (Assorted + 5 drums) |
| Top Ups | Rotisserie Full (GHS 300), Half (GHS 160), Quarter (GHS 90), Chicken Basket 10pc (GHS 110), Chicken Basket 15pc (GHS 150) |
| Drinks | Sobolo (350ml/500ml), Asaana (350ml/500ml), Pineapple Ginger Juice (350ml/500ml), Bottled Water (500ml/1L) |

**Pricing model:**
Items use one of three patterns:
1. `price: number` — single flat price
2. `sizes: MenuItemSize[]` — size-keyed prices
3. `hasVariants: true, variants: { plain, assorted }` — variant-keyed prices

**Note:** The `BranchProvider` still uses legacy integer IDs (`'1'`–`'34'`) for `menuItemIds`. The `SampleMenu` now uses string slug IDs (`'fried-rice'`, `'jollof'`, etc.). This is a known discrepancy — see [Known Stubs, TODOs & Inconsistencies](#16-known-stubs-todos--inconsistencies).

### 7.2 Hero Category Items

**File:** `lib/data/HeroSearchCategoryItems.ts`

Simple array of `{ id, label }` objects for the home page category pill strip: Most Popular, Basic Meals, Budget Bowls, Combos, Top Ups, Drinks.

### 7.3 Order Mock Data (Customer)

**File:** `types/order.ts`

4 mock orders used for `/orders/[orderCode]` and `/order-history`:

| Order # | Status | Type | Payment |
|---|---|---|---|
| CB847291 | out_for_delivery | delivery | MoMo (paid) |
| CB391045 | delivered | delivery | cash |
| CB204837 | completed | pickup | cash |
| CB173920 | completed | delivery | MoMo (paid) |

Timelines are auto-generated by `buildDeliveryTimeline` / `buildPickupTimeline` based on order status and `placedAt` timestamp.

### 7.4 Staff Orders Mock Data

**File:** `app/staff/orders/constants.ts`

8 mock `StaffOrder` objects seeded into `OrdersProvider` on mount:

| Order # | Status | Type | Branch |
|---|---|---|---|
| CB847291 | received | delivery | East Legon |
| CB391045 | received | pickup | Osu |
| CB204837 | preparing | delivery | Tema |
| CB173920 | preparing | delivery | Madina |
| CB998812 | ready | delivery | East Legon |
| CB774433 | out_for_delivery | delivery | Osu (rider halfway) |
| CB556677 | ready_for_pickup | pickup | La Paz |
| CB112233 | delivered | delivery | Dzorwulu |

Note: Order IDs overlap with the customer-facing mock orders in `types/order.ts` but data fields differ. These are independent systems at this point.

### 7.5 My Sales Mock Data

**File:** `app/staff/my-sales/constants.ts`

8 mock `SalesOrder` objects for today's view. Includes richer fields than `StaffOrder`: `discount`, `promoCode`, `deliveryFee`, `tax`, `subtotal`, `gpsCoords`, `allergyFlags`, `staffNotes`, `estimatedMinutes`.

---

## 8. Utilities

### `lib/utils/distance.ts`

| Function | Description |
|---|---|
| `calculateDistance(lat1, lon1, lat2, lon2)` | Haversine formula, returns distance in km (1 decimal place) |
| `formatDistance(km)` | Returns `"350m"` under 1km, `"1.5km"` above |
| `estimateDeliveryTime(km)` | `baseTime=15min` + `travelTime=(km/30)*60min` → returns `"N-N+10 mins"` |

### `app/staff/orders/utils.ts`

| Function | Description |
|---|---|
| `timeAgo(date)` | Returns `{ label, urgent }` — urgent=true if > 20 min old |
| `formatGHS(n)` | `"GHS 45.00"` |
| `getNextStatuses(order)` | Returns valid next-state transitions for a given order (branches on `order.type` at the `ready` step) |
| `canAdvanceOrder(role, order, targetStatus)` | Role-based permission gate: kitchen handles received→preparing→ready; sales handles ready→dispatch→completion |
| `haversineKm(a, b)` | Distance between two lat/lng points in km |
| `isDoneStatus(status)` | True for `delivered`, `completed`, `cancelled` |

### `app/staff/my-sales/utils.ts`

| Function | Description |
|---|---|
| `formatGHS(n)` | Same as orders utils — duplicated |
| `formatTime(d)` | Locale time string for Ghana (`en-GH`) |
| `formatDate(d)` | Full locale date string (`weekday, day month year`) |
| `itemCount(order)` | Sum of `qty` across all items in a `SalesOrder` |

---

## 9. Types

### `types/order.ts` (Customer)

```typescript
OrderStatus  = 'received' | 'preparing' | 'ready' | 'out_for_delivery' |
               'delivered' | 'ready_for_pickup' | 'completed' | 'cancelled'
OrderSource  = 'online' | 'phone' | 'whatsapp' | 'instagram' | 'facebook' | 'pos'
OrderType    = 'delivery' | 'pickup'
PaymentMethod = 'momo' | 'cash_delivery' | 'cash_pickup'
```

`STATUS_CONFIG` — maps each status to display label, CSS color class, and background class.
`PAY_LABEL` — maps payment method to human label.
`timeAgo(ts)` — relative time string (e.g. "22m ago", "Yesterday").
`formatTime(ts)` — locale time string for Ghana (`en-GH`).
`staticMapUrl(lat, lng)` — generates Google Static Maps URL.
`directionsUrl(lat, lng)` — Google Maps directions deep link.

### `app/staff/orders/types.ts` (Staff Orders)

```typescript
UserRole     = 'sales' | 'kitchen'
OrderStatus  = same 8 values as customer
OrderSource  = 'online' | 'phone' | 'whatsapp' | 'instagram' | 'facebook' | 'pos'
OrderType    = 'delivery' | 'pickup'
PaymentMethod = 'momo' | 'cash_delivery' | 'cash_pickup'

StaffOrder {
  id, status, source, type, branch,
  customer: { name, phone },
  items: { name, quantity, price }[],   // ← note: 'quantity' and 'price'
  total, payment, notes?, placedAt,
  address?, kitchenConfirmed?,
  coords?: { branch, customer, rider? }
}

OrderNotification { id, type, title, message, orderId?, createdAt }
KanbanColumn { id, label, statuses, dot, nextStatus, nextLabel, color }
```

### `app/staff/my-sales/types.ts` (Sales Analytics)

```typescript
SalesOrder {
  id, status, source, branch, fulfillment,
  customer: { name, phone },
  items: { name, qty, unitPrice }[],    // ← note: 'qty' and 'unitPrice' (different from StaffOrder)
  subtotal, discount, promoCode?,
  deliveryFee, tax, total, payment,
  deliveryAddress?, gpsCoords?,
  estimatedMinutes?, customerNotes?,
  allergyFlags?, staffNotes?,
  placedAt
}
```

### `app/staff/new-order/types.ts` (New Order Wizard)

```typescript
OrderSource  = 'phone' | 'whatsapp' | 'instagram' | 'facebook'  // ← subset: no 'online' or 'pos'
OrderType    = 'delivery' | 'pickup'
PaymentMethod = 'momo' | 'cash_delivery' | 'cash_pickup'

StaffCartItem { cartKey, id, name, variantLabel?, price, quantity, category }
CustomerDetails { name, phone, email, address, notes }
```

---

## 10. Authentication Flow

```
User clicks "Sign In"
  → ModalProvider.openAuth()
  → AuthModal opens
  → AuthProvider.authStep = 'phone'

[Step 1 — Phone]
  User enters phone number (Ghana +233 prefix auto-prepended)
  → AuthProvider.sendOTP(phone)
    → generates 6-digit OTP in memory
    → DEV: logs to console, exposes via devOTP state
    → PROD: stub comment shows Africa's Talking / Hubtel integration point
  → authStep = 'otp'

[Step 2 — OTP]
  User enters 6-digit code (6 individual input boxes)
  Auto-submits when all 6 digits filled
  → AuthProvider.verifyOTP(code)
    → if code matches generatedOTP:
        if existing user with same phone in localStorage → authStep = 'done'
        else → authStep = 'naming'
    → if code wrong → error shown, inputs cleared

[Step 3 — Name (new users only)]
  User enters name (can skip → saved as "Guest")
  → AuthProvider.saveProfile(name, phone)
  → authStep = 'done'

[Step 4 — Welcome]
  Auto-closes after 2.2s

Session stored as JSON in localStorage key: cedibites-auth-user
  { name, phone, savedAddresses, createdAt }
```

---

## 11. Cart & Branch Switching Logic

When a user selects a new branch (from CartDrawer, BranchSelectorModal, or checkout inline sheet):

```
1. Is new branch same as current?  → close, no-op

2. Is cart empty?  → switch immediately

3. validateCartForBranch(newBranch.menuItemIds)
   → splits cart into { available[], unavailable[] }

4. No conflicts?  → switch immediately

5. Conflicts exist?  → show conflict view:
   - List of unavailable items (red)
   - List of still-available items (green)
   - Options:
     a. "Remove N items & Switch" → removeUnavailableItems() → setSelectedBranch()
     b. "Keep [current] Branch" → cancel
     c. "Pick a different branch" → back to branch list
```

---

## 12. Checkout Flow

```
EmptyCartGuard check → redirect to "cart empty" screen if no items

Step 1 — Details
  - Choose Delivery or Pickup
  - Shows branch being delivered from / pickup location
  - Full Name (required)
  - Phone Number (required)
  - Delivery Address (required for delivery) — Google Places / Nominatim search
  - Note to rider (optional)
  - → "Continue to Payment" (disabled until name + phone + address filled)

Step 2 — Payment
  - Shows delivery summary (address or pickup branch) with edit link
  - Payment method selection:
    - Mobile Money (MoMo): MTN / Telecel / AirtelTigo + phone number
    - Cash on Delivery (delivery orders only)
    - Cash at Pickup (pickup orders only)
  - → "Place Order" / "Pay & Place Order"
    → 1800ms simulated processing
    → generates order code: CB + last 6 digits of Date.now()
    → clears cart
    → goes to step 3

Step 3 — Confirmed
  - Order number, ETA, delivery destination
  - "Confirmation SMS sent to [phone]" notice
  - If not logged in: "Save info for next time?" prompt
    → saveFromCheckout(name, phone) → localStorage
  - CTAs: "Track My Order" → /orders | "Back to Menu" → /
```

---

## 13. Order Tracking Flow

```
/orders  →  user enters 8-char order code (CB######)
  → validates format with /^CB\d{6}$/
  → navigates to /orders/[code]

/orders/[code]
  → getMockOrder(code) lookup
  → if not found: "Order Not Found" screen

  If found:
  - Header: order number, placed time, share button
  - Left column:
    - Live Status banner (delivery + out_for_delivery status only)
    - LiveMap (delivery orders only)
    - OrderDetails (collapsible items + pricing)
  - Right column:
    - OrderTimeline (status steps with timestamps)
    - Delivery address
    - Call Branch / Call Rider contacts
    - Branch info
```

---

## 14. Google Maps Integration

The Google Maps JS API script is loaded in `app/layout.tsx` via `<Script strategy="beforeInteractive">` with the `places` library:

```
https://maps.googleapis.com/maps/api/js?key=...&libraries=places
```

### Usage Points

| Component | Usage |
|---|---|
| `LiveMap` (customer) | Full interactive map with branch/customer/rider markers |
| `OrderDetailPanel` (staff) | Embedded map for delivery orders with branch/customer/rider markers |
| `AddressSearchField` (checkout) | `google.maps.places.AutocompleteService` for delivery address autocomplete; Nominatim as fallback |

### Fallback
If `window.google` is not available, `AddressSearchField` falls back to the Nominatim API (`nominatim.openstreetmap.org`) with Ghana-biased bounding box. `LiveMap` shows a "Map Not Available" error state.

---

## 15. Staff Module

The staff module lives entirely under `app/staff/` and is isolated from the customer-facing provider tree.

### 15.1 Staff Shell — `app/staff/layout.tsx`

Wraps all staff pages except `/staff/login`. Skips rendering if `pathname === '/staff/login'`.

**Desktop:** Fixed left sidebar (width 224px) with logo, nav links, and a staff identity block + sign-out button.

**Mobile:** Sticky top bar (logo + staff first name) + fixed bottom navigation bar.

**Navigation items:**

| Route | Label | Icon |
|---|---|---|
| `/staff/dashboard` | Dashboard | SquaresFour |
| `/staff/new-order` | New Order | PlusCircle |
| `/staff/orders` | Orders | List |
| `/staff/my-sales` | My Sales | Receipt |

Active detection uses `pathname.startsWith(item.href)`.

**Staff identity:** Hardcoded as `{ name: 'Kofi Mensah', role: 'Sales Staff', branch: 'East Legon' }` — auth context stub. Replace with real auth when implemented.

**Sign Out:** Navigates to `/staff/login` via `window.location.href` — no session clearing logic yet.

---

### 15.2 Staff Dashboard — `/staff/dashboard`

**File:** `app/staff/dashboard/page.tsx`

A summary overview page with three sections:

**Stats row (3 cards):**
- Received: 3 (mock)
- Delivering: 2 (mock)
- Orders Today: 12 (mock)

**Primary CTA:** "Create New Order" → `/staff/new-order`

**Active Orders list:** Shows recent orders (excluding `completed`) with customer name, source badge, order ID, branch, time, and status badge. Each row links to `/staff/orders/${order.id}`.

> ⚠️ **INCONSISTENCY**: The link `/staff/orders/${order.id}` does not exist as a route — there is no dynamic segment `[id]` under `/staff/orders/`. These links will 404. The intended target is likely a detail panel on the `/staff/orders` page, not a separate route.

> ⚠️ **INCONSISTENCY**: Dashboard mock data references `Airport` and `Labone` as branches — these do not exist in `BranchProvider` or `BRANCH_COORDS`. They should be replaced with actual branches: Osu, East Legon, Tema, Madina, La Paz, Dzorwulu.

> ⚠️ **INCONSISTENCY**: Dashboard defines its own inline `STATUS_CONFIG` where `ready` maps to `bg-secondary`. The `orders/constants.ts` module maps `ready` to `bg-warning`. These should be unified.

---

### 15.3 Staff New Order — `/staff/new-order`

**File:** `app/staff/new-order/NewOrderFlow.tsx` + `context.tsx`

A 4-step wizard for staff to place orders received via phone or social channels.

**Steps:**

| # | Component | Description |
|---|---|---|
| 1 | `StepSetup` | Select source (phone/WhatsApp/Instagram/Facebook), order type (delivery/pickup), and branch |
| 2 | `StepCustomer` | Customer name, phone, email, delivery address (delivery only), and notes |
| 3 | `StepMenu` | Browse and add items from the menu to a staff-managed cart |
| 4 | `StepReview` | Review all details before submitting |
| — | `OrderConfirmed` | Success screen with generated order code |

**State:** Managed by `NewOrderContext` (`context.tsx`). Holds `currentStep`, `source`, `orderType`, `branch`, `customerDetails`, `cartItems`.

**Cart key:** Composite `${itemId}|${variantKey}` — allows multiple variants of the same item simultaneously.

**Payment methods:** `momo | cash_delivery | cash_pickup` (same set as customer checkout).

**`OrderSource` supported in new-order:** `phone | whatsapp | instagram | facebook` — note `online` and `pos` are absent (see inconsistency note in section 16).

---

### 15.4 Staff Orders — `/staff/orders`

**File:** `app/staff/orders/OrdersView.tsx` + `context.tsx`

The primary real-time order management view. Wraps in `OrdersProvider` which accepts a `role` prop (`'sales'` | `'kitchen'`).

#### OrdersProvider (`context.tsx`)

All order state and logic lives here.

**Key state:**

| State | Description |
|---|---|
| `orders` | Full `StaffOrder[]` list (seeded from `MOCK_ORDERS`) |
| `filteredOrders` | Derived via `useMemo` — applies showCancelled, branchFilter, dateRange, search |
| `userRole` | `'sales'` \| `'kitchen'` — controls which advance actions are allowed |
| `selectedOrder` | Currently selected order for detail panel |
| `draggingId` | ID of card being dragged (for drop-target highlight) |
| `soundEnabled` | Boolean — gates all `useSounds` calls |
| `notifications` | Stack of `OrderNotification[]` (max 6, auto-dismiss 5s) |

**Filtering logic:**
1. Exclude cancelled (unless `showCancelled`)
2. Filter by branch (if not `'All'`)
3. Filter by date range (inclusive `placedAt` window)
4. Filter by search query against `customer.name`, `customer.phone`, `order.id`

**`handleAdvance(id, status)`:**
- Checks `canAdvanceOrder(role, order, status)` permission gate
- At `out_for_delivery` / `ready_for_pickup`: triggers SMS notification stub + starts rider simulation (delivery orders)
- At `delivered` / `completed`: fires success notification + sound
- Otherwise: plays `advance` sound
- Mutates `orders` and `selectedOrder` arrays (stub for `PATCH /api/v1/staff/orders/:id/status`)

**Rider simulation:**
- Triggered when an order advances to `out_for_delivery` with coords
- Runs a `setInterval` every 5 seconds for 36 steps (~3 minutes total)
- Linearly interpolates rider position from `branch.coords` → `customer.coords`
- Automatically clears when `t >= 1` or order status changes away from `out_for_delivery`
- Also starts on mount for any orders already `out_for_delivery`

**Kitchen simulation (`simulateNewOrder`):**
- Creates a random `StaffOrder` with `status: 'received'`
- +30s: sets `kitchenConfirmed: true`, fires kitchen notification
- +90s: advances status to `preparing`, fires kitchen notification
- +120s: advances status to `ready`, fires success notification
- All timers tracked in `simTimers` ref and cleaned up on unmount

**Sound system (`useSounds.ts`):**
All sounds synthesised via Web Audio API — no audio files, zero latency. Uses a shared `AudioContext` (created lazily on first use, resumed if suspended).

| Sound | Trigger | Description |
|---|---|---|
| `newOrder` | New simulated order | 4-note A-major arpeggio wind chime |
| `advance` | Status moved forward | Two ascending bell tones (E5→A5) |
| `complete` | Delivered / completed | 4-note C-major chime |
| `pickup` | Drag card picked up | Barely-there soft tap |
| `drop` | Card dropped on column | Gentle double chime (G5→B5) |
| `error` | Permission denied | Soft descending two-tone |
| `notification` | SMS / info notification | Clean G5→C6 bell interval |

#### Kanban View (desktop)

5 columns defined in `COLUMNS` (`constants.ts`):

| Column ID | Label | Statuses | Accent Color |
|---|---|---|---|
| `received` | Received | `received` | neutral-gray |
| `preparing` | Preparing | `preparing` | primary |
| `ready` | Ready | `ready` | warning |
| `en_route` | En Route | `out_for_delivery`, `ready_for_pickup` | info |
| `done` | Done | `delivered`, `completed` | secondary |

Each column supports HTML drag-and-drop. Cards can be dragged between columns; dropping fires `handleAdvance` with the target column's first valid status.

#### Mobile Tab View

**File:** `app/staff/orders/components/MobileTabView.tsx`

Shows one Kanban column at a time via a horizontal tab strip. Same card components, same advance buttons.

#### OrderCard (`components/OrderCard.tsx`)

Compact card showing: source icon, type badge (delivery/pickup), order ID, customer name, time ago (urgent highlight if >20 min), item count + total, payment badge, and advance button (role-gated).

Draggable: `draggable` attribute + `onDragStart`/`onDragEnd` handlers.

#### OrderDetailPanel (`components/OrderDetailPanel.tsx`)

Full-width slide-in panel (or bottom sheet on mobile) for the selected order. Shows:
- Customer name, phone, order type, source
- Status badge + advance action button
- Embedded `LiveMap` (delivery orders with coords)
- Item list + pricing
- Notes, kitchen confirmed badge, address, payment

Closes on Escape key or close button.

#### ToastStack (`components/ToastStack.tsx`)

Fixed top-right stack of up to 6 toast notifications. Each toast has:
- Type icon (info=Bell, success=CheckCircle, warning=WarningCircle, kitchen=ForkKnife)
- Left accent border colour per type
- Title, message, dismiss button
- Slide-in animation via inline keyframe (`toastIn`)
- Auto-dismissed after 5s (timer set in `OrdersProvider`)

#### Filters

**`BranchFilter`** (`components/BranchFilter.tsx`) — Dropdown select from branches derived from current orders list.

**`DateFilter`** (`components/DateFilter.tsx`) — Date range picker returning `{ from: Date, to: Date }` (`DateRange` type). Used by `OrdersProvider.filteredOrders`.

---

### 15.5 My Sales — `/staff/my-sales`

**File:** `app/staff/my-sales/MySalesView.tsx`

A read-only analytics view showing orders the authenticated staff member placed today. (Currently shows the same `MY_SALES_TODAY` mock data for all users — no auth filter implemented.)

**Header:** Page title + date + "Today only · 24-hour view" warning badge.

**Stats row (4 cards via `StatCard`):**

| Stat | Calculation |
|---|---|
| Orders Placed | `activeOrders.length` (excl. cancelled) |
| Revenue Generated | `sum(order.total)` over active orders |
| Items Sold | `sum(itemCount(order))` over active orders |
| Avg. Order Value | `totalRevenue / activeOrders.length` |

**Source breakdown:** `SourcePills` component shows a horizontal pill row with source label, icon, and count — sorted by frequency.

**Sales table (`SalesTable`):** Scrollable table with columns: Time, Order #, Customer, Source, Fulfillment, Items, Total, Payment, Status. Clicking a row selects it.

**Order drawer (`OrderDrawer`):** Right-side slide-in panel with full `SalesOrder` detail: customer info, item breakdown with line totals, subtotal/discount/delivery/tax/total, allergy flags, notes, GPS coords, estimated ETA.

**`SalesOrder` shape** includes richer fields than `StaffOrder` — see types section above.

---

## 16. Known Stubs, TODOs & Inconsistencies

### Stubs / TODOs

| Location | Description |
|---|---|
| `AuthProvider.sendOTP` | OTP is only generated in memory. Production requires Africa's Talking or Hubtel SMS integration. Commented code is provided. |
| `orders/[orderCode]/page.tsx` | WebSocket block is commented out. Real-time tracking requires a `wss://` endpoint. |
| `order-history/page.tsx` | `isLoggedIn` is hardcoded `false`. Needs to read from `AuthProvider`. Order fetching is mocked — needs real API by user ID or IP. |
| `order-history/page.tsx` | Reorder button logs to console and navigates to `/`. Actual cart re-add is not implemented. |
| `CheckoutPage.handlePlaceOrder` | Order placement is simulated with a 1800ms timeout. Real implementation needs a payment API call (Hubtel noted as payment processor). |
| `OrdersProvider.handleAdvance` | `PATCH /api/v1/staff/orders/:id/status` is a TODO comment — no real API call is made. |
| `OrdersProvider.handleAdvance` | SMS notification on dispatch (`POST /api/v1/notifications/sms`) is a TODO comment — no real API call is made. |
| `MySalesView` | `GET /api/v1/staff/my-sales?period=today` is a TODO comment — always shows the same mock data. No auth filter by staff identity. |
| `StaffLayout` | Staff identity hardcoded as `{ name: 'Kofi Mensah', role: 'Sales Staff', branch: 'East Legon' }`. Needs real staff auth context. |
| `StaffLayout` Sign Out | Navigates to `/staff/login` via `window.location.href` without clearing any session/token. |
| `StaffDashboard` | Stats (3, 2, 12) are hardcoded constants, not derived from live data. |
| `staff/store/page.tsx` | Store/branch management page is a stub — not yet implemented. |
| Location caching | `user-location` is stored without TTL enforcement. The stored `timestamp` field exists but is never read to expire the cache. |
| `menuaudit/page.tsx` | No auth/access control — accessible to anyone who knows the URL. |

---

### Inconsistencies

These are active mismatches in the codebase that may cause bugs or confusion:

#### ❌ 1 — Dashboard order detail links are broken routes

**File:** `app/staff/dashboard/page.tsx` (line ~154)

```tsx
href={`/staff/orders/${order.id}`}
```

There is no dynamic route at `/staff/orders/[id]`. The only page at that path is `/staff/orders` (the Kanban view). These links will 404. The detail panel lives as an overlay within `/staff/orders`, not as a separate URL.

**Fix:** Link to `/staff/orders` and use query params or context to auto-select the order, or keep the link as `/staff/orders` only.

---

#### ❌ 2 — `ready` status color differs between Dashboard and Orders module

**Dashboard** (`app/staff/dashboard/page.tsx`):
```ts
ready: { label: 'Ready', dot: 'bg-secondary' }
```

**Orders constants** (`app/staff/orders/constants.ts`):
```ts
ready: { label: 'Ready', dot: 'bg-warning', color: 'border-warning/40' }
```

`bg-secondary` (green) and `bg-warning` (amber/yellow) are different colors. The Kanban board uses amber for "Ready" — the dashboard uses green. A customer looking at both would see a different color for the same status.

**Fix:** Consolidate into a single shared `STATUS_CONFIG` constant and import it everywhere.

---

#### ❌ 3 — Dashboard mock data references non-existent branches

**File:** `app/staff/dashboard/page.tsx`

Mock data includes `branch: 'Airport'` and `branch: 'Labone'`. Neither appears in:
- `BranchProvider` `BRANCHES` array
- `BRANCH_COORDS` in `app/staff/orders/constants.ts`
- Any other branch definition in the codebase

**Fix:** Replace with actual branch names: Osu, East Legon, Tema, Madina, La Paz, Dzorwulu.

---

#### ❌ 4 — `OrderItem` shape differs between Orders and My Sales modules

`StaffOrder.items` (in `app/staff/orders/types.ts`):
```ts
{ name: string; quantity: number; price: number }
```

`SalesOrder.items` (in `app/staff/my-sales/types.ts`):
```ts
{ name: string; qty: number; unitPrice: number }
```

Same concept, different field names. If/when these are driven by a shared API, one shape will need to be adopted everywhere. `quantity`/`price` vs `qty`/`unitPrice` will cause silent errors if types are mixed.

**Fix:** Agree on a single `OrderItem` shape and share it via `types/order.ts` or a shared staff types file.

---

#### ❌ 5 — `OrderSource` is narrower in the New Order wizard than in the rest of the codebase

`app/staff/new-order/types.ts`:
```ts
type OrderSource = 'phone' | 'whatsapp' | 'instagram' | 'facebook'
```

`app/staff/orders/types.ts` and `app/staff/my-sales/types.ts`:
```ts
type OrderSource = 'online' | 'phone' | 'whatsapp' | 'instagram' | 'facebook' | 'pos'
```

If a staff member creates an order via the New Order wizard, its source can never be `online` or `pos`, even though the orders view displays orders from those sources. This means staff can't manually register walk-up (POS) orders through the wizard.

**Fix:** Add `'pos'` and `'online'` to `new-order/types.ts` `OrderSource` if POS/online order entry via staff is required. Or document the intentional exclusion.

---

#### ❌ 6 — Staff layout logo path differs between desktop and mobile

**Desktop sidebar** (`app/staff/layout.tsx` line ~93):
```tsx
<Image src="/cblogo.webp" ... />
```

**Mobile top bar** (`app/staff/layout.tsx` line ~153):
```tsx
<Image src="/images/cblogo.webp" ... />
```

One of these paths is wrong. The logo exists at one location in `public/`. Whichever path is incorrect will render a broken image.

**Fix:** Verify the actual file location in `public/` and use the same path in both places.

---

#### ⚠️ 7 — `BranchProvider` `menuItemIds` vs `SampleMenu` slug IDs

Branch `menuItemIds` in `BranchProvider` still use legacy integer string IDs (`'1'`–`'34'`). The live `sampleMenuItems` now uses slug IDs (`'fried-rice'`, `'jollof'`, etc.). The `validateCartForBranch` and `isItemAvailableAtBranch` functions will always return wrong results until `menuItemIds` in `BranchProvider` are updated to match the current slug-based IDs.

---

#### ⚠️ 8 — `formatGHS` is duplicated across modules

`app/staff/orders/utils.ts` and `app/staff/my-sales/utils.ts` both define an identical `formatGHS(n)` function. If currency formatting requirements change, both will need to be updated.

**Fix:** Extract to `lib/utils/currency.ts` and import from one place.

---

#### ℹ️ 9 — `isDone` alias in orders utils

`app/staff/orders/utils.ts` exports both `isDoneStatus` and `isDone` as an alias, with a comment noting "backwards compatibility." This is a new codebase — the alias is unnecessary and adds confusion.

**Fix:** Remove the alias, use `isDoneStatus` everywhere.

---

*Documentation maintained by RichardSomda — February 2026*
