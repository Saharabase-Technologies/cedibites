import apiClient from '../client';
import { Notification } from '@/types/api';

export const notificationService = {
  /**
   * Get all notifications for authenticated user
   */
  getNotifications: (): Promise<{ data: Notification[] }> => {
    return apiClient.get('/notifications');
  },

  /**
   * Get unread notification count
   */
  getUnreadCount: (): Promise<{ data: { count: number } }> => {
    return apiClient.get('/notifications/unread-count');
  },

  /**
   * Mark notification as read
   */
  markAsRead: (id: string): Promise<void> => {
    return apiClient.patch(`/notifications/${id}/read`);
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: (): Promise<void> => {
    return apiClient.post('/notifications/mark-all-read');
  },

  /**
   * Delete notification
   */
  deleteNotification: (id: string): Promise<void> => {
    return apiClient.delete(`/notifications/${id}`);
  },
};
