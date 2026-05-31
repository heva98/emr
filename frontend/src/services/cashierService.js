import api from './api';

export const cashierService = {
  // Queue & stats
  getQueue:        ()           => api.get('/cashier/queue/'),
  getDailySummary: (date)       => api.get('/cashier/daily-summary/', { params: { date } }),

  // Invoices
  getInvoices:     (params)     => api.get('/cashier/invoices/', { params }),
  getInvoice:      (id)         => api.get(`/cashier/invoices/${id}/`),
  createInvoice:   (data)       => api.post('/cashier/invoices/', data),
  updateInvoice:   (id, data)   => api.patch(`/cashier/invoices/${id}/`, data),

  // Line items
  addItem:         (id, data)   => api.post(`/cashier/invoices/${id}/add-item/`, data),
  removeItem:      (id, iid)    => api.delete(`/cashier/invoices/${id}/items/${iid}/`),

  // Payment
  recordPayment:   (id, data)   => api.post(`/cashier/invoices/${id}/pay/`, data),
  getReceipt:      (id)         => api.get(`/cashier/invoices/${id}/receipt/`),

  // Service catalog
  getCatalog:      (params)     => api.get('/cashier/service-catalog/', { params }),
  createService:   (data)       => api.post('/cashier/service-catalog/', data),
  updateService:   (id, data)   => api.patch(`/cashier/service-catalog/${id}/`, data),
  deleteService:   (id)         => api.delete(`/cashier/service-catalog/${id}/`),
};
