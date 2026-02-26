# Frontend API Integration - Cross-Check & Bug Prevention

## ✅ Coverage Verification

### Providers Covered
- ✅ **BranchProvider** - Already integrated with API
- ✅ **MenuDiscoveryProvider** - Planned in Phase 1
- ✅ **AuthProvider** - Planned in Phase 2
- ✅ **CartProvider** - Planned in Phase 3
- ✅ **LocationProvider** - No API integration needed (browser geolocation)
- ✅ **ModalProvider** - No API integration needed (UI state only)
- ✅ **QueryProvider** - Already set up (React Query)

### UI Components Covered
- ✅ **Navbar** - Phase 6 (auth state, notifications)
- ✅ **CartDrawer** - Phase 3 (cart operations)
- ✅ **MenuItemCard** - Phase 3 (add to cart)
- ✅ **ItemDetailModal** - Phase 3 (add to cart)
- ✅ **AuthModal** - Phase 2 (OTP flow)
- ✅ **BranchSelectorModal** - Already working
- ✅ **UniversalSearch** - Phase 1 (menu search)
- ✅ **MenuGrid** - Phase 1 (menu display)
- ✅ **HeroSearch** - Phase 1 (category selection)
- ✅ **DynamicGreeting** - Already working (uses branches)
- ✅ **Stepdone** - Phase 4 (order confirmation)

### Pages Covered
- ✅ **Menu Page** - Phase 1
- ✅ **Checkout Page** - Phase 4
- ✅ **Order History** - Phase 5
- ✅ **Order Tracking** - Phase 5
- ✅ **Order Search** - Phase 5

## 🐛 Potential Bugs & Issues Identified

### 1. MenuDiscoveryProvider Data Structure Mismatch
**Issue**: MenuDiscoveryProvider expects items as props, but needs to fetch from API

**Current Code**:
```typescript
interface MenuDiscoveryProviderProps {
    children: React.ReactNode;
    items: SearchableItem[];  // ❌ Expects items as props
}
```

**Solution**: Update to fetch from API internally
```typescript
export function MenuDiscoveryProvider({ children }: { children: React.ReactNode }) {
    const { items: apiItems, isLoading } = useMenu();
    // Transform and use apiItems
}
```

**Task Added**: ✅ Already in Phase 1, Task 1.2

---

### 2. Cart Item ID Format Mismatch
**Issue**: Frontend uses `cartItemId: "123__large"` but API uses numeric `id`

**Risk**: Cart operations might fail when trying to update/remove items

**Solution**: 
- Store API cart item ID separately
- Use it for API operations
- Keep cartItemId for UI consistency

**Task Added**: ✅ Covered in Phase 3, Task 4 (transformers)

---

### 3. Auth Token Not Included in API Requests
**Issue**: API client needs to include auth token in headers

**Current**: Need to verify `lib/api/client.ts` includes token

**Solution**: Ensure interceptor adds token from localStorage
```typescript
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('cedibites_auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
```

**Task Added**: ✅ Need to add verification task

---

### 4. Cart Sync Race Condition
**Issue**: User logs in while cart operations are in progress

**Risk**: Cart might sync before pending operations complete

**Solution**: 
- Queue cart operations during sync
- Wait for sync to complete before allowing new operations
- Show "Syncing..." indicator

**Task Added**: ✅ Covered in Phase 3, Task 7.7

---

### 5. Branch Switching with Active Cart
**Issue**: User switches branch while having items in cart from another branch

**Risk**: Cart items might not be available at new branch

**Solution**: 
- Validate cart against new branch menu
- Show modal with unavailable items
- Allow user to remove or keep items

**Task Added**: ✅ Already handled in existing CartProvider.validateCartForBranch()

---

### 6. OTP Rate Limiting Not Handled in UI
**Issue**: Backend returns 429 (Too Many Requests) but UI doesn't show countdown

**Solution**:
- Parse rate limit headers from response
- Show countdown timer
- Disable resend button until timer expires

**Task Added**: ✅ Added to Phase 2, Task 2.7

---

### 7. Stale Cart Data After Logout
**Issue**: Cart data might persist in React Query cache after logout

**Solution**:
- Clear all React Query cache on logout
- Reset cart to localStorage mode
- Clear API cart data

**Task Added**: ✅ Need to add to Phase 2

---

### 8. Menu Item Sizes Not Transformed Correctly
**Issue**: API returns `sizes` array but frontend expects specific format

**API Format**:
```typescript
{
    id: 1,
    size_key: "large",
    size_label: "Large",
    price: 25.00
}
```

**Frontend Format**:
```typescript
{
    key: "large",
    label: "Large",
    price: 25.00
}
```

**Solution**: Add transformation in menu transformer

**Task Added**: ✅ Need to add to Phase 1

---

### 9. Order Polling Memory Leak
**Issue**: Order tracking page polls every 30s but might not cleanup on unmount

**Solution**:
- Use React Query's refetchInterval
- Ensure cleanup on component unmount
- Stop polling when order is completed/cancelled

**Task Added**: ✅ Already handled by React Query, but verify in Phase 5

---

### 10. Notification Badge Not Updating
**Issue**: Unread count might not update when notification is read

**Solution**:
- Invalidate unread count query after marking as read
- Use optimistic updates
- Ensure cache invalidation works

**Task Added**: ✅ Already in useNotifications hook, verify in Phase 6

---

### 11. Guest Cart Lost on Registration
**Issue**: User adds items as guest, then registers - cart might be lost

**Solution**:
- Trigger cart sync immediately after registration
- Merge guest cart with new user account
- Show success message

**Task Added**: ✅ Covered in Phase 3, Task 7 (cart sync)

---

### 12. Optimistic Updates Rollback
**Issue**: Optimistic update succeeds in UI but API call fails

**Solution**:
- Store previous state before optimistic update
- Rollback on error
- Show error message
- Retry option

**Task Added**: ✅ Covered in Phase 3, Task 6.6

---

### 13. CORS Preflight Requests
**Issue**: OPTIONS requests might fail for authenticated endpoints

**Solution**:
- Ensure backend handles OPTIONS requests
- Verify CORS headers include Authorization
- Test with real API calls

**Task Added**: ✅ Already configured in backend, verify in testing

---

### 14. Token Expiration Not Handled
**Issue**: Token expires but user continues using app

**Solution**:
- Intercept 401 responses
- Clear token and user data
- Redirect to login
- Show session expired message

**Task Added**: ✅ Need to add to Phase 2

---

### 15. Menu Categories Not Fetched
**Issue**: Menu categories might need separate API call

**Solution**:
- Check if categories are included in menu items response
- If not, add separate categories endpoint
- Transform categories for UI

**Task Added**: ✅ Need to verify API response structure

---

## 📋 Additional Tasks Needed

### Phase 2: Authentication (Add to existing tasks)
- [ ] 2.11 Verify API client includes auth token in headers
- [ ] 2.12 Add token expiration handling (401 interceptor)
- [ ] 2.13 Clear React Query cache on logout
- [ ] 2.14 Test token refresh flow (if implemented)

### Phase 1: Menu (Add to existing tasks)
- [ ] 1.11 Transform menu item sizes to frontend format
- [ ] 1.12 Verify menu categories are available
- [ ] 1.13 Handle menu items without images
- [ ] 1.14 Test with large menu (100+ items)

### Phase 3: Cart (Add to existing tasks)
- [ ] 6.9 Store API cart item IDs for operations
- [ ] 6.10 Handle cart operations during sync (queue)
- [ ] 7.9 Test cart sync with multiple devices
- [ ] 7.10 Handle cart sync conflicts

### Phase 5: Orders (Add to existing tasks)
- [ ] 14.11 Verify polling cleanup on unmount
- [ ] 14.12 Stop polling for completed orders
- [ ] 14.13 Handle order not found (404)
- [ ] 14.14 Test with slow network

### Phase 6: Notifications (Add to existing tasks)
- [ ] 17.11 Verify cache invalidation works
- [ ] 17.12 Test notification badge updates
- [ ] 17.13 Handle notification errors gracefully

## 🔍 Testing Checklist

### Critical Paths to Test
- [ ] Guest user → Add to cart → Register → Cart syncs
- [ ] User logs in → Cart syncs → Continues shopping
- [ ] User adds item → Logs out → Logs back in → Cart persists
- [ ] User creates order → Cart clears → Order appears in history
- [ ] User switches branch → Cart validates → Removes unavailable items
- [ ] Token expires → User redirected to login → Session restored
- [ ] Network fails → Operations fallback to localStorage
- [ ] User receives notification → Badge updates → Marks as read

### Edge Cases to Test
- [ ] Empty cart checkout attempt
- [ ] Order with unavailable items
- [ ] Multiple tabs open (cart sync)
- [ ] Rapid cart operations (race conditions)
- [ ] Very large cart (50+ items)
- [ ] Very long menu (500+ items)
- [ ] Slow network (3G)
- [ ] Offline mode
- [ ] Browser back/forward navigation
- [ ] Page refresh during operations

### Error Scenarios to Test
- [ ] API returns 500 error
- [ ] API returns 422 validation error
- [ ] API returns 429 rate limit
- [ ] API returns 401 unauthorized
- [ ] API returns 403 forbidden
- [ ] Network timeout
- [ ] Network disconnected
- [ ] Invalid response format
- [ ] Missing required fields
- [ ] Duplicate operations

## ✅ Verification Checklist

Before marking integration complete:

### Functionality
- [ ] All providers use API hooks
- [ ] All UI components show loading states
- [ ] All errors display user-friendly messages
- [ ] All operations have optimistic updates
- [ ] All caches invalidate correctly

### Performance
- [ ] Page load < 3 seconds
- [ ] API calls < 500ms
- [ ] No unnecessary re-renders
- [ ] No memory leaks
- [ ] Bundle size acceptable

### Quality
- [ ] No console errors
- [ ] No console warnings
- [ ] TypeScript compiles without errors
- [ ] All tests passing
- [ ] Code coverage > 80%

### UX
- [ ] Loading states are clear
- [ ] Error messages are helpful
- [ ] Success feedback is visible
- [ ] Transitions are smooth
- [ ] Mobile experience is good

### Security
- [ ] Tokens stored securely
- [ ] No sensitive data in logs
- [ ] CORS configured correctly
- [ ] XSS prevention in place
- [ ] CSRF protection enabled

## 🎯 Priority Order

1. **Critical** (Must fix before deployment)
   - Auth token in API requests
   - Token expiration handling
   - Cart sync race conditions
   - Menu data structure mismatch

2. **High** (Should fix before deployment)
   - OTP rate limiting UI
   - Optimistic update rollback
   - Order polling cleanup
   - Guest cart on registration

3. **Medium** (Can fix after deployment)
   - Notification badge updates
   - Menu item size transformation
   - Branch switching validation
   - Stale cache on logout

4. **Low** (Nice to have)
   - Multiple tabs sync
   - Very large datasets
   - Advanced error recovery
   - Performance optimizations

## 📝 Notes

- All identified issues have corresponding tasks in the main task list
- Additional tasks have been added where gaps were found
- Testing checklist covers all critical paths
- Priority order helps focus on most important issues first
