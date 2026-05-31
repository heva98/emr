import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Pill, CheckCircle2, Clock, RefreshCw, Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { pharmacyService } from '../../../services/pharmacyService';
import MetricCard from '../../patients/components/MetricCard';
import RxStatusBadge from './components/RxStatusBadge';

const sel = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white';

function fmtTime(iso) {
  if (!iso) return '—';
  const diff = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (diff < 1) return '< 1 min';
  if (diff < 60) return `${diff} min`;
  const h = Math.floor(diff / 60), m = diff % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-TZ', { hour: '2-digit', minute: '2-digit' });
}

export default function DispensingQueuePage() {
  const navigate = useNavigate();
  const [queue, setQueue]         = useState([]);
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [countdown, setCountdown] = useState(30);
  const [filterStatus, setFilterStatus] = useState('');
  const intervalRef = useRef(null);
  const countRef    = useRef(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const [queueRes, todayRes] = await Promise.all([
        pharmacyService.getDispensingQueue(),
        pharmacyService.getPrescriptions({ date_from: today, date_to: today }),
      ]);
      const queueData  = queueRes.data.results  ?? queueRes.data;
      const todayData  = todayRes.data.results  ?? todayRes.data;

      setQueue(queueData);
      setStats({
        pending:   queueData.filter((p) => p.status === 'PENDING').length,
        partial:   queueData.filter((p) => p.status === 'PARTIALLY_DISPENSED').length,
        dispensed: todayData.filter((p) => p.status === 'DISPENSED').length,
      });
    } catch {
      if (!silent) toast.error('Failed to load dispensing queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(() => { setCountdown(30); fetchData(true); }, 30000);
    countRef.current    = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 30)), 1000);
    return () => { clearInterval(intervalRef.current); clearInterval(countRef.current); };
  }, [fetchData]);

  const handleRefresh = () => { setCountdown(30); fetchData(true); toast.success('Queue refreshed.'); };

  const filtered = queue.filter((p) => !filterStatus || p.status === filterStatus);

  return (
    <div className="space-y-5">
      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard icon={Pill}         label="Pending Prescriptions" value={stats?.pending   ?? null} color="text-yellow-600" />
        <MetricCard icon={CheckCircle2} label="Dispensed Today"       value={stats?.dispensed ?? null} color="text-green-600" />
        <MetricCard icon={Clock}        label="Partially Dispensed"   value={stats?.partial   ?? null} color="text-blue-600" />
      </div>

      {/* Filter / refresh bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
          <Filter className="w-4 h-4" />
          Filter:
        </div>
        <select className={sel} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PARTIALLY_DISPENSED">Partially Dispensed</option>
        </select>
        {filterStatus && (
          <button onClick={() => setFilterStatus('')} className="text-xs text-red-500 hover:text-red-700 underline">
            Clear
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
        <EmptyState />
      ) : (
        <>
          <p className="text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-700">{filtered.length}</span>{' '}
            prescription{filtered.length !== 1 ? 's' : ''}
          </p>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rx #</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Patient</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Drugs</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Prescribed By</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">At</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((rx) => (
                  <tr
                    key={rx.id}
                    onClick={() => navigate(`/pharmacy/dispensing/${rx.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-semibold text-primary">
                        {rx.prescription_number}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-800">{rx.patient_display?.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{rx.patient_display?.patient_id}</p>
                    </td>
                    <td className="px-4 py-3">
                      {rx.items?.length > 0 ? (
                        <>
                          <p className="text-sm text-gray-700">
                            {rx.items.slice(0, 2).map((i) => i.drug_name).join(', ')}
                            {rx.items.length > 2 && (
                              <span className="text-gray-400"> +{rx.items.length - 2} more</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400">
                            {rx.items.length} drug{rx.items.length !== 1 ? 's' : ''}
                          </p>
                        </>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{rx.prescribed_by_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{fmtTime(rx.prescribed_at)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{fmtDate(rx.prescribed_at)}</td>
                    <td className="px-4 py-3">
                      <RxStatusBadge status={rx.status} />
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
          <div className="h-4 bg-gray-100 rounded w-32" />
          <div className="h-4 bg-gray-100 rounded w-24" />
          <div className="h-4 bg-gray-100 rounded w-14" />
          <div className="h-5 bg-gray-200 rounded-full w-20" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 py-20 text-center">
      <Pill className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500 font-medium">No pending prescriptions in the queue.</p>
      <p className="text-gray-400 text-sm mt-1">All prescriptions have been dispensed today.</p>
    </div>
  );
}
