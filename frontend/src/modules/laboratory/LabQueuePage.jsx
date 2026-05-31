import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical, TestTube, CheckCircle2, ClipboardCheck,
  Filter, RefreshCw, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { labService } from '../../services/labService';
import MetricCard from '../patients/components/MetricCard';
import PriorityBadge from './components/PriorityBadge';
import LabStatusBadge from './components/LabStatusBadge';

const sel = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white';

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'STAT', label: 'STAT' },
  { value: 'URGENT', label: 'Urgent' },
  { value: 'ROUTINE', label: 'Routine' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'ORDERED', label: 'Ordered' },
  { value: 'SPECIMEN_COLLECTED', label: 'Specimen Collected' },
];

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'HAEMATOLOGY', label: 'Haematology' },
  { value: 'BIOCHEMISTRY', label: 'Biochemistry' },
  { value: 'MICROBIOLOGY', label: 'Microbiology' },
  { value: 'SEROLOGY', label: 'Serology' },
  { value: 'URINALYSIS', label: 'Urinalysis' },
  { value: 'OTHER', label: 'Other' },
];

function fmtTime(iso) {
  if (!iso) return '—';
  const diff = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (diff < 1) return '< 1 min';
  if (diff < 60) return `${diff} min`;
  const h = Math.floor(diff / 60), m = diff % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function LabQueuePage() {
  const navigate = useNavigate();
  const [queue, setQueue]         = useState([]);
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [countdown, setCountdown] = useState(30);
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus]     = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDate, setFilterDate]         = useState('');
  const intervalRef = useRef(null);
  const countRef    = useRef(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const [queueRes, todayRes] = await Promise.all([
        labService.getQueue(),
        labService.getOrders({ date_from: today, date_to: today }),
      ]);
      const queueData   = queueRes.data.results  ?? queueRes.data;
      const todayOrders = todayRes.data.results  ?? todayRes.data;

      setQueue(queueData);
      setStats({
        pending:   queueData.filter((o) => o.status === 'ORDERED').length,
        collected: queueData.filter((o) => o.status === 'SPECIMEN_COLLECTED').length,
        resulted:  todayOrders.filter((o) => o.status === 'RESULTED').length,
        verified:  todayOrders.filter((o) => o.status === 'VERIFIED').length,
      });
    } catch {
      if (!silent) toast.error('Failed to load lab queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    intervalRef.current = setInterval(() => {
      setCountdown(30);
      fetchData(true);
    }, 30000);

    countRef.current = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 30));
    }, 1000);

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

  const clearFilters = () => {
    setFilterPriority('');
    setFilterStatus('');
    setFilterCategory('');
    setFilterDate('');
  };

  const hasFilters = filterPriority || filterStatus || filterCategory || filterDate;

  const filtered = queue.filter((o) => {
    if (filterPriority && o.priority !== filterPriority) return false;
    if (filterStatus  && o.status   !== filterStatus)   return false;
    if (filterCategory && !o.test_categories?.includes(filterCategory)) return false;
    if (filterDate) {
      const orderDate = new Date(o.ordered_at).toISOString().split('T')[0];
      if (orderDate !== filterDate) return false;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={FlaskConical}    label="Pending Orders"     value={stats?.pending   ?? null} color="text-yellow-600" />
        <MetricCard icon={TestTube}        label="Specimen Collected" value={stats?.collected ?? null} color="text-blue-600" />
        <MetricCard icon={ClipboardCheck}  label="Resulted Today"     value={stats?.resulted  ?? null} color="text-orange-600" />
        <MetricCard icon={CheckCircle2}    label="Verified Today"     value={stats?.verified  ?? null} color="text-green-600" />
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
          <Filter className="w-4 h-4" />
          Filter:
        </div>

        <select className={sel} value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select className={sel} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select className={sel} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <input
          type="date"
          className={sel}
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />

        {hasFilters && (
          <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 underline">
            Clear all
          </button>
        )}

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
      ) : filtered.length === 0 ? (
        <EmptyState hasQueue={queue.length > 0} onClear={clearFilters} />
      ) : (
        <>
          <p className="text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-700">{filtered.length}</span>{' '}
            order{filtered.length !== 1 ? 's' : ''}
          </p>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Order #</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Patient</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tests</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Priority</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ordered By</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => navigate(`/laboratory/order/${order.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-semibold text-primary">
                        {order.order_number}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-800">{order.patient_display?.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{order.patient_display?.patient_id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700">
                        {order.test_codes?.length > 3
                          ? `${order.test_codes.slice(0, 3).join(', ')} +${order.test_codes.length - 3}`
                          : order.test_codes?.join(', ') || '—'}
                      </p>
                      <p className="text-xs text-gray-400">{order.items_count} test{order.items_count !== 1 ? 's' : ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={order.priority} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{order.ordered_by_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{fmtTime(order.ordered_at)}</td>
                    <td className="px-4 py-3">
                      <LabStatusBadge status={order.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
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
          <div className="h-4 bg-gray-200 rounded w-28" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 bg-gray-200 rounded w-40" />
            <div className="h-3 bg-gray-100 rounded w-24" />
          </div>
          <div className="h-4 bg-gray-100 rounded w-24" />
          <div className="h-5 bg-gray-200 rounded-full w-16" />
          <div className="h-4 bg-gray-100 rounded w-28" />
          <div className="h-4 bg-gray-100 rounded w-14" />
          <div className="h-5 bg-gray-200 rounded-full w-24" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasQueue, onClear }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 py-20 text-center">
      <FlaskConical className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500 font-medium">
        {hasQueue ? 'No orders match the current filters.' : 'No pending lab orders right now.'}
      </p>
      {hasQueue && (
        <button onClick={onClear} className="mt-2 text-sm text-primary underline">
          Clear filters
        </button>
      )}
    </div>
  );
}
