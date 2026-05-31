import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Pill, CheckCircle2, AlertTriangle, Printer,
  ChevronDown, ChevronUp, PackageCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { pharmacyService } from '../../../services/pharmacyService';
import RxStatusBadge from './components/RxStatusBadge';
import PatientVisitHeader from '../../../components/PatientVisitHeader';

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent';
const sel = `${inp} bg-white`;

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-TZ', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function isExpired(dateStr) {
  return new Date(dateStr) < new Date(new Date().setHours(0, 0, 0, 0));
}

function isExpiringSoon(dateStr) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 30);
  const d = new Date(dateStr);
  return d >= new Date(new Date().setHours(0, 0, 0, 0)) && d <= cutoff;
}

function fmtExpiry(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-TZ', { day: '2-digit', month: 'short', year: 'numeric' });
}

function printLabel({ patient, drug, item, date }) {
  const win = window.open('', '_blank', 'width=600,height=500');
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Dispensing Label</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; padding: 16px; }
    .label { border: 2px solid #000; padding: 16px; max-width: 400px; }
    .header { font-size: 10px; color: #555; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 8px; }
    .drug { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
    .strength { font-size: 13px; color: #333; margin-bottom: 10px; }
    .row { display: flex; margin-bottom: 4px; }
    .lbl { font-weight: bold; width: 110px; flex-shrink: 0; }
    .footer { margin-top: 10px; border-top: 1px solid #ccc; padding-top: 8px; font-size: 10px; color: #777; }
  </style>
</head>
<body>
<div class="label">
  <div class="header">
    <strong>CareEMR — Dispensing Label</strong><br/>
    Date: ${date}
  </div>
  <div class="row"><span class="lbl">Patient:</span> ${patient.name}</div>
  <div class="row"><span class="lbl">Patient ID:</span> ${patient.patient_id}</div>
  <div class="drug">${drug.name}</div>
  <div class="strength">${drug.strength} — ${drug.formulation}</div>
  <div class="row"><span class="lbl">Dose:</span> ${item.dose}</div>
  <div class="row"><span class="lbl">Frequency:</span> ${item.frequency}</div>
  <div class="row"><span class="lbl">Duration:</span> ${item.duration}</div>
  ${item.instructions ? `<div class="row"><span class="lbl">Instructions:</span> ${item.instructions}</div>` : ''}
  <div class="row"><span class="lbl">Qty Dispensed:</span> ${item.quantity_dispensed} ${drug.unit}</div>
  <div class="footer">Keep out of reach of children. Store as directed.</div>
</div>
<script>window.onload = () => { window.print(); window.close(); };<\/script>
</body>
</html>`);
  win.document.close();
}

// ── Single prescription-item dispense card ────────────────────────────────────
function ItemCard({ item, stockOptions, onDispense }) {
  const [open, setOpen]       = useState(true);
  const [stockId, setStockId] = useState('');
  const [qty, setQty]         = useState('');
  const [saving, setSaving]   = useState(false);

  const remaining = item.quantity_prescribed - item.quantity_dispensed;
  const pct = item.quantity_prescribed > 0
    ? Math.min(100, Math.round((item.quantity_dispensed / item.quantity_prescribed) * 100))
    : 0;

  const selectedStock = stockOptions.find((s) => s.id === Number(stockId));

  const handleDispense = async () => {
    if (!stockId) { toast.error('Select a stock batch.'); return; }
    const n = parseInt(qty, 10);
    if (!n || n <= 0) { toast.error('Enter a valid quantity.'); return; }
    if (n > remaining) { toast.error(`Cannot exceed remaining quantity of ${remaining}.`); return; }
    if (selectedStock && n > selectedStock.quantity_in_stock) {
      toast.error(`Only ${selectedStock.quantity_in_stock} units available in this batch.`);
      return;
    }
    setSaving(true);
    try {
      await onDispense([{ prescription_item_id: item.id, stock_item_id: Number(stockId), quantity_dispensed: n }]);
      setStockId('');
      setQty('');
    } finally {
      setSaving(false);
    }
  };

  const isDone = item.status === 'DISPENSED';
  const isCancelled = item.status === 'CANCELLED';

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isDone ? 'border-green-200' : 'border-gray-100'}`}>
      {/* Card header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-green-100' : 'bg-primary/10'}`}>
          {isDone
            ? <CheckCircle2 className="w-4 h-4 text-green-600" />
            : <Pill className="w-4 h-4 text-primary" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 truncate">
            {item.drug_name}
            <span className="ml-2 text-sm font-normal text-gray-400">{item.drug_strength}</span>
          </p>
          <p className="text-xs text-gray-500 capitalize">{item.drug_formulation?.toLowerCase()} · {item.dose} · {item.frequency}</p>
        </div>
        <div className="text-right mr-2 hidden sm:block">
          <p className="text-xs text-gray-500">Dispensed / Prescribed</p>
          <p className="text-sm font-semibold text-gray-700">
            {item.quantity_dispensed} / {item.quantity_prescribed} {item.drug_unit}
          </p>
        </div>
        {isCancelled
          ? <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Cancelled</span>
          : <span className={`text-xs px-2 py-0.5 rounded-full ${isDone ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{pct}%</span>
        }
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-50 pt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-5">
            {/* Left: drug details */}
            <div className="flex-1 space-y-1.5 text-sm text-gray-600">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <div><span className="font-medium text-gray-500 block text-xs uppercase tracking-wide">Dose</span>{item.dose}</div>
                <div><span className="font-medium text-gray-500 block text-xs uppercase tracking-wide">Frequency</span>{item.frequency}</div>
                <div><span className="font-medium text-gray-500 block text-xs uppercase tracking-wide">Duration</span>{item.duration}</div>
                {item.instructions && (
                  <div className="col-span-2"><span className="font-medium text-gray-500 block text-xs uppercase tracking-wide">Instructions</span>{item.instructions}</div>
                )}
              </div>
            </div>

            {/* Right: progress */}
            <div className="sm:w-48 space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Progress</p>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all ${isDone ? 'bg-green-500' : 'bg-primary'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">
                {item.quantity_dispensed} of {item.quantity_prescribed} {item.drug_unit} dispensed
              </p>
            </div>
          </div>

          {/* Dispense form — only if not done / cancelled */}
          {!isDone && !isCancelled && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Dispense</p>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Select Batch / Stock <span className="text-red-500">*</span>
                </label>
                <select className={sel} value={stockId} onChange={(e) => setStockId(e.target.value)}>
                  <option value="">— Choose batch —</option>
                  {stockOptions.length === 0 && (
                    <option disabled>No stock available for this drug</option>
                  )}
                  {stockOptions.map((s) => {
                    const expired = isExpired(s.expiry_date);
                    const soon    = !expired && isExpiringSoon(s.expiry_date);
                    return (
                      <option key={s.id} value={s.id} disabled={expired}>
                        {expired ? '🔴 ' : soon ? '⚠️ ' : ''}
                        {s.batch_number} · Exp {fmtExpiry(s.expiry_date)} · {s.quantity_in_stock} {s.drug_unit ?? item.drug_unit} · {s.location === 'DISPENSING' ? 'Dispensing' : 'Main Store'}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Quantity to Dispense <span className="text-red-500">*</span>
                    <span className="ml-1 text-gray-400">(max {remaining})</span>
                  </label>
                  <input
                    type="number"
                    className={inp}
                    min={1}
                    max={remaining}
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    placeholder={`1 – ${remaining}`}
                  />
                </div>
                <button
                  onClick={handleDispense}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {saving ? 'Dispensing…' : 'Dispense'}
                </button>
              </div>
            </div>
          )}

          {/* Print label */}
          {item.quantity_dispensed > 0 && (
            <div className="flex justify-end">
              <button
                onClick={() => printLabel({
                  patient: { name: '', patient_id: '' }, // filled by parent via context
                  drug: {
                    name: item.drug_name,
                    strength: item.drug_strength,
                    formulation: item.drug_formulation,
                    unit: item.drug_unit,
                  },
                  item,
                  date: new Date().toLocaleDateString('en-TZ', { day: '2-digit', month: 'short', year: 'numeric' }),
                })}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Label
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function DispensingDetailPage() {
  const { prescriptionId } = useParams();
  const navigate = useNavigate();

  const [prescription, setPrescription] = useState(null);
  const [stockByDrug, setStockByDrug]   = useState({});
  const [loading, setLoading]           = useState(true);
  const [dispensingAll, setDispensingAll] = useState(false);

  // Per-item "Dispense All" selections: { itemId: { stockItemId, qty } }
  const [allSelections, setAllSelections] = useState({});

  const loadPrescription = useCallback(async () => {
    try {
      const res = await pharmacyService.getPrescription(prescriptionId);
      const rx  = res.data;
      setPrescription(rx);

      // Fetch stock for every unique drug in parallel
      const drugIds = [...new Set(rx.items.map((i) => i.drug))];
      const results = await Promise.all(drugIds.map((id) => pharmacyService.getStock({ drug: id })));
      const map = {};
      drugIds.forEach((id, idx) => {
        const data = results[idx].data.results ?? results[idx].data;
        map[id] = data.filter((s) => !isExpired(s.expiry_date) && s.quantity_in_stock > 0);
      });
      setStockByDrug(map);
    } catch {
      toast.error('Failed to load prescription.');
    } finally {
      setLoading(false);
    }
  }, [prescriptionId]);

  useEffect(() => { loadPrescription(); }, [loadPrescription]);

  const handleDispense = async (entries) => {
    try {
      await pharmacyService.dispense(prescriptionId, entries);
      toast.success('Dispensed successfully.');
      await loadPrescription();
    } catch (err) {
      const msg = err.response?.data?.detail ?? 'Dispense failed.';
      toast.error(msg);
      throw err;
    }
  };

  const handleDispenseAll = async () => {
    const pending = prescription.items.filter(
      (i) => i.status === 'PENDING' || i.status === 'PARTIALLY_DISPENSED'
    );
    const entries = [];
    for (const item of pending) {
      const stock = stockByDrug[item.drug];
      if (!stock?.length) {
        toast.error(`No stock available for ${item.drug_name}.`);
        return;
      }
      const s = stock[0]; // pick first available (FIFO)
      const remaining = item.quantity_prescribed - item.quantity_dispensed;
      if (s.quantity_in_stock < remaining) {
        toast.error(`Insufficient stock for ${item.drug_name}. Available: ${s.quantity_in_stock}, needed: ${remaining}.`);
        return;
      }
      entries.push({ prescription_item_id: item.id, stock_item_id: s.id, quantity_dispensed: remaining });
    }
    if (!entries.length) { toast('No items to dispense.'); return; }
    setDispensingAll(true);
    try {
      await pharmacyService.dispense(prescriptionId, entries);
      toast.success('All items dispensed.');
      await loadPrescription();
    } catch (err) {
      const msg = err.response?.data?.detail ?? 'Dispense All failed.';
      toast.error(msg);
    } finally {
      setDispensingAll(false);
    }
  };

  if (loading) return <PageSkeleton />;
  if (!prescription) return null;

  const patient       = prescription.patient_display;
  const allDispensed  = prescription.status === 'DISPENSED';
  const hasPending    = prescription.items.some((i) => i.status === 'PENDING' || i.status === 'PARTIALLY_DISPENSED');

  const handlePrintLabel = (item) => {
    printLabel({
      patient: { name: patient?.name ?? '', patient_id: patient?.patient_id ?? '' },
      drug: {
        name: item.drug_name,
        strength: item.drug_strength,
        formulation: item.drug_formulation,
        unit: item.drug_unit,
      },
      item,
      date: new Date().toLocaleDateString('en-TZ', { day: '2-digit', month: 'short', year: 'numeric' }),
    });
  };

  return (
    <div className="space-y-5 pb-24">
      {/* Back nav */}
      <button
        onClick={() => navigate('/pharmacy/dispensing')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Queue
      </button>

      {/* Fully dispensed banner */}
      {allDispensed && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-800">Prescription Fully Dispensed</p>
            <p className="text-sm text-green-600">All items have been dispensed for this prescription.</p>
          </div>
        </div>
      )}

      {/* Patient + Visit header */}
      <PatientVisitHeader
        patient={{
          patient_id: patient?.patient_id,
          name: patient?.name,
        }}
        visit={{
          visit_number: prescription.prescription_number,
          status: prescription.status,
        }}
      />

      {/* Prescription info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-wrap items-start gap-4 justify-between">
          <div className="space-y-1">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Prescription</p>
            <p className="font-mono text-lg font-bold text-primary">{prescription.prescription_number}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Prescribed By</p>
            <p className="text-sm font-medium text-gray-700">{prescription.prescribed_by_name}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Date &amp; Time</p>
            <p className="text-sm text-gray-700">{fmtDate(prescription.prescribed_at)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Status</p>
            <RxStatusBadge status={prescription.status} />
          </div>
        </div>
        {prescription.notes && (
          <div className="mt-4 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Doctor's Notes</p>
            <p className="text-sm text-amber-800 italic">{prescription.notes}</p>
          </div>
        )}
      </div>

      {/* Prescription items */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide px-1">
          Prescription Items ({prescription.items.length})
        </h2>
        {prescription.items.map((item) => (
          <ItemCardWithPrint
            key={item.id}
            item={item}
            stockOptions={stockByDrug[item.drug] ?? []}
            onDispense={handleDispense}
            onPrintLabel={handlePrintLabel}
          />
        ))}
      </div>

      {/* Fixed bottom bar */}
      {!allDispensed && hasPending && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg px-6 py-4 flex items-center justify-end z-20">
          <div className="max-w-5xl w-full mx-auto flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {prescription.items.filter((i) => i.status === 'PENDING' || i.status === 'PARTIALLY_DISPENSED').length} item(s) pending
            </p>
            <button
              onClick={handleDispenseAll}
              disabled={dispensingAll}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PackageCheck className="w-4 h-4" />
              {dispensingAll ? 'Dispensing All…' : 'Dispense All Pending (FIFO)'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Wrapper to inject print handler with patient context
function ItemCardWithPrint({ item, stockOptions, onDispense, onPrintLabel }) {
  const [open, setOpen]       = useState(true);
  const [stockId, setStockId] = useState('');
  const [qty, setQty]         = useState('');
  const [saving, setSaving]   = useState(false);

  const remaining = item.quantity_prescribed - item.quantity_dispensed;
  const pct = item.quantity_prescribed > 0
    ? Math.min(100, Math.round((item.quantity_dispensed / item.quantity_prescribed) * 100))
    : 0;

  const selectedStock = stockOptions.find((s) => s.id === Number(stockId));
  const isDone        = item.status === 'DISPENSED';
  const isCancelled   = item.status === 'CANCELLED';

  const handleDispense = async () => {
    if (!stockId) { toast.error('Select a stock batch.'); return; }
    const n = parseInt(qty, 10);
    if (!n || n <= 0) { toast.error('Enter a valid quantity.'); return; }
    if (n > remaining) { toast.error(`Cannot exceed remaining quantity of ${remaining}.`); return; }
    if (selectedStock && n > selectedStock.quantity_in_stock) {
      toast.error(`Only ${selectedStock.quantity_in_stock} units available in this batch.`); return;
    }
    setSaving(true);
    try {
      await onDispense([{ prescription_item_id: item.id, stock_item_id: Number(stockId), quantity_dispensed: n }]);
      setStockId('');
      setQty('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isDone ? 'border-green-200' : 'border-gray-100'}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-green-100' : 'bg-primary/10'}`}>
          {isDone
            ? <CheckCircle2 className="w-4 h-4 text-green-600" />
            : <Pill className="w-4 h-4 text-primary" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 truncate">
            {item.drug_name}
            <span className="ml-2 text-sm font-normal text-gray-400">{item.drug_strength}</span>
          </p>
          <p className="text-xs text-gray-500 capitalize">{item.drug_formulation?.toLowerCase()} · {item.dose} · {item.frequency}</p>
        </div>
        <div className="text-right mr-2 hidden sm:block">
          <p className="text-xs text-gray-500">Dispensed / Prescribed</p>
          <p className="text-sm font-semibold text-gray-700">
            {item.quantity_dispensed} / {item.quantity_prescribed} {item.drug_unit}
          </p>
        </div>
        {isCancelled
          ? <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Cancelled</span>
          : <span className={`text-xs px-2 py-0.5 rounded-full ${isDone ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{pct}%</span>
        }
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-50 pt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-5">
            <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-600">
              <div><span className="font-medium text-gray-400 block text-xs uppercase tracking-wide">Dose</span>{item.dose}</div>
              <div><span className="font-medium text-gray-400 block text-xs uppercase tracking-wide">Frequency</span>{item.frequency}</div>
              <div><span className="font-medium text-gray-400 block text-xs uppercase tracking-wide">Duration</span>{item.duration}</div>
              {item.instructions && (
                <div className="col-span-2"><span className="font-medium text-gray-400 block text-xs uppercase tracking-wide">Instructions</span>{item.instructions}</div>
              )}
            </div>
            <div className="sm:w-48 space-y-2 flex-shrink-0">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Progress</p>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all ${isDone ? 'bg-green-500' : 'bg-primary'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">
                {item.quantity_dispensed} of {item.quantity_prescribed} {item.drug_unit} dispensed
              </p>
            </div>
          </div>

          {!isDone && !isCancelled && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Dispense from Stock</p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Select Batch <span className="text-red-500">*</span>
                </label>
                <select className={sel} value={stockId} onChange={(e) => { setStockId(e.target.value); }}>
                  <option value="">— Choose a batch —</option>
                  {stockOptions.length === 0 && <option disabled>No stock available</option>}
                  {stockOptions.map((s) => {
                    const soon = isExpiringSoon(s.expiry_date);
                    return (
                      <option key={s.id} value={s.id}>
                        {soon ? '⚠️ ' : ''}
                        {s.batch_number} · Exp {fmtExpiry(s.expiry_date)} · {s.quantity_in_stock} {item.drug_unit} · {s.location === 'DISPENSING' ? 'Dispensing' : 'Main Store'}
                      </option>
                    );
                  })}
                </select>
                {selectedStock && isExpiringSoon(selectedStock.expiry_date) && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Expires within 30 days
                  </p>
                )}
              </div>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Quantity <span className="text-red-500">*</span>
                    <span className="ml-1 text-gray-400">(max {remaining})</span>
                  </label>
                  <input
                    type="number"
                    className={inp}
                    min={1}
                    max={remaining}
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    placeholder={`1 – ${remaining}`}
                  />
                </div>
                <button
                  onClick={handleDispense}
                  disabled={saving || !stockId || !qty}
                  className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {saving ? 'Dispensing…' : 'Dispense'}
                </button>
              </div>
            </div>
          )}

          {item.quantity_dispensed > 0 && (
            <div className="flex justify-end">
              <button
                onClick={() => onPrintLabel(item)}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Label
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-28" />
      <div className="bg-white rounded-xl h-28 shadow-sm border border-gray-100" />
      <div className="bg-white rounded-xl h-20 shadow-sm border border-gray-100" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl h-16 shadow-sm border border-gray-100" />
      ))}
    </div>
  );
}
