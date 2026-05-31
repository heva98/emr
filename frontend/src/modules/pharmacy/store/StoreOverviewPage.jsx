import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Pill, Package, AlertTriangle, TrendingDown, CalendarClock,
  RefreshCw, Filter, Plus, ArrowRightLeft, Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { pharmacyService } from '../../../services/pharmacyService';
import MetricCard from '../../patients/components/MetricCard';
import StockStatusBadge, { getStockStatus } from './components/StockStatusBadge';
import TransferModal from './components/TransferModal';

const sel = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white';
const inp = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white';

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'ANTIBIOTIC', label: 'Antibiotic' },
  { value: 'ANALGESIC', label: 'Analgesic' },
  { value: 'ANTIHYPERTENSIVE', label: 'Antihypertensive' },
  { value: 'ANTIDIABETIC', label: 'Antidiabetic' },
  { value: 'ANTIMALARIAL', label: 'Antimalarial' },
  { value: 'GI', label: 'Gastrointestinal' },
  { value: 'VITAMIN', label: 'Vitamin / Supplement' },
  { value: 'IV_FLUID', label: 'IV Fluid' },
  { value: 'OTHER', label: 'Other' },
];

const LOCATION_OPTIONS = [
  { value: '', label: 'All Locations' },
  { value: 'MAIN_STORE', label: 'Main Store' },
  { value: 'DISPENSING', label: 'Dispensing' },
];

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'OK', label: 'OK' },
  { value: 'LOW', label: 'Low Stock' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
  { value: 'EXPIRED', label: 'Expired' },
];

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-TZ', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTZS(n) {
  return `TZS ${n?.toLocaleString('en-TZ') ?? 0}`;
}

function exportCSV(items) {
  const headers = ['Drug', 'Code', 'Formulation', 'Strength', 'Category', 'Batch', 'Expiry', 'Location', 'Qty', 'Reorder Level', 'Unit Cost (TZS)', 'Selling Price (TZS)', 'Status'];
  const rows = items.map((s) => [
    s.drug_name,
    s.drug_code,
    s.drug_formulation,
    s.drug_strength,
    s.drug_category ?? '',
    s.batch_number,
    s.expiry_date,
    s.location,
    s.quantity_in_stock,
    s.drug_reorder_level,
    s.unit_cost,
    s.selling_price,
    getStockStatus(s),
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stock_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function StoreOverviewPage() {
  const navigate = useNavigate();
  const [stock, setStock]       = useState([]);
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [showTransfer, setShowTransfer] = useState(false);

  const [filterCategory, setFilterCategory] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterSearch,   setFilterSearch]   = useState('');

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [stockRes, drugsRes] = await Promise.all([
        pharmacyService.getStock(),
        pharmacyService.getDrugs({ is_active: true }),
      ]);
      const stockData = stockRes.data.results ?? stockRes.data;
      const drugsData = drugsRes.data.results ?? drugsRes.data;

      setStock(stockData);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const cutoff30 = new Date();
      cutoff30.setDate(cutoff30.getDate() + 30);

      const totalValue = stockData.reduce((sum, s) => sum + s.quantity_in_stock * s.unit_cost, 0);
      const lowStock   = stockData.filter((s) => getStockStatus(s) === 'LOW' || getStockStatus(s) === 'CRITICAL').length;
      const expiring   = stockData.filter((s) => {
        const d = new Date(s.expiry_date);
        return d >= today && d <= cutoff30 && s.quantity_in_stock > 0;
      }).length;
      const expired    = stockData.filter((s) => new Date(s.expiry_date) < today && s.quantity_in_stock > 0).length;

      setStats({
        skus:       drugsData.length,
        totalValue,
        lowStock,
        expiring,
        expired,
      });
    } catch {
      if (!silent) toast.error('Failed to load stock data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const hasFilters = filterCategory || filterLocation || filterStatus || filterSearch;
  const clearFilters = () => {
    setFilterCategory(''); setFilterLocation(''); setFilterStatus(''); setFilterSearch('');
  };

  const filtered = stock.filter((s) => {
    if (filterCategory && s.drug_category !== filterCategory) return false;
    if (filterLocation && s.location !== filterLocation) return false;
    if (filterStatus && getStockStatus(s) !== filterStatus) return false;
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      if (!s.drug_name?.toLowerCase().includes(q) && !s.drug_code?.toLowerCase().includes(q) && !s.batch_number?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const lowStockItems = stock.filter((s) => {
    const st = getStockStatus(s);
    return st === 'LOW' || st === 'CRITICAL' || st === 'OUT_OF_STOCK';
  });

  return (
    <div className="space-y-6">
      {/* Dashboard metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard icon={Pill}         label="Total Drug SKUs"      value={stats?.skus       ?? null} color="text-primary" />
        <MetricCard icon={Package}      label="Stock Value"          value={stats ? fmtTZS(stats.totalValue) : null} color="text-blue-600" />
        <MetricCard icon={TrendingDown} label="Low / Critical"       value={stats?.lowStock   ?? null} color="text-amber-600" />
        <MetricCard icon={CalendarClock}label="Expiring (30 days)"   value={stats?.expiring   ?? null} color="text-orange-600" />
        <MetricCard icon={AlertTriangle}label="Expired (in stock)"   value={stats?.expired    ?? null} color="text-red-600" />
      </div>

      {/* Action bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
          <Filter className="w-4 h-4" />
          Filter:
        </div>
        <input
          type="text"
          className={`${inp} w-40`}
          placeholder="Drug / batch…"
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
        />
        <select className={sel} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className={sel} value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}>
          {LOCATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className={sel} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          {STATUS_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 underline">
            Clear all
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={() => exportCSV(filtered)}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
        <button
          onClick={() => setShowTransfer(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-primary border border-primary rounded-lg px-3 py-1.5 hover:bg-primary hover:text-white transition-colors"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          Transfer to Dispensing
        </button>
        <button
          onClick={() => navigate('/pharmacy/store/receive')}
          className="flex items-center gap-1.5 text-xs font-medium bg-primary text-white rounded-lg px-3 py-1.5 hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Receive New Stock
        </button>
        <button
          onClick={() => fetchData(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Stock table */}
      {loading ? (
        <TableSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState hasItems={stock.length > 0} onClear={clearFilters} />
      ) : (
        <>
          <p className="text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-700">{filtered.length}</span> stock item{filtered.length !== 1 ? 's' : ''}
          </p>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Drug</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Formulation</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Batch</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Expiry</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Qty</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Reorder</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Price</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-800">{s.drug_name}</p>
                      <p className="text-xs text-gray-400 font-mono">{s.drug_code} · {s.drug_strength}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">{s.drug_formulation?.toLowerCase()}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">{s.batch_number}</td>
                    <td className={`px-4 py-3 text-sm ${new Date(s.expiry_date) < new Date() ? 'text-red-600 font-medium' : ''}`}>
                      {fmtDate(s.expiry_date)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s.location === 'DISPENSING' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {s.location === 'DISPENSING' ? 'Dispensing' : 'Main Store'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-800 text-right">{s.quantity_in_stock}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-right">{s.drug_reorder_level}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">
                      {fmtTZS(s.selling_price)}
                    </td>
                    <td className="px-4 py-3">
                      <StockStatusBadge item={s} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Low stock alert list */}
      {!loading && lowStockItems.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 bg-amber-50 border-b border-amber-100">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800">
              Low Stock Alert — {lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} below reorder level
            </h3>
          </div>
          <div className="divide-y divide-gray-50">
            {lowStockItems.map((s) => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{s.drug_name}</p>
                  <p className="text-xs text-gray-400">{s.drug_strength} · {s.drug_code} · Batch {s.batch_number}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-red-600">{s.quantity_in_stock} left</p>
                  <p className="text-xs text-gray-400">Reorder at {s.drug_reorder_level}</p>
                </div>
                <StockStatusBadge item={s} />
                <button
                  onClick={() => navigate('/pharmacy/store/receive')}
                  className="flex-shrink-0 text-xs text-primary border border-primary rounded-lg px-3 py-1 hover:bg-primary hover:text-white transition-colors"
                >
                  Restock
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showTransfer && (
        <TransferModal
          onClose={() => setShowTransfer(false)}
          onSuccess={() => fetchData(true)}
        />
      )}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
      <div className="h-10 bg-gray-50 border-b border-gray-100" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-50 last:border-0">
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 bg-gray-200 rounded w-40" />
            <div className="h-3 bg-gray-100 rounded w-24" />
          </div>
          <div className="h-4 bg-gray-100 rounded w-16" />
          <div className="h-4 bg-gray-100 rounded w-20" />
          <div className="h-4 bg-gray-100 rounded w-24" />
          <div className="h-4 bg-gray-200 rounded w-12" />
          <div className="h-5 bg-gray-200 rounded-full w-16" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasItems, onClear }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 py-20 text-center">
      <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500 font-medium">
        {hasItems ? 'No items match the current filters.' : 'No stock items found.'}
      </p>
      {hasItems ? (
        <button onClick={onClear} className="mt-2 text-sm text-primary underline">Clear filters</button>
      ) : (
        <p className="text-gray-400 text-sm mt-1">Add stock via "Receive New Stock".</p>
      )}
    </div>
  );
}
