# Cart API Integration - Tasks

## Prerequisites (Already Complete ✅)
- ✅ API client setup (`lib/api/client.ts`)
- ✅ Cart service (`lib/api/services/cart.service.ts`)
- ✅ Cart hooks (`lib/api/hooks/useCart.ts`)
- ✅ Auth service and hooks
- ✅ Menu service and hooks
- ✅ Order service and hooks
- ✅ Notification service and hooks
- ✅ Branch service and hooks

## 1. Data Transformation Layer
- [ ] 1.1 Create `lib/api/transformers/cart.transformer.ts` file
- [ ] 1.2 Implement `transformApiCartToLocal()` function
- [ ] 1.3 Implement `transformLocalToApiRequest()` function
- [ ] 1.4 Implement `transformMenuItemToSearchable()` helper
- [ ] 1.5 Add unit tests for all transformation functions

## 2. Enhanced CartProvider - Core Integration
- [ ] 2.1 Import and integrate `useCart` API hook into CartProvider
- [ ] 2.2 Import and integrate `useAuth` hook for authentication state
- [ ] 2.3 Add `mode` state ('api' | 'local') based on auth status
- [ ] 2.4 Add `isSyncing` state for cart synchronization
- [ ] 2.5 Create `isAuthenticated` computed value from auth state

## 3. Cart Operations - Dual Mode Implementation
- [ ] 3.1 Update `addToCart()` to use API when authenticated, localStorage when guest
- [ ] 3.2 Update `updateQuantity()` to use API when authenticated, localStorage when guest
- [ ] 3.3 Update `removeFromCart()` to use API when authenticated, localStorage when guest
- [ ] 3.4 Update `clearCart()` to use API when authenticated, localStorage when guest
- [ ] 3.5 Add error handling with fallback to localStorage on API failure
- [ ] 3.6 Add optimistic updates for better UX (update UI immediately, sync in background)

## 4. Cart Synchronization on Login
- [ ] 4.1 Create `syncCartOnLogin()` function
- [ ] 4.2 Implement logic to fetch backend cart
- [ ] 4.3 Implement logic to merge local cart with backend cart
- [ ] 4.4 Handle conflicts (same item in both carts - sum quantities)
- [ ] 4.5 Clear localStorage cart after successful sync
- [ ] 4.6 Add useEffect to trigger sync when user logs in

## 5. Cart Data Transformation
- [ ] 5.1 Use transformer to convert API cart to local CartItem format
- [ ] 5.2 Update `items` state to use transformed API cart when authenticated
- [ ] 5.3 Keep localStorage items when in guest mode
- [ ] 5.4 Handle missing or invalid data gracefully

## 6. Loading States Integration
- [ ] 6.1 Expose `isLoading` from useCart hook
- [ ] 6.2 Expose `isSyncing` state for cart synchronization
- [ ] 6.3 Expose per-operation loading states (addItemLoading, updateItemLoading, etc.)
- [ ] 6.4 Update CartContext interface to include all loading states

## 7. Error Handling
- [ ] 7.1 Add try-catch blocks to all API cart operations
- [ ] 7.2 Implement fallback to localStorage on API errors
- [ ] 7.3 Add user-friendly error messages using toast/notification
- [ ] 7.4 Handle 401 errors (auth expired) by switching to local mode
- [ ] 7.5 Handle 422 errors (validation) by showing specific error messages

## 8. Branch Validation Updates
- [ ] 8.1 Keep existing `validateCartForBranch()` for local mode
- [ ] 8.2 For API mode, rely on backend validation (cart is already branch-specific)
- [ ] 8.3 Update branch switching logic to handle API cart

## 9. UI Updates - CartDrawer
- [ ] 9.1 Update CartDrawer to show loading states during operations
- [ ] 9.2 Add loading spinner for add/remove/update operations
- [ ] 9.3 Show sync indicator when cart is syncing
- [ ] 9.4 Display error messages in cart drawer
- [ ] 9.5 Test cart drawer with both authenticated and guest users

## 10. UI Updates - MenuItemCard
- [ ] 10.1 Update "Add to Cart" button to show loading state
- [ ] 10.2 Disable button while operation is in progress
- [ ] 10.3 Show success feedback after adding to cart
- [ ] 10.4 Display error message if add to cart fails
- [ ] 10.5 Test with both authenticated and guest users

## 11. Testing - Unit Tests
- [ ] 11.1 Test cart mode switching (guest → authenticated → guest)
- [ ] 11.2 Test data transformation functions
- [ ] 11.3 Test cart synchronization logic
- [ ] 11.4 Test merge strategy (local + backend carts)
- [ ] 11.5 Test error handling and fallback logic

## 12. Testing - Integration Tests
- [ ] 12.1 Test add to cart as guest user
- [ ] 12.2 Test add to cart as authenticated user
- [ ] 12.3 Test update quantity in both modes
- [ ] 12.4 Test remove from cart in both modes
- [ ] 12.5 Test clear cart in both modes
- [ ] 12.6 Test login with existing local cart (sync flow)
- [ ] 12.7 Test logout (switch to local mode)

## 13. Testing - E2E Tests
- [ ] 13.1 Test complete guest user flow (browse → add to cart → checkout)
- [ ] 13.2 Test complete authenticated user flow
- [ ] 13.3 Test login with cart (guest → authenticated with cart sync)
- [ ] 13.4 Test cart persistence across page refreshes
- [ ] 13.5 Test offline cart operations (localStorage fallback)

## 14. Performance Optimization
- [ ] 14.1 Add debouncing for quantity updates (500ms delay)
- [ ] 14.2 Implement optimistic updates for instant UI feedback
- [ ] 14.3 Verify React Query caching is working correctly
- [ ] 14.4 Test cart performance with many items (20+ items)

## 15. Documentation
- [ ] 15.1 Document CartProvider dual-mode behavior
- [ ] 15.2 Document cart synchronization flow
- [ ] 15.3 Document error handling strategy
- [ ] 15.4 Add JSDoc comments to all public functions
- [ ] 15.5 Update README with cart integration details

## 16. Final QA and Deployment
- [ ] 16.1 Test all cart operations as guest user
- [ ] 16.2 Test all cart operations as authenticated user
- [ ] 16.3 Test login/logout cart transitions
- [ ] 16.4 Verify no console errors
- [ ] 16.5 Verify TypeScript compiles without errors
- [ ] 16.6 Test on multiple browsers (Chrome, Firefox, Safari)
- [ ] 16.7 Test on mobile devices
- [ ] 16.8 Deploy to staging environment
- [ ] 16.9 Perform smoke tests on staging
- [ ] 16.10 Deploy to production
