import apiClient from '../client';
import type { StaffMember, StaffRole, StaffPermissions } from '@/types/staff';

export interface EmployeeListParams {
  branch_id?: number;
  status?: string;
  search?: string;
  per_page?: number;
}

interface ApiEmployeeUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  roles: string[];
  permissions: string[];
}

interface ApiEmployeeBranch {
  id: number;
  name: string;
  location?: string;
}

interface ApiEmployee {
  id: number;
  user_id: number;
  employee_no: string;
  status: string;
  hire_date?: string;
  ssnit_number?: string;
  ghana_card_id?: string;
  tin_number?: string;
  date_of_birth?: string;
  nationality?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  created_at?: string;
  updated_at?: string;
  user: ApiEmployeeUser;
  branch?: ApiEmployeeBranch | null;
  branch_ids?: number[];
  branches?: ApiEmployeeBranch[];
}

function extractData<T>(response: unknown): T {
  const r = response as { data?: T };
  return (r?.data ?? response) as T;
}

function mapApiRoleToStaffRole(roleName: string): StaffRole {
  const map: Record<string, StaffRole> = {
    super_admin: 'super_admin',
    admin: 'super_admin', // backend admin role maps to super_admin for display
    branch_partner: 'branch_partner',
    manager: 'manager',
    call_center: 'call_center',
    sales_staff: 'sales_staff',
    kitchen: 'kitchen',
    rider: 'rider',
    employee: 'sales_staff', // legacy employee role maps to sales_staff
  };
  const lower = roleName.toLowerCase().replace(/\s+/g, '_');
  return (map[lower] ?? 'sales_staff') as StaffRole;
}

function apiEmployeeToStaffMember(api: ApiEmployee): StaffMember {
  const role = api.user.roles?.[0] ?? 'call_center';
  const staffRole = mapApiRoleToStaffRole(role);
  const status = api.status === 'active' ? 'active' : api.status === 'archived' ? 'archived' : 'inactive';
  const branchIds: string[] = (api.branch_ids ?? api.branches?.map((b) => String(b.id)) ?? (api.branch ? [String(api.branch.id)] : [])).map((id) => String(id));
  const branchNames = api.branches?.map((b) => b.name) ?? (api.branch ? [api.branch.name] : []);
  const branchDisplay = branchNames.length > 1 ? branchNames.join(', ') : branchNames[0] ?? '';

  // Map permissions from API to frontend permissions structure
  const permissions = api.user.permissions ?? [];
  const staffPermissions = {
    canPlaceOrders:    permissions.includes('create_orders'),
    canAdvanceOrders:  permissions.includes('update_orders'),
    canAccessPOS:      permissions.includes('access_pos'),
    canViewReports:    permissions.includes('view_analytics'),
    canManageMenu:     permissions.includes('manage_menu'),
    canManageStaff:    permissions.includes('manage_employees'),
    canManageShifts:   permissions.includes('manage_shifts'),
    canManageSettings: permissions.includes('manage_settings'),
    canViewMyShifts:   permissions.includes('view_my_shifts'),
    canViewMySales:    permissions.includes('view_my_sales'),
  };

  return {
    id: String(api.id),
    name: api.user.name,
    email: api.user.email ?? '',
    phone: api.user.phone ?? '',
    role: staffRole,
    branch: branchDisplay,
    branchIds,
    status,
    employmentStatus: 'active',
    systemAccess: status === 'active' ? 'enabled' : 'disabled',
    permissions: staffPermissions,
    password: '',
    joinedAt: api.hire_date ?? api.created_at ?? '',
    lastLogin: '',
    ordersToday: 0,
    // HR fields
    ssnit: api.ssnit_number,
    ghanaCard: api.ghana_card_id,
    tinNumber: api.tin_number,
    dateOfBirth: api.date_of_birth,
    nationality: api.nationality,
    emergencyContact: api.emergency_contact_name ? {
      name: api.emergency_contact_name,
      phone: api.emergency_contact_phone ?? '',
      relationship: api.emergency_contact_relationship ?? '',
    } : undefined,
  };
}

/** Backend role enum: all available roles */
export type BackendRole = 'super_admin' | 'admin' | 'branch_partner' | 'manager' | 'call_center' | 'sales_staff' | 'kitchen' | 'rider' | 'employee';

/** Map frontend StaffRole to backend role for API */
export function staffRoleToBackendRole(role: StaffRole): BackendRole {
  const map: Record<StaffRole, BackendRole> = {
    admin: 'admin',
    super_admin: 'super_admin',
    branch_partner: 'branch_partner',
    manager: 'manager',
    call_center: 'call_center',
    sales_staff: 'sales_staff',
    kitchen: 'kitchen',
    rider: 'rider',
  };
  return map[role] ?? 'sales_staff';
}

/** Map frontend permissions to backend permission names */
export function mapPermissionsToBackend(permissions: StaffPermissions): string[] {
  const backendPermissions: string[] = [];
  
  if (permissions.canPlaceOrders)    backendPermissions.push('create_orders');
  if (permissions.canAdvanceOrders)  backendPermissions.push('update_orders');
  if (permissions.canAccessPOS)      backendPermissions.push('access_pos');
  if (permissions.canViewReports)    backendPermissions.push('view_analytics');
  if (permissions.canManageMenu)     backendPermissions.push('manage_menu');
  if (permissions.canManageStaff)    backendPermissions.push('manage_employees');
  if (permissions.canManageShifts)   backendPermissions.push('manage_shifts');
  if (permissions.canManageSettings) backendPermissions.push('manage_settings');
  if (permissions.canViewMyShifts)   backendPermissions.push('view_my_shifts');
  if (permissions.canViewMySales)    backendPermissions.push('view_my_sales');
  
  return backendPermissions;
}

export interface CreateEmployeePayload {
  name: string;
  email: string | null;
  phone: string;
  /** Optional; when omitted backend auto-generates a password. */
  password?: string;
  branch_ids: number[];
  role: BackendRole;
  hire_date?: string;
  status?: string;
  // HR fields
  ssnit_number?: string;
  ghana_card_id?: string;
  tin_number?: string;
  date_of_birth?: string;
  nationality?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  // Individual permissions
  permissions?: string[];
}

export interface UpdateEmployeePayload {
  name?: string;
  email?: string | null;
  phone?: string;
  branch_ids?: number[];
  role?: BackendRole;
  status?: string;
  hire_date?: string;
  // HR fields
  ssnit_number?: string;
  ghana_card_id?: string;
  tin_number?: string;
  date_of_birth?: string;
  nationality?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  // Individual permissions
  permissions?: string[];
}

export const employeeService = {
  getEmployees: async (params?: EmployeeListParams): Promise<StaffMember[]> => {
    const response = await apiClient.get('/admin/employees', {
      params: { ...params, per_page: params?.per_page ?? 200 },
    });
    const outer = response as { data?: { data?: ApiEmployee[] } };
    const list = outer?.data?.data ?? outer?.data ?? [];
    return (Array.isArray(list) ? list : []).map(apiEmployeeToStaffMember);
  },

  getEmployee: async (id: string): Promise<StaffMember | null> => {
    try {
      const response = await apiClient.get(`/admin/employees/${id}`);
      const api = extractData<ApiEmployee>(response);
      if (!api?.id) return null;
      return apiEmployeeToStaffMember(api);
    } catch {
      return null;
    }
  },

  getBranchEmployees: async (branchId: string): Promise<StaffMember[]> => {
    try {
      const response = await apiClient.get(`/manager/branches/${branchId}/employees`);
      const outer = response as { data?: ApiEmployee[] | { data?: ApiEmployee[] } };
      const list = Array.isArray(outer?.data) ? outer.data : (outer?.data as { data?: ApiEmployee[] })?.data ?? [];
      return (Array.isArray(list) ? list : []).map(apiEmployeeToStaffMember);
    } catch {
      return [];
    }
  },

  createEmployee: async (payload: CreateEmployeePayload): Promise<StaffMember> => {
    const response = await apiClient.post('/admin/employees', {
      name: payload.name,
      email: payload.email || null,
      phone: payload.phone,
      ...(payload.password != null && payload.password !== '' && { password: payload.password }),
      branch_ids: payload.branch_ids,
      role: payload.role,
      hire_date: payload.hire_date ?? undefined,
      status: payload.status ?? undefined,
      // HR fields
      ...(payload.ssnit_number && { ssnit_number: payload.ssnit_number }),
      ...(payload.ghana_card_id && { ghana_card_id: payload.ghana_card_id }),
      ...(payload.tin_number && { tin_number: payload.tin_number }),
      ...(payload.date_of_birth && { date_of_birth: payload.date_of_birth }),
      ...(payload.nationality && { nationality: payload.nationality }),
      ...(payload.emergency_contact_name && { emergency_contact_name: payload.emergency_contact_name }),
      ...(payload.emergency_contact_phone && { emergency_contact_phone: payload.emergency_contact_phone }),
      ...(payload.emergency_contact_relationship && { emergency_contact_relationship: payload.emergency_contact_relationship }),
      // Individual permissions
      ...(payload.permissions && { permissions: payload.permissions }),
    });
    const outer = response as { data?: { data?: ApiEmployee } };
    const api = outer?.data?.data ?? outer?.data ?? (response as unknown as ApiEmployee);
    return apiEmployeeToStaffMember(api as ApiEmployee);
  },

  updateEmployee: async (id: string, payload: UpdateEmployeePayload): Promise<StaffMember> => {
    const response = await apiClient.patch(`/admin/employees/${id}`, {
      ...(payload.name !== undefined && { name: payload.name }),
      ...(payload.email !== undefined && { email: payload.email }),
      ...(payload.phone !== undefined && { phone: payload.phone }),
      ...(payload.branch_ids !== undefined && { branch_ids: payload.branch_ids }),
      ...(payload.role !== undefined && { role: payload.role }),
      ...(payload.status !== undefined && { status: payload.status }),
      ...(payload.hire_date !== undefined && { hire_date: payload.hire_date }),
      // HR fields
      ...(payload.ssnit_number !== undefined && { ssnit_number: payload.ssnit_number }),
      ...(payload.ghana_card_id !== undefined && { ghana_card_id: payload.ghana_card_id }),
      ...(payload.tin_number !== undefined && { tin_number: payload.tin_number }),
      ...(payload.date_of_birth !== undefined && { date_of_birth: payload.date_of_birth }),
      ...(payload.nationality !== undefined && { nationality: payload.nationality }),
      ...(payload.emergency_contact_name !== undefined && { emergency_contact_name: payload.emergency_contact_name }),
      ...(payload.emergency_contact_phone !== undefined && { emergency_contact_phone: payload.emergency_contact_phone }),
      ...(payload.emergency_contact_relationship !== undefined && { emergency_contact_relationship: payload.emergency_contact_relationship }),
      // Individual permissions
      ...(payload.permissions !== undefined && { permissions: payload.permissions }),
    });
    const outer = response as { data?: { data?: ApiEmployee } };
    const api = outer?.data?.data ?? outer?.data ?? (response as unknown as ApiEmployee);
    return apiEmployeeToStaffMember(api as ApiEmployee);
  },

  deleteEmployee: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/employees/${id}`);
  },

  forceLogout: async (id: string): Promise<void> => {
    await apiClient.post(`/admin/employees/${id}/force-logout`);
  },

  requirePasswordReset: async (id: string): Promise<void> => {
    await apiClient.post(`/admin/employees/${id}/require-password-reset`);
  },
};
