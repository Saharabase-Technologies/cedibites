// Export all services
export * from './services/auth.service';
export * from './services/branch.service';
export * from './services/cart.service';
export * from './services/menu.service';
export * from './services/order.service';
export * from './services/analytics.service';
export * from './services/dashboard.service';
export * from './services/notification.service';
export * from './services/staff.service';
export * from './services/activityLog.service';
export * from './services/checkout-session.service';

// Export all hooks
export * from './hooks/useAuth';
export * from './hooks/useBranches';
export * from './hooks/useCart';
export * from './hooks/useMenu';
export * from './hooks/useOrders';
export * from './hooks/useEmployeeOrders';
export * from './hooks/useAnalytics';
export * from './hooks/useAdminDashboard';
export * from './hooks/useNotifications';
export * from './hooks/useActivityLogs';
export * from './hooks/useCustomers';
export * from './hooks/useCheckoutSession';

// Export client and types
export { default as apiClient, ApiError } from './client';
export type { ApiResponse, PaginatedResponse } from './client';
