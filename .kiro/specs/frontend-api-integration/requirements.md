# Frontend API Integration - Complete Requirements

## CRITICAL: UI Preservation Principle
**This integration must NOT change the user interface in any way.** The goal is to replace mock data sources with real API calls while keeping the exact same UI, components, styling, interactions, and user experience. Think of this as a "data source swap" - everything the user sees and interacts with stays identical.

## Overview
Integrate all frontend providers with the Laravel backend API following the strategic integration plan. This covers Phases 1-6 of the integration roadmap.

## Phase 1: Foundation & Testing

### 1.1 Environment Setup
**User Story**: As a developer, I need the frontend configured to communicate with the backend API.

**Acceptance Criteria:**
- `.env.local` contains correct API URL
- Backend is running and accessible
- Database is seeded with test data
- API endpoints return expected data

### 1.2 Branches Integration (Already Complete ✅)
**User Story**: As a user, I want to see real branches from the backend.

**Acceptance Criteria:**
- BranchProvider uses `useBranches` hook
- Branch selection works with real data
- Distance calculation still works
- Branch modal displays all branches

### 1.3 Menu Items Integration
**User Story**: As a user, I want to browse real menu items from the backend.

**Acceptance Criteria:**
- MenuDiscoveryProvider uses `useMenu` hook
- Search and filtering work with API data
- Menu categories display correctly
- Popular and new items are marked
- Menu items show correct prices and availability

## Phase 2: Authentication

### 2.1 Auth Provider Integration
**User Story**: As a user, I want to authenticate using real OTP verification.

**Acceptance Criteria:**
- AuthProvider uses `useAuth` hook
- OTP is sent via backend API
- OTP verification works with backend
- Token is stored correctly
- User session persists across page refreshes
- Logout clears token and user data

### 2.2 Auth Modal Integration
**User Story**: As a user, I want a smooth authentication experience.

**Acceptance Criteria:**
- Auth modal shows loading states
- OTP send shows success/error messages
- OTP verify shows validation errors
- Rate limiting is handled gracefully
- User is redirected after successful auth

## Phase 3: Cart Integration

### 3.1 Cart Provider Integration
**User Story**: As an authenticated user, I want my cart synced with the backend.

**Acceptance Criteria:**
- Cart uses API for authenticated users
- Cart uses localStorage for guest users
- Cart syncs when user logs in
- Cart operations show loading states
- Cart errors are handled gracefully

### 3.2 Cart Drawer Integration
**User Story**: As a user, I want to manage my cart with visual feedback.

**Acceptance Criteria:**
- Add to cart shows loading indicator
- Remove from cart shows loading indicator
- Update quantity shows loading indicator
- Errors display in cart drawer
- Cart updates reflect immediately (optimistic updates)

### 3.3 Menu Item Card Integration
**User Story**: As a user, I want to add items to cart from the menu.

**Acceptance Criteria:**
- Add to cart button shows loading state
- Button is disabled during operation
- Success feedback is shown
- Errors are displayed clearly
- Works for both guest and authenticated users

## Phase 4: Order Creation

### 4.1 Checkout Page Integration
**User Story**: As a user, I want to create orders using the backend API.

**Acceptance Criteria:**
- Order creation uses `useCreateOrder` hook
- All order details are validated
- Payment method selection works
- Delivery address is captured
- Order is created successfully
- Cart is cleared after order creation

### 4.2 Order Confirmation
**User Story**: As a user, I want to see my order confirmation.

**Acceptance Criteria:**
- Real order number is displayed
- Order details are shown
- Estimated delivery time is shown
- User can track order from confirmation

## Phase 5: Order Tracking

### 5.1 Order History Page
**User Story**: As a user, I want to see all my past orders.

**Acceptance Criteria:**
- Order history uses `useOrders` hook
- Orders are paginated
- Orders show correct status
- Orders can be filtered by status
- Loading states are shown

### 5.2 Order Tracking Page
**User Story**: As a user, I want to track my order in real-time.

**Acceptance Criteria:**
- Order tracking uses `useOrder` hook
- Order status updates automatically (polling)
- Order timeline is displayed
- Order items are shown
- Payment status is visible

### 5.3 Order Search Page
**User Story**: As a user, I want to search for my orders.

**Acceptance Criteria:**
- Order search works with API
- Search by order number works
- Search results are displayed
- No results message is shown

## Phase 6: Navbar & Notifications

### 6.1 Navbar Integration
**User Story**: As a user, I want to see my auth status and notifications.

**Acceptance Criteria:**
- User name is displayed when authenticated
- Notification badge shows unread count
- Logout button works
- Auth state updates immediately

### 6.2 Notifications Integration
**User Story**: As a user, I want to receive and manage notifications.

**Acceptance Criteria:**
- Notifications use `useNotifications` hook
- Unread count updates in real-time
- Notifications can be marked as read
- Notifications can be deleted
- Notifications auto-refresh

## Technical Requirements

### UI Preservation (CRITICAL)
- Zero changes to component JSX structure
- Zero changes to CSS/Tailwind classes
- Zero changes to user interactions or flows
- Zero changes to visual feedback mechanisms
- Only internal data fetching logic changes

### API Integration
- All providers use React Query hooks
- Proper error handling for all API calls
- Loading states for all operations
- Optimistic updates where appropriate
- Proper cache invalidation

### Authentication
- Token stored in localStorage
- Token included in all authenticated requests
- 401 errors trigger logout
- Auth state synced across tabs

### Error Handling
- User-friendly error messages
- Network errors handled gracefully
- Validation errors displayed clearly
- Retry logic for transient failures

### Performance
- Debounced search inputs
- Optimistic UI updates
- Proper React Query caching
- Minimal re-renders

### Testing
- Unit tests for all transformers
- Integration tests for all providers
- E2E tests for critical flows
- No console errors or warnings

## Dependencies
- Backend API must be running
- Database must be seeded
- CORS must be configured
- All API endpoints must be functional

## Out of Scope
- Backend API development
- Database schema changes
- Payment gateway integration (Paystack)
- Real-time WebSocket notifications
- Advanced analytics
