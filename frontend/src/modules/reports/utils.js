export { fmtTZS, fmtDate, fmtDateTime, fmtTime } from '../cashier/utils';

export const today = () => new Date().toISOString().slice(0, 10);

export const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export const startOfWeek = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(new Date().setDate(diff)).toISOString().slice(0, 10);
};

export const startOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

export const startOfYear = (year = 2020) => `${year}-01-01`;

export const fmtPeriod = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-TZ', { day: '2-digit', month: 'short' });
};

export const fmtMonthPeriod = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-TZ', { month: 'short', year: '2-digit' });
};

export const sumField = (arr, field) =>
  (arr || []).reduce((acc, r) => acc + (r[field] || 0), 0);
