import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Search, PackagePlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { pharmacyService } from '../../../services/pharmacyService';

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent';

const EMPTY_ROW = () => ({
  _id:           crypto.randomUUID(),
  drugId:        '',
  drugName:      '',
  drugStrength:  '',
  drugUnit:      '',
  batchNumber:   '',
  expiryDate:    '',
  quantity:      '',
  unitCost:      '',
  sellingPrice:  '',
  supplier:      '',
  location:      'MAIN_STORE',
  drugSearch:    '',
  drugResults:   [],
  searching:     false,
  showDropdown:  false,
});

function RowField({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function ReceiveStockPage() {
  const navigate = useNavigate();
  const [rows, setRows]       = useState([EMPTY_ROW()]);
  const [saving, setSaving]   = useState(false);
  const debounceRefs = useRef({});

  const updateRow = (id, patch) => {
    setRows((prev) => prev.map((r) => r._id === id ? { ...r, ...patch } : r));
  };

  const addRow = () => setRows((prev) => [...prev, EMPTY_ROW()]);

  const removeRow = (id) => {
    setRows((prev) => prev.length > 1 ? prev.filter((r) => r._id !== id) : prev);
  };

  const searchDrugs = useCallback(async (rowId, q) => {
    if (!q.trim()) { updateRow(rowId, { drugResults: [], showDropdown: false }); return; }
    updateRow(rowId, { searching: true, showDropdown: true });
    try {
      const res = await pharmacyService.getDrugs({ search: q, is_active: true });
      const data = res.data.results ?? res.data;
      updateRow(rowId, { drugResults: data, searching: false });
    } catch {
      updateRow(rowId, { searching: false, drugResults: [] });
    }
  }, []);

  const handleDrugSearchChange = (rowId, value) => {
    updateRow(rowId, { drugSearch: value, drugId: '', drugName: '', drugStrength: '', drugUnit: '' });
    clearTimeout(debounceRefs.current[rowId]);
    debounceRefs.current[rowId] = setTimeout(() => searchDrugs(rowId, value), 350);
  };

  const selectDrug = (rowId, drug) => {
    updateRow(rowId, {
      drugId:       drug.id,
      drugName:     drug.name,
      drugStrength: drug.strength,
      drugUnit:     drug.unit_of_measure,
      drugSearch:   `${drug.name} — ${drug.strength}`,
      showDropdown: false,
      drugResults:  [],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.drugId)       { toast.error(`Row ${i + 1}: Select a drug.`); return; }
      if (!r.batchNumber)  { toast.error(`Row ${i + 1}: Batch number required.`); return; }
      if (!r.expiryDate)   { toast.error(`Row ${i + 1}: Expiry date required.`); return; }
      if (!r.quantity || Number(r.quantity) <= 0) { toast.error(`Row ${i + 1}: Quantity must be > 0.`); return; }
      if (!r.unitCost || Number(r.unitCost) < 0)  { toast.error(`Row ${i + 1}: Unit cost required.`); return; }
      if (!r.sellingPrice || Number(r.sellingPrice) < 0) { toast.error(`Row ${i + 1}: Selling price required.`); return; }
    }

    setSaving(true);
    const results = { success: 0, failed: 0 };
    try {
      await Promise.all(rows.map(async (r) => {
        try {
          await pharmacyService.createStock({
            drug:             r.drugId,
            batch_number:     r.batchNumber,
            expiry_date:      r.expiryDate,
            quantity_in_stock: Number(r.quantity),
            unit_cost:        Number(r.unitCost),
            selling_price:    Number(r.sellingPrice),
            supplier:         r.supplier || '',
            location:         r.location,
          });
          results.success++;
        } catch {
          results.failed++;
        }
      }));

      if (results.failed === 0) {
        toast.success(`${results.success} stock item${results.success !== 1 ? 's' : ''} received successfully.`);
        navigate('/pharmacy/store');
      } else {
        toast.error(`${results.failed} item${results.failed !== 1 ? 's' : ''} failed. ${results.success} succeeded.`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 pb-10">
      {/* Back nav */}
      <button
        onClick={() => navigate('/pharmacy/store')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Store
      </button>

      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <PackagePlus className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Receive New Stock</h1>
          <p className="text-sm text-gray-400">Enter one or more drug batches received into inventory.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {rows.map((row, idx) => (
          <div key={row._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
            {/* Row header */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">
                Item {idx + 1}
                {row.drugName && <span className="ml-2 font-normal text-gray-400">— {row.drugName} {row.drugStrength}</span>}
              </p>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(row._id)}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Drug typeahead */}
            <RowField label="Drug" required>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  className={`${inp} pl-9`}
                  placeholder="Search by drug name or code…"
                  value={row.drugSearch}
                  onChange={(e) => handleDrugSearchChange(row._id, e.target.value)}
                  onBlur={() => setTimeout(() => updateRow(row._id, { showDropdown: false }), 180)}
                  onFocus={() => row.drugResults.length > 0 && updateRow(row._id, { showDropdown: true })}
                />
                {row.showDropdown && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                    {row.searching ? (
                      <div className="px-4 py-3 text-sm text-gray-400 animate-pulse">Searching…</div>
                    ) : row.drugResults.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-400">No drugs found.</div>
                    ) : (
                      row.drugResults.map((drug) => (
                        <button
                          key={drug.id}
                          type="button"
                          onMouseDown={() => selectDrug(row._id, drug)}
                          className="w-full flex flex-col px-4 py-2.5 text-left text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0"
                        >
                          <span className="font-medium text-gray-800">{drug.name}</span>
                          <span className="text-xs text-gray-400">{drug.drug_code} · {drug.strength} · {drug.formulation}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </RowField>

            {/* Grid of fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <RowField label="Batch Number" required>
                <input
                  type="text"
                  className={inp}
                  placeholder="e.g. BT-2024-001"
                  value={row.batchNumber}
                  onChange={(e) => updateRow(row._id, { batchNumber: e.target.value })}
                />
              </RowField>

              <RowField label="Expiry Date" required>
                <input
                  type="date"
                  className={inp}
                  value={row.expiryDate}
                  onChange={(e) => updateRow(row._id, { expiryDate: e.target.value })}
                />
              </RowField>

              <RowField label={`Quantity${row.drugUnit ? ` (${row.drugUnit})` : ''}`} required>
                <input
                  type="number"
                  className={inp}
                  min={1}
                  placeholder="e.g. 100"
                  value={row.quantity}
                  onChange={(e) => updateRow(row._id, { quantity: e.target.value })}
                />
              </RowField>

              <RowField label="Location" required>
                <select
                  className={inp}
                  value={row.location}
                  onChange={(e) => updateRow(row._id, { location: e.target.value })}
                >
                  <option value="MAIN_STORE">Main Store</option>
                  <option value="DISPENSING">Dispensing</option>
                </select>
              </RowField>

              <RowField label="Unit Cost (TZS)" required>
                <input
                  type="number"
                  className={inp}
                  min={0}
                  placeholder="e.g. 1500"
                  value={row.unitCost}
                  onChange={(e) => updateRow(row._id, { unitCost: e.target.value })}
                />
              </RowField>

              <RowField label="Selling Price (TZS)" required>
                <input
                  type="number"
                  className={inp}
                  min={0}
                  placeholder="e.g. 2500"
                  value={row.sellingPrice}
                  onChange={(e) => updateRow(row._id, { sellingPrice: e.target.value })}
                />
              </RowField>

              <RowField label="Supplier">
                <input
                  type="text"
                  className={inp}
                  placeholder="e.g. TFDA Supplies"
                  value={row.supplier}
                  onChange={(e) => updateRow(row._id, { supplier: e.target.value })}
                />
              </RowField>
            </div>

            {/* Cost summary */}
            {row.quantity && row.unitCost && (
              <p className="text-xs text-gray-400 text-right">
                Total batch value:{' '}
                <span className="font-semibold text-gray-600">
                  TZS {(Number(row.quantity) * Number(row.unitCost)).toLocaleString('en-TZ')}
                </span>
              </p>
            )}
          </div>
        ))}

        {/* Add another row */}
        <button
          type="button"
          onClick={addRow}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:border-primary hover:text-primary transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Another Drug
        </button>

        {/* Submit bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {rows.length} drug{rows.length !== 1 ? 's' : ''} to receive
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/pharmacy/store')}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PackagePlus className="w-4 h-4" />
              {saving ? 'Saving…' : `Receive ${rows.length} Item${rows.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
