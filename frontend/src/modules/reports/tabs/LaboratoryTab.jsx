import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { reportsService } from '../../../services/reportsService';
import { today, daysAgo } from '../utils';
import DateRangePicker from '../components/DateRangePicker';
import ChartCard from '../components/ChartCard';
import EmptyState from '../components/EmptyState';

const CATEGORY_COLORS = {
  HAEMATOLOGY: '#ef4444',
  BIOCHEMISTRY: '#f97316',
  MICROBIOLOGY: '#8b5cf6',
  SEROLOGY: '#3b82f6',
  URINALYSIS: '#06b6d4',
  OTHER: '#6b7280',
};
const PIE_COLORS = Object.values(CATEGORY_COLORS);

function CompletionBadge({ pct }) {
  if (pct >= 80) return <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">{pct}%</span>;
  if (pct >= 50) return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">{pct}%</span>;
  return <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">{pct}%</span>;
}

export default function LaboratoryTab() {
  const [range, setRange] = useState({ dateFrom: daysAgo(29), dateTo: today() });
  const [pendingRange, setPendingRange] = useState(range);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await reportsService.getLabTestVolumes({
        date_from: range.dateFrom,
        date_to: range.dateTo,
      });
      setTests(data);
    } catch {
      setError('Failed to load lab data');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Group by category for pie and grouped bar
  const byCategory = Object.entries(
    tests.reduce((acc, t) => {
      acc[t.category] = acc[t.category] || { ordered: 0, resulted: 0 };
      acc[t.category].ordered += t.total_ordered;
      acc[t.category].resulted += t.total_resulted;
      return acc;
    }, {})
  ).map(([cat, v]) => ({ category: cat, ...v }));

  const pieData = byCategory.map((c) => ({ name: c.category, value: c.ordered }));

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <DateRangePicker
          dateFrom={pendingRange.dateFrom}
          dateTo={pendingRange.dateTo}
          onChange={setPendingRange}
          onApply={() => setRange(pendingRange)}
        />
      </div>

      {/* Ordered vs Resulted by Category (grouped bar) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Orders vs Results by Category"
          subtitle="Total ordered and resulted per test category"
          loading={loading}
          error={error}
          height={300}
        >
          {byCategory.length === 0 ? (
            <EmptyState height={300} />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byCategory} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 10 }}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={35} />
                <Tooltip labelStyle={{ fontWeight: 600 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="ordered" name="Ordered" fill="#00857C" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resulted" name="Resulted" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Orders by Category"
          loading={loading}
          error={error}
          height={300}
        >
          {pieData.length === 0 ? (
            <EmptyState height={300} />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  outerRadius={100}
                  paddingAngle={2}
                >
                  {pieData.map((entry, i) => (
                    <Cell
                      key={entry.name}
                      fill={CATEGORY_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]}
                    />
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
      </div>

      {/* Test volume table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Test Volume Detail</h3>
        </div>
        {loading ? (
          <div className="p-5 space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        ) : tests.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">No test data for this period</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3 text-left">Test Name</th>
                  <th className="px-5 py-3 text-left">Category</th>
                  <th className="px-5 py-3 text-right">Ordered</th>
                  <th className="px-5 py-3 text-right">Resulted</th>
                  <th className="px-5 py-3 text-right">Pending</th>
                  <th className="px-5 py-3 text-right">Completion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tests.map((t, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">{t.test_name}</td>
                    <td className="px-5 py-3">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: `${CATEGORY_COLORS[t.category] || '#6b7280'}20`,
                          color: CATEGORY_COLORS[t.category] || '#6b7280',
                        }}
                      >
                        {t.category}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-700">{t.total_ordered}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{t.total_resulted}</td>
                    <td className="px-5 py-3 text-right text-gray-500">
                      {t.total_ordered - t.total_resulted}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <CompletionBadge pct={t.completion_rate_pct} />
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
