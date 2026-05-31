import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Activity, Calendar, AlertTriangle } from 'lucide-react';
import { reportsService } from '../../../services/reportsService';
import { today, daysAgo, fmtPeriod, sumField } from '../utils';
import DateRangePicker from '../components/DateRangePicker';
import GroupByToggle from '../components/GroupByToggle';
import ChartCard from '../components/ChartCard';
import EmptyState from '../components/EmptyState';

// Triage level colors per clinical convention
const TRIAGE_COLORS = {
  '1': '#ef4444', // red — critical
  '2': '#f97316', // orange — urgent
  '3': '#eab308', // yellow — moderate
  '4': '#3b82f6', // blue — minor
  '5': '#22c55e', // green — minimal
};
const TRIAGE_LABELS = {
  '1': 'Level 1 — Critical',
  '2': 'Level 2 — Urgent',
  '3': 'Level 3 — Moderate',
  '4': 'Level 4 — Minor',
  '5': 'Level 5 — Minimal',
};

export default function OpdTab() {
  const [range, setRange] = useState({ dateFrom: daysAgo(29), dateTo: today() });
  const [pendingRange, setPendingRange] = useState(range);
  const [groupBy, setGroupBy] = useState('day');

  const [visits, setVisits] = useState({ periods: [], visit_counts: [], by_triage_level: {} });
  const [visitsLoading, setVisitsLoading] = useState(true);
  const [visitsError, setVisitsError] = useState(null);

  const [diagnoses, setDiagnoses] = useState([]);
  const [diagnosesLoading, setDiagnosesLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setVisitsLoading(true);
    setDiagnosesLoading(true);
    setVisitsError(null);
    try {
      const [visitsRes, dxRes] = await Promise.all([
        reportsService.getOpdVisits({
          date_from: range.dateFrom,
          date_to: range.dateTo,
          group_by: groupBy,
        }),
        reportsService.getTopDiagnoses({
          date_from: range.dateFrom,
          date_to: range.dateTo,
          limit: 10,
        }),
      ]);
      setVisits(visitsRes.data);
      setDiagnoses(dxRes.data);
    } catch {
      setVisitsError('Failed to load OPD data');
    } finally {
      setVisitsLoading(false);
      setDiagnosesLoading(false);
    }
  }, [range, groupBy]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Build chart data for visits trend
  const trendData = (visits.periods || []).map((p, i) => ({
    label: fmtPeriod(p),
    count: visits.visit_counts?.[i] ?? 0,
  }));

  const totalVisits = sumField(trendData, 'count');
  const days = trendData.length || 1;
  const dailyAvg = Math.round(totalVisits / days);

  // Triage pie data
  const triageData = Object.entries(visits.by_triage_level || {})
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({
      name: TRIAGE_LABELS[k] || `Level ${k}`,
      value: v,
      level: k,
    }));

  // Most common triage level
  const mostCommon = Object.entries(visits.by_triage_level || {})
    .sort(([, a], [, b]) => b - a)[0]?.[0];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <DateRangePicker
          dateFrom={pendingRange.dateFrom}
          dateTo={pendingRange.dateTo}
          onChange={setPendingRange}
          onApply={() => setRange(pendingRange)}
        />
        <GroupByToggle value={groupBy} onChange={setGroupBy} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Activity, label: 'Total Visits', value: totalVisits.toLocaleString() },
          { icon: Calendar, label: 'Daily Average', value: dailyAvg.toLocaleString() },
          {
            icon: AlertTriangle,
            label: 'Most Common Triage',
            value: mostCommon ? `Level ${mostCommon}` : '—',
            color: mostCommon ? TRIAGE_COLORS[mostCommon] : undefined,
          },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-lg shadow-sm p-4 flex items-center gap-3">
            <div
              className="p-2.5 rounded-full bg-gray-100"
              style={{ color: s.color || '#00857C' }}
            >
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{s.label}</p>
              <p className="text-xl font-bold text-gray-800 mt-0.5">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Visit volume bar chart */}
      <ChartCard
        title="OPD Visit Volume"
        loading={visitsLoading}
        error={visitsError}
        height={280}
      >
        {trendData.length === 0 ? (
          <EmptyState height={280} />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={35} />
              <Tooltip
                formatter={(v) => [v, 'Visits']}
                labelStyle={{ fontWeight: 600 }}
              />
              <Bar dataKey="count" name="Visits" fill="#00857C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Triage + Diagnoses side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Triage Level Distribution" loading={visitsLoading} height={280}>
          {triageData.length === 0 ? (
            <EmptyState height={280} />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={triageData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {triageData.map((entry) => (
                    <Cell key={entry.level} fill={TRIAGE_COLORS[entry.level] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, name) => [v, name]} />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(value) => <span className="text-gray-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Top 10 Diagnoses"
          loading={diagnosesLoading}
          height={280}
        >
          {diagnoses.length === 0 ? (
            <EmptyState height={280} />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                layout="vertical"
                data={diagnoses}
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                <YAxis
                  type="category"
                  dataKey="diagnosis"
                  width={130}
                  tick={{ fontSize: 9 }}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v) => [v, 'Cases']}
                  labelStyle={{ fontWeight: 600, fontSize: 11 }}
                />
                <Bar dataKey="count" name="Cases" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
