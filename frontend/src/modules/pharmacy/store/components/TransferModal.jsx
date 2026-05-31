import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Search, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { pharmacyService } from '../../../../services/pharmacyService';

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent';

function fmtExpiry(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-TZ', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isExpiringSoon(dateStr) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 30);
  const d = new Date(dateStr);
  return d >= new Date(new Date().setHours(0, 0, 0, 0)) && d <= cutoff;
}

export default function TransferModal({ onClose, onSuccess }) {
  const [search, setSearch]         = useState('');
  const [results, setResults]       = useState([]);
  const [searching, setSearching]   = useState(false);
  const [selected, setSelected]     = useState(null);
  const [qty, setQty]               = useState('');
  const [saving, setSaving]         = useState(false);
  const debounceRef = useRef(null);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await pharmacyService.getStock({ search: q, location: 'MAIN_STORE' });
      const data = res.data.results ?? res.data;
      setResults(data.filter((s) => s.quantity_in_stock > 0));
    } catch {
      toast.error('Search failed.');
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(search), 350);
    return () => clearTimeout(debounceRef.current);
  }, [search, doSearch]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected) { toast.error('Select a stock item.'); return; }
    const n = parseInt(qty, 10);
    if (!n || n <= 0) { toast.error('Enter a valid quantity.'); return; }
    if (n > selected.quantity_in_stock) {
      toast.error(`Only ${selected.quantity_in_stock} units available.`);
      return;
    }
    setSaving(true);
    try {
      await pharmacyService.transferStock({ stock_item_id: selected.id, quantity: n });
      toast.success(`Transferred ${n} × ${selected.drug_name} to Dispensing.`);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Transfer failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-auto overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <ArrowRightLeft className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-gray-800">Transfer to Dispensing</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Drug search */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Search Drug (Main Store)</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                className={`${inp} pl-9`}
                placeholder="Drug name or code…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSelected(null); setQty(''); }}
                autoFocus
              />
            </div>
          </div>

          {/* Results list */}
          {search.trim() && (
            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
              {searching ? (
                <div className="px-4 py-3 text-sm text-gray-400 animate-pulse">Searching…</div>
              ) : results.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-400">No stock found in Main Store.</div>
              ) : (
                results.map((s) => {
                  const soon = isExpiringSoon(s.expiry_date);
                  const active = selected?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => { setSelected(s); setQty(''); }}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left text-sm border-b border-gray-50 last:border-0 transition-colors ${active ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-gray-50'}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">{s.drug_name}</p>
                        <p className="text-xs text-gray-500">
                          {s.drug_strength} · Batch {s.batch_number}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Exp {fmtExpiry(s.expiry_date)} · {s.quantity_in_stock} in stock
                        </p>
                      </div>
                      {soon && (
                        <span className="flex items-center gap-0.5 text-xs text-amber-600 mt-0.5 flex-shrink-0">
                          <AlertTriangle className="w-3 h-3" />
                          Exp soon
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* Selected item summary + quantity input */}
          {selected && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-xs text-blue-500 uppercase tracking-wide font-medium mb-1">Selected</p>
                <p className="font-semibold text-gray-800">{selected.drug_name} <span className="font-normal text-gray-500">{selected.drug_strength}</span></p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Batch {selected.batch_number} · Exp {fmtExpiry(selected.expiry_date)} · {selected.quantity_in_stock} available
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Quantity to Transfer <span className="text-red-500">*</span>
                  <span className="ml-1 text-gray-400">(max {selected.quantity_in_stock})</span>
                </label>
                <input
                  type="number"
                  className={inp}
                  min={1}
                  max={selected.quantity_in_stock}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder={`1 – ${selected.quantity_in_stock}`}
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selected || !qty || saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowRightLeft className="w-4 h-4" />
              {saving ? 'Transferring…' : 'Transfer to Dispensing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
