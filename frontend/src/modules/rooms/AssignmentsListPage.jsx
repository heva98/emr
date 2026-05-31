import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Filter, RefreshCw, UserRound, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { roomsService } from '../../services/roomsService';

const SHIFT_LABELS = {
  MORNING: 'Morning',
  AFTERNOON: 'Afternoon',
  NIGHT: 'Night',
  FULL_DAY: 'Full Day',
};

const SHIFT_COLORS = {
  MORNING: 'bg-yellow-100 text-yellow-700',
  AFTERNOON: 'bg-orange-100 text-orange-700',
  NIGHT: 'bg-indigo-100 text-indigo-700',
  FULL_DAY: 'bg-blue-100 text-blue-700',
};

const sel = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fmtTime(t) {
  if (!t) return '—';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

export default function AssignmentsListPage() {
  const [assignments, setAssignments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filterDate, setFilterDate] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [todayOnly, setTodayOnly] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterDate) params.date = filterDate;
      if (filterDoctor) params.doctor = filterDoctor;
      if (filterDept) params.department = filterDept;

      const [assignRes, deptRes, docRes] = await Promise.all([
        todayOnly
          ? roomsService.getTodayAssignments()
          : roomsService.getAssignments(params),
        roomsService.getDepartments(),
        roomsService.getDoctors(),
      ]);

      const data = assignRes.data.results ?? assignRes.data;
      setAssignments(data);
      setDepartments(deptRes.data.results ?? deptRes.data);
      setDoctors(docRes.data.results ?? docRes.data);
    } catch {
      toast.error('Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterDoctor, filterDept, todayOnly]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDeactivate = async (id) => {
    try {
      await roomsService.deactivateAssignment(id);
      toast.success('Assignment deactivated.');
      fetchData();
    } catch {
      toast.error('Failed to deactivate assignment.');
    }
  };

  const clearFilters = () => {
    setFilterDate('');
    setFilterDoctor('');
    setFilterDept('');
    setTodayOnly(false);
  };
  const hasFilters = filterDate || filterDoctor || filterDept || todayOnly;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Doctor–Room Assignments</h1>
          <p className="text-sm text-gray-400 mt-0.5">{assignments.length} record{assignments.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setTodayOnly(true); setFilterDate(''); }}
            className={`flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-1.5 border transition-colors ${
              todayOnly
                ? 'bg-primary text-white border-primary'
                : 'text-primary border-primary hover:bg-primary hover:text-white'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Today's
          </button>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-sm text-gray-600 font-medium">
          <Filter className="w-4 h-4" />
          Filter:
        </span>

        <input
          type="date"
          className={sel}
          value={filterDate}
          onChange={(e) => { setFilterDate(e.target.value); setTodayOnly(false); }}
        />

        <select className={sel} value={filterDoctor} onChange={(e) => setFilterDoctor(e.target.value)}>
          <option value="">All Doctors</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        <select className={sel} value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton />
      ) : assignments.length === 0 ? (
        <EmptyState hasFilters={hasFilters} onClear={clearFilters} />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Doctor', 'Room', 'Department', 'Date', 'Shift', 'Time', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {assignments.map((a) => (
                <AssignmentRow key={a.id} assignment={a} onDeactivate={handleDeactivate} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AssignmentRow({ assignment: a, onDeactivate }) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <UserRound className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="font-medium text-gray-800">{a.doctor_name}</span>
        </div>
      </td>
      <td className="px-4 py-3 font-mono text-gray-700">{a.room_number}</td>
      <td className="px-4 py-3 text-gray-500">{a.department_name}</td>
      <td className="px-4 py-3 text-gray-500">{a.assigned_date}</td>
      <td className="px-4 py-3">
        <span className={`text-xs font-medium rounded-full px-2.5 py-0.5 ${SHIFT_COLORS[a.shift] ?? 'bg-gray-100 text-gray-600'}`}>
          {SHIFT_LABELS[a.shift] ?? a.shift}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-500 tabular-nums">
        {fmtTime(a.start_time)} – {fmtTime(a.end_time)}
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ${a.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {a.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-4 py-3">
        {a.is_active && (
          <button
            onClick={() => onDeactivate(a.id)}
            className="text-xs font-medium text-red-600 hover:text-red-800 border border-red-200 rounded-lg px-2.5 py-1 hover:bg-red-50 transition-colors"
          >
            Deactivate
          </button>
        )}
      </td>
    </tr>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
      <div className="h-10 bg-gray-50 border-b border-gray-100" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-50 last:border-0">
          <div className="w-7 h-7 rounded-full bg-gray-200 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 bg-gray-200 rounded w-32" />
          </div>
          {Array.from({ length: 5 }).map((__, j) => (
            <div key={j} className="h-4 bg-gray-100 rounded w-16" />
          ))}
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasFilters, onClear }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 py-20 text-center">
      <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500 font-medium">
        {hasFilters ? 'No assignments match the current filters.' : 'No assignments found.'}
      </p>
      {hasFilters && (
        <button onClick={onClear} className="mt-2 text-sm text-primary underline">
          Clear filters
        </button>
      )}
    </div>
  );
}
