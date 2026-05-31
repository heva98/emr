import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  RefreshCw, Users, Activity, FlaskConical, Pill, DollarSign, FileText,
} from 'lucide-react';
import { reportsService } from '../../../services/reportsService';
import { today, daysAgo, fmtTZS, fmtPeriod } from '../utils';
import ChartCard from '../components/ChartCard';
import EmptyState from '../components/EmptyState';

function MoneyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded shadow-sm p-2.5 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((e, i) => (
        <p key={i} style={{ color: e.color }}>
          {e.name}: {fmtTZS(e.value)}
        </p>
      ))}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, loading, highlight }) {
  return (
    <div
      className={`rounded-lg shadow-sm p-5 flex items-center gap-4 ${
        highlight ? 'bg-primary text-white' : 'bg-white'
      }`}
    >
      <div className={`p-3 rounded-full ${highlight ? 'bg-white/20' : 'bg-gray-100 text-primary'}`}>
        <Icon className={`w-5 h-5 ${highlight ? 'text-white' : ''}`} />
      </div>
      <div>
        <p className={`text-xs font-semibold uppercase tracking-wide ${highlight ? 'text-white/80' : 'text-gray-500'}`}>
          {label}
        </p>
        <p className={`text-xl font-bold mt-0.5 ${highlight ? 'text-white text-2xl' : 'text-gray-800'}`}>
          {loading ? (
            <span className={`inline-block w-16 h-6 rounded animate-pulse ${highlight ? 'bg-white/30' : 'bg-gray-200'}`} />
          ) : (
            value
          )}
        </p>
      </div>
    </div>
  );
}

export default function OverviewTab() {
  const [date, setDate] = useState(today());
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [trend, setTrend] = useState([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [trendError, setTrendError] = useState(null);
  const [byService, setByService] = useState([]);
  const [byServiceLoading, setByServiceLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const { data } = await reportsService.getDashboardSummary(date);
      setSummary(data);
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [date]);

  const fetchCharts = useCallback(async () => {
    setTrendLoading(true);
    setByServiceLoading(true);
    setTrendError(null);
    try {
      const [trendRes, svcRes] = await Promise.all([
        reportsService.getRevenueTrend({
          date_from: daysAgo(6),
          date_to: today(),
          group_by: 'day',
        }),
        reportsService.getRevenueByService({ date_from: date, date_to: date }),
      ]);
      setTrend(
        trendRes.data.map((r) => ({ ...r, label: fmtPeriod(r.period) }))
      );
      setByService(
        svcRes.data.map((r) => ({
          ...r,
          name: r.service_name || r.service_type,
        }))
      );
    } catch {
      setTrendError('Failed to load chart data');
    } finally {
      setTrendLoading(false);
      setByServiceLoading(false);
    }
  }, [date]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { fetchCharts(); }, [fetchCharts]);

  const g = (key) => (summaryLoading ? null : summary?.[key] ?? 0);

  const METRICS = [
    { icon: Users, label: 'Patients Registered', value: g('patients_registered') },
    { icon: Activity, label: 'OPD Visits', value: g('opd_visits') },
    { icon: FlaskConical, label: 'Lab Orders', value: g('lab_orders') },
    { icon: Pill, label: 'Prescriptions Dispensed', value: g('prescriptions_dispensed') },
    {
      icon: DollarSign,
      label: 'Total Collected',
      value: summaryLoading ? null : fmtTZS(summary?.total_collected_tzs ?? 0),
      highlight: true,
    },
    { icon: FileText, label: 'Pending Invoices', value: g('invoices_pending') },
  ];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
          Dashboard Summary
        </h2>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={() => { fetchSummary(); fetchCharts(); }}
            className="p-2 rounded-md border border-gray-200 hover:bg-gray-50 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {METRICS.map((m) => (
          <StatCard
            key={m.label}
            icon={m.icon}
            label={m.label}
            value={m.value}
            loading={summaryLoading}
            highlight={m.highlight}
          />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Revenue — Last 7 Days"
          subtitle="Cash vs Mobile Money"
          loading={trendLoading}
          error={trendError}
          height={280}
        >
          {trend.length === 0 ? (
            <EmptyState height={280} />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11 }}
                  width={45}
                />
                <Tooltip content={<MoneyTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="cash_tzs"
                  name="Cash"
                  stroke="#00857C"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="mobile_money_tzs"
                  name="Mobile Money"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Collections by Service — Today"
          loading={byServiceLoading}
          height={280}
        >
          {byService.length === 0 ? (
            <EmptyState height={280} />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={byService}
                margin={{ top: 5, right: 20, left: 0, bottom: 50 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11 }}
                  width={45}
                />
                <Tooltip
                  formatter={(v) => [fmtTZS(v), 'Revenue']}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Bar
                  dataKey="total_tzs"
                  name="Revenue"
                  fill="#00857C"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
