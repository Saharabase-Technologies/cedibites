import apiClient from '../client';

export interface Role {
  id: number;
  name: string;
  display_name: string;
  permissions: string[];
}

export interface Permission {
  id: number;
  name: string;
  display_name: string;
  description: string;
}

function extractData<T>(response: unknown): T {
  const r = response as { data?: T };
  return (r?.data ?? response) as T;
}

export const roleService = {
  getRoles: async (): Promise<Role[]> => {
    const response = await apiClient.get('/admin/roles');
    return extractData<Role[]>(response);
  },

  getPermissions: async (): Promise<Permission[]> => {
    const response = await apiClient.get('/admin/permissions');
    return extractData<Permission[]>(response);
  },
};