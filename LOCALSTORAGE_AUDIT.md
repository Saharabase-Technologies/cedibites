# LocalStorage Usage Audit

## Summary
Analysis of all localStorage usage in the frontend to ensure data comes from the API.

## Current LocalStorage Usage

### ✅ CORRECT - Auth Related (Keep as-is)
These are necessary for authentication and session management:

1. **`cedibites_auth_token`** (lib/api/client.ts, hooks/useAuth.ts)
   - Stores JWT token for API authentication
   - Required for authenticated requests
   - **Action**: Keep

2. **`cedibites-auth-user`** (AuthProvider.tsx)
   - Caches user data from API
   - Fetches from API on mount if token exists
   - Falls back to API if cache is stale
   - **Action**: Keep (it's a cache, not source of truth)

### ✅ CORRECT - UI State (Keep as-is)
These store UI preferences, not business data:

3. **`location-prompt-shown`** (LocationRequestModal.tsx)
   - Tracks if user has seen the location permission prompt
   - Pure UI state, not business data
   - **Action**: Keep

4. **`RECENT_SEARCHES_KEY`** (MenuDiscoveryProvider.tsx)
   - Stores recent search queries for autocomplete
   - Enhances UX, not critical business data
   - **Action**: Keep

### ⚠️ REVIEW - Data Persistence

5. **`selected-branch-id`** (BranchProvider.tsx)
   - Stores user's selected branch
   - **Current**: Persisted in localStorage
   - **Issue**: Not synced with backend
   - **Options**:
     a. Keep as-is (reasonable for guest users)
     b. Store in backend user preferences (requires API changes)
   - **Recommendation**: Keep for now, but consider adding to user preferences API later

6. **`user-location`** (LocationProvider.tsx)
   - Stores user's GPS coordinates
   - **Current**: Persisted in localStorage
   - **Issue**: Not synced with backend
   - **Options**:
     a. Keep as-is (privacy-friendly, no backend storage)
     b. Store in backend user preferences
   - **Recommendation**: Keep as-is (privacy consideration - users may not want location stored on server)

### ✅ CORRECT - Cart Data (Already API-integrated)

7. **`cedibites-cart`** (CartProvider.tsx)
   - **Current Behavior**:
     - Authenticated users: Cart stored in backend via API
     - Guest users: Cart stored in localStorage
     - On login: Local cart syncs to backend automatically
   - **Action**: Already correctly implemented! ✅

## Summary of Findings

### What's Using API (Correct ✅)
- **Cart**: Uses API for authenticated users, localStorage only for guests
- **Branches**: Fetched from API (`/api/v1/branches`)
- **Menu Items**: Fetched from API (`/api/v1/menu-items`)
- **Orders**: Fetched from API (`/api/v1/orders`)
- **User Data**: Fetched from API on mount, cached in localStorage

### What's NOT Using API (But Should It?)
- **Selected Branch**: Stored only in localStorage
  - For authenticated users, could be stored as user preference
  - For guests, localStorage is appropriate
  
- **User Location**: Stored only in localStorage
  - Privacy consideration - may be intentional
  - Could be stored as user preference if desired

## Recommendations

### Immediate Actions (None Required)
The current implementation is actually correct! All business-critical data (cart, orders, menu, branches) comes from the API. LocalStorage is only used for:
1. Authentication tokens (required)
2. UI state and preferences (appropriate)
3. Guest user data (appropriate fallback)

### Future Enhancements (Optional)
If you want to add user preferences to the backend:

1. **Add User Preferences API**
   ```php
   // Backend: Add to User/Customer model
   {
     "preferred_branch_id": 1,
     "saved_addresses": [...],
     "notification_preferences": {...}
   }
   ```

2. **Update Frontend to Sync**
   - On login: Fetch user preferences from API
   - On change: Update both localStorage and API
   - On logout: Clear localStorage

## Conclusion

**Your application is already correctly using the API for all data!** 

The localStorage usage is appropriate:
- Auth tokens (required)
- UI state (appropriate)
- Guest user fallbacks (appropriate)
- Caching for performance (appropriate)

No changes are needed unless you want to add user preferences to the backend for cross-device sync.
