import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Banknote, Smartphone, TrendingUp,
  RefreshCw, ExternalLink, Receipt,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cashierService } from '../../services/cashierService';
import MetricCard from '../patients/components/MetricCard';
import InvoiceStatusBadge from './components/InvoiceStatusBadge';
import ServiceTypeBadge from './components/ServiceTypeBadge';
import { fmtTZS, fmtDateTime } from './utils';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function ServicesSummary({ items = [] }) {
  const types = [...new Set(items.map((i) => i.reference_type))];
  if (types.length === 0) return <span className="text-gray-400 text-xs">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {types.map((t) => <ServiceTypeBadge key={t} type={t} />)}
    </div>
  );
}

export default function CashierQueuePage() {
  const navigate = useNavigate();
  const [queue, setQueue]         = useState([]);
  const [summary, setSummary]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [countdown, setCountdown] = useState(30);
  const intervalRef = useRef(null);
  const countRef    = useRef(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [queueRes, summaryRes] = await Promise.all([
        cashierService.getQueue(),
        cashierService.getDailySummary(todayISO()),
      ]);
      setQueue(queueRes.data);
      setSummary(summaryRes.data);
    } catch {
      if (!silent) toast.error('Failed to load cashier queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    intervalRef.current = setInterval(() => {
      setCountdown(30);
      fetchData(true);
    }, 30_000);

    countRef.current = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 30));
    }, 1_000);

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(countRef.current);
    };
  }, [fetchData]);

  const handleRefresh = () => {
    setCountdown(30);
    fetchData(true);
    toast.success('Queue refreshed.');
  };

  return (
    <div className="space-y-5">
      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Users}
          label="Waiting to Pay"
          value={loading ? null : queue.length}
          color="text-yellow-600"
        />
        <MetricCard
          icon={TrendingUp}
          label="Total Collected Today"
          value={summary ? fmtTZS(summary.total_collected) : null}
          color="text-primary"
        />
        <MetricCard
          icon={Banknote}
          label="Cash Today"
          value={summary ? fmtTZS(summary.total_cash) : null}
          color="text-emerald-600"
        />
        <MetricCard
          icon={Smartphone}
          label="Mobile Money Today"
          value={summary ? fmtTZS(summary.total_mobile_money) : null}
          color="text-blue-600"
        />
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex items-center gap-3">
        <Receipt className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-semibold text-gray-700">Billing Queue</span>
        <div className="flex-1" />
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <RefreshCw className="w-3 h-3" />
          Refreshing in {countdown}s
        </span>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 text-xs font-medium text-primary border border-primary rounded-lg px-3 py-1.5 hover:bg-primary hover:text-white transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh now
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <QueueSkeleton />
      ) : queue.length === 0 ? (
        <EmptyQueue />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Invoice #', 'Patient Name', 'Patient ID', 'Services', 'Total (TZS)', 'Status', 'Action'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {queue.map((inv) => {
                const p = inv.patient_detail ?? {};
                const fullName = [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ');
                return (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700 whitespace-nowrap">
                      {inv.invoice_number}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                      {fullName || '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                      {p.patient_id || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <ServicesSummary items={inv.items} />
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">
                      {fmtTZS(inv.total_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => navigate(`/cashier/invoice/${inv.id}`)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open Invoice
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function QueueSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
      <div className="h-10 bg-gray-50 border-b border-gray-100" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-50 last:border-0">
          <div className="h-3.5 bg-gray-200 rounded w-28" />
          <div className="h-3.5 bg-gray-200 rounded w-32" />
          <div className="h-3 bg-gray-100 rounded w-20" />
          <div className="flex gap-1">
            <div className="h-5 bg-gray-200 rounded w-16" />
          </div>
          <div className="h-3.5 bg-gray-200 rounded w-24" />
          <div className="h-5 bg-gray-200 rounded-full w-14" />
          <div className="h-7 bg-gray-200 rounded-lg w-24 ml-auto" />
        </div>
      ))}
    </div>
  );
}

function EmptyQueue() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 py-20 text-center">
      <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500 font-medium">No invoices pending payment.</p>
      <p className="text-gray-400 text-sm mt-1">New invoices appear here when patients are referred to cashier.</p>
    </div>
  );
}
