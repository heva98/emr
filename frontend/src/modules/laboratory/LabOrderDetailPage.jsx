import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  AlertTriangle, CheckCircle2, Printer, ArrowLeft, FlaskConical,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { labService } from '../../services/labService';
import PriorityBadge from './components/PriorityBadge';
import LabStatusBadge from './components/LabStatusBadge';
import FlagBadge, { isCritical } from './components/FlagBadge';
import PatientVisitHeader from '../../components/PatientVisitHeader';

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent';
const ta  = `${inp} resize-none`;

const FLAG_OPTIONS = [
  'NORMAL', 'LOW', 'HIGH', 'CRITICAL_LOW', 'CRITICAL_HIGH', 'POSITIVE', 'NEGATIVE', 'NOT_DONE',
];

const CATEGORY_LABELS = {
  HAEMATOLOGY: 'Haematology', BIOCHEMISTRY: 'Biochemistry', MICROBIOLOGY: 'Microbiology',
  SEROLOGY: 'Serology', URINALYSIS: 'Urinalysis', OTHER: 'Other',
};

const SPECIMEN_LABELS = {
  BLOOD: 'Blood', URINE: 'Urine', STOOL: 'Stool', SWAB: 'Swab', OTHER: 'Other',
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-TZ', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Result entry form for a single item ───────────────────────────────────────
function ResultEntryForm({ item, onSave }) {
  const [form, setForm] = useState({
    result_value: '',
    normal_low: '',
    normal_high: '',
    flag: 'NORMAL',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.result_value.trim()) {
      toast.error('Result value is required.');
      return;
    }
    setSaving(true);
    try {
      await onSave(item.id, form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Enter Result</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Result Value <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className={inp}
            placeholder={`e.g. 7.2 or Positive${item.test_unit ? ` (${item.test_unit})` : ''}`}
            value={form.result_value}
            onChange={(e) => set('result_value', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Normal Low</label>
          <input
            type="number"
            step="any"
            className={inp}
            placeholder="e.g. 4.0"
            value={form.normal_low}
            onChange={(e) => set('normal_low', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Normal High</label>
          <input
            type="number"
            step="any"
            className={inp}
            placeholder="e.g. 11.0"
            value={form.normal_high}
            onChange={(e) => set('normal_high', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Flag</label>
          <select className={inp} value={form.flag} onChange={(e) => set('flag', e.target.value)}>
            {FLAG_OPTIONS.map((f) => (
              <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
          <input
            type="text"
            className={inp}
            placeholder="Any additional notes…"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save Result'}
        </button>
      </div>
    </form>
  );
}

// ── Single test item card ──────────────────────────────────────────────────────
function TestItemCard({ item, onCollect, onSaveResult, collecting }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Card header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-5 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors ${open ? 'rounded-t-xl' : 'rounded-xl'}`}
      >
        <div className="flex items-center gap-3 text-left">
          <FlaskConical className="w-4 h-4 text-primary shrink-0" />
          <div>
            <span className="text-sm font-semibold text-gray-800">{item.test_name}</span>
            <span className="ml-2 text-xs text-gray-400">
              {CATEGORY_LABELS[item.test?.category] ?? ''} · {SPECIMEN_LABELS[item.test?.specimen_type] ?? ''}
              {item.test_unit && ` · ${item.test_unit}`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <LabStatusBadge status={item.status} />
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {/* Card body */}
      {open && (
        <div className="px-5 py-4">
          {item.status === 'ORDERED' && (
            <button
              onClick={() => onCollect(item.id)}
              disabled={collecting === item.id}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition-colors"
            >
              {collecting === item.id ? 'Collecting…' : 'Mark Specimen Collected'}
            </button>
          )}

          {item.status === 'SPECIMEN_COLLECTED' && (
            <ResultEntryForm item={item} onSave={onSaveResult} />
          )}

          {(item.status === 'RESULTED' || item.status === 'VERIFIED') && item.result && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-400 font-medium">Result</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">
                    {item.result.result_value}
                    {item.test_unit && <span className="text-xs text-gray-400 font-normal ml-1">{item.test_unit}</span>}
                  </p>
                </div>
                {(item.result.normal_low != null || item.result.normal_high != null) && (
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-400 font-medium">Normal Range</p>
                    <p className="text-sm font-medium text-gray-700 mt-0.5">
                      {item.result.normal_low ?? '—'} – {item.result.normal_high ?? '—'}
                    </p>
                  </div>
                )}
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-400 font-medium">Flag</p>
                  <div className="mt-1">
                    <FlagBadge flag={item.result.flag} />
                  </div>
                </div>
                {item.status === 'VERIFIED' && item.result.verified_by_name && (
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-400 font-medium">Verified By</p>
                    <p className="text-sm font-medium text-gray-700 mt-0.5">{item.result.verified_by_name}</p>
                    <p className="text-xs text-gray-400">{fmtDate(item.result.verified_at)}</p>
                  </div>
                )}
              </div>
              {item.result.notes && (
                <p className="text-xs text-gray-500 italic">{item.result.notes}</p>
              )}
              <p className="text-xs text-gray-400">
                Resulted by {item.result.resulted_by_name} · {fmtDate(item.result.resulted_at)}
              </p>
            </div>
          )}

          {item.status === 'CANCELLED' && (
            <p className="text-sm text-gray-400 italic">This test item was cancelled.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LabOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [order, setOrder]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [collecting, setCollecting] = useState(null);
  const [verifying, setVerifying]   = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await labService.getOrder(id);
      setOrder(res.data);
    } catch {
      toast.error('Failed to load order.');
      navigate('/laboratory');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  const handleCollect = async (itemId) => {
    setCollecting(itemId);
    try {
      await labService.collectSpecimen(id, {
        collected_by: user.id,
        collected_at: new Date().toISOString(),
        item_ids: [itemId],
      });
      toast.success('Specimen marked as collected.');
      fetchOrder();
    } catch (e) {
      const msg = e.response?.data
        ? Object.values(e.response.data).flat().join(' ')
        : 'Failed to collect specimen.';
      toast.error(msg);
    } finally {
      setCollecting(null);
    }
  };

  const handleSaveResult = async (itemId, formData) => {
    try {
      await labService.submitResults(id, [{
        order_item_id: itemId,
        result_value: formData.result_value,
        normal_low: formData.normal_low !== '' ? parseFloat(formData.normal_low) : null,
        normal_high: formData.normal_high !== '' ? parseFloat(formData.normal_high) : null,
        flag: formData.flag,
        notes: formData.notes || '',
      }]);
      toast.success('Result saved.');
      fetchOrder();
    } catch (e) {
      const msg = e.response?.data
        ? Object.values(e.response.data).flat().join(' ')
        : 'Failed to save result.';
      toast.error(msg);
    }
  };

  const handleVerify = async () => {
    if (!window.confirm('Verify all results? This will notify the clinician.')) return;
    setVerifying(true);
    try {
      await labService.verifyOrder(id);
      toast.success('All results verified.');
      fetchOrder();
    } catch (e) {
      const msg = e.response?.data?.detail || 'Failed to verify results.';
      toast.error(msg);
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!order) return null;

  const activeItems   = order.items.filter((i) => i.status !== 'CANCELLED');
  const allResulted   = activeItems.length > 0 && activeItems.every((i) => i.status === 'RESULTED');
  const hasCritical   = order.items.some((i) => i.result && isCritical(i.result.flag));
  const canVerify     = allResulted && (user?.role === 'LAB_TECH' || user?.role === 'ADMIN');
  const p             = order.patient_display;

  return (
    <div className="space-y-5">
      {/* Critical alert banner */}
      {hasCritical && (
        <div className="bg-red-50 border border-red-300 rounded-xl px-5 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm font-semibold text-red-700">
            ⚠ Critical Value — notify clinician immediately
          </p>
        </div>
      )}

      {/* Patient + Visit header */}
      <PatientVisitHeader
        patient={{
          patient_id: p?.patient_id,
          name: p?.name,
          age: p?.age,
          gender: p?.gender,
        }}
        visit={{
          visit_number: order.visit_number,
          status: order.status,
        }}
      />

      {/* Order metadata bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/laboratory')}
            className="mt-0.5 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-base font-bold text-gray-800 font-mono">{order.order_number}</h1>
              <PriorityBadge priority={order.priority} />
              <LabStatusBadge status={order.status} />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Ordered by {order.ordered_by_name}
              {' · '}{fmtDate(order.ordered_at)}
            </p>
            {order.clinical_notes && (
              <p className="text-sm text-gray-600 mt-2 italic">"{order.clinical_notes}"</p>
            )}
          </div>
        </div>
      </div>

      {/* Test items */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
          Tests ({order.items.length})
        </h2>
        {order.items.map((item) => (
          <TestItemCard
            key={item.id}
            item={item}
            onCollect={handleCollect}
            onSaveResult={handleSaveResult}
            collecting={collecting}
          />
        ))}
      </div>

      {/* Bottom action bar */}
      <div className={`fixed left-0 right-0 z-20 bg-white border-t border-gray-200 shadow-lg px-6 py-3 flex items-center justify-end gap-3 ${import.meta.env.DEV ? 'bottom-9' : 'bottom-0'}`}>
        {canVerify && (
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            {verifying ? 'Verifying…' : 'Verify All Results'}
          </button>
        )}
        <button
          onClick={() => window.open(`/laboratory/order/${id}/report`, '_blank')}
          className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print Result Report
        </button>
      </div>

      {/* Spacer for fixed bar */}
      <div className={import.meta.env.DEV ? 'h-20' : 'h-16'} />
    </div>
  );
}
