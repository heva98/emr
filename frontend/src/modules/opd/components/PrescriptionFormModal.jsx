import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Search, Pill } from 'lucide-react';
import toast from 'react-hot-toast';
import { pharmacyService } from '../../../services/pharmacyService';

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent';

const FREQUENCIES = [
  'Once daily (OD)', 'Twice daily (BD)', 'Three times daily (TDS)',
  'Four times daily (QDS)', 'Every 8 hours', 'Every 6 hours',
  'At night (ON)', 'In the morning (AM)', 'As needed (PRN)',
];

const DURATIONS = [
  '3 days', '5 days', '7 days', '10 days', '14 days',
  '1 month', '3 months', '6 months', 'Indefinitely',
];

function DrugSearchInput({ value, onSelect }) {
  const [query, setQuery] = useState(value?.name ?? '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const debRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debRef.current);
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }
    debRef.current = setTimeout(async () => {
      try {
        const res = await pharmacyService.getDrugs({ search: q, is_active: true });
        const list = res.data.results ?? res.data;
        setResults(list.slice(0, 10));
        setOpen(list.length > 0);
      } catch { /* silent */ }
    }, 300);
  };

  const select = (drug) => {
    setQuery(`${drug.name} ${drug.strength}`);
    setOpen(false);
    onSelect(drug);
  };

  return (
    <div className="relative" ref={wrapRef}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Search drug by name or code…"
          className={`${inp} pl-8`}
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-40 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {results.map((drug) => (
            <button
              key={drug.id}
              type="button"
              onClick={() => select(drug)}
              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0 flex items-center gap-3"
            >
              <Pill className="w-3.5 h-3.5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-800">{drug.name} <span className="text-gray-400 font-normal">{drug.strength}</span></p>
                <p className="text-xs text-gray-500">{drug.formulation} · {drug.drug_code}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PrescriptionItemRow({ item, idx, onChange, onRemove }) {
  const set = (field, val) => onChange(idx, { ...item, [field]: val });

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/50">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-1">
          Drug {idx + 1}
        </span>
        <button
          type="button"
          onClick={() => onRemove(idx)}
          className="text-gray-300 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <DrugSearchInput
        value={item.drug ? { name: item.drug_name, id: item.drug } : null}
        onSelect={(drug) => onChange(idx, {
          ...item,
          drug: drug.id,
          drug_name: drug.name,
          drug_unit: drug.unit_of_measure,
        })}
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Dose <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className={inp}
            placeholder="e.g. 500 mg"
            value={item.dose}
            onChange={(e) => set('dose', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Frequency <span className="text-red-500">*</span>
          </label>
          <select className={inp} value={item.frequency} onChange={(e) => set('frequency', e.target.value)}>
            <option value="">— Select —</option>
            {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Duration <span className="text-red-500">*</span>
          </label>
          <select className={inp} value={item.duration} onChange={(e) => set('duration', e.target.value)}>
            <option value="">— Select —</option>
            {DURATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Qty Prescribed <span className="text-red-500">*</span>
            {item.drug_unit && <span className="text-gray-400 ml-1">({item.drug_unit})</span>}
          </label>
          <input
            type="number"
            min="1"
            className={inp}
            placeholder="e.g. 21"
            value={item.quantity_prescribed}
            onChange={(e) => set('quantity_prescribed', e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Instructions <span className="text-gray-400">(optional)</span>
        </label>
        <input
          type="text"
          className={inp}
          placeholder="e.g. Take with food"
          value={item.instructions}
          onChange={(e) => set('instructions', e.target.value)}
        />
      </div>
    </div>
  );
}

const BLANK_ITEM = () => ({
  drug: null,
  drug_name: '',
  drug_unit: '',
  dose: '',
  frequency: '',
  duration: '',
  quantity_prescribed: '',
  instructions: '',
});

export default function PrescriptionFormModal({ visitId, patientId, consultationId, onClose, onSuccess }) {
  const [items, setItems] = useState([BLANK_ITEM()]);
  const [notes, setNotes]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  const updateItem  = (idx, val) => setItems((prev) => prev.map((it, i) => (i === idx ? val : it)));
  const removeItem  = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const addItem     = () => setItems((prev) => [...prev, BLANK_ITEM()]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.drug) { toast.error(`Select a drug for item ${i + 1}.`); return; }
      if (!it.dose.trim()) { toast.error(`Enter dose for item ${i + 1}.`); return; }
      if (!it.frequency) { toast.error(`Select frequency for item ${i + 1}.`); return; }
      if (!it.duration) { toast.error(`Select duration for item ${i + 1}.`); return; }
      if (!it.quantity_prescribed || parseInt(it.quantity_prescribed) < 1) {
        toast.error(`Enter quantity for item ${i + 1}.`); return;
      }
    }

    setSubmitting(true);
    try {
      await pharmacyService.createPrescription({
        patient: patientId,
        visit: visitId,
        notes,
        items: items.map((it) => ({
          drug: it.drug,
          dose: it.dose,
          frequency: it.frequency,
          duration: it.duration,
          quantity_prescribed: parseInt(it.quantity_prescribed, 10),
          instructions: it.instructions,
        })),
      });
      toast.success('Prescription created — sent to pharmacy queue.');
      onSuccess?.();
    } catch (err) {
      const msg = err.response?.data
        ? Object.values(err.response.data).flat().join(' ')
        : 'Failed to create prescription.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-gray-800">Write Prescription</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {items.map((item, idx) => (
            <PrescriptionItemRow
              key={idx}
              item={item}
              idx={idx}
              onChange={updateItem}
              onRemove={items.length > 1 ? removeItem : undefined}
            />
          ))}

          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add another drug
          </button>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Doctor's Notes <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              rows={2}
              className={`${inp} resize-none`}
              placeholder="Special instructions for pharmacist…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            onClick={handleSubmit}
            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60 transition-colors"
          >
            {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {submitting ? 'Creating…' : 'Create Prescription'}
          </button>
        </div>
      </div>
    </div>
  );
}
