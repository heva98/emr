import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Users, Calendar, TrendingUp, Clock } from 'lucide-react';
import { reportsService } from '../../../services/reportsService';
import {
  today, daysAgo, startOfWeek, startOfMonth, startOfYear,
  fmtTZS, fmtPeriod, sumField,
} from '../utils';
import DateRangePicker from '../components/DateRangePicker';
import GroupByToggle from '../components/GroupByToggle';
import ChartCard from '../components/ChartCard';
import EmptyState from '../components/EmptyState';

const PIE_COLORS_GENDER = ['#00857C', '#3b82f6', '#8b5cf6'];
const PIE_COLORS_AGE = ['#f59e0b', '#f97316', '#ef4444', '#8b5cf6', '#06b6d4'];
const PIE_COLORS_BLOOD = ['#00857C', '#10b981', '#3b82f6', '#6366f1', '#ec4899', '#f97316', '#ef4444', '#84cc16', '#6b7280'];

function SmallPie({ data, colors, title }) {
  return (
    <div className="flex flex-col items-center">
      <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">{title}</p>
      {data.length === 0 ? (
        <EmptyState height={180} message="No data" />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="45%"
              outerRadius={70}
              paddingAngle={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v, name) => [v, name]} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={(value) => <span className="text-gray-600">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default function PatientsTab() {
  const [range, setRange] = useState({ dateFrom: daysAgo(29), dateTo: today() });
  const [pendingRange, setPendingRange] = useState(range);
  const [groupBy, setGroupBy] = useState('day');
  const [trend, setTrend] = useState([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [demographics, setDemographics] = useState(null);
  const [demoLoading, setDemoLoading] = useState(true);

  // Summary counts for different periods
  const [summaryToday, setSummaryToday] = useState(null);
  const [summaryWeek, setSummaryWeek] = useState(null);
  const [summaryMonth, setSummaryMonth] = useState(null);
  const [summaryAll, setSummaryAll] = useState(null);

  const fetchTrend = useCallback(async () => {
    setTrendLoading(true);
    try {
      const { data } = await reportsService.getPatientRegistrations({
        date_from: range.dateFrom,
        date_to: range.dateTo,
        group_by: groupBy,
      });
      setTrend(data.map((r) => ({ ...r, label: fmtPeriod(r.period) })));
    } catch {
      setTrend([]);
    } finally {
      setTrendLoading(false);
    }
  }, [range, groupBy]);

  const fetchSummaries = useCallback(async () => {
    const t = today();
    try {
      const [todayRes, weekRes, monthRes, allRes] = await Promise.all([
        reportsService.getPatientRegistrations({ date_from: t, date_to: t, group_by: 'day' }),
        reportsService.getPatientRegistrations({ date_from: startOfWeek(), date_to: t, group_by: 'day' }),
        reportsService.getPatientRegistrations({ date_from: startOfMonth(), date_to: t, group_by: 'day' }),
        reportsService.getPatientRegistrations({ date_from: startOfYear(), date_to: t, group_by: 'month' }),
      ]);
      setSummaryToday(sumField(todayRes.data, 'count'));
      setSummaryWeek(sumField(weekRes.data, 'count'));
      setSummaryMonth(sumField(monthRes.data, 'count'));
      setSummaryAll(sumField(allRes.data, 'count'));
    } catch {
      // ignore
    }
  }, []);

  const fetchDemographics = useCallback(async () => {
    setDemoLoading(true);
    try {
      const { data } = await reportsService.getPatientDemographics();
      setDemographics(data);
    } catch {
      setDemographics(null);
    } finally {
      setDemoLoading(false);
    }
  }, []);

  useEffect(() => { fetchTrend(); }, [fetchTrend]);
  useEffect(() => { fetchSummaries(); fetchDemographics(); }, [fetchSummaries, fetchDemographics]);

  const SUMMARY = [
    { icon: Users, label: 'Total All Time', value: summaryAll },
    { icon: Calendar, label: 'This Month', value: summaryMonth },
    { icon: TrendingUp, label: 'This Week', value: summaryWeek },
    { icon: Clock, label: 'Today', value: summaryToday },
  ];

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {SUMMARY.map((s) => (
          <div key={s.label} className="bg-white rounded-lg shadow-sm p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-gray-100 text-primary">
              <s.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{s.label}</p>
              <p className="text-xl font-bold text-gray-800 mt-0.5">
                {s.value === null ? (
                  <span className="inline-block w-12 h-5 bg-gray-200 animate-pulse rounded" />
                ) : (
                  s.value.toLocaleString()
                )}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Registrations trend */}
      <ChartCard
        title="Patient Registrations Over Time"
        loading={trendLoading}
        height={280}
      >
        {trend.length === 0 ? (
          <EmptyState height={280} />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={35} />
              <Tooltip
                formatter={(v) => [v, 'Registrations']}
                labelStyle={{ fontWeight: 600 }}
              />
              <Line
                type="monotone"
                dataKey="count"
                name="Registrations"
                stroke="#00857C"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Demographics pie charts */}
      <div className="bg-white rounded-lg shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-6">Patient Demographics</h3>
        {demoLoading ? (
          <div className="grid grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-52 bg-gray-100 animate-pulse rounded-md" />
            ))}
          </div>
        ) : !demographics ? (
          <EmptyState message="Could not load demographics" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <SmallPie
              data={demographics.gender || []}
              colors={PIE_COLORS_GENDER}
              title="Gender"
            />
            <SmallPie
              data={demographics.age_groups || []}
              colors={PIE_COLORS_AGE}
              title="Age Groups"
            />
            <SmallPie
              data={demographics.blood_groups || []}
              colors={PIE_COLORS_BLOOD}
              title="Blood Groups"
            />
          </div>
        )}
      </div>
    </div>
  );
}
