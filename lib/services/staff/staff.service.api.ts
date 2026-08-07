// ─── API Staff Service ──────────────────────────────────────────────────────
// Implements StaffService using real API endpoints.

import type { StaffService, StaffUser, StaffMember, StaffFilter } from './staff.service';
import { staffService } from '@/lib/api/services/staff.service';
import { employeeService } from '@/lib/api/services/employee.service';
import type { StaffRole } from '@/types/order';

function apiUserToStaffUser(user: { id: string; name: string; role: StaffRole; branches: StaffUser['branches'] }): StaffUser {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    branches: user.branches,
  };
}

export class ApiStaffService implements StaffService {
  async resolveByCredentials(identifier: string, password: string): Promise<StaffUser | null> {
    try {
      const { user } = await staffService.login(identifier, password);
      return apiUserToStaffUser(user);
    } catch {
      return null;
    }
  }

  async getAll(filter?: StaffFilter): Promise<StaffMember[]> {
    const params: { branch_id?: number; status?: string } = {};
    if (filter?.branchId) {
      params.branch_id = parseInt(filter.branchId, 10);
    }
    if (filter?.status) {
      params.status = filter.status;
    }
    let staff = await employeeService.getEmployees(params);
    if (filter?.role) {
      staff = staff.filter((s) => s.role === filter.role);
    }
    return staff;
  }

  async getById(id: string): Promise<StaffMember | null> {
    return employeeService.getEmployee(id);
  }
}
