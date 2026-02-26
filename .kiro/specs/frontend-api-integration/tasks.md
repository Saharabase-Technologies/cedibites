# Frontend API Integration - Complete Tasks

## CRITICAL: UI Preservation Rule
**The UI must remain EXACTLY the same. We are ONLY replacing mock data with API data.**
- Do NOT change any component structure, styling, or layout
- Do NOT modify any UI elements, buttons, or visual feedback
- Do NOT alter user interactions or flows
- ONLY swap data sources from mock/localStorage to API calls
- Keep all existing loading states, error messages, and success feedback as-is

## Prerequisites (Already Complete ✅)
- ✅ API client setup
- ✅ All service files (auth, branch, cart, menu, order, notification)
- ✅ All API hooks with React Query
- ✅ Type definitions
- ✅ Branch integration complete

## PHASE 1: Menu Integration

### 1. Menu Provider Integration
- [x] 1.1 Update MenuDiscoveryProvider to import `useMenu` hook
- [x] 1.2 Replace mock menu data with `useMenu()` call
- [x] 1.3 Transform API MenuItem to SearchableItem format
- [x] 1.4 Keep existing search/filter logic on frontend
- [x] 1.5 Add loading state from `useMenu`
- [x] 1.6 Add error handling for menu fetch failures

## PHASE 2: Authentication Integration

### 2. Auth Provider Integration
- [x] 2.1 Update AuthProvider to import `useAuth` hook from API
- [x] 2.2 Replace mock `sendOTP` with `authService.sendOTP()`
- [x] 2.3 Replace mock `verifyOTP` with `authService.verifyOTP()`
- [x] 2.4 Update token storage (already using correct key)
- [x] 2.5 Add loading states for OTP operations
- [x] 2.6 Add error handling for auth failures
- [x] 2.7 Handle rate limiting errors (429)

### 3. Auth Modal Integration
- [x] 3.1 Update AuthModal to show loading states
- [x] 3.2 Display OTP send success message
- [x] 3.3 Display OTP send error messages
- [x] 3.4 Display OTP verify error messages
- [x] 3.5 Handle validation errors (422)
- [x] 3.6 Add countdown timer for OTP resend

## PHASE 3: Cart Integration

### 4. Cart Data Transformers
- [x] 4.1 Create `lib/api/transformers/cart.transformer.ts`
- [x] 4.2 Implement `transformApiCartToLocal(apiCart: Cart): CartItem[]`
- [x] 4.3 Implement `transformLocalToApiRequest(cartItem: CartItem): AddCartItemRequest`
- [x] 4.4 Implement `transformMenuItemToSearchable(menuItem: MenuItem): SearchableItem`
- [x] 4.5 Handle edge cases (missing sizes, null values)

### 5. Cart Provider - Core Integration
- [x] 5.1 Import `useCart` API hook into CartProvider
- [x] 5.2 Import `useAuth` hook for authentication state
- [x] 5.3 Add `mode` state: 'api' | 'local'
- [x] 5.4 Add `isSyncing` state for cart synchronization
- [x] 5.5 Determine mode based on auth status
- [x] 5.6 Use API cart data when authenticated
- [x] 5.7 Use localStorage cart when guest
- [x] 5.8 Expose loading states from API hook

### 6. Cart Operations - Dual Mode
- [x] 6.1 Update `addToCart()` - use API if authenticated, localStorage if guest
- [x] 6.2 Update `updateQuantity()` - use API if authenticated, localStorage if guest
- [x] 6.3 Update `removeFromCart()` - use API if authenticated, localStorage if guest
- [x] 6.4 Update `clearCart()` - use API if authenticated, localStorage if guest
- [x] 6.5 Add error handling with fallback to localStorage
- [x] 6.6 Add optimistic updates for instant UI feedback
- [x] 6.7 Transform API responses to local format
- [x] 6.8 Transform local requests to API format

### 7. Cart Synchronization
- [x] 7.1 Create `syncCartOnLogin()` function
- [x] 7.2 Fetch backend cart on login
- [x] 7.3 Merge local cart with backend cart (sum quantities for duplicates)
- [x] 7.4 Handle empty carts (local or backend)
- [x] 7.5 Clear localStorage after successful sync
- [x] 7.6 Add useEffect to trigger sync when user logs in
- [x] 7.7 Show sync progress indicator
- [x] 7.8 Handle sync errors gracefully

### 8. Cart UI Updates - CartDrawer
- [x] 8.1 Add loading spinner for cart operations
- [x] 8.2 Show loading state on add/remove/update buttons
- [x] 8.3 Display sync indicator when syncing
- [x] 8.4 Show error messages in cart drawer
- [x] 8.5 Disable buttons during operations

### 9. Cart UI Updates - MenuItemCard
- [x] 9.1 Add loading state to "Add to Cart" button
- [x] 9.2 Disable button during operation
- [x] 9.3 Show success feedback (toast/animation)
- [x] 9.4 Display error message if operation fails

## PHASE 4: Order Creation Integration

### 11. Checkout Page Integration
- [x] 11.1 Import `useCreateOrder` hook
- [x] 11.2 Update order creation to use API
- [x] 11.3 Transform cart items to order items format
- [x] 11.4 Validate all required fields before submission
- [x] 11.5 Handle payment method selection
- [x] 11.6 Capture delivery address and coordinates
- [x] 11.7 Add loading state during order creation
- [x] 11.8 Handle order creation errors
- [x] 11.9 Clear cart after successful order
- [x] 11.10 Redirect to order confirmation

### 12. Order Confirmation Page
- [x] 12.1 Display real order number from API
- [x] 12.2 Show order details (items, total, delivery info)
- [x] 12.3 Display estimated delivery time
- [x] 12.4 Add "Track Order" button

## PHASE 5: Order Tracking Integration

### 13. Order History Page
- [x] 13.1 Import `useOrders` hook
- [x] 13.2 Replace mock orders with API data
- [x] 13.3 Implement pagination using API meta data
- [x] 13.4 Add status filter dropdown
- [x] 13.5 Add order type filter (delivery/pickup)
- [x] 13.6 Show loading state while fetching
- [x] 13.7 Handle empty state (no orders)
- [x] 13.8 Handle error state

### 14. Order Tracking Page
- [x] 14.1 Import `useOrder` hook
- [x] 14.2 Fetch order by ID from route params
- [x] 14.3 Display order status timeline
- [x] 14.4 Show order items with details
- [x] 14.5 Display payment status
- [x] 14.6 Show delivery information
- [x] 14.7 Enable auto-refresh (polling every 30s)
- [x] 14.8 Add loading state
- [x] 14.9 Handle order not found

### 15. Order Search Page
- [x] 15.1 Create order search form
- [x] 15.2 Implement search by order number
- [x] 15.3 Display search results
- [x] 15.4 Handle no results found
- [x] 15.5 Link to order tracking page

## PHASE 6: Navbar & Notifications Integration

### 16. Navbar Integration
- [x] 16.1 Import `useAuth` hook
- [x] 16.2 Display user name when authenticated
- [x] 16.3 Show login button when not authenticated
- [x] 16.4 Add notification bell icon
- [x] 16.5 Display unread notification count badge
- [x] 16.6 Update logout to use API

### 17. Notifications Integration
- [x] 17.1 Create NotificationDropdown component
- [x] 17.2 Import `useNotifications` hook
- [x] 17.3 Display notification list
- [x] 17.4 Show unread count in badge
- [x] 17.5 Implement mark as read functionality
- [x] 17.6 Implement mark all as read
- [x] 17.7 Implement delete notification
- [x] 17.8 Add auto-refresh (every 60s)
- [x] 17.9 Handle empty state (no notifications)

## PHASE 7: Performance & Optimization

### 18. Performance Optimization
- [x] 18.1 Add debouncing to search inputs (300ms)
- [x] 18.2 Add debouncing to quantity updates (500ms)
- [x] 18.3 Verify React Query caching is working
- [x] 18.4 Optimize re-renders with React.memo where needed
- [x] 18.5 Measure and optimize bundle size

### 19. Error Handling & UX
- [x] 19.1 Add toast notifications for all operations
- [x] 19.2 Implement retry logic for failed requests
- [x] 19.3 Add offline detection and messaging
- [x] 19.4 Handle 401 errors (redirect to login)
- [x] 19.5 Handle 403 errors (permission denied)
- [x] 19.6 Handle 422 errors (validation)
- [x] 19.7 Handle 429 errors (rate limiting)
- [x] 19.8 Handle 500 errors (server error)
- [x] 19.9 Add loading skeletons for better UX

## Success Criteria
- ✅ All API integrations working
- ✅ No console errors or warnings
- ✅ All tests passing
- ✅ Loading states on all operations
- ✅ Error handling for all scenarios
- ✅ Optimistic updates for better UX
- ✅ Cart syncs correctly on login
- ✅ Orders can be created and tracked
- ✅ Notifications work in real-time
- ✅ Performance is acceptable (< 3s page load)
