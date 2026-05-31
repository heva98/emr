import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Calendar, Award } from 'lucide-react';
import { reportsService } from '../../../services/reportsService';
import { today, daysAgo, fmtTZS, fmtPeriod, sumField } from '../utils';
import DateRangePicker from '../components/DateRangePicker';
import GroupByToggle from '../components/GroupByToggle';
import ChartCard from '../components/ChartCard';
import EmptyState from '../components/EmptyState';

function MoneyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, e) => s + (e.value || 0), 0);
  return (
    <div className="bg-white border border-gray-200 rounded shadow-sm p-2.5 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((e, i) => (
        <p key={i} style={{ color: e.color }}>
          {e.name}: {fmtTZS(e.value)}
        </p>
      ))}
      <p className="border-t border-gray-100 mt-1 pt-1 font-semibold text-gray-700">
        Total: {fmtTZS(total)}
      </p>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-5 flex items-center gap-3">
      <div className={`p-2.5 rounded-full bg-gray-100 ${color || 'text-primary'}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-lg font-bold text-gray-800 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function RevenueTab() {
  const [range, setRange] = useState({ dateFrom: daysAgo(29), dateTo: today() });
  const [pendingRange, setPendingRange] = useState(range);
  const [groupBy, setGroupBy] = useState('day');
  const [trend, setTrend] = useState([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [trendError, setTrendError] = useState(null);
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [sortCol, setSortCol] = useState('total_tzs');
  const [sortDir, setSortDir] = useState('desc');

  const fetchData = useCallback(async () => {
    setTrendLoading(true);
    setServicesLoading(true);
    setTrendError(null);
    try {
      const [trendRes, svcRes] = await Promise.all([
        reportsService.getRevenueTrend({
          date_from: range.dateFrom,
          date_to: range.dateTo,
          group_by: groupBy,
        }),
        reportsService.getRevenueByService({
          date_from: range.dateFrom,
          date_to: range.dateTo,
        }),
      ]);
      setTrend(trendRes.data.map((r) => ({ ...r, label: fmtPeriod(r.period) })));
      setServices(svcRes.data);
    } catch {
      setTrendError('Failed to load revenue data');
    } finally {
      setTrendLoading(false);
      setServicesLoading(false);
    }
  }, [range, groupBy]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalRevenue = sumField(trend, 'total_tzs');
  const days = trend.length || 1;
  const dailyAvg = Math.round(totalRevenue / days);
  const topService = services[0]?.service_name || services[0]?.service_type || '—';

  const sorted = [...services].sort((a, b) => {
    const sign = sortDir === 'asc' ? 1 : -1;
    return (a[sortCol] - b[sortCol]) * sign;
  });

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('desc'); }
  };

  const SortIcon = ({ col }) => (
    <span className="ml-1 text-gray-400">
      {sortCol === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );

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
        <SummaryCard icon={TrendingUp} label="Total Period Revenue" value={fmtTZS(totalRevenue)} color="text-primary" />
        <SummaryCard icon={Calendar} label="Daily Average" value={fmtTZS(dailyAvg)} />
        <SummaryCard icon={Award} label="Top Service Type" value={topService} />
      </div>

      {/* Stacked area chart */}
      <ChartCard
        title="Revenue Trend"
        subtitle="Cash and Mobile Money stacked"
        loading={trendLoading}
        error={trendError}
        height={320}
      >
        {trend.length === 0 ? (
          <EmptyState height={320} />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={trend} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00857C" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00857C" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="mobileGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11 }}
                width={50}
              />
              <Tooltip content={<MoneyTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="cash_tzs"
                name="Cash"
                stackId="1"
                stroke="#00857C"
                fill="url(#cashGrad)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="mobile_money_tzs"
                name="Mobile Money"
                stackId="1"
                stroke="#3b82f6"
                fill="url(#mobileGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Revenue by service table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Revenue by Service</h3>
        </div>
        {servicesLoading ? (
          <div className="p-5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 animate-pulse rounded mb-2" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No data for this period</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3 text-left">Service</th>
                  <th
                    className="px-5 py-3 text-left cursor-pointer hover:text-gray-700 select-none"
                    onClick={() => handleSort('service_type')}
                  >
                    Type <SortIcon col="service_type" />
                  </th>
                  <th
                    className="px-5 py-3 text-right cursor-pointer hover:text-gray-700 select-none"
                    onClick={() => handleSort('total_quantity')}
                  >
                    Qty <SortIcon col="total_quantity" />
                  </th>
                  <th
                    className="px-5 py-3 text-right cursor-pointer hover:text-gray-700 select-none"
                    onClick={() => handleSort('total_tzs')}
                  >
                    Total (TZS) <SortIcon col="total_tzs" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">
                      {row.service_name || '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{row.service_type}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{row.total_quantity}</td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-800">
                      {fmtTZS(row.total_tzs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
