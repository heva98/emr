import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Clock, Users, Stethoscope, CheckCircle2, RefreshCw,
  Filter, LayoutList, LayoutGrid,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { opdService } from '../../services/opdService';
import { roomsService } from '../../services/roomsService';
import MetricCard from '../patients/components/MetricCard';
import QueueCard from './components/QueueCard';
import QueueRow from './components/QueueRow';
import TriageModal from './components/TriageModal';

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'WAITING', label: 'Waiting' },
  { value: 'TRIAGE_DONE', label: 'Triage Done' },
];

const sel = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white';

export default function OPDQueuePage() {
  const [queue, setQueue]           = useState([]);
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [countdown, setCountdown]   = useState(30);
  const [filterStatus, setFilterStatus] = useState('');
  const [viewMode, setViewMode]     = useState('list'); // 'list' | 'grid'
  const [triageVisit, setTriageVisit] = useState(null);
  const [roomsByDoctor, setRoomsByDoctor] = useState({});
  const intervalRef = useRef(null);
  const countRef    = useRef(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [queueRes, statsRes, assignRes] = await Promise.all([
        opdService.getQueue(),
        opdService.getStats(),
        roomsService.getTodayAssignments().catch(() => ({ data: [] })),
      ]);
      setQueue(queueRes.data.results ?? queueRes.data);
      setStats(statsRes.data);

      // Build doctorId → room_number lookup from today's active assignments
      const assignments = assignRes.data.results ?? assignRes.data;
      const map = {};
      assignments.forEach((a) => {
        map[a.doctor] = a.room_number;
      });
      setRoomsByDoctor(map);
    } catch {
      if (!silent) toast.error('Failed to load OPD queue.');
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

  const handleManualRefresh = () => {
    setCountdown(30);
    fetchData(true);
    toast.success('Queue refreshed.');
  };

  const handleTriageSuccess = () => {
    setTriageVisit(null);
    fetchData(true);
  };

  const filtered = queue.filter((v) => {
    if (filterStatus && v.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Clock}        label="Waiting"         value={stats?.waiting ?? null}         color="text-yellow-600" />
        <MetricCard icon={Filter}       label="Triage Done"     value={stats?.triage_done ?? null}     color="text-blue-600" />
        <MetricCard icon={Stethoscope}  label="With Doctor"     value={stats?.with_doctor ?? null}     color="text-purple-600" />
        <MetricCard icon={CheckCircle2} label="Completed Today" value={stats?.completed_today ?? null} color="text-green-600" />
      </div>

      {/* Filter + view toggle bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex flex-wrap items-center gap-3">
        {/* Status filter */}
        <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
          <Filter className="w-4 h-4" />
          Filter:
        </div>

        <select
          className={sel}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          {STATUS_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {filterStatus && (
          <button
            onClick={() => setFilterStatus('')}
            className="text-xs text-red-500 hover:text-red-700 underline"
          >
            Clear
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Auto-refresh countdown */}
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

        {/* View toggle */}
        <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setViewMode('list')}
            title="List view"
            className={`p-2 transition-colors ${
              viewMode === 'list'
                ? 'bg-primary text-white'
                : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            <LayoutList className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            title="Grid view"
            className={`p-2 transition-colors border-l border-gray-200 ${
              viewMode === 'grid'
                ? 'bg-primary text-white'
                : 'text-gray-400 hover:bg-gray-50'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSkeleton mode={viewMode} />
      ) : filtered.length === 0 ? (
        <EmptyState
          hasQueue={queue.length > 0}
          onClear={() => setFilterStatus('')}
        />
      ) : (
        <>
          <p className="text-sm text-gray-500">
            Showing{' '}
            <span className="font-semibold text-gray-700">{filtered.length}</span>{' '}
            patient{filtered.length !== 1 ? 's' : ''}
          </p>

          {viewMode === 'list' ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Patient</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Waiting</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((visit) => (
                    <QueueRow
                      key={visit.id}
                      visit={visit}
                      roomNumber={roomsByDoctor[visit.doctor_info?.id] ?? null}
                      onTriage={(v) => setTriageVisit(v)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((visit) => (
                <QueueCard
                  key={visit.id}
                  visit={visit}
                  roomNumber={roomsByDoctor[visit.doctor_info?.id] ?? null}
                  onTriage={(v) => setTriageVisit(v)}
                />
              ))}
            </div>
          )}
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

function LoadingSkeleton({ mode }) {
  if (mode === 'list') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
        <div className="h-10 bg-gray-50 border-b border-gray-100" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-50 last:border-0">
            <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 bg-gray-200 rounded w-40" />
              <div className="h-3 bg-gray-100 rounded w-24" />
            </div>
            <div className="h-5 bg-gray-200 rounded-full w-20" />
            <div className="h-4 bg-gray-100 rounded w-16" />
            <div className="h-4 bg-gray-100 rounded w-14" />
            <div className="h-7 bg-gray-200 rounded-lg w-28 ml-auto" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-44 animate-pulse">
          <div className="flex justify-between mb-3">
            <div className="h-5 bg-gray-200 rounded-full w-24" />
            <div className="h-4 bg-gray-100 rounded w-14" />
          </div>
          <div className="h-4 bg-gray-200 rounded w-36 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-24 mb-4" />
          <div className="h-8 bg-gray-200 rounded-lg mt-auto" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasQueue, onClear }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 py-20 text-center">
      <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500 font-medium">
        {hasQueue
          ? 'No patients match the current filter.'
          : 'No patients in queue right now.'}
      </p>
      {hasQueue && (
        <button onClick={onClear} className="mt-2 text-sm text-primary underline">
          Clear filter
        </button>
      )}
    </div>
  );
}
