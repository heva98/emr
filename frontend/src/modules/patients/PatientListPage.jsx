import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users, CalendarClock, Activity, UserCheck,
  Search, PlusCircle, Eye, Pencil, ChevronLeft, ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { patientService } from '../../services/patientService';
import MetricCard from './components/MetricCard';

const PAGE_SIZE = 20;
const GENDER_LABELS = { M: 'Male', F: 'Female', OTHER: 'Other' };

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-TZ', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PatientListPage() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({ total: null, today: null });
  const [patients, setPatients] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState('');
  const [gender, setGender] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const debounceRef = useRef(null);

  // Metric cards — fetch total and today's count independently
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    Promise.allSettled([
      patientService.list({ page_size: 1 }),
      patientService.list({ created_at_after: today, created_at_before: today, page_size: 1 }),
    ]).then(([allRes, todayRes]) => {
      setStats({
        total: allRes.status === 'fulfilled' ? allRes.value.data.count : '—',
        today: todayRes.status === 'fulfilled' ? todayRes.value.data.count : '—',
      });
    });
  }, []);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (search) params.search = search;
      if (gender) params.gender = gender;
      if (dateFrom) params.created_at_after = dateFrom;
      if (dateTo) params.created_at_before = dateTo;
      const { data } = await patientService.list(params);
      setPatients(data.results);
      setCount(data.count);
    } catch {
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, [page, search, gender, dateFrom, dateTo]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  function handleSearchInput(e) {
    const val = e.target.value;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 350);
  }

  function filterChange(setter) {
    return (e) => { setter(e.target.value); setPage(1); };
  }

  const totalPages = Math.ceil(count / PAGE_SIZE);

  return (
    <div className="space-y-5">
      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Users}        label="Total Patients"    value={stats.total} />
        <MetricCard icon={CalendarClock} label="Registered Today"  value={stats.today}  color="text-blue-600" />
        <MetricCard icon={Activity}     label="Visits Today"      value="—"            color="text-orange-500" />
        <MetricCard icon={UserCheck}    label="Active Visits"     value="—"            color="text-green-600" />
      </div>

      {/* Filters + Register button */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search name, patient ID, phone…"
              onChange={handleSearchInput}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <select
            value={gender}
            onChange={filterChange(setGender)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Genders</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="OTHER">Other</option>
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={filterChange(setDateFrom)}
            title="Registered from"
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="date"
            value={dateTo}
            onChange={filterChange(setDateTo)}
            title="Registered to"
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <div className="flex-1" />

          <Link
            to="/registration/new"
            className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" />
            Register New Patient
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Patient ID', 'Full Name', 'Age', 'Gender', 'Phone', 'Registered', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide ${h === 'Actions' ? 'text-right' : 'text-left'}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 animate-pulse rounded" style={{ width: `${60 + j * 7}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-gray-400 text-sm">
                    No patients found
                  </td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/registration/${p.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{p.patient_id}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{p.full_name}</td>
                    <td className="px-4 py-3 text-gray-600">{p.age}</td>
                    <td className="px-4 py-3 text-gray-600">{GENDER_LABELS[p.gender] ?? p.gender}</td>
                    <td className="px-4 py-3 text-gray-600">{p.phone_primary}</td>
                    <td className="px-4 py-3 text-gray-500">{fmt(p.created_at)}</td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          onClick={() => navigate(`/registration/${p.id}`)}
                          title="View patient"
                          className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/registration/${p.id}/edit`)}
                          title="Edit patient"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/registration/${p.id}?tab=visits`)}
                          title="New visit"
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                        >
                          <PlusCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && count > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, count)} of {count}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 tabular-nums">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
