import api from './api';

export const pharmacyService = {
  // ── Drugs ──────────────────────────────────────────────────────────────────
  getDrugs: (params) => api.get('/pharmacy/drugs/', { params }),
  getDrug: (id) => api.get(`/pharmacy/drugs/${id}/`),
  createDrug: (data) => api.post('/pharmacy/drugs/', data),
  updateDrug: (id, data) => api.patch(`/pharmacy/drugs/${id}/`, data),
  deleteDrug: (id) => api.delete(`/pharmacy/drugs/${id}/`),

  // ── Stock ──────────────────────────────────────────────────────────────────
  getStock: (params) => api.get('/pharmacy/stock/', { params }),
  createStock: (data) => api.post('/pharmacy/stock/', data),
  updateStock: (id, data) => api.patch(`/pharmacy/stock/${id}/`, data),
  getLowStock: () => api.get('/pharmacy/stock/low-stock/'),
  getExpiringStock: (days = 30) => api.get('/pharmacy/stock/expiring/', { params: { days } }),
  transferStock: (data) => api.post('/pharmacy/stock/transfer/', data),

  // ── Prescriptions ──────────────────────────────────────────────────────────
  getPrescriptions: (params) => api.get('/pharmacy/prescriptions/', { params }),
  getPrescription: (id) => api.get(`/pharmacy/prescriptions/${id}/`),
  updatePrescription: (id, data) => api.patch(`/pharmacy/prescriptions/${id}/`, data),
  dispense: (id, items) => api.post(`/pharmacy/prescriptions/${id}/dispense/`, items),

  // ── Queue ──────────────────────────────────────────────────────────────────
  getDispensingQueue: () => api.get('/pharmacy/dispensing-queue/'),
};
