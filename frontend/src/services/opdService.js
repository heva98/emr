import api from './api';

export const opdService = {
  // Queue & stats
  getQueue: () => api.get('/opd/queue/'),
  getStats: () => api.get('/opd/stats/'),

  // Triage
  createTriage: (data) => api.post('/opd/triage/', data),
  updateTriage: (id, data) => api.patch(`/opd/triage/${id}/`, data),

  // Visit context (patient + triage + consultation in one call)
  getVisitContext: (visitId) => api.get(`/opd/visit-context/${visitId}/`),

  // Consultations
  createConsultation: (data) => api.post('/opd/consultations/', data),
  getConsultation: (id) => api.get(`/opd/consultations/${id}/`),
  updateConsultation: (id, data) => api.patch(`/opd/consultations/${id}/`, data),

  // Referrals
  createReferral: (data) => api.post('/opd/referrals/', data),
  getConsultationReferrals: (consultationId) =>
    api.get(`/opd/consultations/${consultationId}/referrals/`),

  // ICD-10 typeahead
  searchIcd10: (q) => api.get('/opd/icd10/', { params: { q } }),
};
