# Cart API Integration - Design

## Architecture Overview

### Dual-Mode Cart System
The CartProvider will operate in two modes:
1. **API Mode** (authenticated users): Cart synced with backend
2. **LocalStorage Mode** (guest users): Cart stored locally

### Component Structure
```
CartProvider (Enhanced)
├── useApiCart (API hook)
├── LocalCart (localStorage manager)
├── CartSyncManager (sync logic)
└── CartValidator (branch validation)
```

## Data Models

### Frontend Cart Item (Existing)
```typescript
interface CartItem {
  cartItemId: string;     // `${itemId}__${sizeKey}`
  item: SearchableItem;
  selectedSize: string;
  sizeLabel: string;
  price: number;
  quantity: number;
}
```

### Backend Cart Item (API Response)
```typescript
interface ApiCartItem {
  id: number;
  cart_id: number;
  menu_item_id: number;
  menu_item: MenuItem;
  quantity: number;
  size_key?: string;
  variant_key?: string;
  unit_price: number;
  subtotal: number;
  special_instructions?: string;
}
```

### Cart State
```typescript
interface CartState {
  mode: 'api' | 'local';
  items: CartItem[];
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
}
```

## Implementation Strategy

### 1. Enhanced CartProvider

#### State Management
```typescript
const [mode, setMode] = useState<'api' | 'local'>('local');
const [localItems, setLocalItems] = useState<CartItem[]>([]);
const [isSyncing, setIsSyncing] = useState(false);

// Use API cart when authenticated
const { cart: apiCart, isLoading, addItem, updateItem, removeItem, clearCart } = useApiCart();
const { user } = useAuth();

// Determine mode based on authentication
useEffect(() => {
  setMode(user ? 'api' : 'local');
}, [user]);
```

#### Cart Operations

**Add to Cart**
```typescript
const addToCart = async (item: SearchableItem, sizeKey: string) => {
  if (mode === 'api') {
    try {
      await addItem({
        menu_item_id: Number(item.id),
        quantity: 1,
        size_key: sizeKey,
      });
    } catch (error) {
      // Fallback to local on error
      addToLocalCart(item, sizeKey);
      showError('Added to local cart. Will sync when online.');
    }
  } else {
    addToLocalCart(item, sizeKey);
  }
};
```

**Update Quantity**
```typescript
const updateQuantity = async (cartItemId: string, quantity: number) => {
  if (mode === 'api') {
    const apiItemId = extractApiItemId(cartItemId);
    try {
      await updateItem({ itemId: apiItemId, data: { quantity } });
    } catch (error) {
      // Optimistic update with rollback
      updateLocalQuantity(cartItemId, quantity);
      showError('Update failed. Will retry.');
    }
  } else {
    updateLocalQuantity(cartItemId, quantity);
  }
};
```

**Remove from Cart**
```typescript
const removeFromCart = async (cartItemId: string) => {
  if (mode === 'api') {
    const apiItemId = extractApiItemId(cartItemId);
    try {
      await removeItem(apiItemId);
    } catch (error) {
      removeFromLocalCart(cartItemId);
      showError('Removed locally. Will sync when online.');
    }
  } else {
    removeFromLocalCart(cartItemId);
  }
};
```

### 2. Cart Synchronization

#### On Login
```typescript
const syncCartOnLogin = async () => {
  setIsSyncing(true);
  try {
    const localCart = getLocalCart();
    if (localCart.length === 0) {
      // No local cart, just use backend cart
      setIsSyncing(false);
      return;
    }

    // Fetch backend cart
    const backendCart = await getCart();
    
    if (!backendCart || backendCart.items.length === 0) {
      // No backend cart, migrate local to backend
      await migrateLocalToBackend(localCart);
    } else {
      // Merge carts
      await mergeCarts(localCart, backendCart);
    }
    
    // Clear local cart after successful sync
    clearLocalCart();
  } catch (error) {
    console.error('Cart sync failed:', error);
    // Keep local cart as fallback
  } finally {
    setIsSyncing(false);
  }
};
```

#### Merge Strategy
```typescript
const mergeCarts = async (localCart: CartItem[], backendCart: Cart) => {
  const backendItemMap = new Map(
    backendCart.items.map(item => [
      `${item.menu_item_id}__${item.size_key}`,
      item
    ])
  );

  for (const localItem of localCart) {
    const key = `${localItem.item.id}__${localItem.selectedSize}`;
    const backendItem = backendItemMap.get(key);

    if (backendItem) {
      // Item exists in both - sum quantities
      await updateItem({
        itemId: backendItem.id,
        data: { quantity: backendItem.quantity + localItem.quantity }
      });
    } else {
      // Item only in local - add to backend
      await addItem({
        menu_item_id: Number(localItem.item.id),
        quantity: localItem.quantity,
        size_key: localItem.selectedSize,
      });
    }
  }
};
```

### 3. Data Transformation

#### API to Frontend
```typescript
const transformApiCartToLocal = (apiCart: Cart): CartItem[] => {
  return apiCart.items.map(apiItem => ({
    cartItemId: `${apiItem.menu_item_id}__${apiItem.size_key || 'default'}`,
    item: transformMenuItemToSearchable(apiItem.menu_item),
    selectedSize: apiItem.size_key || 'default',
    sizeLabel: apiItem.size_key || 'Regular',
    price: apiItem.unit_price,
    quantity: apiItem.quantity,
  }));
};
```

#### Frontend to API
```typescript
const transformLocalToApiRequest = (cartItem: CartItem): AddCartItemRequest => {
  return {
    menu_item_id: Number(cartItem.item.id),
    quantity: cartItem.quantity,
    size_key: cartItem.selectedSize !== 'default' ? cartItem.selectedSize : undefined,
  };
};
```

### 4. Branch Validation

#### Validate Cart Against Branch
```typescript
const validateCartForBranch = async (branchId: string): Promise<CartValidationResult> => {
  if (mode === 'api') {
    // Backend validates automatically
    // Just fetch updated cart
    const updatedCart = await getCart();
    return {
      available: transformApiCartToLocal(updatedCart),
      unavailable: [],
    };
  } else {
    // Local validation using branch menu
    const branchMenu = await getBranchMenu(branchId);
    const menuItemIds = branchMenu.map(item => item.id);
    return validateLocalCart(localItems, menuItemIds);
  }
};
```

### 5. Error Handling

#### Graceful Degradation
```typescript
const handleApiError = (error: any, operation: string) => {
  console.error(`Cart ${operation} failed:`, error);
  
  if (error.response?.status === 401) {
    // Auth expired - switch to local mode
    setMode('local');
    showError('Session expired. Cart saved locally.');
  } else if (error.response?.status === 422) {
    // Validation error
    showError(error.response.data.message);
  } else {
    // Network or server error - fallback to local
    showError(`${operation} failed. Using local cart.`);
  }
};
```

#### Retry Logic
```typescript
const retryOperation = async (operation: () => Promise<any>, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await delay(1000 * (i + 1)); // Exponential backoff
    }
  }
};
```

### 6. Optimistic Updates

```typescript
const optimisticAddToCart = (item: SearchableItem, sizeKey: string) => {
  // Immediately update UI
  const tempItem = createTempCartItem(item, sizeKey);
  setLocalItems(prev => [...prev, tempItem]);
  
  // Then sync with backend
  addItem({
    menu_item_id: Number(item.id),
    quantity: 1,
    size_key: sizeKey,
  }).catch(error => {
    // Rollback on error
    setLocalItems(prev => prev.filter(i => i.cartItemId !== tempItem.cartItemId));
    handleApiError(error, 'Add to cart');
  });
};
```

## Loading States

### Cart Operations
- `isLoading`: Initial cart fetch
- `isSyncing`: Cart synchronization in progress
- `addItemLoading`: Adding item to cart
- `updateItemLoading`: Updating item quantity
- `removeItemLoading`: Removing item from cart
- `clearCartLoading`: Clearing entire cart

### UI Indicators
```typescript
interface LoadingStates {
  global: boolean;           // Overall cart loading
  items: Map<string, boolean>; // Per-item operations
  sync: boolean;             // Sync in progress
}
```

## Testing Strategy

### Unit Tests
1. Cart mode switching (API ↔ Local)
2. Data transformation (API ↔ Frontend)
3. Cart synchronization logic
4. Merge strategy
5. Error handling and fallback

### Integration Tests
1. Add to cart (both modes)
2. Update quantity (both modes)
3. Remove from cart (both modes)
4. Clear cart (both modes)
5. Login with local cart
6. Branch switching validation

### E2E Tests
1. Guest user cart flow
2. Authenticated user cart flow
3. Login with existing cart
4. Offline cart operations
5. Cart persistence across sessions

## Performance Considerations

### Optimization Strategies
1. **Debounce quantity updates**: Wait 500ms before API call
2. **Batch operations**: Group multiple adds into single request
3. **Cache cart data**: Use React Query cache (10 min stale time)
4. **Lazy sync**: Sync on user action, not on every change
5. **Optimistic updates**: Update UI immediately, sync in background

### Memory Management
- Clear local cart after successful sync
- Limit cart size (max 50 items)
- Clean up old localStorage data

## Security Considerations

1. **Token validation**: Verify auth token before API calls
2. **CSRF protection**: Include CSRF token in requests
3. **Input sanitization**: Validate quantities and IDs
4. **Rate limiting**: Respect API rate limits
5. **Secure storage**: Use httpOnly cookies for sensitive data

## Rollback Strategy

### Feature Flag
```typescript
const USE_API_CART = process.env.NEXT_PUBLIC_USE_API_CART === 'true';

if (USE_API_CART && user) {
  // Use API mode
} else {
  // Use local mode
}
```

### Gradual Rollout
1. Phase 1: API cart for new users only
2. Phase 2: API cart for 50% of users
3. Phase 3: API cart for all users
4. Phase 4: Remove local cart fallback

## Migration Path

### Existing Users
1. Keep local cart working as-is
2. On next login, sync local cart to backend
3. Clear local cart after successful sync
4. Use API cart going forward

### New Users
1. Start with API cart if authenticated
2. Use local cart if guest
3. Migrate to API cart on registration

## Success Metrics

1. **Cart sync success rate**: > 99%
2. **API response time**: < 500ms
3. **Error rate**: < 1%
4. **Cart abandonment rate**: Decrease by 10%
5. **User satisfaction**: Maintain or improve

## Correctness Properties

### Property 1: Cart Consistency
**Description**: Cart state must be consistent between frontend and backend for authenticated users.

**Validation**: After any cart operation, the frontend cart matches the backend cart.

**Test Strategy**: Property-based test that performs random cart operations and verifies consistency.

### Property 2: Cart Persistence
**Description**: Cart items must persist across sessions for authenticated users.

**Validation**: After logout and login, cart contains the same items.

**Test Strategy**: Add items, logout, login, verify cart is unchanged.

### Property 3: Quantity Invariant
**Description**: Cart item quantities must always be positive integers.

**Validation**: All cart items have quantity >= 1.

**Test Strategy**: Property-based test with random quantity updates.

### Property 4: Price Accuracy
**Description**: Cart subtotal must equal sum of (item price × quantity) for all items.

**Validation**: `subtotal === sum(items.map(i => i.price * i.quantity))`

**Test Strategy**: Property-based test with random cart compositions.

### Property 5: Sync Idempotency
**Description**: Syncing the same cart multiple times produces the same result.

**Validation**: `sync(cart) === sync(sync(cart))`

**Test Strategy**: Sync cart twice, verify identical results.
