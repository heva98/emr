import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Clock, Users, Stethoscope, CheckCircle2, RefreshCw,
  Filter, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { opdService } from '../../services/opdService';
import MetricCard from '../patients/components/MetricCard';
import QueueCard from './components/QueueCard';
import TriageModal from './components/TriageModal';

const TRIAGE_FILTER_OPTIONS = [
  { value: '', label: 'All Levels' },
  { value: '1', label: 'L1 · Resuscitation' },
  { value: '2', label: 'L2 · Emergency' },
  { value: '3', label: 'L3 · Urgent' },
  { value: '4', label: 'L4 · Semi-urgent' },
  { value: '5', label: 'L5 · Non-urgent' },
];

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'WAITING', label: 'Waiting' },
  { value: 'TRIAGE_DONE', label: 'Triage Done' },
];

const sel = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white';

export default function OPDQueuePage() {
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const [filterLevel, setFilterLevel] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [triageVisit, setTriageVisit] = useState(null);
  const intervalRef = useRef(null);
  const countRef = useRef(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [queueRes, statsRes] = await Promise.all([
        opdService.getQueue(),
        opdService.getStats(),
      ]);
      setQueue(queueRes.data.results ?? queueRes.data);
      setStats(statsRes.data);
    } catch {
      if (!silent) toast.error('Failed to load OPD queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + 30-second auto-refresh
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

  const handleManualRefresh = () => {
    setCountdown(30);
    fetchData(true);
    toast.success('Queue refreshed.');
  };

  const handleTriageSuccess = () => {
    setTriageVisit(null);
    fetchData(true);
  };

  // Client-side filtering
  const filtered = queue.filter((v) => {
    if (filterLevel && String(v.triage_level) !== filterLevel) return false;
    if (filterStatus && v.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Clock}
          label="Waiting"
          value={stats?.waiting ?? null}
          color="text-yellow-600"
        />
        <MetricCard
          icon={Filter}
          label="Triage Done"
          value={stats?.triage_done ?? null}
          color="text-blue-600"
        />
        <MetricCard
          icon={Stethoscope}
          label="With Doctor"
          value={stats?.with_doctor ?? null}
          color="text-purple-600"
        />
        <MetricCard
          icon={CheckCircle2}
          label="Completed Today"
          value={stats?.completed_today ?? null}
          color="text-green-600"
        />
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
          <Filter className="w-4 h-4" />
          Filter:
        </div>

        <select
          className={sel}
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
        >
          {TRIAGE_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          className={sel}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          {STATUS_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {(filterLevel || filterStatus) && (
          <button
            onClick={() => { setFilterLevel(''); setFilterStatus(''); }}
            className="text-xs text-red-500 hover:text-red-700 underline"
          >
            Clear filters
          </button>
        )}

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            Refreshing in {countdown}s
          </span>
          <button
            onClick={handleManualRefresh}
            className="flex items-center gap-1.5 text-xs font-medium text-primary border border-primary rounded-lg px-3 py-1.5 hover:bg-primary hover:text-white transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh now
          </button>
        </div>
      </div>

      {/* Queue grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-52 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-2/3 mb-3" />
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-10 bg-gray-100 rounded mb-4" />
              <div className="h-8 bg-gray-200 rounded mt-auto" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 py-20 text-center">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">
            {queue.length === 0 ? 'No patients in queue right now.' : 'No patients match the current filters.'}
          </p>
          {queue.length > 0 && (
            <button
              onClick={() => { setFilterLevel(''); setFilterStatus(''); }}
              className="mt-2 text-sm text-primary underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-700">{filtered.length}</span> patient{filtered.length !== 1 ? 's' : ''}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((visit) => (
              <QueueCard
                key={visit.id}
                visit={visit}
                onTriage={(v) => setTriageVisit(v)}
              />
            ))}
          </div>
        </>
      )}

      {/* Triage modal */}
      {triageVisit && (
        <TriageModal
          visit={triageVisit}
          onClose={() => setTriageVisit(null)}
          onSuccess={handleTriageSuccess}
        />
      )}
    </div>
  );
}
