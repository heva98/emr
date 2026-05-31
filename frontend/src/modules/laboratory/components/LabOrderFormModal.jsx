import { useState, useEffect, useRef } from 'react';
import { X, Search, FlaskConical, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { labService } from '../../../services/labService';
import { opdService } from '../../../services/opdService';

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent';
const ta  = `${inp} resize-none`;

const PRIORITY_OPTIONS = [
  { value: 'ROUTINE', label: 'Routine' },
  { value: 'URGENT',  label: 'Urgent' },
  { value: 'STAT',    label: 'STAT — Immediately' },
];

const PRIORITY_CLS = {
  ROUTINE: 'border-gray-300 text-gray-700',
  URGENT:  'border-orange-400 text-orange-700 bg-orange-50',
  STAT:    'border-red-500 text-red-700 bg-red-50',
};

const CATEGORY_ORDER = [
  'HAEMATOLOGY', 'BIOCHEMISTRY', 'MICROBIOLOGY', 'SEROLOGY', 'URINALYSIS', 'OTHER',
];

const CATEGORY_LABELS = {
  HAEMATOLOGY: 'Haematology', BIOCHEMISTRY: 'Biochemistry', MICROBIOLOGY: 'Microbiology',
  SEROLOGY: 'Serology', URINALYSIS: 'Urinalysis', OTHER: 'Other',
};

function groupByCategory(tests) {
  const groups = {};
  for (const t of tests) {
    if (!groups[t.category]) groups[t.category] = [];
    groups[t.category].push(t);
  }
  return groups;
}

export default function LabOrderFormModal({ visitId, patientId, consultationId, onClose, onSuccess }) {
  const [catalog, setCatalog]           = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [selectedTests, setSelectedTests]   = useState([]);
  const [priority, setPriority]             = useState('ROUTINE');
  const [clinicalNotes, setClinicalNotes]   = useState('');
  const [search, setSearch]                 = useState('');
  const [submitting, setSubmitting]         = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    labService.getCatalog({ is_active: true, limit: 500 })
      .then((res) => setCatalog(res.data.results ?? res.data))
      .catch(() => toast.error('Failed to load test catalog.'))
      .finally(() => setCatalogLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const toggleTest = (test) => {
    setSelectedTests((prev) =>
      prev.some((t) => t.id === test.id)
        ? prev.filter((t) => t.id !== test.id)
        : [...prev, test]
    );
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? catalog.filter((t) => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q))
    : catalog;
  const grouped = groupByCategory(filtered);

  const handleSubmit = async () => {
    if (selectedTests.length === 0) {
      toast.error('Please select at least one test.');
      return;
    }
    setSubmitting(true);
    try {
      const orderRes = await labService.createOrder({
        patient: patientId,
        visit: visitId,
        priority,
        clinical_notes: clinicalNotes,
        test_ids: selectedTests.map((t) => t.id),
      });

      if (consultationId) {
        await opdService.createReferral({ consultation: consultationId, referred_to: 'LAB' });
      }

      toast.success(`Lab order ${orderRes.data.order_number} created`);
      onSuccess(orderRes.data);
    } catch (e) {
      const msg = e.response?.data
        ? Object.values(e.response.data).flat().join(' ')
        : 'Failed to create lab order.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-800">New Lab Order</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Priority selector */}
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Priority</p>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriority(opt.value)}
                  className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-semibold transition-colors ${
                    priority === opt.value
                      ? PRIORITY_CLS[opt.value]
                      : 'border-gray-200 text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Test search */}
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Select Tests
              {selectedTests.length > 0 && (
                <span className="ml-2 text-primary font-bold">({selectedTests.length} selected)</span>
              )}
            </p>

            {/* Selected chips */}
            {selectedTests.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {selectedTests.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-medium rounded-full px-3 py-1"
                  >
                    <span className="font-bold">{t.code}</span>
                    <span className="text-primary/70">· {t.name}</span>
                    <button
                      type="button"
                      onClick={() => toggleTest(t)}
                      className="hover:text-red-500 transition-colors ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search input */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search by test name or code…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Grouped test list */}
            {catalogLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-8 bg-gray-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-6">No tests match "{search}"</p>
            ) : (
              <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                {CATEGORY_ORDER.filter((cat) => grouped[cat]?.length > 0).map((cat) => (
                  <div key={cat}>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                      {CATEGORY_LABELS[cat]}
                    </p>
                    <div className="space-y-1">
                      {grouped[cat].map((test) => {
                        const isSelected = selectedTests.some((t) => t.id === test.id);
                        return (
                          <label
                            key={test.id}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                              isSelected ? 'bg-primary/10 border border-primary/20' : 'hover:bg-gray-50'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                                isSelected ? 'bg-primary border-primary' : 'border-gray-300'
                              }`}
                              onClick={() => toggleTest(test)}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={isSelected}
                              onChange={() => toggleTest(test)}
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-gray-800">{test.name}</span>
                              <span className="ml-2 text-xs font-mono text-gray-400">{test.code}</span>
                            </div>
                            <div className="text-right shrink-0">
                              {test.unit && (
                                <span className="text-xs text-gray-400">{test.unit}</span>
                              )}
                              <span className="block text-xs text-gray-400">
                                TZS {test.price?.toLocaleString()}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Clinical notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              Clinical Notes <span className="text-gray-400 normal-case font-normal">(optional)</span>
            </label>
            <textarea
              rows={2}
              className={ta}
              placeholder="Reason for request, clinical context…"
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl shrink-0">
          <p className="text-sm text-gray-500">
            {selectedTests.length === 0
              ? 'No tests selected'
              : `${selectedTests.length} test${selectedTests.length !== 1 ? 's' : ''} selected`}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || selectedTests.length === 0}
              className="px-6 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Creating…' : 'Create Lab Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
