import apiClient from '../client';
import { Branch } from '@/types/api';

export const branchService = {
  /**
   * Get all branches
   */
  getBranches: (): Promise<{ data: Branch[] }> => {
    return apiClient.get('/branches');
  },

  /**
   * Get single branch by ID
   */
  getBranch: (id: number): Promise<{ data: Branch }> => {
    return apiClient.get(`/branches/${id}`);
  },
};
