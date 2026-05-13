import request from './request';

export const notificationsApi = {
  findAll: () => request.get('/notifications'),
  unreadCount: () => request.get('/notifications/unread-count'),
  markRead: (id: number) => request.post(`/notifications/${id}/read`),
  markAllRead: () => request.post('/notifications/read-all'),
};
