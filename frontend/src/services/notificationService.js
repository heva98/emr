import api from './api';

export const notificationService = {
  list:        ()   => api.get('/auth/notifications/'),
  markRead:    (id) => api.patch(`/auth/notifications/${id}/read/`, {}),
  markAllRead: ()   => api.post('/auth/notifications/mark-all-read/', {}),
};
