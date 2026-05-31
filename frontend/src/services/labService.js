import api from './api';

export const labService = {
  getCatalog: (params) => api.get('/laboratory/catalog/', { params }),

  getOrders: (params) => api.get('/laboratory/orders/', { params }),
  getOrder: (id) => api.get(`/laboratory/orders/${id}/`),
  createOrder: (data) => api.post('/laboratory/orders/', data),
  collectSpecimen: (id, data) => api.patch(`/laboratory/orders/${id}/collect-specimen/`, data),
  submitResults: (id, data) => api.post(`/laboratory/orders/${id}/results/`, data),
  verifyOrder: (id) => api.patch(`/laboratory/orders/${id}/verify/`, {}),

  getQueue: () => api.get('/laboratory/queue/'),

  getPatientLabHistory: (patientId) => api.get(`/patients/${patientId}/lab-history/`),
};
