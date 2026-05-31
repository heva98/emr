import api from './api';

export const roomsService = {
  // Departments
  getDepartments: () => api.get('/rooms/departments/'),
  createDepartment: (data) => api.post('/rooms/departments/', data),
  updateDepartment: (id, data) => api.patch(`/rooms/departments/${id}/`, data),
  deleteDepartment: (id) => api.delete(`/rooms/departments/${id}/`),

  // Rooms
  getRooms: (params) => api.get('/rooms/rooms/', { params }),
  getRoom: (id) => api.get(`/rooms/rooms/${id}/`),
  createRoom: (data) => api.post('/rooms/rooms/', data),
  updateRoom: (id, data) => api.patch(`/rooms/rooms/${id}/`, data),
  deleteRoom: (id) => api.delete(`/rooms/rooms/${id}/`),
  getAvailableRooms: () => api.get('/rooms/rooms/available/'),
  toggleAvailability: (id) => api.patch(`/rooms/rooms/${id}/toggle-availability/`),

  // Assignments
  getAssignments: (params) => api.get('/rooms/assignments/', { params }),
  createAssignment: (data) => api.post('/rooms/assignments/', data),
  getTodayAssignments: () => api.get('/rooms/assignments/today/'),
  deactivateAssignment: (id) => api.delete(`/rooms/assignments/${id}/`),

  // Doctors list (for dropdowns)
  getDoctors: () => api.get('/rooms/doctors/'),
};
