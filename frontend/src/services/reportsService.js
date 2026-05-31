import api from './api';

const BASE = '/reports';

export const reportsService = {
  getDashboardSummary: (date) =>
    api.get(`${BASE}/dashboard/summary/`, { params: date ? { date } : {} }),

  getRevenueTrend: ({ date_from, date_to, group_by = 'day' } = {}) =>
    api.get(`${BASE}/revenue/trend/`, { params: { date_from, date_to, group_by } }),

  getRevenueByService: ({ date_from, date_to } = {}) =>
    api.get(`${BASE}/revenue/by-service/`, { params: { date_from, date_to } }),

  getPatientRegistrations: ({ date_from, date_to, group_by = 'day' } = {}) =>
    api.get(`${BASE}/patients/registrations/`, { params: { date_from, date_to, group_by } }),

  getPatientDemographics: () =>
    api.get(`${BASE}/patients/demographics/`),

  getOpdVisits: ({ date_from, date_to, group_by = 'day' } = {}) =>
    api.get(`${BASE}/opd/visits/`, { params: { date_from, date_to, group_by } }),

  getTopDiagnoses: ({ date_from, date_to, limit = 10 } = {}) =>
    api.get(`${BASE}/opd/top-diagnoses/`, { params: { date_from, date_to, limit } }),

  getLabTestVolumes: ({ date_from, date_to } = {}) =>
    api.get(`${BASE}/lab/test-volumes/`, { params: { date_from, date_to } }),

  getPharmacyDispensing: ({ date_from, date_to } = {}) =>
    api.get(`${BASE}/pharmacy/dispensing/`, { params: { date_from, date_to } }),

  getPharmacyStockStatus: () =>
    api.get(`${BASE}/pharmacy/stock-status/`),

  getCashierDailySummary: (date) =>
    api.get(`${BASE}/cashier/daily-summary/`, { params: date ? { date } : {} }),
};
