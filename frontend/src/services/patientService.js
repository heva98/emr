import api from './api';

const BASE = '/patients';

function buildFormData(data) {
  const fd = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (value instanceof File) {
      fd.append(key, value);
    } else if (typeof value === 'boolean') {
      fd.append(key, value.toString());
    } else if (value !== '') {
      fd.append(key, String(value));
    }
  });
  return fd;
}

export const patientService = {
  list: (params) => api.get(`${BASE}/`, { params }),

  create: (data) =>
    api.post(`${BASE}/`, buildFormData(data), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  get: (id) => api.get(`${BASE}/${id}/`),

  // Uses JSON for no-photo updates, FormData only when a new File is attached
  update: (id, data) => {
    if (data.photo instanceof File) {
      return api.patch(`${BASE}/${id}/`, buildFormData(data), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    const { photo, ...rest } = data;
    return api.patch(`${BASE}/${id}/`, rest);
  },

  search: (q) => api.get(`${BASE}/search/`, { params: { q } }),

  listVisits: (id) => api.get(`${BASE}/${id}/visits/`),

  createVisit: (id, data) => api.post(`${BASE}/${id}/visits/`, data),
};
