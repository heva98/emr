import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Pill, Package, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { reportsService } from '../../../services/reportsService';
import { today, daysAgo, fmtTZS } from '../utils';
import DateRangePicker from '../components/DateRangePicker';
import ChartCard from '../components/ChartCard';
import EmptyState from '../components/EmptyState';

function StockBadge({ qty, reorderLevel }) {
  if (qty === 0) return <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">Out of Stock</span>;
  if (qty <= reorderLevel) return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">Low Stock</span>;
  return <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">OK</span>;
}

export default function PharmacyTab() {
  const [range, setRange] = useState({ dateFrom: daysAgo(29), dateTo: today() });
  const [pendingRange, setPendingRange] = useState(range);

  const [dispensing, setDispensing] = useState(null);
  const [dispensingLoading, setDispensingLoading] = useState(true);
  const [dispensingError, setDispensingError] = useState(null);

  const [stock, setStock] = useState(null);
  const [stockLoading, setStockLoading] = useState(true);

  const fetchDispensing = useCallback(async () => {
    setDispensingLoading(true);
    setDispensingError(null);
    try {
      const { data } = await reportsService.getPharmacyDispensing({
        date_from: range.dateFrom,
        date_to: range.dateTo,
      });
      setDispensing(data);
    } catch {
      setDispensingError('Failed to load dispensing data');
    } finally {
      setDispensingLoading(false);
    }
  }, [range]);

  const fetchStock = useCallback(async () => {
    setStockLoading(true);
    try {
      const { data } = await reportsService.getPharmacyStockStatus();
      setStock(data);
    } catch {
      setStock(null);
    } finally {
      setStockLoading(false);
    }
  }, []);

  useEffect(() => { fetchDispensing(); }, [fetchDispensing]);
  useEffect(() => { fetchStock(); }, [fetchStock]);

  const topDrugs = dispensing?.top_drugs || [];

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

      {/* Dispensing summary cards */}
      <div className="grid grid-cols-2 gap-4">
        {[
          {
            icon: Pill,
            label: 'Prescriptions',
            value: dispensingLoading ? null : dispensing?.total_prescriptions ?? 0,
            color: 'text-primary',
          },
          {
            icon: Package,
            label: 'Items Dispensed',
            value: dispensingLoading ? null : dispensing?.total_items_dispensed ?? 0,
            color: 'text-blue-600',
          },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-lg shadow-sm p-5 flex items-center gap-4">
            <div className={`p-3 rounded-full bg-gray-100 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{s.label}</p>
              <p className="text-2xl font-bold text-gray-800 mt-0.5">
                {s.value === null ? (
                  <span className="inline-block w-16 h-7 bg-gray-200 animate-pulse rounded" />
                ) : (
                  s.value.toLocaleString()
                )}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Top drugs horizontal bar chart */}
      <ChartCard
        title="Top 10 Drugs by Quantity Dispensed"
        loading={dispensingLoading}
        error={dispensingError}
        height={340}
      >
        {topDrugs.length === 0 ? (
          <EmptyState height={340} />
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <BarChart
              layout="vertical"
              data={topDrugs.slice(0, 10)}
              margin={{ top: 5, right: 80, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="drug_name"
                width={150}
                tick={{ fontSize: 10 }}
                tickLine={false}
              />
              <Tooltip
                formatter={(v, name) =>
                  name === 'total_tzs' ? [fmtTZS(v), 'Revenue'] : [v, 'Quantity']
                }
                labelStyle={{ fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="quantity_dispensed"
                name="Qty Dispensed"
                fill="#00857C"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Stock status cards */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Stock Status</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: Package,
              label: 'Total SKUs',
              value: stock?.total_drugs,
              color: 'text-gray-600',
              bg: 'bg-gray-100',
            },
            {
              icon: AlertTriangle,
              label: 'Low Stock',
              value: stock?.low_stock_count,
              color: 'text-amber-600',
              bg: 'bg-amber-50',
              border: 'border border-amber-200',
            },
            {
              icon: XCircle,
              label: 'Out of Stock',
              value: stock?.out_of_stock_count,
              color: 'text-red-600',
              bg: 'bg-red-50',
              border: 'border border-red-200',
            },
            {
              icon: Clock,
              label: 'Expiring (30d)',
              value: stock?.expiring_30_days,
              color: 'text-orange-600',
              bg: 'bg-orange-50',
              border: 'border border-orange-200',
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`rounded-lg p-4 flex items-center gap-3 ${s.bg || 'bg-white'} ${s.border || ''} shadow-sm`}
            >
              <div className={`p-2.5 rounded-full bg-white ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{s.label}</p>
                <p className="text-xl font-bold text-gray-800 mt-0.5">
                  {stockLoading ? (
                    <span className="inline-block w-10 h-5 bg-gray-200 animate-pulse rounded" />
                  ) : (
                    (s.value ?? 0).toLocaleString()
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Low stock table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Low Stock Items</h3>
        </div>
        {stockLoading ? (
          <div className="p-5 space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        ) : !stock?.low_stock_items?.length ? (
          <div className="py-10 text-center text-sm text-gray-400">
            All items are adequately stocked
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3 text-left">Drug</th>
                  <th className="px-5 py-3 text-right">Current Qty</th>
                  <th className="px-5 py-3 text-right">Reorder Level</th>
                  <th className="px-5 py-3 text-left">Location</th>
                  <th className="px-5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stock.low_stock_items.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">{item.drug_name}</td>
                    <td className="px-5 py-3 text-right font-semibold text-red-600">
                      {item.current_qty}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-500">{item.reorder_level}</td>
                    <td className="px-5 py-3 text-gray-600">{item.location}</td>
                    <td className="px-5 py-3 text-center">
                      <StockBadge qty={item.current_qty} reorderLevel={item.reorder_level} />
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
